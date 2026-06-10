-- Migration: Delete user account RPC
-- Description: Adds a secure RPC for permanent account deletion that removes
--              user-scoped domain data, the public.users row, and the auth.users row.
--              This enables re-registration with the same email only after full deletion.
-- Date: 2026-02-16

-- IMPORTANT:
-- - This function is SECURITY DEFINER so it can delete across RLS-protected tables.
-- - It only allows deleting the *current* authenticated user (auth.uid()).
-- - expected_user_id / expected_email are optional extra safeguards.
-- - Deletion is performed in a safe order to avoid FK failures.

CREATE OR REPLACE FUNCTION public.delete_user_account(
  expected_user_id UUID DEFAULT NULL,
  expected_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_uid UUID;
  v_email TEXT;
  v_date_mi_profile_id UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF expected_user_id IS NOT NULL AND expected_user_id <> v_uid THEN
    RAISE EXCEPTION 'User mismatch' USING ERRCODE = '22023';
  END IF;

  IF expected_email IS NOT NULL THEN
    v_email := NULL;

    BEGIN
      SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
    EXCEPTION
      WHEN undefined_table THEN v_email := NULL;
    END;

    IF v_email IS NULL AND to_regclass('public.users') IS NOT NULL THEN
      BEGIN
        EXECUTE 'SELECT email FROM public.users WHERE id = $1' INTO v_email USING v_uid;
      EXCEPTION
        WHEN undefined_column THEN v_email := NULL;
      END;
    END IF;

    IF lower(trim(coalesce(v_email, ''))) <> lower(trim(expected_email)) THEN
      RAISE EXCEPTION 'Email mismatch' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Null out audit references that could block deletion (moderation/admin scenarios)
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    BEGIN
      EXECUTE 'UPDATE public.user_roles SET granted_by = NULL WHERE granted_by = $1' USING v_uid;
    EXCEPTION
      WHEN undefined_column THEN NULL;
    END;
  END IF;

  IF to_regclass('public.age_verifications') IS NOT NULL THEN
    BEGIN
      EXECUTE 'UPDATE public.age_verifications SET verified_by = NULL WHERE verified_by = $1' USING v_uid;
    EXCEPTION
      WHEN undefined_column THEN NULL;
    END;
  END IF;

  IF to_regclass('public.content_reports') IS NOT NULL THEN
    BEGIN
      EXECUTE 'UPDATE public.content_reports SET resolved_by = NULL WHERE resolved_by = $1' USING v_uid;
    EXCEPTION
      WHEN undefined_column THEN NULL;
    END;
  END IF;

  IF to_regclass('public.auto_moderation_rules') IS NOT NULL THEN
    BEGIN
      EXECUTE 'UPDATE public.auto_moderation_rules SET created_by = NULL WHERE created_by = $1' USING v_uid;
    EXCEPTION
      WHEN undefined_column THEN NULL;
    END;
  END IF;

  -- Resolve DateMi profile id (if any) to clean up profile-referencing tables first
  v_date_mi_profile_id := NULL;
  IF to_regclass('public.date_mi_profiles') IS NOT NULL THEN
    BEGIN
      EXECUTE 'SELECT id FROM public.date_mi_profiles WHERE user_id = $1 LIMIT 1'
      INTO v_date_mi_profile_id
      USING v_uid;
    EXCEPTION
      WHEN undefined_column THEN v_date_mi_profile_id := NULL;
    END;
  END IF;

  -- DateMi matching / interaction tables (optional per deployment)
  IF to_regclass('public.datemi_likes') IS NOT NULL THEN
    EXECUTE
      'DELETE FROM public.datemi_likes WHERE liker_id = $1 OR ($2 IS NOT NULL AND liked_profile_id = $2)'
      USING v_uid, v_date_mi_profile_id;
  END IF;

  IF to_regclass('public.datemi_passes') IS NOT NULL THEN
    EXECUTE
      'DELETE FROM public.datemi_passes WHERE passer_id = $1 OR ($2 IS NOT NULL AND passed_profile_id = $2)'
      USING v_uid, v_date_mi_profile_id;
  END IF;

  IF to_regclass('public.datemi_profile_views') IS NOT NULL THEN
    EXECUTE
      'DELETE FROM public.datemi_profile_views WHERE viewer_id = $1 OR ($2 IS NOT NULL AND viewed_profile_id = $2)'
      USING v_uid, v_date_mi_profile_id;
  END IF;

  IF to_regclass('public.datemi_matches') IS NOT NULL THEN
    EXECUTE
      'DELETE FROM public.datemi_matches WHERE user1_id = $1 OR user2_id = $1 OR unmatch_by = $1'
      USING v_uid;
  END IF;

  IF to_regclass('public.datemi_match_cache') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.datemi_match_cache WHERE user_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.datemi_user_behavior') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.datemi_user_behavior WHERE user_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.datemi_matching_preferences') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.datemi_matching_preferences WHERE user_id = $1' USING v_uid;
  END IF;

  -- Other optional user-scoped tables (jobs, skills, feature usage, calls)
  IF to_regclass('public.datemi_feature_usage') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.datemi_feature_usage WHERE user_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.job_alerts') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.job_alerts WHERE user_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.user_skills') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_skills WHERE user_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.job_applications') IS NOT NULL THEN
    BEGIN
      EXECUTE 'DELETE FROM public.job_applications WHERE applicant_id = $1' USING v_uid;
    EXCEPTION
      WHEN undefined_column THEN
        EXECUTE 'DELETE FROM public.job_applications WHERE user_id = $1' USING v_uid;
    END;
  END IF;

  IF to_regclass('public.calls') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.calls WHERE caller_id = $1 OR receiver_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.call_history') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.call_history WHERE caller_id = $1 OR receiver_id = $1' USING v_uid;
  END IF;

  -- WebRTC signaling messages must be removed before deleting sessions
  IF to_regclass('public.signaling_messages') IS NOT NULL AND to_regclass('public.video_call_sessions') IS NOT NULL THEN
    EXECUTE $SQL$
      DELETE FROM public.signaling_messages sm
      USING public.video_call_sessions vcs
      WHERE sm.session_id = vcs.id
        AND (vcs.caller_id = $1 OR vcs.callee_id = $1)
    $SQL$ USING v_uid;

    EXECUTE 'DELETE FROM public.signaling_messages WHERE target_user_id = $1' USING v_uid;
  ELSIF to_regclass('public.signaling_messages') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.signaling_messages WHERE target_user_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.video_call_sessions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.video_call_sessions WHERE caller_id = $1 OR callee_id = $1' USING v_uid;
  END IF;

  -- Escrow sessions reference escrow_transactions; delete sessions before transactions
  IF to_regclass('public.escrow_sessions') IS NOT NULL AND to_regclass('public.escrow_transactions') IS NOT NULL THEN
    EXECUTE $SQL$
      DELETE FROM public.escrow_sessions es
      USING public.escrow_transactions et
      WHERE es.escrow_transaction_id = et.id
        AND (et.payer_id = $1 OR et.payee_id = $1)
    $SQL$ USING v_uid;
  END IF;

  -- Creator-related tables
  IF to_regclass('public.creator_earnings') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.creator_earnings WHERE creator_id = $1 OR customer_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.payout_requests') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.payout_requests WHERE creator_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.creator_content') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.creator_content WHERE creator_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.creator_services') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.creator_services WHERE creator_id = $1' USING v_uid;
  END IF;

  -- Payments / transactions
  IF to_regclass('public.transactions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.transactions WHERE user_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.payment_methods') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.payment_methods WHERE user_id = $1' USING v_uid;
  END IF;

  -- Activity / analytics
  IF to_regclass('public.user_activities') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_activities WHERE user_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.analytics_events') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.analytics_events WHERE user_id = $1' USING v_uid;
  END IF;

  -- Listings owned by the user
  IF to_regclass('public.property_listings') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.property_listings WHERE owner_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.job_postings') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.job_postings WHERE employer_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.service_listings') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.service_listings WHERE owner_id = $1' USING v_uid;
  END IF;

  -- DateMi profile last (after clearing profile-referencing tables)
  IF to_regclass('public.date_mi_profiles') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.date_mi_profiles WHERE user_id = $1' USING v_uid;
  END IF;

  -- Escrow transactions after sessions/calls/earnings are deleted
  IF to_regclass('public.escrow_transactions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.escrow_transactions WHERE payer_id = $1 OR payee_id = $1' USING v_uid;
  END IF;

  -- Clean user preference row explicitly (even if it also cascades)
  IF to_regclass('public.user_preferences') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_preferences WHERE user_id = $1' USING v_uid;
  END IF;

  -- Delete the domain user row (this also cascades many child tables via FK constraints)
  IF to_regclass('public.users') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.users WHERE id = $1' USING v_uid;
  END IF;

  -- Finally delete the auth user (should cascade auth.sessions/auth.identities, etc.)
  BEGIN
    DELETE FROM auth.users WHERE id = v_uid;
  EXCEPTION
    WHEN undefined_table THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'user_id', v_uid::text);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID, TEXT) TO authenticated;


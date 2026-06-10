-- 14-day free trial entitlement system
-- Backend-driven, one-time, email-bound trial assignment with unified entitlement resolver

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.trial_identity_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_normalized TEXT NOT NULL UNIQUE,
  original_user_id UUID,
  first_assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.user_trial_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  email_normalized TEXT NOT NULL,
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  trial_active BOOLEAN NOT NULL DEFAULT FALSE,
  converted_to_paid_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.trial_identity_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_trial_entitlements ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS handle_trial_identity_ledger_updated_at ON public.trial_identity_ledger;
CREATE TRIGGER handle_trial_identity_ledger_updated_at
  BEFORE UPDATE ON public.trial_identity_ledger
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_user_trial_entitlements_updated_at ON public.user_trial_entitlements;
CREATE TRIGGER handle_user_trial_entitlements_updated_at
  BEFORE UPDATE ON public.user_trial_entitlements
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_trial_identity_ledger_email
  ON public.trial_identity_ledger(email_normalized);

CREATE INDEX IF NOT EXISTS idx_user_trial_entitlements_active
  ON public.user_trial_entitlements(user_id, trial_active, trial_end_date);

CREATE INDEX IF NOT EXISTS idx_user_trial_entitlements_email
  ON public.user_trial_entitlements(email_normalized);

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can view their own trial entitlement" ON public.user_trial_entitlements;
CREATE POLICY "Users can view their own trial entitlement"
  ON public.user_trial_entitlements
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage trial entitlements" ON public.user_trial_entitlements;
CREATE POLICY "Service role can manage trial entitlements"
  ON public.user_trial_entitlements
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Service role can manage trial identity ledger" ON public.trial_identity_ledger;
CREATE POLICY "Service role can manage trial identity ledger"
  ON public.trial_identity_ledger
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.normalize_trial_email(input_email TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(lower(trim(coalesce(input_email, ''))), '');
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'public', 'pg_catalog';

CREATE OR REPLACE FUNCTION public.assign_trial_if_eligible(
  p_user_id UUID,
  p_email TEXT,
  p_source TEXT DEFAULT 'unknown'
)
RETURNS JSONB AS $$
DECLARE
  v_email_normalized TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_trial_start TIMESTAMPTZ := NOW();
  v_trial_end TIMESTAMPTZ := NOW() + INTERVAL '14 days';
  v_ledger_exists BOOLEAN := FALSE;
  v_existing RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('assigned', FALSE, 'reason', 'missing_user_id');
  END IF;

  v_email_normalized := public.normalize_trial_email(p_email);
  IF v_email_normalized IS NULL THEN
    RETURN jsonb_build_object('assigned', FALSE, 'reason', 'missing_email');
  END IF;

  SELECT *
  INTO v_existing
  FROM public.user_trial_entitlements
  WHERE user_id = p_user_id
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'assigned', FALSE,
      'reason', 'already_exists_for_user',
      'trial_active', coalesce(v_existing.trial_active, FALSE),
      'trial_start_date', v_existing.trial_start_date,
      'trial_end_date', v_existing.trial_end_date
    );
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM public.trial_identity_ledger
    WHERE email_normalized = v_email_normalized
  ) INTO v_ledger_exists;

  IF NOT v_ledger_exists THEN
    INSERT INTO public.trial_identity_ledger (
      email_normalized,
      original_user_id,
      first_assigned_at,
      metadata
    ) VALUES (
      v_email_normalized,
      p_user_id,
      v_now,
      jsonb_build_object('source', p_source)
    )
    ON CONFLICT (email_normalized) DO NOTHING;
  END IF;

  IF v_ledger_exists THEN
    INSERT INTO public.user_trial_entitlements (
      user_id,
      email_normalized,
      trial_start_date,
      trial_end_date,
      trial_active,
      source,
      metadata
    ) VALUES (
      p_user_id,
      v_email_normalized,
      NULL,
      NULL,
      FALSE,
      p_source,
      jsonb_build_object('reason', 'email_already_used_for_trial')
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN jsonb_build_object(
      'assigned', FALSE,
      'reason', 'email_already_used_for_trial'
    );
  END IF;

  INSERT INTO public.user_trial_entitlements (
    user_id,
    email_normalized,
    trial_start_date,
    trial_end_date,
    trial_active,
    source
  ) VALUES (
    p_user_id,
    v_email_normalized,
    v_trial_start,
    v_trial_end,
    TRUE,
    p_source
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'assigned', TRUE,
    'trial_active', TRUE,
    'trial_start_date', v_trial_start,
    'trial_end_date', v_trial_end
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog';

CREATE OR REPLACE FUNCTION public.expire_trials_and_mark_inactive()
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER := 0;
BEGIN
  UPDATE public.user_trial_entitlements
  SET
    trial_active = FALSE,
    updated_at = NOW()
  WHERE trial_active = TRUE
    AND trial_end_date IS NOT NULL
    AND trial_end_date <= NOW();

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog';

CREATE OR REPLACE FUNCTION public.convert_trial_to_paid(
  p_user_id UUID,
  p_subscription_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.user_trial_entitlements
  SET
    trial_active = FALSE,
    converted_to_paid_at = COALESCE(converted_to_paid_at, NOW()),
    updated_at = NOW(),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'converted_subscription_id', p_subscription_id,
      'converted_at', NOW()
    )
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog';

CREATE OR REPLACE FUNCTION public.get_user_entitlement_state(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_paid RECORD;
  v_trial RECORD;
  v_state TEXT := 'FREE';
  v_effective_tier TEXT := 'free';
  v_expires_at TIMESTAMPTZ := NULL;
BEGIN
  PERFORM public.expire_trials_and_mark_inactive();

  SELECT
    s.id,
    s.tier,
    s.status,
    s.end_date
  INTO v_paid
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND s.end_date > NOW()
  ORDER BY
    CASE WHEN s.tier = 'premium' THEN 2 WHEN s.tier = 'pro' THEN 1 ELSE 0 END DESC,
    s.created_at DESC
  LIMIT 1;

  IF FOUND THEN
    IF v_paid.tier = 'premium' THEN
      v_state := 'PREMIUM';
      v_effective_tier := 'premium';
    ELSIF v_paid.tier = 'pro' THEN
      v_state := 'PRO';
      v_effective_tier := 'pro';
    END IF;
    v_expires_at := v_paid.end_date;
  ELSE
    SELECT
      te.trial_start_date,
      te.trial_end_date,
      te.trial_active,
      te.converted_to_paid_at
    INTO v_trial
    FROM public.user_trial_entitlements te
    WHERE te.user_id = p_user_id
    ORDER BY te.created_at DESC
    LIMIT 1;

    IF FOUND AND v_trial.trial_active = TRUE AND v_trial.trial_end_date > NOW() THEN
      v_state := 'TRIAL_ACTIVE';
      v_effective_tier := 'premium';
      v_expires_at := v_trial.trial_end_date;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'state', v_state,
    'effective_tier', v_effective_tier,
    'expires_at', v_expires_at,
    'subscription_tier', CASE WHEN v_paid.id IS NULL THEN NULL ELSE v_paid.tier END,
    'subscription_id', CASE WHEN v_paid.id IS NULL THEN NULL ELSE v_paid.id END,
    'trial', CASE
      WHEN v_trial IS NULL THEN NULL
      ELSE jsonb_build_object(
        'trial_active', coalesce(v_trial.trial_active, FALSE),
        'trial_start_date', v_trial.trial_start_date,
        'trial_end_date', v_trial.trial_end_date,
        'converted_to_paid_at', v_trial.converted_to_paid_at
      )
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog';

-- Assign trial on profile creation (new account path)
CREATE OR REPLACE FUNCTION public.handle_assign_trial_on_user_created()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.assign_trial_if_eligible(NEW.id, NEW.email, 'signup_profile_insert');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog';

DROP TRIGGER IF EXISTS on_public_user_created_assign_trial ON public.users;
CREATE TRIGGER on_public_user_created_assign_trial
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_assign_trial_on_user_created();

-- ---------------------------------------------------------------------------
-- Keep date_mi tier derivation consistent with backend entitlement model
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.date_mi_profiles_with_tier AS
SELECT
  p.id,
  p.created_at,
  p.updated_at,
  p.user_id,
  p.display_name,
  p.age_verified,
  p.gender_preferences,
  p.profile_pictures,
  p.about_me,
  p.privacy_settings,
  p.creator_status,
  p.subscription_country,
  COALESCE(
    (
      SELECT s.tier
      FROM public.subscriptions s
      WHERE s.user_id = p.user_id
        AND s.status = 'active'
        AND s.end_date > NOW()
      ORDER BY s.created_at DESC
      LIMIT 1
    ),
    (
      SELECT 'premium'
      FROM public.user_trial_entitlements te
      WHERE te.user_id = p.user_id
        AND te.trial_active = TRUE
        AND te.trial_end_date > NOW()
      ORDER BY te.created_at DESC
      LIMIT 1
    ),
    'free'
  ) AS subscription_tier
FROM public.date_mi_profiles p;

GRANT SELECT ON public.date_mi_profiles_with_tier TO authenticated;

CREATE OR REPLACE FUNCTION public.get_user_subscription_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_entitlement JSONB;
BEGIN
  v_entitlement := public.get_user_entitlement_state(p_user_id);
  RETURN COALESCE(v_entitlement->>'effective_tier', 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog';

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.assign_trial_if_eligible(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_trials_and_mark_inactive() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.convert_trial_to_paid(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_entitlement_state(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normalize_trial_email(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_user_entitlement_state(UUID) TO authenticated, service_role, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.convert_trial_to_paid(UUID, UUID) TO service_role, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.assign_trial_if_eligible(UUID, TEXT, TEXT) TO service_role, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.expire_trials_and_mark_inactive() TO service_role, supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- Existing verified users rollout backfill (one-time)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT u.id, u.email
    FROM public.users u
    INNER JOIN auth.users au ON au.id = u.id
    WHERE au.email_confirmed_at IS NOT NULL
  LOOP
    PERFORM public.assign_trial_if_eligible(r.id, r.email, 'verified_rollout_backfill_20260219');
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Cron schedule for expiry reconciliation
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-user-trials-every-5-minutes') THEN
    PERFORM cron.unschedule('expire-user-trials-every-5-minutes');
  END IF;

  PERFORM cron.schedule(
    'expire-user-trials-every-5-minutes',
    '*/5 * * * *',
    $$SELECT public.expire_trials_and_mark_inactive();$$
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Non-fatal: expiry is also reconciled on reads.
    RAISE NOTICE 'Unable to schedule pg_cron trial expiry job: %', SQLERRM;
END;
$$;

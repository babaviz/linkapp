-- Referral rewards update: 10 verified referrals => 7 days Premium (stacking)
-- Also removes legacy 20-referral cash milestone (KSh 2,000). Cash milestones remain: 200, 2000.
-- Date: 2026-02-20

-- ============================================================================
-- 1) Remove legacy cash milestone (20 -> KSh 2,000)
-- ============================================================================

-- Delete legacy rows first so the new constraint can be applied safely.
DELETE FROM public.referral_reward_notifications
WHERE milestone = 20;

ALTER TABLE public.referral_reward_notifications
  DROP CONSTRAINT IF EXISTS referral_reward_notifications_milestone_check;

ALTER TABLE public.referral_reward_notifications
  ADD CONSTRAINT referral_reward_notifications_milestone_check
  CHECK (milestone = ANY (ARRAY[200, 2000]));

-- New users should target the first cash milestone at 200 referrals.
ALTER TABLE public.referral_statistics
  ALTER COLUMN next_cash_milestone SET DEFAULT 200;

-- Normalize next cash milestone (idempotent).
UPDATE public.referral_statistics
SET next_cash_milestone = CASE
  WHEN COALESCE(completed_referrals, 0) >= 2000 THEN 2000
  WHEN COALESCE(completed_referrals, 0) >= 200 THEN 2000
  ELSE 200
END;

-- Update reward mapping to only support cash milestones 200 and 2000.
CREATE OR REPLACE FUNCTION public.get_reward_amount_for_milestone(milestone_count INTEGER)
RETURNS INTEGER AS $$
BEGIN
  CASE milestone_count
    WHEN 200 THEN RETURN 20000;
    WHEN 2000 THEN RETURN 200000;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'public', 'pg_catalog';

-- Update milestone notifier to use thresholds [200, 2000] only.
CREATE OR REPLACE FUNCTION public.check_and_notify_cash_reward(
  referrer_user_id UUID,
  completed_count INTEGER
)
RETURNS JSONB AS $$
DECLARE
  milestones INTEGER[] := ARRAY[200, 2000];
  milestone INTEGER;
  reward_amount INTEGER;
  inserted_id UUID;
  granted_any BOOLEAN := FALSE;
  highest_granted INTEGER := 0;
  highest_amount INTEGER := 0;
BEGIN
  FOREACH milestone IN ARRAY milestones LOOP
    IF completed_count >= milestone THEN
      reward_amount := public.get_reward_amount_for_milestone(milestone);

      INSERT INTO public.referral_reward_notifications (
        user_id,
        referral_count,
        reward_amount,
        milestone,
        status,
        notified_at
      )
      VALUES (
        referrer_user_id,
        completed_count,
        reward_amount,
        milestone,
        'notified',
        NOW()
      )
      ON CONFLICT (user_id, milestone) DO NOTHING
      RETURNING id INTO inserted_id;

      IF inserted_id IS NOT NULL THEN
        granted_any := TRUE;
        IF milestone > highest_granted THEN
          highest_granted := milestone;
          highest_amount := reward_amount;
        END IF;
      END IF;
    END IF;
  END LOOP;

  UPDATE public.referral_statistics rs
  SET
    total_rewards_earned = (
      SELECT COUNT(*) FROM public.referral_reward_notifications n WHERE n.user_id = referrer_user_id
    ),
    total_cash_rewards_ksh = (
      SELECT COALESCE(SUM(n.reward_amount), 0)
      FROM public.referral_reward_notifications n
      WHERE n.user_id = referrer_user_id
    ),
    next_cash_milestone = CASE
      WHEN completed_count >= 2000 THEN 2000
      WHEN completed_count >= 200 THEN 2000
      ELSE 200
    END,
    updated_at = NOW()
  WHERE rs.user_id = referrer_user_id;

  RETURN jsonb_build_object(
    'reward_granted', granted_any,
    'milestone_reached', highest_granted,
    'reward_amount', highest_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog';

-- ============================================================================
-- 2) Premium reward: every 10 verified referrals grants +7 days Premium
-- ============================================================================

-- Best-effort: dedupe any legacy rows that accidentally duplicated a batch.
-- Keep a single row per (user_id, referral_batch_count) with the widest date range.
WITH referral_dupes AS (
  SELECT
    user_id,
    referral_batch_count,
    MIN(start_date) AS min_start,
    MAX(end_date) AS max_end,
    MIN(id) AS keep_id
  FROM public.premium_access_periods
  WHERE source = 'referral_reward'
    AND referral_batch_count IS NOT NULL
  GROUP BY user_id, referral_batch_count
  HAVING COUNT(*) > 1
)
UPDATE public.premium_access_periods p
SET
  start_date = d.min_start,
  end_date = d.max_end,
  updated_at = NOW()
FROM referral_dupes d
WHERE p.id = d.keep_id;

WITH referral_dupes AS (
  SELECT
    user_id,
    referral_batch_count,
    MIN(id) AS keep_id
  FROM public.premium_access_periods
  WHERE source = 'referral_reward'
    AND referral_batch_count IS NOT NULL
  GROUP BY user_id, referral_batch_count
  HAVING COUNT(*) > 1
)
DELETE FROM public.premium_access_periods p
USING referral_dupes d
WHERE p.source = 'referral_reward'
  AND p.referral_batch_count = d.referral_batch_count
  AND p.user_id = d.user_id
  AND p.id <> d.keep_id;

-- Enforce idempotency per batch for referral rewards going forward.
CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_access_periods_referral_reward_batch_unique
  ON public.premium_access_periods (user_id, referral_batch_count)
  WHERE source = 'referral_reward' AND referral_batch_count IS NOT NULL;

CREATE OR REPLACE FUNCTION public.check_and_grant_referral_premium_reward(
  referrer_user_id UUID,
  completed_count INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_target_batches INTEGER;
  v_batch INTEGER;
  v_inserted_id UUID;
  v_bonus_end TIMESTAMPTZ;
  v_premium_subscription_end TIMESTAMPTZ;
  v_trial_end TIMESTAMPTZ;
  v_cursor TIMESTAMPTZ;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_granted_batches INTEGER := 0;
BEGIN
  IF referrer_user_id IS NULL THEN
    RETURN jsonb_build_object('granted', FALSE, 'batches_granted', 0);
  END IF;

  v_target_batches := floor(COALESCE(completed_count, 0) / 10.0)::INTEGER;
  IF v_target_batches < 1 THEN
    RETURN jsonb_build_object('granted', FALSE, 'batches_granted', 0);
  END IF;

  -- Lock per-referrer to make stacking deterministic under concurrency.
  PERFORM pg_advisory_xact_lock(hashtextextended(referrer_user_id::text, 0));

  -- Determine current Premium-equivalent expiry (avoid wasting days if already Premium):
  -- - paid Premium subscription
  -- - active free trial (Premium-equivalent)
  -- - any active premium_access_periods (referral/admin/promo/purchase grants)
  SELECT MAX(p.end_date)
  INTO v_bonus_end
  FROM public.premium_access_periods p
  WHERE p.user_id = referrer_user_id
    AND p.status = 'active'
    AND p.is_active = TRUE
    AND p.end_date > v_now;

  SELECT MAX(s.end_date)
  INTO v_premium_subscription_end
  FROM public.subscriptions s
  WHERE s.user_id = referrer_user_id
    AND s.status = 'active'
    AND s.tier = 'premium'
    AND s.end_date > v_now;

  SELECT MAX(te.trial_end_date)
  INTO v_trial_end
  FROM public.user_trial_entitlements te
  WHERE te.user_id = referrer_user_id
    AND te.trial_active = TRUE
    AND te.trial_end_date > v_now;

  v_cursor := GREATEST(
    v_now,
    COALESCE(v_bonus_end, v_now),
    COALESCE(v_premium_subscription_end, v_now),
    COALESCE(v_trial_end, v_now)
  );

  -- Ensure one 7-day Premium block per achieved batch.
  FOR v_batch IN 1..v_target_batches LOOP
    v_start := v_cursor;
    v_end := v_start + INTERVAL '7 days';

    INSERT INTO public.premium_access_periods (
      user_id,
      start_date,
      end_date,
      duration_days,
      source,
      referral_batch_count,
      is_active,
      status,
      metadata
    )
    VALUES (
      referrer_user_id,
      v_start,
      v_end,
      7,
      'referral_reward',
      v_batch,
      TRUE,
      'active',
      jsonb_build_object(
        'reward_type', 'referral_premium_week',
        'verified_referrals_per_reward', 10
      )
    )
    ON CONFLICT (user_id, referral_batch_count)
    WHERE source = 'referral_reward' AND referral_batch_count IS NOT NULL
    DO NOTHING
    RETURNING id INTO v_inserted_id;

    IF v_inserted_id IS NOT NULL THEN
      v_granted_batches := v_granted_batches + 1;
      v_cursor := v_end;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'granted', (v_granted_batches > 0),
    'batches_granted', v_granted_batches,
    'premium_end_date', v_cursor
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog';

-- ============================================================================
-- 3) Wire Premium reward into referral status updates and progress RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_referral_status(
  referred_user_id_param UUID,
  new_status TEXT
)
RETURNS JSONB AS $$
DECLARE
  referrer_user_id UUID;
  successful_count INTEGER := 0;
  reward_result JSONB;
  premium_result JSONB;
BEGIN
  UPDATE public.referrals r
  SET
    status = new_status,
    verified_at = CASE
      WHEN new_status IN ('verified', 'completed') THEN COALESCE(r.verified_at, NOW())
      ELSE r.verified_at
    END,
    completed_at = CASE
      WHEN new_status = 'completed' THEN COALESCE(r.completed_at, NOW())
      ELSE r.completed_at
    END,
    updated_at = NOW()
  WHERE r.referred_user_id = referred_user_id_param
    AND (
      CASE r.status
        WHEN 'pending' THEN 0
        WHEN 'registered' THEN 1
        WHEN 'verified' THEN 2
        WHEN 'completed' THEN 3
        ELSE 0
      END
      <=
      CASE new_status
        WHEN 'pending' THEN 0
        WHEN 'registered' THEN 1
        WHEN 'verified' THEN 2
        WHEN 'completed' THEN 3
        ELSE 0
      END
    )
  RETURNING r.referrer_id INTO referrer_user_id;

  IF referrer_user_id IS NULL THEN
    RETURN jsonb_build_object('success', TRUE, 'referrer_id', NULL, 'reward_granted', FALSE);
  END IF;

  INSERT INTO public.referral_statistics (user_id)
  VALUES (referrer_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT COUNT(*)
  INTO successful_count
  FROM public.referrals r
  WHERE r.referrer_id = referrer_user_id AND r.status IN ('verified', 'completed');

  UPDATE public.referral_statistics rs
  SET
    total_referrals = (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_id = referrer_user_id),
    completed_referrals = successful_count,
    pending_referrals = (
      SELECT COUNT(*)
      FROM public.referrals r
      WHERE r.referrer_id = referrer_user_id AND r.status IN ('pending', 'registered')
    ),
    current_batch_progress = (successful_count % 10),
    updated_at = NOW()
  WHERE rs.user_id = referrer_user_id;

  IF new_status IN ('verified', 'completed') THEN
    premium_result := public.check_and_grant_referral_premium_reward(referrer_user_id, successful_count);
    reward_result := public.check_and_notify_cash_reward(referrer_user_id, successful_count);
  ELSE
    premium_result := jsonb_build_object('granted', FALSE, 'batches_granted', 0);
    reward_result := jsonb_build_object('reward_granted', FALSE, 'milestone_reached', 0, 'reward_amount', 0);
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'referrer_id', referrer_user_id,
    'completed_count', successful_count,
    'reward_granted', (reward_result->>'reward_granted')::BOOLEAN,
    'milestone_reached', (reward_result->>'milestone_reached')::INTEGER,
    'reward_amount', (reward_result->>'reward_amount')::INTEGER,
    'premium_granted', COALESCE((premium_result->>'granted')::BOOLEAN, FALSE),
    'premium_batches_granted', COALESCE((premium_result->>'batches_granted')::INTEGER, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog';

CREATE OR REPLACE FUNCTION public.get_referral_progress(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  stats RECORD;
  next_milestone_value INTEGER;
  referrals_until_next INTEGER;
  request_role TEXT;
  active_referral_premium RECORD;
  completed INTEGER;
BEGIN
  request_role := current_setting('request.jwt.claim.role', true);
  IF request_role IS NOT NULL AND request_role <> 'service_role' AND auth.uid() IS DISTINCT FROM user_id_param THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO stats
  FROM public.referral_statistics
  WHERE user_id = user_id_param;

  IF NOT FOUND THEN
    INSERT INTO public.referral_statistics (user_id)
    VALUES (user_id_param)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO stats
    FROM public.referral_statistics
    WHERE user_id = user_id_param;
  END IF;

  completed := COALESCE(stats.completed_referrals, 0);

  -- Premium reward milestone: next multiple-of-10
  next_milestone_value := (floor(completed / 10.0)::INTEGER + 1) * 10;
  referrals_until_next := GREATEST(0, next_milestone_value - completed);

  -- Active referral-earned premium (only referral_reward source)
  SELECT p.id, p.start_date, p.end_date
  INTO active_referral_premium
  FROM public.premium_access_periods p
  WHERE p.user_id = user_id_param
    AND p.source = 'referral_reward'
    AND p.is_active = TRUE
    AND p.status = 'active'
    AND NOW() BETWEEN p.start_date AND p.end_date
  ORDER BY p.end_date DESC
  LIMIT 1;

  result := jsonb_build_object(
    'total_referrals', COALESCE(stats.total_referrals, 0),
    'completed_referrals', completed,
    'pending_referrals', COALESCE(stats.pending_referrals, 0),
    'current_batch_progress', (completed % 10),
    'next_milestone', next_milestone_value,
    'referrals_until_reward', referrals_until_next,
    'total_rewards_earned', COALESCE(stats.total_rewards_earned, 0),
    'total_cash_rewards_ksh', COALESCE(stats.total_cash_rewards_ksh, 0),
    'has_active_premium', active_referral_premium.id IS NOT NULL,
    'premium_start_date', active_referral_premium.start_date,
    'premium_end_date', active_referral_premium.end_date
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog';

-- ============================================================================
-- 4) Security hardening: premium_access_periods + function privileges
-- ============================================================================

-- premium_access_periods: users can read their own rows; only service_role can write.
DROP POLICY IF EXISTS "Users can view their own premium periods" ON public.premium_access_periods;
DROP POLICY IF EXISTS "System can insert premium periods" ON public.premium_access_periods;
DROP POLICY IF EXISTS "System can update premium periods" ON public.premium_access_periods;

DROP POLICY IF EXISTS "Users can view their own premium access periods" ON public.premium_access_periods;
CREATE POLICY "Users can view their own premium access periods"
  ON public.premium_access_periods FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage premium access periods" ON public.premium_access_periods;
CREATE POLICY "Service role can manage premium access periods"
  ON public.premium_access_periods FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Revoke client execution for security-definer functions that must not be callable from apps.
REVOKE EXECUTE ON FUNCTION public.grant_premium_access(UUID, INTEGER, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_premium_access(UUID, INTEGER, INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_premium_access(UUID, INTEGER, INTEGER) TO service_role, supabase_auth_admin;

REVOKE EXECUTE ON FUNCTION public.grant_premium_access(UUID, INTEGER, INTEGER, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_premium_access(UUID, INTEGER, INTEGER, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_premium_access(UUID, INTEGER, INTEGER, TEXT) TO service_role, supabase_auth_admin;

REVOKE EXECUTE ON FUNCTION public.check_and_grant_referral_premium_reward(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_and_grant_referral_premium_reward(UUID, INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_grant_referral_premium_reward(UUID, INTEGER) TO service_role, supabase_auth_admin;

-- Ensure update_referral_status and cash notifier remain non-client callable (idempotent re-apply).
REVOKE EXECUTE ON FUNCTION public.update_referral_status(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_referral_status(UUID, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_referral_status(UUID, TEXT) TO service_role, supabase_auth_admin;

REVOKE EXECUTE ON FUNCTION public.check_and_notify_cash_reward(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_and_notify_cash_reward(UUID, INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_notify_cash_reward(UUID, INTEGER) TO service_role, supabase_auth_admin;

-- Keep get_referral_progress callable by authenticated (self-only enforced in function).
REVOKE EXECUTE ON FUNCTION public.get_referral_progress(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_referral_progress(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_referral_progress(UUID) TO authenticated, service_role, supabase_auth_admin;

-- ============================================================================
-- 5) Backfill: ensure current_batch_progress is modulo-based and grant any missing batches
-- ============================================================================

UPDATE public.referral_statistics
SET current_batch_progress = (COALESCE(completed_referrals, 0) % 10);

DO $$
DECLARE
  r RECORD;
  v_successful INTEGER;
BEGIN
  FOR r IN
    SELECT DISTINCT referrer_id AS user_id
    FROM public.referrals
    WHERE referrer_id IS NOT NULL
  LOOP
    SELECT COUNT(*)
    INTO v_successful
    FROM public.referrals rr
    WHERE rr.referrer_id = r.user_id AND rr.status IN ('verified', 'completed');

    PERFORM public.check_and_grant_referral_premium_reward(r.user_id, v_successful);
  END LOOP;
END;
$$;


-- Referral Stabilization: Deferred attribution + verified-only counting + security hardening
-- Date: 2026-02-08

-- 1) Remove legacy referral-code trigger path (avoid duplicate inserts)
DROP TRIGGER IF EXISTS trigger_create_user_referral_code ON public.users;
DROP FUNCTION IF EXISTS public.create_user_referral_code();

-- Ensure generate_referral_code cannot be abused via API calls (self-only unless service role).
-- Note: internal auth triggers may execute with no request role set; those calls are allowed.
CREATE OR REPLACE FUNCTION public.generate_referral_code(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
  request_role TEXT;
BEGIN
  request_role := current_setting('request.jwt.claim.role', true);
  IF request_role IS NOT NULL AND request_role <> 'service_role' AND auth.uid() IS DISTINCT FROM user_id_param THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  LOOP
    -- Generate a random 8-character code (uppercase letters and numbers)
    new_code := upper(substring(md5(random()::text || user_id_param::text || now()::text) from 1 for 8));

    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.user_referral_codes WHERE referral_code = new_code) INTO code_exists;

    EXIT WHEN NOT code_exists;
  END LOOP;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog';

-- 1b) Align cash reward milestones to 20/200/2000 (some older DBs used 1000)
ALTER TABLE public.referral_reward_notifications
  DROP CONSTRAINT IF EXISTS referral_reward_notifications_milestone_check;

ALTER TABLE public.referral_reward_notifications
  ADD CONSTRAINT referral_reward_notifications_milestone_check
  CHECK (milestone = ANY (ARRAY[20, 200, 2000]));

-- Best-effort: map any legacy milestone=1000 rows forward (safe if none exist).
UPDATE public.referral_reward_notifications
SET milestone = 2000
WHERE milestone = 1000;

CREATE OR REPLACE FUNCTION public.get_reward_amount_for_milestone(milestone_count INTEGER)
RETURNS INTEGER AS $$
BEGIN
  CASE milestone_count
    WHEN 20 THEN RETURN 2000;
    WHEN 200 THEN RETURN 20000;
    WHEN 2000 THEN RETURN 200000;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'public', 'pg_catalog';

-- Normalize next cash milestone for existing rows (idempotent).
UPDATE public.referral_statistics
SET next_cash_milestone = CASE
  WHEN COALESCE(completed_referrals, 0) >= 2000 THEN 2000
  WHEN COALESCE(completed_referrals, 0) >= 200 THEN 2000
  WHEN COALESCE(completed_referrals, 0) >= 20 THEN 200
  ELSE 20
END;

-- 2) Update signup trigger to (a) generate referral code/stats atomically
--    and (b) record referral relationship from auth metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_referral_code TEXT;
  user_city TEXT;
  user_country TEXT;
  incoming_referral_code TEXT;
  incoming_install_fingerprint TEXT;
  incoming_referral_source TEXT;
  referrer_user_id UUID;
  fingerprint_used BOOLEAN := FALSE;
BEGIN
  -- Extract location + referral attribution from user metadata
  user_city := COALESCE(NEW.raw_user_meta_data->>'city', '');
  user_country := COALESCE(NEW.raw_user_meta_data->>'country', '');
  incoming_referral_code := upper(COALESCE(NEW.raw_user_meta_data->>'referral_code', ''));
  incoming_install_fingerprint := NULLIF(COALESCE(NEW.raw_user_meta_data->>'install_fingerprint', ''), '');
  incoming_referral_source := NULLIF(COALESCE(NEW.raw_user_meta_data->>'referral_source', ''), '');

  -- Create public profile (idempotent)
  INSERT INTO public.users (
    id,
    email,
    full_name,
    phone,
    kyc_status,
    creator_verification_status,
    location_preferences
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'pending',
    'not_applied',
    CASE
      WHEN user_city <> '' AND user_country <> '' THEN
        jsonb_build_object('town', user_city, 'county', user_country)
      ELSE
        NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;

  -- Ensure referral code exists (idempotent)
  new_referral_code := generate_referral_code(NEW.id);
  INSERT INTO public.user_referral_codes (user_id, referral_code)
  VALUES (NEW.id, new_referral_code)
  ON CONFLICT (user_id) DO NOTHING;

  -- Ensure referral statistics row exists (idempotent)
  INSERT INTO public.referral_statistics (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Record referral relationship from metadata (best-effort, never blocks signup)
  IF incoming_referral_code IS NOT NULL AND incoming_referral_code <> '' THEN
    -- Lookup referrer via referral code
    SELECT urc.user_id
    INTO referrer_user_id
    FROM public.user_referral_codes urc
    WHERE urc.referral_code = incoming_referral_code
    LIMIT 1;

    -- Prevent self-referral
    IF referrer_user_id IS NOT NULL AND referrer_user_id <> NEW.id THEN
      -- Basic same-device abuse resistance: only one referral per install fingerprint
      IF incoming_install_fingerprint IS NOT NULL THEN
        SELECT EXISTS(
          SELECT 1 FROM public.referrals r
          WHERE r.install_fingerprint = incoming_install_fingerprint
        )
        INTO fingerprint_used;
      END IF;

      IF fingerprint_used IS NOT TRUE THEN
        INSERT INTO public.referrals (
          referrer_id,
          referred_user_id,
          referral_code,
          status,
          registered_at,
          install_fingerprint,
          device_info
        )
        VALUES (
          referrer_user_id,
          NEW.id,
          incoming_referral_code,
          'registered',
          NOW(),
          incoming_install_fingerprint,
          jsonb_build_object('referral_source', COALESCE(incoming_referral_source, 'unknown'))
        )
        ON CONFLICT (referred_user_id) DO NOTHING;

        -- Keep referrer statistics in sync (derived from verified-only referrals)
        INSERT INTO public.referral_statistics (user_id)
        VALUES (referrer_user_id)
        ON CONFLICT (user_id) DO NOTHING;

        UPDATE public.referral_statistics rs
        SET
          total_referrals = (SELECT COUNT(*) FROM public.referrals r WHERE r.referrer_id = referrer_user_id),
          completed_referrals = (
            SELECT COUNT(*)
            FROM public.referrals r
            WHERE r.referrer_id = referrer_user_id AND r.status IN ('verified', 'completed')
          ),
          pending_referrals = (
            SELECT COUNT(*)
            FROM public.referrals r
            WHERE r.referrer_id = referrer_user_id AND r.status IN ('pending', 'registered')
          ),
          current_batch_progress = (
            SELECT COUNT(*)
            FROM public.referrals r
            WHERE r.referrer_id = referrer_user_id AND r.status IN ('verified', 'completed')
          ),
          updated_at = NOW()
        WHERE rs.user_id = referrer_user_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block auth signup
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog';

-- Ensure the auth.users insert trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3) Update referral status automatically when email is verified (verified-only definition of success)
CREATE OR REPLACE FUNCTION public.handle_auth_user_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run once: from NULL -> NOT NULL
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    PERFORM public.update_referral_status(NEW.id, 'verified');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog';

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_auth_user_email_confirmed();

-- 4) Concurrency-safe, idempotent cash reward milestone notification
CREATE OR REPLACE FUNCTION public.check_and_notify_cash_reward(
  referrer_user_id UUID,
  completed_count INTEGER
)
RETURNS JSONB AS $$
DECLARE
  milestones INTEGER[] := ARRAY[20, 200, 2000];
  milestone INTEGER;
  reward_amount INTEGER;
  inserted_id UUID;
  granted_any BOOLEAN := FALSE;
  highest_granted INTEGER := 0;
  highest_amount INTEGER := 0;
BEGIN
  -- Create missing notifications for any reached milestones (threshold-based, not equality-based).
  FOREACH milestone IN ARRAY milestones LOOP
    IF completed_count >= milestone THEN
      reward_amount := get_reward_amount_for_milestone(milestone);

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

  -- Keep reward aggregates derived from notifications (idempotent, race-safe)
  UPDATE public.referral_statistics rs
  SET
    total_rewards_earned = (SELECT COUNT(*) FROM public.referral_reward_notifications n WHERE n.user_id = referrer_user_id),
    total_cash_rewards_ksh = (
      SELECT COALESCE(SUM(n.reward_amount), 0)
      FROM public.referral_reward_notifications n
      WHERE n.user_id = referrer_user_id
    ),
    next_cash_milestone = CASE
      WHEN completed_count >= 2000 THEN 2000
      WHEN completed_count >= 200 THEN 2000
      WHEN completed_count >= 20 THEN 200
      ELSE 20
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

-- 5) Verified-only referral status update (atomic counts, idempotent milestones)
CREATE OR REPLACE FUNCTION public.update_referral_status(
  referred_user_id_param UUID,
  new_status TEXT
)
RETURNS JSONB AS $$
DECLARE
  referrer_user_id UUID;
  successful_count INTEGER := 0;
  reward_result JSONB;
BEGIN
  -- Update status monotonically (never downgrade)
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

  -- Ensure referrer statistics row exists
  INSERT INTO public.referral_statistics (user_id)
  VALUES (referrer_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Recompute derived counts (verified-only success)
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
    current_batch_progress = successful_count,
    updated_at = NOW()
  WHERE rs.user_id = referrer_user_id;

  -- Milestones fire when a referral becomes successful (verified/completed)
  IF new_status IN ('verified', 'completed') THEN
    reward_result := public.check_and_notify_cash_reward(referrer_user_id, successful_count);
  ELSE
    reward_result := jsonb_build_object('reward_granted', FALSE, 'milestone_reached', 0, 'reward_amount', 0);
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'referrer_id', referrer_user_id,
    'completed_count', successful_count,
    'reward_granted', (reward_result->>'reward_granted')::BOOLEAN,
    'milestone_reached', (reward_result->>'milestone_reached')::INTEGER,
    'reward_amount', (reward_result->>'reward_amount')::INTEGER
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog';

-- 5b) Secure referral progress RPC (self-only unless service role)
CREATE OR REPLACE FUNCTION public.get_referral_progress(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  stats RECORD;
  next_milestone_value INTEGER;
  referrals_until_next INTEGER;
  request_role TEXT;
BEGIN
  -- Enforce self-access for PostgREST calls; allow internal DB calls (no request role) and service_role.
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

  IF COALESCE(stats.completed_referrals, 0) >= 2000 THEN
    next_milestone_value := 2000;
    referrals_until_next := 0;
  ELSIF COALESCE(stats.completed_referrals, 0) >= 200 THEN
    next_milestone_value := 2000;
    referrals_until_next := 2000 - COALESCE(stats.completed_referrals, 0);
  ELSIF COALESCE(stats.completed_referrals, 0) >= 20 THEN
    next_milestone_value := 200;
    referrals_until_next := 200 - COALESCE(stats.completed_referrals, 0);
  ELSE
    next_milestone_value := 20;
    referrals_until_next := 20 - COALESCE(stats.completed_referrals, 0);
  END IF;

  result := jsonb_build_object(
    'total_referrals', COALESCE(stats.total_referrals, 0),
    'completed_referrals', COALESCE(stats.completed_referrals, 0),
    'pending_referrals', COALESCE(stats.pending_referrals, 0),
    'current_batch_progress', COALESCE(stats.current_batch_progress, 0),
    'next_milestone', next_milestone_value,
    'referrals_until_reward', referrals_until_next,
    'total_rewards_earned', COALESCE(stats.total_rewards_earned, 0),
    'total_cash_rewards_ksh', COALESCE(stats.total_cash_rewards_ksh, 0),
    'has_active_premium', FALSE,
    'premium_start_date', NULL,
    'premium_end_date', NULL
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog';

-- 6) Harden RLS: no client writes; service role / security definer functions only
-- Referrals table
DROP POLICY IF EXISTS "Anyone can insert referrals" ON public.referrals;
DROP POLICY IF EXISTS "System can update referrals" ON public.referrals;

DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

CREATE POLICY "Service role can insert referrals"
  ON public.referrals FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

CREATE POLICY "Service role can update referrals"
  ON public.referrals FOR UPDATE
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Referral statistics table
DROP POLICY IF EXISTS "System can manage referral statistics" ON public.referral_statistics;

DROP POLICY IF EXISTS "Users can view their own referral statistics" ON public.referral_statistics;
CREATE POLICY "Users can view their own referral statistics"
  ON public.referral_statistics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage referral statistics"
  ON public.referral_statistics FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Reward notifications table
DROP POLICY IF EXISTS "System can manage reward notifications" ON public.referral_reward_notifications;

DROP POLICY IF EXISTS "Users can view their own reward notifications" ON public.referral_reward_notifications;
CREATE POLICY "Users can view their own reward notifications"
  ON public.referral_reward_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage reward notifications"
  ON public.referral_reward_notifications FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Referral codes table: users can read their code, but cannot set/override it.
DROP POLICY IF EXISTS "Users can insert their own referral code" ON public.user_referral_codes;

CREATE POLICY "Service role can manage referral codes"
  ON public.user_referral_codes FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- 7) Revoke dangerous function execution from clients
REVOKE EXECUTE ON FUNCTION public.update_referral_status(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_referral_status(UUID, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_referral_status(UUID, TEXT) TO service_role, supabase_auth_admin;

REVOKE EXECUTE ON FUNCTION public.check_and_notify_cash_reward(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_and_notify_cash_reward(UUID, INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_notify_cash_reward(UUID, INTEGER) TO service_role, supabase_auth_admin;

-- Keep get_referral_progress callable by authenticated (self-only enforced in function)
REVOKE EXECUTE ON FUNCTION public.get_referral_progress(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_referral_progress(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_referral_progress(UUID) TO authenticated, service_role, supabase_auth_admin;

-- Keep generate_referral_code callable by authenticated (self-only enforced by caller usage)
REVOKE EXECUTE ON FUNCTION public.generate_referral_code(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_referral_code(UUID) TO authenticated, service_role, supabase_auth_admin;


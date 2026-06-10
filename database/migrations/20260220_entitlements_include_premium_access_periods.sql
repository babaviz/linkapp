-- Entitlements: include premium_access_periods as Premium-equivalent access
-- Supports referral premium weeks (source='referral_reward') and other premium grants.
-- Date: 2026-02-20

CREATE OR REPLACE FUNCTION public.get_user_entitlement_state(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_paid RECORD;
  v_trial RECORD;
  v_bonus_end TIMESTAMPTZ := NULL;
  v_bonus_active_now BOOLEAN := FALSE;
  v_trial_end TIMESTAMPTZ := NULL;
  v_state TEXT := 'FREE';
  v_effective_tier TEXT := 'free';
  v_expires_at TIMESTAMPTZ := NULL;
BEGIN
  PERFORM public.expire_trials_and_mark_inactive();

  -- Highest active subscription (premium > pro)
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

  -- Latest trial record (may be inactive/expired; returned for UI)
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

  IF v_trial.trial_active = TRUE AND v_trial.trial_end_date > NOW() THEN
    v_trial_end := v_trial.trial_end_date;
  END IF;

  -- Bonus premium access periods (referral/admin/promo). We consider any unexpired period
  -- so stacked future periods extend the effective premium expiry.
  SELECT
    MAX(p.end_date) AS max_end,
    BOOL_OR(NOW() BETWEEN p.start_date AND p.end_date) AS active_now
  INTO v_bonus_end, v_bonus_active_now
  FROM public.premium_access_periods p
  WHERE p.user_id = p_user_id
    AND p.status = 'active'
    AND p.is_active = TRUE
    AND p.end_date > NOW();

  -- Resolve state/tier with clear precedence:
  -- - Paid premium subscription wins (state=PREMIUM)
  -- - Premium-equivalent access can be granted by:
  --   - an active bonus period in premium_access_periods, or
  --   - an active free trial
  -- - Paid pro subscription yields effective_tier='pro' when no premium-equivalent is active
  IF v_paid.id IS NOT NULL AND v_paid.tier = 'premium' THEN
    v_state := 'PREMIUM';
    v_effective_tier := 'premium';
    v_expires_at := GREATEST(
      v_paid.end_date,
      COALESCE(v_bonus_end, v_paid.end_date),
      COALESCE(v_trial_end, v_paid.end_date)
    );
  ELSIF v_bonus_active_now = TRUE OR (v_trial_end IS NOT NULL AND v_trial_end > NOW()) THEN
    -- Premium-equivalent access (bonus periods and/or trial)
    v_effective_tier := 'premium';
    v_expires_at := GREATEST(
      COALESCE(v_trial_end, 'epoch'::timestamptz),
      COALESCE(v_bonus_end, 'epoch'::timestamptz)
    );

    IF v_bonus_active_now = TRUE AND v_bonus_end IS NOT NULL AND v_bonus_end >= COALESCE(v_trial_end, 'epoch'::timestamptz) THEN
      v_state := 'BONUS_ACTIVE';
    ELSE
      v_state := 'TRIAL_ACTIVE';
    END IF;
  ELSIF v_paid.id IS NOT NULL AND v_paid.tier = 'pro' THEN
    v_state := 'PRO';
    v_effective_tier := 'pro';
    v_expires_at := v_paid.end_date;
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

-- Keep DateMi tier derivation consistent with entitlement model (paid premium/pro, trial, bonus periods).
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
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.user_id = p.user_id
        AND s.status = 'active'
        AND s.end_date > NOW()
        AND s.tier = 'premium'
      LIMIT 1
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_trial_entitlements te
      WHERE te.user_id = p.user_id
        AND te.trial_active = TRUE
        AND te.trial_end_date > NOW()
      LIMIT 1
    )
    OR EXISTS (
      SELECT 1
      FROM public.premium_access_periods pa
      WHERE pa.user_id = p.user_id
        AND pa.status = 'active'
        AND pa.is_active = TRUE
        AND pa.end_date > NOW()
        AND pa.start_date <= NOW()
      LIMIT 1
    )
      THEN 'premium'
    WHEN EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.user_id = p.user_id
        AND s.status = 'active'
        AND s.end_date > NOW()
        AND s.tier = 'pro'
      LIMIT 1
    )
      THEN 'pro'
    ELSE 'free'
  END AS subscription_tier
FROM public.date_mi_profiles p;

GRANT SELECT ON public.date_mi_profiles_with_tier TO authenticated;


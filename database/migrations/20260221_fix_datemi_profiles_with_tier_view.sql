-- Fix DateMi profiles view to include full profile columns.
-- Prevents runtime errors like: column date_mi_profiles_with_tier.age does not exist (42703)
-- and ensures existing profiles load correctly (so users aren't prompted to recreate profiles).
--
-- The premium-equivalent checks for trials/bonus periods are included only if the
-- underlying tables exist, so this migration is safe across environments.

DO $$
DECLARE
  v_has_trials BOOLEAN := to_regclass('public.user_trial_entitlements') IS NOT NULL;
  v_has_bonus BOOLEAN := to_regclass('public.premium_access_periods') IS NOT NULL;
  v_premium_checks TEXT;
  v_sql TEXT;
BEGIN
  v_premium_checks := $checks$
EXISTS (
  SELECT 1
  FROM public.subscriptions s
  WHERE s.user_id = p.user_id
    AND s.status = 'active'
    AND s.end_date > NOW()
    AND s.tier = 'premium'
  LIMIT 1
)
$checks$;

  IF v_has_trials THEN
    v_premium_checks := v_premium_checks || $checks$
OR EXISTS (
  SELECT 1
  FROM public.user_trial_entitlements te
  WHERE te.user_id = p.user_id
    AND te.trial_active = TRUE
    AND te.trial_end_date > NOW()
  LIMIT 1
)
$checks$;
  END IF;

  IF v_has_bonus THEN
    v_premium_checks := v_premium_checks || $checks$
OR EXISTS (
  SELECT 1
  FROM public.premium_access_periods pa
  WHERE pa.user_id = p.user_id
    AND pa.status = 'active'
    AND pa.is_active = TRUE
    AND pa.start_date <= NOW()
    AND pa.end_date > NOW()
  LIMIT 1
)
$checks$;
  END IF;

  v_sql := format($view$
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
    WHEN %s THEN 'premium'
    WHEN EXISTS (
      SELECT 1
      FROM public.subscriptions s
      WHERE s.user_id = p.user_id
        AND s.status = 'active'
        AND s.end_date > NOW()
        AND s.tier = 'pro'
      LIMIT 1
    ) THEN 'pro'
    ELSE 'free'
  END AS subscription_tier
  ,
  -- New columns are appended to preserve existing view column ordering.
  p.age,
  p.is_online,
  p.last_seen,
  p.location,
  p.interests,
  p.intention,
  p.verified,
  u.profile_image_url
FROM public.date_mi_profiles p
LEFT JOIN public.users u ON u.id = p.user_id;
$view$, v_premium_checks);

  EXECUTE v_sql;
  EXECUTE 'GRANT SELECT ON public.date_mi_profiles_with_tier TO authenticated;';
END;
$$;


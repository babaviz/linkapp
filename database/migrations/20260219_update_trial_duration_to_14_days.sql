-- Ensure trials are 14 days (safety migration)
-- - Replaces assign_trial_if_eligible() to use 14 days
-- - Extends existing trial rows that were assigned with 7-day duration

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

DO $$
BEGIN
  IF to_regclass('public.user_trial_entitlements') IS NULL THEN
    RAISE NOTICE 'user_trial_entitlements not found; skipping trial duration update';
    RETURN;
  END IF;

  UPDATE public.user_trial_entitlements
  SET
    trial_end_date = trial_start_date + INTERVAL '14 days',
    trial_active = CASE
      WHEN converted_to_paid_at IS NOT NULL THEN FALSE
      WHEN trial_start_date IS NULL THEN FALSE
      WHEN (trial_start_date + INTERVAL '14 days') > NOW() THEN TRUE
      ELSE FALSE
    END,
    updated_at = NOW(),
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'trial_duration_days', 14,
      'trial_duration_migrated_at', NOW()
    )
  WHERE trial_start_date IS NOT NULL
    AND trial_end_date IS NOT NULL
    AND converted_to_paid_at IS NULL
    AND trial_end_date < (trial_start_date + INTERVAL '14 days');
END;
$$;


-- Migration: Update Activity Indicators System
-- Description: Adds functions and triggers to automatically update activity_indicators
--              based on real user activity from user_activities table

-- Single-row metadata table used for throttling
CREATE TABLE IF NOT EXISTS public.activity_indicator_meta (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_run TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Ensure the meta row exists
CREATE OR REPLACE FUNCTION public.ensure_activity_indicator_meta_row()
RETURNS void AS $$
BEGIN
  INSERT INTO public.activity_indicator_meta (id, last_run)
  VALUES (1, NOW())
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Throttle helper: returns true if last run older than N seconds and updates the timestamp.
CREATE OR REPLACE FUNCTION public.should_update_activity_indicators(min_seconds INTEGER)
RETURNS boolean AS $$
DECLARE
  previous_run TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT last_run INTO previous_run
  FROM public.activity_indicator_meta
  WHERE id = 1
  FOR UPDATE;

  IF previous_run IS NULL OR NOW() - previous_run >= make_interval(secs => min_seconds) THEN
    UPDATE public.activity_indicator_meta SET last_run = NOW() WHERE id = 1;
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate and update activity indicators
CREATE OR REPLACE FUNCTION public.update_activity_indicators()
RETURNS void AS $$
DECLARE
  property_count INTEGER;
  jobs_count INTEGER;
  services_count INTEGER;
  datemi_count INTEGER;
  current_ts TIMESTAMP WITH TIME ZONE;
  five_minutes_ago TIMESTAMP WITH TIME ZONE;
BEGIN
  current_ts := NOW();
  five_minutes_ago := current_ts - INTERVAL '5 minutes';

  -- Count unique active users for property module (last 5 minutes)
  SELECT COUNT(DISTINCT user_id) INTO property_count
  FROM user_activities
  WHERE content_type = 'property'
    AND timestamp >= five_minutes_ago
    AND action IN ('view', 'search', 'browse', 'save', 'inquire');

  -- Count unique active users for jobs module (last 5 minutes)
  SELECT COUNT(DISTINCT user_id) INTO jobs_count
  FROM user_activities
  WHERE content_type = 'job'
    AND timestamp >= five_minutes_ago
    AND action IN ('view', 'search', 'browse', 'save', 'apply');

  -- Count unique active users for services module (last 5 minutes)
  SELECT COUNT(DISTINCT user_id) INTO services_count
  FROM user_activities
  WHERE content_type = 'service'
    AND timestamp >= five_minutes_ago
    AND action IN ('view', 'search', 'browse', 'save', 'contact');

  -- Count unique active users for datemi module (last 5 minutes)
  SELECT COUNT(DISTINCT user_id) INTO datemi_count
  FROM user_activities
  WHERE content_type = 'profile'
    AND timestamp >= five_minutes_ago
    AND action IN ('view', 'like', 'search', 'browse');

  -- Update or insert activity indicators (0 allowed when no one is active)
  INSERT INTO activity_indicators (module, activity_count, activity_text, last_updated, updated_at)
  VALUES 
    ('property', property_count, 
     (CASE WHEN property_count = 1 THEN '1 person searching right now' ELSE property_count || ' people searching right now' END),
     current_ts, current_ts),
    ('jobs', jobs_count, 
     (CASE WHEN jobs_count = 1 THEN '1 person searching right now' ELSE jobs_count || ' people searching right now' END),
     current_ts, current_ts),
    ('services', services_count, 
     (CASE WHEN services_count = 1 THEN '1 person searching for services right now' ELSE services_count || ' people searching for services right now' END),
     current_ts, current_ts),
    ('datemi', datemi_count, 
     (CASE WHEN datemi_count = 1 THEN '1 active match today' ELSE datemi_count || ' active matches today' END),
     current_ts, current_ts)
  ON CONFLICT (module) 
  DO UPDATE SET 
    activity_count = EXCLUDED.activity_count,
    activity_text = EXCLUDED.activity_text,
    last_updated = EXCLUDED.last_updated,
    updated_at = EXCLUDED.updated_at;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track user activity and trigger indicator update
CREATE OR REPLACE FUNCTION track_user_activity_and_update_indicators()
RETURNS trigger AS $$
BEGIN
  -- Throttled update of activity indicators (runs at most once per 10 seconds).
  -- This keeps "people searching right now" synced with real traffic without hammering the DB.
  PERFORM public.ensure_activity_indicator_meta_row();

  IF public.should_update_activity_indicators(10) THEN
    PERFORM public.update_activity_indicators();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_activity_indicators ON user_activities;

-- Create trigger that fires after insert on user_activities
-- Only trigger for relevant actions
CREATE TRIGGER trigger_update_activity_indicators
  AFTER INSERT ON user_activities
  FOR EACH ROW
  WHEN (NEW.action IN ('view', 'search', 'browse', 'save', 'like', 'apply', 'inquire', 'contact'))
  EXECUTE FUNCTION track_user_activity_and_update_indicators();

-- Create index to optimize activity counting queries
CREATE INDEX IF NOT EXISTS idx_user_activities_timestamp_content_type 
ON user_activities(timestamp DESC, content_type, user_id);

-- Add unique constraint on module if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'activity_indicators_module_key'
  ) THEN
    ALTER TABLE activity_indicators ADD CONSTRAINT activity_indicators_module_key UNIQUE (module);
  END IF;
END $$;

-- Initialize activity indicators if they don't exist
INSERT INTO activity_indicators (module, activity_count, activity_text, last_updated, updated_at)
VALUES 
  ('property', 0, '0 people searching right now', NOW(), NOW()),
  ('jobs', 0, '0 people searching right now', NOW(), NOW()),
  ('services', 0, '0 people searching for services right now', NOW(), NOW()),
  ('datemi', 0, '0 active matches today', NOW(), NOW())
ON CONFLICT (module) DO NOTHING;

-- Create a function to be called periodically (e.g., via cron or scheduled job)
-- to update indicators even when there's no recent activity
COMMENT ON FUNCTION update_activity_indicators() IS 
'Updates activity_indicators table based on recent user_activities. 
Should be called periodically (e.g., every 1-2 minutes) via pg_cron or external scheduler.';

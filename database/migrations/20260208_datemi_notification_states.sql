-- Migration: Add DateMi notification state persistence
-- Description: Persists Date Mi unread state cursors/counts for likes and missed calls.
-- Notes:
-- - Messages unread state is managed by Stream Chat read states.
-- - We store last_seen timestamps to compute accurate counts and avoid double increments.

CREATE TABLE IF NOT EXISTS public.datemi_notification_states (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  -- Optional cached counts (may be recomputed client-side for correctness)
  unread_likes_count INTEGER NOT NULL DEFAULT 0,
  missed_calls_count INTEGER NOT NULL DEFAULT 0,
  -- Truthy cursors for unread calculations
  likes_last_seen_at TIMESTAMPTZ,
  missed_calls_last_seen_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.datemi_notification_states ENABLE ROW LEVEL SECURITY;

-- Keep updated_at current (relies on shared handle_updated_at() function)
DROP TRIGGER IF EXISTS handle_datemi_notification_states_updated_at ON public.datemi_notification_states;
CREATE TRIGGER handle_datemi_notification_states_updated_at
  BEFORE UPDATE ON public.datemi_notification_states
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own DateMi notification state" ON public.datemi_notification_states;
DROP POLICY IF EXISTS "Users can insert their own DateMi notification state" ON public.datemi_notification_states;
DROP POLICY IF EXISTS "Users can update their own DateMi notification state" ON public.datemi_notification_states;
DROP POLICY IF EXISTS "Service role can manage all DateMi notification state" ON public.datemi_notification_states;

CREATE POLICY "Users can view their own DateMi notification state"
  ON public.datemi_notification_states
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own DateMi notification state"
  ON public.datemi_notification_states
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own DateMi notification state"
  ON public.datemi_notification_states
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all DateMi notification state"
  ON public.datemi_notification_states
  FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes (helpful for admin/debugging and service-role batch ops)
CREATE INDEX IF NOT EXISTS idx_datemi_notification_states_updated_at
  ON public.datemi_notification_states(updated_at DESC);

-- Explicit privileges (safe even if defaults already exist)
GRANT SELECT, INSERT, UPDATE ON public.datemi_notification_states TO authenticated;


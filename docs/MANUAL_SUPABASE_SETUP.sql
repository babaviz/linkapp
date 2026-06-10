-- ============================================================================
-- NOTIFICATION SYSTEM SETUP - MANUAL SQL COMMANDS
-- Copy and paste these commands into your Supabase SQL Editor
-- Run them one section at a time for best results
-- ============================================================================

-- SECTION 1: CREATE TABLES
-- ============================================================================

-- Create notification_tokens table
CREATE TABLE IF NOT EXISTS public.notification_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, platform)
);

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  job_alerts BOOLEAN DEFAULT true NOT NULL,
  message_notifications BOOLEAN DEFAULT true NOT NULL,
  payment_alerts BOOLEAN DEFAULT true NOT NULL,
  system_updates BOOLEAN DEFAULT true NOT NULL,
  marketing_messages BOOLEAN DEFAULT false NOT NULL,
  quiet_hours_enabled BOOLEAN DEFAULT false NOT NULL,
  quiet_hours_start TIME DEFAULT '22:00:00' NOT NULL,
  quiet_hours_end TIME DEFAULT '08:00:00' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create notification_history table
CREATE TABLE IF NOT EXISTS public.notification_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL,
  data JSONB DEFAULT '{}' NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'clicked')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- SECTION 2: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.notification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECTION 3: CREATE RLS POLICIES
-- ============================================================================

-- Policies for notification_tokens
DROP POLICY IF EXISTS "Users can manage their own tokens" ON public.notification_tokens;
CREATE POLICY "Users can manage their own tokens"
ON public.notification_tokens
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policies for notification_settings
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.notification_settings;
CREATE POLICY "Users can manage their own settings"
ON public.notification_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policies for notification_history (read-only for users)
DROP POLICY IF EXISTS "Users can view their own history" ON public.notification_history;
CREATE POLICY "Users can view their own history"
ON public.notification_history
FOR SELECT
USING (auth.uid() = user_id);

-- Policy for service role to manage notification_history
DROP POLICY IF EXISTS "Service role can manage history" ON public.notification_history;
CREATE POLICY "Service role can manage history"
ON public.notification_history
FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================================================
-- SECTION 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notification_history_user_category 
ON public.notification_history(user_id, category);

CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at 
ON public.notification_history(sent_at);

CREATE INDEX IF NOT EXISTS idx_notification_tokens_user_platform 
ON public.notification_tokens(user_id, platform);

-- ============================================================================
-- SECTION 5: CREATE UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 6: CREATE TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS handle_updated_at_notification_tokens ON public.notification_tokens;
CREATE TRIGGER handle_updated_at_notification_tokens
  BEFORE UPDATE ON public.notification_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_notification_settings ON public.notification_settings;
CREATE TRIGGER handle_updated_at_notification_settings
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- SECTION 7: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_settings TO authenticated;
GRANT SELECT ON public.notification_history TO authenticated;

-- Grant full access to service role for notification_history
GRANT ALL ON public.notification_history TO service_role;

-- ============================================================================
-- SECTION 8: ADD TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE public.notification_tokens IS 'Stores push notification tokens for users across different platforms';
COMMENT ON TABLE public.notification_settings IS 'Stores user notification preferences and settings';
COMMENT ON TABLE public.notification_history IS 'Tracks all notifications sent to users for analytics and debugging';

-- ============================================================================
-- SECTION 9: VERIFICATION QUERIES
-- Run these to verify everything was created correctly
-- ============================================================================

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('notification_tokens', 'notification_settings', 'notification_history');

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('notification_tokens', 'notification_settings', 'notification_history');

-- Check policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('notification_tokens', 'notification_settings', 'notification_history');

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('notification_tokens', 'notification_settings', 'notification_history');

-- ============================================================================
-- SETUP COMPLETE!
-- Your notification system database is now ready to use.
-- ============================================================================
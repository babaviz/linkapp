-- Migration: Add notification tables
-- Created: 2025-01-15
-- Description: Creates tables for storing notification tokens and user notification settings

-- Create notification_tokens table
CREATE TABLE IF NOT EXISTS public.notification_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Ensure one token per user per platform
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

-- Create notification_history table (for tracking sent notifications)
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
  clicked_at TIMESTAMP WITH TIME ZONE,
  
  -- Index for querying by user and category
  INDEX idx_notification_history_user_category (user_id, category),
  INDEX idx_notification_history_sent_at (sent_at)
);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.notification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_tokens
CREATE POLICY "Users can view their own notification tokens"
ON public.notification_tokens
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification tokens"
ON public.notification_tokens
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification tokens"
ON public.notification_tokens
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification tokens"
ON public.notification_tokens
FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for notification_settings
CREATE POLICY "Users can view their own notification settings"
ON public.notification_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification settings"
ON public.notification_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification settings"
ON public.notification_settings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification settings"
ON public.notification_settings
FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for notification_history
CREATE POLICY "Users can view their own notification history"
ON public.notification_history
FOR SELECT
USING (auth.uid() = user_id);

-- Only the backend service should insert notification history
-- Users cannot directly insert/update/delete notification history

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
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

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_settings TO authenticated;
GRANT SELECT ON public.notification_history TO authenticated;

-- Grant permissions to service role for notification_history
GRANT ALL ON public.notification_history TO service_role;

COMMENT ON TABLE public.notification_tokens IS 'Stores push notification tokens for users across different platforms';
COMMENT ON TABLE public.notification_settings IS 'Stores user notification preferences and settings';
COMMENT ON TABLE public.notification_history IS 'Tracks all notifications sent to users for analytics and debugging';
-- Migration: Update notification_history table for read/unread states
-- Created: 2025-09-23
-- Description: Adds read_at column and updates indexes for notification history

-- Add read_at column to track when notifications are read
ALTER TABLE public.notification_history 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient querying of unread notifications
CREATE INDEX IF NOT EXISTS idx_notification_history_unread 
ON public.notification_history (user_id, read_at) 
WHERE read_at IS NULL;

-- Add index for read notifications
CREATE INDEX IF NOT EXISTS idx_notification_history_read 
ON public.notification_history (user_id, read_at) 
WHERE read_at IS NOT NULL;

-- Add composite index for category and read status
CREATE INDEX IF NOT EXISTS idx_notification_history_category_read 
ON public.notification_history (user_id, category, read_at);

-- Update RLS policies to allow users to update read_at
CREATE POLICY "Users can mark their notifications as read"
ON public.notification_history
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Grant update permission for read_at column specifically
GRANT UPDATE(read_at, clicked_at) ON public.notification_history TO authenticated;

-- Add helpful comments
COMMENT ON COLUMN public.notification_history.read_at IS 'Timestamp when the user marked the notification as read';
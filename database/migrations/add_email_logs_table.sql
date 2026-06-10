-- Migration: Add email logs table
-- Created: 2025-12-28
-- Description: Creates table for tracking sent emails for audit and compliance

-- Create email_logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('transactional', 'marketing')),
  provider TEXT NOT NULL, -- 'resend', 'sendgrid', 'ses', etc.
  provider_message_id TEXT,
  metadata JSONB DEFAULT '{}' NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  failed_reason TEXT --,
  
  -- Indexes for querying
  -- INDEX idx_email_logs_recipient (recipient),
  -- INDEX idx_email_logs_sent_at (sent_at),
  -- INDEX idx_email_logs_status (status)
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies (only service role can access email logs for privacy)
CREATE POLICY "Service role can manage email logs"
ON public.email_logs
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

-- Grant permissions
GRANT ALL ON public.email_logs TO service_role;

COMMENT ON TABLE public.email_logs IS 'Audit log for all emails sent by the system for compliance and debugging';
COMMENT ON COLUMN public.email_logs.email_type IS 'Type of email: transactional (account activity) or marketing (promotions)';
COMMENT ON COLUMN public.email_logs.provider_message_id IS 'Message ID from email provider for tracking delivery status';

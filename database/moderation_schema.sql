-- Community Moderation System Database Schema
-- Comprehensive moderation and safety features

-- Content Reports Table
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('property', 'job', 'service', 'story', 'profile', 'message')),
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  reported_user_id UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL CHECK (reason IN (
    'spam', 'harassment', 'inappropriate_content', 'false_information', 
    'scam_fraud', 'violence_threats', 'hate_speech', 'illegal_content', 
    'copyright', 'impersonation', 'other'
  )),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed', 'escalated')),
  priority TEXT NOT NULL DEFAULT 'low' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  evidence_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  moderator_notes TEXT,
  
  -- Indexes
  INDEX idx_content_reports_status (status),
  INDEX idx_content_reports_priority (priority),
  INDEX idx_content_reports_reporter (reporter_id),
  INDEX idx_content_reports_reported_user (reported_user_id),
  INDEX idx_content_reports_created_at (created_at),
  INDEX idx_content_reports_content (content_type, content_id)
);

-- Moderation Actions Table
CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES content_reports(id),
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  moderator_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'warning', 'content_removal', 'temporary_suspension', 
    'permanent_ban', 'content_flag', 'account_restriction'
  )),
  reason TEXT NOT NULL,
  duration INTEGER, -- in hours for temporary actions
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Indexes
  INDEX idx_moderation_actions_target_user (target_user_id),
  INDEX idx_moderation_actions_moderator (moderator_id),
  INDEX idx_moderation_actions_type (action_type),
  INDEX idx_moderation_actions_active (is_active),
  INDEX idx_moderation_actions_expires (expires_at)
);

-- User Moderation Status Table
CREATE TABLE IF NOT EXISTS user_moderation_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  warnings_count INTEGER DEFAULT 0,
  strikes_count INTEGER DEFAULT 0,
  is_suspended BOOLEAN DEFAULT FALSE,
  suspension_expires_at TIMESTAMP WITH TIME ZONE,
  is_banned BOOLEAN DEFAULT FALSE,
  reputation_score INTEGER DEFAULT 100 CHECK (reputation_score >= 0 AND reputation_score <= 100),
  last_violation TIMESTAMP WITH TIME ZONE,
  restriction_flags TEXT[] DEFAULT '{}', -- array of restriction types
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_user_moderation_suspended (is_suspended),
  INDEX idx_user_moderation_banned (is_banned),
  INDEX idx_user_moderation_reputation (reputation_score)
);

-- Auto Moderation Rules Table
CREATE TABLE IF NOT EXISTS auto_moderation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('keyword', 'pattern', 'ai_detection', 'behavior')),
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Indexes
  INDEX idx_auto_moderation_rules_active (is_active),
  INDEX idx_auto_moderation_rules_type (rule_type),
  INDEX idx_auto_moderation_rules_severity (severity)
);

-- Community Guidelines Table
CREATE TABLE IF NOT EXISTS community_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'respectful_communication', 'accurate_information', 'appropriate_content',
    'safety_security', 'legal_compliance', 'platform_integrity'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'major', 'severe')),
  examples TEXT[],
  consequences TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_community_guidelines_active (is_active),
  INDEX idx_community_guidelines_category (category),
  INDEX idx_community_guidelines_severity (severity)
);

-- Moderation Logs Table (for audit trail)
CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'user', 'content', 'report', etc.
  target_id TEXT NOT NULL,
  moderator_id UUID REFERENCES auth.users(id),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() --,
  
  -- Indexes
  -- INDEX idx_moderation_logs_type (action_type),
  -- INDEX idx_moderation_logs_target (target_type, target_id),
  -- INDEX idx_moderation_logs_moderator (moderator_id),
  -- INDEX idx_moderation_logs_created_at (created_at)
);

-- Content Safety Scores Table (for AI/ML content analysis results)
CREATE TABLE IF NOT EXISTS content_safety_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL,
  safety_score DECIMAL(5,4) NOT NULL CHECK (safety_score >= 0 AND safety_score <= 1),
  confidence_score DECIMAL(5,4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  detected_issues JSONB,
  analysis_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  -- INDEX idx_content_safety_scores_content (content_type, content_id),
  -- INDEX idx_content_safety_scores_safety (safety_score),
  -- INDEX idx_content_safety_scores_created_at (created_at),
  
  -- Unique constraint to prevent duplicate analysis
  UNIQUE(content_id, content_type, analysis_version)
);

-- Moderator Activity Table (for performance tracking)
CREATE TABLE IF NOT EXISTS moderator_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reports_reviewed INTEGER DEFAULT 0,
  actions_taken INTEGER DEFAULT 0,
  response_time_minutes INTEGER DEFAULT 0, -- average response time
  accuracy_score DECIMAL(3,2), -- based on review of decisions
  
  -- Indexes
  -- INDEX idx_moderator_activity_moderator (moderator_id),
  -- INDEX idx_moderator_activity_date (date),
  
  -- Unique constraint for one record per moderator per day
  UNIQUE(moderator_id, date)
);

-- Trusted Users Table (whitelist for reduced moderation)
CREATE TABLE IF NOT EXISTS trusted_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  trust_level INTEGER DEFAULT 1 CHECK (trust_level >= 1 AND trust_level <= 5),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE --,
  
  -- Indexes
  -- INDEX idx_trusted_users_trust_level (trust_level),
  -- INDEX idx_trusted_users_active (is_active)
);

-- Row Level Security Policies

-- Only authenticated users can report content
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON content_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Moderators can view and update all reports
CREATE POLICY "Moderators can manage reports" ON content_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('moderator', 'admin')
    )
  );

-- Users can view their own moderation status
ALTER TABLE user_moderation_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own status" ON user_moderation_status
  FOR SELECT USING (auth.uid() = user_id);

-- Only moderators can update moderation status
CREATE POLICY "Moderators can update status" ON user_moderation_status
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('moderator', 'admin')
    )
  );

-- Community guidelines are public
ALTER TABLE community_guidelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guidelines are public" ON community_guidelines
  FOR SELECT USING (is_active = TRUE);

-- Functions and Triggers

-- Function to update user moderation status
CREATE OR REPLACE FUNCTION update_user_moderation_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_moderation_status (user_id, updated_at)
  VALUES (NEW.target_user_id, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    warnings_count = CASE 
      WHEN NEW.action_type = 'warning' THEN user_moderation_status.warnings_count + 1
      ELSE user_moderation_status.warnings_count
    END,
    strikes_count = CASE 
      WHEN NEW.action_type IN ('temporary_suspension', 'permanent_ban') 
      THEN user_moderation_status.strikes_count + 1
      ELSE user_moderation_status.strikes_count
    END,
    is_suspended = CASE 
      WHEN NEW.action_type = 'temporary_suspension' THEN TRUE
      WHEN NEW.action_type = 'permanent_ban' THEN FALSE
      ELSE user_moderation_status.is_suspended
    END,
    is_banned = CASE 
      WHEN NEW.action_type = 'permanent_ban' THEN TRUE
      ELSE user_moderation_status.is_banned
    END,
    suspension_expires_at = CASE 
      WHEN NEW.action_type = 'temporary_suspension' THEN NEW.expires_at
      ELSE user_moderation_status.suspension_expires_at
    END,
    last_violation = NOW(),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update user moderation status
CREATE TRIGGER trigger_update_user_moderation_status
  AFTER INSERT ON moderation_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_moderation_status();

-- Function to automatically expire suspensions
CREATE OR REPLACE FUNCTION expire_user_suspensions()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE user_moderation_status 
  SET 
    is_suspended = FALSE,
    suspension_expires_at = NULL,
    updated_at = NOW()
  WHERE 
    is_suspended = TRUE 
    AND suspension_expires_at IS NOT NULL 
    AND suspension_expires_at <= NOW();
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Insert initial community guidelines
INSERT INTO community_guidelines (title, description, category, severity, examples, consequences) VALUES
('Respectful Communication', 'Treat all community members with respect and courtesy', 'respectful_communication', 'major', 
 ARRAY['Be polite in messages', 'Avoid personal attacks', 'Respect different viewpoints'], 
 ARRAY['Warning for first offense', 'Temporary suspension for repeated violations']),

('Accurate Information', 'Provide truthful and accurate information in listings and communications', 'accurate_information', 'major',
 ARRAY['List actual property details', 'Provide real contact information', 'Be honest about availability'],
 ARRAY['Content removal', 'Account warning', 'Potential suspension for fraud']),

('Appropriate Content', 'Keep all content appropriate for a general audience', 'appropriate_content', 'severe',
 ARRAY['No explicit images or language', 'Family-friendly content only', 'Professional communication'],
 ARRAY['Immediate content removal', 'Account suspension', 'Permanent ban for severe violations']),

('Safety and Security', 'Prioritize the safety and security of all community members', 'safety_security', 'severe',
 ARRAY['No threats or intimidation', 'Meet in public places', 'Report suspicious activity'],
 ARRAY['Immediate investigation', 'Account suspension', 'Law enforcement referral if needed']),

('Legal Compliance', 'Ensure all activities comply with applicable laws and regulations', 'legal_compliance', 'severe',
 ARRAY['Valid property ownership or authorization', 'Comply with rental laws', 'No illegal activities'],
 ARRAY['Content removal', 'Account suspension', 'Legal action if required']),

('Platform Integrity', 'Maintain the integrity and trustworthiness of the platform', 'platform_integrity', 'major',
 ARRAY['One account per person', 'No spam or duplicate listings', 'Use platform as intended'],
 ARRAY['Account warning', 'Listing removal', 'Account suspension for repeated violations']);

-- Create indexes for performance
-- CREATE INDEX CONCURRENTLY idx_content_reports_composite ON content_reports (status, priority, created_at);
-- CREATE INDEX CONCURRENTLY idx_moderation_actions_composite ON moderation_actions (target_user_id, action_type, is_active);
-- CREATE INDEX CONCURRENTLY idx_user_moderation_composite ON user_moderation_status (is_suspended, is_banned, reputation_score);
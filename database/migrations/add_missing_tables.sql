-- Migration: Add Missing Tables
-- Description: Add tables that are referenced in services but missing from schema
-- Date: 2025-01-XX

-- ==========================================
-- AGE VERIFICATIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.age_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('national_id', 'passport', 'drivers_license', 'birth_certificate')),
    document_number TEXT NOT NULL, -- Should be encrypted in production
    date_of_birth DATE NOT NULL,
    document_image_url TEXT NOT NULL,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES public.users(id),
    rejection_reason TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    
    -- Ensure one verification per user per document type
    UNIQUE(user_id, document_type)
);

-- ==========================================
-- NOTIFICATION TOKENS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.notification_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    device_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one token per user per platform
    UNIQUE(user_id, platform)
);

-- ==========================================
-- NOTIFICATION SETTINGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    job_alerts BOOLEAN DEFAULT TRUE,
    message_notifications BOOLEAN DEFAULT TRUE,
    payment_alerts BOOLEAN DEFAULT TRUE,
    system_updates BOOLEAN DEFAULT TRUE,
    marketing_messages BOOLEAN DEFAULT FALSE,
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    push_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE
);

-- ==========================================
-- NOTIFICATION HISTORY TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.notification_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('job_alert', 'message', 'payment', 'system', 'marketing')),
    data JSONB DEFAULT '{}'::JSONB,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'clicked')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    notification_type TEXT DEFAULT 'push' CHECK (notification_type IN ('push', 'email', 'sms', 'in_app')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- ==========================================
-- CATEGORIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    module TEXT NOT NULL CHECK (module IN ('property', 'job', 'service')),
    key TEXT NOT NULL,
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '📋',
    color TEXT DEFAULT '#3B82F6',
    light_color TEXT DEFAULT '#DBEAFE',
    count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 999,
    
    -- Ensure unique key per module
    UNIQUE(module, key)
);

-- ==========================================
-- CONTENT REPORTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.content_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    content_id UUID NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('property', 'job', 'service', 'profile', 'message', 'comment')),
    reporter_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    reported_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN (
        'spam', 'inappropriate_content', 'harassment', 'hate_speech', 
        'violence_threats', 'illegal_content', 'scam_fraud', 'fake_profile',
        'copyright_violation', 'privacy_violation', 'other'
    )),
    description TEXT,
    evidence_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed', 'escalated')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES public.users(id),
    resolution_notes TEXT,
    metadata JSONB DEFAULT '{}'::JSONB
);

-- ==========================================
-- MODERATION ACTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.moderation_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    report_id UUID REFERENCES public.content_reports(id) ON DELETE CASCADE NOT NULL,
    target_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    moderator_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'warning', 'content_removal', 'temporary_suspension', 
        'permanent_ban', 'content_flag', 'account_restriction'
    )),
    reason TEXT NOT NULL,
    duration INTEGER, -- Duration in hours for temporary actions
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::JSONB
);

-- ==========================================
-- USER MODERATION STATUS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.user_moderation_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'warning', 'suspended', 'banned', 'restricted')),
    warning_count INTEGER DEFAULT 0,
    suspension_count INTEGER DEFAULT 0,
    total_reports_against INTEGER DEFAULT 0,
    total_reports_made INTEGER DEFAULT 0,
    reputation_score INTEGER DEFAULT 100 CHECK (reputation_score >= 0 AND reputation_score <= 100),
    last_warning_at TIMESTAMP WITH TIME ZONE,
    last_suspension_at TIMESTAMP WITH TIME ZONE,
    suspension_expires_at TIMESTAMP WITH TIME ZONE,
    appeal_count INTEGER DEFAULT 0,
    last_appeal_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::JSONB
);

-- ==========================================
-- ENABLE ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE public.age_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_moderation_status ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Age verifications policies
CREATE POLICY "Users can view their own age verifications" ON public.age_verifications 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own age verifications" ON public.age_verifications 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own age verifications" ON public.age_verifications 
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Moderators can view all age verifications" ON public.age_verifications 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('moderator', 'admin', 'super_admin')
            AND user_roles.is_active = TRUE
        )
    );

-- Notification tokens policies
CREATE POLICY "Users can manage their own notification tokens" ON public.notification_tokens 
    FOR ALL USING (auth.uid() = user_id);

-- Notification settings policies
CREATE POLICY "Users can manage their own notification settings" ON public.notification_settings 
    FOR ALL USING (auth.uid() = user_id);

-- Notification history policies
CREATE POLICY "Users can update their own notification history" ON public.notification_history 
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert notification history" ON public.notification_history 
    FOR INSERT WITH CHECK (TRUE);

-- Categories policies
CREATE POLICY "Admins can manage categories" ON public.categories 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('admin', 'super_admin')
            AND user_roles.is_active = TRUE
        )
    );

-- Content reports policies
CREATE POLICY "Users can view their own reports" ON public.content_reports 
    FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Users can create reports" ON public.content_reports 
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Moderators can view all reports" ON public.content_reports 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('moderator', 'admin', 'super_admin')
            AND user_roles.is_active = TRUE
        )
    );
CREATE POLICY "Moderators can update reports" ON public.content_reports 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('moderator', 'admin', 'super_admin')
            AND user_roles.is_active = TRUE
        )
    );

-- Moderation actions policies
CREATE POLICY "Users can view actions against them" ON public.moderation_actions 
    FOR SELECT USING (auth.uid() = target_user_id);
CREATE POLICY "Moderators can manage moderation actions" ON public.moderation_actions 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('moderator', 'admin', 'super_admin')
            AND user_roles.is_active = TRUE
        )
    );

-- User moderation status policies
CREATE POLICY "Users can view their own moderation status" ON public.user_moderation_status 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Moderators can view all moderation status" ON public.user_moderation_status 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('moderator', 'admin', 'super_admin')
            AND user_roles.is_active = TRUE
        )
    );
CREATE POLICY "System can manage moderation status" ON public.user_moderation_status 
    FOR ALL USING (TRUE);

-- ==========================================
-- ADD UPDATED_AT TRIGGERS
-- ==========================================
CREATE TRIGGER handle_age_verifications_updated_at 
    BEFORE UPDATE ON public.age_verifications 
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_notification_tokens_updated_at 
    BEFORE UPDATE ON public.notification_tokens 
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_notification_settings_updated_at 
    BEFORE UPDATE ON public.notification_settings 
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_notification_history_updated_at 
    BEFORE UPDATE ON public.notification_history 
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_content_reports_updated_at 
    BEFORE UPDATE ON public.content_reports 
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_moderation_actions_updated_at 
    BEFORE UPDATE ON public.moderation_actions 
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_user_moderation_status_updated_at 
    BEFORE UPDATE ON public.user_moderation_status 
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ==========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ==========================================

-- Age verifications indexes
CREATE INDEX IF NOT EXISTS idx_age_verifications_user_id ON public.age_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_age_verifications_status ON public.age_verifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_age_verifications_document_type ON public.age_verifications(document_type);

-- Notification tokens indexes
CREATE INDEX IF NOT EXISTS idx_notification_tokens_user_id ON public.notification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_tokens_platform ON public.notification_tokens(platform);
-- CREATE INDEX IF NOT EXISTS idx_notification_tokens_active ON public.notification_tokens(user_id, is_active) WHERE is_active = TRUE;

-- Notification settings indexes
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings(user_id);

-- Notification history indexes
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON public.notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_category ON public.notification_history(category);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON public.notification_history(status);
-- CREATE INDEX IF NOT EXISTS idx_notification_history_unread ON public.notification_history(user_id, read_at) WHERE read_at IS NULL;

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_module ON public.categories(module);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(module, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON public.categories(module, display_order);

-- Content reports indexes
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter_id ON public.content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reported_user_id ON public.content_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_priority ON public.content_reports(priority);
CREATE INDEX IF NOT EXISTS idx_content_reports_content ON public.content_reports(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_created_at ON public.content_reports(created_at DESC);

-- Moderation actions indexes
CREATE INDEX IF NOT EXISTS idx_moderation_actions_target_user_id ON public.moderation_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_moderator_id ON public.moderation_actions(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_report_id ON public.moderation_actions(report_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_type ON public.moderation_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_active ON public.moderation_actions(target_user_id, is_active) WHERE is_active = TRUE;

-- User moderation status indexes
CREATE INDEX IF NOT EXISTS idx_user_moderation_status_user_id ON public.user_moderation_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_moderation_status_status ON public.user_moderation_status(status);
CREATE INDEX IF NOT EXISTS idx_user_moderation_status_reputation ON public.user_moderation_status(reputation_score);

-- ==========================================
-- INSERT DEFAULT CATEGORIES
-- ==========================================

-- Property categories
INSERT INTO public.categories (module, key, name, label, description, icon, color, light_color, display_order) VALUES
('property', 'houses', 'Houses', 'Houses', 'Residential houses for rent or sale', '🏠', '#3B82F6', '#DBEAFE', 1),
('property', 'apartments', 'Apartments', 'Apartments', 'Apartment units for rent or sale', '🏢', '#10B981', '#D1FAE5', 2),
('property', 'one_bedroom', '1 Bedroom', '1 Bedroom', 'One bedroom properties', '🛏️', '#F59E0B', '#FEF3C7', 3),
('property', 'two_bedroom', '2 Bedroom', '2 Bedroom', 'Two bedroom properties', '🛏️', '#8B5CF6', '#EDE9FE', 4),
('property', 'three_bedroom', '3 Bedroom', '3 Bedroom', 'Three bedroom properties', '🏠', '#EF4444', '#FEE2E2', 5),
('property', 'bedsitters', 'Bedsitters', 'Bedsitters', 'Bedsitter units', '🛌', '#06B6D4', '#CFFAFE', 6),
('property', 'commercial', 'Commercial', 'Commercial', 'Commercial properties', '🏪', '#F97316', '#FED7AA', 7),
('property', 'industrial', 'Industrial', 'Industrial', 'Industrial properties', '🏭', '#84CC16', '#ECFCCB', 8),
('property', 'offices', 'Offices', 'Offices', 'Office spaces', '🏢', '#6366F1', '#E0E7FF', 9),
('property', 'land_plots', 'Land/Plots', 'Land/Plots', 'Land and plot sales', '🏞️', '#DC2626', '#FEE2E2', 10)
ON CONFLICT (module, key) DO NOTHING;

-- Job categories
INSERT INTO public.categories (module, key, name, label, description, icon, color, light_color, display_order) VALUES
('job', 'technology', 'Technology', 'Technology', 'Technology and IT jobs', '💻', '#3B82F6', '#DBEAFE', 1),
('job', 'healthcare', 'Healthcare', 'Healthcare', 'Healthcare and medical jobs', '🏥', '#10B981', '#D1FAE5', 2),
('job', 'education', 'Education', 'Education', 'Education and teaching jobs', '🎓', '#F59E0B', '#FEF3C7', 3),
('job', 'finance', 'Finance', 'Finance', 'Finance and banking jobs', '💰', '#8B5CF6', '#EDE9FE', 4),
('job', 'retail', 'Retail', 'Retail', 'Retail and sales jobs', '🛍️', '#EF4444', '#FEE2E2', 5),
('job', 'construction', 'Construction', 'Construction', 'Construction and building jobs', '🏗️', '#06B6D4', '#CFFAFE', 6),
('job', 'hospitality', 'Hospitality', 'Hospitality', 'Hospitality and tourism jobs', '🏨', '#F97316', '#FED7AA', 7),
('job', 'marketing', 'Marketing', 'Marketing', 'Marketing and advertising jobs', '📢', '#84CC16', '#ECFCCB', 8),
('job', 'customer_service', 'Customer Service', 'Customer Service', 'Customer service jobs', '📞', '#6366F1', '#E0E7FF', 9),
('job', 'logistics', 'Logistics', 'Logistics', 'Logistics and transportation jobs', '🚚', '#DC2626', '#FEE2E2', 10)
ON CONFLICT (module, key) DO NOTHING;

-- Service categories
INSERT INTO public.categories (module, key, name, label, description, icon, color, light_color, display_order) VALUES
('service', 'plumbing', 'Plumbing', 'Plumbing', 'Plumbing services', '🔧', '#3B82F6', '#DBEAFE', 1),
('service', 'electrical', 'Electrical', 'Electrical', 'Electrical services', '⚡', '#F59E0B', '#FEF3C7', 2),
('service', 'cleaning', 'Cleaning', 'Cleaning', 'Cleaning services', '🧹', '#10B981', '#D1FAE5', 3),
('service', 'moving', 'Moving', 'Moving', 'Moving and relocation services', '📦', '#8B5CF6', '#EDE9FE', 4),
('service', 'catering', 'Catering', 'Catering', 'Catering and food services', '🍽️', '#EF4444', '#FEE2E2', 5),
('service', 'photography', 'Photography', 'Photography', 'Photography services', '📷', '#06B6D4', '#CFFAFE', 6),
('service', 'gardening', 'Gardening', 'Gardening', 'Gardening and landscaping', '🌱', '#84CC16', '#ECFCCB', 7),
('service', 'repair', 'Repair', 'Repair', 'General repair services', '🔨', '#F97316', '#FED7AA', 8),
('service', 'consulting', 'Consulting', 'Consulting', 'Business consulting services', '💼', '#6366F1', '#E0E7FF', 9),
('service', 'transport', 'Transport', 'Transport', 'Transportation services', '🚗', '#DC2626', '#FEE2E2', 10)
ON CONFLICT (module, key) DO NOTHING;

-- ==========================================
-- CREATE HELPER FUNCTIONS
-- ==========================================

-- Function to automatically create notification settings for new users
CREATE OR REPLACE FUNCTION public.create_default_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notification_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default notification settings for new users
CREATE TRIGGER on_user_created_notification_settings
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE PROCEDURE public.create_default_notification_settings();

-- Function to automatically create user moderation status for new users
CREATE OR REPLACE FUNCTION public.create_default_moderation_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_moderation_status (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default moderation status for new users
CREATE TRIGGER on_user_created_moderation_status
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE PROCEDURE public.create_default_moderation_status();

-- Function to update category counts
CREATE OR REPLACE FUNCTION public.update_category_count()
RETURNS TRIGGER AS $$
DECLARE
    table_name TEXT;
    type_field TEXT;
    category_key TEXT;
BEGIN
    -- Determine table and field based on content type
    IF TG_TABLE_NAME = 'property_listings' THEN
        table_name := 'property_listings';
        type_field := 'property_type';
        category_key := NEW.property_type;
    ELSIF TG_TABLE_NAME = 'job_postings' THEN
        table_name := 'job_postings';
        type_field := 'job_category';
        category_key := NEW.job_category;
    ELSIF TG_TABLE_NAME = 'service_listings' THEN
        table_name := 'service_listings';
        type_field := 'category';
        category_key := NEW.category;
    ELSE
        RETURN NEW;
    END IF;

    -- Update category count
    UPDATE public.categories 
    SET count = (
        SELECT COUNT(*) 
        FROM property_listings 
        WHERE property_type = category_key AND status = 'available'
    )
    WHERE module = CASE 
        WHEN TG_TABLE_NAME = 'property_listings' THEN 'property'
        WHEN TG_TABLE_NAME = 'job_postings' THEN 'job'
        WHEN TG_TABLE_NAME = 'service_listings' THEN 'service'
    END AND key = category_key;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


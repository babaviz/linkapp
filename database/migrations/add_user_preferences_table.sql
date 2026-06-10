-- Migration: Add User Preferences Table
-- Description: Add user_preferences table for managing user settings
-- Date: 2025-01-18

-- ==========================================
-- USER PREFERENCES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Notification preferences
    notification_email BOOLEAN DEFAULT TRUE,
    notification_push BOOLEAN DEFAULT TRUE,
    notification_sms BOOLEAN DEFAULT FALSE,
    notification_categories JSONB DEFAULT '{
        "properties": true,
        "jobs": true,
        "services": true,
        "datemi": false,
        "messages": true,
        "matches": true,
        "updates": true,
        "security": true,
        "marketing": false
    }'::JSONB,
    
    -- Privacy preferences
    profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'friends_only')),
    show_location BOOLEAN DEFAULT TRUE,
    show_online_status BOOLEAN DEFAULT TRUE,
    allow_direct_messages BOOLEAN DEFAULT TRUE,
    
    -- General settings
    language TEXT DEFAULT 'en',
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system'))
);

-- ==========================================
-- ENABLE ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Users can manage their own preferences
CREATE POLICY "Users can view their own preferences" ON public.user_preferences 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON public.user_preferences 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON public.user_preferences 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" ON public.user_preferences 
    FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- ADD UPDATED_AT TRIGGER
-- ==========================================
CREATE TRIGGER handle_user_preferences_updated_at 
    BEFORE UPDATE ON public.user_preferences 
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ==========================================
-- CREATE INDEX FOR PERFORMANCE
-- ==========================================
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);

-- ==========================================
-- CREATE HELPER FUNCTION
-- ==========================================

-- Function to automatically create user preferences for new users
CREATE OR REPLACE FUNCTION public.create_default_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default user preferences for new users
CREATE TRIGGER on_user_created_user_preferences
    AFTER INSERT ON public.users
    FOR EACH ROW EXECUTE PROCEDURE public.create_default_user_preferences();

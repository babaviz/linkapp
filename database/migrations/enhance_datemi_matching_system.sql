-- Enhanced Date Mi Matching System Migration
-- Adds tables and indexes for advanced profile matching and recommendations
-- Date: 2025-12-26

-- ============================================================
-- 1. Profile Matching Preferences Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.datemi_matching_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) UNIQUE NOT NULL,
    
    age_range_min INTEGER DEFAULT 18,
    age_range_max INTEGER DEFAULT 35,
    max_distance_km INTEGER DEFAULT 50,
    gender_preference TEXT[] DEFAULT ARRAY[]::TEXT[],
    intention_preference TEXT[] DEFAULT ARRAY['short_term_fun', 'long_term_partner']::TEXT[],
    verified_only BOOLEAN DEFAULT FALSE,
    creators_only BOOLEAN DEFAULT FALSE,
    activity_level TEXT DEFAULT 'any' CHECK (activity_level IN ('low', 'medium', 'high', 'any')),
    communication_style TEXT[] DEFAULT ARRAY['text', 'voice', 'video']::TEXT[],
    lifestyle_preferences TEXT[] DEFAULT ARRAY[]::TEXT[],
    deal_breakers TEXT[] DEFAULT ARRAY[]::TEXT[],
    preferred_meeting_style TEXT DEFAULT 'mixed' CHECK (preferred_meeting_style IN ('virtual', 'in_person', 'mixed'))
);

-- ============================================================
-- 2. User Behavioral Data Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.datemi_user_behavior (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) UNIQUE NOT NULL,
    
    avg_response_time_minutes INTEGER DEFAULT 30,
    active_hours INTEGER[] DEFAULT ARRAY[9, 10, 11, 18, 19, 20, 21]::INTEGER[],
    weekly_activity INTEGER[] DEFAULT ARRAY[3, 5, 4, 6, 7, 5, 2]::INTEGER[],
    message_length TEXT DEFAULT 'medium' CHECK (message_length IN ('short', 'medium', 'long')),
    engagement_rate DECIMAL(3,2) DEFAULT 0.75 CHECK (engagement_rate >= 0 AND engagement_rate <= 1),
    last_active_hours INTEGER DEFAULT 0,
    total_messages_sent INTEGER DEFAULT 0,
    total_messages_received INTEGER DEFAULT 0,
    total_likes_given INTEGER DEFAULT 0,
    total_likes_received INTEGER DEFAULT 0
);

-- ============================================================
-- 3. Profile Likes Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.datemi_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    liker_id UUID REFERENCES public.users(id) NOT NULL,
    liked_profile_id UUID REFERENCES public.date_mi_profiles(id) NOT NULL,
    is_super_like BOOLEAN DEFAULT FALSE,
    match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
    
    UNIQUE(liker_id, liked_profile_id)
);

-- ============================================================
-- 4. Profile Passes Table  
-- ============================================================
CREATE TABLE IF NOT EXISTS public.datemi_passes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    passer_id UUID REFERENCES public.users(id) NOT NULL,
    passed_profile_id UUID REFERENCES public.date_mi_profiles(id) NOT NULL,
    reason TEXT,
    
    UNIQUE(passer_id, passed_profile_id)
);

-- ============================================================
-- 5. Profile Matches Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.datemi_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user1_id UUID REFERENCES public.users(id) NOT NULL,
    user2_id UUID REFERENCES public.users(id) NOT NULL,
    compatibility_score INTEGER CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
    is_super_match BOOLEAN DEFAULT FALSE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    unmatch_by UUID REFERENCES public.users(id),
    unmatched_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(user1_id, user2_id),
    CHECK (user1_id < user2_id)
);

-- ============================================================
-- 6. Profile Views Table (for analytics)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.datemi_profile_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    viewer_id UUID REFERENCES public.users(id) NOT NULL,
    viewed_profile_id UUID REFERENCES public.date_mi_profiles(id) NOT NULL,
    view_duration_seconds INTEGER,
    source TEXT DEFAULT 'browse'
);

-- ============================================================
-- 7. Matching Algorithm Cache Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.datemi_match_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    recommended_profiles JSONB DEFAULT '[]'::JSONB,
    cache_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour',
    
    UNIQUE(user_id)
);

-- ============================================================
-- INDEXES for Performance Optimization
-- ============================================================

-- Matching preferences indexes
CREATE INDEX IF NOT EXISTS idx_datemi_preferences_user 
ON public.datemi_matching_preferences(user_id);

-- Behavioral data indexes
CREATE INDEX IF NOT EXISTS idx_datemi_behavior_user 
ON public.datemi_user_behavior(user_id);

CREATE INDEX IF NOT EXISTS idx_datemi_behavior_engagement 
ON public.datemi_user_behavior(engagement_rate DESC, last_active_hours ASC);

-- Likes indexes
CREATE INDEX IF NOT EXISTS idx_datemi_likes_liker 
ON public.datemi_likes(liker_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_datemi_likes_liked 
ON public.datemi_likes(liked_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_datemi_likes_super 
ON public.datemi_likes(liked_profile_id) WHERE is_super_like = TRUE;

-- Passes indexes
CREATE INDEX IF NOT EXISTS idx_datemi_passes_passer 
ON public.datemi_passes(passer_id);

CREATE INDEX IF NOT EXISTS idx_datemi_passes_passed 
ON public.datemi_passes(passed_profile_id);

-- Matches indexes
CREATE INDEX IF NOT EXISTS idx_datemi_matches_user1 
ON public.datemi_matches(user1_id, created_at DESC) WHERE unmatched_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_datemi_matches_user2 
ON public.datemi_matches(user2_id, created_at DESC) WHERE unmatched_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_datemi_matches_active 
ON public.datemi_matches(created_at DESC) WHERE unmatched_at IS NULL;

-- Profile views indexes
CREATE INDEX IF NOT EXISTS idx_datemi_views_viewer 
ON public.datemi_profile_views(viewer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_datemi_views_viewed 
ON public.datemi_profile_views(viewed_profile_id, created_at DESC);

-- Match cache indexes
CREATE INDEX IF NOT EXISTS idx_datemi_cache_user 
ON public.datemi_match_cache(user_id);

CREATE INDEX IF NOT EXISTS idx_datemi_cache_expiry 
ON public.datemi_match_cache(cache_expires_at);

-- Date Mi Profiles enhanced indexes
CREATE INDEX IF NOT EXISTS idx_datemi_profiles_intention 
ON public.date_mi_profiles(intention) WHERE intention IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_datemi_profiles_age 
ON public.date_mi_profiles(age) WHERE age IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_datemi_profiles_location 
ON public.date_mi_profiles(location) WHERE location IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_datemi_profiles_verified_online 
ON public.date_mi_profiles(verified, is_online, updated_at DESC) 
WHERE verified = TRUE AND is_online = TRUE;

CREATE INDEX IF NOT EXISTS idx_datemi_profiles_interests 
ON public.date_mi_profiles USING GIN(interests);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE public.datemi_matching_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datemi_user_behavior ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datemi_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datemi_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datemi_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datemi_profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datemi_match_cache ENABLE ROW LEVEL SECURITY;

-- Matching preferences policies
-- CREATE POLICY "Users can view own preferences" ON public.datemi_matching_preferences FOR SELECT USING (auth.uid() = user_id);

-- CREATE POLICY "Users can insert own preferences" ON public.datemi_matching_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CREATE POLICY "Users can update own preferences" ON public.datemi_matching_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Behavioral data policies
-- CREATE POLICY "Users can view own behavior" ON public.datemi_user_behavior FOR SELECT USING (auth.uid() = user_id);

-- CREATE POLICY "System can manage behavior data" ON public.datemi_user_behavior FOR ALL USING (TRUE);

-- Likes policies
CREATE POLICY "Users can view own likes" 
ON public.datemi_likes FOR SELECT 
USING (auth.uid() = liker_id OR auth.uid() IN (
    SELECT user_id FROM date_mi_profiles WHERE id = liked_profile_id
));

CREATE POLICY "Users can create likes" 
ON public.datemi_likes FOR INSERT 
WITH CHECK (auth.uid() = liker_id);

CREATE POLICY "Users can delete own likes" 
ON public.datemi_likes FOR DELETE 
USING (auth.uid() = liker_id);

-- Passes policies
CREATE POLICY "Users can view own passes" 
ON public.datemi_passes FOR SELECT 
USING (auth.uid() = passer_id);

CREATE POLICY "Users can create passes" 
ON public.datemi_passes FOR INSERT 
WITH CHECK (auth.uid() = passer_id);

-- Matches policies
CREATE POLICY "Users can view own matches" 
ON public.datemi_matches FOR SELECT 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "System can create matches" 
ON public.datemi_matches FOR INSERT 
WITH CHECK (TRUE);

CREATE POLICY "Users can unmatch" 
ON public.datemi_matches FOR UPDATE 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Profile views policies
CREATE POLICY "Users can view own profile views" 
ON public.datemi_profile_views FOR SELECT 
USING (auth.uid() = viewer_id OR auth.uid() IN (
    SELECT user_id FROM date_mi_profiles WHERE id = viewed_profile_id
));

CREATE POLICY "Users can log profile views" 
ON public.datemi_profile_views FOR INSERT 
WITH CHECK (auth.uid() = viewer_id);

-- Match cache policies
CREATE POLICY "Users can view own cache" 
ON public.datemi_match_cache FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage cache" 
ON public.datemi_match_cache FOR ALL 
USING (TRUE);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Update updated_at timestamp trigger
CREATE OR REPLACE FUNCTION update_datemi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_datemi_preferences_timestamp
BEFORE UPDATE ON public.datemi_matching_preferences
FOR EACH ROW EXECUTE FUNCTION update_datemi_updated_at();

CREATE TRIGGER update_datemi_behavior_timestamp
BEFORE UPDATE ON public.datemi_user_behavior
FOR EACH ROW EXECUTE FUNCTION update_datemi_updated_at();

CREATE TRIGGER update_datemi_cache_timestamp
BEFORE UPDATE ON public.datemi_match_cache
FOR EACH ROW EXECUTE FUNCTION update_datemi_updated_at();

-- Auto-create match when mutual like detected
CREATE OR REPLACE FUNCTION create_match_on_mutual_like()
RETURNS TRIGGER AS $$
DECLARE
    profile1_user_id UUID;
    profile2_user_id UUID;
    mutual_like_exists BOOLEAN;
BEGIN
    SELECT user_id INTO profile1_user_id 
    FROM date_mi_profiles 
    WHERE id = NEW.liked_profile_id;
    
    SELECT EXISTS(
        SELECT 1 FROM datemi_likes
        WHERE liker_id = profile1_user_id
        AND liked_profile_id IN (
            SELECT id FROM date_mi_profiles WHERE user_id = NEW.liker_id
        )
    ) INTO mutual_like_exists;
    
    IF mutual_like_exists THEN
        INSERT INTO datemi_matches (user1_id, user2_id, compatibility_score, is_super_match)
        VALUES (
            LEAST(NEW.liker_id, profile1_user_id),
            GREATEST(NEW.liker_id, profile1_user_id),
            NEW.match_score,
            NEW.is_super_like
        )
        ON CONFLICT (user1_id, user2_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_match_trigger
AFTER INSERT ON public.datemi_likes
FOR EACH ROW EXECUTE FUNCTION create_match_on_mutual_like();

-- Update behavioral data on activity
CREATE OR REPLACE FUNCTION update_behavior_on_activity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO datemi_user_behavior (user_id, total_messages_sent, last_active_hours)
    VALUES (NEW.user_id, 1, 0)
    ON CONFLICT (user_id) DO UPDATE
    SET total_messages_sent = datemi_user_behavior.total_messages_sent + 1,
        last_active_hours = 0,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get active subscription tier for user
CREATE OR REPLACE FUNCTION get_user_subscription_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    tier TEXT;
BEGIN
    SELECT s.tier INTO tier
    FROM subscriptions s
    WHERE s.user_id = p_user_id
    AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    RETURN COALESCE(tier, 'free');
END;
$$ LANGUAGE plpgsql;

-- Check if two users have matched
CREATE OR REPLACE FUNCTION are_users_matched(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM datemi_matches
        WHERE (user1_id = LEAST(user_a, user_b) AND user2_id = GREATEST(user_a, user_b))
        AND unmatched_at IS NULL
    );
END;
$$ LANGUAGE plpgsql;

-- Get match compatibility score
CREATE OR REPLACE FUNCTION calculate_basic_compatibility(
    p_user1_interests TEXT[],
    p_user2_interests TEXT[],
    p_user1_age INTEGER,
    p_user2_age INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    common_interests INTEGER;
    total_interests INTEGER;
    age_diff INTEGER;
    interest_score INTEGER := 0;
    age_score INTEGER := 0;
BEGIN
    IF p_user1_interests IS NOT NULL AND p_user2_interests IS NOT NULL THEN
        SELECT 
            CARDINALITY(ARRAY(SELECT UNNEST(p_user1_interests) INTERSECT SELECT UNNEST(p_user2_interests))),
            CARDINALITY(ARRAY(SELECT UNNEST(p_user1_interests) UNION SELECT UNNEST(p_user2_interests)))
        INTO common_interests, total_interests;
        
        IF total_interests > 0 THEN
            interest_score := (common_interests * 100 / total_interests);
        END IF;
    END IF;
    
    IF p_user1_age IS NOT NULL AND p_user2_age IS NOT NULL THEN
        age_diff := ABS(p_user1_age - p_user2_age);
        age_score := GREATEST(0, 100 - (age_diff * 5));
    END IF;
    
    RETURN ((interest_score + age_score) / 2);
END;
$$ LANGUAGE plpgsql;

-- Migration complete!

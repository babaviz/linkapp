-- Referral System Database Schema
-- This migration adds tables and functions for the referral program

-- User referral codes table
CREATE TABLE IF NOT EXISTS public.user_referral_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referrals tracking table
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    referred_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    referral_code TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'registered', 'verified', 'completed')),
    
    -- Tracking timestamps for each stage
    registered_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Fraud prevention
    install_fingerprint TEXT,
    device_info JSONB,
    ip_address TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure a user can only be referred once
    CONSTRAINT unique_referred_user UNIQUE (referred_user_id),
    -- Ensure a user cannot refer themselves
    CONSTRAINT no_self_referral CHECK (referrer_id != referred_user_id)
);

-- Premium access periods table
CREATE TABLE IF NOT EXISTS public.premium_access_periods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Premium period details
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_days INTEGER NOT NULL DEFAULT 7,
    
    -- Source tracking
    source TEXT DEFAULT 'referral_reward' CHECK (source IN ('referral_reward', 'purchase', 'promotion', 'admin_grant')),
    referral_batch_count INTEGER, -- Which batch of 10 referrals triggered this (1st batch, 2nd batch, etc.)
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral statistics table (for tracking progress)
CREATE TABLE IF NOT EXISTS public.referral_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- Referral counts
    total_referrals INTEGER DEFAULT 0,
    completed_referrals INTEGER DEFAULT 0,
    pending_referrals INTEGER DEFAULT 0,
    
    -- Reward tracking
    total_rewards_earned INTEGER DEFAULT 0,
    current_batch_progress INTEGER DEFAULT 0, -- Progress towards next batch of 10
    
    -- Last reward info
    last_reward_at TIMESTAMP WITH TIME ZONE,
    next_milestone INTEGER DEFAULT 10, -- Next milestone (10, 20, 30, etc.)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_referral_codes_user_id ON public.user_referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_referral_codes_code ON public.user_referral_codes(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON public.referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_premium_access_user_id ON public.premium_access_periods(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_access_dates ON public.premium_access_periods(user_id, start_date, end_date) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_referral_statistics_user_id ON public.referral_statistics(user_id);

-- Enable Row Level Security
ALTER TABLE public.user_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_access_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_statistics ENABLE ROW LEVEL SECURITY;


-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a random 8-character code (uppercase letters and numbers)
        new_code := upper(substring(md5(random()::text || user_id_param::text || now()::text) from 1 for 8));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM public.user_referral_codes WHERE referral_code = new_code) INTO code_exists;
        
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create referral code for new user
CREATE OR REPLACE FUNCTION create_user_referral_code()
RETURNS TRIGGER AS $$
DECLARE
    new_referral_code TEXT;
BEGIN
    -- Generate unique referral code
    new_referral_code := generate_referral_code(NEW.id);
    
    -- Insert referral code
    INSERT INTO public.user_referral_codes (user_id, referral_code)
    VALUES (NEW.id, new_referral_code);
    
    -- Initialize referral statistics
    INSERT INTO public.referral_statistics (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create referral code when user signs up
DROP TRIGGER IF EXISTS trigger_create_user_referral_code ON public.users;
CREATE TRIGGER trigger_create_user_referral_code
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_referral_code();

-- Function to check if user has active premium access
CREATE OR REPLACE FUNCTION has_active_premium(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    has_premium BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 
        FROM public.premium_access_periods 
        WHERE user_id = user_id_param 
        AND is_active = TRUE 
        AND status = 'active'
        AND NOW() BETWEEN start_date AND end_date
    ) INTO has_premium;
    
    RETURN has_premium;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to grant premium access
CREATE OR REPLACE FUNCTION grant_premium_access(
    user_id_param UUID,
    days INTEGER DEFAULT 7,
    batch_count INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_period_id UUID;
BEGIN
    INSERT INTO public.premium_access_periods (
        user_id,
        start_date,
        end_date,
        duration_days,
        source,
        referral_batch_count,
        is_active,
        status
    ) VALUES (
        user_id_param,
        NOW(),
        NOW() + (days || ' days')::INTERVAL,
        days,
        'referral_reward',
        batch_count,
        TRUE,
        'active'
    )
    RETURNING id INTO new_period_id;
    
    RETURN new_period_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update referral status and check for reward
CREATE OR REPLACE FUNCTION update_referral_status(
    referred_user_id_param UUID,
    new_status TEXT
)
RETURNS JSONB AS $$
DECLARE
    referrer_user_id UUID;
    completed_count INTEGER;
    batch_number INTEGER;
    reward_granted BOOLEAN := FALSE;
    premium_period_id UUID;
    result JSONB;
BEGIN
    -- Update referral status
    UPDATE public.referrals
    SET 
        status = new_status,
        verified_at = CASE WHEN new_status = 'verified' THEN NOW() ELSE verified_at END,
        completed_at = CASE WHEN new_status = 'completed' THEN NOW() ELSE completed_at END,
        updated_at = NOW()
    WHERE referred_user_id = referred_user_id_param
    RETURNING referrer_id INTO referrer_user_id;
    
    -- If status is 'completed', check if reward should be granted
    IF new_status = 'completed' AND referrer_user_id IS NOT NULL THEN
        -- Count completed referrals
        SELECT COUNT(*) 
        INTO completed_count
        FROM public.referrals
        WHERE referrer_id = referrer_user_id AND status = 'completed';
        
        -- Update statistics
        UPDATE public.referral_statistics
        SET 
            completed_referrals = completed_count,
            current_batch_progress = completed_count % 10,
            total_referrals = (SELECT COUNT(*) FROM public.referrals WHERE referrer_id = referrer_user_id),
            updated_at = NOW()
        WHERE user_id = referrer_user_id;
        
        -- Check if user reached a milestone (every 10 referrals)
        IF completed_count % 10 = 0 THEN
            batch_number := completed_count / 10;
            
            -- Grant premium access
            premium_period_id := grant_premium_access(referrer_user_id, 7, batch_number);
            
            -- Update statistics
            UPDATE public.referral_statistics
            SET 
                total_rewards_earned = total_rewards_earned + 1,
                last_reward_at = NOW(),
                next_milestone = (batch_number + 1) * 10,
                updated_at = NOW()
            WHERE user_id = referrer_user_id;
            
            reward_granted := TRUE;
        END IF;
    END IF;
    
    -- Build result JSON
    result := jsonb_build_object(
        'success', TRUE,
        'referrer_id', referrer_user_id,
        'completed_count', completed_count,
        'reward_granted', reward_granted,
        'premium_period_id', premium_period_id,
        'batch_number', batch_number
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to expire old premium periods (run periodically)
CREATE OR REPLACE FUNCTION expire_premium_periods()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE public.premium_access_periods
    SET 
        is_active = FALSE,
        status = 'expired',
        updated_at = NOW()
    WHERE 
        is_active = TRUE 
        AND status = 'active'
        AND end_date < NOW()
    RETURNING COUNT(*) INTO expired_count;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get user's referral progress
CREATE OR REPLACE FUNCTION get_referral_progress(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    stats RECORD;
    active_premium RECORD;
BEGIN
    -- Get referral statistics
    SELECT * INTO stats
    FROM public.referral_statistics
    WHERE user_id = user_id_param;
    
    -- Get active premium period
    SELECT * INTO active_premium
    FROM public.premium_access_periods
    WHERE user_id = user_id_param
    AND is_active = TRUE
    AND status = 'active'
    AND NOW() BETWEEN start_date AND end_date
    ORDER BY end_date DESC
    LIMIT 1;
    
    -- Build result
    result := jsonb_build_object(
        'total_referrals', COALESCE(stats.total_referrals, 0),
        'completed_referrals', COALESCE(stats.completed_referrals, 0),
        'pending_referrals', COALESCE(stats.pending_referrals, 0),
        'current_batch_progress', COALESCE(stats.current_batch_progress, 0),
        'next_milestone', COALESCE(stats.next_milestone, 10),
        'referrals_until_reward', COALESCE(stats.next_milestone, 10) - COALESCE(stats.completed_referrals, 0),
        'total_rewards_earned', COALESCE(stats.total_rewards_earned, 0),
        'has_active_premium', active_premium.id IS NOT NULL,
        'premium_start_date', active_premium.start_date,
        'premium_end_date', active_premium.end_date
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_referral_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_active_premium(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_premium_access(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_referral_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_premium_periods() TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_progress(UUID) TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.user_referral_codes IS 'Stores unique referral codes for each user';
COMMENT ON TABLE public.referrals IS 'Tracks all referrals with their status and prevents fraud';
COMMENT ON TABLE public.premium_access_periods IS 'Manages premium access periods earned through referrals';
COMMENT ON TABLE public.referral_statistics IS 'Aggregated statistics for user referral progress';
COMMENT ON FUNCTION generate_referral_code(UUID) IS 'Generates a unique 8-character referral code';
COMMENT ON FUNCTION has_active_premium(UUID) IS 'Checks if a user has active premium access';
COMMENT ON FUNCTION grant_premium_access(UUID, INTEGER, INTEGER) IS 'Grants premium access to a user for specified days';
COMMENT ON FUNCTION update_referral_status(UUID, TEXT) IS 'Updates referral status and automatically grants rewards at milestones';
COMMENT ON FUNCTION get_referral_progress(UUID) IS 'Returns comprehensive referral progress for a user';

-- Migration: Update Referral System to Cash Rewards
-- Replaces "10 referrals = premium tier" with cash reward milestones
-- New thresholds: 20 → Ksh 2,000 | 200 → Ksh 20,000 | 2,000 → Ksh 200,000

-- IMPORTANT: This migration completely disables automatic premium tier grants from referrals
-- Premium access can still be granted manually or through purchases, but NOT via referral milestones

-- Create table for tracking reward notifications to admin
CREATE TABLE IF NOT EXISTS public.referral_reward_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    referral_count INTEGER NOT NULL,
    reward_amount INTEGER NOT NULL, -- Amount in Kenyan Shillings
    milestone INTEGER NOT NULL CHECK (milestone IN (20, 200, 2000)),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'processed', 'paid')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notified_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    admin_notes TEXT,
    payment_reference TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    
    -- Prevent duplicate notifications for same milestone
    CONSTRAINT unique_user_milestone UNIQUE (user_id, milestone)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reward_notifications_user_id ON public.referral_reward_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_notifications_status ON public.referral_reward_notifications(status);
CREATE INDEX IF NOT EXISTS idx_reward_notifications_milestone ON public.referral_reward_notifications(milestone);

-- Enable RLS
ALTER TABLE public.referral_reward_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own reward notifications" 
    ON public.referral_reward_notifications FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "System can manage reward notifications" 
    ON public.referral_reward_notifications FOR ALL 
    USING (TRUE);

-- Update referral_statistics table to track cash rewards
ALTER TABLE public.referral_statistics 
    ADD COLUMN IF NOT EXISTS total_cash_rewards_ksh INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS next_cash_milestone INTEGER DEFAULT 20;

-- Update the next_milestone column default for existing rows
UPDATE public.referral_statistics 
SET next_cash_milestone = 
    CASE 
        WHEN completed_referrals >= 2000 THEN 2000
        WHEN completed_referrals >= 200 THEN 2000
        WHEN completed_referrals >= 20 THEN 200
        ELSE 20
    END
WHERE next_cash_milestone IS NULL OR next_cash_milestone = 0;

-- Function to get reward amount for milestone
CREATE OR REPLACE FUNCTION get_reward_amount_for_milestone(milestone_count INTEGER)
RETURNS INTEGER AS $$
BEGIN
    CASE milestone_count
        WHEN 20 THEN RETURN 2000;
        WHEN 200 THEN RETURN 20000;
        WHEN 2000 THEN RETURN 200000;
        ELSE RETURN 0;
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Updated function to check for cash reward eligibility and notify admin
CREATE OR REPLACE FUNCTION check_and_notify_cash_reward(
    referrer_user_id UUID,
    completed_count INTEGER
)
RETURNS JSONB AS $$
DECLARE
    milestone_reached INTEGER := 0;
    reward_amount INTEGER := 0;
    notification_id UUID;
    already_notified BOOLEAN;
BEGIN
    -- Determine which milestone was reached
    IF completed_count = 20 THEN
        milestone_reached := 20;
        reward_amount := 2000;
    ELSIF completed_count = 200 THEN
        milestone_reached := 200;
        reward_amount := 20000;
    ELSIF completed_count = 2000 THEN
        milestone_reached := 2000;
        reward_amount := 200000;
    ELSE
        -- Not a milestone
        RETURN jsonb_build_object(
            'reward_granted', FALSE,
            'milestone_reached', 0,
            'reward_amount', 0
        );
    END IF;
    
    -- Check if already notified for this milestone
    SELECT EXISTS(
        SELECT 1 
        FROM public.referral_reward_notifications 
        WHERE user_id = referrer_user_id 
        AND milestone = milestone_reached
    ) INTO already_notified;
    
    IF already_notified THEN
        -- Already notified, don't create duplicate
        RETURN jsonb_build_object(
            'reward_granted', FALSE,
            'milestone_reached', milestone_reached,
            'reward_amount', reward_amount,
            'message', 'Already notified for this milestone'
        );
    END IF;
    
    -- Create notification for admin
    INSERT INTO public.referral_reward_notifications (
        user_id,
        referral_count,
        reward_amount,
        milestone,
        status,
        notified_at
    ) VALUES (
        referrer_user_id,
        completed_count,
        reward_amount,
        milestone_reached,
        'notified',
        NOW()
    )
    RETURNING id INTO notification_id;
    
    -- Update user statistics
    UPDATE public.referral_statistics
    SET 
        total_cash_rewards_ksh = total_cash_rewards_ksh + reward_amount,
        next_cash_milestone = CASE 
            WHEN milestone_reached = 20 THEN 200
            WHEN milestone_reached = 200 THEN 2000
            WHEN milestone_reached = 2000 THEN 2000 -- Stay at max
            ELSE next_cash_milestone
        END,
        updated_at = NOW()
    WHERE user_id = referrer_user_id;
    
    RETURN jsonb_build_object(
        'reward_granted', TRUE,
        'milestone_reached', milestone_reached,
        'reward_amount', reward_amount,
        'notification_id', notification_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated function to update referral status with cash rewards
-- REPLACES the old function that granted premium access every 10 referrals
-- Premium access is NO LONGER automatically granted via referrals
-- Only cash reward notifications are created at milestones (20, 200, 2000)
CREATE OR REPLACE FUNCTION update_referral_status(
    referred_user_id_param UUID,
    new_status TEXT
)
RETURNS JSONB AS $$
DECLARE
    referrer_user_id UUID;
    completed_count INTEGER;
    reward_result JSONB;
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
    
    -- If status is 'completed', check if cash reward milestone reached
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
            current_batch_progress = completed_count,
            total_referrals = (SELECT COUNT(*) FROM public.referrals WHERE referrer_id = referrer_user_id),
            updated_at = NOW()
        WHERE user_id = referrer_user_id;
        
        -- Check for cash reward milestone
        reward_result := check_and_notify_cash_reward(referrer_user_id, completed_count);
        
        -- Build result JSON
        result := jsonb_build_object(
            'success', TRUE,
            'referrer_id', referrer_user_id,
            'completed_count', completed_count,
            'reward_granted', (reward_result->>'reward_granted')::BOOLEAN,
            'milestone_reached', (reward_result->>'milestone_reached')::INTEGER,
            'reward_amount', (reward_result->>'reward_amount')::INTEGER
        );
    ELSE
        result := jsonb_build_object(
            'success', TRUE,
            'referrer_id', referrer_user_id,
            'reward_granted', FALSE
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated function to get referral progress with cash rewards
CREATE OR REPLACE FUNCTION get_referral_progress(user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    stats RECORD;
    next_milestone_value INTEGER;
    referrals_until_next INTEGER;
BEGIN
    -- Get referral statistics
    SELECT * INTO stats
    FROM public.referral_statistics
    WHERE user_id = user_id_param;
    
    -- Calculate next milestone
    IF COALESCE(stats.completed_referrals, 0) >= 2000 THEN
        next_milestone_value := 2000;
        referrals_until_next := 0; -- Already at max
    ELSIF COALESCE(stats.completed_referrals, 0) >= 200 THEN
        next_milestone_value := 2000;
        referrals_until_next := 2000 - COALESCE(stats.completed_referrals, 0);
    ELSIF COALESCE(stats.completed_referrals, 0) >= 20 THEN
        next_milestone_value := 200;
        referrals_until_next := 200 - COALESCE(stats.completed_referrals, 0);
    ELSE
        next_milestone_value := 20;
        referrals_until_next := 20 - COALESCE(stats.completed_referrals, 0);
    END IF;
    
    -- Build result
    result := jsonb_build_object(
        'total_referrals', COALESCE(stats.total_referrals, 0),
        'completed_referrals', COALESCE(stats.completed_referrals, 0),
        'pending_referrals', COALESCE(stats.pending_referrals, 0),
        'current_batch_progress', COALESCE(stats.completed_referrals, 0),
        'next_milestone', next_milestone_value,
        'referrals_until_reward', referrals_until_next,
        'total_rewards_earned', COALESCE(stats.total_rewards_earned, 0),
        'total_cash_rewards_ksh', COALESCE(stats.total_cash_rewards_ksh, 0),
        'has_active_premium', FALSE, -- No longer used
        'premium_start_date', NULL,
        'premium_end_date', NULL
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke and replace old grant_premium_access function to prevent accidental use
-- This function is kept for backwards compatibility (manual admin grants) but should NOT be called from referrals
CREATE OR REPLACE FUNCTION grant_premium_access(
    user_id_param UUID,
    days INTEGER DEFAULT 7,
    batch_count INTEGER DEFAULT NULL,
    source_param TEXT DEFAULT 'admin_grant'
)
RETURNS UUID AS $$
DECLARE
    new_period_id UUID;
BEGIN
    -- Prevent automatic referral rewards - must be admin_grant, purchase, or promotion
    IF source_param = 'referral_reward' THEN
        RAISE EXCEPTION 'Premium access can no longer be granted via referral_reward. Use cash rewards instead.';
    END IF;
    
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
        source_param,
        batch_count,
        TRUE,
        'active'
    )
    RETURNING id INTO new_period_id;
    
    RETURN new_period_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_reward_amount_for_milestone(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_notify_cash_reward(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_premium_access(UUID, INTEGER, INTEGER, TEXT) TO authenticated;

-- Comments
COMMENT ON TABLE public.referral_reward_notifications IS 'Tracks cash reward notifications sent to admin when users hit referral milestones';
COMMENT ON FUNCTION get_reward_amount_for_milestone(INTEGER) IS 'Returns reward amount in KSh for given milestone (20, 200, 2000)';
COMMENT ON FUNCTION check_and_notify_cash_reward(UUID, INTEGER) IS 'Checks if user reached cash reward milestone and notifies admin';

-- Note about premium_access_periods table:
-- The premium_access_periods table is KEPT for historical data and for other premium sources
-- (purchases, admin grants, promotions). However, it will NO LONGER receive new entries
-- from the referral system. Existing referral-based premium periods are honored until expiration.
-- 
-- If you want to completely remove the referral premium history, run this (OPTIONAL):
-- DELETE FROM public.premium_access_periods WHERE source = 'referral_reward';
-- 
-- If you want to drop the table entirely (use with caution if you have other premium sources):
-- DROP TABLE IF EXISTS public.premium_access_periods CASCADE;

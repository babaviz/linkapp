-- Create calls table for tracking video/audio call sessions in Date Mi module
-- This table stores call metadata for analytics and history

CREATE TABLE IF NOT EXISTS public.calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    caller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('audio', 'video')),
    stream_call_id TEXT,
    stream_call_cid TEXT,
    status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN (
        'initiated',
        'ringing',
        'accepted',
        'rejected',
        'missed',
        'ended',
        'failed'
    )),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    recording_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_calls_caller_id ON public.calls(caller_id);
CREATE INDEX idx_calls_receiver_id ON public.calls(receiver_id);
CREATE INDEX idx_calls_created_at ON public.calls(created_at DESC);
CREATE INDEX idx_calls_status ON public.calls(status);
CREATE INDEX idx_calls_stream_call_id ON public.calls(stream_call_id);

-- Create composite index for user call history queries
CREATE INDEX idx_calls_user_history ON public.calls(caller_id, receiver_id, created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at
CREATE TRIGGER update_calls_timestamp
    BEFORE UPDATE ON public.calls
    FOR EACH ROW
    EXECUTE FUNCTION update_calls_updated_at();

-- Create view for call history with user details
CREATE OR REPLACE VIEW public.call_history AS
SELECT
    c.id,
    c.type,
    c.status,
    c.start_time,
    c.end_time,
    c.duration_seconds,
    c.created_at,
    -- Caller info
    c.caller_id,
    caller.full_name AS caller_name,
    caller.profile_image_url AS caller_avatar,
    -- Receiver info  
    c.receiver_id,
    receiver.full_name AS receiver_name,
    receiver.profile_image_url AS receiver_avatar,
    -- Calculate readable duration
    CASE
        WHEN c.duration_seconds IS NOT NULL THEN
            CONCAT(
                FLOOR(c.duration_seconds / 3600), 'h ',
                FLOOR((c.duration_seconds % 3600) / 60), 'm ',
                c.duration_seconds % 60, 's'
            )
        ELSE NULL
    END AS readable_duration
FROM public.calls c
LEFT JOIN public.users caller ON c.caller_id = caller.id
LEFT JOIN public.users receiver ON c.receiver_id = receiver.id;

-- Create RLS policies for calls table
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own calls (as caller or receiver)
CREATE POLICY "Users can view their own calls" ON public.calls
    FOR SELECT
    USING (auth.uid() IN (caller_id, receiver_id));

-- Policy: Users can insert calls they initiate
CREATE POLICY "Users can initiate calls" ON public.calls
    FOR INSERT
    WITH CHECK (auth.uid() = caller_id);

-- Policy: Users can update their own calls
CREATE POLICY "Users can update their own calls" ON public.calls
    FOR UPDATE
    USING (auth.uid() IN (caller_id, receiver_id))
    WITH CHECK (auth.uid() IN (caller_id, receiver_id));

-- Grant permissions
GRANT ALL ON public.calls TO authenticated;
GRANT SELECT ON public.call_history TO authenticated;

-- Create function to check if user can make video calls (Premium tier only)
CREATE OR REPLACE FUNCTION can_make_video_calls(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_subscription RECORD;
BEGIN
    -- Get user's active subscription
    SELECT 
        s.tier,
        s.status
    INTO user_subscription
    FROM public.subscriptions s
    WHERE s.user_id = $1
        AND s.status IN ('active', 'trialing')
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    -- Check if user has Premium tier
    IF user_subscription.tier = 'premium' THEN
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's remaining call minutes (for potential future limits)
CREATE OR REPLACE FUNCTION get_remaining_call_minutes(user_id UUID, period_start TIMESTAMPTZ DEFAULT date_trunc('month', NOW()))
RETURNS INTEGER AS $$
DECLARE
    total_duration INTEGER;
    subscription_tier TEXT;
    monthly_limit INTEGER;
BEGIN
    -- Get user's subscription tier
    SELECT s.tier INTO subscription_tier
    FROM public.subscriptions s
    WHERE s.user_id = $1
        AND s.status IN ('active', 'trialing')
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    -- Premium tier has unlimited minutes
    IF subscription_tier = 'premium' THEN
        RETURN 999999; -- Effectively unlimited
    END IF;
    
    -- Pro tier users cannot make calls
    IF subscription_tier = 'pro' OR subscription_tier IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Calculate used minutes for the current period
    SELECT COALESCE(SUM(duration_seconds) / 60, 0) INTO total_duration
    FROM public.calls
    WHERE (caller_id = $1 OR receiver_id = $1)
        AND status = 'ended'
        AND start_time >= period_start;
    
    -- For future: implement monthly limits if needed
    -- For now, Premium has unlimited, others have 0
    RETURN 999999 - total_duration;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create notification trigger for missed calls
CREATE OR REPLACE FUNCTION notify_missed_call()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify for missed calls
    IF NEW.status = 'missed' THEN
        -- Insert notification for the receiver
        INSERT INTO public.notifications (
            user_id,
            type,
            title,
            body,
            data,
            created_at
        )
        SELECT
            NEW.receiver_id,
            'missed_call',
            'Missed Call',
            CONCAT('You have a missed ', NEW.type, ' call from ', u.full_name),
            jsonb_build_object(
                'call_id', NEW.id,
                'caller_id', NEW.caller_id,
                'call_type', NEW.type,
                'timestamp', NEW.created_at
            ),
            NOW()
        FROM public.users u
        WHERE u.id = NEW.caller_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for missed call notifications
CREATE TRIGGER notify_on_missed_call
    AFTER UPDATE ON public.calls
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'missed')
    EXECUTE FUNCTION notify_missed_call();

-- Add comment for documentation
COMMENT ON TABLE public.calls IS 'Stores video and audio call session records for the Date Mi module. Only Premium tier users can initiate calls.';
COMMENT ON COLUMN public.calls.type IS 'Type of call: audio or video';
COMMENT ON COLUMN public.calls.status IS 'Current status of the call: initiated, ringing, accepted, rejected, missed, ended, or failed';
COMMENT ON COLUMN public.calls.stream_call_id IS 'Stream Video SDK call ID for tracking';
COMMENT ON COLUMN public.calls.stream_call_cid IS 'Stream Video SDK call CID (channel ID) for reconnection';
COMMENT ON COLUMN public.calls.duration_seconds IS 'Duration of the call in seconds (only for ended calls)';
COMMENT ON FUNCTION can_make_video_calls IS 'Checks if a user has Premium subscription to make video/audio calls';
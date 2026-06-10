-- Update escrow_transactions table to match service expectations
ALTER TABLE public.escrow_transactions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'created' CHECK (status IN ('created', 'funded', 'in_progress', 'completed', 'disputed', 'refunded', 'cancelled')),
ADD COLUMN IF NOT EXISTS escrow_fees_percentage DECIMAL(5,4) DEFAULT 0.05,
ADD COLUMN IF NOT EXISTS platform_fees DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payout_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS session_metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Update escrow_sessions table to match service expectations
ALTER TABLE public.escrow_sessions 
ADD COLUMN IF NOT EXISTS session_status TEXT DEFAULT 'active' CHECK (session_status IN ('active', 'ended', 'cancelled')),
ADD COLUMN IF NOT EXISTS participant_data JSONB DEFAULT '{}'::jsonb;

-- Create missing tables that services reference
CREATE TABLE IF NOT EXISTS public.creator_earnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creator_id UUID REFERENCES public.users(id) NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('video_call', 'content_purchase', 'tip', 'subscription')),
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'KES',
    escrow_transaction_id UUID REFERENCES public.escrow_transactions(id),
    service_reference TEXT,
    customer_id UUID REFERENCES public.users(id)
);

-- Create missing tables for video calling
CREATE TABLE IF NOT EXISTS public.video_call_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    caller_id UUID REFERENCES public.users(id) NOT NULL,
    callee_id UUID REFERENCES public.users(id) NOT NULL,
    status TEXT DEFAULT 'calling' CHECK (status IN ('calling', 'active', 'ended', 'cancelled')),
    escrow_transaction_id UUID REFERENCES public.escrow_transactions(id),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actual_start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- in seconds
    rate_per_minute DECIMAL(12,2) DEFAULT 0,
    current_cost DECIMAL(12,2) DEFAULT 0,
    final_cost DECIMAL(12,2) DEFAULT 0
);

-- Create missing tables for signaling
CREATE TABLE IF NOT EXISTS public.signaling_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id UUID REFERENCES public.video_call_sessions(id) NOT NULL,
    target_user_id UUID REFERENCES public.users(id),
    message_type TEXT NOT NULL CHECK (message_type IN ('offer', 'answer', 'ice-candidate', 'hang-up')),
    message_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE
);

-- Add RLS policies for new tables
ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signaling_messages ENABLE ROW LEVEL SECURITY;

-- Creator earnings policies
CREATE POLICY "Creators can view their own earnings" ON public.creator_earnings FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "System can insert creator earnings" ON public.creator_earnings FOR INSERT WITH CHECK (TRUE);

-- Video call sessions policies
CREATE POLICY "Users can view their own video call sessions" ON public.video_call_sessions FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = callee_id);
CREATE POLICY "Users can create video call sessions" ON public.video_call_sessions FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "System can update video call sessions" ON public.video_call_sessions FOR UPDATE USING (TRUE);

-- Signaling messages policies
CREATE POLICY "Users can view signaling messages for their sessions" ON public.signaling_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.video_call_sessions 
    WHERE video_call_sessions.id = signaling_messages.session_id 
    AND (video_call_sessions.caller_id = auth.uid() OR video_call_sessions.callee_id = auth.uid())
  )
);
CREATE POLICY "Users can send signaling messages" ON public.signaling_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.video_call_sessions 
    WHERE video_call_sessions.id = signaling_messages.session_id 
    AND (video_call_sessions.caller_id = auth.uid() OR video_call_sessions.callee_id = auth.uid())
  )
);

-- Add updated_at triggers
CREATE TRIGGER handle_escrow_transactions_updated_at BEFORE UPDATE ON public.escrow_transactions FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_escrow_sessions_updated_at BEFORE UPDATE ON public.escrow_sessions FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_video_call_sessions_updated_at BEFORE UPDATE ON public.video_call_sessions FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_status ON public.escrow_transactions(status);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_payer ON public.escrow_transactions(payer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_payee ON public.escrow_transactions(payee_id);
CREATE INDEX IF NOT EXISTS idx_escrow_sessions_status ON public.escrow_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_video_call_sessions_status ON public.video_call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_signaling_messages_session ON public.signaling_messages(session_id);

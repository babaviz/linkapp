-- Date Mi calls table (Stream Video session tracking)
-- Used for missed-call badge counts + call history inside Date Mi.

CREATE TABLE IF NOT EXISTS public.calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  caller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN ('audio', 'video')),
  stream_call_id TEXT NOT NULL,
  stream_call_cid TEXT NOT NULL,

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

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Keep updated_at current (shared trigger function)
DROP TRIGGER IF EXISTS handle_calls_updated_at ON public.calls;
CREATE TRIGGER handle_calls_updated_at
  BEFORE UPDATE ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for common queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_calls_stream_call_id_unique ON public.calls(stream_call_id);
CREATE INDEX IF NOT EXISTS idx_calls_stream_call_cid ON public.calls(stream_call_cid);
CREATE INDEX IF NOT EXISTS idx_calls_receiver_status_updated_at ON public.calls(receiver_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON public.calls(created_at DESC);

-- RLS policies
DROP POLICY IF EXISTS "Users can view their own calls" ON public.calls;
DROP POLICY IF EXISTS "Users can initiate calls" ON public.calls;
DROP POLICY IF EXISTS "Users can update their own calls" ON public.calls;

CREATE POLICY "Users can view their own calls"
  ON public.calls
  FOR SELECT
  USING (auth.uid() IN (caller_id, receiver_id));

CREATE POLICY "Users can initiate calls"
  ON public.calls
  FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update their own calls"
  ON public.calls
  FOR UPDATE
  USING (auth.uid() IN (caller_id, receiver_id))
  WITH CHECK (auth.uid() IN (caller_id, receiver_id));

-- Explicit privileges
GRANT SELECT, INSERT, UPDATE ON public.calls TO authenticated;


-- Stream Chat Integration Functions for Supabase
-- This file sets up database functions to generate Stream Chat tokens

-- Create a function to generate Stream Chat tokens
-- Note: This is a placeholder - in production, you should use Supabase Edge Functions
-- with the Stream server-side SDK for secure token generation

CREATE OR REPLACE FUNCTION generate_stream_chat_token(user_id_param UUID)
RETURNS TABLE(
  success BOOLEAN,
  token TEXT,
  stream_user_id TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  stream_user_id_value TEXT;
BEGIN
  -- Check if user exists and get their details
  SELECT id, email, full_name
  INTO user_record
  FROM auth.users
  WHERE id = user_id_param;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, 'User not found'::TEXT;
    RETURN;
  END IF;
  
  -- Generate Stream user ID (using user's UUID)
  stream_user_id_value := user_record.id::TEXT;
  
  -- Note: This is a simplified version for development
  -- In production, you should:
  -- 1. Use Supabase Edge Functions
  -- 2. Use Stream's server-side SDK to generate tokens
  -- 3. Include proper user metadata
  
  -- For now, return a placeholder that indicates client-side token generation is needed
  RETURN QUERY SELECT 
    TRUE,
    'CLIENT_SIDE_GENERATION_REQUIRED'::TEXT,
    stream_user_id_value,
    NULL::TEXT;
    
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, SQLERRM::TEXT;
END;
$$;

-- Create a function to store Stream Chat user metadata
CREATE OR REPLACE FUNCTION upsert_stream_chat_user(
  user_id_param UUID,
  stream_user_id_param TEXT,
  user_name_param TEXT DEFAULT NULL,
  user_image_param TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create or update Stream Chat user metadata
  INSERT INTO public.stream_chat_users (
    user_id,
    stream_user_id,
    name,
    image,
    updated_at
  )
  VALUES (
    user_id_param,
    stream_user_id_param,
    COALESCE(user_name_param, (SELECT full_name FROM auth.users WHERE id = user_id_param)),
    user_image_param,
    NOW()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    name = COALESCE(EXCLUDED.name, stream_chat_users.name),
    image = COALESCE(EXCLUDED.image, stream_chat_users.image),
    updated_at = NOW();
    
  RETURN QUERY SELECT TRUE, 'Stream Chat user metadata updated'::TEXT;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM::TEXT;
END;
$$;

-- Create table to store Stream Chat user metadata
CREATE TABLE IF NOT EXISTS public.stream_chat_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  stream_user_id TEXT NOT NULL,
  name TEXT,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on stream_chat_users table
ALTER TABLE public.stream_chat_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for stream_chat_users
DROP POLICY IF EXISTS "Users can manage their own Stream Chat metadata" ON public.stream_chat_users;
CREATE POLICY "Users can manage their own Stream Chat metadata"
ON public.stream_chat_users
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stream_chat_users_user_id ON public.stream_chat_users(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_chat_users_stream_user_id ON public.stream_chat_users(stream_user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.stream_chat_users TO authenticated;
GRANT EXECUTE ON FUNCTION generate_stream_chat_token TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_stream_chat_user TO authenticated;

-- Create a helper function to get user's Stream Chat ID
CREATE OR REPLACE FUNCTION get_stream_user_id(user_id_param UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stream_user_id_value TEXT;
BEGIN
  SELECT stream_user_id 
  INTO stream_user_id_value
  FROM public.stream_chat_users
  WHERE user_id = user_id_param;
  
  -- If not found, return the user's UUID as the Stream user ID
  IF stream_user_id_value IS NULL THEN
    stream_user_id_value := user_id_param::TEXT;
  END IF;
  
  RETURN stream_user_id_value;
END;
$$;

GRANT EXECUTE ON FUNCTION get_stream_user_id TO authenticated;

-- Success message
SELECT 'Stream Chat database functions created successfully!' as message;
-- Fix referral code generation on signup
-- This ensures referral codes are generated immediately when a user signs up

-- Step 1: Update the handle_new_user function to also create referral code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_referral_code TEXT;
BEGIN
  -- Insert into public.users table
  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    phone,
    kyc_status,
    creator_verification_status
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'pending',
    'not_applied'
  );
  
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
EXCEPTION
  WHEN unique_violation THEN
    -- If user already exists, just return (idempotent)
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth
    RAISE WARNING 'Error creating user profile or referral code: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Verify all referral functions exist and are accessible
GRANT EXECUTE ON FUNCTION generate_referral_code(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION has_active_premium(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_premium_access(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_referral_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_premium_periods() TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_progress(UUID) TO authenticated;

-- Step 4: Backfill referral codes for existing users without codes
DO $$
DECLARE
  user_record RECORD;
  new_code TEXT;
BEGIN
  FOR user_record IN 
    SELECT u.id 
    FROM public.users u
    LEFT JOIN public.user_referral_codes urc ON u.id = urc.user_id
    WHERE urc.user_id IS NULL
  LOOP
    BEGIN
      -- Generate unique referral code
      new_code := generate_referral_code(user_record.id);
      
      -- Insert referral code
      INSERT INTO public.user_referral_codes (user_id, referral_code)
      VALUES (user_record.id, new_code)
      ON CONFLICT (user_id) DO NOTHING;
      
      -- Initialize referral statistics
      INSERT INTO public.referral_statistics (user_id)
      VALUES (user_record.id)
      ON CONFLICT (user_id) DO NOTHING;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create referral code for user %: %', user_record.id, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 5: Verify backfill worked
SELECT 
  COUNT(*) as total_users,
  COUNT(urc.user_id) as users_with_codes,
  COUNT(*) - COUNT(urc.user_id) as users_missing_codes
FROM public.users u
LEFT JOIN public.user_referral_codes urc ON u.id = urc.user_id;

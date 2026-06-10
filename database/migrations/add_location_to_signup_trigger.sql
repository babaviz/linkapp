-- Add location support to signup trigger
-- This updates the handle_new_user function to save city and country from signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_referral_code TEXT;
  user_city TEXT;
  user_country TEXT;
BEGIN
  -- Extract location data from user metadata
  user_city := COALESCE(NEW.raw_user_meta_data->>'city', '');
  user_country := COALESCE(NEW.raw_user_meta_data->>'country', '');
  
  -- Insert into public.users table with location
  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    phone,
    kyc_status,
    creator_verification_status,
    location_preferences
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'pending',
    'not_applied',
    CASE 
      WHEN user_city != '' AND user_country != '' THEN
        jsonb_build_object(
          'town', user_city,
          'county', user_country
        )
      ELSE
        NULL
    END
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

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verification
SELECT 'Signup trigger updated successfully to include location data' as status;

-- ==========================================
-- Google Play Store Reviewer Test Account Setup
-- ==========================================
-- 
-- RECOMMENDED METHOD: Use the Node.js script instead:
--   npx tsx scripts/createPlayStoreReviewerAccount.ts
--
-- This SQL script is an alternative method but requires:
-- 1. Direct access to auth.users table (may require SECURITY DEFINER function)
-- 2. Proper password hashing (Supabase uses specific hashing algorithm)
--
-- For most users, the Node.js script is easier and more reliable.
-- ==========================================
--
-- ALTERNATIVE METHOD 1: Manual Creation via Supabase Dashboard
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" > "Create new user"
-- 3. Enter:
--    - Email: playstore.reviewer@linkapp.test
--    - Password: PlayStoreReview2025!
--    - Auto Confirm User: YES (check this box)
--    - User Metadata: {"full_name": "Play Store Reviewer", "phone": "+254700000000"}
-- 4. After creation, run the SQL below to ensure profile exists
--
-- ALTERNATIVE METHOD 2: Use Supabase Admin API (Recommended)
-- See: scripts/createPlayStoreReviewerAccount.ts
-- ==========================================

-- This SQL only handles the profile creation/update part
-- The auth user should be created via Dashboard or Admin API first

DO $$
DECLARE
  test_user_id UUID;
  test_email TEXT := 'playstore.reviewer@linkapp.test';
  test_full_name TEXT := 'Play Store Reviewer';
  test_phone TEXT := '+254700000000';
BEGIN
  -- Get the user ID from auth.users (user must be created first via Dashboard or Admin API)
  SELECT id INTO test_user_id 
  FROM auth.users 
  WHERE email = test_email;
  
  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'User does not exist in auth.users. Please create the user first via:
    1. Supabase Dashboard > Authentication > Users > Add User, OR
    2. Run: npx tsx scripts/createPlayStoreReviewerAccount.ts';
  END IF;
  
  -- Ensure user profile exists in public.users
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
    test_user_id,
    test_email,
    test_full_name,
    test_phone,
    'pending',
    'not_applied',
    jsonb_build_object(
      'town', 'Nairobi',
      'county', 'Kenya'
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    updated_at = NOW();
  
  RAISE NOTICE 'User profile created/updated in public.users';
  
  -- Generate referral code for the test account
  INSERT INTO public.user_referral_codes (
    user_id,
    referral_code,
    created_at
  )
  SELECT 
    test_user_id,
    'PLAY' || upper(substring(md5(random()::text) from 1 for 8)),
    NOW()
  ON CONFLICT (user_id) DO NOTHING;
  
  RAISE NOTICE 'Referral code generated for test account';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Profile Setup Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Email: %', test_email;
  RAISE NOTICE 'User ID: %', test_user_id;
  RAISE NOTICE '========================================';
  
END $$;

-- Verification query - Run this after the script to verify the account was created
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at IS NOT NULL as email_confirmed,
  p.full_name,
  p.phone,
  p.kyc_status,
  p.created_at as profile_created_at
FROM auth.users u
LEFT JOIN public.users p ON u.id = p.id
WHERE u.email = 'playstore.reviewer@linkapp.test';


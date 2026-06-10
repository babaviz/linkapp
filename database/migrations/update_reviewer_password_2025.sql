-- ==========================================
-- Migration: Update Google Play Store Reviewer Password to 2025
-- ==========================================
-- Date: 2025-01-27
-- Description: Updates the password for the Google Play Store reviewer test account
-- 
-- NOTE: This migration documents the password change. The actual password update
-- must be done via:
-- 1. Supabase Dashboard → Authentication → Users (manual update)
-- 2. Node.js script: npm run create:reviewer-account (automated)
--
-- The password cannot be updated directly via SQL due to Supabase auth schema restrictions.
-- ==========================================

-- Verification query: Check if user exists
-- Run this to verify the account exists before updating password
SELECT 
  id,
  email,
  email_confirmed_at IS NOT NULL as email_confirmed,
  created_at,
  updated_at
FROM auth.users 
WHERE email = 'playstore.reviewer@linkapp.test';

-- After updating password via Dashboard or script, verify the profile is up to date
SELECT 
  u.id,
  u.email,
  p.full_name,
  p.phone,
  p.kyc_status,
  p.updated_at as profile_updated_at
FROM auth.users u
LEFT JOIN public.users p ON u.id = p.id
WHERE u.email = 'playstore.reviewer@linkapp.test';

-- ==========================================
-- Password Update Instructions:
-- ==========================================
-- 
-- Method 1: Using Node.js Script (Recommended)
--   1. Set environment variables:
--      export SUPABASE_URL="your-project-url"
--      export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
--   2. Run: npm run create:reviewer-account
--   3. The script will update the password to: PlayStoreReview2025!
--
-- Method 2: Using Supabase Dashboard
--   1. Go to Supabase Dashboard → Authentication → Users
--   2. Find user: playstore.reviewer@linkapp.test
--   3. Click "..." → "Reset Password" or "Edit User"
--   4. Set new password: PlayStoreReview2025!
--   5. Ensure "Email Confirmed" is checked
--
-- ==========================================


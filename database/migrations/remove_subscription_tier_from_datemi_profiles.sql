-- Migration: Remove subscription_tier from date_mi_profiles
-- Purpose: Eliminate duplicate subscription tier storage
-- Date: 2025-01-21
-- Status: Ready for review and testing
--
-- IMPORTANT: Test in development environment first!
-- Backup database before running in production

-- ============================================================
-- STEP 1: Create view for backward compatibility
-- ============================================================

-- Drop existing view if it exists (for re-run safety)
DROP VIEW IF EXISTS public.date_mi_profiles_with_tier;

-- Create view that computes subscription_tier from subscriptions table
CREATE OR REPLACE VIEW public.date_mi_profiles_with_tier AS
SELECT 
  p.id,
  p.created_at,
  p.updated_at,
  p.user_id,
  p.display_name,
  p.age_verified,
  p.gender_preferences,
  p.profile_pictures,
  p.about_me,
  p.privacy_settings,
  p.creator_status,
  p.subscription_country,
  -- Computed field: Get tier from active subscription or default to 'free'
  COALESCE(
    (
      SELECT tier
      FROM public.subscriptions
      WHERE subscriptions.user_id = p.user_id
        AND subscriptions.status = 'active'
      ORDER BY subscriptions.created_at DESC
      LIMIT 1
    ),
    'free'
  ) AS subscription_tier
FROM public.date_mi_profiles p;

-- Grant permissions to authenticated users
GRANT SELECT ON public.date_mi_profiles_with_tier TO authenticated;

-- Add helpful comment
COMMENT ON VIEW public.date_mi_profiles_with_tier IS 
  'Date Mi profiles with computed subscription_tier from subscriptions table. Use this view instead of direct table queries when tier is needed.';

-- ============================================================
-- STEP 2: Verify view works correctly
-- ============================================================

-- Test query: Check that view returns expected data
-- Run this manually before proceeding:
-- SELECT user_id, display_name, subscription_tier FROM date_mi_profiles_with_tier LIMIT 5;

-- ============================================================
-- STEP 3: Create backup of existing data (optional but recommended)
-- ============================================================

-- Create temporary backup table
-- Uncomment if you want to preserve old data for rollback
-- CREATE TABLE IF NOT EXISTS date_mi_profiles_backup_20250121 AS 
-- SELECT * FROM date_mi_profiles;

-- ============================================================
-- STEP 4: Remove the redundant column
-- ============================================================

-- Begin transaction for safety
BEGIN;

-- Drop the subscription_tier column
-- This removes the redundant storage
ALTER TABLE public.date_mi_profiles 
DROP COLUMN IF EXISTS subscription_tier;

-- Drop the subscription_country column as well (if not needed elsewhere)
-- Uncomment if you want to remove this too:
-- ALTER TABLE public.date_mi_profiles 
-- DROP COLUMN IF EXISTS subscription_country;

-- Commit the transaction
COMMIT;

-- ============================================================
-- STEP 5: Update RLS policies (if needed)
-- ============================================================

-- The existing policies should still work with the view
-- Verify by running:
-- SELECT * FROM date_mi_profiles_with_tier WHERE user_id = auth.uid();

-- ============================================================
-- STEP 6: Add indexes for performance (if not already present)
-- ============================================================

-- Ensure subscriptions table has proper indexes for the JOIN
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
ON public.subscriptions(user_id, status) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_tier_active 
ON public.subscriptions(user_id, tier, created_at DESC) 
WHERE status = 'active';

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Run these queries to verify migration succeeded:

-- 1. Check that column is removed
-- SELECT column_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'date_mi_profiles' 
-- AND column_name = 'subscription_tier';
-- Expected: 0 rows

-- 2. Check that view works
-- SELECT COUNT(*) FROM date_mi_profiles_with_tier;
-- Expected: Same count as date_mi_profiles table

-- 3. Check tier computation
-- SELECT 
--   dmpt.user_id,
--   dmpt.subscription_tier AS computed_tier,
--   s.tier AS actual_tier,
--   s.status
-- FROM date_mi_profiles_with_tier dmpt
-- LEFT JOIN subscriptions s ON s.user_id = dmpt.user_id
-- ORDER BY dmpt.created_at DESC
-- LIMIT 10;
-- Expected: computed_tier matches actual_tier for active subscriptions

-- ============================================================
-- ROLLBACK PROCEDURE (if something goes wrong)
-- ============================================================

-- If you need to rollback this migration:
/*
BEGIN;

-- Restore the column
ALTER TABLE public.date_mi_profiles 
ADD COLUMN subscription_tier TEXT DEFAULT 'free' 
CHECK (subscription_tier IN ('free', 'pro', 'premium'));

-- Populate from subscriptions table
UPDATE public.date_mi_profiles p
SET subscription_tier = COALESCE(
  (
    SELECT tier
    FROM public.subscriptions s
    WHERE s.user_id = p.user_id
      AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1
  ),
  'free'
);

-- Create sync trigger for future updates
CREATE OR REPLACE FUNCTION sync_datemi_subscription_tier()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE date_mi_profiles
  SET subscription_tier = COALESCE(
    (
      SELECT tier 
      FROM subscriptions 
      WHERE user_id = date_mi_profiles.user_id 
        AND status = 'active' 
      ORDER BY created_at DESC 
      LIMIT 1
    ), 
    'free'
  )
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_datemi_tier_on_subscription_change
AFTER INSERT OR UPDATE ON subscriptions
FOR EACH ROW 
WHEN (NEW.status = 'active' OR OLD.status = 'active')
EXECUTE FUNCTION sync_datemi_subscription_tier();

COMMIT;
*/

-- ============================================================
-- POST-MIGRATION TASKS
-- ============================================================

-- 1. Update application code to use date_mi_profiles_with_tier view
-- 2. Update TypeScript types if needed
-- 3. Run integration tests
-- 4. Monitor query performance
-- 5. Update documentation

-- Migration complete!

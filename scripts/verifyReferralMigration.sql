-- Verification Script: Confirm Premium Tier Removal from Referral System
-- Run this after applying the migration to verify changes

-- 1. Check that referral_reward_notifications table exists
SELECT 'referral_reward_notifications table' AS check_name,
       CASE WHEN EXISTS (
           SELECT FROM information_schema.tables 
           WHERE table_schema = 'public' 
           AND table_name = 'referral_reward_notifications'
       ) THEN '✓ EXISTS' ELSE '✗ MISSING' END AS status;

-- 2. Check that new columns exist in referral_statistics
SELECT 'referral_statistics columns' AS check_name,
       CASE WHEN EXISTS (
           SELECT FROM information_schema.columns 
           WHERE table_schema = 'public' 
           AND table_name = 'referral_statistics'
           AND column_name IN ('total_cash_rewards_ksh', 'next_cash_milestone')
       ) THEN '✓ EXISTS' ELSE '✗ MISSING' END AS status;

-- 3. Check update_referral_status function signature (should NOT return premium_period_id)
SELECT 'update_referral_status function' AS check_name,
       CASE WHEN EXISTS (
           SELECT FROM pg_proc 
           WHERE proname = 'update_referral_status'
       ) THEN '✓ EXISTS' ELSE '✗ MISSING' END AS status;

-- 4. Check grant_premium_access function has safety parameter
SELECT 'grant_premium_access safety check' AS check_name,
       CASE WHEN EXISTS (
           SELECT FROM pg_proc p
           JOIN pg_namespace n ON p.pronamespace = n.oid
           WHERE p.proname = 'grant_premium_access'
           AND n.nspname = 'public'
           AND p.pronargs = 4  -- Should now have 4 parameters including source_param
       ) THEN '✓ UPDATED' ELSE '⚠ CHECK NEEDED' END AS status;

-- 5. Test that grant_premium_access rejects referral_reward source
-- This will throw an error if working correctly
DO $$
BEGIN
    BEGIN
        PERFORM grant_premium_access(
            '00000000-0000-0000-0000-000000000000'::UUID,
            7,
            1,
            'referral_reward'
        );
        RAISE NOTICE '✗ SAFETY CHECK FAILED: Function should reject referral_reward source';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '✓ SAFETY CHECK PASSED: Function correctly rejects referral_reward source';
    END;
END $$;

-- 6. Show sample of existing referral statistics (before migration)
SELECT 
    'Existing referral counts' AS info,
    COUNT(*) AS users_with_referrals,
    SUM(completed_referrals) AS total_completed_referrals,
    MAX(completed_referrals) AS highest_referral_count
FROM referral_statistics
WHERE completed_referrals > 0;

-- 7. Verify NO NEW premium periods created from referrals after migration
-- Adjust the date in the WHERE clause to match your migration date
SELECT 
    'New premium from referrals check' AS info,
    COUNT(*) AS new_periods_after_migration,
    CASE 
        WHEN COUNT(*) = 0 THEN '✓ PASS: No new referral premium grants'
        ELSE '✗ FAIL: Premium still being granted via referrals!'
    END AS status
FROM premium_access_periods
WHERE source = 'referral_reward'
AND created_at > '2025-01-27'::TIMESTAMP; -- Adjust this date

-- 8. Verify no new reward notifications exist yet
SELECT 
    'Reward notifications' AS info,
    COUNT(*) AS total_notifications,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending,
    COUNT(*) FILTER (WHERE status = 'notified') AS notified,
    COUNT(*) FILTER (WHERE status = 'paid') AS paid
FROM referral_reward_notifications;

-- Summary Report
SELECT '
==========================================
MIGRATION VERIFICATION SUMMARY
==========================================

✓ = Passed
✗ = Failed  
⚠ = Needs Manual Check

If all checks show ✓, the migration was successful.

Next steps:
1. Test referral flow end-to-end
2. Monitor referral_reward_notifications table
3. Set up admin dashboard to query pending rewards

==========================================
' AS summary;

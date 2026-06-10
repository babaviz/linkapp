# Complete Database Setup Guide

## Overview
This guide will help you set up your Supabase database from scratch for the first time with all required tables, policies, indexes, and storage buckets.

## ✅ What's Included

The main `schema.sql` now includes **ALL** tables needed for the application:

### Core Tables
- ✅ `users` - User accounts and profiles
- ✅ `property_listings` - Property rental/sale listings
- ✅ `job_postings` - Job listings
- ✅ `service_listings` - Service provider listings
- ✅ `date_mi_profiles` - Dating module profiles
- ✅ `property_inquiries` - **NEW** Property inquiry messages
- ✅ `subscriptions` - **NEW** User subscription management

### Financial & Transactions
- ✅ `escrow_transactions` - Escrow payment tracking
- ✅ `escrow_sessions` - Timed service sessions
- ✅ `transactions` - Payment transactions
- ✅ `payment_methods` - User payment methods
- ✅ `paystack_transactions` - Paystack-specific transactions
- ✅ `payout_requests` - Creator payout requests

### Creator Economy
- ✅ `creator_services` - Creator service offerings
- ✅ `creator_content` - Premium creator content
- ✅ `creator_earnings` - Creator earnings tracking

### Document Management
- ✅ `user_documents` - **NEW** User file metadata
- ✅ `job_application_documents` - **NEW** Job application files

### Communication
- ✅ `video_call_sessions` - Video call tracking
- ✅ `calls` - Call history
- ✅ `signaling_messages` - WebRTC signaling

### Notifications
- ✅ `notification_tokens` - Push notification tokens
- ✅ `notification_settings` - User notification preferences
- ✅ `notification_history` - Notification delivery tracking

### Analytics & Engagement
- ✅ `user_activities` - User interaction tracking
- ✅ `engagement_metrics` - Content engagement metrics
- ✅ `performance_snapshots` - Historical performance data
- ✅ `activity_indicators` - Real-time activity stats
- ✅ `analytics_events` - Analytics event tracking

### Moderation & Safety
- ✅ `content_reports` - Content reporting
- ✅ `moderation_reports` - Moderation reports
- ✅ `user_report_stats` - User reporting statistics
- ✅ `user_moderation_history` - Moderation action history
- ✅ `user_roles` - **NEW** User role management
- ✅ `datemi_likes` - Dating likes
- ✅ `datemi_blocks` - User blocks
- ✅ `datemi_reports` - Dating profile reports

### Referrals & Rewards
- ✅ `referrals` - Referral tracking
- ✅ `user_referral_codes` - User referral codes
- ✅ `referral_statistics` - Referral progress stats
- ✅ `premium_access_periods` - Premium access rewards

### Verification & Categories
- ✅ `age_verifications` - Age verification documents
- ✅ `categories` - Dynamic categories for all modules

---

## 🚀 Setup Instructions

### Step 1: Prepare Your Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project or select existing project
3. Note your:
   - Project URL: `https://xxxxx.supabase.co`
   - Anon/Public Key: `eyJhbGc...`

### Step 2: Run Main Schema

1. Open Supabase SQL Editor
2. Copy the **entire** contents of `database/schema.sql`
3. Paste into SQL Editor
4. Click **Run**
5. Wait for completion (may take 1-2 minutes)

This will create:
- ✅ All 40+ tables
- ✅ Row Level Security (RLS) policies
- ✅ Indexes for performance
- ✅ Triggers for auto-updates
- ✅ Helper functions

### Step 3: Run Additional Migrations

Run these migrations in order:

#### 3.1 Notification System
```sql
-- File: database/migrations/add_notification_tables.sql
```
Already included in main schema, skip if using updated schema.sql

#### 3.2 Referral System
```sql
-- File: database/migrations/add_referral_system.sql
```
Run this to add referral functionality with functions.

#### 3.3 Paystack Integration
```sql
-- File: database/migrations/add_paystack_tables.sql
```
Run this for multi-country payment support.

#### 3.4 Call System
```sql
-- File: database/migrations/add_calls_table.sql
```
Run this for video/audio call features.

#### 3.5 Categories
```sql
-- File: database/migrations/create_categories_table.sql
```
Run this to populate dynamic categories.

#### 3.6 Moderation System
```sql
-- File: database/moderation_schema.sql
```
Run this for community moderation features.

### Step 4: Set Up Storage Buckets

1. Go to Storage in Supabase Dashboard
2. Create these buckets with **Public** access:
   - `profile-images`
   - `property-images`
   - `service-images`
   - `datemi-photos`
   - `creator-content` (private)
   
3. Create these buckets with **Private** access:
   - `resumes` (for job applications)
   - `documents` (for KYC/verification)

4. Run storage policies:
```sql
-- File: database/storage.sql
```

### Step 5: Verify Setup

Run these verification queries:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- Check policies exist
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Check indexes
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Step 6: Configure Environment Variables

Update your `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## 📊 Database Structure Summary

### Total Tables: **43 tables**

### Key Relationships:
- Users → Properties (1:many)
- Users → Jobs (1:many)
- Users → Services (1:many)
- Users → DateMi Profiles (1:1)
- Users → Subscriptions (1:many)
- Users → Documents (1:many)
- Properties → Inquiries (1:many)
- Jobs → Application Documents (1:many)
- Users → Referrals (1:many)

### Security Features:
- ✅ Row Level Security (RLS) on all tables
- ✅ User-level access control
- ✅ Owner-only modifications
- ✅ Admin/moderator special access
- ✅ Secure document storage

### Performance Optimizations:
- ✅ 80+ indexes for fast queries
- ✅ Composite indexes for common query patterns
- ✅ Partial indexes for filtered queries
- ✅ Foreign key constraints with CASCADE deletes

---

## 🔧 Troubleshooting

### Issue: "relation already exists"
**Solution**: Some tables might already exist. Skip that section or drop existing tables first.

### Issue: "permission denied"
**Solution**: Make sure you're using the Supabase SQL Editor as the service role.

### Issue: "function does not exist"
**Solution**: Run the schema.sql first before migrations that depend on functions.

### Issue: RLS blocking queries
**Solution**: 
1. Check if user is authenticated
2. Verify RLS policies match your use case
3. Temporarily disable RLS for testing (not recommended for production)

---

## 🎯 Next Steps

After database setup:

1. ✅ Test authentication flow
2. ✅ Test data insertion in each module
3. ✅ Verify RLS policies work correctly
4. ✅ Upload test files to storage buckets
5. ✅ Test real-time subscriptions
6. ✅ Set up database backups
7. ✅ Configure database webhooks (optional)

---

## 📝 Notes

- **Backup regularly**: Set up automated backups in Supabase dashboard
- **Monitor usage**: Check database size and performance metrics
- **Scale as needed**: Upgrade Supabase plan when approaching limits
- **Keep schema in sync**: Document any manual changes to schema

---

## 🆘 Support

If you encounter issues:
1. Check Supabase logs in dashboard
2. Review error messages carefully
3. Consult Supabase documentation
4. Check the project's issue tracker

---

**Last Updated**: 2025-10-25
**Schema Version**: 1.0.0 (Complete with all missing tables)

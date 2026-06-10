# Database Setup Checklist

## ✅ Pre-Setup
- [ ] Supabase account created
- [ ] New project created in Supabase
- [ ] Project URL and Anon Key copied
- [ ] Environment variables configured in `.env`

## ✅ Main Schema Setup
- [ ] Open Supabase SQL Editor
- [ ] Run entire `database/schema.sql` file
- [ ] Verify no errors in output
- [ ] Confirm 40+ tables created

## ✅ Additional Migrations (Run in order)
- [ ] `database/migrations/add_referral_system.sql` - Referral rewards system
- [ ] `database/migrations/add_paystack_tables.sql` - Multi-country payments
- [ ] `database/migrations/add_calls_table.sql` - Video/audio calls
- [ ] `database/migrations/create_categories_table.sql` - Dynamic categories
- [ ] `database/moderation_schema.sql` - Community moderation
- [ ] `database/escrow_schema_update.sql` - Escrow enhancements (if needed)

## ✅ Storage Buckets Setup

### Public Buckets (Create with Public access)
- [ ] `profile-images` - User profile photos
- [ ] `property-images` - Property listing photos
- [ ] `service-images` - Service listing photos
- [ ] `datemi-photos` - Dating profile photos

### Private Buckets (Create with Private access)
- [ ] `resumes` - Job application resumes
- [ ] `documents` - KYC/verification documents
- [ ] `creator-content` - Premium creator content

### Storage Policies
- [ ] Run `database/storage.sql` to set up bucket policies

## ✅ Verification Queries

Run these to confirm setup:

```sql
-- Should return 43+ tables
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';

-- Should return all tables with RLS enabled
SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;

-- Should show policies for each table
SELECT tablename, COUNT(*) FROM pg_policies WHERE schemaname = 'public' GROUP BY tablename;
```

## ✅ Critical Tables Checklist

### Core Tables (Must Have)
- [ ] `users`
- [ ] `property_listings`
- [ ] `job_postings`
- [ ] `service_listings`
- [ ] `date_mi_profiles`

### NEW Tables (Just Added)
- [ ] `property_inquiries` ⭐
- [ ] `subscriptions` ⭐
- [ ] `user_documents` ⭐
- [ ] `job_application_documents` ⭐
- [ ] `user_roles` ⭐

### Financial Tables
- [ ] `escrow_transactions`
- [ ] `transactions`
- [ ] `payment_methods`
- [ ] `paystack_transactions`

### Communication Tables
- [ ] `video_call_sessions`
- [ ] `calls`
- [ ] `notification_tokens`
- [ ] `notification_settings`

### Creator Economy
- [ ] `creator_services`
- [ ] `creator_content`
- [ ] `creator_earnings`

### Referral System
- [ ] `referrals`
- [ ] `user_referral_codes`
- [ ] `premium_access_periods`

### Analytics
- [ ] `user_activities`
- [ ] `engagement_metrics`
- [ ] `analytics_events`

### Moderation
- [ ] `content_reports`
- [ ] `user_roles`
- [ ] `datemi_reports`

## ✅ Testing

- [ ] Create test user account
- [ ] Insert test property listing
- [ ] Submit test property inquiry
- [ ] Create test subscription
- [ ] Upload test document
- [ ] Test RLS policies (try accessing other users' data - should fail)
- [ ] Test real-time subscriptions

## ✅ Post-Setup

- [ ] Enable database backups in Supabase
- [ ] Set up monitoring/alerts
- [ ] Document any custom changes
- [ ] Update team on new schema
- [ ] Test application end-to-end

## 🚨 Common Issues & Solutions

### Issue: Table already exists
**Solution**: Drop existing table or skip that CREATE statement

### Issue: Foreign key constraint fails  
**Solution**: Ensure parent tables exist before creating child tables

### Issue: RLS blocking queries
**Solution**: Check auth context and policy conditions

### Issue: Storage bucket not found
**Solution**: Create buckets in Supabase dashboard first

## 📊 Expected Results

After complete setup:
- **43 tables** created
- **80+ indexes** for performance
- **50+ RLS policies** for security
- **15+ triggers** for automation
- **7 storage buckets** configured
- **All TypeScript types** matching database schema

## 🎯 Success Criteria

✅ All tables created without errors
✅ All RLS policies active
✅ All storage buckets configured
✅ Test data inserts successfully
✅ Application connects to database
✅ No TypeScript type errors

---

**Setup Time Estimate**: 15-30 minutes
**Last Updated**: 2025-10-25

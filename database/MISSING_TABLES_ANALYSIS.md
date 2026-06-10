# Missing Database Tables Analysis

## Summary
Based on analysis of the codebase, the following tables are referenced in the TypeScript code but are **NOT defined** in the database schema files:

## ❌ Missing Tables

### 1. **property_inquiries**
- **Referenced in**: `services/propertyInquiryService.ts`
- **Purpose**: Store property inquiry messages from potential tenants/buyers
- **Required Columns**:
  - `id` (UUID, PK)
  - `property_id` (UUID, FK to property_listings)
  - `inquirer_id` (UUID, FK to users)
  - `owner_id` (UUID, FK to users)
  - `message` (TEXT)
  - `contact_phone` (TEXT, optional)
  - `contact_email` (TEXT, optional)
  - `status` (TEXT: 'pending', 'responded', 'closed')
  - `created_at` (TIMESTAMPTZ)
  - `responded_at` (TIMESTAMPTZ, optional)
  - `response` (TEXT, optional)

### 2. **subscriptions**
- **Referenced in**: Multiple files including:
  - `database/migrations/add_paystack_tables.sql`
  - `database/migrations/add_calls_table.sql`
  - `screens/ManageSubscriptionScreen.tsx`
  - `services/paystackService.ts`
- **Purpose**: Store user subscription information for Date Mi premium tiers
- **Required Columns**:
  - `id` (UUID, PK)
  - `user_id` (UUID, FK to users)
  - `tier` (TEXT: 'free', 'pro', 'premium')
  - `status` (TEXT: 'active', 'cancelled', 'expired', 'trialing')
  - `start_date` (TIMESTAMPTZ)
  - `end_date` (TIMESTAMPTZ)
  - `payment_method` (TEXT)
  - `payment_channel` (TEXT, optional)
  - `transaction_id` (TEXT, optional)
  - `amount_paid` (DECIMAL)
  - `currency` (TEXT)
  - `country_code` (TEXT)
  - `auto_renew` (BOOLEAN)
  - `created_at` (TIMESTAMPTZ)
  - `updated_at` (TIMESTAMPTZ)

### 3. **resumes** (Storage Bucket + Metadata Table)
- **Referenced in**: `services/fileUploadService.ts`
- **Purpose**: Store resume files for job applications
- **Storage**: Supabase Storage bucket 'resumes'
- **Metadata Table**: Should track uploaded resume metadata

### 4. **job_application_documents**
- **Referenced in**: `services/fileUploadService.ts` (line 295)
- **Purpose**: Link uploaded documents (resumes, certificates) to job applications
- **Required Columns**:
  - `id` (UUID, PK)
  - `file_id` (UUID or TEXT)
  - `user_id` (UUID, FK to users)
  - `job_id` (UUID, FK to job_postings)
  - `document_type` (TEXT: 'resume', 'cover_letter', 'certificate', 'portfolio')
  - `created_at` (TIMESTAMPTZ)

### 5. **user_documents**
- **Referenced in**: `services/fileUploadService.ts` (line 370)
- **Purpose**: Store user-uploaded documents metadata (resumes, certificates, etc.)
- **Required Columns**:
  - `id` (UUID, PK)
  - `user_id` (UUID, FK to users)
  - `document_type` (TEXT: 'resume', 'certificate', 'id_document', 'portfolio')
  - `file_name` (TEXT)
  - `file_url` (TEXT)
  - `file_size` (INTEGER)
  - `mime_type` (TEXT)
  - `created_at` (TIMESTAMPTZ)
  - `updated_at` (TIMESTAMPTZ)

### 6. **user_roles** (Referenced in moderation_schema.sql)
- **Referenced in**: `database/moderation_schema.sql` (lines 206, 221)
- **Purpose**: Store user roles for moderators and admins
- **Required Columns**:
  - `id` (UUID, PK)
  - `user_id` (UUID, FK to users)
  - `role` (TEXT: 'user', 'moderator', 'admin')
  - `granted_by` (UUID, FK to users, optional)
  - `granted_at` (TIMESTAMPTZ)
  - `expires_at` (TIMESTAMPTZ, optional)
  - `is_active` (BOOLEAN)

## ✅ Tables Already Defined in Schema

The following tables ARE properly defined:
- `users`
- `property_listings`
- `job_postings`
- `service_listings`
- `date_mi_profiles` (note: schema uses underscore, code references both `date_mi_profiles` and `datemi_profiles`)
- `escrow_transactions`
- `escrow_sessions`
- `creator_services`
- `creator_content`
- `creator_earnings`
- `payment_methods`
- `transactions`
- `video_call_sessions`
- `signaling_messages`
- `user_activities`
- `engagement_metrics`
- `analytics_events`
- `notification_tokens`
- `notification_settings`
- `notification_history`
- `moderation_reports`
- `content_reports`
- `referrals`
- `user_referral_codes`
- `referral_statistics`
- `premium_access_periods`
- `paystack_transactions`
- `calls`
- `categories`
- `datemi_likes`
- `datemi_blocks`
- `datemi_reports`
- `age_verifications`

## Action Required

Create migration file: `database/migrations/add_missing_core_tables.sql` with all missing tables listed above.

## Priority Level

🔴 **CRITICAL** - These tables are referenced in active service code and will cause runtime errors if not present in the database.

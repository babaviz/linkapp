/**
 * Google Play Store Reviewer Test Account Creation Script
 * 
 * This script creates a dedicated test account for Google Play Store reviewers
 * using Supabase Admin API.
 * 
 * Usage:
 * 1. Set environment variables:
 *    - SUPABASE_URL: Your Supabase project URL
 *    - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key (from Settings > API)
 * 
 * 2. Run the script:
 *    npx tsx scripts/createPlayStoreReviewerAccount.ts
 * 
 * Or with environment variables inline:
 *    SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key npx tsx scripts/createPlayStoreReviewerAccount.ts
 */

/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Google Play Store Reviewer Test Account Credentials
// These credentials will be provided to Google Play reviewers to test the app
const TEST_EMAIL = 'playstore.reviewer@linkapp.test';
const TEST_PASSWORD = 'PlayStoreReview2025!';
const TEST_FULL_NAME = 'Play Store Reviewer';
const TEST_PHONE = '+254700000000';

interface Config {
  supabaseUrl: string;
  serviceRoleKey: string;
}

type AdminAuthUser = {
  id: string;
  email?: string | null;
};

function getConfig(): Config {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL environment variable is required'
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY environment variable is required.\n' +
      'Get it from: Supabase Dashboard > Settings > API > service_role key (secret)'
    );
  }

  return { supabaseUrl, serviceRoleKey };
}

async function findUserByEmail(
  supabaseAdmin: any,
  email: string,
  options?: { perPage?: number; maxPages?: number }
): Promise<AdminAuthUser | null> {
  const target = email.trim().toLowerCase();
  const perPage = options?.perPage ?? 1000;
  const maxPages = options?.maxPages ?? 20;

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list users (page ${page}): ${error.message}`);
    }

    const users = (data as any)?.users as AdminAuthUser[] | undefined;
    const match = (users || []).find((u) => (u.email || '').toLowerCase() === target);
    if (match) {
      return match;
    }

    // If we received fewer than requested, we've reached the end.
    if (!users || users.length < perPage) {
      break;
    }
  }

  return null;
}

async function createReviewerAccount() {
  try {
    console.log('🚀 Creating Google Play Store Reviewer Test Account...\n');

    const { supabaseUrl, serviceRoleKey } = getConfig();

    // Create Supabase admin client (with service role key for admin operations)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Step 1: Check if user already exists
    console.log('📋 Step 1: Checking if account already exists...');
    const existingUser = await findUserByEmail(supabaseAdmin, TEST_EMAIL);

    let userId: string;

    if (existingUser) {
      console.log(`⚠️  User already exists with ID: ${existingUser.id}`);
      console.log('   Updating existing account...\n');
      userId = existingUser.id;

      // Update metadata + password in a single admin call (more reliable + fewer API calls)
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        user_metadata: {
          full_name: TEST_FULL_NAME,
          phone: TEST_PHONE,
          city: 'Nairobi',
          country: 'Kenya',
        },
        email_confirm: true, // Ensure email is confirmed
      } as any);

      if (updateError) throw new Error(`Failed to update user: ${updateError.message}`);

      console.log('✅ Account updated successfully\n');
    } else {
      // Step 2: Create new user
      console.log('📋 Step 2: Creating new auth user...');
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true, // Auto-confirm email so reviewers don't need to verify
        user_metadata: {
          full_name: TEST_FULL_NAME,
          phone: TEST_PHONE,
          city: 'Nairobi',
          country: 'Kenya',
        },
      });

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      userId = newUser?.user?.id;
      if (!userId) {
        // Extremely defensive: if the API returns no user object, try to re-find by email.
        const created = await findUserByEmail(supabaseAdmin, TEST_EMAIL, { maxPages: 30 });
        if (!created?.id) {
          throw new Error('User created but could not determine user ID');
        }
        userId = created.id;
      }
      console.log(`✅ Auth user created with ID: ${userId}\n`);
    }

    // Step 3: Ensure user profile exists in public.users
    console.log('📋 Step 3: Creating/updating user profile...');
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          id: userId,
          email: TEST_EMAIL,
          full_name: TEST_FULL_NAME,
          phone: TEST_PHONE,
          kyc_status: 'pending',
          creator_verification_status: 'not_applied',
          location_preferences: {
            town: 'Nairobi',
            county: 'Kenya',
          },
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
        }
      );

    if (profileError) {
      throw new Error(`Failed to create/update profile: ${profileError.message}`);
    }

    console.log('✅ User profile created/updated\n');

    // Step 4: Generate referral code (if function exists)
    console.log('📋 Step 4: Generating referral code...');
    try {
      const { data: refCode, error: refCodeError } = await supabaseAdmin.rpc(
        'generate_referral_code',
        { user_id_param: userId }
      );

      if (!refCodeError && refCode) {
        const { error: insertRefError } = await supabaseAdmin
          .from('user_referral_codes')
          .upsert(
            {
              user_id: userId,
              referral_code: refCode,
            },
            { onConflict: 'user_id' }
          );

        if (!insertRefError) {
          console.log(`✅ Referral code generated: ${refCode}\n`);
        }
      }
    } catch {
      console.log('⚠️  Referral code generation skipped (function may not exist)\n');
    }

    // Step 5: Verify account setup
    console.log('📋 Step 5: Verifying account setup...');
    const { data: profile, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (verifyError || !profile) {
      throw new Error(`Verification failed: ${verifyError?.message || 'Profile not found'}`);
    }

    console.log('✅ Account verification successful\n');

    // Success summary
    console.log('========================================');
    console.log('✅ Test Account Setup Complete!');
    console.log('========================================');
    console.log(`Email: ${TEST_EMAIL}`);
    console.log(`Password: ${TEST_PASSWORD}`);
    console.log(`User ID: ${userId}`);
    console.log(`Full Name: ${TEST_FULL_NAME}`);
    console.log(`Phone: ${TEST_PHONE}`);
    console.log('========================================\n');
    console.log('📝 Next Steps:');
    console.log('1. Test login with these credentials in your app');
    console.log('2. Verify the account can access all main features');
    console.log('3. Add these credentials to Google Play Console App Access section');
    console.log('4. See GOOGLE_PLAY_CONSOLE_CREDENTIALS.md for details\n');

    return {
      success: true,
      userId,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    };
  } catch (error) {
    console.error('\n❌ Error creating test account:');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('\n💡 Troubleshooting:');
    console.error('1. Ensure SUPABASE_URL is set correctly');
    console.error('2. Ensure SUPABASE_SERVICE_ROLE_KEY is set (from Supabase Dashboard > Settings > API)');
    console.error('3. Verify you have admin access to the Supabase project');
    console.error('4. Check that the database tables exist (run database/schema.sql if needed)\n');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  createReviewerAccount()
    .then(() => {
      console.log('🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { createReviewerAccount };


/**
 * Helper script to set up Google Play Reviewer Account
 * This script provides instructions and verifies the setup
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// Google Play Store Reviewer Credentials
const TEST_EMAIL = 'playstore.reviewer@linkapp.test';
const TEST_PASSWORD = 'PlayStoreReview2025!';

async function checkAndSetup() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://alyrtfczemrahupffrbe.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  console.log('🔍 Checking configuration...\n');
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Service Role Key: ${serviceRoleKey ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`Anon Key: ${anonKey ? '✅ SET' : '⚠️  NOT SET (optional)'}\n`);

  if (!serviceRoleKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY is required to create/update users.\n');
    console.log('📋 To get your service role key:');
    console.log('   1. Go to https://supabase.com/dashboard');
    console.log('   2. Select your project');
    console.log('   3. Go to Settings → API');
    console.log('   4. Copy the "service_role" key (secret, not anon key)\n');
    console.log('💡 Then set it as an environment variable:');
    console.log(`   $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"  # PowerShell`);
    console.log(`   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"  # Bash\n`);
    console.log('🔄 After setting the key, run: npm run create:reviewer-account\n');
    return false;
  }

  try {
    console.log('🚀 Creating/updating reviewer account...\n');
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Check if user exists
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    const existingUser = users.users.find((u: any) => u.email === TEST_EMAIL);

    if (existingUser) {
      console.log(`✅ User found: ${existingUser.id}`);
      console.log('   Updating password and metadata...\n');
      
      // Update user
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          password: TEST_PASSWORD,
          user_metadata: {
            full_name: 'Play Store Reviewer',
            phone: '+254700000000',
          },
          email_confirm: true,
        }
      );

      if (updateError) {
        throw new Error(`Failed to update user: ${updateError.message}`);
      }

      console.log('✅ Password updated successfully\n');
    } else {
      console.log('📝 Creating new user...\n');
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: 'Play Store Reviewer',
          phone: '+254700000000',
        },
      });

      if (createError) {
        // If error is about database/trigger, try to continue and create profile manually
        if (createError.message.includes('Database error') || createError.message.includes('trigger')) {
          console.warn(`⚠️  User creation had trigger error: ${createError.message}`);
          console.log('   Attempting to continue with profile creation...\n');
          // Try to get the user that might have been created despite the error
          const { data: checkUsers } = await supabaseAdmin.auth.admin.listUsers();
          const createdUser = checkUsers.users.find((u: any) => u.email === TEST_EMAIL);
          if (!createdUser) {
            throw new Error(`Failed to create user: ${createError.message}`);
          }
          // Continue with profile creation below
        } else {
          throw new Error(`Failed to create user: ${createError.message}`);
        }
      }

      console.log(`✅ User created: ${newUser.user.id}\n`);
    }

    // Get user ID
    const { data: updatedUsers } = await supabaseAdmin.auth.admin.listUsers();
    const user = updatedUsers.users.find((u: any) => u.email === TEST_EMAIL);
    
    if (!user) {
      throw new Error('User not found after creation/update');
    }

    // Ensure profile exists
    console.log('📝 Creating/updating user profile...\n');
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          id: user.id,
          email: TEST_EMAIL,
          full_name: 'Play Store Reviewer',
          phone: '+254700000000',
          kyc_status: 'pending',
          creator_verification_status: 'not_applied',
          location_preferences: {
            county: 'Nairobi',
            town: 'Nairobi',
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      console.warn(`⚠️  Profile update warning: ${profileError.message}\n`);
    } else {
      console.log('✅ Profile created/updated\n');
    }

    // Try to generate referral code
    try {
      const { data: refCode, error: refError } = await supabaseAdmin.rpc(
        'generate_referral_code',
        { user_id_param: user.id }
      );

      if (!refError && refCode) {
        await supabaseAdmin
          .from('user_referral_codes')
          .upsert({ user_id: user.id, referral_code: refCode }, { onConflict: 'user_id' });
        console.log(`✅ Referral code: ${refCode}\n`);
      }
    } catch {
      console.log('⚠️  Referral code generation skipped\n');
    }

    // Verify
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    console.log('========================================');
    console.log('✅ Account Setup Complete!');
    console.log('========================================');
    console.log(`Email: ${TEST_EMAIL}`);
    console.log(`Password: ${TEST_PASSWORD}`);
    console.log(`User ID: ${user.id}`);
    console.log(`Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`Profile Created: ${profile ? 'Yes' : 'No'}`);
    console.log('========================================\n');

    console.log('📋 Next Steps:');
    console.log('1. Test login with these credentials in your app');
    console.log('2. Add credentials to Google Play Console → App Access');
    console.log('3. See GOOGLE_PLAY_CONSOLE_CREDENTIALS.md for details\n');

    return true;
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

if (require.main === module) {
  checkAndSetup()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { checkAndSetup };


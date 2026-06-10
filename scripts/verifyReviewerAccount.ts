import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const TEST_EMAIL = 'playstore.reviewer@linkapp.test';
const TEST_PASSWORD = 'PlayStoreReview2025!';

async function verifyAccount() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('🔍 Checking reviewer account...\n');

  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error listing users:', listError.message);
    process.exit(1);
  }

  const reviewer = users.users.find((u: any) => u.email === TEST_EMAIL);

  if (!reviewer) {
    console.log('❌ Reviewer account NOT FOUND');
    console.log('\n💡 Run: npm run create:reviewer-account\n');
    process.exit(1);
  }

  console.log('✅ Account found in auth.users');
  console.log(`   User ID: ${reviewer.id}`);
  console.log(`   Email confirmed: ${reviewer.email_confirmed_at ? 'Yes' : 'No'}`);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', reviewer.id)
    .single();

  if (profileError || !profile) {
    console.log('❌ Profile NOT FOUND in public.users');
    console.log('\n💡 Run: npm run create:reviewer-account\n');
    process.exit(1);
  }

  console.log('✅ Profile found in public.users');
  console.log(`   Full name: ${profile.full_name}`);
  console.log(`   Phone: ${profile.phone}`);

  console.log('\n🔐 Testing login...');
  
  const supabaseClient = createClient(
    supabaseUrl,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  );

  const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (loginError) {
    console.log('❌ Login FAILED:', loginError.message);
    console.log('\n💡 Possible issues:');
    console.log('   1. Password may be incorrect');
    console.log('   2. Email may not be confirmed');
    console.log('   3. Account may be disabled');
    console.log('\n🔧 Fix: npm run create:reviewer-account\n');
    process.exit(1);
  }

  console.log('✅ Login SUCCESSFUL');
  console.log(`   Session token: ${loginData.session?.access_token?.substring(0, 20)}...`);
  console.log('\n🎉 Reviewer account is working correctly!\n');
  console.log('Credentials:');
  console.log(`   Email: ${TEST_EMAIL}`);
  console.log(`   Password: ${TEST_PASSWORD}\n`);

  await supabaseClient.auth.signOut();
}

verifyAccount().catch(console.error);

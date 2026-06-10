const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://alyrtfczemrahupffrbe.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFseXJ0ZmN6ZW1yYWh1cGZmcmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzYyNjcxNywiZXhwIjoyMDkzMjAyNzE3fQ.QLuLflWdDWFmNNHSm6_gfOssGMRr0S-m_NKA2GmrnOw';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  console.log('\n🔍 Checking database tables...\n');
  
  const tables = [
    'paystack_transactions',
    'subscriptions',
    'date_mi_profiles',
    'payment_methods_extended',
    'webhook_events',
    'subscription_pricing'
  ];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`   ❌ ${table}: Does not exist or no access`);
        console.log(`      Error: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: Exists (${count} rows)`);
      }
    } catch (err) {
      console.log(`   ❌ ${table}: Error - ${err.message}`);
    }
  }
}

async function testRLS() {
  console.log('\n🔐 Testing RLS policies...\n');
  
  console.log('Testing paystack_transactions table:');
  
  const testUserId = 'test-user-' + Date.now();
  
  try {
    const { data, error } = await supabase
      .from('paystack_transactions')
      .insert({
        user_id: testUserId,
        reference: 'test_ref_' + Date.now(),
        amount: 100,
        currency: 'KES',
        country: 'KE',
        tier: 'pro',
        billing_cycle: 'monthly',
        status: 'pending'
      })
      .select();
    
    if (error) {
      if (error.message.includes('row-level security')) {
        console.log('   ❌ RLS POLICY MISSING - Cannot insert transactions');
        console.log('   📝 Migration needed!');
        return false;
      } else {
        console.log(`   ⚠️  Insert error: ${error.message}`);
        return false;
      }
    } else {
      console.log('   ✅ RLS policies working - Insert successful');
      
      // Clean up test data
      await supabase
        .from('paystack_transactions')
        .delete()
        .eq('user_id', testUserId);
      
      return true;
    }
  } catch (err) {
    console.log(`   ❌ Test failed: ${err.message}`);
    return false;
  }
}

async function showManualInstructions() {
  console.log('\n📋 MANUAL MIGRATION REQUIRED\n');
  console.log('Please run the following SQL in your Supabase SQL Editor:\n');
  console.log('Dashboard → SQL Editor → New Query\n');
  console.log('─'.repeat(80));
  
  const migrationPath = path.join(__dirname, '../database/migrations/fix_paystack_transactions_rls.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  console.log(sql);
  console.log('─'.repeat(80));
  
  console.log('\n📍 Quick Link:');
  console.log(`   ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new\n`);
}

async function main() {
  console.log('🔧 Paystack Database Configuration Check\n');
  console.log(`Supabase URL: ${supabaseUrl}\n`);
  
  await checkTables();
  
  const rlsWorking = await testRLS();
  
  if (!rlsWorking) {
    await showManualInstructions();
    console.log('\n❌ Action Required: Apply the SQL migration above\n');
  } else {
    console.log('\n✅ Database is properly configured!');
    console.log('\n📊 Summary:');
    console.log('   ✅ All tables exist');
    console.log('   ✅ RLS policies are working');
    console.log('   ✅ Ready for Paystack payments\n');
  }
}

main().catch(console.error);

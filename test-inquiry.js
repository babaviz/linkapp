const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testInquiry() {
  // First, get the current user to test with
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Current user:', user?.email || 'Not logged in');
  
  if (\!user) {
    console.log('\n⚠️  No user logged in. Testing with mock IDs...');
    console.log('In production, users must be authenticated to submit inquiries.');
  }
  
  console.log('\n📊 Testing property_inquiries table access...\n');
  
  // Test: Can we query the table?
  const { data, error } = await supabase
    .from('property_inquiries')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('❌ Error querying table:', error.message);
  } else {
    console.log('✅ Table accessible via anon key');
    console.log('   Records found:', data?.length || 0);
  }
}

testInquiry().catch(console.error);

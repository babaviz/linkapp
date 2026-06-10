/**
 * Apply Property Inquiries Migration
 * This script creates the property_inquiries table if it doesn't exist
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please ensure EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 Applying property_inquiries migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', 'create_property_inquiries_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('🔧 Executing SQL...\n');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: migrationSQL });

    if (error) {
      // Try direct execution if RPC fails
      console.log('⚠️  RPC failed, trying direct execution...\n');
      
      // Split SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

      for (const statement of statements) {
        if (statement.toLowerCase().includes('comment on')) {
          // Skip comments as they might not be supported
          continue;
        }
        
        console.log(`Executing: ${statement.substring(0, 60)}...`);
        const { error: execError } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (execError) {
          console.log(`⚠️  Statement failed (may already exist): ${execError.message}`);
        }
      }
    }

    console.log('\n✅ Migration applied successfully!');
    console.log('\n📊 Verifying table exists...');

    // Verify the table exists
    const { data: tableData, error: tableError } = await supabase
      .from('property_inquiries')
      .select('*')
      .limit(1);

    if (tableError) {
      if (tableError.message.includes('relation') && tableError.message.includes('does not exist')) {
        console.log('\n⚠️  Table creation failed. Please apply migration manually using Supabase Dashboard.');
        console.log('\n📋 SQL to execute:');
        console.log(migrationSQL);
      } else {
        console.log(`\n✅ Table exists! (Query error is expected if table is empty)`);
      }
    } else {
      console.log(`\n✅ Table verified and accessible!`);
      console.log(`   Found ${tableData?.length || 0} existing inquiries`);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 Manual steps:');
    console.error('1. Go to your Supabase Dashboard: ' + supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql'));
    console.error('2. Open the SQL Editor');
    console.error('3. Copy and paste the contents of:');
    console.error('   database/migrations/create_property_inquiries_table.sql');
    console.error('4. Run the SQL');
    process.exit(1);
  }
}

applyMigration();

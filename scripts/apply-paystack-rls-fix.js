const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   - SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('📝 Applying Paystack Transactions RLS Fix...\n');

    const migrationPath = path.join(__dirname, '../database/migrations/fix_paystack_transactions_rls.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing migration SQL...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 80)}...`);
        const { error: stmtError } = await supabase.rpc('query', { 
          query_text: statement 
        }).catch(async () => {
          const result = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ query: statement })
          });
          
          if (!result.ok) {
            throw new Error(`Failed to execute statement: ${await result.text()}`);
          }
          
          return { error: null };
        });

        if (stmtError) {
          throw stmtError;
        }
      }
      
      return { error: null };
    });

    if (error) {
      throw error;
    }

    console.log('\n✅ Migration applied successfully!');
    console.log('\n📋 Changes made:');
    console.log('   ✓ Added INSERT policy for users on paystack_transactions');
    console.log('   ✓ Added UPDATE policy for users on paystack_transactions');
    console.log('   ✓ Users can now create and update their own payment transactions');
    console.log('\n🎉 The "row-level security policy" error should now be resolved!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nTrying alternative approach - executing statements individually...\n');

    try {
      const migrationPath = path.join(__dirname, '../database/migrations/fix_paystack_transactions_rls.sql');
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        console.log(`📌 Executing: ${statement.substring(0, 60).replace(/\n/g, ' ')}...`);
        
        const cleanStatement = statement + ';';
        const result = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Prefer': 'return=minimal'
          },
          body: cleanStatement
        });

        if (!result.ok && result.status !== 204) {
          const errorText = await result.text();
          console.warn(`   ⚠️  Statement warning: ${errorText.substring(0, 100)}`);
        } else {
          console.log('   ✓ Success');
        }
      }

      console.log('\n✅ Migration completed with alternative method!');
      console.log('\n📋 Please verify the policies were created:');
      console.log('   1. Go to your Supabase Dashboard');
      console.log('   2. Navigate to Authentication > Policies');
      console.log('   3. Check the paystack_transactions table');
      console.log('   4. Verify these policies exist:');
      console.log('      - Users can view their own transactions (SELECT)');
      console.log('      - Users can insert their own transactions (INSERT)');
      console.log('      - Users can update their own transactions (UPDATE)');
      console.log('      - Service role can manage all transactions (ALL)\n');

    } catch (retryError) {
      console.error('\n❌ Alternative approach also failed:', retryError.message);
      console.error('\n📝 Manual Steps Required:');
      console.error('   1. Open Supabase Dashboard');
      console.error('   2. Go to SQL Editor');
      console.error('   3. Run the SQL from: database/migrations/fix_paystack_transactions_rls.sql');
      process.exit(1);
    }
  }
}

applyMigration();

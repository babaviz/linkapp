#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Transactional Notification Dependencies...\n');

const packageJson = require('../package.json');

const requiredDependencies = {
  'expo-device': 'Device information tracking',
  'expo-localization': 'User locale and region detection',
  'expo-notifications': 'Push notification delivery',
  'react-native': 'Core React Native framework',
  '@supabase/supabase-js': 'Backend integration',
};

const requiredServices = [
  'services/transactionalNotificationService.ts',
  'services/emailNotificationService.ts',
  'services/notificationService.ts',
  'services/authService.ts',
  'services/paystackService.ts',
  'services/subscriptionService.ts',
  'services/supabaseClient.ts',
];

const requiredMigrations = [
  'database/migrations/add_notification_tables.sql',
  'database/migrations/add_email_logs_table.sql',
];

let hasErrors = false;

// Check dependencies
console.log('📦 Checking NPM Dependencies:\n');
for (const [pkg, description] of Object.entries(requiredDependencies)) {
  const installed = packageJson.dependencies[pkg] || packageJson.devDependencies[pkg];
  if (installed) {
    console.log(`  ✅ ${pkg} (${installed}) - ${description}`);
  } else {
    console.log(`  ❌ MISSING: ${pkg} - ${description}`);
    hasErrors = true;
  }
}

// Check service files
console.log('\n📁 Checking Service Files:\n');
for (const service of requiredServices) {
  const servicePath = path.join(__dirname, '..', service);
  if (fs.existsSync(servicePath)) {
    const stats = fs.statSync(servicePath);
    console.log(`  ✅ ${service} (${(stats.size / 1024).toFixed(1)}KB)`);
  } else {
    console.log(`  ❌ MISSING: ${service}`);
    hasErrors = true;
  }
}

// Check migrations
console.log('\n🗄️  Checking Database Migrations:\n');
for (const migration of requiredMigrations) {
  const migrationPath = path.join(__dirname, '..', migration);
  if (fs.existsSync(migrationPath)) {
    console.log(`  ✅ ${migration}`);
  } else {
    console.log(`  ⚠️  MISSING: ${migration} (will need to run)`);
  }
}

// Check integration files
console.log('\n🔗 Checking Integration Points:\n');
const integrations = [
  { file: 'services/authService.ts', check: 'transactionalNotificationService' },
  { file: 'services/paystackService.ts', check: 'transactionalNotificationService' },
  { file: 'services/subscriptionService.ts', check: 'transactionalNotificationService' },
  { file: 'netlify/functions/paystack-webhook.ts', check: 'notification_history' },
];

for (const { file, check } of integrations) {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(check)) {
      console.log(`  ✅ ${file} - integrated with ${check}`);
    } else {
      console.log(`  ⚠️  ${file} - missing ${check} integration`);
    }
  } else {
    console.log(`  ❌ ${file} - file not found`);
    hasErrors = true;
  }
}

// Summary
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.log('❌ VERIFICATION FAILED - Missing required dependencies or files');
  console.log('\nTo fix:');
  console.log('  npm install expo-device expo-localization');
  process.exit(1);
} else {
  console.log('✅ VERIFICATION PASSED - All dependencies and files present');
  console.log('\nNext steps:');
  console.log('  1. Run database migrations');
  console.log('  2. Set up email service (Resend/SendGrid)');
  console.log('  3. Deploy Supabase Edge Function');
  console.log('  4. Test notifications in dev environment');
  process.exit(0);
}

#!/usr/bin/env node

/**
 * Final Deployment Checklist Script
 * 
 * This script provides a comprehensive checklist for final deployment
 * and verifies all prerequisites are met before production launch.
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

const checklist = {
  critical: [
    {
      id: 'env-eas',
      title: 'EAS Environment Variables Set',
      description: 'All production environment variables configured in EAS Dashboard',
      verification: 'Check: https://expo.dev → Project → Environment Variables → production',
      vars: [
        'EXPO_PUBLIC_SUPABASE_URL',
        'EXPO_PUBLIC_SUPABASE_ANON_KEY',
        'EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY',
        'EXPO_PUBLIC_PAYSTACK_SECRET_KEY',
        'EXPO_PUBLIC_APP_URL',
        'EXPO_PUBLIC_STREAM_CHAT_API_KEY',
        'EXPO_PUBLIC_APP_ENV',
        'EXPO_PUBLIC_NOTIFICATIONS_MODE'
      ]
    },
    {
      id: 'env-netlify',
      title: 'Netlify Environment Variables Set',
      description: 'All environment variables configured in Netlify Dashboard',
      verification: 'Check: https://app.netlify.com → Site → Environment Variables',
      vars: [
        'PAYSTACK_SECRET_KEY',
        'EXPO_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY'
      ]
    },
    {
      id: 'paystack-live-keys',
      title: 'Paystack Live Keys Configured',
      description: 'Using LIVE keys (pk_live_... and sk_live_...) not test keys',
      verification: 'Verify keys start with pk_live_ and sk_live_',
      warning: 'CRITICAL: Test keys will not work in production!'
    },
    {
      id: 'netlify-function-deployed',
      title: 'Netlify Function Deployed',
      description: 'Paystack webhook function deployed and accessible',
      verification: 'Test: https://link-app.co/.netlify/functions/paystack-webhook',
      command: 'git push origin main (if not auto-deployed)'
    },
    {
      id: 'paystack-webhook-configured',
      title: 'Paystack Webhook Configured',
      description: 'Webhook URL added in Paystack Dashboard',
      verification: 'Check: https://dashboard.paystack.com → Settings → Webhooks',
      url: 'https://link-app.co/.netlify/functions/paystack-webhook',
      events: ['charge.success', 'charge.failed', 'subscription.create', 'subscription.disable']
    },
    {
      id: 'privacy-policy',
      title: 'Privacy Policy Created',
      description: 'Privacy policy document created and hosted at accessible URL',
      verification: 'Required by app stores',
      note: 'Use scripts/generate-privacy-policy.js to create template'
    }
  ],
  important: [
    {
      id: 'production-build',
      title: 'Production Build Created',
      description: 'Production APK/AAB built and tested',
      command: 'eas build --platform android --profile production',
      test: 'Install on device and test critical flows'
    },
    {
      id: 'google-play-console',
      title: 'Google Play Console Setup',
      description: 'Play Console account created and app listing prepared',
      verification: 'https://play.google.com/console',
      steps: [
        'Create app listing',
        'Complete content rating',
        'Upload screenshots',
        'Add privacy policy URL'
      ]
    },
    {
      id: 'service-account-key',
      title: 'Google Service Account Key',
      description: 'Service account JSON key downloaded for EAS Submit',
      file: 'google-service-account.json',
      verification: 'File exists in project root'
    },
    {
      id: 'supabase-production',
      title: 'Supabase Production Ready',
      description: 'Supabase production database configured',
      checks: [
        'RLS policies verified',
        'Service role key secured',
        'Backups enabled'
      ]
    },
    {
      id: 'firebase-production',
      title: 'Firebase Production Ready',
      description: 'Firebase production project configured',
      checks: [
        'google-services.json updated',
        'FCM server key configured',
        'Analytics enabled'
      ]
    }
  ],
  recommended: [
    {
      id: 'monitoring',
      title: 'Monitoring & Analytics',
      description: 'Set up monitoring and error tracking',
      tools: ['Firebase Crashlytics', 'Firebase Analytics', 'Error tracking']
    },
    {
      id: 'testing',
      title: 'Production Testing',
      description: 'Thoroughly test production build',
      tests: [
        'User registration/login',
        'Payment flow',
        'Subscription activation',
        'Video calls',
        'Chat functionality',
        'Notifications'
      ]
    },
    {
      id: 'documentation',
      title: 'Documentation Complete',
      description: 'All documentation updated',
      files: [
        'README.md',
        'DEPLOYMENT_REMAINING_TASKS.md',
        'DEPLOYMENT_READINESS_CHECKLIST.md'
      ]
    }
  ]
};

function displayChecklist() {
  log('\n🎯 Final Deployment Checklist', colors.magenta);
  log('================================\n', colors.magenta);

  // Critical items
  log('🔴 CRITICAL (Must Complete Before Launch):', colors.red);
  log('═══════════════════════════════════════════\n', colors.red);
  
  checklist.critical.forEach((item, index) => {
    log(`  ${index + 1}. ${item.title}`, colors.yellow);
    log(`     ${item.description}`, colors.cyan);
    if (item.vars) {
      log(`     Required variables:`, colors.cyan);
      item.vars.forEach(v => log(`       - ${v}`, colors.blue));
    }
    if (item.url) {
      log(`     URL: ${item.url}`, colors.blue);
    }
    if (item.events) {
      log(`     Events: ${item.events.join(', ')}`, colors.blue);
    }
    if (item.verification) {
      log(`     Verify: ${item.verification}`, colors.green);
    }
    if (item.warning) {
      log(`     ⚠️  ${item.warning}`, colors.red);
    }
    if (item.command) {
      log(`     Command: ${item.command}`, colors.magenta);
    }
    log('');
  });

  // Important items
  log('\n🟡 IMPORTANT (Complete This Week):', colors.yellow);
  log('═══════════════════════════════════\n', colors.yellow);
  
  checklist.important.forEach((item, index) => {
    log(`  ${index + 1}. ${item.title}`, colors.yellow);
    log(`     ${item.description}`, colors.cyan);
    if (item.command) {
      log(`     Command: ${item.command}`, colors.magenta);
    }
    if (item.file) {
      const exists = checkFileExists(path.join(__dirname, '..', item.file));
      log(`     File: ${item.file} ${exists ? '✅' : '❌'}`, exists ? colors.green : colors.red);
    }
    if (item.checks) {
      log(`     Checks:`, colors.cyan);
      item.checks.forEach(c => log(`       - ${c}`, colors.blue));
    }
    if (item.steps) {
      log(`     Steps:`, colors.cyan);
      item.steps.forEach(s => log(`       - ${s}`, colors.blue));
    }
    if (item.test) {
      log(`     Test: ${item.test}`, colors.green);
    }
    log('');
  });

  // Recommended items
  log('\n🟢 RECOMMENDED (Before Launch):', colors.green);
  log('═══════════════════════════════════\n', colors.green);
  
  checklist.recommended.forEach((item, index) => {
    log(`  ${index + 1}. ${item.title}`, colors.green);
    log(`     ${item.description}`, colors.cyan);
    if (item.tools) {
      log(`     Tools: ${item.tools.join(', ')}`, colors.blue);
    }
    if (item.tests) {
      log(`     Tests:`, colors.cyan);
      item.tests.forEach(t => log(`       - ${t}`, colors.blue));
    }
    if (item.files) {
      log(`     Files:`, colors.cyan);
      item.files.forEach(f => {
        const exists = checkFileExists(path.join(__dirname, '..', f));
        log(`       - ${f} ${exists ? '✅' : '❌'}`, exists ? colors.green : colors.yellow);
      });
    }
    log('');
  });
}

function provideQuickStart() {
  log('\n🚀 Quick Start Commands:', colors.cyan);
  log('========================\n', colors.cyan);
  
  log('1. Run deployment preparation:', colors.yellow);
  log('   npm run deploy:production', colors.blue);
  log('');
  
  log('2. Set up environment variables:', colors.yellow);
  log('   npm run setup:env', colors.blue);
  log('   Then follow instructions to set in dashboards', colors.cyan);
  log('');
  
  log('3. Verify build readiness:', colors.yellow);
  log('   npm run verify:build', colors.blue);
  log('');
  
  log('4. Build production APK:', colors.yellow);
  log('   eas build --platform android --profile production', colors.blue);
  log('');
  
  log('5. Submit to Play Store:', colors.yellow);
  log('   eas submit --platform android --profile production', colors.blue);
  log('');
}

function checkCriticalFiles() {
  log('\n📁 Critical Files Check:', colors.cyan);
  log('=======================\n', colors.cyan);
  
  const criticalFiles = [
    { path: 'app.config.js', required: true },
    { path: 'eas.json', required: true },
    { path: 'netlify.toml', required: true },
    { path: 'netlify/functions/paystack-webhook.ts', required: true },
    { path: 'google-services.json', required: false },
    { path: 'google-service-account.json', required: false, note: 'Needed for Play Store submission' }
  ];
  
  criticalFiles.forEach(file => {
    const exists = checkFileExists(path.join(__dirname, '..', file.path));
    const status = exists ? '✅' : (file.required ? '❌' : '⚠️');
    const color = exists ? colors.green : (file.required ? colors.red : colors.yellow);
    
    log(`  ${status} ${file.path}`, color);
    if (!exists && file.note) {
      log(`     Note: ${file.note}`, colors.cyan);
    }
  });
}

function main() {
  log('\n📋 LinkApp Final Deployment Checklist', colors.blue);
  log('=====================================\n', colors.blue);
  
  checkCriticalFiles();
  displayChecklist();
  provideQuickStart();
  
  log('\n✅ Checklist complete!', colors.green);
  log('\n💡 Next Steps:', colors.cyan);
  log('   1. Complete all CRITICAL items', colors.yellow);
  log('   2. Complete IMPORTANT items', colors.yellow);
  log('   3. Build and test production APK', colors.yellow);
  log('   4. Submit to Play Store', colors.yellow);
  log('\n');
}

if (require.main === module) {
  main();
}

module.exports = { checklist, checkCriticalFiles };



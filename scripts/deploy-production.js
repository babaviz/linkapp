#!/usr/bin/env node

/**
 * Production Deployment Script for LinkApp
 * 
 * This script automates the deployment process for production:
 * 1. Installs Netlify function dependencies
 * 2. Verifies configuration files
 * 3. Prepares for production build
 * 4. Provides deployment checklist
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function verifyConfig() {
  log('\n🔍 Verifying Configuration Files...', colors.cyan);
  
  const requiredFiles = [
    'app.config.js',
    'eas.json',
    'netlify.toml',
    'netlify/functions/paystack-webhook.ts',
    'netlify/functions/package.json'
  ];

  const missingFiles = [];
  requiredFiles.forEach(file => {
    if (!checkFileExists(file)) {
      missingFiles.push(file);
      log(`  ❌ Missing: ${file}`, colors.red);
    } else {
      log(`  ✅ Found: ${file}`, colors.green);
    }
  });

  if (missingFiles.length > 0) {
    log(`\n⚠️  Missing ${missingFiles.length} required file(s)`, colors.yellow);
    return false;
  }

  log('\n✅ All configuration files found', colors.green);
  return true;
}

function installNetlifyDependencies() {
  log('\n📦 Installing Netlify Function Dependencies...', colors.cyan);
  
  const netlifyFunctionsPath = path.join(__dirname, '..', 'netlify', 'functions');
  
  if (!checkFileExists(netlifyFunctionsPath)) {
    log('  ❌ Netlify functions directory not found', colors.red);
    return false;
  }

  try {
    process.chdir(netlifyFunctionsPath);
    log('  Installing dependencies...', colors.yellow);
    execSync('npm install', { stdio: 'inherit' });
    log('  ✅ Netlify dependencies installed', colors.green);
    process.chdir(path.join(__dirname, '..'));
    return true;
  } catch (error) {
    log(`  ❌ Failed to install dependencies: ${error.message}`, colors.red);
    process.chdir(path.join(__dirname, '..'));
    return false;
  }
}

function checkEnvironmentVariables() {
  log('\n🔐 Checking Environment Variables...', colors.cyan);
  
  log('  ⚠️  Note: Environment variables must be set in dashboards:', colors.yellow);
  log('  - EAS Dashboard: https://expo.dev', colors.blue);
  log('  - Netlify Dashboard: https://app.netlify.com', colors.blue);
  
  log('\n  Required for EAS (Production Profile):', colors.yellow);
  const easVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY',
    'EXPO_PUBLIC_PAYSTACK_SECRET_KEY',
    'EXPO_PUBLIC_APP_URL',
    'EXPO_PUBLIC_STREAM_CHAT_API_KEY',
    'EXPO_PUBLIC_APP_ENV',
    'EXPO_PUBLIC_NOTIFICATIONS_MODE'
  ];
  easVars.forEach(varName => {
    log(`    - ${varName}`, colors.cyan);
  });

  log('\n  Required for Netlify:', colors.yellow);
  const netlifyVars = [
    'PAYSTACK_SECRET_KEY',
    'EXPO_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  netlifyVars.forEach(varName => {
    log(`    - ${varName}`, colors.cyan);
  });

  return true;
}

function generateDeploymentChecklist() {
  log('\n📋 Production Deployment Checklist:', colors.cyan);
  
  const checklist = [
    {
      category: 'Environment Variables',
      items: [
        'Set EAS environment variables in dashboard (production profile)',
        'Set Netlify environment variables in dashboard',
        'Verify all keys are LIVE keys (not test keys)'
      ]
    },
    {
      category: 'Netlify Functions',
      items: [
        'Deploy Netlify functions (git push to main branch)',
        'Verify webhook function is accessible',
        'Test webhook endpoint'
      ]
    },
    {
      category: 'Paystack Configuration',
      items: [
        'Configure webhook URL in Paystack Dashboard',
        'Add webhook URL: https://link-app.co/.netlify/functions/paystack-webhook',
        'Select events: charge.success, charge.failed, subscription.create, subscription.disable',
        'Test webhook with test event'
      ]
    },
    {
      category: 'Production Build',
      items: [
        'Build production APK: eas build --platform android --profile production',
        'Download and test APK on device',
        'Test critical flows: auth, payments, subscriptions'
      ]
    },
    {
      category: 'App Store Preparation',
      items: [
        'Create privacy policy (hosted at accessible URL)',
        'Set up Google Play Console account',
        'Prepare app store assets (icon, screenshots, description)',
        'Submit to Play Store: eas submit --platform android --profile production'
      ]
    }
  ];

  checklist.forEach((section, index) => {
    log(`\n  ${index + 1}. ${section.category}:`, colors.yellow);
    section.items.forEach((item) => {
      log(`     [ ] ${item}`, colors.cyan);
    });
  });
}

function main() {
  log('\n🚀 LinkApp Production Deployment Script', colors.blue);
  log('========================================\n', colors.blue);

  // Step 1: Verify configuration
  if (!verifyConfig()) {
    log('\n❌ Configuration verification failed. Please fix missing files.', colors.red);
    process.exit(1);
  }

  // Step 2: Install Netlify dependencies
  if (!installNetlifyDependencies()) {
    log('\n⚠️  Netlify dependency installation failed. Continue anyway?', colors.yellow);
  }

  // Step 3: Check environment variables
  checkEnvironmentVariables();

  // Step 4: Generate checklist
  generateDeploymentChecklist();

  log('\n\n✅ Deployment preparation complete!', colors.green);
  log('\n📝 Next Steps:', colors.cyan);
  log('  1. Set environment variables in EAS and Netlify dashboards', colors.yellow);
  log('  2. Deploy Netlify functions: git push origin main', colors.yellow);
  log('  3. Configure Paystack webhook', colors.yellow);
  log('  4. Build production APK: eas build --platform android --profile production', colors.yellow);
  
  log('\n💡 For detailed instructions, see: docs/DEPLOYMENT_REMAINING_TASKS.md', colors.blue);
  log('\n');
}

if (require.main === module) {
  main();
}

module.exports = { verifyConfig, installNetlifyDependencies };


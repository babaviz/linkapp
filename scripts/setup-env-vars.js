#!/usr/bin/env node

/**
 * Environment Variables Setup Guide
 * 
 * This script generates a template for environment variables
 * and provides instructions for setting them up in EAS and Netlify dashboards.
 */

const fs = require('fs');
const path = require('path');

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

const easEnvVars = {
  'EXPO_PUBLIC_SUPABASE_URL': 'Your Supabase project URL (https://xxx.supabase.co)',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY': 'Your Supabase anonymous key',
  'EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY': 'Paystack LIVE public key (pk_live_...)',
  'EXPO_PUBLIC_PAYSTACK_SECRET_KEY': 'Paystack LIVE secret key (sk_live_...)',
  'EXPO_PUBLIC_APP_URL': 'https://link-app.co',
  'EXPO_PUBLIC_STREAM_CHAT_API_KEY': 'Stream Chat API key',
  'EXPO_PUBLIC_APP_ENV': 'production',
  'EXPO_PUBLIC_NOTIFICATIONS_MODE': 'firebase',
  'EXPO_PUBLIC_FIREBASE_API_KEY': 'Firebase API key (if using Firebase)',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN': 'Firebase auth domain',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID': 'Firebase project ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET': 'Firebase storage bucket',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': 'Firebase messaging sender ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID': 'Firebase app ID',
  'EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID': 'Firebase measurement ID'
};

const netlifyEnvVars = {
  'PAYSTACK_SECRET_KEY': 'Paystack LIVE secret key (sk_live_...)',
  'EXPO_PUBLIC_SUPABASE_URL': 'Your Supabase project URL',
  'SUPABASE_SERVICE_ROLE_KEY': 'Supabase service role key (NOT anon key)'
};

function generateEASInstructions() {
  log('\n📝 EAS Environment Variables Setup', colors.cyan);
  log('====================================\n', colors.cyan);
  
  log('1. Go to: https://expo.dev', colors.blue);
  log('2. Select your project: LinkApp', colors.blue);
  log('3. Navigate to: Settings → Environment Variables', colors.blue);
  log('4. Select profile: production', colors.blue);
  log('5. Add the following variables:\n', colors.blue);

  Object.entries(easEnvVars).forEach(([key, description]) => {
    log(`   ${key}`, colors.yellow);
    log(`     Description: ${description}`, colors.cyan);
    log('');
  });
}

function generateNetlifyInstructions() {
  log('\n📝 Netlify Environment Variables Setup', colors.cyan);
  log('=======================================\n', colors.cyan);
  
  log('1. Go to: https://app.netlify.com', colors.blue);
  log('2. Select your site: link-app.co', colors.blue);
  log('3. Navigate to: Site Settings → Environment Variables', colors.blue);
  log('4. Add the following variables:\n', colors.blue);

  Object.entries(netlifyEnvVars).forEach(([key, description]) => {
    log(`   ${key}`, colors.yellow);
    log(`     Description: ${description}`, colors.cyan);
    log('');
  });

  log('\n⚠️  Important Notes:', colors.yellow);
  log('   - After adding variables, redeploy functions', colors.cyan);
  log('   - Use LIVE keys, not test keys', colors.cyan);
  log('   - SUPABASE_SERVICE_ROLE_KEY is different from anon key', colors.cyan);
}

function generateTemplateFile() {
  const templatePath = path.join(__dirname, '..', '.env.production.template');
  
  const template = `# Production Environment Variables Template
# DO NOT COMMIT THIS FILE WITH REAL VALUES!
# Copy this file and fill in your actual values
# Then set them in EAS and Netlify dashboards

# ============================================
# EAS Environment Variables (Production Profile)
# ============================================
# Set these in: https://expo.dev → Your Project → Environment Variables → production

# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Paystack (LIVE keys only!)
EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_your_key_here
EXPO_PUBLIC_PAYSTACK_SECRET_KEY=sk_live_your_key_here
EXPO_PUBLIC_APP_URL=https://link-app.co

# Stream Chat
EXPO_PUBLIC_STREAM_CHAT_API_KEY=your_stream_chat_key

# App Configuration
EXPO_PUBLIC_APP_ENV=production
EXPO_PUBLIC_NOTIFICATIONS_MODE=firebase

# Firebase (if using)
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id

# ============================================
# Netlify Environment Variables
# ============================================
# Set these in: https://app.netlify.com → Site Settings → Environment Variables

PAYSTACK_SECRET_KEY=sk_live_your_key_here
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ============================================
# Important Notes
# ============================================
# 1. Use LIVE keys only (not test keys)
# 2. SUPABASE_SERVICE_ROLE_KEY is different from anon key
# 3. After setting variables, redeploy functions
# 4. Never commit real values to git
`;

  fs.writeFileSync(templatePath, template, 'utf8');
  log(`\n✅ Template file created: .env.production.template`, colors.green);
  log('   (This file is gitignored for security)', colors.cyan);
}

function main() {
  log('\n🔐 Environment Variables Setup Guide', colors.blue);
  log('=====================================\n', colors.blue);

  generateEASInstructions();
  generateNetlifyInstructions();
  generateTemplateFile();

  log('\n✅ Setup instructions generated!', colors.green);
  log('\n💡 Next Steps:', colors.cyan);
  log('  1. Review the template file: .env.production.template', colors.yellow);
  log('  2. Set variables in EAS Dashboard (production profile)', colors.yellow);
  log('  3. Set variables in Netlify Dashboard', colors.yellow);
  log('  4. Redeploy Netlify functions after setting variables', colors.yellow);
  log('\n');
}

if (require.main === module) {
  main();
}

module.exports = { easEnvVars, netlifyEnvVars };


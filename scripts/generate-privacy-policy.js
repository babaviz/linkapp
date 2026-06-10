#!/usr/bin/env node

/**
 * Privacy Policy Template Generator
 * 
 * Generates a privacy policy template that can be customized
 * and hosted for app store requirements.
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

const privacyPolicyTemplate = `# Privacy Policy for LinkApp

**Last Updated:** [DATE]

## Introduction

LinkApp ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application (the "App").

## Information We Collect

### Personal Information
We may collect personal information that you voluntarily provide to us when you:
- Register for an account
- Use our services (property listings, job postings, services directory, Date Mi)
- Make payments through Paystack
- Contact us for support

This information may include:
- Name
- Email address
- Phone number
- Profile information
- Payment information (processed securely through Paystack)
- Location data (with your permission)

### Automatically Collected Information
We may automatically collect certain information about your device, including:
- Device information (model, operating system, unique device identifiers)
- Usage data (features used, time spent in app)
- Location data (when you enable location services)
- Analytics data (app crashes, performance metrics)

## How We Use Your Information

We use the information we collect to:
- Provide and maintain our services
- Process payments and subscriptions
- Send you notifications (with your consent)
- Improve our app and user experience
- Provide customer support
- Send you marketing communications (with your consent)
- Comply with legal obligations

## Third-Party Services

We use the following third-party services that may collect information:

### Supabase
- **Purpose:** Database and authentication
- **Data:** User accounts, app data
- **Privacy Policy:** https://supabase.com/privacy

### Paystack
- **Purpose:** Payment processing
- **Data:** Payment information (processed securely)
- **Privacy Policy:** https://paystack.com/terms/privacy

### Stream Chat
- **Purpose:** Chat and video calling functionality
- **Data:** Messages, call data
- **Privacy Policy:** https://getstream.io/legal/privacy/

### Firebase (Google)
- **Purpose:** Analytics, push notifications, crash reporting
- **Data:** App usage, device information
- **Privacy Policy:** https://policies.google.com/privacy

## Data Storage and Security

- Your data is stored securely using Supabase
- We use industry-standard security measures to protect your information
- Payment information is processed securely through Paystack and is not stored on our servers
- We retain your information only as long as necessary to provide our services

## Your Rights

Depending on your location, you may have the following rights:
- Access your personal data
- Correct inaccurate data
- Delete your data
- Object to processing of your data
- Data portability
- Withdraw consent

To exercise these rights, contact us at: [YOUR_EMAIL]

## Children's Privacy

Our App is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.

## Contact Us

If you have questions about this Privacy Policy, please contact us at:
- Email: [YOUR_EMAIL]
- Address: [YOUR_ADDRESS]

---

**Note:** This is a template. Please review and customize it with your specific details before publishing.
`;

function generatePrivacyPolicy() {
  const outputPath = path.join(__dirname, '..', 'docs', 'PRIVACY_POLICY.md');
  const outputDir = path.dirname(outputPath);
  
  // Ensure docs directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, privacyPolicyTemplate, 'utf8');
  log(`\n✅ Privacy policy template created: ${outputPath}`, colors.green);
}

function provideHostingInstructions() {
  log('\n📝 Privacy Policy Hosting Instructions:', colors.cyan);
  log('========================================\n', colors.cyan);
  
  log('You need to host your privacy policy at a publicly accessible URL.', colors.yellow);
  log('Here are some options:\n', colors.yellow);
  
  log('Option 1: GitHub Pages (Free)', colors.green);
  log('  1. Create a repository (e.g., linkapp-privacy)', colors.blue);
  log('  2. Add PRIVACY_POLICY.md to the repository', colors.blue);
  log('  3. Enable GitHub Pages in repository settings', colors.blue);
  log('  4. Your URL will be: https://[username].github.io/linkapp-privacy/', colors.blue);
  log('');
  
  log('Option 2: Netlify (Free)', colors.green);
  log('  1. Create a new site on Netlify', colors.blue);
  log('  2. Deploy PRIVACY_POLICY.md as an HTML page', colors.blue);
  log('  3. Use your domain: https://link-app.co/privacy', colors.blue);
  log('');
  
  log('Option 3: Simple HTML Page', colors.green);
  log('  1. Convert markdown to HTML', colors.blue);
  log('  2. Host on any web server', colors.blue);
  log('  3. Add link in app and app store listing', colors.blue);
  log('');
  
  log('⚠️  Important:', colors.yellow);
  log('  - Privacy policy URL is REQUIRED by app stores', colors.red);
  log('  - Update the template with your actual information', colors.yellow);
  log('  - Review with legal counsel if needed', colors.yellow);
  log('');
}

function provideAppStoreIntegration() {
  log('\n📱 App Store Integration:', colors.cyan);
  log('========================\n', colors.cyan);
  
  log('Google Play Store:', colors.yellow);
  log('  1. Go to Play Console → App Content → Privacy Policy', colors.blue);
  log('  2. Enter your privacy policy URL', colors.blue);
  log('  3. This is REQUIRED for app submission', colors.red);
  log('');
  
  log('Apple App Store (if applicable):', colors.yellow);
  log('  1. Go to App Store Connect → App Information', colors.blue);
  log('  2. Add privacy policy URL', colors.blue);
  log('  3. Also required for submission', colors.red);
  log('');
  
  log('In-App:', colors.yellow);
  log('  - Add link to privacy policy in Settings screen', colors.blue);
  log('  - Show privacy policy during registration (if required)', colors.blue);
  log('');
}

function main() {
  log('\n📄 Privacy Policy Generator', colors.blue);
  log('===========================\n', colors.blue);
  
  generatePrivacyPolicy();
  provideHostingInstructions();
  provideAppStoreIntegration();
  
  log('\n✅ Privacy policy template generated!', colors.green);
  log('\n💡 Next Steps:', colors.cyan);
  log('  1. Review and customize the template', colors.yellow);
  log('  2. Replace [YOUR_EMAIL] and [YOUR_ADDRESS]', colors.yellow);
  log('  3. Add any specific data collection details', colors.yellow);
  log('  4. Host at a publicly accessible URL', colors.yellow);
  log('  5. Add URL to app store listings', colors.yellow);
  log('\n');
}

if (require.main === module) {
  main();
}

module.exports = { generatePrivacyPolicy, privacyPolicyTemplate };



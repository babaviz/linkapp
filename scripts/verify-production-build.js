#!/usr/bin/env node

/**
 * Production Build Verification Script
 * 
 * This script verifies that the app is ready for production build:
 * 1. Checks configuration files
 * 2. Verifies build profiles
 * 3. Checks for common issues
 * 4. Provides build commands
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

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

function verifyEASConfig() {
  log('\n🔍 Verifying EAS Configuration...', colors.cyan);
  
  const easPath = path.join(__dirname, '..', 'eas.json');
  if (!checkFileExists(easPath)) {
    log('  ❌ eas.json not found', colors.red);
    return false;
  }

  const easConfig = readJsonFile(easPath);
  if (!easConfig) {
    log('  ❌ Failed to parse eas.json', colors.red);
    return false;
  }

  // Check production profile
  if (!easConfig.build?.production) {
    log('  ❌ Production profile not found in eas.json', colors.red);
    return false;
  }

  const prodProfile = easConfig.build.production;
  
  // Verify production environment
  if (prodProfile.env?.EXPO_PUBLIC_APP_ENV !== 'production') {
    log('  ⚠️  EXPO_PUBLIC_APP_ENV should be "production"', colors.yellow);
  } else {
    log('  ✅ Production environment configured', colors.green);
  }

  // Verify notifications mode
  if (prodProfile.env?.EXPO_PUBLIC_NOTIFICATIONS_MODE !== 'firebase') {
    log('  ⚠️  EXPO_PUBLIC_NOTIFICATIONS_MODE should be "firebase" for production', colors.yellow);
  } else {
    log('  ✅ Notifications mode configured', colors.green);
  }

  // Verify Android build type
  if (prodProfile.android?.buildType !== 'app-bundle') {
    log('  ⚠️  Android build type should be "app-bundle" for Play Store', colors.yellow);
  } else {
    log('  ✅ Android build type configured', colors.green);
  }

  // Verify auto increment
  if (!prodProfile.autoIncrement) {
    log('  ⚠️  Auto increment not enabled (recommended)', colors.yellow);
  } else {
    log('  ✅ Auto increment enabled', colors.green);
  }

  return true;
}

function verifyAppConfig() {
  log('\n🔍 Verifying App Configuration...', colors.cyan);
  
  const appConfigPath = path.join(__dirname, '..', 'app.config.js');
  if (!checkFileExists(appConfigPath)) {
    log('  ❌ app.config.js not found', colors.red);
    return false;
  }

  const configContent = fs.readFileSync(appConfigPath, 'utf8');
  
  // Check for required fields
  const checks = [
    { name: 'App name', pattern: /name:\s*["']LinkApp["']/ },
    { name: 'Package name', pattern: /package:\s*["']com\.linkapp\.mobile["']/ },
    { name: 'Version', pattern: /version:\s*["']\d+\.\d+\.\d+["']/ },
    { name: 'EAS project ID', pattern: /projectId:\s*["'][\w-]+["']/ }
  ];

  let allPassed = true;
  checks.forEach(check => {
    if (configContent.match(check.pattern)) {
      log(`  ✅ ${check.name} configured`, colors.green);
    } else {
      log(`  ⚠️  ${check.name} may be missing or incorrect`, colors.yellow);
      allPassed = false;
    }
  });

  return allPassed;
}

function checkRequiredAssets() {
  log('\n🔍 Checking Required Assets...', colors.cyan);
  
  const assetsPath = path.join(__dirname, '..', 'assets');
  const requiredAssets = [
    'icon.png',
    'splash.png',
    'adaptive-icon.png'
  ];

  let allFound = true;
  requiredAssets.forEach(asset => {
    const assetPath = path.join(assetsPath, asset);
    if (checkFileExists(assetPath)) {
      log(`  ✅ ${asset} found`, colors.green);
    } else {
      log(`  ❌ ${asset} missing`, colors.red);
      allFound = false;
    }
  });

  return allFound;
}

function checkGoogleServices() {
  log('\n🔍 Checking Google Services...', colors.cyan);
  
  const googleServicesPath = path.join(__dirname, '..', 'google-services.json');
  if (checkFileExists(googleServicesPath)) {
    log('  ✅ google-services.json found', colors.green);
    return true;
  } else {
    log('  ⚠️  google-services.json not found (required for Firebase)', colors.yellow);
    return false;
  }
}

function provideBuildCommands() {
  log('\n🚀 Production Build Commands:', colors.cyan);
  log('================================\n', colors.cyan);
  
  log('1. Build Production APK (for testing):', colors.yellow);
  log('   eas build --platform android --profile production --type apk', colors.blue);
  log('');
  
  log('2. Build Production AAB (for Play Store):', colors.yellow);
  log('   eas build --platform android --profile production', colors.blue);
  log('');
  
  log('3. Submit to Play Store:', colors.yellow);
  log('   eas submit --platform android --profile production', colors.blue);
  log('');
  
  log('4. Check build status:', colors.yellow);
  log('   eas build:list', colors.blue);
  log('');
  
  log('5. View build logs:', colors.yellow);
  log('   eas build:view [BUILD_ID]', colors.blue);
  log('');
}

function providePreBuildChecklist() {
  log('\n📋 Pre-Build Checklist:', colors.cyan);
  log('=======================\n', colors.cyan);
  
  const checklist = [
    'Environment variables set in EAS Dashboard (production profile)',
    'Netlify functions deployed and tested',
    'Paystack webhook configured',
    'All LIVE keys configured (not test keys)',
    'Privacy policy created and hosted',
    'App version updated in app.config.js',
    'Google Play Console account created',
    'Service account key downloaded (google-service-account.json)'
  ];

  checklist.forEach((item, index) => {
    log(`  [ ] ${index + 1}. ${item}`, colors.cyan);
  });
}

function main() {
  log('\n🔍 Production Build Verification', colors.blue);
  log('=================================\n', colors.blue);

  let allChecksPassed = true;

  // Verify EAS config
  if (!verifyEASConfig()) {
    allChecksPassed = false;
  }

  // Verify app config
  if (!verifyAppConfig()) {
    allChecksPassed = false;
  }

  // Check assets
  if (!checkRequiredAssets()) {
    allChecksPassed = false;
  }

  // Check Google services
  checkGoogleServices();

  // Provide build commands
  provideBuildCommands();

  // Provide checklist
  providePreBuildChecklist();

  log('\n');
  if (allChecksPassed) {
    log('✅ All critical checks passed!', colors.green);
    log('Ready to build production APK/AAB', colors.green);
  } else {
    log('⚠️  Some checks failed. Please fix issues before building.', colors.yellow);
  }
  log('\n');
}

if (require.main === module) {
  main();
}

module.exports = { verifyEASConfig, verifyAppConfig };


#!/usr/bin/env node

/**
 * Production Build Validation Script
 * 
 * This script validates that the build is safe for production by checking:
 * 1. APP_ENV is set to 'production'
 * 2. No demo data imports in production code paths
 * 3. All required production environment variables are set
 * 4. No test/demo values in production configs
 * 
 * Run this before creating production builds to catch issues early.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

let hasErrors = false;
let hasWarnings = false;

// Check 1: Validate APP_ENV is set to production
function checkAppEnv() {
  logInfo('Checking APP_ENV setting...');
  
  const appEnv = process.env.EXPO_PUBLIC_APP_ENV;
  
  if (!appEnv) {
    logError('EXPO_PUBLIC_APP_ENV is not set');
    hasErrors = true;
    return false;
  }
  
  if (appEnv !== 'production') {
    logError(`APP_ENV is set to "${appEnv}" but should be "production" for production builds`);
    hasErrors = true;
    return false;
  }
  
  logSuccess('APP_ENV is correctly set to "production"');
  return true;
}

// Check 2: Validate required environment variables
function checkRequiredEnvVars() {
  logInfo('Checking required environment variables...');
  
  const requiredVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY',
    'EXPO_PUBLIC_PAYSTACK_SECRET_KEY',
    'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  ];
  
  let allPresent = true;
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    
    if (!value || value.trim() === '') {
      logError(`Required environment variable ${varName} is not set`);
      hasErrors = true;
      allPresent = false;
      continue;
    }
    
    // Check for demo/test values
    const lowerValue = value.toLowerCase();
    if (lowerValue.includes('demo') || 
        lowerValue.includes('test') || 
        lowerValue.includes('placeholder') ||
        lowerValue.includes('your_')) {
      logError(`${varName} contains demo/test value - this is not safe for production`);
      hasErrors = true;
      allPresent = false;
      continue;
    }
    
    logSuccess(`${varName} is set and valid`);
  }
  
  return allPresent;
}

// Check 3: Scan for demo data imports in critical files
function checkDemoDataImports() {
  logInfo('Scanning for demo data imports in production code...');
  
  const criticalFiles = [
    'navigation/RootNavigator.tsx',
    'App.tsx',
  ];
  
  let foundIssues = false;
  
  for (const filePath of criticalFiles) {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      logWarning(`File ${filePath} not found, skipping...`);
      hasWarnings = true;
      continue;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Check for demo data imports
    const demoImportPattern = /import.*from\s+['"].*demo/gi;
    const matches = content.match(demoImportPattern);
    
    if (matches) {
      // Check if imports are guarded by environment checks
      const hasEnvGuard = content.includes('ENV.APP_ENV !== \'production\'') ||
                          content.includes('ENV.APP_ENV === \'production\'');
      
      if (!hasEnvGuard) {
        logError(`${filePath} imports demo data without production guards`);
        logError(`  Found: ${matches.join(', ')}`);
        hasErrors = true;
        foundIssues = true;
      } else {
        logSuccess(`${filePath} has demo imports but they are properly guarded`);
      }
    }
  }
  
  if (!foundIssues) {
    logSuccess('No unguarded demo data imports found');
  }
  
  return !foundIssues;
}

// Check 4: Verify production guards in demo data files
function checkDemoDataGuards() {
  logInfo('Verifying production guards in demo data files...');
  
  const demoDataFiles = [
    'data/index.ts',
    'utils/demoDataLoader.ts',
  ];
  
  let allGuarded = true;
  
  for (const filePath of demoDataFiles) {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      logWarning(`Demo data file ${filePath} not found, skipping...`);
      hasWarnings = true;
      continue;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Check for production guard
    const hasProductionGuard = content.includes('ENV.APP_ENV === \'production\'') &&
                                content.includes('throw new Error');
    
    if (!hasProductionGuard) {
      logWarning(`${filePath} is missing production guard - demo data could leak to production`);
      hasWarnings = true;
      allGuarded = false;
    } else {
      logSuccess(`${filePath} has production guard`);
    }
  }
  
  return allGuarded;
}

// Check 5: Verify eas.json production config
function checkEasConfig() {
  logInfo('Checking eas.json production configuration...');
  
  const easConfigPath = path.join(process.cwd(), 'eas.json');
  
  if (!fs.existsSync(easConfigPath)) {
    logError('eas.json not found');
    hasErrors = true;
    return false;
  }
  
  try {
    const easConfig = JSON.parse(fs.readFileSync(easConfigPath, 'utf8'));
    const productionBuild = easConfig.build?.production;
    
    if (!productionBuild) {
      logError('Production build configuration not found in eas.json');
      hasErrors = true;
      return false;
    }
    
    // Check that production env is set
    if (productionBuild.env?.EXPO_PUBLIC_APP_ENV !== 'production') {
      logError('eas.json production build does not set EXPO_PUBLIC_APP_ENV to "production"');
      hasErrors = true;
      return false;
    }
    
    // Check that Android builds as app-bundle
    if (productionBuild.android?.buildType !== 'app-bundle') {
      logWarning('Android production build type is not "app-bundle" (AAB format)');
      hasWarnings = true;
    }
    
    logSuccess('eas.json production configuration is correct');
    return true;
  } catch (error) {
    logError(`Error reading eas.json: ${error.message}`);
    hasErrors = true;
    return false;
  }
}

// Main validation function
function runValidation() {
  log('\n═══════════════════════════════════════════════════', 'magenta');
  log('   Production Build Validation', 'magenta');
  log('═══════════════════════════════════════════════════\n', 'magenta');
  
  checkAppEnv();
  console.log();
  
  checkRequiredEnvVars();
  console.log();
  
  checkDemoDataImports();
  console.log();
  
  checkDemoDataGuards();
  console.log();
  
  checkEasConfig();
  console.log();
  
  // Summary
  log('═══════════════════════════════════════════════════', 'magenta');
  
  if (hasErrors) {
    logError('\n❌ VALIDATION FAILED - Production build is NOT safe');
    logError('Please fix the errors above before creating a production build\n');
    process.exit(1);
  } else if (hasWarnings) {
    logWarning('\n⚠️  VALIDATION PASSED with warnings');
    logWarning('Please review the warnings above\n');
    process.exit(0);
  } else {
    logSuccess('\n✅ VALIDATION PASSED - Production build is safe');
    logSuccess('You can proceed with the production build\n');
    process.exit(0);
  }
}

// Run validation
runValidation();


#!/usr/bin/env tsx
/**
 * Production Readiness Verification Script
 * 
 * This script performs comprehensive checks to ensure the codebase is ready
 * for production deployment. It verifies:
 * - Environment configurations
 * - Netlify functions setup
 * - API endpoints and integrations
 * - Dependencies and build configuration
 * - Code quality and errors
 */

import * as fs from 'fs';
import * as path from 'path';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string[];
}

const results: CheckResult[] = [];

function addResult(name: string, status: 'pass' | 'fail' | 'warning', message: string, details?: string[]) {
  results.push({ name, status, message, details });
}

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check 1: Verify critical files exist
function checkCriticalFiles() {
  log('\n📁 Checking critical files...', 'blue');
  
  const criticalFiles = [
    'app.config.js',
    'eas.json',
    'package.json',
    'netlify.toml',
    'netlify/functions/paystack-webhook.ts',
    'netlify/functions/package.json',
    'config/environment.ts',
    'services/supabaseClient.ts',
    'App.tsx',
  ];

  const missing: string[] = [];
  criticalFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      missing.push(file);
    }
  });

  if (missing.length === 0) {
    addResult('Critical Files', 'pass', 'All critical files exist');
  } else {
    addResult('Critical Files', 'fail', `Missing files: ${missing.join(', ')}`);
  }
}

// Check 2: Verify environment configuration
function checkEnvironmentConfig() {
  log('\n⚙️  Checking environment configuration...', 'blue');
  
  const appConfigPath = path.join(process.cwd(), 'app.config.js');
  const envConfigPath = path.join(process.cwd(), 'config/environment.ts');
  
  if (!fs.existsSync(appConfigPath)) {
    addResult('Environment Config', 'fail', 'app.config.js not found');
    return;
  }

  const appConfig = fs.readFileSync(appConfigPath, 'utf-8');
  const envConfig = fs.existsSync(envConfigPath) 
    ? fs.readFileSync(envConfigPath, 'utf-8')
    : '';

  const requiredEnvVars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY',
    'EXPO_PUBLIC_PAYSTACK_SECRET_KEY',
    'EXPO_PUBLIC_STREAM_CHAT_API_KEY',
    'EXPO_PUBLIC_APP_URL',
    'EXPO_PUBLIC_APP_ENV',
  ];

  const missingInAppConfig: string[] = [];
  requiredEnvVars.forEach(varName => {
    if (!appConfig.includes(varName)) {
      missingInAppConfig.push(varName);
    }
  });

  if (missingInAppConfig.length === 0) {
    addResult('Environment Config', 'pass', 'All required environment variables configured in app.config.js');
  } else {
    addResult('Environment Config', 'warning', `Some env vars not in app.config.js: ${missingInAppConfig.join(', ')} (may be set in EAS dashboard)`);
  }
}

// Check 3: Verify Netlify function setup
function checkNetlifyFunctions() {
  log('\n🌐 Checking Netlify functions...', 'blue');
  
  const netlifyTomlPath = path.join(process.cwd(), 'netlify.toml');
  const webhookPath = path.join(process.cwd(), 'netlify/functions/paystack-webhook.ts');
  const functionPackageJsonPath = path.join(process.cwd(), 'netlify/functions/package.json');

  if (!fs.existsSync(netlifyTomlPath)) {
    addResult('Netlify Functions', 'fail', 'netlify.toml not found');
    return;
  }

  if (!fs.existsSync(webhookPath)) {
    addResult('Netlify Functions', 'fail', 'Paystack webhook function not found');
    return;
  }

  if (!fs.existsSync(functionPackageJsonPath)) {
    addResult('Netlify Functions', 'fail', 'Netlify functions package.json not found');
    return;
  }

  const netlifyToml = fs.readFileSync(netlifyTomlPath, 'utf-8');
  const webhookCode = fs.readFileSync(webhookPath, 'utf-8');
  const functionPackageJson = JSON.parse(fs.readFileSync(functionPackageJsonPath, 'utf-8'));

  const checks: string[] = [];
  
  // Check netlify.toml configuration
  if (!netlifyToml.includes('functions = "netlify/functions"')) {
    checks.push('Functions directory not configured in netlify.toml');
  }

  // Check webhook function has required dependencies
  const requiredDeps = ['@netlify/functions', '@supabase/supabase-js'];
  const missingDeps = requiredDeps.filter(dep => !functionPackageJson.dependencies?.[dep]);
  
  if (missingDeps.length > 0) {
    checks.push(`Missing dependencies: ${missingDeps.join(', ')}`);
  }

  // Check webhook function has signature verification
  if (!webhookCode.includes('verifyPaystackSignature')) {
    checks.push('Webhook function missing signature verification');
  }

  // Check webhook function uses environment variables
  if (!webhookCode.includes('process.env.PAYSTACK_SECRET_KEY') && 
      !webhookCode.includes('process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY')) {
    checks.push('Webhook function not using PAYSTACK_SECRET_KEY from environment');
  }

  if (checks.length === 0) {
    addResult('Netlify Functions', 'pass', 'Netlify functions properly configured');
  } else {
    addResult('Netlify Functions', 'warning', 'Netlify functions need attention', checks);
  }
}

// Check 4: Verify EAS build configuration
function checkEASConfig() {
  log('\n📦 Checking EAS build configuration...', 'blue');
  
  const easJsonPath = path.join(process.cwd(), 'eas.json');
  
  if (!fs.existsSync(easJsonPath)) {
    addResult('EAS Config', 'fail', 'eas.json not found');
    return;
  }

  const easConfig = JSON.parse(fs.readFileSync(easJsonPath, 'utf-8'));
  const checks: string[] = [];

  // Check production profile exists
  if (!easConfig.build?.production) {
    checks.push('Production build profile not found');
  } else {
    const prodProfile = easConfig.build.production;
    
    // Check production environment variables
    if (prodProfile.env?.EXPO_PUBLIC_APP_ENV !== 'production') {
      checks.push('Production profile should set EXPO_PUBLIC_APP_ENV=production');
    }

    if (prodProfile.env?.EXPO_PUBLIC_NOTIFICATIONS_MODE !== 'firebase') {
      checks.push('Production profile should set EXPO_PUBLIC_NOTIFICATIONS_MODE=firebase');
    }

    // Check Android build type
    if (prodProfile.android?.buildType !== 'app-bundle') {
      checks.push('Production Android build should use app-bundle (for Play Store)');
    }
  }

  if (checks.length === 0) {
    addResult('EAS Config', 'pass', 'EAS build configuration is correct');
  } else {
    addResult('EAS Config', 'warning', 'EAS configuration needs attention', checks);
  }
}

// Check 5: Verify dependencies
function checkDependencies() {
  log('\n📚 Checking dependencies...', 'blue');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    addResult('Dependencies', 'fail', 'package.json not found');
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const checks: string[] = [];

  // Check critical dependencies
  const criticalDeps = [
    '@supabase/supabase-js',
    'expo',
    'react-native',
    'react',
    '@react-navigation/native',
    'stream-chat-react-native',
  ];

  const missingDeps = criticalDeps.filter(dep => 
    !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
  );

  if (missingDeps.length > 0) {
    checks.push(`Missing critical dependencies: ${missingDeps.join(', ')}`);
  }

  // Check for dev dependencies in production dependencies
  const devOnlyDeps = ['jest', '@types/', 'eslint', 'typescript'];
  const devDepsInProd = Object.keys(packageJson.dependencies || {}).filter(dep =>
    devOnlyDeps.some(devDep => dep.includes(devDep))
  );

  if (devDepsInProd.length > 0) {
    checks.push(`Dev dependencies in production: ${devDepsInProd.join(', ')}`);
  }

  if (checks.length === 0) {
    addResult('Dependencies', 'pass', 'All critical dependencies present');
  } else {
    addResult('Dependencies', 'warning', 'Dependency issues found', checks);
  }
}

// Check 6: Verify API endpoints configuration
function checkAPIEndpoints() {
  log('\n🔌 Checking API endpoints...', 'blue');
  
  const envConfigPath = path.join(process.cwd(), 'config/environment.ts');
  
  if (!fs.existsSync(envConfigPath)) {
    addResult('API Endpoints', 'fail', 'config/environment.ts not found');
    return;
  }

  const envConfig = fs.readFileSync(envConfigPath, 'utf-8');
  const checks: string[] = [];

  // Check for API endpoint configurations
  if (!envConfig.includes('SUPABASE_URL')) {
    checks.push('Supabase URL not configured');
  }

  if (!envConfig.includes('APP_URL')) {
    checks.push('App URL not configured');
  }

  // Check for Paystack configuration
  if (!envConfig.includes('PAYSTACK')) {
    checks.push('Paystack configuration missing');
  }

  if (checks.length === 0) {
    addResult('API Endpoints', 'pass', 'API endpoints properly configured');
  } else {
    addResult('API Endpoints', 'warning', 'API endpoint issues', checks);
  }
}

// Check 7: Verify Supabase client configuration
function checkSupabaseClient() {
  log('\n🗄️  Checking Supabase client...', 'blue');
  
  const supabaseClientPath = path.join(process.cwd(), 'services/supabaseClient.ts');
  
  if (!fs.existsSync(supabaseClientPath)) {
    addResult('Supabase Client', 'fail', 'Supabase client file not found');
    return;
  }

  const supabaseClient = fs.readFileSync(supabaseClientPath, 'utf-8');
  const checks: string[] = [];

  // Check for proper initialization
  if (!supabaseClient.includes('createClient')) {
    checks.push('Supabase client not properly initialized');
  }

  // Check for environment variable usage
  if (!supabaseClient.includes('EXPO_PUBLIC_SUPABASE_URL')) {
    checks.push('Supabase URL not using environment variable');
  }

  // Check for validation
  if (!supabaseClient.includes('validateSupabaseCredentials')) {
    checks.push('Missing Supabase credentials validation');
  }

  if (checks.length === 0) {
    addResult('Supabase Client', 'pass', 'Supabase client properly configured');
  } else {
    addResult('Supabase Client', 'warning', 'Supabase client issues', checks);
  }
}

// Check 8: Verify app entry point
function checkAppEntryPoint() {
  log('\n🚀 Checking app entry point...', 'blue');
  
  const appTsxPath = path.join(process.cwd(), 'App.tsx');
  
  if (!fs.existsSync(appTsxPath)) {
    addResult('App Entry Point', 'fail', 'App.tsx not found');
    return;
  }

  const appTsx = fs.readFileSync(appTsxPath, 'utf-8');
  const checks: string[] = [];

  // Check for critical providers
  if (!appTsx.includes('Provider') && !appTsx.includes('react-redux')) {
    checks.push('Redux Provider not found');
  }

  if (!appTsx.includes('SafeAreaProvider')) {
    checks.push('SafeAreaProvider not found');
  }

  if (!appTsx.includes('RootNavigator')) {
    checks.push('RootNavigator not found');
  }

  // Check for polyfills
  if (!appTsx.includes('polyfills')) {
    checks.push('Polyfills not imported');
  }

  if (checks.length === 0) {
    addResult('App Entry Point', 'pass', 'App entry point properly configured');
  } else {
    addResult('App Entry Point', 'warning', 'App entry point issues', checks);
  }
}

// Check 9: Verify production optimizations
function checkProductionOptimizations() {
  log('\n⚡ Checking production optimizations...', 'blue');
  
  const appConfigPath = path.join(process.cwd(), 'app.config.js');
  
  if (!fs.existsSync(appConfigPath)) {
    addResult('Production Optimizations', 'fail', 'app.config.js not found');
    return;
  }

  const appConfig = fs.readFileSync(appConfigPath, 'utf-8');
  const checks: string[] = [];

  // Check for Hermes engine
  if (!appConfig.includes('jsEngine') && !appConfig.includes('hermes')) {
    checks.push('Hermes engine not explicitly configured (recommended for production)');
  }

  // Check for updates configuration
  if (!appConfig.includes('updates')) {
    checks.push('Expo updates not configured');
  }

  if (checks.length === 0) {
    addResult('Production Optimizations', 'pass', 'Production optimizations configured');
  } else {
    addResult('Production Optimizations', 'warning', 'Production optimization issues', checks);
  }
}

// Main execution
async function main() {
  log('\n🔍 Starting Production Readiness Verification...\n', 'blue');
  log('='.repeat(60), 'blue');

  // Run all checks
  checkCriticalFiles();
  checkEnvironmentConfig();
  checkNetlifyFunctions();
  checkEASConfig();
  checkDependencies();
  checkAPIEndpoints();
  checkSupabaseClient();
  checkAppEntryPoint();
  checkProductionOptimizations();

  // Print results
  log('\n📊 Verification Results:\n', 'blue');
  log('='.repeat(60), 'blue');

  let passCount = 0;
  let failCount = 0;
  let warningCount = 0;

  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    const statusColor = result.status === 'pass' ? 'green' : result.status === 'fail' ? 'red' : 'yellow';
    
    log(`\n${icon} ${result.name}`, statusColor);
    log(`   ${result.message}`, 'reset');
    
    if (result.details && result.details.length > 0) {
      result.details.forEach(detail => {
        log(`   • ${detail}`, 'yellow');
      });
    }

    if (result.status === 'pass') passCount++;
    else if (result.status === 'fail') failCount++;
    else warningCount++;
  });

  // Summary
  log('\n' + '='.repeat(60), 'blue');
  log('\n📈 Summary:', 'blue');
  log(`   ✅ Passed: ${passCount}`, 'green');
  log(`   ⚠️  Warnings: ${warningCount}`, 'yellow');
  log(`   ❌ Failed: ${failCount}`, 'red');

  // Final recommendation
  log('\n' + '='.repeat(60), 'blue');
  
  if (failCount === 0 && warningCount === 0) {
    log('\n🎉 All checks passed! Your app is ready for production deployment.', 'green');
    log('\n📋 Next Steps:', 'blue');
    log('   1. Set environment variables in EAS Dashboard (production profile)');
    log('   2. Set environment variables in Netlify Dashboard');
    log('   3. Deploy Netlify function: git push origin main');
    log('   4. Configure Paystack webhook URL in Paystack Dashboard');
    log('   5. Build production APK: eas build --platform android --profile production');
    process.exit(0);
  } else if (failCount === 0) {
    log('\n⚠️  Some warnings found. Review and address before deployment.', 'yellow');
    process.exit(0);
  } else {
    log('\n❌ Critical issues found. Please fix before deploying to production.', 'red');
    process.exit(1);
  }
}

// Run the verification
main().catch(error => {
  log(`\n❌ Error running verification: ${error.message}`, 'red');
  process.exit(1);
});


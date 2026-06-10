#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  // eslint-disable-next-line no-console
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function readJson(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`${filePath} not found`);
  }
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function getProductionWebClientId(easConfig) {
  return easConfig?.build?.production?.env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
}

function hasProductionUpdateEnvironment(packageJson) {
  const updateScript = packageJson?.scripts?.['update:production'] ?? '';
  return updateScript.includes('--environment production');
}

function findAndroidClient(googleServices) {
  const clients = googleServices?.client ?? [];
  return clients.find(
    (client) =>
      client?.client_info?.android_client_info?.package_name === 'co.linkapp.android',
  );
}

function hasWebOauthClient(androidClient, webClientId) {
  const oauthClients = androidClient?.oauth_client ?? [];
  return oauthClients.some(
    (oauth) => oauth.client_type === 3 && oauth.client_id === webClientId,
  );
}

function run() {
  log('\nGoogle Auth Production Readiness\n', 'blue');

  let failed = false;

  let packageJson;
  let easJson;
  let googleServices;

  try {
    packageJson = readJson('package.json');
    easJson = readJson('eas.json');
    googleServices = readJson('google-services.json');
  } catch (error) {
    log(`- Failed to read required config: ${error.message}`, 'red');
    process.exit(1);
  }

  const webClientId = getProductionWebClientId(easJson);
  const hasUpdateEnvFlag = hasProductionUpdateEnvironment(packageJson);
  const androidClient = findAndroidClient(googleServices);
  const hasMatchingWebClient = hasWebOauthClient(androidClient, webClientId);

  if (!webClientId) {
    failed = true;
    log('- Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in eas.json production env', 'red');
  } else {
    log('- Production EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is set', 'green');
  }

  if (!hasUpdateEnvFlag) {
    failed = true;
    log('- update:production is missing --environment production', 'red');
  } else {
    log('- update:production pins EAS production environment', 'green');
  }

  if (!androidClient) {
    failed = true;
    log('- google-services.json missing Android client for co.linkapp.android', 'red');
  } else {
    log('- google-services.json has co.linkapp.android client entry', 'green');
  }

  if (!hasMatchingWebClient) {
    failed = true;
    log(
      '- google-services.json web OAuth client does not match EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
      'red',
    );
  } else {
    log('- google-services.json web OAuth client matches production web client id', 'green');
  }

  log('\nManual checks before OTA publish:', 'yellow');
  log(
    '- Verify Play App Signing SHA-1/SHA-256 in Play Console are added to Firebase/Google OAuth for co.linkapp.android',
    'yellow',
  );
  log('- Install latest production build + latest OTA and test Google sign-in on device', 'yellow');

  if (failed) {
    log('\nResult: NOT READY for OTA publish.\n', 'red');
    process.exit(1);
  }

  log('\nResult: READY for OTA-first rollout.\n', 'green');
  log(
    'Fallback gate: ship a new Play Store binary only if Google sign-in still fails after this OTA and cloud SHA verification.',
    'blue',
  );
  process.exit(0);
}

run();

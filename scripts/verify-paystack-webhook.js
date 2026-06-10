#!/usr/bin/env node

/**
 * Paystack Webhook Verification Script
 * 
 * This script helps verify Paystack webhook configuration
 * and provides testing instructions.
 */

const https = require('https');
const http = require('http');

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

const webhookUrl = 'https://link-app.co/.netlify/functions/paystack-webhook';

function testWebhookEndpoint() {
  return new Promise((resolve, reject) => {
    log('\n🔍 Testing Webhook Endpoint...', colors.cyan);
    log(`   URL: ${webhookUrl}\n`, colors.blue);
    
    const url = new URL(webhookUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'LinkApp-Webhook-Verifier/1.0'
      }
    };
    
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 405 || res.statusCode === 200) {
          log('   ✅ Endpoint is accessible', colors.green);
          log(`   Status: ${res.statusCode}`, colors.green);
          if (res.statusCode === 405) {
            log('   Note: GET returns 405 (Method Not Allowed) - this is expected', colors.yellow);
            log('         Webhook only accepts POST requests', colors.yellow);
          }
          resolve({ success: true, statusCode: res.statusCode });
        } else {
          log(`   ⚠️  Unexpected status: ${res.statusCode}`, colors.yellow);
          resolve({ success: false, statusCode: res.statusCode });
        }
      });
    });
    
    req.on('error', (error) => {
      log(`   ❌ Error: ${error.message}`, colors.red);
      log('   Make sure the Netlify function is deployed', colors.yellow);
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      log('   ❌ Request timeout', colors.red);
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

function providePaystackConfigSteps() {
  log('\n📝 Paystack Webhook Configuration Steps:', colors.cyan);
  log('==========================================\n', colors.cyan);
  
  log('1. Login to Paystack Dashboard:', colors.yellow);
  log('   https://dashboard.paystack.com', colors.blue);
  log('');
  
  log('2. Navigate to Settings → API Keys & Webhooks', colors.yellow);
  log('');
  
  log('3. Copy your LIVE keys:', colors.yellow);
  log('   - Public Key (pk_live_...)', colors.blue);
  log('   - Secret Key (sk_live_...)', colors.blue);
  log('   ⚠️  Make sure to use LIVE keys, not test keys!', colors.red);
  log('');
  
  log('4. Go to Webhooks section', colors.yellow);
  log('');
  
  log('5. Click "Add Webhook"', colors.yellow);
  log('');
  
  log('6. Enter webhook URL:', colors.yellow);
  log(`   ${webhookUrl}`, colors.blue);
  log('');
  
  log('7. Select these events:', colors.yellow);
  const events = [
    'charge.success',
    'charge.failed',
    'subscription.create',
    'subscription.disable',
    'subscription.not_renew'
  ];
  events.forEach(event => {
    log(`   ☑ ${event}`, colors.green);
  });
  log('');
  
  log('8. Click "Save"', colors.yellow);
  log('');
  
  log('9. Test the webhook:', colors.yellow);
  log('   - Click "Send Test Event" in Paystack', colors.blue);
  log('   - Check Netlify function logs', colors.blue);
  log('   - Verify webhook_events table in Supabase', colors.blue);
  log('');
}

function provideTestingInstructions() {
  log('\n🧪 Webhook Testing Instructions:', colors.cyan);
  log('==================================\n', colors.cyan);
  
  log('1. Test Endpoint Accessibility:', colors.yellow);
  log('   Run this script: npm run verify:webhook', colors.blue);
  log('');
  
  log('2. Test with Paystack Test Event:', colors.yellow);
  log('   - In Paystack Dashboard → Webhooks', colors.blue);
  log('   - Click "Send Test Event"', colors.blue);
  log('   - Select event type: charge.success', colors.blue);
  log('   - Check Netlify function logs for processing', colors.blue);
  log('');
  
  log('3. Monitor Webhook Logs:', colors.yellow);
  log('   - Netlify Dashboard → Functions → paystack-webhook', colors.blue);
  log('   - Check logs for any errors', colors.blue);
  log('');
  
  log('4. Verify Database Updates:', colors.yellow);
  log('   - Check webhook_events table in Supabase', colors.blue);
  log('   - Verify transactions are processed correctly', colors.blue);
  log('');
  
  log('5. Test Actual Payment:', colors.yellow);
  log('   - Make a test payment in the app', colors.blue);
  log('   - Verify webhook receives charge.success event', colors.blue);
  log('   - Check subscription is activated', colors.blue);
  log('');
}

function provideTroubleshooting() {
  log('\n🔧 Troubleshooting:', colors.cyan);
  log('===================\n', colors.cyan);
  
  const issues = [
    {
      problem: 'Webhook returns 401 Unauthorized',
      solution: 'Check PAYSTACK_SECRET_KEY in Netlify environment variables',
      check: 'Verify secret key matches Paystack Dashboard'
    },
    {
      problem: 'Webhook returns 500 Error',
      solution: 'Check Netlify function logs for errors',
      check: 'Verify SUPABASE_SERVICE_ROLE_KEY is set correctly'
    },
    {
      problem: 'Webhook not receiving events',
      solution: 'Verify webhook URL is correct in Paystack Dashboard',
      check: 'Check that events are selected in Paystack'
    },
    {
      problem: 'Signature verification fails',
      solution: 'Ensure rawBody is passed correctly to verification function',
      check: 'Netlify functions should handle rawBody automatically'
    }
  ];
  
  issues.forEach((issue, index) => {
    log(`${index + 1}. ${issue.problem}`, colors.yellow);
    log(`   Solution: ${issue.solution}`, colors.cyan);
    log(`   Check: ${issue.check}`, colors.blue);
    log('');
  });
}

async function main() {
  log('\n🔐 Paystack Webhook Verification', colors.blue);
  log('=================================\n', colors.blue);
  
  try {
    await testWebhookEndpoint();
  } catch (error) {
    log('\n⚠️  Could not test endpoint automatically', colors.yellow);
    log('   This is okay - you can test manually in Paystack Dashboard', colors.yellow);
  }
  
  providePaystackConfigSteps();
  provideTestingInstructions();
  provideTroubleshooting();
  
  log('\n✅ Verification complete!', colors.green);
  log('\n💡 Remember:', colors.cyan);
  log('   - Use LIVE keys in production', colors.yellow);
  log('   - Test webhook after configuration', colors.yellow);
  log('   - Monitor logs after deployment', colors.yellow);
  log('\n');
}

if (require.main === module) {
  main();
}

module.exports = { testWebhookEndpoint, webhookUrl };



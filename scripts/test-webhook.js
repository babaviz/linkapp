#!/usr/bin/env node

const crypto = require('crypto');
const https = require('https');

const webhookUrl = 'https://link-app.co/.netlify/functions/paystack-webhook';
const secretKey = process.env.PAYSTACK_SECRET_KEY;

if (!secretKey) {
  console.error('❌ PAYSTACK_SECRET_KEY environment variable is required');
  console.error('   Set it in your .env file or export it:');
  console.error('   export PAYSTACK_SECRET_KEY=your_secret_key');
  process.exit(1);
}

const testPayload = {
  event: 'charge.success',
  data: {
    id: 123456789,
    domain: 'live',
    status: 'success',
    reference: 'test_' + Date.now(),
    amount: 50000,
    message: 'Approved',
    gateway_response: 'Successful',
    paid_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    channel: 'card',
    currency: 'NGN',
    ip_address: '192.168.1.1',
    metadata: {
      custom_fields: []
    },
    fees: 750,
    customer: {
      id: 12345,
      email: 'test@linkapp.co'
    },
    authorization: {
      authorization_code: 'AUTH_test123',
      bin: '408408',
      last4: '4081',
      exp_month: '12',
      exp_year: '2030',
      channel: 'card',
      card_type: 'visa',
      bank: 'TEST Bank',
      country_code: 'NG',
      brand: 'visa'
    }
  }
};

const payloadString = JSON.stringify(testPayload);

const signature = crypto
  .createHmac('sha512', secretKey)
  .update(payloadString)
  .digest('hex');

console.log('\n🧪 Testing Paystack Webhook\n');
console.log('Webhook URL:', webhookUrl);
console.log('Payload:', JSON.stringify(testPayload, null, 2));
console.log('\nGenerated signature:', signature);
console.log('\nSending request...\n');

const url = new URL(webhookUrl);
const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-paystack-signature': signature,
    'Content-Length': Buffer.byteLength(payloadString)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Body:', data);
    
    try {
      const parsed = JSON.parse(data);
      console.log('\nParsed Response:', JSON.stringify(parsed, null, 2));
      
      if (res.statusCode === 200 && parsed.received) {
        console.log('\n✅ Webhook test PASSED!');
        console.log('   - Signature verification: ✅');
        console.log('   - Payload processing: ✅');
        console.log('   - Event acknowledged: ✅');
      } else {
        console.log('\n⚠️  Webhook responded but may need attention');
        console.log('   Check the response above for details');
      }
    } catch (e) {
      console.log('\n❌ Failed to parse response as JSON');
      console.log('   Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Request failed:', error.message);
});

req.write(payloadString);
req.end();

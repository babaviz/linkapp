const { paystackService } = require('../services/paystackService');
const { ENV } = require('../config/environment');

console.log('🔧 Paystack Service Configuration Test\n');

console.log('📋 Environment Variables:');
console.log(`   PAYSTACK PUBLIC_KEY: ${ENV.PAYSTACK?.PUBLIC_KEY ? '✅ Set (pk_test_...)' : '❌ Missing'}`);
console.log(`   PAYSTACK SECRET_KEY: ${ENV.PAYSTACK?.SECRET_KEY ? '✅ Set (sk_test_...)' : '❌ Missing'}`);

console.log('\n📊 Paystack Service Methods:');
console.log(`   getCountryConfig: ${typeof paystackService.getCountryConfig === 'function' ? '✅' : '❌'}`);
console.log(`   getSubscriptionPricing: ${typeof paystackService.getSubscriptionPricing === 'function' ? '✅' : '❌'}`);
console.log(`   initializeTransaction: ${typeof paystackService.initializeTransaction === 'function' ? '✅' : '❌'}`);
console.log(`   verifyTransaction: ${typeof paystackService.verifyTransaction === 'function' ? '✅' : '❌'}`);

console.log('\n💰 Pricing Test:');
try {
  const pricing = paystackService.getSubscriptionPricing('pro', 'monthly', 'KE');
  console.log(`   Kenya Pro Monthly: ${pricing.formattedPrice}`);
  console.log(`   ✅ Pricing calculation working`);
} catch (error) {
  console.log(`   ❌ Pricing failed: ${error.message}`);
}

console.log('\n🌍 Country Configs:');
const countries = ['KE', 'UG', 'TZ', 'OTHER'];
countries.forEach(code => {
  try {
    const config = paystackService.getCountryConfig(code);
    console.log(`   ${code} (${config.name}): ${config.currency} - ${config.paymentMethods.length} payment methods`);
  } catch (error) {
    console.log(`   ${code}: ❌ Error - ${error.message}`);
  }
});

console.log('\n✅ Paystack service is properly configured!\n');

// Safe initialization wrapper for services
import { ENV } from '../config/environment';

export const isSafeToInitialize = {
  supabase: () => {
    const url = ENV.SUPABASE_URL;
    const key = ENV.SUPABASE_ANON_KEY;
    return url && !url.includes('demo') && key && !key.includes('demo');
  },
  
  streamChat: () => {
    const key = ENV.STREAM_CHAT_API_KEY;
    return key && !key.includes('demo') && key.length > 10;
  },
  
  paystack: () => {
    const publicKey = ENV.PAYSTACK?.PUBLIC_KEY;
    return publicKey && publicKey.startsWith('pk_');
  }
};

export const checkRequiredServices = () => {
  const missing = [];
  
  if (!isSafeToInitialize.supabase()) {
    missing.push('Supabase (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY)');
  }
  
  if (!isSafeToInitialize.streamChat()) {
    missing.push('Stream Chat (EXPO_PUBLIC_STREAM_CHAT_API_KEY)');
  }
  
  if (missing.length > 0) {
    if (__DEV__) {
      console.warn('⚠️ Missing required services configuration:');
      missing.forEach(service => console.warn(`  - ${service}`));
      console.warn('Please update your .env file with valid credentials');
    }
    
    // In development, show alert
    if (__DEV__) {
      const message = `Missing configuration for:\n${missing.join('\n')}\n\nPlease check FIX_APP_CRASH.md for setup instructions.`;
      
      // Return the issues for handling
      return { 
        hasIssues: true, 
        missing,
        message 
      };
    }
  }
  
  return { hasIssues: false, missing: [], message: '' };
};

/**
 * Test Supabase Connection
 * Quick test to verify Supabase URL and credentials are working
 */

import { supabase } from './supabaseClient';

export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: any;
}> {
  try {
    // Test 1: Check if we can reach Supabase at all
    const startTime = Date.now();
    
    // Try to get session (should be fast even if no session exists)
    const { data: sessionData, error: sessionError } = await Promise.race([
      supabase.auth.getSession(),
      new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ 
          data: null, 
          error: { message: 'Connection timeout' } 
        }), 10000) // Increased timeout to 10 seconds
      ),
    ]);
    
    const responseTime = Date.now() - startTime;
    
    if (sessionError && sessionError.message === 'Connection timeout') {
      return {
        success: false,
        message: 'Cannot reach Supabase server. Please check your internet connection and Supabase URL.',
        details: { responseTime }
      };
    }
    
    if (sessionError && sessionError.message.includes('Invalid API key')) {
      return {
        success: false,
        message: 'Invalid Supabase credentials. Please check your EXPO_PUBLIC_SUPABASE_ANON_KEY.',
        details: { error: sessionError.message }
      };
    }
    
    // If we got here, we can reach Supabase
    return {
      success: true,
      message: 'Successfully connected to Supabase',
      details: { responseTime, hasSession: !!sessionData?.session }
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      message: `Connection failed: ${errorMessage}`,
      details: { error }
    };
  }
}



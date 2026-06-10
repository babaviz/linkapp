/**
 * Demo Data Index - Export all demo data for LinkApp
 * ⚠️ PRODUCTION SAFETY: This file should ONLY be dynamically imported in non-production builds
 * 
 * IMPORTANT: Do NOT directly import this file. Use dynamic imports:
 * const { initializeAllDemoData } = await import('../data');
 */

import { ENV } from '../config/environment';

// PRODUCTION GUARD - Warn if demo data is loaded in production (but don't crash the app)
if (ENV.APP_ENV === 'production' && typeof __DEV__ !== 'undefined' && !__DEV__) {
  console.error(
    '⚠️ WARNING: Demo data module loaded in production build. ' +
    'This should not happen. Check your imports.'
  );
}

// Property Demo Data
// Note: demoProperties file removed - using real data from Supabase

// Jobs Demo Data - DISABLED: Using real Supabase data
// export * from './demoJobs';

// Services Demo Data - DISABLED: Using real Supabase data
// export * from './demoServices';

// Date Mi Demo Data - DISABLED: Using real Supabase data
// export * from './demoDateMi';

// Demo Data Initialization Functions
import { AppDispatch } from '../redux/store';

/**
 * Initialize all demo data across the app
 * ⚠️ This should only be called in development/testing environments
 * Note: Demo data loaders removed - app now uses real data from Supabase
 */
export const initializeAllDemoData = (_dispatch: AppDispatch) => {
  // Double-check production guard
  if (ENV.APP_ENV === 'production') {
    return;
  }
  
  // Demo data initialization removed - using real Supabase data
  // No-op function maintained for backward compatibility
};

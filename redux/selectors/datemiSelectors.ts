/**
 * Date Mi Selectors
 * Computed selectors that derive Date Mi state from global auth state
 * This ensures single source of truth and prevents data drift
 */

import { RootState } from '../store';

/**
 * Selects age verification status from auth.user.kycStatus
 * This is the single source of truth for age verification
 * 
 * @returns true if user's KYC status is 'verified', false otherwise
 */
export const selectIsAgeVerified = (state: RootState): boolean => {
  return state.auth.user?.kycStatus === 'verified';
};

/**
 * Selects the date when age verification was completed
 * Uses the user's updatedAt timestamp as proxy for verification date
 * 
 * @returns ISO timestamp string if verified, null otherwise
 */
export const selectAgeVerificationDate = (state: RootState): string | null => {
  if (state.auth.user?.kycStatus === 'verified') {
    return state.auth.user.updatedAt || state.auth.user.createdAt;
  }
  return null;
};

/**
 * Selects whether the user can access Date Mi module
 * Requires both authentication and age verification
 * 
 * @returns true if user is authenticated and age verified
 */
export const selectCanAccessDateMi = (state: RootState): boolean => {
  return state.auth.isAuthenticated && selectIsAgeVerified(state);
};

/**
 * Selects KYC status with human-readable label
 * Useful for displaying verification status in UI
 */
export const selectKycStatusLabel = (state: RootState): string => {
  const status = state.auth.user?.kycStatus;
  
  switch (status) {
    case 'verified':
      return 'Verified ✓';
    case 'pending':
      return 'Verification Pending';
    case 'rejected':
      return 'Verification Failed';
    default:
      return 'Not Verified';
  }
};

/**
 * Selects whether user needs to complete age verification
 * Used to show verification prompts
 */
export const selectNeedsAgeVerification = (state: RootState): boolean => {
  const status = state.auth.user?.kycStatus;
  return !status || status === 'pending' || status === 'rejected';
};

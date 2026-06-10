import { DateMiProfile } from '../redux/slices/datemiSlice';

export interface ProfileCompletionStatus {
  isComplete: boolean;
  completionPercentage: number;
  missingFields: string[];
  warnings: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a DateMi profile for completeness and correctness
 * 
 * @param profile - The profile to validate
 * @returns Validation result with errors and warnings
 */
export function validateProfile(profile: Partial<DateMiProfile> | null): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!profile) {
    return {
      isValid: false,
      errors: ['Profile is null or undefined'],
      warnings: [],
    };
  }
  
  // Required fields validation
  if (!profile.userId) {
    errors.push('User ID is required');
  }
  
  if (!profile.displayName || profile.displayName.trim().length === 0) {
    errors.push('Display name is required');
  }
  
  if (!profile.ageVerified) {
    errors.push('Age verification is required');
  }
  
  if (!profile.age || profile.age < 18) {
    errors.push('User must be 18 or older');
  }
  
  if (profile.age && profile.age > 100) {
    errors.push('Age must be 100 or less');
  }
  
  // Profile pictures validation
  if (!profile.profilePictures || profile.profilePictures.length === 0) {
    errors.push('At least one profile picture is required');
  } else if (profile.profilePictures.length < 2) {
    warnings.push('Add at least 2 photos for better matches');
  }
  
  // Bio validation
  if (!profile.aboutMe || profile.aboutMe.trim().length === 0) {
    errors.push('Bio is required');
  } else if (profile.aboutMe.length < 20) {
    warnings.push('Bio should be at least 20 characters for better engagement');
  } else if (profile.aboutMe.length > 500) {
    errors.push('Bio must be 500 characters or less');
  }
  
  // Interests validation
  if (!profile.interests || profile.interests.length === 0) {
    errors.push('At least one interest is required');
  } else if (profile.interests.length < 3) {
    warnings.push('Add at least 3 interests to improve matches');
  } else if (profile.interests.length > 10) {
    errors.push('Maximum 10 interests allowed');
  }
  
  // Gender preferences validation
  if (!profile.genderPreferences || profile.genderPreferences.length === 0) {
    errors.push('Gender preferences are required');
  }
  
  // Intention validation
  if (!profile.intention) {
    errors.push('Dating intention is required');
  }
  
  // Location validation
  if (!profile.location || profile.location.trim().length === 0) {
    warnings.push('Add your location to find nearby matches');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculates profile completion percentage and identifies missing fields
 * 
 * @param profile - The profile to analyze
 * @returns Profile completion status
 */
export function getProfileCompletionStatus(profile: Partial<DateMiProfile> | null): ProfileCompletionStatus {
  const missingFields: string[] = [];
  const warnings: string[] = [];
  let completedFields = 0;
  const totalFields = 10; // Number of fields we track for completion
  
  if (!profile) {
    return {
      isComplete: false,
      completionPercentage: 0,
      missingFields: ['Profile not created'],
      warnings: [],
    };
  }
  
  // Track each field
  if (profile.displayName && profile.displayName.trim().length > 0) {
    completedFields++;
  } else {
    missingFields.push('Display Name');
  }
  
  if (profile.age && profile.age >= 18 && profile.age <= 100) {
    completedFields++;
  } else {
    missingFields.push('Age');
  }
  
  if (profile.profilePictures && profile.profilePictures.length >= 2) {
    completedFields++;
  } else if (profile.profilePictures && profile.profilePictures.length === 1) {
    completedFields += 0.5;
    warnings.push('Add at least one more photo');
  } else {
    missingFields.push('Profile Pictures (min 2)');
  }
  
  if (profile.aboutMe && profile.aboutMe.length >= 20 && profile.aboutMe.length <= 500) {
    completedFields++;
  } else if (profile.aboutMe && profile.aboutMe.length < 20) {
    completedFields += 0.5;
    warnings.push('Bio too short (min 20 characters)');
  } else {
    missingFields.push('Bio');
  }
  
  if (profile.interests && profile.interests.length >= 3 && profile.interests.length <= 10) {
    completedFields++;
  } else if (profile.interests && profile.interests.length < 3) {
    completedFields += 0.5;
    warnings.push('Add more interests (min 3)');
  } else {
    missingFields.push('Interests (min 3)');
  }
  
  if (profile.genderPreferences && profile.genderPreferences.length > 0) {
    completedFields++;
  } else {
    missingFields.push('Gender Preferences');
  }
  
  if (profile.intention) {
    completedFields++;
  } else {
    missingFields.push('Dating Intention');
  }
  
  if (profile.location && profile.location.trim().length > 0) {
    completedFields++;
  } else {
    warnings.push('Add location for better matches');
  }
  
  if (profile.ageVerified) {
    completedFields++;
  } else {
    missingFields.push('Age Verification');
  }
  
  if (profile.privacySettings) {
    completedFields++;
  } else {
    warnings.push('Review privacy settings');
  }
  
  const completionPercentage = Math.round((completedFields / totalFields) * 100);
  const isComplete = completionPercentage >= 100 && missingFields.length === 0;
  
  return {
    isComplete,
    completionPercentage,
    missingFields,
    warnings,
  };
}

/**
 * Validates profile on load to ensure data integrity
 * 
 * @param profile - The profile loaded from database
 * @returns True if profile is valid, false otherwise
 */
export function validateProfileOnLoad(profile: DateMiProfile | null): boolean {
  if (!profile) {
    return false;
  }

  const validation = validateProfile(profile);

  // Profile must have minimum required fields to be considered valid
  const hasRequiredFields = 
    profile.userId &&
    profile.displayName &&
    profile.ageVerified &&
    profile.age && profile.age >= 18 &&
    profile.profilePictures && profile.profilePictures.length > 0 &&
    profile.genderPreferences && profile.genderPreferences.length > 0;
  
  return !!hasRequiredFields;
}

/**
 * Get user-friendly completion message
 * 
 * @param status - Profile completion status
 * @returns User-friendly message
 */
export function getCompletionMessage(status: ProfileCompletionStatus): string {
  if (status.isComplete) {
    return '✅ Your profile is complete!';
  }
  
  if (status.completionPercentage >= 80) {
    return `Almost there! ${100 - status.completionPercentage}% to go`;
  }
  
  if (status.completionPercentage >= 50) {
    return `You're halfway there! ${status.completionPercentage}% complete`;
  }
  
  if (status.completionPercentage >= 25) {
    return `Good start! ${status.completionPercentage}% complete`;
  }
  
  return `Let's complete your profile! ${status.completionPercentage}% complete`;
}

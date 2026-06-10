/**
 * Job Validation Utilities
 * Provides validation functions for job posting and application forms
 */

import { JobPosting, JobApplication, JobType, ExperienceLevel } from '../types/job';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate job posting data
 */
export const validateJobPosting = (data: Partial<JobPosting>): ValidationResult => {
  const errors: ValidationError[] = [];

  // Title validation
  if (!data.title?.trim()) {
    errors.push({ field: 'title', message: 'Job title is required' });
  } else if (data.title.length < 5) {
    errors.push({ field: 'title', message: 'Job title must be at least 5 characters' });
  } else if (data.title.length > 100) {
    errors.push({ field: 'title', message: 'Job title must be less than 100 characters' });
  }

  // Description validation
  if (!data.description?.trim()) {
    errors.push({ field: 'description', message: 'Job description is required' });
  } else if (data.description.length < 50) {
    errors.push({ field: 'description', message: 'Job description must be at least 50 characters' });
  } else if (data.description.length > 5000) {
    errors.push({ field: 'description', message: 'Job description must be less than 5000 characters' });
  }

  // Location validation
  if (!data.location) {
    errors.push({ field: 'location', message: 'Location is required' });
  } else {
    if (!data.location.county) {
      errors.push({ field: 'location.county', message: 'County is required' });
    }
    if (!data.location.town) {
      errors.push({ field: 'location.town', message: 'Town/Area is required' });
    }
  }

  // Job type validation
  const validJobTypes: JobType[] = ['full_time', 'part_time', 'contract', 'freelance', 'internship', 'temporary'];
  if (!data.job_type) {
    errors.push({ field: 'job_type', message: 'Job type is required' });
  } else if (!validJobTypes.includes(data.job_type)) {
    errors.push({ field: 'job_type', message: 'Invalid job type' });
  }

  // Experience level validation
  const validExperienceLevels: ExperienceLevel[] = ['entry', 'intermediate', 'senior', 'expert'];
  if (!data.experience_level) {
    errors.push({ field: 'experience_level', message: 'Experience level is required' });
  } else if (!validExperienceLevels.includes(data.experience_level)) {
    errors.push({ field: 'experience_level', message: 'Invalid experience level' });
  }

  // Salary validation (optional but if provided, must be valid)
  if (data.salary) {
    if (data.salary.min !== undefined && data.salary.max !== undefined) {
      if (data.salary.min < 0) {
        errors.push({ field: 'salary.min', message: 'Minimum salary cannot be negative' });
      }
      if (data.salary.max < 0) {
        errors.push({ field: 'salary.max', message: 'Maximum salary cannot be negative' });
      }
      if (data.salary.min > data.salary.max) {
        errors.push({ field: 'salary', message: 'Minimum salary cannot be greater than maximum salary' });
      }
      if (data.salary.min > 10000000) {
        errors.push({ field: 'salary.min', message: 'Minimum salary seems unrealistic' });
      }
      if (data.salary.max > 10000000) {
        errors.push({ field: 'salary.max', message: 'Maximum salary seems unrealistic' });
      }
    }
    if (!data.salary.currency) {
      errors.push({ field: 'salary.currency', message: 'Currency is required for salary' });
    }
    if (!data.salary.period) {
      errors.push({ field: 'salary.period', message: 'Salary period is required' });
    }
  }

  // Requirements validation
  if (data.requirements && data.requirements.length > 0) {
    data.requirements.forEach((req, index) => {
      if (!req.skill?.trim()) {
        errors.push({ field: `requirements[${index}].skill`, message: 'Skill name is required' });
      }
      if (!req.level) {
        errors.push({ field: `requirements[${index}].level`, message: 'Skill level is required' });
      }
    });
  }

  // Category validation
  if (!data.category?.trim()) {
    errors.push({ field: 'category', message: 'Job category is required' });
  }

  // Employer validation - employer info should include contact details
  if (data.employer) {
    // Validate employer email format if provided
    const employerData = data.employer as any;
    if (employerData.email && !isValidEmail(employerData.email)) {
      errors.push({ field: 'employer.email', message: 'Invalid email format' });
    }
    
    // Validate employer phone format if provided
    if (employerData.phone && !isValidKenyanPhone(employerData.phone)) {
      errors.push({ field: 'employer.phone', message: 'Invalid phone number format' });
    }
  }

  // Deadline validation if provided
  if (data.applicationDeadline) {
    const deadline = new Date(data.applicationDeadline);
    const now = new Date();
    if (deadline <= now) {
      errors.push({ field: 'applicationDeadline', message: 'Application deadline must be in the future' });
    }
    // Check if deadline is not too far in the future (e.g., 6 months)
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    if (deadline > sixMonthsFromNow) {
      errors.push({ field: 'applicationDeadline', message: 'Application deadline cannot be more than 6 months in the future' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate job application data
 */
export const validateJobApplication = (data: Partial<JobApplication>): ValidationResult => {
  const errors: ValidationError[] = [];

  // Applicant name validation
  if (!data.applicantName?.trim()) {
    errors.push({ field: 'applicantName', message: 'Full name is required' });
  } else if (data.applicantName.length < 3) {
    errors.push({ field: 'applicantName', message: 'Name must be at least 3 characters' });
  } else if (data.applicantName.length > 100) {
    errors.push({ field: 'applicantName', message: 'Name must be less than 100 characters' });
  }

  // Email validation
  if (!data.applicantEmail?.trim()) {
    errors.push({ field: 'applicantEmail', message: 'Email is required' });
  } else if (!isValidEmail(data.applicantEmail)) {
    errors.push({ field: 'applicantEmail', message: 'Invalid email format' });
  }

  // Phone validation
  if (!data.applicantPhone?.trim()) {
    errors.push({ field: 'applicantPhone', message: 'Phone number is required' });
  } else if (!isValidKenyanPhone(data.applicantPhone)) {
    errors.push({ field: 'applicantPhone', message: 'Invalid Kenyan phone number format' });
  }

  // Cover letter validation
  if (!data.coverLetter?.trim()) {
    errors.push({ field: 'coverLetter', message: 'Cover letter is required' });
  } else if (data.coverLetter.length < 50) {
    errors.push({ field: 'coverLetter', message: 'Cover letter must be at least 50 characters' });
  } else if (data.coverLetter.length > 2000) {
    errors.push({ field: 'coverLetter', message: 'Cover letter must be less than 2000 characters' });
  }

  // Resume validation
  if (!data.resumeUrl) {
    errors.push({ field: 'resumeUrl', message: 'Resume is required' });
  }

  // Expected salary validation (optional)
  if (data.expectedSalary !== undefined) {
    if (data.expectedSalary < 0) {
      errors.push({ field: 'expectedSalary', message: 'Expected salary cannot be negative' });
    }
    if (data.expectedSalary > 10000000) {
      errors.push({ field: 'expectedSalary', message: 'Expected salary seems unrealistic' });
    }
  }

  // Availability date validation (optional)
  if (data.availabilityDate) {
    const availabilityDate = new Date(data.availabilityDate);
    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    
    if (availabilityDate < now) {
      errors.push({ field: 'availabilityDate', message: 'Availability date cannot be in the past' });
    }
    if (availabilityDate > threeMonthsFromNow) {
      errors.push({ field: 'availabilityDate', message: 'Availability date should be within the next 3 months' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate Kenyan phone number format
 */
export const isValidKenyanPhone = (phone: string): boolean => {
  // Remove spaces and hyphens
  const cleanPhone = phone.replace(/[\s-]/g, '');
  
  // Check for valid Kenyan phone formats
  // Accepts: +254XXXXXXXXX, 254XXXXXXXXX, 07XXXXXXXX, 01XXXXXXXX
  const kenyanPhoneRegex = /^(\+?254|0)[17]\d{8}$/;
  return kenyanPhoneRegex.test(cleanPhone);
};

/**
 * Validate salary range
 */
export const validateSalaryRange = (min?: number, max?: number): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (min !== undefined && min < 0) {
    errors.push({ field: 'salaryMin', message: 'Minimum salary cannot be negative' });
  }

  if (max !== undefined && max < 0) {
    errors.push({ field: 'salaryMax', message: 'Maximum salary cannot be negative' });
  }

  if (min !== undefined && max !== undefined && min > max) {
    errors.push({ field: 'salaryRange', message: 'Minimum salary cannot be greater than maximum salary' });
  }

  return errors;
};

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

/**
 * Format error messages for display
 */
export const formatValidationErrors = (errors: ValidationError[]): string => {
  if (errors.length === 0) return '';
  
  if (errors.length === 1) {
    return errors[0].message;
  }
  
  return 'Please fix the following errors:\n' + 
    errors.map(err => `• ${err.message}`).join('\n');
};

/**
 * Check if a job posting is complete and ready for publication
 */
export const isJobPostingComplete = (job: Partial<JobPosting>): boolean => {
  const requiredFields = [
    'title',
    'description',
    'location',
    'job_type',
    'experience_level',
    'skill_category',
    'application_method',
    'contact_info'
  ];

  return requiredFields.every(field => {
    const value = job[field as keyof JobPosting];
    if (value === null || value === undefined) return false;
    if (typeof value === 'string' && !value.trim()) return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    return true;
  });
};

/**
 * Calculate job match percentage based on user profile
 */
export const calculateJobMatchPercentage = (
  job: JobPosting,
  userSkills: string[],
  userExperience: ExperienceLevel,
  userLocation?: string
): number => {
  let matchScore = 0;
  let totalWeight = 0;

  // Skills match (40% weight)
  if (job.requirements && job.requirements.length > 0) {
    const requiredSkills = job.requirements.filter(r => r.required).map(r => r.skill.toLowerCase());
    const matchingSkills = requiredSkills.filter(skill => 
      userSkills.some(userSkill => userSkill.toLowerCase().includes(skill))
    );
    matchScore += (matchingSkills.length / requiredSkills.length) * 40;
    totalWeight += 40;
  }

  // Experience match (30% weight)
  const experienceLevels: ExperienceLevel[] = ['entry', 'intermediate', 'senior', 'expert'];
  const jobExpIndex = experienceLevels.indexOf(job.experience_level);
  const userExpIndex = experienceLevels.indexOf(userExperience);
  
  if (userExpIndex >= jobExpIndex) {
    matchScore += 30;
  } else if (userExpIndex === jobExpIndex - 1) {
    matchScore += 20; // Close match
  }
  totalWeight += 30;

  // Location match (30% weight)
  if (userLocation && job.location) {
    if (job.location.remote) {
      matchScore += 30; // Remote jobs match everyone
    } else if (job.location.county?.toLowerCase() === userLocation.toLowerCase()) {
      matchScore += 30;
    } else if (job.location.town?.toLowerCase() === userLocation.toLowerCase()) {
      matchScore += 25;
    }
    totalWeight += 30;
  }

  return Math.round((matchScore / totalWeight) * 100);
};

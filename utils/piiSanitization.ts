/**
 * PII Sanitization Utility
 * Removes personally identifiable information from analytics events
 * to ensure GDPR compliance and user privacy
 */

interface SanitizationOptions {
  maskEmails?: boolean;
  maskPhoneNumbers?: boolean;
  maskNames?: boolean;
  maskAddresses?: boolean;
  removeCustomFields?: string[];
}

const EMAIL_REGEX = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
const PHONE_REGEX = /(\+?\d{1,4}[\s-]?)?(\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}/g;
const NAME_PATTERNS = ['name', 'fullName', 'firstName', 'lastName', 'displayName'];
const ADDRESS_PATTERNS = ['address', 'street', 'city', 'zipCode', 'postalCode'];

/**
 * Default PII fields that should be removed from analytics
 */
const DEFAULT_PII_FIELDS = [
  'email',
  'phone',
  'phoneNumber',
  'fullName',
  'firstName',
  'lastName',
  'name',
  'displayName',
  'address',
  'street',
  'city',
  'zipCode',
  'postalCode',
  'ssn',
  'nationalId',
  'passport',
  'creditCard',
  'bankAccount',
  'ipAddress',
];

/**
 * Sanitize a string by masking or removing PII
 */
export function sanitizeString(input: string, options: SanitizationOptions = {}): string {
  let sanitized = input;
  
  // Mask emails
  if (options.maskEmails !== false) {
    sanitized = sanitized.replace(EMAIL_REGEX, (match) => {
      const [localPart, domain] = match.split('@');
      const maskedLocal = localPart.charAt(0) + '***' + localPart.charAt(localPart.length - 1);
      return `${maskedLocal}@${domain}`;
    });
  }
  
  // Mask phone numbers
  if (options.maskPhoneNumbers !== false) {
    sanitized = sanitized.replace(PHONE_REGEX, (match) => {
      return '***-***-' + match.slice(-4);
    });
  }
  
  return sanitized;
}

/**
 * Sanitize an object by removing or masking PII fields
 */
export function sanitizeObject(
  obj: any,
  options: SanitizationOptions = {}
): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle primitives
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return sanitizeString(obj, options);
    }
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }
  
  // Handle objects
  const sanitized: any = {};
  const fieldsToRemove = [...DEFAULT_PII_FIELDS, ...(options.removeCustomFields || [])];
  
  for (const [key, value] of Object.entries(obj)) {
    // Check if this field should be removed
    const shouldRemove = fieldsToRemove.some(field => 
      key.toLowerCase().includes(field.toLowerCase())
    );
    
    if (shouldRemove) {
      // Replace with generic placeholder
      sanitized[key] = '[REDACTED]';
      continue;
    }
    
    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, options);
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value, options);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Sanitize analytics event parameters
 */
export function sanitizeAnalyticsEvent(
  eventName: string,
  parameters: Record<string, any> = {}
): Record<string, any> {
  // Don't sanitize certain safe fields
  const safeFields = [
    'timestamp',
    'platform',
    'version',
    'language',
    'country',
    'currency',
    'value',
    'quantity',
    'category',
    'action',
    'label',
    'screenName',
    'eventType',
    'success',
    'error',
    'duration',
  ];
  
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(parameters)) {
    // Keep safe fields as-is
    if (safeFields.includes(key)) {
      sanitized[key] = value;
      continue;
    }
    
    // Sanitize other fields
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Check if a value contains PII
 */
export function containsPII(value: any): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  
  // Check for email patterns
  if (EMAIL_REGEX.test(value)) {
    return true;
  }
  
  // Check for phone patterns
  if (PHONE_REGEX.test(value)) {
    return true;
  }
  
  return false;
}

/**
 * Validate that an object is safe to log (contains no PII)
 */
export function validateSafeToLog(obj: any): { safe: boolean; issues: string[] } {
  const issues: string[] = [];
  
  function checkValue(value: any, path: string = 'root') {
    if (value === null || value === undefined) {
      return;
    }
    
    if (typeof value === 'string') {
      if (containsPII(value)) {
        issues.push(`PII detected at ${path}: ${value.substring(0, 20)}...`);
      }
    } else if (typeof value === 'object') {
      if (Array.isArray(value)) {
        value.forEach((item, index) => checkValue(item, `${path}[${index}]`));
      } else {
        for (const [key, val] of Object.entries(value)) {
          // Check if key name suggests PII
          if (DEFAULT_PII_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
            issues.push(`PII field detected: ${path}.${key}`);
          }
          checkValue(val, `${path}.${key}`);
        }
      }
    }
  }
  
  checkValue(obj);
  
  return {
    safe: issues.length === 0,
    issues,
  };
}

/**
 * Create a sanitized copy for logging in development
 */
export function sanitizeForLogging(data: any): any {
  if (process.env.NODE_ENV === 'production') {
    // In production, always sanitize
    return sanitizeObject(data);
  }
  
  // In development, validate and warn if PII detected
  const validation = validateSafeToLog(data);
  if (!validation.safe) {
    console.warn('[PII Warning] Detected PII in data:', validation.issues);
    return sanitizeObject(data);
  }
  
  return data;
}

export default {
  sanitizeString,
  sanitizeObject,
  sanitizeAnalyticsEvent,
  containsPII,
  validateSafeToLog,
  sanitizeForLogging,
};

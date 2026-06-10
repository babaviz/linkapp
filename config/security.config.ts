/**
 * Security Configuration
 * Environment-based security settings and constants
 */

interface SecurityConfig {
  // HTTPS Configuration
  https: {
    enforced: boolean;
    strictMode: boolean;
    allowedProtocols: string[];
    hstsMaxAge: number;
  };

  // Encryption Configuration
  encryption: {
    enabled: boolean;
    algorithm: 'AES-256' | 'AES-128';
    keyRotationDays: number;
    saltRounds: number;
  };

  // Session Configuration
  session: {
    timeout: number; // minutes
    maxConcurrentSessions: number;
    regenerateOnLogin: boolean;
    secureCookie: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };

  // Rate Limiting
  rateLimiting: {
    enabled: boolean;
    globalMaxRequests: number;
    globalWindowMs: number;
    ipWhitelist: string[];
    ipBlacklist: string[];
  };

  // Content Security Policy
  contentSecurity: {
    enableModeration: boolean;
    autoBlockThreshold: number;
    reportingEnabled: boolean;
    maxReportSize: number;
    scanUploads: boolean;
  };

  // API Security
  api: {
    requireApiKey: boolean;
    apiKeyHeader: string;
    corsEnabled: boolean;
    allowedOrigins: string[];
    maxRequestSize: number; // bytes
    timeout: number; // seconds
  };

  // Authentication
  auth: {
    maxLoginAttempts: number;
    lockoutDuration: number; // minutes
    passwordMinLength: number;
    passwordRequireSpecialChar: boolean;
    passwordRequireNumber: boolean;
    passwordRequireUppercase: boolean;
    mfaEnabled: boolean;
    sessionTokenExpiry: number; // hours
  };

  // Data Protection
  dataProtection: {
    encryptAtRest: boolean;
    encryptInTransit: boolean;
    piiMasking: boolean;
    dataRetentionDays: number;
    auditLogging: boolean;
    gdprCompliance: boolean;
  };

  // Security Headers
  headers: {
    xFrameOptions: 'DENY' | 'SAMEORIGIN';
    xContentTypeOptions: boolean;
    xXssProtection: boolean;
    referrerPolicy: string;
    contentSecurityPolicy: string;
    permissionsPolicy: string;
  };

  // Monitoring & Alerts
  monitoring: {
    enabled: boolean;
    alertThreshold: number;
    notificationChannels: string[];
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    retentionDays: number;
  };
}

const development: SecurityConfig = {
  https: {
    enforced: false,
    strictMode: false,
    allowedProtocols: ['http', 'https'],
    hstsMaxAge: 0
  },
  encryption: {
    enabled: true,
    algorithm: 'AES-128',
    keyRotationDays: 30,
    saltRounds: 10
  },
  session: {
    timeout: 60, // 1 hour
    maxConcurrentSessions: 5,
    regenerateOnLogin: true,
    secureCookie: false,
    sameSite: 'lax'
  },
  rateLimiting: {
    enabled: true,
    globalMaxRequests: 1000,
    globalWindowMs: 60000, // 1 minute
    ipWhitelist: ['localhost', '127.0.0.1'],
    ipBlacklist: []
  },
  contentSecurity: {
    enableModeration: true,
    autoBlockThreshold: 0.7,
    reportingEnabled: true,
    maxReportSize: 10000,
    scanUploads: true
  },
  api: {
    requireApiKey: false,
    apiKeyHeader: 'X-API-Key',
    corsEnabled: true,
    allowedOrigins: ['http://localhost:*'],
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    timeout: 30
  },
  auth: {
    maxLoginAttempts: 10,
    lockoutDuration: 15,
    passwordMinLength: 6,
    passwordRequireSpecialChar: false,
    passwordRequireNumber: false,
    passwordRequireUppercase: false,
    mfaEnabled: false,
    sessionTokenExpiry: 24
  },
  dataProtection: {
    encryptAtRest: false,
    encryptInTransit: false,
    piiMasking: true,
    dataRetentionDays: 90,
    auditLogging: false,
    gdprCompliance: false
  },
  headers: {
    xFrameOptions: 'SAMEORIGIN',
    xContentTypeOptions: true,
    xXssProtection: true,
    referrerPolicy: 'no-referrer-when-downgrade',
    contentSecurityPolicy: "default-src 'self'",
    permissionsPolicy: 'geolocation=(self)'
  },
  monitoring: {
    enabled: true,
    alertThreshold: 100,
    notificationChannels: ['console'],
    logLevel: 'debug',
    retentionDays: 7
  }
};

const staging: SecurityConfig = {
  https: {
    enforced: true,
    strictMode: false,
    allowedProtocols: ['https'],
    hstsMaxAge: 86400 // 1 day
  },
  encryption: {
    enabled: true,
    algorithm: 'AES-256',
    keyRotationDays: 30,
    saltRounds: 12
  },
  session: {
    timeout: 30,
    maxConcurrentSessions: 3,
    regenerateOnLogin: true,
    secureCookie: true,
    sameSite: 'strict'
  },
  rateLimiting: {
    enabled: true,
    globalMaxRequests: 500,
    globalWindowMs: 60000,
    ipWhitelist: [],
    ipBlacklist: []
  },
  contentSecurity: {
    enableModeration: true,
    autoBlockThreshold: 0.8,
    reportingEnabled: true,
    maxReportSize: 5000,
    scanUploads: true
  },
  api: {
    requireApiKey: true,
    apiKeyHeader: 'X-API-Key',
    corsEnabled: true,
    allowedOrigins: ['https://staging.linkapp.com'],
    maxRequestSize: 5 * 1024 * 1024, // 5MB
    timeout: 20
  },
  auth: {
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    passwordMinLength: 8,
    passwordRequireSpecialChar: true,
    passwordRequireNumber: true,
    passwordRequireUppercase: true,
    mfaEnabled: false,
    sessionTokenExpiry: 12
  },
  dataProtection: {
    encryptAtRest: true,
    encryptInTransit: true,
    piiMasking: true,
    dataRetentionDays: 180,
    auditLogging: true,
    gdprCompliance: true
  },
  headers: {
    xFrameOptions: 'DENY',
    xContentTypeOptions: true,
    xXssProtection: true,
    referrerPolicy: 'strict-origin',
    contentSecurityPolicy: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
    permissionsPolicy: 'geolocation=(self), camera=()'
  },
  monitoring: {
    enabled: true,
    alertThreshold: 50,
    notificationChannels: ['email', 'slack'],
    logLevel: 'warn',
    retentionDays: 30
  }
};

const production: SecurityConfig = {
  https: {
    enforced: true,
    strictMode: true,
    allowedProtocols: ['https'],
    hstsMaxAge: 31536000 // 1 year
  },
  encryption: {
    enabled: true,
    algorithm: 'AES-256',
    keyRotationDays: 7,
    saltRounds: 14
  },
  session: {
    timeout: 15,
    maxConcurrentSessions: 1,
    regenerateOnLogin: true,
    secureCookie: true,
    sameSite: 'strict'
  },
  rateLimiting: {
    enabled: true,
    globalMaxRequests: 100,
    globalWindowMs: 60000,
    ipWhitelist: [],
    ipBlacklist: []
  },
  contentSecurity: {
    enableModeration: true,
    autoBlockThreshold: 0.9,
    reportingEnabled: true,
    maxReportSize: 1000,
    scanUploads: true
  },
  api: {
    requireApiKey: true,
    apiKeyHeader: 'X-API-Key',
    corsEnabled: true,
    allowedOrigins: ['https://linkapp.com', 'https://www.linkapp.com'],
    maxRequestSize: 2 * 1024 * 1024, // 2MB
    timeout: 15
  },
  auth: {
    maxLoginAttempts: 3,
    lockoutDuration: 60,
    passwordMinLength: 10,
    passwordRequireSpecialChar: true,
    passwordRequireNumber: true,
    passwordRequireUppercase: true,
    mfaEnabled: true,
    sessionTokenExpiry: 2
  },
  dataProtection: {
    encryptAtRest: true,
    encryptInTransit: true,
    piiMasking: true,
    dataRetentionDays: 365,
    auditLogging: true,
    gdprCompliance: true
  },
  headers: {
    xFrameOptions: 'DENY',
    xContentTypeOptions: true,
    xXssProtection: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    contentSecurityPolicy: "default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self' data: https:; style-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    permissionsPolicy: 'geolocation=(), microphone=(), camera=()'
  },
  monitoring: {
    enabled: true,
    alertThreshold: 10,
    notificationChannels: ['email', 'slack', 'pagerduty'],
    logLevel: 'error',
    retentionDays: 90
  }
};

// Get current environment
const getEnvironment = (): 'development' | 'staging' | 'production' => {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') return 'production';
  if (env === 'staging' || env === 'test') return 'staging';
  return 'development';
};

// Select configuration based on environment
const configs = {
  development,
  staging,
  production
};

const currentEnv = getEnvironment();
const currentConfig = configs[currentEnv];

// Security constants
export const SECURITY_CONSTANTS = {
  // Password requirements
  PASSWORD_MIN_LENGTH: currentConfig.auth.passwordMinLength,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_REGEX: new RegExp(
    `^(?=.*[a-z])` +
    (currentConfig.auth.passwordRequireUppercase ? `(?=.*[A-Z])` : '') +
    (currentConfig.auth.passwordRequireNumber ? `(?=.*[0-9])` : '') +
    (currentConfig.auth.passwordRequireSpecialChar ? `(?=.*[!@#$%^&*])` : '') +
    `.{${currentConfig.auth.passwordMinLength},}$`
  ),

  // Token expiry times (in milliseconds)
  ACCESS_TOKEN_EXPIRY: currentConfig.auth.sessionTokenExpiry * 60 * 60 * 1000,
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days
  CSRF_TOKEN_EXPIRY: 60 * 60 * 1000, // 1 hour

  // Security headers
  SECURITY_HEADERS: {
    'X-Content-Type-Options': currentConfig.headers.xContentTypeOptions ? 'nosniff' : undefined,
    'X-Frame-Options': currentConfig.headers.xFrameOptions,
    'X-XSS-Protection': currentConfig.headers.xXssProtection ? '1; mode=block' : undefined,
    'Strict-Transport-Security': currentConfig.https.enforced ? 
      `max-age=${currentConfig.https.hstsMaxAge}; includeSubDomains` : undefined,
    'Content-Security-Policy': currentConfig.headers.contentSecurityPolicy,
    'Referrer-Policy': currentConfig.headers.referrerPolicy,
    'Permissions-Policy': currentConfig.headers.permissionsPolicy
  },

  // Rate limiting
  RATE_LIMIT_WINDOW: currentConfig.rateLimiting.globalWindowMs,
  RATE_LIMIT_MAX: currentConfig.rateLimiting.globalMaxRequests,

  // File upload limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  
  // Session
  SESSION_TIMEOUT: currentConfig.session.timeout * 60 * 1000,
  MAX_SESSIONS: currentConfig.session.maxConcurrentSessions,

  // Encryption
  ENCRYPTION_ALGORITHM: currentConfig.encryption.algorithm,
  SALT_ROUNDS: currentConfig.encryption.saltRounds
};

export default currentConfig;

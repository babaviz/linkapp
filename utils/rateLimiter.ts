/**
 * Enhanced Rate Limiter with Security Features
 * Provides comprehensive rate limiting for API calls, authentication, and user actions
 */

import securityService from '../services/securityService';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    firstAttemptTime?: number;
    blockedUntil?: number;
    violations?: number;
  };
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
  progressiveDelay?: boolean;
  violationThreshold?: number;
}

class RateLimiter {
  private store: RateLimitStore = {};
  private maxAttempts: number;
  private windowMs: number;
  private blockDurationMs: number;
  private progressiveDelay: boolean;
  private violationThreshold: number;
  private permanentlyBlocked: Set<string> = new Set();

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.maxAttempts = config.maxAttempts || 5;
    this.windowMs = config.windowMs || 15 * 60 * 1000; // 15 minutes by default
    this.blockDurationMs = config.blockDurationMs || 30 * 60 * 1000; // 30 minutes block by default
    this.progressiveDelay = config.progressiveDelay !== false; // Progressive delay enabled by default
    this.violationThreshold = config.violationThreshold || 10; // Permanent block after 10 violations
  }

  // Check if a request should be allowed with enhanced security
  checkLimit(identifier: string): { 
    allowed: boolean; 
    retryAfter?: number; 
    remainingAttempts?: number;
    blocked?: boolean;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  } {
    const now = Date.now();
    
    // Check if permanently blocked
    if (this.permanentlyBlocked.has(identifier)) {
      this.logSecurityEvent(identifier, 'permanent_block_attempt');
      return { 
        allowed: false, 
        blocked: true,
        severity: 'critical',
        retryAfter: Number.MAX_SAFE_INTEGER 
      };
    }

    const record = this.store[identifier];

    // Clean expired entries periodically
    this.cleanExpiredEntries();

    // Check if currently blocked
    if (record?.blockedUntil && now < record.blockedUntil) {
      const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
      return {
        allowed: false,
        blocked: true,
        severity: 'high',
        retryAfter,
        remainingAttempts: 0
      };
    }

    if (!record || now > record.resetTime) {
      // First request or window expired
      this.store[identifier] = {
        count: 1,
        resetTime: now + this.windowMs,
        firstAttemptTime: now,
        violations: record?.violations || 0
      };
      return { 
        allowed: true,
        severity: 'low',
        remainingAttempts: this.maxAttempts - 1 
      };
    }

    if (record.count >= this.maxAttempts) {
      // Rate limit exceeded
      record.violations = (record.violations || 0) + 1;
      
      // Check for permanent block threshold
      if (record.violations >= this.violationThreshold) {
        this.permanentlyBlocked.add(identifier);
        this.logSecurityEvent(identifier, 'permanent_block_applied');
        return {
          allowed: false,
          blocked: true,
          severity: 'critical',
          retryAfter: Number.MAX_SAFE_INTEGER
        };
      }
      
      // Progressive delay calculation
      let blockDuration = this.blockDurationMs;
      if (this.progressiveDelay) {
        blockDuration = this.calculateProgressiveDelay(record.violations || 1);
      }
      
      record.blockedUntil = now + blockDuration;
      record.resetTime = now + blockDuration;
      
      this.logSecurityEvent(identifier, 'rate_limit_exceeded', { violations: record.violations });
      
      return { 
        allowed: false,
        blocked: true,
        severity: record.violations > 5 ? 'high' : 'medium',
        retryAfter: Math.ceil(blockDuration / 1000),
        remainingAttempts: 0 
      };
    }

    // Check for rapid-fire attempts (potential attack)
    if (record.firstAttemptTime && 
        (now - record.firstAttemptTime) < 1000 && 
        record.count > 3) {
      record.violations = (record.violations || 0) + 1;
      this.logSecurityEvent(identifier, 'rapid_fire_detected');
      
      return {
        allowed: false,
        blocked: true,
        severity: 'high',
        retryAfter: 60, // 1 minute penalty
        remainingAttempts: 0
      };
    }

    // Increment counter
    record.count++;
    return { 
      allowed: true,
      severity: 'low',
      remainingAttempts: this.maxAttempts - record.count 
    };
  }

  // Calculate progressive delay based on violations
  private calculateProgressiveDelay(violations: number): number {
    // Exponential backoff: 30min, 1hr, 2hr, 4hr, 8hr, 24hr
    const baseDelay = this.blockDurationMs;
    const multiplier = Math.min(Math.pow(2, violations - 1), 48); // Cap at 24 hours
    return baseDelay * multiplier;
  }

  // Log security events for monitoring
  private async logSecurityEvent(identifier: string, event: string, metadata?: any): Promise<void> {
    const logData = {
      timestamp: new Date().toISOString(),
      identifier,
      event,
      metadata
    };
    
    // Sanitize before logging
    const sanitized = securityService.sanitizeLog('Security Event', logData);

    // Store security event for analysis
    try {
      await securityService.storeSecureData(`security_event_${Date.now()}`, logData);
    } catch (error) {
      
    }
  }

  // Reset attempts for an identifier (e.g., after successful login)
  reset(identifier: string): void {
    delete this.store[identifier];
  }

  // Clean up expired entries to prevent memory leaks
  private cleanExpiredEntries(): void {
    const now = Date.now();
    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetTime < now - this.windowMs) {
        delete this.store[key];
      }
    });
  }

  // Get current status for an identifier
  getStatus(identifier: string): { attempts: number; resetTime: number | null } {
    const record = this.store[identifier];
    if (!record) {
      return { attempts: 0, resetTime: null };
    }
    return {
      attempts: record.count,
      resetTime: record.resetTime,
    };
  }
}

// Create instances for different operations with enhanced security
export const loginRateLimiter = new RateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 30 * 60 * 1000, // 30 minutes
  progressiveDelay: true,
  violationThreshold: 10
});

export const signupRateLimiter = new RateLimiter({
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 60 * 60 * 1000, // 1 hour
  progressiveDelay: true,
  violationThreshold: 5
});

export const passwordResetRateLimiter = new RateLimiter({
  maxAttempts: 3,
  windowMs: 30 * 60 * 1000, // 30 minutes
  blockDurationMs: 60 * 60 * 1000, // 1 hour
  progressiveDelay: true,
  violationThreshold: 5
});

// API rate limiters
export const apiRateLimiter = new RateLimiter({
  maxAttempts: 100,
  windowMs: 60 * 1000, // 1 minute
  blockDurationMs: 5 * 60 * 1000, // 5 minutes
  progressiveDelay: true,
  violationThreshold: 20
});

// Content posting rate limiter
export const contentRateLimiter = new RateLimiter({
  maxAttempts: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 30 * 60 * 1000, // 30 minutes
  progressiveDelay: true,
  violationThreshold: 15
});

// Message rate limiter (anti-spam)
export const messageRateLimiter = new RateLimiter({
  maxAttempts: 50,
  windowMs: 60 * 60 * 1000, // 1 hour  
  blockDurationMs: 15 * 60 * 1000, // 15 minutes
  progressiveDelay: true,
  violationThreshold: 10
});

// Helper function to get user identifier (IP address in production, email for demo)
export function getUserIdentifier(email?: string, ipAddress?: string): string {
  // In production, you should use IP address from request headers
  // For React Native, you might use device ID or a combination
  if (ipAddress) {
    return `ip_${ipAddress}`;
  }
  if (email) {
    return `email_${email.toLowerCase()}`;
  }
  // Fallback to a timestamp-based identifier (not ideal for production)
  return `device_${Date.now()}`;
}

// Format retry after message
export function formatRetryMessage(retryAfterSeconds: number): string {
  if (retryAfterSeconds < 60) {
    return `Please try again in ${retryAfterSeconds} seconds`;
  }
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}`;
}

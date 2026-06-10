"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordResetRateLimiter = exports.signupRateLimiter = exports.loginRateLimiter = void 0;
exports.getUserIdentifier = getUserIdentifier;
exports.formatRetryMessage = formatRetryMessage;
class RateLimiter {
    constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000, blockDurationMs = 30 * 60 * 1000) {
        this.store = {};
        this.maxAttempts = maxAttempts;
        this.windowMs = windowMs; // 15 minutes by default
        this.blockDurationMs = blockDurationMs; // 30 minutes block by default
    }
    // Check if a request should be allowed
    checkLimit(identifier) {
        const now = Date.now();
        const record = this.store[identifier];
        // Clean expired entries periodically
        this.cleanExpiredEntries();
        if (!record || now > record.resetTime) {
            // First request or window expired
            this.store[identifier] = {
                count: 1,
                resetTime: now + this.windowMs,
            };
            return {
                allowed: true,
                remainingAttempts: this.maxAttempts - 1
            };
        }
        if (record.count >= this.maxAttempts) {
            // Rate limit exceeded
            const retryAfter = Math.max(0, record.resetTime - now);
            // If they've been hitting the limit repeatedly, extend the block
            if (record.count > this.maxAttempts * 2) {
                record.resetTime = now + this.blockDurationMs;
            }
            return {
                allowed: false,
                retryAfter: Math.ceil(retryAfter / 1000), // Convert to seconds
                remainingAttempts: 0
            };
        }
        // Increment counter
        record.count++;
        return {
            allowed: true,
            remainingAttempts: this.maxAttempts - record.count
        };
    }
    // Reset attempts for an identifier (e.g., after successful login)
    reset(identifier) {
        delete this.store[identifier];
    }
    // Clean up expired entries to prevent memory leaks
    cleanExpiredEntries() {
        const now = Date.now();
        Object.keys(this.store).forEach((key) => {
            if (this.store[key].resetTime < now - this.windowMs) {
                delete this.store[key];
            }
        });
    }
    // Get current status for an identifier
    getStatus(identifier) {
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
// Create instances for different auth operations
exports.loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000, 30 * 60 * 1000); // 5 attempts per 15 min
exports.signupRateLimiter = new RateLimiter(3, 60 * 60 * 1000, 60 * 60 * 1000); // 3 attempts per hour
exports.passwordResetRateLimiter = new RateLimiter(3, 30 * 60 * 1000, 60 * 60 * 1000); // 3 attempts per 30 min
// Helper function to get user identifier (IP address in production, email for demo)
function getUserIdentifier(email, ipAddress) {
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
function formatRetryMessage(retryAfterSeconds) {
    if (retryAfterSeconds < 60) {
        return `Please try again in ${retryAfterSeconds} seconds`;
    }
    const minutes = Math.ceil(retryAfterSeconds / 60);
    return `Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}`;
}

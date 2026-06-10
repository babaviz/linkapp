/**
 * API Security Middleware
 * Handles HTTPS enforcement, API key validation, request sanitization, and security headers
 */

import securityService from '../services/securityService';
import contentSafetyService from '../services/contentSafetyService';

interface ApiRequest {
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
}

interface ApiResponse {
  data?: any;
  error?: string;
  status: number;
}

interface SecurityHeaders {
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Strict-Transport-Security': string;
  'Content-Security-Policy': string;
  'Referrer-Policy': string;
}

class ApiMiddleware {
  private securityHeaders: SecurityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };

  /**
   * Process API request with security checks
   */
  async processRequest(request: ApiRequest): Promise<ApiRequest> {
    // 1. Enforce HTTPS (but allow localhost in development)
    const isDevelopmentUrl = request.url.includes('localhost') || 
                           request.url.includes('127.0.0.1') || 
                           request.url.includes('192.168.');
    
    if (!isDevelopmentUrl) {
      request.url = securityService.enforceHTTPS(request.url);
    }

    // 2. Validate URL
    if (!this.isValidUrl(request.url)) {
      throw new Error('Invalid API URL');
    }

    // 3. Sanitize request body
    if (request.body) {
      request.body = await this.sanitizeRequestBody(request.body);
    }

    // 4. Sanitize query parameters
    if (request.params) {
      request.params = await this.sanitizeParams(request.params);
    }

    // 5. Add security headers
    request.headers = {
      ...request.headers,
      ...this.getSecurityHeaders()
    };

    // 6. Add API key if required
    const apiKey = await this.getApiKey();
    if (apiKey) {
      request.headers['X-API-Key'] = apiKey;
    }

    return request;
  }

  /**
   * Process API response with security checks
   */
  async processResponse(response: any): Promise<ApiResponse> {
    try {
      // Check for security headers in response
      this.validateResponseHeaders(response.headers);

      // Sanitize response data
      const sanitizedData = await this.sanitizeResponseData(response.data);

      return {
        data: sanitizedData,
        status: response.status || 200
      };
    } catch (error: any) {
      // Sanitize error messages
      const sanitizedError = securityService.sanitizeLog(error.message || 'Unknown error');
      
      return {
        error: sanitizedError.message,
        status: response?.status || 500
      };
    }
  }

  /**
   * Validate URL format and safety
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Check for suspicious patterns
      const suspiciousPatterns = [
        'javascript:',
        'data:',
        'vbscript:',
        'file://',
        'about:'
      ];

      if (suspiciousPatterns.some(pattern => url.toLowerCase().includes(pattern))) {
        return false;
      }

      // Validate protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      // Check for localhost in production
      if (process.env.NODE_ENV === 'production') {
        const localhostPatterns = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
        if (localhostPatterns.some(pattern => urlObj.hostname.includes(pattern))) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sanitize request body to prevent injection attacks
   */
  private async sanitizeRequestBody(body: any): Promise<any> {
    if (typeof body === 'string') {
      return this.sanitizeString(body);
    }

    if (Array.isArray(body)) {
      return Promise.all(body.map(item => this.sanitizeRequestBody(item)));
    }

    if (body && typeof body === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(body)) {
        // Sanitize key
        const sanitizedKey = this.sanitizeString(key);
        
        // Recursively sanitize value
        sanitized[sanitizedKey] = await this.sanitizeRequestBody(value);
      }
      
      return sanitized;
    }

    return body;
  }

  /**
   * Sanitize query parameters
   */
  private async sanitizeParams(params: Record<string, any>): Promise<Record<string, any>> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      // Sanitize parameter name
      const sanitizedKey = this.sanitizeString(key);

      // Sanitize parameter value
      if (typeof value === 'string') {
        sanitized[sanitizedKey] = this.sanitizeString(value);
      } else if (Array.isArray(value)) {
        sanitized[sanitizedKey] = value.map(v => 
          typeof v === 'string' ? this.sanitizeString(v) : v
        );
      } else {
        sanitized[sanitizedKey] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize string to prevent XSS and injection attacks
   */
  private sanitizeString(str: string): string {
    // Remove null bytes
    let sanitized = str.replace(/\0/g, '');

    // HTML encode special characters
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };

    sanitized = sanitized.replace(/[&<>"'\/]/g, match => htmlEntities[match]);

    // Remove potentially dangerous patterns
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi, // Event handlers
      /<iframe/gi,
      /<embed/gi,
      /<object/gi
    ];

    dangerousPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Limit string length to prevent DOS
    const maxLength = 10000;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized.trim();
  }

  /**
   * Sanitize response data
   */
  private async sanitizeResponseData(data: any): Promise<any> {
    // Remove sensitive fields from response
    const sensitiveFields = [
      'password', 'token', 'apiKey', 'secret',
      'creditCard', 'ssn', 'privateKey'
    ];

    if (data && typeof data === 'object') {
      const sanitized = { ...data };
      
      sensitiveFields.forEach(field => {
        if (field in sanitized) {
          delete sanitized[field];
        }
        
        // Check for variations
        const variations = [
          field.toLowerCase(),
          field.toUpperCase(),
          `${field}_hash`,
          `${field}Hash`,
          `encrypted_${field}`,
          `encrypted${field.charAt(0).toUpperCase()}${field.slice(1)}`
        ];
        
        variations.forEach(variation => {
          if (variation in sanitized) {
            delete sanitized[variation];
          }
        });
      });

      return sanitized;
    }

    return data;
  }

  /**
   * Get security headers
   */
  private getSecurityHeaders(): Partial<SecurityHeaders> {
    return { ...this.securityHeaders };
  }

  /**
   * Validate response headers
   */
  private validateResponseHeaders(headers: any): void {
    if (!headers) return;

    // Check for security headers
    const requiredHeaders = ['x-content-type-options', 'x-frame-options'];
    
    requiredHeaders.forEach(header => {
      if (!headers[header]) {
        
      }
    });
  }

  /**
   * Get API key from secure storage
   */
  private async getApiKey(): Promise<string | null> {
    try {
      return await securityService.getSecureData('api_key');
    } catch {
      return null;
    }
  }

  /**
   * Create secure fetch wrapper
   */
  async secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
    // Process request
    const processedRequest = await this.processRequest({
      url,
      method: options.method || 'GET',
      headers: options.headers as Record<string, string>,
      body: options.body
    });

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(processedRequest.url, {
        ...options,
        headers: processedRequest.headers,
        body: processedRequest.body ? JSON.stringify(processedRequest.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check response status
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Validate input to prevent injection
   */
  validateInput(input: string, type: 'email' | 'phone' | 'text' | 'number' | 'url'): boolean {
    const validators: Record<string, RegExp> = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^\+?[\d\s()-]+$/,
      text: /^[a-zA-Z0-9\s\-.,!?'"]+$/,
      number: /^\d+$/,
      url: /^https?:\/\/.+/
    };

    const validator = validators[type];
    if (!validator) return false;

    // Additional SQL injection prevention
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER|EXEC|SCRIPT)\b)/gi,
      /(--|\||;|\/\*|\*\/|xp_|sp_|0x)/gi,
      /('|(\')|"|(\")|(\\))/g
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        return false;
      }
    }

    return validator.test(input);
  }

  /**
   * Rate limit check for API calls
   */
  async checkApiRateLimit(userId: string, endpoint: string): Promise<boolean> {
    const rateLimitResult = await contentSafetyService.checkRateLimit(userId, 'api');
    return rateLimitResult.allowed;
  }

  /**
   * Generate CSRF token
   */
  async generateCSRFToken(): Promise<string> {
    const token = await securityService.generateSecureToken(32);
    await securityService.storeSecureData('csrf_token', {
      token,
      createdAt: new Date().toISOString()
    });
    return token;
  }

  /**
   * Validate CSRF token
   */
  async validateCSRFToken(token: string): Promise<boolean> {
    try {
      const storedData = await securityService.getSecureData('csrf_token');
      
      if (!storedData || storedData.token !== token) {
        return false;
      }

      // Check token age (max 1 hour)
      const createdAt = new Date(storedData.createdAt);
      const now = new Date();
      const ageInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      return ageInHours < 1;
    } catch {
      return false;
    }
  }
}

export const apiMiddleware = new ApiMiddleware();
export default apiMiddleware;

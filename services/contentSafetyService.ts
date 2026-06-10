/**
 * Enhanced Content Safety Service
 * Advanced content moderation, user reporting, and safety features
 */

import { supabase } from './supabaseClient';
import contentFilterService from './contentFilterService';
import securityService from './securityService';

interface ContentReportData {
  id: string;
  contentType: 'property' | 'job' | 'service' | 'message' | 'profile';
  contentId: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  description?: string;
  evidence?: string[];
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  resolution?: string;
}

interface UserReportStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  falseReports: number;
  trustScore: number;
}

interface ContentModerationResult {
  safe: boolean;
  confidence: number;
  issues: string[];
  actions: string[];
  metadata?: Record<string, any>;
}

interface RateLimitConfig {
  maxRequests: number;
  timeWindow: number; // in seconds
  blockDuration: number; // in seconds
}

interface SpamDetectionResult {
  isSpam: boolean;
  confidence: number;
  indicators: string[];
}

class ContentSafetyService {
  private userReportLimits: Map<string, { count: number; resetTime: Date }> = new Map();
  private blockedUsers: Map<string, Date> = new Map();
  private contentCache: Map<string, ContentModerationResult> = new Map();
  
  private rateLimitConfigs: Record<string, RateLimitConfig> = {
    report: { maxRequests: 5, timeWindow: 3600, blockDuration: 3600 },
    post: { maxRequests: 10, timeWindow: 3600, blockDuration: 1800 },
    message: { maxRequests: 50, timeWindow: 3600, blockDuration: 900 },
    search: { maxRequests: 100, timeWindow: 3600, blockDuration: 300 }
  };

  private inappropriateContentPatterns = [
    // Illegal activities
    { pattern: /\b(drugs?|cocaine|heroin|meth|weed|marijuana)\b/gi, severity: 'high', category: 'illegal' },
    { pattern: /\b(weapon|gun|knife|bomb|explosive)\b/gi, severity: 'critical', category: 'violence' },
    
    // Adult content
    { pattern: /\b(escort|prostitut|sex\s+work|adult\s+service)\b/gi, severity: 'high', category: 'adult' },
    { pattern: /\b(nude|naked|explicit|nsfw)\b/gi, severity: 'medium', category: 'adult' },
    
    // Harassment and hate
    { pattern: /\b(kill|murder|harm|hurt|attack)\s+(you|yourself|them)\b/gi, severity: 'critical', category: 'threat' },
    { pattern: /\b(hate|racist|sexist|discrimination)\b/gi, severity: 'high', category: 'hate' },
    
    // Scams and fraud
    { pattern: /\b(send\s+money|wire\s+transfer|bitcoin|crypto\s+payment)\b/gi, severity: 'high', category: 'scam' },
    { pattern: /\b(lottery|inheritance|million\s+dollars|prize\s+winner)\b/gi, severity: 'medium', category: 'scam' },
    
    // Personal information
    { pattern: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, severity: 'high', category: 'pii' }, // SSN
    { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, severity: 'high', category: 'pii' }, // Credit card
  ];

  /**
   * Submit a content report with enhanced validation
   */
  async reportContent(
    reportData: Omit<ContentReportData, 'id' | 'createdAt' | 'status' | 'priority'>
  ): Promise<{ success: boolean; reportId?: string; error?: string }> {
    try {
      // Check rate limit for reporter
      const rateLimitCheck = await this.checkRateLimit(reportData.reporterId, 'report');
      if (!rateLimitCheck.allowed) {
        return { 
          success: false, 
          error: `Too many reports. Please wait ${Math.ceil(rateLimitCheck.retryAfter / 60)} minutes.` 
        };
      }

      // Validate report content
      const validation = await this.validateReport(reportData);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Calculate priority based on reason and content
      const priority = this.calculateReportPriority(reportData.reason, reportData.description);

      // Store encrypted report
      const reportId = await securityService.generateSecureToken(16);
      const encryptedReport = {
        id: reportId,
        ...reportData,
        description: reportData.description ? 
          securityService.encryptData(reportData.description) : undefined,
        status: 'pending' as const,
        priority,
        createdAt: new Date()
      };

      // Store in database
      const { error } = await (supabase
        .from('content_reports') as any)
        .insert(encryptedReport);

      if (error) throw error;

      // Trigger automatic review for high-priority reports
      if (priority === 'critical' || priority === 'high') {
        await this.triggerAutomaticReview(reportId, encryptedReport);
      }

      // Update reporter stats
      await this.updateReporterStats(reportData.reporterId);

      return { success: true, reportId };
    } catch (error) {
      
      return { success: false, error: 'Failed to submit report. Please try again.' };
    }
  }

  /**
   * Enhanced content moderation with multiple checks
   */
  async moderateContent(
    content: string,
    contentType: string,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<ContentModerationResult> {
    // Check cache first
    const cacheKey = `${contentType}_${userId}_${securityService.hashData(content)}`;
    const cached = this.contentCache.get(cacheKey);
    if (cached) return cached;

    const issues: string[] = [];
    const actions: string[] = [];
    let overallSafety = true;
    let confidence = 0;

    // 1. Run pattern-based content filtering
    const patternCheck = await this.checkContentPatterns(content);
    if (!patternCheck.safe) {
      issues.push(...patternCheck.issues);
      overallSafety = false;
      confidence = Math.max(confidence, patternCheck.confidence);
    }

    // 2. Run AI content filter service
    const aiCheck = await contentFilterService.performSafetyCheck({
      id: `temp_${Date.now()}`,
      type: contentType as any,
      content,
      userId,
      metadata
    });

    if (!aiCheck.is_safe) {
      issues.push(...aiCheck.detected_issues.map(i => i.description));
      actions.push(...aiCheck.recommended_actions);
      overallSafety = false;
      confidence = Math.max(confidence, aiCheck.confidence_score);
    }

    // 3. Check for spam
    const spamCheck = await this.detectSpam(content, contentType);
    if (spamCheck.isSpam) {
      issues.push('Content appears to be spam');
      issues.push(...spamCheck.indicators);
      actions.push('flag_spam', 'rate_limit_user');
      overallSafety = false;
      confidence = Math.max(confidence, spamCheck.confidence);
    }

    // 4. Check user history
    const userHistory = await this.checkUserModerationHistory(userId);
    if (userHistory.riskLevel === 'high') {
      actions.push('manual_review', 'monitor_user');
      confidence = Math.min(confidence + 0.1, 1);
    }

    // Determine final actions based on severity
    if (!overallSafety) {
      if (confidence > 0.9) {
        actions.push('block_content', 'notify_moderators');
      } else if (confidence > 0.7) {
        actions.push('hold_for_review');
      } else {
        actions.push('flag_content');
      }
    }

    const result: ContentModerationResult = {
      safe: overallSafety,
      confidence,
      issues: [...new Set(issues)], // Remove duplicates
      actions: [...new Set(actions)],
      metadata: {
        patternMatches: patternCheck.matches,
        spamScore: spamCheck.confidence,
        userRisk: userHistory.riskLevel
      }
    };

    // Cache result for 5 minutes
    this.contentCache.set(cacheKey, result);
    setTimeout(() => this.contentCache.delete(cacheKey), 5 * 60 * 1000);

    return result;
  }

  /**
   * Check content against inappropriate patterns
   */
  private async checkContentPatterns(
    content: string
  ): Promise<{ safe: boolean; confidence: number; issues: string[]; matches: number }> {
    const issues: string[] = [];
    let matches = 0;
    let maxSeverity = 0;

    for (const { pattern, severity, category } of this.inappropriateContentPatterns) {
      const contentMatches = content.match(pattern);
      if (contentMatches && contentMatches.length > 0) {
        matches += contentMatches.length;
        issues.push(`Detected ${category} content (${contentMatches.length} instances)`);
        
        const severityScore = severity === 'critical' ? 1 : 
                            severity === 'high' ? 0.8 : 
                            severity === 'medium' ? 0.5 : 0.3;
        maxSeverity = Math.max(maxSeverity, severityScore);
      }
    }

    return {
      safe: matches === 0,
      confidence: maxSeverity,
      issues,
      matches
    };
  }

  /**
   * Detect spam content
   */
  private async detectSpam(
    content: string,
    contentType: string
  ): Promise<SpamDetectionResult> {
    const indicators: string[] = [];
    let spamScore = 0;

    // Check for excessive caps
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.5) {
      indicators.push('Excessive capitalization');
      spamScore += 0.3;
    }

    // Check for repeated content
    const words = content.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionRatio = 1 - (uniqueWords.size / words.length);
    if (repetitionRatio > 0.5) {
      indicators.push('Highly repetitive content');
      spamScore += 0.4;
    }

    // Check for excessive links
    const urlCount = (content.match(/https?:\/\/[^\s]+/g) || []).length;
    if (urlCount > 3) {
      indicators.push(`Excessive URLs (${urlCount})`);
      spamScore += 0.3;
    }

    // Check for spam keywords
    const spamKeywords = [
      'click here', 'buy now', 'limited time', 'act now', 
      'make money', 'work from home', 'congratulations', 'winner'
    ];
    
    const spamKeywordCount = spamKeywords.filter(
      keyword => content.toLowerCase().includes(keyword)
    ).length;
    
    if (spamKeywordCount > 2) {
      indicators.push(`Multiple spam keywords detected (${spamKeywordCount})`);
      spamScore += 0.4;
    }

    // Check for phone number spam
    const phoneNumbers = content.match(/\+?\d{10,}/g) || [];
    if (phoneNumbers.length > 2) {
      indicators.push(`Multiple phone numbers (${phoneNumbers.length})`);
      spamScore += 0.3;
    }

    return {
      isSpam: spamScore > 0.6,
      confidence: Math.min(spamScore, 1),
      indicators
    };
  }

  /**
   * Rate limiting implementation
   */
  async checkRateLimit(
    userId: string,
    action: string
  ): Promise<{ allowed: boolean; retryAfter: number }> {
    const config = this.rateLimitConfigs[action] || 
      { maxRequests: 10, timeWindow: 3600, blockDuration: 600 };

    // Check if user is blocked
    const blockExpiry = this.blockedUsers.get(userId);
    if (blockExpiry && blockExpiry > new Date()) {
      return {
        allowed: false,
        retryAfter: Math.ceil((blockExpiry.getTime() - Date.now()) / 1000)
      };
    }

    // Get or create rate limit entry
    const userLimit = this.userReportLimits.get(userId) || 
      { count: 0, resetTime: new Date(Date.now() + config.timeWindow * 1000) };

    // Check if window has expired
    if (userLimit.resetTime < new Date()) {
      userLimit.count = 0;
      userLimit.resetTime = new Date(Date.now() + config.timeWindow * 1000);
    }

    // Check rate limit
    if (userLimit.count >= config.maxRequests) {
      // Block user
      const blockUntil = new Date(Date.now() + config.blockDuration * 1000);
      this.blockedUsers.set(userId, blockUntil);
      
      return {
        allowed: false,
        retryAfter: config.blockDuration
      };
    }

    // Increment counter
    userLimit.count++;
    this.userReportLimits.set(userId, userLimit);

    return { allowed: true, retryAfter: 0 };
  }

  /**
   * Validate report data
   */
  private async validateReport(
    reportData: any
  ): Promise<{ valid: boolean; error?: string }> {
    // Check required fields
    if (!reportData.contentId || !reportData.contentType || !reportData.reason) {
      return { valid: false, error: 'Missing required information' };
    }

    // Validate reason
    const validReasons = [
      'inappropriate', 'spam', 'scam', 'harassment', 
      'violence', 'illegal', 'false_information', 'other'
    ];
    
    if (!validReasons.includes(reportData.reason)) {
      return { valid: false, error: 'Invalid report reason' };
    }

    // Check description length if provided
    if (reportData.description && reportData.description.length > 1000) {
      return { valid: false, error: 'Description too long (max 1000 characters)' };
    }

    // Prevent self-reporting
    if (reportData.reporterId === reportData.reportedUserId) {
      return { valid: false, error: 'Cannot report your own content' };
    }

    return { valid: true };
  }

  /**
   * Calculate report priority
   */
  private calculateReportPriority(
    reason: string,
    description?: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical priority reasons
    if (['violence', 'illegal', 'threat'].includes(reason)) {
      return 'critical';
    }

    // High priority reasons
    if (['harassment', 'scam', 'hate'].includes(reason)) {
      return 'high';
    }

    // Check description for urgent keywords
    if (description) {
      const urgentKeywords = ['urgent', 'immediate', 'danger', 'emergency', 'threat'];
      const hasUrgentKeyword = urgentKeywords.some(
        keyword => description.toLowerCase().includes(keyword)
      );
      if (hasUrgentKeyword) {
        return 'high';
      }
    }

    // Default priorities
    if (['inappropriate', 'adult'].includes(reason)) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Trigger automatic review for high-priority reports
   */
  private async triggerAutomaticReview(
    reportId: string,
    report: ContentReportData
  ): Promise<void> {
    try {
      // Immediately hide/restrict the reported content
      await this.restrictContent(report.contentId, report.contentType);

      // Notify moderators
      await this.notifyModerators(reportId, report);

      // Log for audit
      const sanitized = securityService.sanitizeLog('High-priority report triggered', report);
      
    } catch (error) {
      
    }
  }

  /**
   * Restrict access to reported content
   */
  private async restrictContent(
    contentId: string,
    contentType: string
  ): Promise<void> {
    try {
      // Update content status in database
      const table = this.getContentTable(contentType);
      if (table) {
        await supabase
          .from(table as any)
          .update({ 
            is_restricted: true,
            restriction_reason: 'pending_review',
            restricted_at: new Date().toISOString()
          } as any)
          .eq('id', contentId);
      }
    } catch (error) {
      
    }
  }

  /**
   * Get database table name for content type
   */
  private getContentTable(contentType: string): string | null {
    const tableMap: Record<string, string> = {
      property: 'property_listings',
      job: 'job_postings',
      service: 'service_listings',
      message: 'messages',
      profile: 'users'
    };
    return tableMap[contentType] || null;
  }

  /**
   * Notify moderators about high-priority reports
   */
  private async notifyModerators(
    reportId: string,
    report: ContentReportData
  ): Promise<void> {
    // Implementation would send push notifications or emails to moderators
    
  }

  /**
   * Update reporter statistics
   */
  private async updateReporterStats(userId: string): Promise<void> {
    try {
      // Increment report count
      const { data, error } = await (supabase
        .from('user_report_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle() as any);

      if (error) throw error;

      if (data) {
        const currentData = data as any;
        await (supabase
          .from('user_report_stats')
          .update({
            total_reports: (currentData.total_reports || 0) + 1,
            pending_reports: (currentData.pending_reports || 0) + 1,
            last_report_at: new Date().toISOString()
          } as any)
          .eq('user_id', userId) as any);
      } else {
        await (supabase
          .from('user_report_stats')
          .insert({
            user_id: userId,
            total_reports: 1,
            pending_reports: 1,
            resolved_reports: 0,
            false_reports: 0,
            trust_score: 50,
            last_report_at: new Date().toISOString()
          } as any) as any);
      }
    } catch (error) {
      
    }
  }

  /**
   * Check user's moderation history
   */
  private async checkUserModerationHistory(
    userId: string
  ): Promise<{ riskLevel: 'low' | 'medium' | 'high'; violations: number }> {
    try {
      const { data } = await (supabase
        .from('user_moderation_history')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) as any);

      const violations = data?.length || 0;
      
      if (violations >= 5) return { riskLevel: 'high', violations };
      if (violations >= 2) return { riskLevel: 'medium', violations };
      return { riskLevel: 'low', violations };
    } catch (error) {
      
      return { riskLevel: 'low', violations: 0 };
    }
  }

  /**
   * Clean up old data
   */
  startCleanupTask(): void {
    // Clean up expired blocks every hour
    setInterval(() => {
      const now = new Date();
      for (const [userId, expiry] of this.blockedUsers.entries()) {
        if (expiry < now) {
          this.blockedUsers.delete(userId);
        }
      }
    }, 60 * 60 * 1000);

    // Clean up old rate limit data every 6 hours
    setInterval(() => {
      const now = new Date();
      for (const [userId, limit] of this.userReportLimits.entries()) {
        if (limit.resetTime < now) {
          this.userReportLimits.delete(userId);
        }
      }
    }, 6 * 60 * 60 * 1000);
  }
}

export const contentSafetyService = new ContentSafetyService();
contentSafetyService.startCleanupTask();
export default contentSafetyService;

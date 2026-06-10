/**
 * Content Filter Service
 * Automated content filtering and safety checks
 */

import { SafetyCheckResult } from '../types/moderation';

interface ContentAnalysisInput {
  id: string;
  type: 'property' | 'job' | 'service' | 'story' | 'profile' | 'message';
  title?: string;
  description?: string;
  content?: string;
  images?: string[];
  metadata?: Record<string, any>;
  userId: string;
}

interface KeywordRule {
  pattern: string;
  severity: number; // 0-100
  category: 'spam' | 'inappropriate' | 'scam' | 'hate' | 'violence' | 'illegal';
  caseSensitive: boolean;
  description: string;
}

interface ContentPattern {
  name: string;
  regex: RegExp;
  weight: number;
  category: string;
}

class ContentFilterService {
  private keywordRules: KeywordRule[] = [
    // Spam patterns
    {
      pattern: '\\b(urgent|act now|limited time|guaranteed|100% free|make money fast)\\b',
      severity: 30,
      category: 'spam',
      caseSensitive: false,
      description: 'Common spam phrases'
    },
    {
      pattern: '\\b(click here|call now|visit now|buy now|order now)\\b',
      severity: 25,
      category: 'spam',
      caseSensitive: false,
      description: 'High-pressure marketing language'
    },

    // Scam indicators
    {
      pattern: '\\b(advance fee|lottery|inheritance|million dollars|tax refund)\\b',
      severity: 80,
      category: 'scam',
      caseSensitive: false,
      description: 'Common scam patterns'
    },
    {
      pattern: '\\b(wire transfer|western union|bitcoin|cryptocurrency payment)\\b',
      severity: 70,
      category: 'scam',
      caseSensitive: false,
      description: 'Suspicious payment methods'
    },

    // Inappropriate content
    {
      pattern: '\\b(explicit|adult|mature|nsfw)\\b',
      severity: 60,
      category: 'inappropriate',
      caseSensitive: false,
      description: 'Adult content indicators'
    },

    // Violence indicators
    {
      pattern: '\\b(kill|murder|bomb|weapon|gun|knife)\\b',
      severity: 90,
      category: 'violence',
      caseSensitive: false,
      description: 'Violence-related terms'
    },
    {
      pattern: '\\b(threat|harm|hurt|attack|destroy)\\b',
      severity: 75,
      category: 'violence',
      caseSensitive: false,
      description: 'Threatening language'
    },

    // Hate speech patterns (basic examples)
    {
      pattern: '\\b(hate|racist|discrimination)\\b',
      severity: 85,
      category: 'hate',
      caseSensitive: false,
      description: 'Hate speech indicators'
    }
  ];

  private behaviorPatterns: ContentPattern[] = [
    {
      name: 'excessive_caps',
      regex: /[A-Z]{10,}/g,
      weight: 20,
      category: 'spam'
    },
    {
      name: 'excessive_punctuation',
      regex: /[!?]{3,}/g,
      weight: 15,
      category: 'spam'
    },
    {
      name: 'repeated_phrases',
      regex: /(.{10,})\1{2,}/gi,
      weight: 40,
      category: 'spam'
    },
    {
      name: 'phone_numbers_multiple',
      regex: /(\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g,
      weight: 25,
      category: 'spam'
    },
    {
      name: 'urls_multiple',
      regex: /(https?:\/\/[^\s]+)/g,
      weight: 30,
      category: 'spam'
    }
  ];

  async performSafetyCheck(content: ContentAnalysisInput): Promise<SafetyCheckResult> {
    const issues: Array<{
      type: string;
      severity: number;
      description: string;
    }> = [];

    let totalRiskScore = 0;
    const textToAnalyze = this.extractText(content);

    // Run keyword analysis
    const keywordIssues = this.analyzeKeywords(textToAnalyze);
    issues.push(...keywordIssues);

    // Run behavior pattern analysis
    const behaviorIssues = this.analyzeBehaviorPatterns(textToAnalyze);
    issues.push(...behaviorIssues);

    // Run content structure analysis
    const structureIssues = this.analyzeContentStructure(content);
    issues.push(...structureIssues);

    // Calculate overall risk score
    totalRiskScore = issues.reduce((sum, issue) => sum + issue.severity, 0) / 100;
    const normalizedScore = Math.min(totalRiskScore, 1.0);

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues, normalizedScore);

    return {
      is_safe: normalizedScore < 0.6,
      confidence_score: this.calculateConfidence(issues, normalizedScore),
      detected_issues: issues,
      recommended_actions: recommendations
    };
  }

  private extractText(content: ContentAnalysisInput): string {
    const textParts = [
      content.title || '',
      content.description || '',
      content.content || ''
    ];
    return textParts.join(' ').toLowerCase();
  }

  private analyzeKeywords(text: string): Array<{
    type: string;
    severity: number;
    description: string;
  }> {
    const issues: Array<{
      type: string;
      severity: number;
      description: string;
    }> = [];

    for (const rule of this.keywordRules) {
      const flags = rule.caseSensitive ? 'g' : 'gi';
      const regex = new RegExp(rule.pattern, flags);
      const matches = text.match(regex);

      if (matches && matches.length > 0) {
        issues.push({
          type: `keyword_${rule.category}`,
          severity: rule.severity,
          description: `${rule.description}: Found ${matches.length} match(es)`
        });
      }
    }

    return issues;
  }

  private analyzeBehaviorPatterns(text: string): Array<{
    type: string;
    severity: number;
    description: string;
  }> {
    const issues: Array<{
      type: string;
      severity: number;
      description: string;
    }> = [];

    for (const pattern of this.behaviorPatterns) {
      const matches = text.match(pattern.regex);
      
      if (matches && matches.length > 0) {
        let severity = pattern.weight;
        
        // Increase severity based on frequency
        if (matches.length > 3) {
          severity += 20;
        } else if (matches.length > 1) {
          severity += 10;
        }

        issues.push({
          type: `behavior_${pattern.name}`,
          severity: Math.min(severity, 100),
          description: `${pattern.name.replace('_', ' ')}: ${matches.length} occurrences`
        });
      }
    }

    return issues;
  }

  private analyzeContentStructure(content: ContentAnalysisInput): Array<{
    type: string;
    severity: number;
    description: string;
  }> {
    const issues: Array<{
      type: string;
      severity: number;
      description: string;
    }> = [];

    const text = this.extractText(content);

    // Check for extremely short content (possible spam)
    if (text.length < 10 && content.type !== 'message') {
      issues.push({
        type: 'content_too_short',
        severity: 30,
        description: 'Content is unusually short'
      });
    }

    // Check for extremely long content (possible spam)
    if (text.length > 5000) {
      issues.push({
        type: 'content_too_long',
        severity: 25,
        description: 'Content is unusually long'
      });
    }

    // Check for duplicate content patterns
    const duplicateScore = this.checkForDuplicatePatterns(text);
    if (duplicateScore > 40) {
      issues.push({
        type: 'duplicate_content',
        severity: duplicateScore,
        description: 'Content appears to contain repetitive patterns'
      });
    }

    // Check image count (property/service specific)
    if ((content.type === 'property' || content.type === 'service') && 
        content.images && content.images.length > 20) {
      issues.push({
        type: 'excessive_images',
        severity: 20,
        description: 'Unusually high number of images'
      });
    }

    return issues;
  }

  private checkForDuplicatePatterns(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const uniqueSentences = new Set(sentences);
    
    if (sentences.length === 0) return 0;
    
    const duplicateRatio = 1 - (uniqueSentences.size / sentences.length);
    return Math.floor(duplicateRatio * 100);
  }

  private generateRecommendations(
    issues: Array<{ type: string; severity: number; description: string }>,
    riskScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (riskScore > 0.8) {
      recommendations.push('auto_remove');
      recommendations.push('notify_moderators');
      recommendations.push('flag_user');
    } else if (riskScore > 0.6) {
      recommendations.push('hold_for_review');
      recommendations.push('notify_moderators');
    } else if (riskScore > 0.4) {
      recommendations.push('flag_content');
      recommendations.push('monitor_user');
    } else if (riskScore > 0.2) {
      recommendations.push('log_activity');
    }

    // Specific recommendations based on issue types
    const issueTypes = issues.map(i => i.type);
    
    if (issueTypes.some(t => t.includes('violence') || t.includes('threat'))) {
      recommendations.push('immediate_review');
      recommendations.push('escalate_security');
    }

    if (issueTypes.some(t => t.includes('scam') || t.includes('fraud'))) {
      recommendations.push('verify_identity');
      recommendations.push('restrict_payments');
    }

    if (issueTypes.some(t => t.includes('spam'))) {
      recommendations.push('rate_limit_user');
      recommendations.push('require_verification');
    }

    return Array.from(new Set(recommendations));
  }

  private calculateConfidence(
    issues: Array<{ type: string; severity: number; description: string }>,
    riskScore: number
  ): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence with more severe issues
    const maxSeverity = Math.max(...issues.map(i => i.severity), 0);
    confidence += (maxSeverity / 100) * 0.3;

    // Higher confidence with more issues detected
    const issueCount = issues.length;
    confidence += Math.min(issueCount * 0.05, 0.2);

    // Adjust based on risk score consistency
    if (riskScore > 0.8 && issues.length > 3) {
      confidence += 0.1;
    }

    return Math.min(confidence, 0.95);
  }

  // Content preprocessing for better analysis
  async preprocessContent(content: ContentAnalysisInput): Promise<ContentAnalysisInput> {
    const processed = { ...content };

    // Clean and normalize text
    if (processed.description) {
      processed.description = this.normalizeText(processed.description);
    }
    if (processed.title) {
      processed.title = this.normalizeText(processed.title);
    }
    if (processed.content) {
      processed.content = this.normalizeText(processed.content);
    }

    return processed;
  }

  private normalizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s.,!?-]/g, '') // Remove special characters except basic punctuation
      .toLowerCase();
  }

  // Whitelist management for trusted users/content
  async isWhitelisted(userId: string, contentType: string): Promise<boolean> {
    // This would check against a database of trusted users
    // For now, return false (no whitelist bypass)
    return false;
  }

  // Get filter statistics for dashboard
  async getFilterStats(): Promise<{
    total_checks_today: number;
    flagged_content: number;
    auto_removed: number;
    false_positive_rate: number;
  }> {
    // This would pull real statistics from the database
    return {
      total_checks_today: 1247,
      flagged_content: 23,
      auto_removed: 7,
      false_positive_rate: 0.02
    };
  }
}

export const contentFilterService = new ContentFilterService();
export default contentFilterService;

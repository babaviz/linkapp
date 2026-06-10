/**
 * useContentModeration Hook
 * Integrates content filtering and safety checks into content creation workflow
 */

import { useState, useCallback } from 'react';
import { showDialog } from '../utils/dialogService';
import contentFilterService from '../services/contentFilterService';
import { SafetyCheckResult } from '../types/moderation';

interface ContentModerationOptions {
  autoFilter?: boolean;
  showUserWarnings?: boolean;
  blockHighRiskContent?: boolean;
  requireReviewForFlagged?: boolean;
}

interface ContentSubmission {
  id?: string;
  type: 'property' | 'job' | 'service' | 'story' | 'profile' | 'message';
  title?: string;
  description?: string;
  content?: string;
  images?: string[];
  metadata?: Record<string, unknown>;
  userId: string;
}

interface ModerationResult {
  approved: boolean;
  requiresReview: boolean;
  safetyResult: SafetyCheckResult;
  userMessage?: string;
}

export const useContentModeration = (options: ContentModerationOptions = {}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<ModerationResult | null>(null);

  const {
    showUserWarnings = true,
    blockHighRiskContent = true,
    requireReviewForFlagged = true
  } = options;

  const processModerationResult = useCallback(async (
    safetyResult: SafetyCheckResult
  ): Promise<ModerationResult> => {
    const riskScore = 1 - safetyResult.confidence_score;
    
    // High-risk content (>80% risk)
    if (riskScore > 0.8 && blockHighRiskContent) {
      return {
        approved: false,
        requiresReview: true,
        safetyResult,
        userMessage: 'Your content violates our community guidelines and cannot be published. Please review our policies and try again.'
      };
    }

    // Medium-high risk content (60-80% risk)
    if (riskScore > 0.6) {
      if (requireReviewForFlagged) {
        return {
          approved: false,
          requiresReview: true,
          safetyResult,
          userMessage: 'Your content has been flagged for review. It will be published after approval by our moderation team.'
        };
      } else {
        // Allow but monitor
        return {
          approved: true,
          requiresReview: true,
          safetyResult,
          userMessage: 'Your content has been published but will be monitored for compliance with our guidelines.'
        };
      }
    }

    // Medium risk content (40-60% risk)
    if (riskScore > 0.4) {
      const shouldWarn = showUserWarnings && safetyResult.detected_issues.some(
        issue => issue.severity > 30
      );

      return {
        approved: true,
        requiresReview: false,
        safetyResult,
        userMessage: shouldWarn 
          ? 'Your content has been published. Please ensure it complies with our community guidelines to avoid future issues.'
          : undefined
      };
    }

    // Low risk content (<40% risk)
    return {
      approved: true,
      requiresReview: false,
      safetyResult
    };
  }, [blockHighRiskContent, requireReviewForFlagged, showUserWarnings]);

  const moderateContent = useCallback(async (
    content: ContentSubmission
  ): Promise<ModerationResult> => {
    setIsChecking(true);

    try {
      // Preprocess content for better analysis
      const processedContent = await contentFilterService.preprocessContent({
        id: content.id || '',
        type: content.type,
        title: content.title,
        description: content.description,
        content: content.content,
        images: content.images,
        metadata: content.metadata,
        userId: content.userId
      });

      // Perform safety check
      const safetyResult = await contentFilterService.performSafetyCheck(processedContent);

      // Determine moderation decision
      const moderationResult = await processModerationResult(safetyResult);
      
      setLastResult(moderationResult);
      return moderationResult;

    } catch {
      // Fail-safe: allow content but flag for review
      const failSafeResult: ModerationResult = {
        approved: true,
        requiresReview: true,
        safetyResult: {
          is_safe: false,
          confidence_score: 0.0,
          detected_issues: [{
            type: 'moderation_error',
            severity: 50,
            description: 'Content moderation service unavailable'
          }],
          recommended_actions: ['manual_review']
        },
        userMessage: 'Your content will be reviewed manually due to a technical issue.'
      };

      setLastResult(failSafeResult);
      return failSafeResult;
    } finally {
      setIsChecking(false);
    }
  }, [processModerationResult]);

  const showModerationResult = useCallback((result: ModerationResult) => {
    if (!result.userMessage) return;

    const title = result.approved 
      ? 'Content Published' 
      : result.requiresReview 
      ? 'Content Under Review' 
      : 'Content Blocked';

    showDialog({
      title,
      message: result.userMessage,
      type: result.approved ? 'success' : result.requiresReview ? 'warning' : 'error',
      buttons: [
        {
          text: 'OK',
          style: result.approved ? 'default' : 'cancel'
        },
        ...(result.approved ? [] : [{
          text: 'Guidelines',
          onPress: () => {
            // Navigate to community guidelines
            
          }
        }])
      ]
    });
  }, []);

  const getContentWarnings = useCallback((result: ModerationResult): string[] => {
    const warnings: string[] = [];

    result.safetyResult.detected_issues.forEach(issue => {
      if (issue.severity > 50) {
        warnings.push(`High-risk content detected: ${issue.description}`);
      } else if (issue.severity > 30) {
        warnings.push(`Potential issue: ${issue.description}`);
      }
    });

    return warnings;
  }, []);

  const canPublishContent = useCallback((result: ModerationResult): boolean => {
    return result.approved && !result.requiresReview;
  }, []);

  const getRecommendedChanges = useCallback((result: ModerationResult): string[] => {
    const recommendations: string[] = [];

    result.safetyResult.detected_issues.forEach(issue => {
      switch (issue.type) {
        case 'keyword_spam':
          recommendations.push('Remove promotional language and focus on factual descriptions');
          break;
        case 'keyword_scam':
          recommendations.push('Avoid mentioning money transfers or suspicious payment methods');
          break;
        case 'behavior_excessive_caps':
          recommendations.push('Use normal capitalization instead of all caps');
          break;
        case 'behavior_excessive_punctuation':
          recommendations.push('Reduce excessive punctuation marks');
          break;
        case 'content_too_short':
          recommendations.push('Provide more detailed information about your listing');
          break;
        case 'duplicate_content':
          recommendations.push('Make your content unique and avoid repetitive text');
          break;
        default:
          if (issue.severity > 30) {
            recommendations.push('Review your content for potential guideline violations');
          }
      }
    });

    return Array.from(new Set(recommendations));
  }, []);

  return {
    moderateContent,
    showModerationResult,
    getContentWarnings,
    canPublishContent,
    getRecommendedChanges,
    isChecking,
    lastResult
  };
};

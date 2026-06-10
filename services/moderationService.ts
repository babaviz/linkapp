/**
 * Community Moderation Service
 * Handles content reporting, moderation actions, and safety checks
 */

import { supabase } from './supabaseClient';
import {
  ContentReport,
  ModerationAction,
  UserModerationStatus,
  AutoModerationRule,
  CommunityGuideline,
  ModerationDashboardMetrics,
  ModerationFilter,
  SafetyCheckResult,
  ReportReason,
  ReportStatus,
  ActionType
} from '../types/moderation';

class ModerationService {
  // Content Reporting
  async reportContent(
    contentId: string,
    contentType: string,
    reporterId: string,
    reportedUserId: string,
    reason: ReportReason,
    description?: string,
    evidenceUrls?: string[]
  ): Promise<ContentReport> {
    const reportData = {
      content_id: contentId,
      content_type: contentType,
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      reason,
      description,
      evidence_urls: evidenceUrls,
      status: 'pending' as ReportStatus,
      priority: this.calculatePriority(reason),
      created_at: new Date().toISOString()
    };

    const { data, error } = await (supabase
      .from('content_reports') as any)
      .insert(reportData)
      .select()
      .single();

    if (error) throw error;

    // Trigger auto-moderation check
    await this.runAutoModerationCheck(data);

    return data;
  }

  // Get reports with filtering and pagination
  async getReports(
    filter?: ModerationFilter,
    page: number = 1,
    limit: number = 20
  ): Promise<{ reports: ContentReport[]; total: number }> {
    let query = supabase
      .from('content_reports')
      .select(`
        *,
        reporter:reporter_id(id, full_name),
        reported_user:reported_user_id(id, full_name)
      `, { count: 'exact' });

    // Apply filters
    if (filter) {
      if (filter.status?.length) {
        query = query.in('status', filter.status);
      }
      if (filter.priority?.length) {
        query = query.in('priority', filter.priority);
      }
      if (filter.reason?.length) {
        query = query.in('reason', filter.reason);
      }
      if (filter.content_type?.length) {
        query = query.in('content_type', filter.content_type);
      }
      if (filter.date_range) {
        query = query
          .gte('created_at', filter.date_range.start)
          .lte('created_at', filter.date_range.end);
      }
    }

    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      reports: (data || []) as any,
      total: count || 0
    };
  }

  // Take moderation action
  async takeModerationAction(
    reportId: string,
    targetUserId: string,
    moderatorId: string,
    actionType: ActionType,
    reason: string,
    duration?: number
  ): Promise<ModerationAction> {
    const actionData = {
      report_id: reportId,
      target_user_id: targetUserId,
      moderator_id: moderatorId,
      action_type: actionType,
      reason,
      duration,
      expires_at: duration ? 
        new Date(Date.now() + duration * 60 * 60 * 1000).toISOString() : 
        undefined,
      created_at: new Date().toISOString(),
      is_active: true
    };

    const { data, error } = await (supabase
      .from('moderation_actions') as any)
      .insert(actionData)
      .select()
      .single();

    if (error) throw error;

    // Update user moderation status
    await this.updateUserModerationStatus(targetUserId, actionType);

    // Update report status
    await this.updateReportStatus(reportId, 'resolved');

    return data;
  }

  // Get user moderation status
  async getUserModerationStatus(userId: string): Promise<UserModerationStatus> {
    const { data, error } = await supabase
      .from('user_moderation_status')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!data) {
      // Create new status record
      const newStatus: Partial<UserModerationStatus> = {
        user_id: userId,
        status: 'active',
        warning_count: 0,
        suspension_count: 0,
        total_reports_against: 0,
        total_reports_made: 0,
        reputation_score: 100,
        created_at: new Date().toISOString()
      };

      const { data: created, error: createError } = await (supabase
        .from('user_moderation_status') as any)
        .insert(newStatus)
        .select()
        .single();

      if (createError) throw createError;
      return created as any;
    }

    return data as any;
  }

  // Auto-moderation check
  async runAutoModerationCheck(report: ContentReport): Promise<void> {
    try {
      // Get active auto-moderation rules
      const { data: rules } = await supabase
        .from('auto_moderation_rules')
        .select('*')
        .eq('is_active', true);

      if (!rules || rules.length === 0) return;

      // Run safety checks
      const safetyResult = await this.performSafetyCheck(
        report.content_id,
        report.content_type
      );

      if (!safetyResult.is_safe) {
        // Auto-escalate high-risk content
        if (safetyResult.confidence_score > 0.8) {
          await this.updateReportStatus(report.id, 'escalated');
          
          // Apply immediate protective actions
          for (const action of safetyResult.recommended_actions) {
            if (action === 'hold_content') {
              await this.holdContentForReview(report.content_id);
            }
          }
        }
      }
    } catch (error) {
      
    }
  }

  // Safety check using content analysis
  async performSafetyCheck(
    contentId: string,
    contentType: string
  ): Promise<SafetyCheckResult> {
    // This would integrate with AI/ML services for content analysis
    // For now, returning a mock implementation
    const mockResult: SafetyCheckResult = {
      is_safe: true,
      confidence_score: 0.95,
      detected_issues: [],
      recommended_actions: []
    };

    // In a real implementation, this would:
    // 1. Fetch the content by ID and type
    // 2. Run it through AI content moderation APIs
    // 3. Check against keyword filters
    // 4. Analyze user behavior patterns
    // 5. Return comprehensive safety assessment

    return mockResult;
  }

  // Get moderation dashboard metrics
  async getDashboardMetrics(): Promise<ModerationDashboardMetrics> {
    const today = new Date().toISOString().split('T')[0];

    // Get pending reports count
    const { count: pendingReports } = await supabase
      .from('content_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get resolved today count
    const { count: resolvedToday } = await supabase
      .from('content_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'resolved')
      .gte('resolved_at', today);

    // Get user status counts
    const { count: suspendedUsers } = await supabase
      .from('user_moderation_status')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'suspended');

    const { count: bannedUsers } = await supabase
      .from('user_moderation_status')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'banned');

    // Get top violation types
    const { data: violationTypes } = await supabase
      .from('content_reports')
      .select('reason')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const violationCounts = (violationTypes || []).reduce((acc, report: any) => {
      acc[report.reason] = (acc[report.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topViolationTypes = Object.entries(violationCounts)
      .map(([reason, count]) => ({ reason: reason as ReportReason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      period: 'day',
      total_reports: (pendingReports || 0) + (resolvedToday || 0),
      pending_reports: pendingReports || 0,
      resolved_reports: resolvedToday || 0,
      dismissed_reports: 0,
      average_resolution_time: 2.5, // Would be calculated from report resolution times
      reports_by_reason: violationCounts as Record<ReportReason, number>,
      reports_by_content_type: {},
      actions_taken: {} as Record<ActionType, number>,
      top_reported_users: [],
      moderator_activity: [],
      automated_flags: {
        total: 0,
        accurate: 0,
        false_positives: 0,
        accuracy_rate: 0
      },
      user_appeals: {
        total: 0,
        approved: 0,
        rejected: 0,
        pending: 0
      }
    };
  }

  // Community Guidelines
  async getCommunityGuidelines(): Promise<CommunityGuideline[]> {
    const { data, error } = await supabase
      .from('community_guidelines')
      .select('*')
      .eq('is_active', true)
      .order('created_at');

    if (error) throw error;
    return (data || []) as any;
  }

  // Helper methods
  private calculatePriority(reason: ReportReason): 'low' | 'medium' | 'high' | 'critical' {
    const highPriorityReasons = ['violence_threats', 'illegal_content', 'harassment'];
    const criticalReasons = ['violence_threats', 'illegal_content'];
    
    if (criticalReasons.includes(reason)) return 'critical';
    if (highPriorityReasons.includes(reason)) return 'high';
    if (['scam_fraud', 'hate_speech'].includes(reason)) return 'medium';
    return 'low';
  }

  private async updateUserModerationStatus(
    userId: string, 
    actionType: ActionType
  ): Promise<void> {
    const currentStatus = await this.getUserModerationStatus(userId);
    
    const updateData: Partial<UserModerationStatus> = {};

    switch (actionType) {
      case 'warning':
        updateData.warning_count = currentStatus.warning_count + 1;
        break;
      case 'temporary_suspension':
        updateData.status = 'suspended';
        updateData.suspension_count = currentStatus.suspension_count + 1;
        break;
      case 'permanent_ban':
        updateData.status = 'banned';
        updateData.suspension_count = currentStatus.suspension_count + 3;
        break;
    }

    // Update reputation score
    const penaltyPoints = this.getActionPenalty(actionType);
    updateData.reputation_score = Math.max(0, currentStatus.reputation_score - penaltyPoints);

    await (supabase
      .from('user_moderation_status') as any)
      .update(updateData)
      .eq('user_id', userId);
  }

  private getActionPenalty(actionType: ActionType): number {
    const penalties = {
      warning: 5,
      content_removal: 10,
      temporary_suspension: 25,
      permanent_ban: 100,
      content_flag: 2,
      account_restriction: 15
    };
    return penalties[actionType] || 0;
  }

  private async updateReportStatus(reportId: string, status: ReportStatus): Promise<void> {
    const updateData: any = { status };
    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    await (supabase
      .from('content_reports') as any)
      .update(updateData)
      .eq('id', reportId);
  }

  private async holdContentForReview(contentId: string): Promise<void> {
    // This would mark content as held/hidden pending review
    // Implementation depends on content type and storage
    
  }
}

let instance: ModerationService | null = null;
function getInstance(): ModerationService {
  if (!instance) instance = new ModerationService();
  return instance;
}

export const moderationService = new Proxy({} as ModerationService, {
  get(target, prop) {
    const service = getInstance();
    const value = (service as any)[prop];
    return typeof value === 'function' ? value.bind(service) : value;
  }
});
export default moderationService;

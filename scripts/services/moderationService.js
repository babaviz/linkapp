"use strict";
/**
 * Community Moderation Service
 * Handles content reporting, moderation actions, and safety checks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.moderationService = void 0;
const supabaseClient_1 = require("./supabaseClient");
class ModerationService {
    // Content Reporting
    async reportContent(contentId, contentType, reporterId, reportedUserId, reason, description, evidenceUrls) {
        const reportData = {
            content_id: contentId,
            content_type: contentType,
            reporter_id: reporterId,
            reported_user_id: reportedUserId,
            reason,
            description,
            evidence_urls: evidenceUrls,
            status: 'pending',
            priority: this.calculatePriority(reason),
            created_at: new Date().toISOString()
        };
        const { data, error } = await supabaseClient_1.supabase
            .from('content_reports')
            .insert(reportData)
            .select()
            .single();
        if (error)
            throw error;
        // Trigger auto-moderation check
        await this.runAutoModerationCheck(data);
        return data;
    }
    // Get reports with filtering and pagination
    async getReports(filter, page = 1, limit = 20) {
        let query = supabaseClient_1.supabase
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
        if (error)
            throw error;
        return {
            reports: data || [],
            total: count || 0
        };
    }
    // Take moderation action
    async takeModerationAction(reportId, targetUserId, moderatorId, actionType, reason, duration) {
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
        const { data, error } = await supabaseClient_1.supabase
            .from('moderation_actions')
            .insert(actionData)
            .select()
            .single();
        if (error)
            throw error;
        // Update user moderation status
        await this.updateUserModerationStatus(targetUserId, actionType);
        // Update report status
        await this.updateReportStatus(reportId, 'resolved');
        return data;
    }
    // Get user moderation status
    async getUserModerationStatus(userId) {
        const { data, error } = await supabaseClient_1.supabase
            .from('user_moderation_status')
            .select('*')
            .eq('user_id', userId)
            .single();
        if (error && error.code !== 'PGRST116')
            throw error;
        if (!data) {
            // Create new status record
            const newStatus = {
                user_id: userId,
                warnings_count: 0,
                strikes_count: 0,
                is_suspended: false,
                is_banned: false,
                reputation_score: 100,
                restriction_flags: []
            };
            const { data: created, error: createError } = await supabaseClient_1.supabase
                .from('user_moderation_status')
                .insert(newStatus)
                .select()
                .single();
            if (createError)
                throw createError;
            return created;
        }
        return data;
    }
    // Auto-moderation check
    async runAutoModerationCheck(report) {
        try {
            // Get active auto-moderation rules
            const { data: rules } = await supabaseClient_1.supabase
                .from('auto_moderation_rules')
                .select('*')
                .eq('is_active', true);
            if (!rules || rules.length === 0)
                return;
            // Run safety checks
            const safetyResult = await this.performSafetyCheck(report.content_id, report.content_type);
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
        }
        catch (error) {
            
        }
    }
    // Safety check using content analysis
    async performSafetyCheck(contentId, contentType) {
        // This would integrate with AI/ML services for content analysis
        // For now, returning a mock implementation
        const mockResult = {
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
    async getDashboardMetrics() {
        const today = new Date().toISOString().split('T')[0];
        // Get pending reports count
        const { count: pendingReports } = await supabaseClient_1.supabase
            .from('content_reports')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        // Get resolved today count
        const { count: resolvedToday } = await supabaseClient_1.supabase
            .from('content_reports')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'resolved')
            .gte('resolved_at', today);
        // Get user status counts
        const { count: suspendedUsers } = await supabaseClient_1.supabase
            .from('user_moderation_status')
            .select('*', { count: 'exact', head: true })
            .eq('is_suspended', true);
        const { count: bannedUsers } = await supabaseClient_1.supabase
            .from('user_moderation_status')
            .select('*', { count: 'exact', head: true })
            .eq('is_banned', true);
        // Get top violation types
        const { data: violationTypes } = await supabaseClient_1.supabase
            .from('content_reports')
            .select('reason')
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        const violationCounts = (violationTypes || []).reduce((acc, report) => {
            acc[report.reason] = (acc[report.reason] || 0) + 1;
            return acc;
        }, {});
        const topViolationTypes = Object.entries(violationCounts)
            .map(([reason, count]) => ({ reason: reason, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        return {
            pending_reports: pendingReports || 0,
            resolved_today: resolvedToday || 0,
            total_active_users: 0, // Would be calculated from active user base
            suspended_users: suspendedUsers || 0,
            banned_users: bannedUsers || 0,
            auto_actions_today: 0, // Would be calculated from auto-moderation logs
            average_response_time: 2.5, // Would be calculated from report resolution times
            top_violation_types: topViolationTypes
        };
    }
    // Community Guidelines
    async getCommunityGuidelines() {
        const { data, error } = await supabaseClient_1.supabase
            .from('community_guidelines')
            .select('*')
            .eq('is_active', true)
            .order('created_at');
        if (error)
            throw error;
        return data || [];
    }
    // Helper methods
    calculatePriority(reason) {
        const highPriorityReasons = ['violence_threats', 'illegal_content', 'harassment'];
        const criticalReasons = ['violence_threats', 'illegal_content'];
        if (criticalReasons.includes(reason))
            return 'critical';
        if (highPriorityReasons.includes(reason))
            return 'high';
        if (['scam_fraud', 'hate_speech'].includes(reason))
            return 'medium';
        return 'low';
    }
    async updateUserModerationStatus(userId, actionType) {
        const currentStatus = await this.getUserModerationStatus(userId);
        const updateData = {};
        switch (actionType) {
            case 'warning':
                updateData.warnings_count = currentStatus.warnings_count + 1;
                break;
            case 'temporary_suspension':
                updateData.is_suspended = true;
                updateData.strikes_count = currentStatus.strikes_count + 1;
                break;
            case 'permanent_ban':
                updateData.is_banned = true;
                updateData.strikes_count = currentStatus.strikes_count + 3;
                break;
        }
        // Update reputation score
        const penaltyPoints = this.getActionPenalty(actionType);
        updateData.reputation_score = Math.max(0, currentStatus.reputation_score - penaltyPoints);
        await supabaseClient_1.supabase
            .from('user_moderation_status')
            .update(updateData)
            .eq('user_id', userId);
    }
    getActionPenalty(actionType) {
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
    async updateReportStatus(reportId, status) {
        const updateData = { status };
        if (status === 'resolved') {
            updateData.resolved_at = new Date().toISOString();
        }
        await supabaseClient_1.supabase
            .from('content_reports')
            .update(updateData)
            .eq('id', reportId);
    }
    async holdContentForReview(contentId) {
        // This would mark content as held/hidden pending review
        // Implementation depends on content type and storage
        
    }
}
exports.moderationService = new ModerationService();
exports.default = exports.moderationService;

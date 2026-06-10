/**
 * Moderation Types for LinkApp
 * Community moderation, content reporting, and safety types
 */

// Report reasons
export type ReportReason = 
  | 'inappropriate_content'
  | 'spam'
  | 'harassment'
  | 'fake_listing'
  | 'scam'
  | 'scam_fraud'
  | 'violence'
  | 'violence_threats'
  | 'hate_speech'
  | 'adult_content'
  | 'copyright_violation'
  | 'copyright'
  | 'misinformation'
  | 'false_information'
  | 'impersonation'
  | 'illegal_content'
  | 'other';

// Report status
export type ReportStatus = 
  | 'pending'
  | 'reviewing' 
  | 'resolved'
  | 'dismissed'
  | 'escalated';

// Action types
export type ActionType = 
  | 'warning'
  | 'content_removal'
  | 'temporary_suspension'
  | 'permanent_ban'
  | 'account_restriction'
  | 'content_flag'
  | 'no_action';

// Content report
export interface ContentReport {
  id: string;
  content_id: string;
  content_type: 'property' | 'job' | 'service' | 'profile' | 'message';
  content_url?: string;
  reporter_id: string;
  reported_user_id: string;
  reason: ReportReason;
  description: string;
  evidence_urls?: string[];
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_moderator_id?: string;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
  resolution_notes?: string;
  automated_flags?: {
    flag_type: string;
    confidence: number;
    details: Record<string, any>;
  }[];
}

// Moderation action
export interface ModerationAction {
  id: string;
  report_id: string;
  moderator_id: string;
  target_user_id: string;
  target_content_id?: string;
  action_type: ActionType;
  reason: string;
  duration?: number; // in hours for temporary actions
  notes?: string;
  created_at: string;
  expires_at?: string;
  reversed_at?: string;
  reversed_by?: string;
  reversal_reason?: string;
}

// User moderation status
export interface UserModerationStatus {
  user_id: string;
  status: 'active' | 'warned' | 'restricted' | 'suspended' | 'banned';
  restriction_type?: 'posting' | 'messaging' | 'commenting' | 'full_access';
  restriction_expires_at?: string;
  warning_count: number;
  suspension_count: number;
  total_reports_against: number;
  total_reports_made: number;
  reputation_score: number;
  last_violation_at?: string;
  created_at: string;
  updated_at?: string;
}

// Community guideline
export interface CommunityGuideline {
  id: string;
  title: string;
  description: string;
  category: 'content' | 'behavior' | 'safety' | 'legal' | 'platform';
  severity: 'minor' | 'major' | 'severe';
  examples: {
    allowed: string[];
    not_allowed: string[];
  };
  consequences: ActionType[];
  created_at: string;
  updated_at?: string;
  active: boolean;
}

// Moderation dashboard metrics
export interface ModerationDashboardMetrics {
  period: 'day' | 'week' | 'month' | 'year';
  total_reports: number;
  pending_reports: number;
  resolved_reports: number;
  dismissed_reports: number;
  average_resolution_time: number; // in hours
  reports_by_reason: Record<ReportReason, number>;
  reports_by_content_type: Record<string, number>;
  actions_taken: Record<ActionType, number>;
  top_reported_users: {
    user_id: string;
    username: string;
    report_count: number;
  }[];
  moderator_activity: {
    moderator_id: string;
    username: string;
    reports_handled: number;
    average_resolution_time: number;
  }[];
  automated_flags: {
    total: number;
    accurate: number;
    false_positives: number;
    accuracy_rate: number;
  };
  user_appeals: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
}

// Moderation filter
export interface ModerationFilter {
  status?: ('pending' | 'investigating' | 'resolved' | 'dismissed')[];
  priority?: ('low' | 'medium' | 'high' | 'urgent')[];
  reason?: ReportReason[];
  content_type?: ('property' | 'job' | 'service' | 'profile' | 'message')[];
  date_range?: {
    start: string;
    end: string;
  };
  assigned_moderator?: string;
  reporter_id?: string;
  reported_user_id?: string;
}

// Content safety score
export interface ContentSafetyScore {
  content_id: string;
  content_type: string;
  overall_score: number; // 0-100, higher is safer
  risk_factors: {
    category: string;
    score: number;
    confidence: number;
    details: string;
  }[];
  automated_flags: {
    flag_type: string;
    severity: 'low' | 'medium' | 'high';
    confidence: number;
    description: string;
  }[];
  manual_review_required: boolean;
  last_analyzed: string;
}

// Safety check result
export interface SafetyCheckResult {
  is_safe: boolean;
  confidence_score: number;
  detected_issues: {
    type: string;
    severity: number;
    description: string;
  }[];
  recommended_actions: string[];
}


// Moderation queue item
export interface ModerationQueueItem {
  id: string;
  content_id: string;
  content_type: string;
  content_preview: {
    title?: string;
    description?: string;
    image_url?: string;
  };
  reports: ContentReport[];
  safety_score?: ContentSafetyScore;
  priority_score: number;
  estimated_review_time: number; // in minutes
  assigned_moderator_id?: string;
  assigned_at?: string;
  created_at: string;
}

// User appeal
export interface UserAppeal {
  id: string;
  user_id: string;
  moderation_action_id: string;
  reason: string;
  description: string;
  evidence_urls?: string[];
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at?: string;
}

// Automated moderation rule
export interface AutoModerationRule {
  id: string;
  name: string;
  description: string;
  content_types: ('property' | 'job' | 'service' | 'profile' | 'message')[];
  conditions: {
    type: 'keyword' | 'pattern' | 'image_analysis' | 'user_behavior' | 'content_similarity';
    parameters: Record<string, any>;
    weight: number;
  }[];
  threshold: number;
  actions: {
    action_type: 'flag' | 'auto_remove' | 'require_review' | 'notify_moderator';
    parameters?: Record<string, any>;
  }[];
  active: boolean;
  created_at: string;
  updated_at?: string;
  last_triggered?: string;
  trigger_count: number;
  accuracy_stats: {
    true_positives: number;
    false_positives: number;
    true_negatives: number;
    false_negatives: number;
  };
}

// Moderation notification
export interface ModerationNotification {
  id: string;
  recipient_id: string;
  type: 'report_submitted' | 'action_taken' | 'appeal_result' | 'warning_issued' | 'content_removed';
  title: string;
  message: string;
  related_content_id?: string;
  related_report_id?: string;
  related_action_id?: string;
  action_required?: boolean;
  read: boolean;
  created_at: string;
  expires_at?: string;
}

// Trust and safety metrics
export interface TrustSafetyMetrics {
  period: 'day' | 'week' | 'month' | 'year';
  platform_health: {
    total_active_users: number;
    users_with_violations: number;
    violation_rate: number;
    repeat_offender_rate: number;
  };
  content_quality: {
    total_content_items: number;
    flagged_content: number;
    removed_content: number;
    content_quality_score: number;
  };
  user_trust: {
    average_reputation_score: number;
    verified_users_percentage: number;
    user_satisfaction_score: number;
  };
  response_times: {
    average_report_resolution: number;
    average_appeal_resolution: number;
    sla_compliance_rate: number;
  };
}

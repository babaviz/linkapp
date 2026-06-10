import type { Database as GeneratedDatabase, Json } from './supabase';

type PublicSchema = GeneratedDatabase['public'];
type GeneratedTables = PublicSchema['Tables'];
type GeneratedFunctions = PublicSchema['Functions'];

type SubscriptionsTable = {
  Row: GeneratedTables['subscriptions']['Row'] & {
    paystack_subscription_code: string | null;
  };
  Insert: GeneratedTables['subscriptions']['Insert'] & {
    paystack_subscription_code?: string | null;
  };
  Update: GeneratedTables['subscriptions']['Update'] & {
    paystack_subscription_code?: string | null;
  };
  Relationships: GeneratedTables['subscriptions']['Relationships'];
};

type CallsTable = {
  Row: {
    id: string;
    created_at: string | null;
    updated_at: string | null;
    caller_id: string | null;
    receiver_id: string | null;
    type: string;
    stream_call_id: string;
    stream_call_cid: string;
    status: string;
    start_time: string | null;
    end_time: string | null;
    duration_seconds: number | null;
  };
  Insert: {
    id?: string;
    created_at?: string | null;
    updated_at?: string | null;
    caller_id?: string | null;
    receiver_id?: string | null;
    type: string;
    stream_call_id: string;
    stream_call_cid: string;
    status?: string;
    start_time?: string | null;
    end_time?: string | null;
    duration_seconds?: number | null;
  };
  Update: {
    id?: string;
    created_at?: string | null;
    updated_at?: string | null;
    caller_id?: string | null;
    receiver_id?: string | null;
    type?: string;
    stream_call_id?: string;
    stream_call_cid?: string;
    status?: string;
    start_time?: string | null;
    end_time?: string | null;
    duration_seconds?: number | null;
  };
  Relationships: [];
};

type CallHistoryTable = CallsTable;

type DateMiFeatureUsageTable = {
  Row: {
    id: string;
    created_at: string | null;
    user_id: string;
    feature: string;
    metadata: Json | null;
  };
  Insert: {
    id?: string;
    created_at?: string | null;
    user_id: string;
    feature: string;
    metadata?: Json | null;
  };
  Update: {
    id?: string;
    created_at?: string | null;
    user_id?: string;
    feature?: string;
    metadata?: Json | null;
  };
  Relationships: [];
};

type JobApplicationsTable = {
  Row: {
    id: string;
    created_at: string | null;
    updated_at: string | null;
    job_id: string;
    applicant_id: string;
    applicant_name: string | null;
    applicant_email: string | null;
    applicant_phone: string | null;
    cover_letter: string | null;
    resume_url: string | null;
    status: string | null;
    applied_at: string | null;
    reviewed_at: string | null;
    notes: string | null;
  };
  Insert: {
    id?: string;
    created_at?: string | null;
    updated_at?: string | null;
    job_id: string;
    applicant_id: string;
    applicant_name?: string | null;
    applicant_email?: string | null;
    applicant_phone?: string | null;
    cover_letter?: string | null;
    resume_url?: string | null;
    status?: string | null;
    applied_at?: string | null;
    reviewed_at?: string | null;
    notes?: string | null;
  };
  Update: {
    id?: string;
    created_at?: string | null;
    updated_at?: string | null;
    job_id?: string;
    applicant_id?: string;
    applicant_name?: string | null;
    applicant_email?: string | null;
    applicant_phone?: string | null;
    cover_letter?: string | null;
    resume_url?: string | null;
    status?: string | null;
    applied_at?: string | null;
    reviewed_at?: string | null;
    notes?: string | null;
  };
  Relationships: [];
};

type JobAlertsTable = {
  Row: {
    id: string;
    created_at: string | null;
    updated_at: string | null;
    user_id: string;
    title: string | null;
    criteria: Json | null;
    is_active: boolean | null;
  };
  Insert: {
    id?: string;
    created_at?: string | null;
    updated_at?: string | null;
    user_id: string;
    title?: string | null;
    criteria?: Json | null;
    is_active?: boolean | null;
  };
  Update: {
    id?: string;
    created_at?: string | null;
    updated_at?: string | null;
    user_id?: string;
    title?: string | null;
    criteria?: Json | null;
    is_active?: boolean | null;
  };
  Relationships: [];
};

type UserSkillsTable = {
  Row: {
    id: string;
    created_at: string | null;
    updated_at: string | null;
    user_id: string;
    skill: string;
    metadata: Json | null;
  };
  Insert: {
    id?: string;
    created_at?: string | null;
    updated_at?: string | null;
    user_id: string;
    skill: string;
    metadata?: Json | null;
  };
  Update: {
    id?: string;
    created_at?: string | null;
    updated_at?: string | null;
    user_id?: string;
    skill?: string;
    metadata?: Json | null;
  };
  Relationships: [];
};

type UserPreferencesTable = {
  Row: {
    id: string;
    created_at: string | null;
    updated_at: string | null;
    user_id: string;
    notification_email: boolean | null;
    notification_push: boolean | null;
    notification_sms: boolean | null;
    notification_categories: Json | null;
    profile_visibility: string | null;
    show_location: boolean | null;
    show_online_status: boolean | null;
    allow_direct_messages: boolean | null;
    language: string | null;
    theme: string | null;
  };
  Insert: {
    id?: string;
    created_at?: string | null;
    updated_at?: string | null;
    user_id: string;
    notification_email?: boolean | null;
    notification_push?: boolean | null;
    notification_sms?: boolean | null;
    notification_categories?: Json | null;
    profile_visibility?: string | null;
    show_location?: boolean | null;
    show_online_status?: boolean | null;
    allow_direct_messages?: boolean | null;
    language?: string | null;
    theme?: string | null;
  };
  Update: {
    id?: string;
    created_at?: string | null;
    updated_at?: string | null;
    user_id?: string;
    notification_email?: boolean | null;
    notification_push?: boolean | null;
    notification_sms?: boolean | null;
    notification_categories?: Json | null;
    profile_visibility?: string | null;
    show_location?: boolean | null;
    show_online_status?: boolean | null;
    allow_direct_messages?: boolean | null;
    language?: string | null;
    theme?: string | null;
  };
  Relationships: [];
};

export type Database = Omit<GeneratedDatabase, 'public'> & {
  public: Omit<PublicSchema, 'Tables' | 'Functions'> & {
    Tables: Omit<GeneratedTables, 'subscriptions'> & {
      subscriptions: SubscriptionsTable;
      calls: CallsTable;
      call_history: CallHistoryTable;
      datemi_feature_usage: DateMiFeatureUsageTable;
      job_applications: JobApplicationsTable;
      job_alerts: JobAlertsTable;
      user_preferences: UserPreferencesTable;
      user_skills: UserSkillsTable;
    };
    Functions: GeneratedFunctions & {
      update_activity_indicators: { Args: never; Returns: Json };
      delete_user_account: {
        Args: { expected_user_id?: string | null; expected_email?: string | null };
        Returns: Json;
      };
    };
  };
};


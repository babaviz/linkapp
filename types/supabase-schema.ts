export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_indicators: {
        Row: {
          activity_count: number
          activity_text: string
          created_at: string | null
          id: string
          last_updated: string | null
          module: string
          updated_at: string | null
        }
        Insert: {
          activity_count: number
          activity_text: string
          created_at?: string | null
          id?: string
          last_updated?: string | null
          module: string
          updated_at?: string | null
        }
        Update: {
          activity_count?: number
          activity_text?: string
          created_at?: string | null
          id?: string
          last_updated?: string | null
          module?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      age_verifications: {
        Row: {
          created_at: string | null
          date_of_birth: string
          document_image_url: string
          document_number: string
          document_type: string
          id: string
          metadata: Json | null
          rejection_reason: string | null
          updated_at: string | null
          user_id: string
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          date_of_birth: string
          document_image_url: string
          document_number: string
          document_type: string
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          updated_at?: string | null
          user_id: string
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string
          document_image_url?: string
          document_number?: string
          document_type?: string
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          updated_at?: string | null
          user_id?: string
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "age_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "age_verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string | null
          device_info: Json | null
          event_name: string
          event_type: string
          id: string
          properties: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          event_name: string
          event_type: string
          id?: string
          properties?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          event_name?: string
          event_type?: string
          id?: string
          properties?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_moderation_rules: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          rule_type: string
          severity: string
          updated_at: string | null
        }
        Insert: {
          actions: Json
          conditions: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          rule_type: string
          severity: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          rule_type?: string
          severity?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_moderation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          count: number | null
          created_at: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          key: string
          label: string
          light_color: string | null
          module: string
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          count?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          label: string
          light_color?: string | null
          module: string
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          count?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          label?: string
          light_color?: string | null
          module?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      community_guidelines: {
        Row: {
          category: string
          consequences: string[] | null
          created_at: string | null
          description: string
          examples: string[] | null
          id: string
          is_active: boolean | null
          severity: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category: string
          consequences?: string[] | null
          created_at?: string | null
          description: string
          examples?: string[] | null
          id?: string
          is_active?: boolean | null
          severity: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          consequences?: string[] | null
          created_at?: string | null
          description?: string
          examples?: string[] | null
          id?: string
          is_active?: boolean | null
          severity?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          description: string | null
          evidence_urls: string[] | null
          id: string
          metadata: Json | null
          priority: string | null
          reason: string
          reported_user_id: string
          reporter_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          reason: string
          reported_user_id: string
          reporter_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          description?: string | null
          evidence_urls?: string[] | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_content: {
        Row: {
          content_type: string
          created_at: string | null
          creator_id: string
          description: string | null
          file_url: string
          id: string
          is_public: boolean | null
          metadata: Json | null
          price: number
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content_type: string
          created_at?: string | null
          creator_id: string
          description?: string | null
          file_url: string
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          price: number
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content_type?: string
          created_at?: string | null
          creator_id?: string
          description?: string | null
          file_url?: string
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          price?: number
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_content_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_earnings: {
        Row: {
          amount: number
          created_at: string | null
          creator_id: string
          currency: string | null
          customer_id: string | null
          escrow_transaction_id: string | null
          id: string
          service_reference: string | null
          source: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          creator_id: string
          currency?: string | null
          customer_id?: string | null
          escrow_transaction_id?: string | null
          id?: string
          service_reference?: string | null
          source: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          creator_id?: string
          currency?: string | null
          customer_id?: string | null
          escrow_transaction_id?: string | null
          id?: string
          service_reference?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_earnings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_earnings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_earnings_escrow_transaction_id_fkey"
            columns: ["escrow_transaction_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_services: {
        Row: {
          created_at: string | null
          creator_id: string
          description: string | null
          duration: number | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          preview_image_url: string | null
          price: number
          service_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          description?: string | null
          duration?: number | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          preview_image_url?: string | null
          price: number
          service_type: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          description?: string | null
          duration?: number | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          preview_image_url?: string | null
          price?: number
          service_type?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_services_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      date_mi_profiles: {
        Row: {
          about_me: string | null
          age: number | null
          age_verified: boolean | null
          created_at: string | null
          creator_status: boolean | null
          daily_likes_count: number | null
          daily_likes_limit: number | null
          daily_likes_reset_at: string | null
          display_name: string
          gender_preferences: string[] | null
          id: string
          intention: string | null
          interests: string[] | null
          is_online: boolean | null
          last_seen: string | null
          location: string | null
          privacy_settings: Json | null
          profile_pictures: string[] | null
          subscription_country: string | null
          updated_at: string | null
          user_id: string
          verified: boolean | null
        }
        Insert: {
          about_me?: string | null
          age?: number | null
          age_verified?: boolean | null
          created_at?: string | null
          creator_status?: boolean | null
          daily_likes_count?: number | null
          daily_likes_limit?: number | null
          daily_likes_reset_at?: string | null
          display_name: string
          gender_preferences?: string[] | null
          id?: string
          intention?: string | null
          interests?: string[] | null
          is_online?: boolean | null
          last_seen?: string | null
          location?: string | null
          privacy_settings?: Json | null
          profile_pictures?: string[] | null
          subscription_country?: string | null
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
        }
        Update: {
          about_me?: string | null
          age?: number | null
          age_verified?: boolean | null
          created_at?: string | null
          creator_status?: boolean | null
          daily_likes_count?: number | null
          daily_likes_limit?: number | null
          daily_likes_reset_at?: string | null
          display_name?: string
          gender_preferences?: string[] | null
          id?: string
          intention?: string | null
          interests?: string[] | null
          is_online?: boolean | null
          last_seen?: string | null
          location?: string | null
          privacy_settings?: Json | null
          profile_pictures?: string[] | null
          subscription_country?: string | null
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "date_mi_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      datemi_blocks: {
        Row: {
          blocked_profile_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_permanent: boolean | null
          metadata: Json | null
          reason: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          blocked_profile_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_permanent?: boolean | null
          metadata?: Json | null
          reason?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          blocked_profile_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_permanent?: boolean | null
          metadata?: Json | null
          reason?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datemi_blocks_blocked_profile_id_fkey"
            columns: ["blocked_profile_id"]
            isOneToOne: false
            referencedRelation: "date_mi_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datemi_blocks_blocked_profile_id_fkey"
            columns: ["blocked_profile_id"]
            isOneToOne: false
            referencedRelation: "date_mi_profiles_with_tier"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datemi_blocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      datemi_likes: {
        Row: {
          created_at: string | null
          id: string
          is_super_like: boolean | null
          metadata: Json | null
          profile_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_super_like?: boolean | null
          metadata?: Json | null
          profile_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_super_like?: boolean | null
          metadata?: Json | null
          profile_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "datemi_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "date_mi_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datemi_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "date_mi_profiles_with_tier"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datemi_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      datemi_messages: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          is_deleted: boolean | null
          is_read: boolean | null
          message: string
          message_type: string | null
          metadata: Json | null
          read_at: string | null
          recipient_id: string
          reply_to_id: string | null
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_read?: boolean | null
          message: string
          message_type?: string | null
          metadata?: Json | null
          read_at?: string | null
          recipient_id: string
          reply_to_id?: string | null
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_read?: boolean | null
          message?: string
          message_type?: string | null
          metadata?: Json | null
          read_at?: string | null
          recipient_id?: string
          reply_to_id?: string | null
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "datemi_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datemi_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "datemi_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datemi_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      datemi_reports: {
        Row: {
          created_at: string | null
          details: string | null
          id: string
          metadata: Json | null
          profile_id: string
          reason: string
          reporter_id: string
          resolution_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: string
          metadata?: Json | null
          profile_id: string
          reason: string
          reporter_id: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: string
          metadata?: Json | null
          profile_id?: string
          reason?: string
          reporter_id?: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "datemi_reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "date_mi_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datemi_reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "date_mi_profiles_with_tier"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datemi_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datemi_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_metrics: {
        Row: {
          contacts: number | null
          content_id: string
          content_type: string
          created_at: string | null
          favorites: number | null
          id: string
          likes: number | null
          shares: number | null
          updated_at: string | null
          views: number | null
        }
        Insert: {
          contacts?: number | null
          content_id: string
          content_type: string
          created_at?: string | null
          favorites?: number | null
          id?: string
          likes?: number | null
          shares?: number | null
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          contacts?: number | null
          content_id?: string
          content_type?: string
          created_at?: string | null
          favorites?: number | null
          id?: string
          likes?: number | null
          shares?: number | null
          updated_at?: string | null
          views?: number | null
        }
        Relationships: []
      }
      escrow_sessions: {
        Row: {
          created_at: string | null
          duration: number | null
          end_time: string | null
          escrow_transaction_id: string
          final_amount: number | null
          id: string
          participant_data: Json
          rate_per_minute: number
          session_status: string | null
          session_type: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration?: number | null
          end_time?: string | null
          escrow_transaction_id: string
          final_amount?: number | null
          id?: string
          participant_data: Json
          rate_per_minute: number
          session_status?: string | null
          session_type: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration?: number | null
          end_time?: string | null
          escrow_transaction_id?: string
          final_amount?: number | null
          id?: string
          participant_data?: Json
          rate_per_minute?: number
          session_status?: string | null
          session_type?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_sessions_escrow_transaction_id_fkey"
            columns: ["escrow_transaction_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_transactions: {
        Row: {
          amount: number
          completed_at: string | null
          completion_date: string | null
          created_at: string | null
          currency: string | null
          dispute_reason: string | null
          dispute_status: string | null
          escrow_fees_percentage: number | null
          escrow_status: string | null
          id: string
          payee_id: string
          payer_id: string
          payout_amount: number | null
          platform_fees: number | null
          service_reference: string | null
          service_type: string
          session_metadata: Json | null
          session_reference: string | null
          status: string | null
          transaction_metadata: Json | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          completion_date?: string | null
          created_at?: string | null
          currency?: string | null
          dispute_reason?: string | null
          dispute_status?: string | null
          escrow_fees_percentage?: number | null
          escrow_status?: string | null
          id?: string
          payee_id: string
          payer_id: string
          payout_amount?: number | null
          platform_fees?: number | null
          service_reference?: string | null
          service_type: string
          session_metadata?: Json | null
          session_reference?: string | null
          status?: string | null
          transaction_metadata?: Json | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          completion_date?: string | null
          created_at?: string | null
          currency?: string | null
          dispute_reason?: string | null
          dispute_status?: string | null
          escrow_fees_percentage?: number | null
          escrow_status?: string | null
          id?: string
          payee_id?: string
          payer_id?: string
          payout_amount?: number | null
          platform_fees?: number | null
          service_reference?: string | null
          service_type?: string
          session_metadata?: Json | null
          session_reference?: string | null
          status?: string | null
          transaction_metadata?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_application_documents: {
        Row: {
          application_id: string | null
          created_at: string | null
          document_type: string
          file_id: string | null
          id: string
          job_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string | null
          document_type: string
          file_id?: string | null
          id?: string
          job_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string | null
          document_type?: string
          file_id?: string | null
          id?: string
          job_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_application_documents_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "user_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_application_documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_postings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_application_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_postings: {
        Row: {
          contact_details: Json | null
          created_at: string | null
          description: string
          employer_id: string
          experience_level: string | null
          id: string
          job_title: string
          job_type: string | null
          location: string
          required_skills: string[] | null
          salary: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          contact_details?: Json | null
          created_at?: string | null
          description: string
          employer_id: string
          experience_level?: string | null
          id?: string
          job_title: string
          job_type?: string | null
          location: string
          required_skills?: string[] | null
          salary?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_details?: Json | null
          created_at?: string | null
          description?: string
          employer_id?: string
          experience_level?: string | null
          id?: string
          job_title?: string
          job_type?: string | null
          location?: string
          required_skills?: string[] | null
          salary?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_postings_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action_type: string
          created_at: string | null
          duration: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          moderator_id: string
          reason: string
          report_id: string
          target_user_id: string
          updated_at: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          duration?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          moderator_id: string
          reason: string
          report_id: string
          target_user_id: string
          updated_at?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          duration?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          moderator_id?: string
          reason?: string
          report_id?: string
          target_user_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "content_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_history: {
        Row: {
          body: string
          category: string
          clicked_at: string | null
          created_at: string | null
          data: Json | null
          delivered_at: string | null
          id: string
          notification_type: string | null
          priority: string | null
          read_at: string | null
          sent_at: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          category: string
          clicked_at?: string | null
          created_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          id?: string
          notification_type?: string | null
          priority?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          clicked_at?: string | null
          created_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          id?: string
          notification_type?: string | null
          priority?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          job_alerts: boolean | null
          marketing_messages: boolean | null
          message_notifications: boolean | null
          payment_alerts: boolean | null
          push_enabled: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean | null
          system_updates: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          job_alerts?: boolean | null
          marketing_messages?: boolean | null
          message_notifications?: boolean | null
          payment_alerts?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          system_updates?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          job_alerts?: boolean | null
          marketing_messages?: boolean | null
          message_notifications?: boolean | null
          payment_alerts?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          system_updates?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_tokens: {
        Row: {
          created_at: string | null
          device_id: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          platform: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_id?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_number: string
          created_at: string | null
          id: string
          is_default: boolean | null
          payment_type: string
          provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_number: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          payment_type: string
          provider: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_number?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          payment_type?: string
          provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          amount: number
          created_at: string | null
          creator_id: string
          currency: string | null
          id: string
          notes: string | null
          payment_method_id: string | null
          processed_at: string | null
          reference_id: string | null
          requested_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          creator_id: string
          currency?: string | null
          id?: string
          notes?: string | null
          payment_method_id?: string | null
          processed_at?: string | null
          reference_id?: string | null
          requested_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          creator_id?: string
          currency?: string | null
          id?: string
          notes?: string | null
          payment_method_id?: string | null
          processed_at?: string | null
          reference_id?: string | null
          requested_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_requests_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      paystack_transactions: {
        Row: {
          amount: number
          billing_cycle: string
          country: string
          created_at: string | null
          currency: string
          id: string
          metadata: Json | null
          paid_at: string | null
          payment_channel: string | null
          paystack_transaction_id: string | null
          reference: string
          status: string | null
          tier: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          billing_cycle: string
          country: string
          created_at?: string | null
          currency: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_channel?: string | null
          paystack_transaction_id?: string | null
          reference: string
          status?: string | null
          tier: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          billing_cycle?: string
          country?: string
          created_at?: string | null
          currency?: string
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_channel?: string | null
          paystack_transaction_id?: string | null
          reference?: string
          status?: string | null
          tier?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paystack_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_snapshots: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          date: string
          id: string
          metrics: Json
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          date: string
          id?: string
          metrics: Json
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          date?: string
          id?: string
          metrics?: Json
        }
        Relationships: []
      }
      premium_access_periods: {
        Row: {
          created_at: string | null
          duration_days: number
          end_date: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          referral_batch_count: number | null
          source: string | null
          start_date: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_days?: number
          end_date: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          referral_batch_count?: number | null
          source?: string | null
          start_date: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_days?: number
          end_date?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          referral_batch_count?: number | null
          source?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_access_periods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      property_inquiries: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          inquirer_id: string
          inquirer_name: string
          message: string
          owner_id: string
          property_id: string
          responded_at: string | null
          response: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          inquirer_id: string
          inquirer_name: string
          message: string
          owner_id: string
          property_id: string
          responded_at?: string | null
          response?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          inquirer_id?: string
          inquirer_name?: string
          message?: string
          owner_id?: string
          property_id?: string
          responded_at?: string | null
          response?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_inquiries_inquirer_id_fkey"
            columns: ["inquirer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_inquiries_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_inquiries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "property_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      property_listings: {
        Row: {
          amenities: string[] | null
          area_sqm: number | null
          bathrooms: number | null
          bedrooms: number | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          favorited_count: number | null
          id: string
          image_urls: string[] | null
          inquiry_count: number | null
          is_featured: boolean | null
          listing_type: string
          location_address: string
          location_coordinates: Json | null
          location_county: string
          location_neighborhood: string | null
          location_town: string | null
          owner_id: string
          price: number
          price_period: string | null
          property_type: string
          status: string | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          amenities?: string[] | null
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          favorited_count?: number | null
          id?: string
          image_urls?: string[] | null
          inquiry_count?: number | null
          is_featured?: boolean | null
          listing_type?: string
          location_address: string
          location_coordinates?: Json | null
          location_county?: string
          location_neighborhood?: string | null
          location_town?: string | null
          owner_id: string
          price: number
          price_period?: string | null
          property_type: string
          status?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          amenities?: string[] | null
          area_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          favorited_count?: number | null
          id?: string
          image_urls?: string[] | null
          inquiry_count?: number | null
          is_featured?: boolean | null
          listing_type?: string
          location_address?: string
          location_coordinates?: Json | null
          location_county?: string
          location_neighborhood?: string | null
          location_town?: string | null
          owner_id?: string
          price?: number
          price_period?: string | null
          property_type?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_reward_notifications: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          milestone: number
          notified_at: string | null
          paid_at: string | null
          payment_reference: string | null
          processed_at: string | null
          referral_count: number
          reward_amount: number
          status: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          milestone: number
          notified_at?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          processed_at?: string | null
          referral_count: number
          reward_amount: number
          status?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          milestone?: number
          notified_at?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          processed_at?: string | null
          referral_count?: number
          reward_amount?: number
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_reward_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_statistics: {
        Row: {
          completed_referrals: number | null
          created_at: string | null
          current_batch_progress: number | null
          id: string
          last_reward_at: string | null
          next_cash_milestone: number | null
          next_milestone: number | null
          pending_referrals: number | null
          total_cash_rewards_ksh: number | null
          total_referrals: number | null
          total_rewards_earned: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_referrals?: number | null
          created_at?: string | null
          current_batch_progress?: number | null
          id?: string
          last_reward_at?: string | null
          next_cash_milestone?: number | null
          next_milestone?: number | null
          pending_referrals?: number | null
          total_cash_rewards_ksh?: number | null
          total_referrals?: number | null
          total_rewards_earned?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_referrals?: number | null
          created_at?: string | null
          current_batch_progress?: number | null
          id?: string
          last_reward_at?: string | null
          next_cash_milestone?: number | null
          next_milestone?: number | null
          pending_referrals?: number | null
          total_cash_rewards_ksh?: number | null
          total_referrals?: number | null
          total_rewards_earned?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_statistics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          device_info: Json | null
          id: string
          install_fingerprint: string | null
          ip_address: string | null
          referral_code: string
          referred_user_id: string
          referrer_id: string
          registered_at: string | null
          status: string | null
          updated_at: string | null
          verified_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          device_info?: Json | null
          id?: string
          install_fingerprint?: string | null
          ip_address?: string | null
          referral_code: string
          referred_user_id: string
          referrer_id: string
          registered_at?: string | null
          status?: string | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          device_info?: Json | null
          id?: string
          install_fingerprint?: string | null
          ip_address?: string | null
          referral_code?: string
          referred_user_id?: string
          referrer_id?: string
          registered_at?: string | null
          status?: string | null
          updated_at?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      service_listings: {
        Row: {
          category: string
          contact_details: Json | null
          created_at: string | null
          description: string
          id: string
          image_urls: string[] | null
          location: string
          owner_id: string
          pricing_info: Json | null
          service_name: string
          status: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          category: string
          contact_details?: Json | null
          created_at?: string | null
          description: string
          id?: string
          image_urls?: string[] | null
          location: string
          owner_id: string
          pricing_info?: Json | null
          service_name: string
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          contact_details?: Json | null
          created_at?: string | null
          description?: string
          id?: string
          image_urls?: string[] | null
          location?: string
          owner_id?: string
          pricing_info?: Json | null
          service_name?: string
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      signaling_messages: {
        Row: {
          created_at: string | null
          id: string
          message_data: Json
          message_type: string
          processed: boolean | null
          session_id: string
          target_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_data: Json
          message_type: string
          processed?: boolean | null
          session_id: string
          target_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message_data?: Json
          message_type?: string
          processed?: boolean | null
          session_id?: string
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signaling_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "video_call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signaling_messages_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_chat_users: {
        Row: {
          created_at: string
          id: string
          image: string | null
          name: string | null
          stream_user_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image?: string | null
          name?: string | null
          stream_user_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image?: string | null
          name?: string | null
          stream_user_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount_paid: number | null
          auto_renew: boolean | null
          cancelled_at: string | null
          country_code: string | null
          created_at: string | null
          currency: string | null
          end_date: string
          id: string
          metadata: Json | null
          payment_channel: string | null
          payment_method: string | null
          start_date: string
          status: string | null
          tier: string
          transaction_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          auto_renew?: boolean | null
          cancelled_at?: string | null
          country_code?: string | null
          created_at?: string | null
          currency?: string | null
          end_date: string
          id?: string
          metadata?: Json | null
          payment_channel?: string | null
          payment_method?: string | null
          start_date?: string
          status?: string | null
          tier: string
          transaction_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          auto_renew?: boolean | null
          cancelled_at?: string | null
          country_code?: string | null
          created_at?: string | null
          currency?: string | null
          end_date?: string
          id?: string
          metadata?: Json | null
          payment_channel?: string | null
          payment_method?: string | null
          start_date?: string
          status?: string | null
          tier?: string
          transaction_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          metadata: Json | null
          payment_method: string
          reference_id: string
          status: string | null
          transaction_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_method: string
          reference_id: string
          status?: string | null
          transaction_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string
          reference_id?: string
          status?: string | null
          transaction_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activities: {
        Row: {
          action: string
          content_id: string
          content_type: string
          created_at: string | null
          id: string
          metadata: Json | null
          timestamp: string | null
          user_id: string
        }
        Insert: {
          action: string
          content_id: string
          content_type: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          timestamp?: string | null
          user_id: string
        }
        Update: {
          action?: string
          content_id?: string
          content_type?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_documents: {
        Row: {
          created_at: string | null
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          mime_type: string | null
          storage_path: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          storage_path?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          storage_path?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_moderation_history: {
        Row: {
          action_taken: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          moderator_id: string | null
          report_id: string | null
          severity: string
          updated_at: string
          user_id: string
          violation_type: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          moderator_id?: string | null
          report_id?: string | null
          severity?: string
          updated_at?: string
          user_id: string
          violation_type: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          moderator_id?: string | null
          report_id?: string | null
          severity?: string
          updated_at?: string
          user_id?: string
          violation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_moderation_history_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_moderation_history_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "content_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_moderation_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_moderation_status: {
        Row: {
          appeal_count: number | null
          created_at: string | null
          id: string
          last_appeal_at: string | null
          last_suspension_at: string | null
          last_warning_at: string | null
          metadata: Json | null
          reputation_score: number | null
          status: string | null
          suspension_count: number | null
          suspension_expires_at: string | null
          total_reports_against: number | null
          total_reports_made: number | null
          updated_at: string | null
          user_id: string
          warning_count: number | null
        }
        Insert: {
          appeal_count?: number | null
          created_at?: string | null
          id?: string
          last_appeal_at?: string | null
          last_suspension_at?: string | null
          last_warning_at?: string | null
          metadata?: Json | null
          reputation_score?: number | null
          status?: string | null
          suspension_count?: number | null
          suspension_expires_at?: string | null
          total_reports_against?: number | null
          total_reports_made?: number | null
          updated_at?: string | null
          user_id: string
          warning_count?: number | null
        }
        Update: {
          appeal_count?: number | null
          created_at?: string | null
          id?: string
          last_appeal_at?: string | null
          last_suspension_at?: string | null
          last_warning_at?: string | null
          metadata?: Json | null
          reputation_score?: number | null
          status?: string | null
          suspension_count?: number | null
          suspension_expires_at?: string | null
          total_reports_against?: number | null
          total_reports_made?: number | null
          updated_at?: string | null
          user_id?: string
          warning_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_moderation_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          allow_direct_messages: boolean | null
          created_at: string | null
          id: string
          language: string | null
          notification_categories: Json | null
          notification_email: boolean | null
          notification_push: boolean | null
          notification_sms: boolean | null
          profile_visibility: string | null
          show_location: boolean | null
          show_online_status: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_direct_messages?: boolean | null
          created_at?: string | null
          id?: string
          language?: string | null
          notification_categories?: Json | null
          notification_email?: boolean | null
          notification_push?: boolean | null
          notification_sms?: boolean | null
          profile_visibility?: string | null
          show_location?: boolean | null
          show_online_status?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_direct_messages?: boolean | null
          created_at?: string | null
          id?: string
          language?: string | null
          notification_categories?: Json | null
          notification_email?: boolean | null
          notification_push?: boolean | null
          notification_sms?: boolean | null
          profile_visibility?: string | null
          show_location?: boolean | null
          show_online_status?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_referral_codes: {
        Row: {
          created_at: string | null
          id: string
          referral_code: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          referral_code: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          referral_code?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_report_stats: {
        Row: {
          created_at: string
          false_reports: number
          id: string
          last_report_at: string | null
          pending_reports: number
          resolved_reports: number
          total_reports: number
          trust_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          false_reports?: number
          id?: string
          last_report_at?: string | null
          pending_reports?: number
          resolved_reports?: number
          total_reports?: number
          trust_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          false_reports?: number
          id?: string
          last_report_at?: string | null
          pending_reports?: number
          resolved_reports?: number
          total_reports?: number
          trust_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_report_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          permissions: Json | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          bio: string | null
          created_at: string | null
          creator_verification_status: string | null
          email: string
          full_name: string | null
          id: string
          kyc_status: string | null
          location_preferences: Json | null
          phone: string | null
          profile_image_url: string | null
          updated_at: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          creator_verification_status?: string | null
          email: string
          full_name?: string | null
          id: string
          kyc_status?: string | null
          location_preferences?: Json | null
          phone?: string | null
          profile_image_url?: string | null
          updated_at?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          creator_verification_status?: string | null
          email?: string
          full_name?: string | null
          id?: string
          kyc_status?: string | null
          location_preferences?: Json | null
          phone?: string | null
          profile_image_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      video_call_sessions: {
        Row: {
          actual_start_time: string | null
          callee_id: string
          caller_id: string
          created_at: string | null
          current_cost: number | null
          duration: number | null
          end_time: string | null
          escrow_transaction_id: string | null
          final_cost: number | null
          id: string
          rate_per_minute: number | null
          start_time: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          actual_start_time?: string | null
          callee_id: string
          caller_id: string
          created_at?: string | null
          current_cost?: number | null
          duration?: number | null
          end_time?: string | null
          escrow_transaction_id?: string | null
          final_cost?: number | null
          id?: string
          rate_per_minute?: number | null
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_start_time?: string | null
          callee_id?: string
          caller_id?: string
          created_at?: string | null
          current_cost?: number | null
          duration?: number | null
          end_time?: string | null
          escrow_transaction_id?: string | null
          final_cost?: number | null
          id?: string
          rate_per_minute?: number | null
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_call_sessions_callee_id_fkey"
            columns: ["callee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_call_sessions_caller_id_fkey"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_call_sessions_escrow_transaction_id_fkey"
            columns: ["escrow_transaction_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      date_mi_profiles_with_tier: {
        Row: {
          about_me: string | null
          age_verified: boolean | null
          created_at: string | null
          creator_status: boolean | null
          display_name: string | null
          gender_preferences: string[] | null
          id: string | null
          privacy_settings: Json | null
          profile_pictures: string[] | null
          subscription_country: string | null
          subscription_tier: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          about_me?: string | null
          age_verified?: boolean | null
          created_at?: string | null
          creator_status?: boolean | null
          display_name?: string | null
          gender_preferences?: string[] | null
          id?: string | null
          privacy_settings?: Json | null
          profile_pictures?: string[] | null
          subscription_country?: string | null
          subscription_tier?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          about_me?: string | null
          age_verified?: boolean | null
          created_at?: string | null
          creator_status?: boolean | null
          display_name?: string | null
          gender_preferences?: string[] | null
          id?: string | null
          privacy_settings?: Json | null
          profile_pictures?: string[] | null
          subscription_country?: string | null
          subscription_tier?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "date_mi_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_and_notify_cash_reward: {
        Args: { completed_count: number; referrer_user_id: string }
        Returns: Json
      }
      expire_premium_periods: { Args: never; Returns: number }
      generate_referral_code: {
        Args: { user_id_param: string }
        Returns: string
      }
      generate_stream_chat_token: {
        Args: { user_id_param: string }
        Returns: {
          error_message: string
          stream_user_id: string
          success: boolean
          token: string
        }[]
      }
      get_referral_progress: { Args: { user_id_param: string }; Returns: Json }
      get_reward_amount_for_milestone: {
        Args: { milestone_count: number }
        Returns: number
      }
      get_stream_user_id: { Args: { user_id_param?: string }; Returns: string }
      grant_premium_access: {
        Args: { batch_count?: number; days?: number; user_id_param: string }
        Returns: string
      }
      has_active_premium: { Args: { user_id_param: string }; Returns: boolean }
      update_referral_status: {
        Args: { new_status: string; referred_user_id_param: string }
        Returns: Json
      }
      upsert_stream_chat_user: {
        Args: {
          stream_user_id_param: string
          user_id_param: string
          user_image_param?: string
          user_name_param?: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

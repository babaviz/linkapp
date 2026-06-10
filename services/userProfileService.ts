import { supabase, isSupabaseConfigured } from './supabaseClient';
import { EnhancedUserProfile } from '../types/user';
import type { Json } from '../types/supabase';

type NotificationCategories = EnhancedUserProfile['settings']['notifications']['categories'];
type ThemeSetting = EnhancedUserProfile['settings']['theme'];
type ProfileVisibilitySetting = EnhancedUserProfile['settings']['privacy']['profileVisibility'];

const DEFAULT_NOTIFICATION_CATEGORIES: NotificationCategories = {
  properties: true,
  jobs: true,
  services: true,
  datemi: false,
  messages: true,
  matches: true,
  updates: true,
  security: true,
  marketing: false,
};

function normalizeTheme(value: unknown): ThemeSetting {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

function normalizeProfileVisibility(value: unknown): ProfileVisibilitySetting {
  return value === 'public' || value === 'private' || value === 'friends_only' ? value : 'public';
}

function serializeNotificationCategories(categories: NotificationCategories): Json {
  const json: Record<string, Json> = {
    properties: categories.properties,
    jobs: categories.jobs,
    services: categories.services,
    datemi: categories.datemi,
  };

  if (typeof categories.messages === 'boolean') json.messages = categories.messages;
  if (typeof categories.matches === 'boolean') json.matches = categories.matches;
  if (typeof categories.updates === 'boolean') json.updates = categories.updates;
  if (typeof categories.security === 'boolean') json.security = categories.security;
  if (typeof categories.marketing === 'boolean') json.marketing = categories.marketing;

  return json;
}

function deserializeNotificationCategories(value: unknown): NotificationCategories {
  const raw =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

  return {
    properties: bool(raw.properties, DEFAULT_NOTIFICATION_CATEGORIES.properties),
    jobs: bool(raw.jobs, DEFAULT_NOTIFICATION_CATEGORIES.jobs),
    services: bool(raw.services, DEFAULT_NOTIFICATION_CATEGORIES.services),
    datemi: bool(raw.datemi, DEFAULT_NOTIFICATION_CATEGORIES.datemi),
    messages: bool(raw.messages, DEFAULT_NOTIFICATION_CATEGORIES.messages ?? true),
    matches: bool(raw.matches, DEFAULT_NOTIFICATION_CATEGORIES.matches ?? true),
    updates: bool(raw.updates, DEFAULT_NOTIFICATION_CATEGORIES.updates ?? true),
    security: bool(raw.security, DEFAULT_NOTIFICATION_CATEGORIES.security ?? true),
    marketing: bool(raw.marketing, DEFAULT_NOTIFICATION_CATEGORIES.marketing ?? false),
  };
}

class UserProfileService {
  // Update notification preferences
  async updateNotificationSettings(
    userId: string,
    settings: EnhancedUserProfile['settings']['notifications']
  ) {
    try {
      // Demo mode handling
      if (!isSupabaseConfigured()) {
        return {
          data: {
            id: userId,
            notification_settings: settings,
            updated_at: new Date().toISOString()
          },
          error: null
        };
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          notification_email: settings.email,
          notification_push: settings.push,
          notification_sms: settings.sms,
          notification_categories: serializeNotificationCategories(settings.categories),
        })
        .select()
        .single();

      return { data, error };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  // Update privacy settings
  async updatePrivacySettings(
    userId: string,
    settings: EnhancedUserProfile['settings']['privacy']
  ) {
    try {
      // Demo mode handling
      if (!isSupabaseConfigured()) {
        return {
          data: {
            id: userId,
            privacy_settings: settings,
            updated_at: new Date().toISOString()
          },
          error: null
        };
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          profile_visibility: settings.profileVisibility,
          show_location: settings.showLocation,
          show_online_status: settings.showOnlineStatus,
          allow_direct_messages: settings.allowDirectMessages
        })
        .select()
        .single();

      return { data, error };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  // Update all user settings
  async updateUserSettings(
    userId: string,
    settings: Partial<EnhancedUserProfile['settings']>
  ) {
    try {
      // Demo mode handling
      if (!isSupabaseConfigured()) {
        return {
          data: {
            id: userId,
            settings: settings,
            updated_at: new Date().toISOString()
          },
          error: null
        };
      }

      const updateData: {
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
      } = { user_id: userId };

      // Map notification settings
      if (settings.notifications) {
        updateData.notification_email = settings.notifications.email;
        updateData.notification_push = settings.notifications.push;
        updateData.notification_sms = settings.notifications.sms;
        updateData.notification_categories = serializeNotificationCategories(settings.notifications.categories);
      }

      // Map privacy settings
      if (settings.privacy) {
        updateData.profile_visibility = settings.privacy.profileVisibility;
        updateData.show_location = settings.privacy.showLocation;
        updateData.show_online_status = settings.privacy.showOnlineStatus;
        updateData.allow_direct_messages = settings.privacy.allowDirectMessages;
      }

      // Map general settings
      if (settings.language !== undefined) {
        updateData.language = settings.language;
      }
      if (settings.theme !== undefined) {
        updateData.theme = settings.theme;
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .upsert(updateData)
        .select()
        .single();

      return { data, error };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  // Get user settings
  async getUserSettings(userId: string): Promise<EnhancedUserProfile['settings'] | null> {
    try {
      // Demo mode handling
      if (!isSupabaseConfigured()) {
        return {
          notifications: {
            email: true,
            push: true,
            sms: false,
            categories: {
              properties: true,
              jobs: true,
              services: true,
              datemi: false,
              messages: true,
              matches: true,
              updates: true,
              security: true,
              marketing: false
            }
          },
          privacy: {
            profileVisibility: 'public',
            showLocation: true,
            showOnlineStatus: true,
            allowDirectMessages: true
          },
          language: 'en',
          theme: 'system'
        };
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return null;

      return {
        notifications: {
          email: data.notification_email ?? true,
          push: data.notification_push ?? true,
          sms: data.notification_sms ?? false,
          categories: deserializeNotificationCategories(data.notification_categories),
        },
        privacy: {
          profileVisibility: normalizeProfileVisibility(data.profile_visibility),
          showLocation: data.show_location ?? true,
          showOnlineStatus: data.show_online_status ?? true,
          allowDirectMessages: data.allow_direct_messages ?? true
        },
        language: data.language ?? 'en',
        theme: normalizeTheme(data.theme)
      };
    } catch (error) {
      return null;
    }
  }

  // Delete user account
  async deleteUserAccount(userId: string, options?: { expectedEmail?: string | null }) {
    try {
      // Demo mode handling
      if (!isSupabaseConfigured()) {
        return {
          success: true,
          error: null
        };
      }

      // IMPORTANT: Never use supabase.auth.admin from the client.
      // Account deletion is handled by a backend RPC that deletes domain rows and auth.users atomically.
      const { error } = await supabase.rpc('delete_user_account', {
        expected_user_id: userId,
        expected_email: options?.expectedEmail ?? null,
      });

      if (error) {
        throw error;
      }

      return { success: true, error: null };
    } catch (error: any) {
      return { success: false, error };
    }
  }
}

export const userProfileService = new UserProfileService();

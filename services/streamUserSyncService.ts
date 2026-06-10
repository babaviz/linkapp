import { supabase, isSupabaseConfigured } from './supabaseClient';
import { authService } from './authService';

type StreamUserSyncResult = {
  success: boolean;
  error?: string;
};

class StreamUserSyncService {
  private async getAccessToken(): Promise<string | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.access_token) {
      return null;
    }
    return session.access_token;
  }

  async syncUsersToStream(userIds: string[]): Promise<StreamUserSyncResult> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase not configured' };
    }

    const normalized = Array.from(
      new Set((userIds || []).filter((id) => typeof id === 'string' && id.trim().length > 0))
    );
    if (normalized.length === 0) {
      return { success: false, error: 'No user IDs provided' };
    }

    const accessToken = await this.getAccessToken();
    if (!accessToken) {
      return { success: false, error: 'No active session' };
    }

    try {
      const { error } = await supabase.functions.invoke('stream-users', {
        body: { userIds: normalized },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Stream user sync failed';
      return { success: false, error: message };
    }
  }

  async syncCurrentUserToStream(): Promise<StreamUserSyncResult> {
    const currentUser = await authService.getSessionUserBasic();
    if (!currentUser?.id) {
      return { success: false, error: 'No authenticated user' };
    }

    return this.syncUsersToStream([currentUser.id]);
  }
}

export const streamUserSyncService = new StreamUserSyncService();

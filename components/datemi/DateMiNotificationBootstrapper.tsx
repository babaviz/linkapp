import React from 'react';
import { useAppSelector } from '../../redux/hooks';
import dateMiNotificationManager from '../../services/dateMiNotificationManager';
import { useStreamChatClient } from '../chat/StreamChatWrapper';

/**
 * Boots the Date Mi notification manager early in the app lifecycle so the
 * Date Mi tab badge stays accurate even when the user hasn't opened Date Mi yet.
 *
 * IMPORTANT: This component must render within `StreamChatWrapper` so it can
 * access the Stream Chat client instance.
 */
export default function DateMiNotificationBootstrapper() {
  const userId = useAppSelector((state) => state.auth.user?.id || null);
  const dateMiProfileId = useAppSelector((state) => state.datemi.myProfile?.id || null);
  const { client: chatClient, isReady: isChatReady } = useStreamChatClient();

  const lastInitRef = React.useRef<{ userId: string | null; profileId: string | null } | null>(null);

  React.useEffect(() => {
    // Sign-out / no session: ensure Date Mi manager is fully stopped.
    if (!userId) {
      lastInitRef.current = null;
      dateMiNotificationManager.shutdown();
      return;
    }

    const last = lastInitRef.current;
    const changed = !last || last.userId !== userId || last.profileId !== dateMiProfileId;
    lastInitRef.current = { userId, profileId: dateMiProfileId };

    // Initialize once per (userId, profileId) tuple; chat client can be bound separately.
    if (changed) {
      dateMiNotificationManager
        .initialize({ userId, dateMiProfileId, chatClient: isChatReady ? chatClient : null })
        .catch(() => {
          // ignore bootstrap errors
        });
    } else {
      // IMPORTANT: re-bind when the chat client becomes ready (connectUser completed).
      // This ensures existing unread DateMi messages are counted on app open,
      // even if no new message event fires after connection.
      if (isChatReady) {
        dateMiNotificationManager.bindChatClient(chatClient);
      }
    }
  }, [userId, dateMiProfileId, chatClient, isChatReady]);

  return null;
}


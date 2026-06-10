/**
 * ChatThreadScreen
 *
 * Dedicated thread screen for Stream Chat.
 * Wraps Thread inside Channel with threadList enabled to avoid concurrency issues.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import type { Channel as StreamChannel, MessageResponse } from 'stream-chat';
import { Channel, Thread } from 'stream-chat-expo';

import { ChatWallpaper } from '../components/chat';
import type { ChatWallpaperVariant } from '../components/chat';
import { useStreamChat } from '../hooks/useStreamChat';
import { useStreamChatClient } from '../components/chat/StreamChatWrapper';
import { getUserFacingError } from '../utils/userFacingError';
import { getCrossPlatformShadow } from '../utils/crossPlatformShadows';

type RootParamList = Record<string, object | undefined>;
type ChatThreadNavigationProp = StackNavigationProp<RootParamList, 'ChatThread'>;
type ChatThreadRouteProp = RouteProp<RootParamList, 'ChatThread'>;

type RouteParams = {
  channelCid: string;
  parentMessageId: string;
};

interface Props {
  navigation: ChatThreadNavigationProp;
  route: ChatThreadRouteProp;
}

export default function ChatThreadScreen({ navigation, route }: Props) {
  const params = route.params as RouteParams | undefined;
  const { getChannel } = useStreamChat();
  const { client, isReady: isChatClientReady } = useStreamChatClient();
  const insets = useSafeAreaInsets();

  const [channel, setChannel] = useState<StreamChannel | null>(null);
  const [thread, setThread] = useState<MessageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(0);

  const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    setHeaderHeight((prev) => (prev === nextHeight ? prev : nextHeight));
  }, []);

  const keyboardVerticalOffset = useMemo<number | undefined>(() => {
    // Only override Stream's default on iOS.
    if (Platform.OS !== 'ios') return undefined;
    const fallback = Math.round(insets.top + 56);
    return headerHeight > 0 ? headerHeight : fallback;
  }, [headerHeight, insets.top]);

  const channelCid = params?.channelCid ?? '';
  const parentMessageId = params?.parentMessageId ?? '';

  const parsedCid = useMemo(() => {
    const parts = channelCid.split(':');
    if (parts.length !== 2) return null;
    const [type, id] = parts;
    if (!type || !id) return null;
    return { type, id };
  }, [channelCid]);

  const wallpaperVariant = useMemo<ChatWallpaperVariant>(() => {
    const data = channel?.data as Record<string, unknown> | undefined;
    const isDateMi =
      (data && (data.datemi_conversation === true || data.user1_id || data.user2_id)) ||
      channel?.type === 'datemi';
    if (isDateMi) return 'datemi';

    if (channel?.type === 'property' || (data && (data.property_id || data.property_title))) return 'property';
    if (channel?.type === 'job' || (data && (data.job_id || data.job_title))) return 'job';
    if (channel?.type === 'service' || (data && (data.service_id || data.service_name))) return 'service';
    return 'default';
  }, [channel?.cid, channel?.type]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!parsedCid || !parentMessageId) {
          throw new Error('Thread not available');
        }

        const loadedChannel = await getChannel(parsedCid.type as any, parsedCid.id);
        if (!loadedChannel) {
          throw new Error('Unable to load conversation');
        }

        // Ensure channel is watched so thread + replies are consistent
        try {
          await loadedChannel.watch({ state: true, presence: true });
        } catch {
          // ignore: channel may already be watched
        }

        // Fetch parent message robustly (not guaranteed in current message list window)
        let parentMessage: MessageResponse | null = null;
        if (isChatClientReady && client) {
          const res = await client.getMessage(parentMessageId);
          if (res?.message) {
            parentMessage = res.message as unknown as MessageResponse;
          }
        }

        // Fallback: try to find in already-loaded messages
        if (!parentMessage) {
          const fromState = loadedChannel.state?.messages?.find((m) => m.id === parentMessageId);
          if (fromState) parentMessage = fromState as unknown as MessageResponse;
        }

        if (!parentMessage) {
          throw new Error('Unable to load thread');
        }

        if (isMounted) {
          setChannel(loadedChannel);
          setThread(parentMessage);
        }
      } catch (_e) {
        const friendly = getUserFacingError(_e, {
          action: 'open this thread',
          displayStyle: 'inline',
        });
        if (isMounted) {
          setError(friendly.message);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [client, isChatClientReady, getChannel, parsedCid, parentMessageId]);

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ChatWallpaper variant={wallpaperVariant} />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]} onLayout={handleHeaderLayout}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          Thread
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#60A5FA" />
          <Text style={styles.helperText}>Loading thread…</Text>
        </View>
      ) : error || !channel || !thread ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Thread unavailable</Text>
          <Text style={styles.errorText}>{error || 'Unable to open this thread.'}</Text>
          <TouchableOpacity onPress={handleBack} style={styles.primaryButton} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Channel
          channel={channel}
          thread={thread as any}
          threadList
          topInset={insets.top}
          bottomInset={insets.bottom}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          <Thread />
        </Channel>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    ...getCrossPlatformShadow({
      width: 0,
      height: 2,
      radius: 4,
      opacity: 0.12,
      elevation: 2,
      color: '#000',
    }),
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  headerSpacer: {
    width: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  helperText: {
    marginTop: 16,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});


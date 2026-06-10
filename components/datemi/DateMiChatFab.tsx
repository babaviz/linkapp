import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../redux/hooks';
import useDateMiAccess from '../../hooks/useDateMiAccess';
import { navigateToDateMiConversations } from '../../navigation/dateMiNavigation';

interface DateMiChatFabProps {
  /** Extra bottom offset above the safe area, defaults to 88 to clear the tab bar */
  bottomOffset?: number;
}

export default function DateMiChatFab({ bottomOffset = 88 }: DateMiChatFabProps) {
  // ── All hooks first, unconditionally ───────────────────────────────────────
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const userId = useAppSelector((state) => state.auth.user?.id);
  const unreadMessages = useAppSelector(
    (state) => (state as any).datemi?.notifications?.unreadMessages ?? 0
  );
  const dateMiAccess = useDateMiAccess({ enabled: Boolean(userId) });

  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!userId) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 120,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [userId, scaleAnim]);

  const handlePress = useCallback(() => {
    if (!userId || dateMiAccess.isLoading) return;

    if (dateMiAccess.canMessage) {
      navigateToDateMiConversations(navigation as any);
      return;
    }

    (navigation as any).navigate('SubscriptionPlans', { entryFeature: 'messaging' });
  }, [userId, dateMiAccess.canMessage, dateMiAccess.isLoading, navigation]);

  // ── Early return after all hooks ───────────────────────────────────────────
  if (!userId) {
    return null;
  }

  const isLocked = !dateMiAccess.isLoading && !dateMiAccess.canMessage;
  const badgeCount = Math.min(unreadMessages, 99);
  const badgeLabel = unreadMessages > 99 ? '99+' : `${unreadMessages}`;
  const fabBottom = insets.bottom + bottomOffset;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.container, { bottom: fabBottom, transform: [{ scale: scaleAnim }] }]}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={isLocked ? 'Unlock Date Mi chats' : 'My Date Mi chats'}
        accessibilityHint={
          isLocked
            ? 'Opens subscription plans to unlock Date Mi messaging'
            : 'Opens your Date Mi conversation list'
        }
        style={[styles.fab, isLocked && styles.fabLocked]}
      >
        <Ionicons
          name="chatbubbles"
          size={24}
          color="#FFFFFF"
          style={styles.icon}
        />
        <Text style={styles.label} numberOfLines={1}>
          {isLocked ? 'Unlock Chats' : 'My Chats'}
        </Text>
      </TouchableOpacity>

      {badgeCount > 0 && (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 6,
    zIndex: 999,
    elevation: 16,
    alignItems: 'flex-end',
    paddingRight: 10,
    paddingTop: 8,
  },
  fab: {
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 26,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    // iOS shadow
    shadowColor: '#991B1B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    // Android elevation (matches container elevation)
    elevation: 16,
  },
  fabLocked: {
    shadowColor: '#000000',
    shadowOpacity: 0.45,
  },
  icon: {
    lineHeight: 24,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    // Android elevation for badge
    elevation: 13,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
  },
});

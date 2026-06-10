import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { NotificationHistoryItem, NotificationCategory } from '../../types/notifications';
import { colors, spacing, typography } from '../../theme';

interface CategoryConfig {
  emoji: string;
  accentColor: string;
  iconBg: string;
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  [NotificationCategory.JOB_ALERT]: {
    emoji: '💼',
    accentColor: '#7C3AED',
    iconBg: '#F5F3FF',
  },
  [NotificationCategory.MESSAGE]: {
    emoji: '💬',
    accentColor: '#2563EB',
    iconBg: '#EFF6FF',
  },
  [NotificationCategory.PAYMENT]: {
    emoji: '💳',
    accentColor: '#059669',
    iconBg: '#ECFDF5',
  },
  [NotificationCategory.SYSTEM]: {
    emoji: '⚙️',
    accentColor: '#4B5563',
    iconBg: '#F3F4F6',
  },
  [NotificationCategory.MARKETING]: {
    emoji: '📢',
    accentColor: '#D97706',
    iconBg: '#FFFBEB',
  },
  [NotificationCategory.REMINDER]: {
    emoji: '⏰',
    accentColor: '#DC2626',
    iconBg: '#FEF2F2',
  },
};

const DEFAULT_CONFIG: CategoryConfig = {
  emoji: '🔔',
  accentColor: colors.primary,
  iconBg: colors.primaryVariants[50],
};

interface NotificationCardProps {
  notification: NotificationHistoryItem;
  onPress: (notification: NotificationHistoryItem) => void;
  onMarkAsRead: (notification: NotificationHistoryItem) => void;
  onDelete: (notification: NotificationHistoryItem) => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
  onMarkAsRead,
  onDelete,
}) => {
  const scale = useSharedValue(1);
  const config = CATEGORY_CONFIG[notification.category] ?? DEFAULT_CONFIG;

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.983, { damping: 20, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  };

  return (
    <Animated.View
      style={[
        styles.card,
        !notification.isRead && styles.cardUnread,
        cardAnimatedStyle,
      ]}
    >
      {!notification.isRead && (
        <View style={[styles.unreadAccent, { backgroundColor: config.accentColor }]} />
      )}

      <Pressable
        style={styles.pressable}
        onPress={() => onPress(notification)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${notification.isRead ? '' : 'Unread. '}${notification.title}. ${notification.body}`}
        accessibilityHint="Tap to open"
      >
        {/* Category icon */}
        <View style={[styles.iconCircle, { backgroundColor: config.iconBg }]}>
          <Text style={styles.iconEmoji}>{config.emoji}</Text>
        </View>

        {/* Text content */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, !notification.isRead && styles.titleUnread]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {notification.title}
            </Text>
            <Text style={styles.timestamp}>{formatTimestamp(notification.sentAt)}</Text>
          </View>

          {!!notification.body && (
            <Text style={styles.body} numberOfLines={2} ellipsizeMode="tail">
              {notification.body}
            </Text>
          )}

          {!notification.isRead && (
            <View style={styles.unreadPillRow}>
              <View style={[styles.unreadPill, { backgroundColor: config.accentColor }]}>
                <Text style={styles.unreadPillText}>New</Text>
              </View>
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {!notification.isRead && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.markReadBtn]}
              onPress={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification);
              }}
              accessible
              accessibilityLabel="Mark as read"
              accessibilityRole="button"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <MaterialIcons name="check" size={15} color="#059669" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={(e) => {
              e.stopPropagation();
              onDelete(notification);
            }}
            accessible
            accessibilityLabel="Delete notification"
            accessibilityRole="button"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <MaterialIcons name="delete-outline" size={15} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    marginHorizontal: spacing[4],
    marginVertical: 5,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  cardUnread: {
    backgroundColor: '#FAFBFF',
  },
  unreadAccent: {
    width: 3,
    alignSelf: 'stretch',
    flexShrink: 0,
  },
  pressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
    flexShrink: 0,
  },
  iconEmoji: {
    fontSize: 20,
    lineHeight: 24,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 3,
    gap: spacing[2],
  },
  title: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.text.secondary,
    flex: 1,
    lineHeight: 20,
  },
  titleUnread: {
    fontWeight: '700',
    color: colors.secondary[900],
  },
  timestamp: {
    fontSize: 11,
    color: colors.text.tertiary,
    fontWeight: '500',
    flexShrink: 0,
    lineHeight: 20,
  },
  body: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  unreadPillRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  unreadPill: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unreadPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  actions: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    marginLeft: spacing[2],
    flexShrink: 0,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markReadBtn: {
    backgroundColor: '#ECFDF5',
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
  },
});

export default NotificationCard;

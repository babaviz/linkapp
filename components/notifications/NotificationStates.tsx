import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, typography } from '../../theme';
import { getUserFacingError } from '../../utils/userFacingError';

export const NotificationEmptyState: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => (
  <View style={styles.centerContainer}>
    <View style={styles.emptyIconContainer}>
      <Text style={styles.emptyEmoji}>🔕</Text>
    </View>
    <Text style={styles.emptyTitle}>All caught up!</Text>
    <Text style={styles.emptyMessage}>
      You have no new notifications right now.{'\n'}Pull down to refresh.
    </Text>
    {onRefresh && (
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={onRefresh}
        accessible
        accessibilityLabel="Refresh notifications"
        accessibilityRole="button"
      >
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    )}
  </View>
);

interface NotificationErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export const NotificationErrorState: React.FC<NotificationErrorStateProps> = ({
  error,
  onRetry,
}) => {
  const friendly = getUserFacingError(error || new Error('Unknown'), {
    action: 'load notifications',
    displayStyle: 'inline',
  });

  return (
    <View style={styles.centerContainer}>
      <View style={styles.errorIconContainer}>
        <Text style={styles.errorEmoji}>⚠️</Text>
      </View>
      <Text style={styles.errorTitle}>{friendly.title}</Text>
      <Text style={styles.errorMessage}>{friendly.message}</Text>
      {onRetry && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          accessible
          accessibilityLabel="Retry loading notifications"
          accessibilityRole="button"
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const NotificationListFooter: React.FC<{ loading: boolean }> = ({ loading }) => {
  if (!loading) return null;
  return (
    <View style={styles.footerContainer}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.footerText}>Loading more…</Text>
    </View>
  );
};

const SkeletonPulse: React.FC<{ width: number | string; height?: number; borderRadius?: number }> = ({
  width,
  height = 14,
  borderRadius = 6,
}) => {
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: colors.secondary[200],
        },
        animStyle,
      ]}
    />
  );
};

export const NotificationCardSkeleton: React.FC = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonAccent} />
    <View style={styles.skeletonContent}>
      <View style={styles.skeletonIcon} />
      <View style={styles.skeletonText}>
        <View style={styles.skeletonTitleRow}>
          <SkeletonPulse width="58%" height={14} />
          <SkeletonPulse width="18%" height={11} />
        </View>
        <SkeletonPulse width="82%" height={12} borderRadius={4} />
        <View style={{ height: 4 }} />
        <SkeletonPulse width="60%" height={12} borderRadius={4} />
      </View>
    </View>
  </View>
);

export const NotificationSkeletonList: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <View style={styles.skeletonList}>
    {Array.from({ length: count }, (_, index) => (
      <NotificationCardSkeleton key={index} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[12],
    backgroundColor: colors.secondary[100],
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.secondary[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  emptyEmoji: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  emptyMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing[6],
  },
  refreshButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: 10,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  errorIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  errorEmoji: {
    fontSize: 30,
  },
  errorTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  errorMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing[6],
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[5],
    gap: spacing[2],
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  skeletonList: {
    flex: 1,
    paddingTop: spacing[2],
    backgroundColor: colors.secondary[100],
  },
  skeletonCard: {
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
  skeletonAccent: {
    width: 3,
    backgroundColor: colors.secondary[200],
    alignSelf: 'stretch',
  },
  skeletonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
  },
  skeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary[200],
    marginRight: spacing[3],
    flexShrink: 0,
  },
  skeletonText: {
    flex: 1,
    gap: spacing[1],
  },
  skeletonTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
    gap: spacing[2],
  },
});

export default {
  NotificationEmptyState,
  NotificationErrorState,
  NotificationListFooter,
  NotificationCardSkeleton,
  NotificationSkeletonList,
};

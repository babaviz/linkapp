import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { supabase } from '../services/supabaseClient';
import notificationService from '../services/notificationService';
import badgeService from '../services/badgeService';
import { NotificationList } from '../components/notifications';
import {
  NotificationHistoryItem,
  NotificationListOptions,
  NotificationCategory,
} from '../types/notifications';
import { colors, spacing, typography } from '../theme';
import { AppDispatch } from '../redux/store';
import { getUserFacingError } from '../utils/userFacingError';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  recordNotificationClick,
  setRealtimeConnected,
  addNotification,
  updateNotification,
  removeNotification,
  selectNotificationState,
} from '../redux/slices/notificationSlice';

const ITEMS_PER_PAGE = 20;

export default function NotificationScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const notificationState = useSelector(selectNotificationState);
  const [realtimeUnsubscribe, setRealtimeUnsubscribe] = useState<(() => void) | null>(null);
  
  const {
    notifications,
    loading,
    refreshing,
    error,
    hasMore,
    unreadCount,
    currentPage,
  } = notificationState;

  // Load notifications using Redux
  const loadNotifications = useCallback(async (
    page: number = 0, 
    isRefresh: boolean = false
  ) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        
        return;
      }

      const options: NotificationListOptions = {
        limit: ITEMS_PER_PAGE,
        offset: page * ITEMS_PER_PAGE,
        sortBy: 'sentAt',
        sortOrder: 'desc',
      };

      dispatch(fetchNotifications({
        userId: user.id,
        options,
        isRefresh,
      }));
    } catch {
      // Auth error - UI shows loading/error state from Redux
    }
  }, [dispatch]);

  // Setup real-time updates with Redux integration
  const setupRealtimeUpdates = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const unsubscribe = notificationService.subscribeToNotifications(
      user.id,
      (payload) => {
        
        dispatch(setRealtimeConnected(true));
        
        // Handle different types of real-time events
        switch (payload.eventType) {
          case 'INSERT':
            if (payload.new) {
              dispatch(addNotification({
                id: payload.new.id,
                userId: payload.new.user_id,
                title: payload.new.title,
                body: payload.new.body,
                category: payload.new.category,
                data: payload.new.data || {},
                status: payload.new.status,
                sentAt: new Date(payload.new.sent_at),
                deliveredAt: payload.new.delivered_at ? new Date(payload.new.delivered_at) : undefined,
                clickedAt: payload.new.clicked_at ? new Date(payload.new.clicked_at) : undefined,
                readAt: payload.new.read_at ? new Date(payload.new.read_at) : undefined,
                isRead: Boolean(payload.new.read_at),
              }));
            }
            break;
          case 'UPDATE':
            if (payload.new) {
              dispatch(updateNotification({
                id: payload.new.id,
                userId: payload.new.user_id,
                title: payload.new.title,
                body: payload.new.body,
                category: payload.new.category,
                data: payload.new.data || {},
                status: payload.new.status,
                sentAt: new Date(payload.new.sent_at),
                deliveredAt: payload.new.delivered_at ? new Date(payload.new.delivered_at) : undefined,
                clickedAt: payload.new.clicked_at ? new Date(payload.new.clicked_at) : undefined,
                readAt: payload.new.read_at ? new Date(payload.new.read_at) : undefined,
                isRead: Boolean(payload.new.read_at),
              }));
            }
            break;
          case 'DELETE':
            if (payload.old) {
              dispatch(removeNotification(payload.old.id));
            }
            break;
        }
      }
    );

    setRealtimeUnsubscribe(() => unsubscribe);
  }, [dispatch]);

  // Initial load and setup
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
      setupRealtimeUpdates();
      
      // Reset badge count when user views notifications screen
      const resetBadge = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const unreadCount = await notificationService.getUnreadNotificationsCount(user.id);
            await badgeService.setCount(unreadCount);
          }
        } catch {
          // badge reset is non-critical
        }
      };
      resetBadge();

      return () => {
        if (realtimeUnsubscribe) {
          realtimeUnsubscribe();
          setRealtimeUnsubscribe(null);
        }
      };
    }, [loadNotifications, setupRealtimeUpdates])
  );

  // Refresh notifications
  const handleRefresh = useCallback(async () => {
    await loadNotifications(0, true);
  }, [loadNotifications]);

  // Load more notifications (pagination)
  const handleLoadMore = useCallback(async () => {
    if (hasMore && !loading) {
      const nextPage = currentPage + 1;
      await loadNotifications(nextPage, false);
    }
  }, [hasMore, loading, currentPage, loadNotifications]);

  // Handle notification press using Redux
  const handleNotificationPress = useCallback(async (notification: NotificationHistoryItem) => {
    try {
      // Record click (which also marks as read)
      dispatch(recordNotificationClick(notification.id));

      // Handle navigation based on notification category and data
      const { category, data } = notification;
      
      // Use a slight delay to ensure state updates complete
      setTimeout(() => {
        try {
          if (category === NotificationCategory.JOB_ALERT && data?.jobId) {
            navigation.navigate('JobDetails', { jobId: data.jobId, job: data.job });
          } else if (category === NotificationCategory.MESSAGE && (data?.chatId || data?.userId)) {
            navigation.navigate('Messages', { chatId: data.chatId, userId: data.userId });
          } else if (category === NotificationCategory.PAYMENT && data?.amount) {
            navigation.navigate('SubscriptionPlans');
          } else if (data?.type === 'property' && data?.propertyId) {
            navigation.navigate('PropertyDetails', { propertyId: data.propertyId, property: data.property });
          } else if (data?.type === 'service' && data?.serviceId) {
            navigation.navigate('ServiceDetails', { serviceId: data.serviceId, service: data.service });
          } else if (data?.type === 'datemi' && data?.profileId) {
            navigation.navigate('DateMiProfileView', { profileId: data.profileId });
          } else if (data?.screen) {
            navigation.navigate(data.screen, data.params || {});
          }
        } catch {
          // navigation errors are non-critical
        }
      }, 100);
      
    } catch (err) {
      const friendly = getUserFacingError(err, {
        action: 'open this notification',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  }, [dispatch, navigation]);

  // Mark notification as read using Redux
  const handleMarkAsRead = useCallback(async (notification: NotificationHistoryItem) => {
    if (notification.isRead) return;
    dispatch(markNotificationAsRead(notification.id));
  }, [dispatch]);

  // Delete notification using Redux
  const handleDeleteNotification = useCallback((notification: NotificationHistoryItem) => {
    Alert.alert(
      'Remove Notification',
      'This notification will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => dispatch(deleteNotification(notification.id)),
        },
      ]
    );
  }, [dispatch]);

  // Mark all as read using Redux
  const handleMarkAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      dispatch(markAllNotificationsAsRead(user.id));
    } catch (err) {
      const friendly = getUserFacingError(err, {
        action: 'mark all notifications as read',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  }, [unreadCount, dispatch]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessible
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="arrow-back" size={20} color={colors.secondary[700]} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
            accessible
            accessibilityLabel={`Mark all ${unreadCount} notifications as read`}
            accessibilityRole="button"
          >
            <Text style={styles.markAllButtonText}>Mark All</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <NotificationList
        notifications={notifications}
        loading={loading}
        refreshing={refreshing}
        error={error}
        hasMore={hasMore}
        onRefresh={handleRefresh}
        onLoadMore={handleLoadMore}
        onNotificationPress={handleNotificationPress}
        onMarkAsRead={handleMarkAsRead}
        onDeleteNotification={handleDeleteNotification}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.secondary[100],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.secondary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: spacing[2],
    minWidth: 22,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 80,
  },
  markAllButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 8,
    backgroundColor: colors.primaryVariants[50],
    borderWidth: 1,
    borderColor: colors.primaryVariants[200],
  },
  markAllButtonText: {
    color: colors.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
});

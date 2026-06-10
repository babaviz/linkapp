import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { useMemo } from 'react';

interface NotificationBadges {
  // Badge count for Date Mi tab (unread messages)
  dateMiBadgeCount: number;
  
  // Badge count for Profile tab (general notifications)
  profileBadgeCount: number;
  
  // Total badge count across all tabs
  totalBadgeCount: number;
}

/**
 * Custom hook to manage notification badge counts
 * Provides badge counts for Date Mi (messages) and Profile (general notifications)
 */
export const useNotificationBadges = (): NotificationBadges => {
  // Get Date Mi badge count from Date Mi notification state (messages + likes + missed calls)
  const dateMiTotalBadgeCount = useSelector((state: RootState) =>
    state.datemi?.notifications?.totalBadgeCount || 0
  );
  
  // Get general notification unread count from notifications state
  const notificationUnreadCount = useSelector((state: RootState) => 
    state.notifications?.unreadCount || 0
  );

  // Calculate badge counts
  const badges = useMemo(() => {
    // Date Mi tab shows total pending Date Mi interactions
    const dateMiBadgeCount = dateMiTotalBadgeCount;
    
    // Profile tab shows all other app-wide notifications
    const profileBadgeCount = notificationUnreadCount;
    
    // Total badge count
    const totalBadgeCount = dateMiBadgeCount + profileBadgeCount;
    
    return {
      dateMiBadgeCount,
      profileBadgeCount,
      totalBadgeCount,
    };
  }, [dateMiTotalBadgeCount, notificationUnreadCount]);

  return badges;
};

/**
 * Custom hook to check if there are any unread notifications
 */
export const useHasUnreadNotifications = (): boolean => {
  const { totalBadgeCount } = useNotificationBadges();
  return totalBadgeCount > 0;
};

/**
 * Custom hook to get specific tab badge count
 */
export const useTabBadgeCount = (tabName: 'DateMi' | 'Profile'): number => {
  const { dateMiBadgeCount, profileBadgeCount } = useNotificationBadges();
  
  switch (tabName) {
    case 'DateMi':
      return dateMiBadgeCount;
    case 'Profile':
      return profileBadgeCount;
    default:
      return 0;
  }
};

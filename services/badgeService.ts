import ShortcutBadge from 'react-native-shortcut-badge';
import { Platform } from 'react-native';

class BadgeService {
  private currentCount: number = 0;

  async setCount(count: number): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    try {
      // Ensure count is a valid number
      const validCount = Math.max(0, Math.floor(count));
      const previousCount = this.currentCount;
      
      const isSet = await ShortcutBadge.setCount(validCount);
      if (isSet) {
        this.currentCount = validCount;
        if (__DEV__) {
          console.log(`[BadgeService] Badge count set to ${validCount} (was ${previousCount})`);
        }
      } else {
        if (__DEV__) {
          console.warn('[BadgeService] Badge count not supported on this launcher');
        }
      }
      return isSet;
    } catch (error) {
      if (__DEV__) {
        console.error('[BadgeService] Error setting badge count:', error);
      }
      return false;
    }
  }

  async increment(amount: number = 1): Promise<boolean> {
    const newCount = Math.max(0, this.currentCount + amount);
    return this.setCount(newCount);
  }

  async decrement(amount: number = 1): Promise<boolean> {
    const newCount = Math.max(0, this.currentCount - amount);
    return this.setCount(newCount);
  }

  async reset(): Promise<boolean> {
    return this.setCount(0);
  }

  getCurrentCount(): number {
    return this.currentCount;
  }

  async updateFromUnreadCounts(unreadMessages: number = 0, notifications: number = 0): Promise<boolean> {
    const totalUnread = unreadMessages + notifications;
    return this.setCount(totalUnread);
  }
}

export default new BadgeService();

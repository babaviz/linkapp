import * as Notifications from 'expo-notifications';
import { PropertyInquiry } from '../types/property';

export class PropertyNotificationService {
  /**
   * Initialize notification handler
   */
  static async initialize() {
    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      } as Notifications.NotificationBehavior),
    });

    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      
      return false;
    }

    return true;
  }

  /**
   * Send local notification for new property inquiry
   */
  static async notifyNewInquiry(inquiry: PropertyInquiry, propertyTitle: string) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🏠 New Property Inquiry!',
          body: `You have a new inquiry for "${propertyTitle}"`,
          data: { 
            type: 'property_inquiry',
            inquiryId: inquiry.id,
            propertyId: inquiry.property_id 
          },
          sound: true,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      
    }
  }

  /**
   * Send notification when inquiry is responded to
   */
  static async notifyInquiryResponse(inquiry: PropertyInquiry, propertyTitle: string) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Property Owner Responded!',
          body: `Your inquiry about "${propertyTitle}" has been answered`,
          data: { 
            type: 'inquiry_response',
            inquiryId: inquiry.id,
            propertyId: inquiry.property_id 
          },
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      
    }
  }

  /**
   * Send notification for property status change
   */
  static async notifyPropertyStatusChange(
    propertyId: string,
    propertyTitle: string,
    newStatus: string
  ) {
    try {
      let message = '';
      switch (newStatus) {
        case 'available':
          message = `"${propertyTitle}" is now available!`;
          break;
        case 'rented':
          message = `"${propertyTitle}" has been rented`;
          break;
        case 'sold':
          message = `"${propertyTitle}" has been sold`;
          break;
        default:
          message = `Status update for "${propertyTitle}"`;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Property Status Update',
          body: message,
          data: { 
            type: 'property_status',
            propertyId,
            newStatus 
          },
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      
    }
  }

  /**
   * Send notification for new property match
   */
  static async notifyPropertyMatch(propertyTitle: string, propertyId: string) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 New Property Match!',
          body: `Check out "${propertyTitle}" - it matches your search criteria!`,
          data: { 
            type: 'property_match',
            propertyId 
          },
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      
    }
  }

  /**
   * Send reminder notification for property viewing
   */
  static async scheduleViewingReminder(
    propertyTitle: string,
    propertyId: string,
    viewingDate: Date
  ) {
    try {
      // Set reminder 1 hour before viewing
      const reminderDate = new Date(viewingDate.getTime() - 60 * 60 * 1000);
      
      if (reminderDate > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏰ Property Viewing Reminder',
            body: `Your viewing for "${propertyTitle}" is in 1 hour`,
            data: { 
              type: 'viewing_reminder',
              propertyId,
              viewingDate: viewingDate.toISOString()
            },
            sound: true,
          },
          trigger: { date: reminderDate } as any,
        });
      }
    } catch (error) {
      
    }
  }

  /**
   * Clear all notifications
   */
  static async clearAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      
    }
  }

  /**
   * Cancel scheduled notifications
   */
  static async cancelAllScheduledNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      
    }
  }
}

export default PropertyNotificationService;

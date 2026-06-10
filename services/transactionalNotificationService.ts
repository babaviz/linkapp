import notificationService from './notificationService';
import { supabase } from './supabaseClient';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import emailNotificationService from './emailNotificationService';

export enum TransactionalNotificationType {
  SIGN_IN_ALERT = 'sign_in_alert',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  SUBSCRIPTION_ACTIVATED = 'subscription_activated',
  SUBSCRIPTION_RENEWED = 'subscription_renewed',
  SUBSCRIPTION_EXPIRED = 'subscription_expired',
  SUBSCRIPTION_EXPIRING_SOON = 'subscription_expiring_soon',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_UPGRADED = 'subscription_upgraded',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  SECURITY_ALERT_FAILED_LOGIN = 'security_alert_failed_login',
  SECURITY_ALERT_ACCOUNT_LOCKED = 'security_alert_account_locked',
  SECURITY_ALERT_NEW_DEVICE = 'security_alert_new_device',
  EMAIL_VERIFIED = 'email_verified',
}

export interface TransactionalNotificationData {
  type: TransactionalNotificationType;
  userId: string;
  priority: 'high' | 'max' | 'default';
  metadata?: Record<string, any>;
  shouldSendEmail?: boolean;
  shouldSendPush?: boolean;
}

interface NotificationTemplate {
  title: string;
  body: string;
  channelId: string;
  categoryId: string;
}

interface DeviceInfo {
  deviceName: string;
  deviceType: string;
  osName: string;
  osVersion: string;
  location?: string;
  ipAddress?: string;
}

class TransactionalNotificationService {
  private deduplicationCache: Map<string, number> = new Map();
  private readonly DEDUPLICATION_WINDOW_MS = 24 * 60 * 60 * 1000;
  private retryAttempts = 3;
  private retryDelayMs = 1000;

  private getTemplate(
    type: TransactionalNotificationType,
    metadata?: Record<string, any>
  ): NotificationTemplate {
    const templates: Record<TransactionalNotificationType, NotificationTemplate> = {
      [TransactionalNotificationType.SIGN_IN_ALERT]: {
        title: 'New Sign-In Detected',
        body: `Your account was accessed from ${metadata?.deviceName || 'a new device'} on ${metadata?.osName || Platform.OS}. If this wasn't you, please secure your account immediately.`,
        channelId: 'system',
        categoryId: 'system',
      },
      [TransactionalNotificationType.PASSWORD_CHANGED]: {
        title: 'Password Changed Successfully',
        body: 'Your password was changed. If you did not make this change, please contact support immediately.',
        channelId: 'system',
        categoryId: 'system',
      },
      [TransactionalNotificationType.PASSWORD_RESET_REQUESTED]: {
        title: 'Password Reset Requested',
        body: 'A password reset was requested for your account. If you did not request this, please ignore this message.',
        channelId: 'system',
        categoryId: 'system',
      },
      [TransactionalNotificationType.SUBSCRIPTION_ACTIVATED]: {
        title: 'Subscription Activated! 🎉',
        body: `Welcome to ${metadata?.tier || 'Premium'}! Your subscription is now active and all features are unlocked.`,
        channelId: 'payments',
        categoryId: 'payment',
      },
      [TransactionalNotificationType.SUBSCRIPTION_RENEWED]: {
        title: 'Subscription Renewed',
        body: `Your ${metadata?.tier || 'Premium'} subscription has been renewed successfully. Thank you for continuing with us!`,
        channelId: 'payments',
        categoryId: 'payment',
      },
      [TransactionalNotificationType.SUBSCRIPTION_EXPIRED]: {
        title: 'Subscription Expired',
        body: `Your ${metadata?.tier || 'Premium'} subscription has expired. Renew now to continue enjoying premium features.`,
        channelId: 'system',
        categoryId: 'system',
      },
      [TransactionalNotificationType.SUBSCRIPTION_EXPIRING_SOON]: {
        title: 'Subscription Expiring Soon',
        body: `Your ${metadata?.tier || 'Premium'} subscription expires in ${metadata?.daysRemaining || 'a few'} days. Renew now to avoid interruption.`,
        channelId: 'system',
        categoryId: 'system',
      },
      [TransactionalNotificationType.SUBSCRIPTION_CANCELLED]: {
        title: 'Subscription Cancelled',
        body: `Your ${metadata?.tier || 'Premium'} subscription has been cancelled. You'll have access until ${metadata?.expiryDate || 'the end of your billing period'}.`,
        channelId: 'system',
        categoryId: 'system',
      },
      [TransactionalNotificationType.SUBSCRIPTION_UPGRADED]: {
        title: 'Subscription Upgraded! 🚀',
        body: `You've been upgraded to ${metadata?.newTier || 'Premium'}! Enjoy your new features.`,
        channelId: 'payments',
        categoryId: 'payment',
      },
      [TransactionalNotificationType.PAYMENT_SUCCESS]: {
        title: 'Payment Successful',
        body: `Your payment of ${metadata?.amount || ''} ${metadata?.currency || ''} was processed successfully. Receipt: ${metadata?.reference || 'N/A'}`,
        channelId: 'payments',
        categoryId: 'payment',
      },
      [TransactionalNotificationType.PAYMENT_FAILED]: {
        title: 'Payment Failed',
        body: `Your payment could not be processed. ${metadata?.reason || 'Please check your payment method and try again.'}`,
        channelId: 'payments',
        categoryId: 'payment',
      },
      [TransactionalNotificationType.SECURITY_ALERT_FAILED_LOGIN]: {
        title: 'Failed Login Attempt',
        body: `Someone tried to access your account with an incorrect password. If this wasn't you, please secure your account.`,
        channelId: 'system',
        categoryId: 'system',
      },
      [TransactionalNotificationType.SECURITY_ALERT_ACCOUNT_LOCKED]: {
        title: 'Account Temporarily Locked',
        body: `Your account has been locked due to multiple failed login attempts. Try again in ${metadata?.minutesRemaining || '15'} minutes.`,
        channelId: 'system',
        categoryId: 'system',
      },
      [TransactionalNotificationType.SECURITY_ALERT_NEW_DEVICE]: {
        title: 'New Device Detected',
        body: `Your account was accessed from a new ${metadata?.deviceType || 'device'}. If this wasn't you, please secure your account immediately.`,
        channelId: 'system',
        categoryId: 'system',
      },
      [TransactionalNotificationType.EMAIL_VERIFIED]: {
        title: 'Email Verified Successfully',
        body: 'Your email has been verified! You now have full access to all features.',
        channelId: 'system',
        categoryId: 'system',
      },
    };

    return templates[type];
  }

  private async getDeviceInfo(): Promise<DeviceInfo> {
    const deviceInfo: DeviceInfo = {
      deviceName: Device.deviceName || 'Unknown Device',
      deviceType: Device.deviceType ? Device.DeviceType[Device.deviceType] : 'Unknown',
      osName: Platform.OS,
      osVersion: Platform.Version.toString(),
      location: Localization.getLocales()[0]?.regionCode || undefined,
    };

    return deviceInfo;
  }

  private generateDeduplicationKey(type: TransactionalNotificationType, userId: string): string {
    return `${type}:${userId}`;
  }

  private shouldSendNotification(key: string): boolean {
    const lastSent = this.deduplicationCache.get(key);
    if (!lastSent) return true;

    const now = Date.now();
    if (now - lastSent < this.DEDUPLICATION_WINDOW_MS) {
      return false;
    }

    this.deduplicationCache.delete(key);
    return true;
  }

  private markNotificationSent(key: string): void {
    this.deduplicationCache.set(key, Date.now());
    
    setTimeout(() => {
      this.deduplicationCache.delete(key);
    }, this.DEDUPLICATION_WINDOW_MS);
  }

  private async storeNotificationRecord(
    userId: string,
    type: TransactionalNotificationType,
    template: NotificationTemplate,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.from('notification_history').insert({
        user_id: userId,
        title: template.title,
        body: template.body,
        category: template.categoryId,
        data: {
          type,
          transactional: true,
          ...metadata,
        },
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[TransactionalNotification] Failed to store notification record:', error);
    }
  }

  private async sendWithRetry(
    userId: string,
    template: NotificationTemplate,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        await notificationService.sendLocalNotification({
          title: template.title,
          body: template.body,
          data: metadata || {},
          categoryId: template.categoryId,
        } as any);

        return true;
      } catch (error) {
        console.error(
          `[TransactionalNotification] Send attempt ${attempt}/${this.retryAttempts} failed:`,
          error
        );

        if (attempt < this.retryAttempts) {
          const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    return false;
  }

  async sendTransactionalNotification(data: TransactionalNotificationData): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const { type, userId, metadata, shouldSendPush = true, shouldSendEmail = true } = data;

      const deduplicationKey = this.generateDeduplicationKey(type, userId);
      if (!this.shouldSendNotification(deduplicationKey)) {
        return {
          success: false,
          message: 'Duplicate notification suppressed (sent within last 24 hours)',
        };
      }

      const deviceInfo = await this.getDeviceInfo();
      const enrichedMetadata = {
        ...metadata,
        deviceInfo,
        timestamp: new Date().toISOString(),
      };

      const template = this.getTemplate(type, enrichedMetadata);

      await this.storeNotificationRecord(userId, type, template, enrichedMetadata);

      let pushSent = false;
      let emailSent = false;

      if (shouldSendPush) {
        pushSent = await this.sendWithRetry(userId, template, enrichedMetadata);
      }

      // Send email fallback if push failed or for critical notifications
      if (shouldSendEmail && (!pushSent || this.isCriticalNotification(type))) {
        emailSent = await this.sendEmailNotification(userId, type, enrichedMetadata);
      }

      this.markNotificationSent(deduplicationKey);

      if (pushSent || emailSent) {
        return {
          success: true,
          message: `Notification sent via ${pushSent ? 'push' : ''}${pushSent && emailSent ? ' and ' : ''}${emailSent ? 'email' : ''}`,
        };
      }

      return { success: false, message: 'Failed to send notification via push and email' };
    } catch (error) {
      console.error('[TransactionalNotification] Error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private isCriticalNotification(type: TransactionalNotificationType): boolean {
    const criticalTypes = [
      TransactionalNotificationType.PASSWORD_CHANGED,
      TransactionalNotificationType.PAYMENT_SUCCESS,
      TransactionalNotificationType.SECURITY_ALERT_ACCOUNT_LOCKED,
      TransactionalNotificationType.SECURITY_ALERT_NEW_DEVICE,
    ];
    return criticalTypes.includes(type);
  }

  private async sendEmailNotification(
    userId: string,
    type: TransactionalNotificationType,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      if (!emailNotificationService.isConfigured()) {
        return false;
      }

      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      if (!user?.email) {
        return false;
      }

      const email = user.email;

      switch (type) {
        case TransactionalNotificationType.SIGN_IN_ALERT:
          await emailNotificationService.sendSignInAlert(email, metadata?.deviceInfo || {});
          break;
        case TransactionalNotificationType.PASSWORD_CHANGED:
          await emailNotificationService.sendPasswordChangedAlert(email);
          break;
        case TransactionalNotificationType.PAYMENT_SUCCESS:
          await emailNotificationService.sendPaymentReceipt(
            email,
            metadata?.amount || 0,
            metadata?.currency || 'KES',
            metadata?.reference || 'N/A',
            metadata?.tier || 'Premium'
          );
          break;
        case TransactionalNotificationType.SUBSCRIPTION_ACTIVATED:
          await emailNotificationService.sendSubscriptionActivated(
            email,
            metadata?.tier || 'Premium',
            metadata?.endDate || new Date().toISOString()
          );
          break;
        case TransactionalNotificationType.SUBSCRIPTION_EXPIRING_SOON:
          await emailNotificationService.sendSubscriptionExpiringSoon(
            email,
            metadata?.tier || 'Premium',
            metadata?.daysRemaining || 7
          );
          break;
        case TransactionalNotificationType.SUBSCRIPTION_EXPIRED:
          await emailNotificationService.sendSubscriptionExpired(email, metadata?.tier || 'Premium');
          break;
        default:
          return false;
      }

      return true;
    } catch (error) {
      console.error('[TransactionalNotification] Email fallback failed:', error);
      return false;
    }
  }

  async sendSignInAlert(userId: string, metadata?: Record<string, any>): Promise<void> {
    const deviceInfo = await this.getDeviceInfo();
    await this.sendTransactionalNotification({
      type: TransactionalNotificationType.SIGN_IN_ALERT,
      userId,
      priority: 'high',
      metadata: {
        ...metadata,
        ...deviceInfo,
      },
    });
  }

  async sendPasswordChangedAlert(userId: string): Promise<void> {
    await this.sendTransactionalNotification({
      type: TransactionalNotificationType.PASSWORD_CHANGED,
      userId,
      priority: 'max',
    });
  }

  async sendPasswordResetRequestedAlert(userId: string): Promise<void> {
    await this.sendTransactionalNotification({
      type: TransactionalNotificationType.PASSWORD_RESET_REQUESTED,
      userId,
      priority: 'high',
    });
  }

  async sendSubscriptionActivated(
    userId: string,
    tier: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.sendTransactionalNotification({
      type: TransactionalNotificationType.SUBSCRIPTION_ACTIVATED,
      userId,
      priority: 'high',
      metadata: { tier, ...metadata },
    });
  }

  async sendSubscriptionRenewed(
    userId: string,
    tier: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.sendTransactionalNotification({
      type: TransactionalNotificationType.SUBSCRIPTION_RENEWED,
      userId,
      priority: 'default',
      metadata: { tier, ...metadata },
    });
  }

  async sendSubscriptionExpired(
    userId: string,
    tier: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.sendTransactionalNotification({
      type: TransactionalNotificationType.SUBSCRIPTION_EXPIRED,
      userId,
      priority: 'high',
      metadata: { tier, ...metadata },
    });
  }

  async sendSubscriptionExpiringSoon(
    userId: string,
    tier: string,
    daysRemaining: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.sendTransactionalNotification({
      type: TransactionalNotificationType.SUBSCRIPTION_EXPIRING_SOON,
      userId,
      priority: 'high',
      metadata: { tier, daysRemaining, ...metadata },
    });
  }

  async sendSubscriptionCancelled(
    userId: string,
    tier: string,
    expiryDate: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.sendTransactionalNotification({
      type: TransactionalNotificationType.SUBSCRIPTION_CANCELLED,
      userId,
      priority: 'default',
      metadata: { tier, expiryDate, ...metadata },
    });
  }

  async sendSubscriptionUpgraded(
    userId: string,
    oldTier: string,
    newTier: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.sendTransactionalNotification({
      type: TransactionalNotificationType.SUBSCRIPTION_UPGRADED,
      userId,
      priority: 'high',
      metadata: { oldTier, newTier, ...metadata },
    });
  }

  async sendPaymentSuccess(
    userId: string,
    amount: number,
    currency: string,
    reference: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.sendTransactionalNotification({
      type: TransactionalNotificationType.PAYMENT_SUCCESS,
      userId,
      priority: 'max',
      metadata: { amount, currency, reference, ...metadata },
    });
  }

  async sendPaymentFailed(
    userId: string,
    reason: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.sendTransactionalNotification({
      type: TransactionalNotificationType.PAYMENT_FAILED,
      userId,
      priority: 'high',
      metadata: { reason, ...metadata },
    });
  }

  async sendFailedLoginAlert(userId: string, metadata?: Record<string, any>): Promise<void> {
    await this.sendTransactionalNotification({
      type: TransactionalNotificationType.SECURITY_ALERT_FAILED_LOGIN,
      userId,
      priority: 'high',
      metadata,
    });
  }

  async sendAccountLockedAlert(userId: string, minutesRemaining: number): Promise<void> {
    await this.sendTransactionalNotification({
      type: TransactionalNotificationType.SECURITY_ALERT_ACCOUNT_LOCKED,
      userId,
      priority: 'max',
      metadata: { minutesRemaining },
    });
  }

  async sendNewDeviceAlert(userId: string, deviceType: string): Promise<void> {
    await this.sendTransactionalNotification({
      type: TransactionalNotificationType.SECURITY_ALERT_NEW_DEVICE,
      userId,
      priority: 'high',
      metadata: { deviceType },
    });
  }

  async sendEmailVerified(userId: string): Promise<void> {
    await this.sendTransactionalNotification({
      type: TransactionalNotificationType.EMAIL_VERIFIED,
      userId,
      priority: 'default',
    });
  }
}

export const transactionalNotificationService = new TransactionalNotificationService();
export default transactionalNotificationService;

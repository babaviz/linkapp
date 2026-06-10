export interface NotificationData {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  categoryId?: string;
  priority?: 'default' | 'normal' | 'high' | 'max';
  sound?: string | boolean;
  badge?: number;
  channelId?: string;
}

export interface NotificationToken {
  token: string;
  userId: string;
  platform: 'ios' | 'android' | 'web';
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPermission {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
  expires: 'never' | number;
}

export interface NotificationSettings {
  userId: string;
  jobAlerts: boolean;
  messageNotifications: boolean;
  paymentAlerts: boolean;
  systemUpdates: boolean;
  marketingMessages: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string;   // HH:MM format
  };
}

export enum NotificationCategory {
  JOB_ALERT = 'job_alert',
  MESSAGE = 'message',
  PAYMENT = 'payment',
  SYSTEM = 'system',
  MARKETING = 'marketing',
  REMINDER = 'reminder',
}

export interface NotificationCategoryConfig {
  identifier: string;
  displayName: string;
  description: string;
  actions: NotificationAction[];
  allowInCarPlay?: boolean;
  allowAnnouncement?: boolean;
  hiddenPreviewsShowTitle?: boolean;
  hiddenPreviewsShowSubtitle?: boolean;
  options?: {
    customDismissAction?: boolean;
    allowInCarPlay?: boolean;
    allowAnnouncement?: boolean;
  };
}

export interface NotificationAction {
  identifier: string;
  buttonTitle: string;
  textInput?: {
    submitButtonTitle: string;
    placeholder: string;
  };
  options?: {
    opensAppToForeground?: boolean;
    isAuthenticationRequired?: boolean;
    isDestructive?: boolean;
  };
}

export interface PushNotificationPayload {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string | 'default';
  badge?: number;
  priority?: 'default' | 'normal' | 'high' | 'max';
  channelId?: string;
  categoryId?: string;
  ttl?: number;
}

export interface NotificationResponse {
  notification: {
    request: {
      identifier: string;
      content: {
        title: string;
        body: string;
        data: Record<string, any>;
        categoryIdentifier?: string;
      };
      trigger: {
        type: string;
        remoteMessage?: any;
      };
    };
  };
  actionIdentifier: string;
  userText?: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  description?: string;
  importance: 'default' | 'high' | 'low' | 'max' | 'min';
  sound?: string | boolean;
  vibrate?: boolean;
  badge?: boolean;
  lights?: boolean;
  lockscreenVisibility?: 'public' | 'private' | 'secret';
}

// New interfaces for notification list display
export interface NotificationHistoryItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  category: NotificationCategory;
  data: Record<string, any>;
  status: 'sent' | 'delivered' | 'failed' | 'clicked';
  sentAt: Date;
  deliveredAt?: Date;
  clickedAt?: Date;
  readAt?: Date;
  isRead: boolean;
}

export interface NotificationListState {
  notifications: NotificationHistoryItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  refreshing: boolean;
  unreadCount: number;
}

export interface SwipeAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  backgroundColor: string;
  onPress: (notification: NotificationHistoryItem) => void;
}

export interface NotificationFilter {
  category?: NotificationCategory[];
  isRead?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface NotificationListOptions {
  limit?: number;
  offset?: number;
  filter?: NotificationFilter;
  sortBy?: 'sentAt' | 'readAt';
  sortOrder?: 'asc' | 'desc';
}

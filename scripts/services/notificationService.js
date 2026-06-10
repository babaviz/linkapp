"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Notifications = __importStar(require("expo-notifications"));
const Device = __importStar(require("expo-device"));
const react_native_1 = require("react-native");
const expo_constants_1 = __importDefault(require("expo-constants"));
const firebase_1 = __importDefault(require("./firebase"));
const supabaseClient_1 = require("./supabaseClient");
const notifications_1 = require("../types/notifications");
// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        // iOS-specific presentation options (required by newer Expo Notifications types)
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});
// Environment-based notification configuration via Expo Constants
const extra = (expo_constants_1.default?.expoConfig?.extra || expo_constants_1.default?.manifest?.extra || {});
const NOTIFS_DISABLED = String(extra.EXPO_PUBLIC_NOTIFICATIONS_DISABLED || '') === '1';
const NOTIFS_MODE = extra.EXPO_PUBLIC_NOTIFICATIONS_MODE || undefined;
const BYPASS_PUSH = NOTIFS_DISABLED || (!!NOTIFS_MODE && NOTIFS_MODE !== 'firebase');
class NotificationService {
    constructor() {
        this.initialized = false;
        this.expoPushToken = null;
    }
    static getInstance() {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }
    /**
     * Initialize the notification service
     */
    async initialize() {
        if (this.initialized)
            return;
        try {
            
            // Initialize Firebase first
            try {
                await firebase_1.default.initialize();
                
            }
            catch (firebaseError) {
                );
                
            }
            // Set up notification channels for Android
            if (react_native_1.Platform.OS === 'android') {
                await this.setupNotificationChannels();
            }
            // Set up notification categories
            await this.setupNotificationCategories();
            // Only try to register for push notifications if we're on a physical device and not bypassing
            if (Device.isDevice && !BYPASS_PUSH) {
                try {
                    await this.requestPermissions();
                    await this.registerForPushNotifications();
                }
                catch (pushError) {
                    :', pushError?.message);
                    
                }
            }
            else if (BYPASS_PUSH) {
                ');
            }
            else {
                
            }
            this.initialized = true;
            ');
        }
        catch (error) {
            
            // Don't throw error to prevent app crash
            this.initialized = true; // Mark as initialized to prevent retries
            
        }
    }
    /**
     * Request notification permissions
     */
    async requestPermissions() {
        try {
            if (!Device.isDevice) {
                throw new Error('Must use physical device for push notifications');
            }
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                return {
                    status: 'denied',
                    canAskAgain: finalStatus === 'undetermined',
                    expires: 'never',
                };
            }
            return {
                status: 'granted',
                canAskAgain: false,
                expires: 'never',
            };
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Register for push notifications and get FCM token
     */
    async registerForPushNotifications() {
        try {
            if (!Device.isDevice) {
                
                return null;
            }
            const { status } = await Notifications.getPermissionsAsync();
            if (status !== 'granted') {
                
                return null;
            }
            // Check if Firebase is properly configured before attempting to use it
            let fcmToken = null;
            try {
                if (firebase_1.default.isInitialized()) {
                    // Get FCM token using Firebase service
                    fcmToken = await firebase_1.default.getMessagingToken();
                    this.expoPushToken = fcmToken;
                    :', fcmToken);
                }
                else {
                    
                    throw new Error('Firebase not initialized');
                }
            }
            catch (firebaseError) {
                const msg = firebaseError?.message ?? String(firebaseError);
                
                throw new Error('Firebase not properly configured: ' + msg);
            }
            // Store token in Supabase for the current user if present
            if (fcmToken) {
                await this.storeTokenInDatabase(fcmToken);
            }
            return fcmToken;
        }
        catch (error) {
            
            // Provide helpful error information
            const errMsg = error?.message ?? String(error);
            if (errMsg.includes('FirebaseApp')) {
                
                
                ');
                 not properly set up');
                
                
                
            }
            // Don't throw error to prevent app crash - continue without push notifications
            
            return null;
        }
    }
    /**
     * Store push token in Supabase
     */
    async storeTokenInDatabase(token) {
        try {
            const { data: { user } } = await supabaseClient_1.supabase.auth.getUser();
            if (!user) {
                
                return;
            }
            const platform = react_native_1.Platform.OS;
            // Map to DB column names (snake_case). created_at/updated_at are handled by defaults/triggers.
            const payload = {
                user_id: user.id,
                token,
                platform,
            };
            const { error } = await supabaseClient_1.supabase
                .from('notification_tokens')
                // Cast to any because Supabase client isn't generically typed with our Database schema here.
                .upsert(payload, {
                onConflict: 'user_id,platform',
            });
            if (error) {
                
                throw error;
            }
            
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Set up notification channels for Android
     */
    async setupNotificationChannels() {
        if (react_native_1.Platform.OS !== 'android')
            return;
        const channels = [
            {
                id: 'default',
                name: 'Default',
                description: 'Default notification channel',
                importance: 'default',
                sound: true,
                vibrate: true,
                badge: true,
            },
            {
                id: 'job-alerts',
                name: 'Job Alerts',
                description: 'Notifications about new job opportunities',
                importance: 'high',
                sound: true,
                vibrate: true,
                badge: true,
            },
            {
                id: 'messages',
                name: 'Messages',
                description: 'Chat messages and communications',
                importance: 'high',
                sound: true,
                vibrate: true,
                badge: true,
            },
            {
                id: 'payments',
                name: 'Payment Alerts',
                description: 'Payment confirmations and alerts',
                importance: 'max',
                sound: true,
                vibrate: true,
                badge: true,
            },
            {
                id: 'system',
                name: 'System Updates',
                description: 'App updates and system messages',
                importance: 'default',
                sound: false,
                vibrate: false,
                badge: true,
            },
        ];
        for (const channel of channels) {
            await Notifications.setNotificationChannelAsync(channel.id, {
                name: channel.name,
                description: channel.description,
                importance: (() => {
                    const map = {
                        DEFAULT: Notifications.AndroidImportance.DEFAULT,
                        HIGH: Notifications.AndroidImportance.HIGH,
                        LOW: Notifications.AndroidImportance.LOW,
                        MAX: Notifications.AndroidImportance.MAX,
                        MIN: Notifications.AndroidImportance.MIN,
                    };
                    return map[channel.importance.toUpperCase()] ?? Notifications.AndroidImportance.DEFAULT;
                })(),
                sound: channel.sound ? 'default' : undefined,
                vibrationPattern: channel.vibrate ? [0, 250, 250, 250] : undefined,
                showBadge: channel.badge,
                lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
            });
        }
        
    }
    /**
     * Set up notification categories with actions
     */
    async setupNotificationCategories() {
        const categories = [
            {
                identifier: notifications_1.NotificationCategory.JOB_ALERT,
                displayName: 'Job Alert',
                description: 'New job opportunity notification',
                actions: [
                    {
                        identifier: 'VIEW_JOB',
                        buttonTitle: 'View Job',
                        options: { opensAppToForeground: true },
                    },
                    {
                        identifier: 'APPLY_JOB',
                        buttonTitle: 'Apply Now',
                        options: { opensAppToForeground: true },
                    },
                ],
            },
            {
                identifier: notifications_1.NotificationCategory.MESSAGE,
                displayName: 'Message',
                description: 'Chat message notification',
                actions: [
                    {
                        identifier: 'REPLY',
                        buttonTitle: 'Reply',
                        textInput: {
                            submitButtonTitle: 'Send',
                            placeholder: 'Type your reply...',
                        },
                        options: { opensAppToForeground: false },
                    },
                    {
                        identifier: 'VIEW_CHAT',
                        buttonTitle: 'Open Chat',
                        options: { opensAppToForeground: true },
                    },
                ],
            },
            {
                identifier: notifications_1.NotificationCategory.PAYMENT,
                displayName: 'Payment',
                description: 'Payment alert notification',
                actions: [
                    {
                        identifier: 'VIEW_PAYMENT',
                        buttonTitle: 'View Details',
                        options: { opensAppToForeground: true },
                    },
                ],
            },
        ];
        await Notifications.setNotificationCategoryAsync(notifications_1.NotificationCategory.JOB_ALERT, categories[0].actions, {
            allowInCarPlay: false,
            allowAnnouncement: true,
        });
        await Notifications.setNotificationCategoryAsync(notifications_1.NotificationCategory.MESSAGE, categories[1].actions, {
            allowInCarPlay: true,
            allowAnnouncement: true,
        });
        await Notifications.setNotificationCategoryAsync(notifications_1.NotificationCategory.PAYMENT, categories[2].actions, {
            allowInCarPlay: false,
            allowAnnouncement: false,
        });
        
    }
    /**
     * Send a local notification
     */
    async sendLocalNotification(notification) {
        try {
            const identifier = await Notifications.scheduleNotificationAsync({
                content: {
                    title: notification.title,
                    body: notification.body,
                    data: notification.data || {},
                    sound: notification.sound,
                    badge: notification.badge,
                    categoryIdentifier: notification.categoryId,
                },
                trigger: null, // Send immediately
            });
            
            return identifier;
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Send push notification via Firebase Cloud Messaging
     */
    async sendPushNotification(payload) {
        try {
            const message = {
                to: payload.to,
                notification: {
                    title: payload.title,
                    body: payload.body,
                    sound: payload.sound || 'default',
                },
                data: payload.data || {},
                android: {
                    channel_id: payload.channelId || 'default',
                    priority: payload.priority === 'high' ? 'high' : 'normal',
                    ttl: payload.ttl,
                },
                apns: {
                    payload: {
                        aps: {
                            badge: payload.badge,
                            category: payload.categoryId,
                            sound: payload.sound || 'default',
                        },
                    },
                },
            };
            const fcmServerKey = extra.FCM_SERVER_KEY || process.env.FCM_SERVER_KEY;
            if (!fcmServerKey) {
                throw new Error('FCM_SERVER_KEY not configured in expo.extra or environment variables');
            }
            const response = await fetch('https://fcm.googleapis.com/fcm/send', {
                method: 'POST',
                headers: {
                    'Authorization': `key=${fcmServerKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(message),
            });
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(`FCM push notification failed: ${result.error}`);
            }
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Get notification settings for user
     */
    async getNotificationSettings(userId) {
        try {
            const { data, error } = await supabaseClient_1.supabase
                .from('notification_settings')
                .select('*')
                .eq('user_id', userId)
                .single();
            if (error && error.code !== 'PGRST116') {
                
                throw error;
            }
            return data ? {
                userId: data.user_id,
                jobAlerts: data.job_alerts,
                messageNotifications: data.message_notifications,
                paymentAlerts: data.payment_alerts,
                systemUpdates: data.system_updates,
                marketingMessages: data.marketing_messages,
                quietHours: {
                    enabled: data.quiet_hours_enabled,
                    startTime: data.quiet_hours_start,
                    endTime: data.quiet_hours_end,
                },
            } : null;
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Update notification settings for user
     */
    async updateNotificationSettings(settings) {
        try {
            const { error } = await supabaseClient_1.supabase
                .from('notification_settings')
                .upsert({
                user_id: settings.userId,
                job_alerts: settings.jobAlerts,
                message_notifications: settings.messageNotifications,
                payment_alerts: settings.paymentAlerts,
                system_updates: settings.systemUpdates,
                marketing_messages: settings.marketingMessages,
                quiet_hours_enabled: settings.quietHours.enabled,
                quiet_hours_start: settings.quietHours.startTime,
                quiet_hours_end: settings.quietHours.endTime,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id',
            });
            if (error) {
                
                throw error;
            }
            
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Handle notification response (when user taps notification or action)
     */
    handleNotificationResponse(response) {
        const { notification, actionIdentifier, userText } = response;
        const { data, categoryIdentifier } = notification.request.content;
        
        // Handle different action types
        switch (actionIdentifier) {
            case 'VIEW_JOB':
                // Navigate to job details
                this.handleJobView(data);
                break;
            case 'APPLY_JOB':
                // Navigate to job application
                this.handleJobApply(data);
                break;
            case 'REPLY':
                // Handle chat reply
                this.handleChatReply(data, userText);
                break;
            case 'VIEW_CHAT':
                // Navigate to chat
                this.handleChatView(data);
                break;
            case 'VIEW_PAYMENT':
                // Navigate to payment details
                this.handlePaymentView(data);
                break;
            default:
                // Default action (tap notification)
                this.handleDefaultAction(categoryIdentifier, data);
                break;
        }
    }
    handleJobView(data) {
        // TODO: Implement navigation to job details
        
    }
    handleJobApply(data) {
        // TODO: Implement navigation to job application
        
    }
    handleChatReply(data, userText) {
        // TODO: Implement chat reply functionality
        
    }
    handleChatView(data) {
        // TODO: Implement navigation to chat
        
    }
    handlePaymentView(data) {
        // TODO: Implement navigation to payment details
        
    }
    handleDefaultAction(categoryIdentifier, data) {
        // TODO: Implement default navigation based on category
        
    }
    /**
     * Get current push token
     */
    getCurrentToken() {
        return this.expoPushToken;
    }
    /**
     * Clear all notifications
     */
    async clearAllNotifications() {
        await Notifications.dismissAllNotificationsAsync();
    }
    /**
     * Clear notification by identifier
     */
    async clearNotification(identifier) {
        await Notifications.dismissNotificationAsync(identifier);
    }
    /**
     * Get notification history for user
     */
    async getNotificationHistory(userId, options = {}) {
        try {
            const { limit = 20, offset = 0, filter, sortBy = 'sentAt', sortOrder = 'desc', } = options;
            let query = supabaseClient_1.supabase
                .from('notification_history')
                .select('*', { count: 'exact' })
                .eq('user_id', userId);
            // Apply filters
            if (filter) {
                if (filter.category && filter.category.length > 0) {
                    query = query.in('category', filter.category);
                }
                if (filter.isRead !== undefined) {
                    if (filter.isRead) {
                        query = query.not('read_at', 'is', null);
                    }
                    else {
                        query = query.is('read_at', null);
                    }
                }
                if (filter.dateRange) {
                    query = query
                        .gte('sent_at', filter.dateRange.start.toISOString())
                        .lte('sent_at', filter.dateRange.end.toISOString());
                }
            }
            // Apply sorting
            const sortColumn = sortBy === 'sentAt' ? 'sent_at' : 'read_at';
            query = query.order(sortColumn, { ascending: sortOrder === 'asc' });
            // Apply pagination
            query = query.range(offset, offset + limit - 1);
            const { data, error, count } = await query;
            if (error) {
                
                throw error;
            }
            const notifications = (data || []).map((item) => ({
                id: item.id,
                userId: item.user_id,
                title: item.title,
                body: item.body,
                category: item.category,
                data: item.data || {},
                status: item.status,
                sentAt: new Date(item.sent_at),
                deliveredAt: item.delivered_at ? new Date(item.delivered_at) : undefined,
                clickedAt: item.clicked_at ? new Date(item.clicked_at) : undefined,
                readAt: item.read_at ? new Date(item.read_at) : undefined,
                isRead: Boolean(item.read_at),
            }));
            return {
                notifications,
                total: count || 0,
            };
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Mark notification as read
     */
    async markNotificationAsRead(notificationId) {
        try {
            const { error } = await supabaseClient_1.supabase
                .from('notification_history')
                .update({ read_at: new Date().toISOString() })
                .eq('id', notificationId);
            if (error) {
                
                throw error;
            }
            
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Mark multiple notifications as read
     */
    async markMultipleNotificationsAsRead(notificationIds) {
        try {
            const { error } = await supabaseClient_1.supabase
                .from('notification_history')
                .update({ read_at: new Date().toISOString() })
                .in('id', notificationIds);
            if (error) {
                
                throw error;
            }
            
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Mark all notifications as read for user
     */
    async markAllNotificationsAsRead(userId) {
        try {
            const { error } = await supabaseClient_1.supabase
                .from('notification_history')
                .update({ read_at: new Date().toISOString() })
                .eq('user_id', userId)
                .is('read_at', null);
            if (error) {
                
                throw error;
            }
            
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Delete notification from history
     */
    async deleteNotification(notificationId) {
        try {
            const { error } = await supabaseClient_1.supabase
                .from('notification_history')
                .delete()
                .eq('id', notificationId);
            if (error) {
                
                throw error;
            }
            
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Get unread notifications count
     */
    async getUnreadNotificationsCount(userId) {
        try {
            const { count, error } = await supabaseClient_1.supabase
                .from('notification_history')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .is('read_at', null);
            if (error) {
                
                throw error;
            }
            return count || 0;
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Subscribe to real-time notification updates
     */
    subscribeToNotifications(userId, onUpdate) {
        const subscription = supabaseClient_1.supabase
            .channel(`notification_updates_${userId}`)
            .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'notification_history',
            filter: `user_id=eq.${userId}`,
        }, (payload) => {
            
            onUpdate(payload);
        })
            .subscribe();
        return () => {
            subscription.unsubscribe();
        };
    }
    /**
     * Record notification interaction (clicked)
     */
    async recordNotificationClick(notificationId) {
        try {
            const { error } = await supabaseClient_1.supabase
                .from('notification_history')
                .update({
                clicked_at: new Date().toISOString(),
                read_at: new Date().toISOString(), // Mark as read when clicked
            })
                .eq('id', notificationId);
            if (error) {
                
                throw error;
            }
            
        }
        catch (error) {
            
            throw error;
        }
    }
}
exports.default = NotificationService.getInstance();

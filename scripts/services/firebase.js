"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_native_1 = require("react-native");
// Import Firebase modules
const app_1 = __importDefault(require("@react-native-firebase/app"));
const messaging_1 = __importDefault(require("@react-native-firebase/messaging"));
class FirebaseService {
    constructor() {
        this.initialized = false;
    }
    static getInstance() {
        if (!FirebaseService.instance) {
            FirebaseService.instance = new FirebaseService();
        }
        return FirebaseService.instance;
    }
    /**
     * Initialize Firebase app and services
     */
    async initialize() {
        if (this.initialized) {
            
            return;
        }
        try {
            
            // Check if Firebase app is properly configured
            if (!(0, app_1.default)().options) {
                throw new Error('Firebase app is not properly configured. Check your configuration files.');
            }
            ().options.projectId);
            // Initialize messaging service
            await this.initializeMessaging();
            this.initialized = true;
            
        }
        catch (error) {
            
            // Provide helpful debugging information
            
            
            ().apps?.length || 0);
            if (error.message.includes('not configured')) {
                
                 in the root directory');
                 in the root directory');
                
                
            }
            throw error;
        }
    }
    /**
     * Create notification channel (Android only)
     */
    async createNotificationChannel() {
        if (react_native_1.Platform.OS === 'android') {
            try {
                await (0, messaging_1.default)().android.createChannel({
                    channelId: 'default',
                    name: 'Default Channel',
                    importance: 4, // High importance
                    description: 'Default notification channel for the app',
                });
                
            }
            catch (error) {
                
                throw error;
            }
        }
    }
    /**
     * Initialize Firebase Cloud Messaging
     */
    async initializeMessaging() {
        try {
            // Create notification channel first (Android)
            await this.createNotificationChannel();
            // Request messaging permission
            const authStatus = await (0, messaging_1.default)().requestPermission();
            const enabled = authStatus === messaging_1.default.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging_1.default.AuthorizationStatus.PROVISIONAL;
            if (enabled) {
                
            }
            else {
                
                if (react_native_1.Platform.OS === 'ios') {
                    return;
                }
            }
            // Set up message handlers
            this.setupMessageHandlers();
            
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Set up Firebase message handlers
     */
    setupMessageHandlers() {
        // Handle background messages
        (0, messaging_1.default)().setBackgroundMessageHandler(async (remoteMessage) => {
            
        });
        // Handle foreground messages
        (0, messaging_1.default)().onMessage(async (remoteMessage) => {
            
        });
        // Handle notification opened app
        (0, messaging_1.default)().onNotificationOpenedApp(remoteMessage => {
            
        });
        // Check whether an initial notification is available
        (0, messaging_1.default)()
            .getInitialNotification()
            .then(remoteMessage => {
            if (remoteMessage) {
                
            }
        });
    }
    /**
     * Get FCM token
     */
    async getMessagingToken() {
        try {
            if (!this.initialized) {
                
                await this.initialize();
            }
            const token = await (0, messaging_1.default)().getToken();
            
            return token;
        }
        catch (error) {
            
            return null;
        }
    }
    /**
     * Delete FCM token
     */
    async deleteMessagingToken() {
        try {
            await (0, messaging_1.default)().deleteToken();
            
        }
        catch (error) {
            
        }
    }
    /**
     * Check if Firebase is properly initialized
     */
    isInitialized() {
        return this.initialized;
    }
    /**
     * Get Firebase app instance
     */
    getApp() {
        return (0, app_1.default)();
    }
    /**
     * Get messaging instance
     */
    getMessaging() {
        return (0, messaging_1.default)();
    }
}
exports.default = FirebaseService.getInstance();

"use strict";
/**
 * Stream Chat Service for MyNyumbApp
 *
 * This service handles all Stream Chat operations including:
 * - Client initialization and connection
 * - Channel management
 * - Message sending and receiving
 * - User presence and status
 * - Integration with app modules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamChatService = exports.streamChatService = void 0;
const stream_chat_1 = require("stream-chat");
const streamTokenService_1 = require("./streamTokenService");
const environment_1 = require("../config/environment");
class StreamChatService {
    constructor() {
        this.client = null;
        this.currentUser = null;
        this.connectionStatus = {
            isConnected: false,
            isConnecting: false
        };
        this.connectionListeners = [];
        this.channels = new Map();
    }
    /**
     * Initialize Stream Chat client and connect user
     */
    async initialize() {
        if (this.connectionStatus.isConnecting) {
            return this.connectionStatus;
        }
        this.setConnectionStatus({ isConnecting: true, isConnected: false });
        try {
            // Get user token from our token service
            const tokenResponse = await streamTokenService_1.streamTokenService.generateTokenForCurrentUser();
            if (!tokenResponse.success || !tokenResponse.token || !tokenResponse.user) {
                throw new Error(tokenResponse.error || 'Failed to generate token');
            }
            // Initialize Stream Chat client
            this.client = stream_chat_1.StreamChat.getInstance(environment_1.ENV.STREAM_CHAT_API_KEY);
            // Connect user to Stream Chat
            await this.client.connectUser(tokenResponse.user, tokenResponse.token);
            this.currentUser = tokenResponse.user;
            // Set up event listeners
            this.setupEventListeners();
            this.setConnectionStatus({
                isConnected: true,
                isConnecting: false,
                user: tokenResponse.user
            });
            
            return this.connectionStatus;
        }
        catch (error) {
            
            this.setConnectionStatus({
                isConnected: false,
                isConnecting: false,
                error: error.message
            });
            return this.connectionStatus;
        }
    }
    /**
     * Disconnect from Stream Chat
     */
    async disconnect() {
        try {
            if (this.client) {
                await this.client.disconnectUser();
                this.client = null;
            }
            this.currentUser = null;
            this.channels.clear();
            this.setConnectionStatus({
                isConnected: false,
                isConnecting: false
            });
            
        }
        catch (error) {
            
        }
    }
    /**
     * Get or create a channel
     */
    async getChannel(channelType, channelId, channelData) {
        if (!this.client || !this.isConnected()) {
            
            return null;
        }
        try {
            const cacheKey = `${channelType}:${channelId}`;
            // Check if channel is already cached
            if (this.channels.has(cacheKey)) {
                return this.channels.get(cacheKey);
            }
            // Create or get the channel
            const channel = this.client.channel(channelType, channelId, channelData);
            // Watch the channel (this creates it if it doesn't exist)
            await channel.watch();
            // Cache the channel
            this.channels.set(cacheKey, channel);
            return channel;
        }
        catch (error) {
            
            return null;
        }
    }
    /**
     * Create a property listing channel
     */
    async createPropertyChannel(propertyId, ownerId, propertyData) {
        const channelId = `property_${propertyId}`;
        return await this.getChannel('property', channelId, {
            name: `${propertyData.title} - ${propertyData.location}`,
            image: propertyData.image,
            created_by_id: ownerId,
            members: [ownerId, this.currentUser?.id].filter(Boolean),
            property_id: propertyId,
            property_title: propertyData.title,
            property_price: propertyData.price,
            property_location: propertyData.location
        });
    }
    /**
     * Create a job posting channel
     */
    async createJobChannel(jobId, employerId, jobData) {
        const channelId = `job_${jobId}`;
        return await this.getChannel('job', channelId, {
            name: `${jobData.title} at ${jobData.company}`,
            created_by_id: employerId,
            members: [employerId, this.currentUser?.id].filter(Boolean),
            job_id: jobId,
            job_title: jobData.title,
            job_company: jobData.company,
            job_location: jobData.location,
            job_salary: jobData.salary
        });
    }
    /**
     * Create a service listing channel
     */
    async createServiceChannel(serviceId, providerId, serviceData) {
        const channelId = `service_${serviceId}`;
        return await this.getChannel('service', channelId, {
            name: `${serviceData.name} - ${serviceData.category}`,
            image: serviceData.image,
            created_by_id: providerId,
            members: [providerId, this.currentUser?.id].filter(Boolean),
            service_id: serviceId,
            service_name: serviceData.name,
            service_category: serviceData.category,
            service_location: serviceData.location
        });
    }
    /**
     * Create a Date Mi conversation channel
     */
    async createDateMiChannel(otherUserId, otherUserData) {
        if (!this.currentUser) {
            
            return null;
        }
        const channelId = streamTokenService_1.StreamTokenService
            .createDateMiChannelId(this.currentUser.id, otherUserId);
        return await this.getChannel('datemi', channelId, {
            name: `${this.currentUser.name} & ${otherUserData.name}`,
            members: [this.currentUser.id, otherUserId],
            datemi_conversation: true,
            user1_id: this.currentUser.id,
            user1_name: this.currentUser.name,
            user2_id: otherUserId,
            user2_name: otherUserData.name
        });
    }
    /**
     * Create a direct message channel
     */
    async createDirectMessageChannel(otherUserId, otherUserName) {
        if (!this.currentUser) {
            
            return null;
        }
        const channelId = streamTokenService_1.StreamTokenService
            .createDirectMessageChannelId(this.currentUser.id, otherUserId);
        return await this.getChannel('messaging', channelId, {
            members: [this.currentUser.id, otherUserId]
        });
    }
    /**
     * Send a message to a channel
     */
    async sendMessage(channel, messageData) {
        try {
            await channel.sendMessage(messageData);
            return true;
        }
        catch (error) {
            
            return false;
        }
    }
    /**
     * Add user to a channel
     */
    async addUserToChannel(channel, userId) {
        try {
            await channel.addMembers([userId]);
            return true;
        }
        catch (error) {
            
            return false;
        }
    }
    /**
     * Remove user from a channel
     */
    async removeUserFromChannel(channel, userId) {
        try {
            await channel.removeMembers([userId]);
            return true;
        }
        catch (error) {
            
            return false;
        }
    }
    /**
     * Get user's channels
     */
    async getUserChannels(limit = 20, channelType) {
        if (!this.client || !this.isConnected()) {
            return [];
        }
        try {
            const filter = { members: { $in: [this.currentUser?.id] } };
            if (channelType) {
                filter.type = channelType;
            }
            const channels = await this.client.queryChannels(filter, {
                last_message_at: -1,
                updated_at: -1
            }, {
                limit,
                message_limit: 1,
                watch: true
            });
            return channels;
        }
        catch (error) {
            
            return [];
        }
    }
    /**
     * Search channels
     */
    async searchChannels(query, channelType, limit = 10) {
        if (!this.client || !this.isConnected()) {
            return [];
        }
        try {
            const filter = {
                members: { $in: [this.currentUser?.id] },
                name: { $autocomplete: query }
            };
            if (channelType) {
                filter.type = channelType;
            }
            const channels = await this.client.queryChannels(filter, {
                last_message_at: -1
            }, {
                limit,
                watch: false
            });
            return channels;
        }
        catch (error) {
            
            return [];
        }
    }
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        if (!this.client)
            return;
        this.client.on('connection.changed', (event) => {
            
            this.setConnectionStatus({
                ...this.connectionStatus,
                isConnected: !!event.online
            });
        });
        this.client.on('connection.recovered', () => {
            
        });
        this.client.on('user.presence.changed', (event) => {
            
        });
    }
    /**
     * Update connection status and notify listeners
     */
    setConnectionStatus(status) {
        this.connectionStatus = { ...this.connectionStatus, ...status };
        this.connectionListeners.forEach(listener => listener(this.connectionStatus));
    }
    /**
     * Add connection status listener
     */
    addConnectionListener(listener) {
        this.connectionListeners.push(listener);
        // Return unsubscribe function
        return () => {
            const index = this.connectionListeners.indexOf(listener);
            if (index > -1) {
                this.connectionListeners.splice(index, 1);
            }
        };
    }
    /**
     * Get current connection status
     */
    getConnectionStatus() {
        return this.connectionStatus;
    }
    /**
     * Check if client is connected
     */
    isConnected() {
        return this.connectionStatus.isConnected && !!this.client;
    }
    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }
    /**
     * Get Stream Chat client instance
     */
    getClient() {
        return this.client;
    }
    /**
     * Get cached channel
     */
    getCachedChannel(channelType, channelId) {
        const cacheKey = `${channelType}:${channelId}`;
        return this.channels.get(cacheKey) || null;
    }
    /**
     * Clear channel cache
     */
    clearChannelCache() {
        this.channels.clear();
    }
    /**
     * Update user online status
     */
    async updateUserStatus(status) {
        if (!this.client || !this.isConnected()) {
            return;
        }
        try {
            await this.client.updateAppSettings({
                enforce_unique_usernames: 'no'
            });
        }
        catch (error) {
            
        }
    }
}
exports.StreamChatService = StreamChatService;
// Export singleton instance
exports.streamChatService = new StreamChatService();

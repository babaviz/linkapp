"use strict";
/**
 * Universal Chat Service
 * Handles real-time messaging across all app sections using Stream Chat
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatService = void 0;
const streamChatService_1 = require("./streamChatService");
const authService_1 = require("./authService");
class ChatService {
    constructor() {
        this.channelToConversationCache = new Map();
        this.messageIdCounter = 0;
        this.demoMessageCache = new Map();
    }
    isConfigured() {
        return streamChatService_1.streamChatService.isConnected();
    }
    generateUniqueMessageId(prefix = 'msg') {
        this.messageIdCounter++;
        return `${prefix}_${Date.now()}_${this.messageIdCounter}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Create or get existing chat conversation
     */
    async createOrGetConversation(params) {
        try {
            if (!this.isConfigured()) {
                return this.getDemoConversation(params);
            }
            const currentUser = await authService_1.authService.getCurrentUser();
            if (!currentUser) {
                throw new Error('User not authenticated');
            }
            // Create channel ID based on type and metadata
            let channelId;
            let channelData = {
                name: params.metadata?.title || 'Chat',
                members: params.participantIds,
            };
            if (params.metadata?.propertyId) {
                channelId = `property_${params.metadata.propertyId}`;
                channelData = {
                    ...channelData,
                    property_id: params.metadata.propertyId,
                    property_title: params.metadata.title,
                    property_image: params.metadata.imageUrl,
                };
            }
            else if (params.metadata?.jobId) {
                channelId = `job_${params.metadata.jobId}`;
                channelData = {
                    ...channelData,
                    job_id: params.metadata.jobId,
                    job_title: params.metadata.title,
                };
            }
            else if (params.metadata?.serviceId) {
                channelId = `service_${params.metadata.serviceId}`;
                channelData = {
                    ...channelData,
                    service_id: params.metadata.serviceId,
                    service_name: params.metadata.title,
                    service_image: params.metadata.imageUrl,
                };
            }
            else {
                // For direct messages or general chats
                const sortedIds = [...params.participantIds].sort();
                channelId = `dm_${sortedIds.join('_')}`;
            }
            // Get or create channel using Stream Chat
            const channel = await streamChatService_1.streamChatService.getChannel(params.type, channelId, channelData);
            if (!channel) {
                throw new Error('Failed to create channel');
            }
            // Send initial message if provided
            if (params.initialMessage && channel) {
                await streamChatService_1.streamChatService.sendMessage(channel, {
                    text: params.initialMessage
                });
            }
            // Convert Stream Channel to ChatConversation
            return this.transformChannelToConversation(channel);
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Transform Stream Channel to ChatConversation interface
     */
    transformChannelToConversation(channel) {
        const channelData = channel.data;
        const lastMessage = channel.state.messages[channel.state.messages.length - 1];
        // Build metadata based on channel data
        const metadata = {};
        if (channelData.property_id) {
            metadata.propertyId = channelData.property_id;
            metadata.title = channelData.property_title;
            metadata.imageUrl = channelData.property_image;
        }
        else if (channelData.job_id) {
            metadata.jobId = channelData.job_id;
            metadata.title = channelData.job_title;
        }
        else if (channelData.service_id) {
            metadata.serviceId = channelData.service_id;
            metadata.title = channelData.service_name;
            metadata.imageUrl = channelData.service_image;
        }
        else if (channelData.name) {
            metadata.title = channelData.name;
        }
        const conversation = {
            id: channel.cid,
            type: channel.type,
            participants: Object.keys(channel.state.members),
            lastActivity: channel.state.last_message_at || channel.data.created_at || new Date().toISOString(),
            unreadCount: channel.countUnread(),
            metadata
        };
        if (lastMessage) {
            conversation.lastMessage = this.transformMessageToChat(lastMessage);
        }
        // Cache the conversation
        this.channelToConversationCache.set(channel.cid, conversation);
        return conversation;
    }
    /**
     * Get conversations for a user
     */
    async getUserConversations(userId) {
        try {
            if (!this.isConfigured()) {
                return this.getDemoConversations(userId);
            }
            // Get all user channels from Stream Chat
            const channels = await streamChatService_1.streamChatService.getUserChannels(50);
            // Transform channels to conversations
            const conversations = channels.map(channel => this.transformChannelToConversation(channel));
            // Sort by last activity
            conversations.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
            return conversations;
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Get messages for a conversation
     */
    async getConversationMessages(conversationId, limit = 50, offset = 0) {
        try {
            if (!this.isConfigured()) {
                return this.getDemoMessages(conversationId, limit);
            }
            // Extract channel type and id from conversation ID (format: "messaging:channelId")
            const [channelType, channelId] = conversationId.split(':');
            if (!channelType || !channelId) {
                throw new Error('Invalid conversation ID format');
            }
            // Get the channel
            const channel = streamChatService_1.streamChatService.getCachedChannel(channelType, channelId) || await streamChatService_1.streamChatService.getChannel(channelType, channelId);
            if (!channel) {
                throw new Error('Channel not found');
            }
            // Stream Chat messages are already loaded in channel.state.messages
            const messages = channel.state.messages
                .slice(-limit) // Get last 'limit' messages
                .map(msg => this.transformMessageToChat(msg));
            return messages;
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Send a message
     */
    async sendMessage(params) {
        try {
            if (!this.isConfigured()) {
                return this.createDemoMessage(params);
            }
            // Extract channel type and id from conversation ID
            const [channelType, channelId] = params.conversationId.split(':');
            if (!channelType || !channelId) {
                throw new Error('Invalid conversation ID format');
            }
            // Get the channel
            const channel = streamChatService_1.streamChatService.getCachedChannel(channelType, channelId) || await streamChatService_1.streamChatService.getChannel(channelType, channelId);
            if (!channel) {
                throw new Error('Channel not found');
            }
            // Send message using Stream Chat
            const messageData = {
                text: params.message
            };
            if (params.replyTo) {
                messageData.parent_id = params.replyTo;
            }
            if (params.type === 'image') {
                messageData.attachments = [{
                        type: 'image',
                        image_url: params.message,
                        fallback: 'Image'
                    }];
                messageData.text = 'Shared an image';
            }
            const sentMessage = await channel.sendMessage(messageData);
            return this.transformMessageToChat(sentMessage.message);
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Mark messages as read
     */
    async markAsRead(conversationId, userId, messageId) {
        try {
            if (!this.isConfigured())
                return;
            // Extract channel type and id from conversation ID
            const [channelType, channelId] = conversationId.split(':');
            if (!channelType || !channelId) {
                return;
            }
            // Get the channel
            const channel = streamChatService_1.streamChatService.getCachedChannel(channelType, channelId) || await streamChatService_1.streamChatService.getChannel(channelType, channelId);
            if (channel) {
                // Mark channel as read
                await channel.markRead();
            }
        }
        catch (error) {
            
        }
    }
    /**
     * Subscribe to real-time messages
     */
    subscribeToMessages(conversationId, callback) {
        if (!this.isConfigured())
            return null;
        try {
            // Extract channel type and id from conversation ID
            const [channelType, channelId] = conversationId.split(':');
            if (!channelType || !channelId) {
                return null;
            }
            // Get the channel
            streamChatService_1.streamChatService.getChannel(channelType, channelId).then(channel => {
                if (channel) {
                    // Subscribe to new messages
                    const handleNewMessage = (event) => {
                        if (event.message) {
                            callback(this.transformMessageToChat(event.message));
                        }
                    };
                    channel.on('message.new', handleNewMessage);
                    // Return unsubscribe function
                    return () => {
                        channel.off('message.new', handleNewMessage);
                    };
                }
            });
            return null;
        }
        catch (error) {
            
            return null;
        }
    }
    /**
     * Subscribe to conversation updates
     */
    subscribeToConversations(userId, callback) {
        if (!this.isConfigured())
            return null;
        // With Stream Chat, we listen to channel events
        const handleChannelUpdate = (event) => {
            if (event.channel) {
                const conversation = this.transformChannelToConversation(event.channel);
                callback(conversation);
            }
        };
        // Subscribe to various channel events
        const client = streamChatService_1.streamChatService.getClient();
        if (client) {
            client.on('channel.updated', handleChannelUpdate);
            client.on('message.new', handleChannelUpdate);
            client.on('notification.message_new', handleChannelUpdate);
            // Return unsubscribe function
            return () => {
                client.off('channel.updated', handleChannelUpdate);
                client.off('message.new', handleChannelUpdate);
                client.off('notification.message_new', handleChannelUpdate);
            };
        }
        return null;
    }
    // Demo/Mock data methods for development
    getDemoConversation(params) {
        return {
            id: `demo_chat_${Date.now()}`,
            type: params.type,
            participants: params.participantIds,
            lastActivity: new Date().toISOString(),
            unreadCount: 0,
            metadata: params.metadata
        };
    }
    getDemoConversations(userId) {
        // Generate unique IDs for demo conversations to avoid key conflicts
        const timestamp = Date.now();
        return [
            {
                id: `demo_property_chat_${userId}_${timestamp}_1`,
                type: 'property',
                participants: [userId, 'property_owner_123'],
                lastActivity: new Date().toISOString(),
                unreadCount: 2,
                metadata: {
                    propertyId: 'prop_123',
                    title: '3 Bedroom Apartment in Westlands',
                    imageUrl: 'https://example.com/property.jpg'
                }
            },
            {
                id: `demo_job_chat_${userId}_${timestamp}_2`,
                type: 'job',
                participants: [userId, 'employer_456'],
                lastActivity: new Date().toISOString(),
                unreadCount: 0,
                metadata: {
                    jobId: 'job_456',
                    title: 'React Native Developer Position'
                }
            }
        ];
    }
    getDemoMessages(conversationId, limit) {
        // Check if we already have cached messages for this conversation
        if (this.demoMessageCache.has(conversationId)) {
            const cached = this.demoMessageCache.get(conversationId);
            return cached.slice(0, limit);
        }
        const now = new Date();
        const messages = [
            {
                id: this.generateUniqueMessageId(`${conversationId}_demo`),
                senderId: 'other_user',
                senderName: 'Property Owner',
                message: 'Hello! I see you\'re interested in my property. How can I help you?',
                timestamp: new Date(now.getTime() - 3600000).toISOString(),
                type: 'text',
                status: 'read'
            },
            {
                id: this.generateUniqueMessageId(`${conversationId}_demo`),
                senderId: 'current_user',
                senderName: 'You',
                message: 'Hi! I\'d like to know more about the apartment. Is it still available?',
                timestamp: new Date(now.getTime() - 1800000).toISOString(),
                type: 'text',
                status: 'read'
            },
            {
                id: this.generateUniqueMessageId(`${conversationId}_demo`),
                senderId: 'other_user',
                senderName: 'Property Owner',
                message: 'Yes, it\'s still available! Would you like to schedule a viewing?',
                timestamp: new Date(now.getTime() - 900000).toISOString(),
                type: 'text',
                status: 'delivered'
            }
        ];
        // Cache the messages for this conversation
        this.demoMessageCache.set(conversationId, messages);
        return messages.slice(0, limit);
    }
    createDemoMessage(params) {
        const newMessage = {
            id: this.generateUniqueMessageId(`${params.conversationId}_new`),
            senderId: params.senderId,
            senderName: params.senderName,
            message: params.message,
            timestamp: new Date().toISOString(),
            type: params.type,
            status: 'sent'
        };
        // Add to cache if conversation is cached
        if (this.demoMessageCache.has(params.conversationId)) {
            const cached = this.demoMessageCache.get(params.conversationId);
            cached.push(newMessage);
        }
        return newMessage;
    }
    /**
     * Transform Stream Chat message to ChatMessage interface
     */
    transformMessageToChat(message) {
        // Ensure we always have a unique ID, even if Stream Chat doesn't provide one
        const messageId = message.id || this.generateUniqueMessageId('stream_msg');
        return {
            id: messageId,
            senderId: message.user?.id || '',
            senderName: message.user?.name || message.user?.id || 'Unknown',
            message: message.text || '',
            timestamp: message.created_at || new Date().toISOString(),
            type: message.attachments?.some(a => a.type === 'image') ? 'image' : 'text',
            status: 'delivered', // Stream Chat doesn't have the same status concept
            replyTo: message.parent_id
        };
    }
    /**
     * Utility functions
     */
    getConversationTitle(conversation, currentUserId) {
        if (conversation.metadata?.title) {
            return conversation.metadata.title;
        }
        // Generate title based on type and participants
        const otherParticipants = conversation.participants.filter(p => p !== currentUserId);
        if (otherParticipants.length === 1) {
            return `Chat with User`; // In real app, fetch user name
        }
        return `Group Chat (${conversation.participants.length} participants)`;
    }
    formatLastMessagePreview(message, maxLength = 50) {
        if (message.length <= maxLength)
            return message;
        return message.substring(0, maxLength) + '...';
    }
    getTimeSince(timestamp) {
        const now = new Date();
        const messageTime = new Date(timestamp);
        const diffMs = now.getTime() - messageTime.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMinutes < 1)
            return 'Just now';
        if (diffMinutes < 60)
            return `${diffMinutes}m ago`;
        if (diffHours < 24)
            return `${diffHours}h ago`;
        if (diffDays < 7)
            return `${diffDays}d ago`;
        return messageTime.toLocaleDateString();
    }
    /**
     * Clear demo message cache for a conversation or all conversations
     */
    clearDemoCache(conversationId) {
        if (conversationId) {
            this.demoMessageCache.delete(conversationId);
        }
        else {
            this.demoMessageCache.clear();
        }
    }
    /**
     * Reset all caches and counters
     */
    resetCaches() {
        this.channelToConversationCache.clear();
        this.demoMessageCache.clear();
        this.messageIdCounter = 0;
    }
}
exports.chatService = new ChatService();

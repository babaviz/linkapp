"use strict";
/**
 * Stream Chat Token Generation Service
 *
 * This service handles Stream Chat user token generation for MyNyumbApp.
 * It integrates with Supabase authentication and provides secure token management.
 *
 * Note: In production, move token generation to Supabase Edge Functions
 * using Stream's server-side SDK for enhanced security.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamTokenService = exports.streamTokenService = void 0;
const supabaseClient_1 = require("./supabaseClient");
const authService_1 = require("./authService");
const environment_1 = require("../config/environment");
// Stream Chat SDK imports for client-side token generation
const stream_chat_1 = require("stream-chat");
class StreamTokenService {
    constructor() {
        this.client = null;
        this.currentUser = null;
    }
    /**
     * Initialize Stream Chat client for token generation
     */
    initializeClient() {
        if (!this.client) {
            this.client = stream_chat_1.StreamChat.getInstance(environment_1.ENV.STREAM_CHAT_API_KEY);
        }
        return this.client;
    }
    /**
     * Generate a Stream Chat token for the current Supabase user
     */
    async generateTokenForCurrentUser() {
        try {
            // Get current Supabase user
            const currentUser = await authService_1.authService.getCurrentUser();
            if (!currentUser) {
                return {
                    success: false,
                    error: 'No authenticated user found'
                };
            }
            return await this.generateTokenForUser(currentUser.id, {
                name: currentUser.user_metadata?.full_name || currentUser.email || 'User',
                email: currentUser.email,
                image: currentUser.user_metadata?.profile_image_url
            });
        }
        catch (error) {
            
            return {
                success: false,
                error: error.message || 'Failed to generate token'
            };
        }
    }
    /**
     * Generate a Stream Chat token for a specific user
     */
    async generateTokenForUser(userId, userData = {}) {
        try {
            const client = this.initializeClient();
            // Prepare user data for Stream
            const streamUser = {
                id: userId,
                name: userData.name || 'User',
                image: userData.image,
                email: userData.email
            };
            // For development: Generate token using client-side method
            // Note: In production, this should be done server-side
            const token = client.createToken(userId);
            // Store/update user metadata in Supabase
            await this.updateStreamUserMetadata(userId, streamUser);
            this.currentUser = streamUser;
            return {
                success: true,
                token,
                user: streamUser
            };
        }
        catch (error) {
            
            return {
                success: false,
                error: error.message || 'Token generation failed'
            };
        }
    }
    /**
     * Update Stream Chat user metadata in Supabase
     */
    async updateStreamUserMetadata(userId, userData) {
        // Stream Chat stores user metadata internally
        // No need to duplicate in Supabase
        // This method is kept for backward compatibility
        
    }
    /**
     * Get Stream user metadata from Supabase
     */
    async getStreamUserMetadata(userId) {
        try {
            // Get user data from auth service instead
            const currentUser = await authService_1.authService.getCurrentUser();
            if (!currentUser || currentUser.id !== userId) {
                return null;
            }
            return {
                id: userId,
                name: currentUser.user_metadata?.full_name || currentUser.email || 'User',
                image: currentUser.user_metadata?.profile_image_url,
                email: currentUser.email
            };
        }
        catch (error) {
            
            return null;
        }
    }
    /**
     * Validate if user has access to Stream Chat
     */
    async validateUserAccess(userId) {
        try {
            const userToCheck = userId || (await authService_1.authService.getCurrentUser())?.id;
            if (!userToCheck)
                return false;
            // Check if user exists in Supabase
            const { data, error } = await supabaseClient_1.supabase
                .from('users')
                .select('id')
                .eq('id', userToCheck)
                .single();
            return !error && !!data;
        }
        catch (error) {
            
            return false;
        }
    }
    /**
     * Create a channel ID for property listings
     */
    static createPropertyChannelId(propertyId, ownerId) {
        return `property_${propertyId}_${ownerId}`;
    }
    /**
     * Create a channel ID for job postings
     */
    static createJobChannelId(jobId, employerId) {
        return `job_${jobId}_${employerId}`;
    }
    /**
     * Create a channel ID for service listings
     */
    static createServiceChannelId(serviceId, ownerId) {
        return `service_${serviceId}_${ownerId}`;
    }
    /**
     * Create a channel ID for Date Mi conversations
     */
    static createDateMiChannelId(user1Id, user2Id) {
        // Sort IDs to ensure consistent channel ID regardless of who initiates
        const sortedIds = [user1Id, user2Id].sort();
        return `datemi_${sortedIds[0]}_${sortedIds[1]}`;
    }
    /**
     * Create a direct message channel ID
     */
    static createDirectMessageChannelId(user1Id, user2Id) {
        const sortedIds = [user1Id, user2Id].sort();
        return `dm_${sortedIds[0]}_${sortedIds[1]}`;
    }
    /**
     * Get current user data
     */
    getCurrentUser() {
        return this.currentUser;
    }
    /**
     * Clear cached user data
     */
    clearCache() {
        this.currentUser = null;
    }
    /**
     * Get client instance
     */
    getClient() {
        return this.client;
    }
}
exports.StreamTokenService = StreamTokenService;
// Export singleton instance
exports.streamTokenService = new StreamTokenService();

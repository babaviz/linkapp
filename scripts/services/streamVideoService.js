"use strict";
/**
 * Stream Video Service for MyNyumbApp
 *
 * This service manages all Stream Video operations including:
 * - Video/Audio call initialization and management
 * - Token generation for Stream Video
 * - Call events and state management
 * - Integration with Date Mi module
 * - Subscription tier enforcement
 */
const __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    let desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
const __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
const __importStar = (this && this.__importStar) || (function () {
    let ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            const ar = [];
            for (const k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        const result = {};
        if (mod != null) for (let k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamVideoService = exports.streamVideoService = void 0;
const video_react_native_sdk_1 = require("@stream-io/video-react-native-sdk");
const environment_1 = require("../config/environment");
const authService_1 = require("./authService");
const supabaseClient_1 = require("./supabaseClient");
const subscriptionService_1 = require("./subscriptionService");
class StreamVideoService {
    constructor() {
        this.client = null;
        this.currentCall = null;
        this.currentUser = null;
        this.eventHandlers = {};
        this.callTimer = null;
        this.callStartTime = null;
    }
    /**
     * Initialize Stream Video client and connect user
     */
    async initialize() {
        try {
            const currentUser = await authService_1.authService.getCurrentUser();
            if (!currentUser) {
                throw new Error('No authenticated user');
            }
            // Check if user has video call entitlements (Premium tier only)
            const canMakeVideoCalls = await this.checkVideoCallEntitlement(currentUser.id);
            if (!canMakeVideoCalls) {
                
                return false;
            }
            // Generate Stream Video token
            const token = await this.generateVideoToken(currentUser.id);
            if (!token) {
                throw new Error('Failed to generate video token');
            }
            // Create Stream Video user object
            this.currentUser = {
                id: currentUser.id,
                name: currentUser.fullName || 'User',
                image: currentUser.profileImageUrl,
            };
            // Initialize Stream Video client
            const apiKey = environment_1.ENV.STREAM_CHAT_API_KEY; // Same API key for Video
            this.client = new video_react_native_sdk_1.StreamVideoClient({
                apiKey,
                user: this.currentUser,
                token,
            });
            // Set up global event listeners
            this.setupGlobalEventListeners();
            return true;
        }
        catch (error) {
            
            return false;
        }
    }
    /**
     * Generate Stream Video token for user
     */
    async generateVideoToken(userId) {
        try {
            // In production, this should be done server-side
            // For now, we'll use the same token generation as Stream Chat
            const { streamTokenService } = await Promise.resolve().then(() => __importStar(require('./streamTokenService')));
            const tokenResponse = await streamTokenService.generateTokenForUser(userId);
            if (tokenResponse.success && tokenResponse.token) {
                return tokenResponse.token;
            }
            return null;
        }
        catch (error) {
            
            return null;
        }
    }
    /**
     * Check if user has Premium subscription for video calls
     */
    async checkVideoCallEntitlement(userId) {
        try {
            const subscription = await subscriptionService_1.subscriptionService.getCurrentSubscription(userId);
            // Only Premium tier users can make video/audio calls
            return subscription?.tier === 'premium' &&
                ['active', 'trialing'].includes(subscription.status);
        }
        catch (error) {
            
            return false;
        }
    }
    /**
     * Create or join a video/audio call
     */
    async createCall(callType, receiverId, receiverName, receiverImage) {
        if (!this.client || !this.currentUser) {
            
            return null;
        }
        try {
            // Check entitlements again before creating call
            const canMakeCall = await this.checkVideoCallEntitlement(this.currentUser.id);
            if (!canMakeCall) {
                throw new Error('Premium subscription required for video/audio calls');
            }
            // Generate unique call ID
            const callId = `datemi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            // Create call instance
            const call = this.client.call('default', callId);
            // Create call with members
            await call.create({
                data: {
                    members: [
                        { user_id: this.currentUser.id },
                        { user_id: receiverId },
                    ],
                    custom: {
                        type: callType,
                        module: 'datemi',
                        caller_name: this.currentUser.name,
                        receiver_name: receiverName,
                        receiver_image: receiverImage,
                    },
                    settings_override: {
                        audio: { mic_default_on: true, speaker_default_on: true },
                        video: {
                            enabled: callType === 'video',
                            camera_default_on: callType === 'video',
                        },
                        screensharing: { enabled: false },
                        recording: {
                            mode: 'disabled', // Enable if needed for Premium features
                        },
                    },
                }
            });
            this.currentCall = call;
            // Store call record in Supabase
            await this.createCallRecord(callType, receiverId, call.id, call.cid);
            // Set up call-specific event listeners
            this.setupCallEventListeners(call);
            return call;
        }
        catch (error) {
            
            await this.updateCallStatus('failed');
            return null;
        }
    }
    /**
     * Join an existing call
     */
    async joinCall(callCid) {
        if (!this.client) {
            
            return null;
        }
        try {
            // Parse call CID to get type and ID
            const [callType, callId] = callCid.split(':');
            // Get or create call instance
            const call = this.client.call(callType, callId);
            // Join the call
            await call.join();
            this.currentCall = call;
            this.setupCallEventListeners(call);
            // Update call status to accepted
            await this.updateCallStatus('accepted');
            return call;
        }
        catch (error) {
            
            await this.updateCallStatus('failed');
            return null;
        }
    }
    /**
     * End current call
     */
    async endCall() {
        if (!this.currentCall)
            return;
        try {
            // Leave the call
            await this.currentCall.leave();
            // Calculate duration if call was accepted
            let duration;
            if (this.callStartTime) {
                duration = Math.floor((Date.now() - this.callStartTime.getTime()) / 1000);
            }
            // Update call record with end time and duration
            await this.updateCallRecord({
                status: 'ended',
                endTime: new Date(),
                duration,
            });
            // Clear call timer
            if (this.callTimer) {
                clearInterval(this.callTimer);
                this.callTimer = null;
            }
            this.currentCall = null;
            this.callStartTime = null;
        }
        catch (error) {
            
        }
    }
    /**
     * Reject incoming call
     */
    async rejectCall(callCid) {
        try {
            await this.updateCallStatus('rejected', callCid);
        }
        catch (error) {
            
        }
    }
    /**
     * Toggle camera on/off
     */
    async toggleCamera() {
        if (!this.currentCall)
            return false;
        try {
            await this.currentCall.camera.toggle();
            return this.currentCall.camera.isEnabled;
        }
        catch (error) {
            
            return false;
        }
    }
    /**
     * Toggle microphone on/off
     */
    async toggleMicrophone() {
        if (!this.currentCall)
            return false;
        try {
            await this.currentCall.microphone.toggle();
            return this.currentCall.microphone.isEnabled;
        }
        catch (error) {
            
            return false;
        }
    }
    /**
     * Switch camera (front/back)
     */
    async switchCamera() {
        if (!this.currentCall)
            return;
        try {
            await this.currentCall.camera.flip();
        }
        catch (error) {
            
        }
    }
    /**
     * Get current call state
     */
    getCallState() {
        return this.currentCall?.state || null;
    }
    /**
     * Set event handlers for call events
     */
    setEventHandlers(handlers) {
        this.eventHandlers = { ...this.eventHandlers, ...handlers };
    }
    /**
     * Create call record in Supabase
     */
    async createCallRecord(type, receiverId, streamCallId, streamCallCid) {
        try {
            const { error } = await supabaseClient_1.supabase
                .from('calls')
                .insert({
                caller_id: this.currentUser?.id,
                receiver_id: receiverId,
                type,
                stream_call_id: streamCallId,
                stream_call_cid: streamCallCid,
                status: 'initiated',
            });
            if (error) {
                
            }
        }
        catch (error) {
            
        }
    }
    /**
     * Update call record in Supabase
     */
    async updateCallRecord(updates) {
        if (!this.currentCall)
            return;
        try {
            const updateData = {};
            if (updates.status)
                updateData.status = updates.status;
            if (updates.startTime)
                updateData.start_time = updates.startTime.toISOString();
            if (updates.endTime)
                updateData.end_time = updates.endTime.toISOString();
            if (updates.duration !== undefined)
                updateData.duration_seconds = updates.duration;
            const { error } = await supabaseClient_1.supabase
                .from('calls')
                .update(updateData)
                .eq('stream_call_id', this.currentCall.id)
                .order('created_at', { ascending: false })
                .limit(1);
            if (error) {
                
            }
        }
        catch (error) {
            
        }
    }
    /**
     * Update call status
     */
    async updateCallStatus(status, callCid) {
        try {
            const identifier = callCid || this.currentCall?.cid;
            if (!identifier)
                return;
            const { error } = await supabaseClient_1.supabase
                .from('calls')
                .update({ status })
                .eq('stream_call_cid', identifier)
                .order('created_at', { ascending: false })
                .limit(1);
            if (error) {
                
            }
        }
        catch (error) {
            
        }
    }
    /**
     * Set up global event listeners for incoming calls
     */
    setupGlobalEventListeners() {
        if (!this.client)
            return;
        // Listen for incoming calls
        this.client.on('call.ring', async (event) => {
            
            // Check if user can receive calls (Premium tier)
            const canReceiveCall = await this.checkVideoCallEntitlement(event.user.id);
            if (!canReceiveCall) {
                // Auto-reject if user doesn't have Premium
                await this.rejectCall(event.call.cid);
                return;
            }
            // Notify app about incoming call
            if (this.eventHandlers.onCallRinging) {
                this.eventHandlers.onCallRinging(event.call);
            }
        });
    }
    /**
     * Set up call-specific event listeners
     */
    setupCallEventListeners(call) {
        // Call accepted
        call.on('call.accepted', () => {
            this.callStartTime = new Date();
            this.updateCallRecord({
                status: 'accepted',
                startTime: this.callStartTime,
            });
            if (this.eventHandlers.onCallAccepted) {
                this.eventHandlers.onCallAccepted(call);
            }
            // Start call timer
            this.startCallTimer();
        });
        // Call rejected
        call.on('call.rejected', () => {
            this.updateCallStatus('rejected');
            if (this.eventHandlers.onCallRejected) {
                this.eventHandlers.onCallRejected(call);
            }
        });
        // Call ended
        call.on('call.ended', () => {
            this.endCall();
            if (this.eventHandlers.onCallEnded) {
                this.eventHandlers.onCallEnded(call);
            }
        });
        // Participant joined
        call.on('participant.joined', (event) => {
            if (this.eventHandlers.onParticipantJoined) {
                this.eventHandlers.onParticipantJoined(event.participant);
            }
        });
        // Participant left
        call.on('participant.left', (event) => {
            if (this.eventHandlers.onParticipantLeft) {
                this.eventHandlers.onParticipantLeft(event.participant);
            }
        });
        // Handle connection issues
        call.on('connection.failed', () => {
            this.updateCallStatus('failed');
            if (this.eventHandlers.onCallFailed) {
                this.eventHandlers.onCallFailed(new Error('Connection failed'));
            }
        });
    }
    /**
     * Start timer to track call duration
     */
    startCallTimer() {
        // Update timer every second
        this.callTimer = setInterval(() => {
            // Timer logic can be used for UI updates
            // Duration is calculated when call ends
        }, 1000);
    }
    /**
     * Get call history for current user
     */
    async getCallHistory(limit = 20) {
        try {
            const currentUser = await authService_1.authService.getCurrentUser();
            if (!currentUser)
                return [];
            const { data, error } = await supabaseClient_1.supabase
                .from('call_history')
                .select('*')
                .or(`caller_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) {
                
                return [];
            }
            return data?.map(call => ({
                id: call.id,
                callerId: call.caller_id,
                receiverId: call.receiver_id,
                type: call.type,
                streamCallId: call.stream_call_id,
                streamCallCid: call.stream_call_cid,
                status: call.status,
                startTime: call.start_time ? new Date(call.start_time) : undefined,
                endTime: call.end_time ? new Date(call.end_time) : undefined,
                duration: call.duration_seconds,
            })) || [];
        }
        catch (error) {
            
            return [];
        }
    }
    /**
     * Clean up and disconnect
     */
    async disconnect() {
        try {
            if (this.currentCall) {
                await this.endCall();
            }
            if (this.client) {
                await this.client.disconnectUser();
                this.client = null;
            }
            this.currentUser = null;
            this.eventHandlers = {};
        }
        catch (error) {
            
        }
    }
    /**
     * Get current call instance
     */
    getCurrentCall() {
        return this.currentCall;
    }
    /**
     * Check if client is connected
     */
    isConnected() {
        return this.client !== null && this.currentUser !== null;
    }
}
exports.StreamVideoService = StreamVideoService;
// Export singleton instance
exports.streamVideoService = new StreamVideoService();

"use strict";
/**
 * Redux Call Slice for MyNyumbApp
 *
 * Manages video and audio call state for the Date Mi module.
 * Handles active calls, call history, and call-related UI states.
 */
let _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectMissedCallsCount = exports.selectCallError = exports.selectCallDuration = exports.selectIsCallActive = exports.selectCallHistory = exports.selectIncomingCall = exports.selectActiveCall = exports.clearError = exports.clearMissedCallsCount = exports.incrementMissedCalls = exports.setCallScreenVisible = exports.setConnectionQuality = exports.toggleSpeaker = exports.updateCallDuration = exports.updateCallStatus = exports.clearIncomingCall = exports.setIncomingCall = exports.loadCallHistory = exports.switchCamera = exports.toggleMicrophone = exports.toggleCamera = exports.endCall = exports.rejectCall = exports.acceptCall = exports.startCall = exports.initializeVideoService = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const streamVideoService_1 = require("../../services/streamVideoService");
// Initial state
const initialState = {
    activeCall: {
        id: null,
        type: null,
        partnerId: null,
        partnerName: null,
        partnerImage: undefined,
        status: null,
        startTime: null,
        isVideoEnabled: true,
        isAudioEnabled: true,
        isSpeakerEnabled: false,
        duration: 0,
    },
    incomingCall: {
        callId: null,
        callerId: null,
        callerName: null,
        callerImage: undefined,
        type: null,
        isRinging: false,
    },
    callHistory: [],
    isCallScreenVisible: false,
    isIncomingCallModalVisible: false,
    isInitializing: false,
    isConnecting: false,
    error: null,
    connectionQuality: null,
    totalCallMinutes: 0,
    missedCallsCount: 0,
};
// Async thunks
// Initialize video service
exports.initializeVideoService = (0, toolkit_1.createAsyncThunk)('call/initializeService', async () => {
    const result = await streamVideoService_1.streamVideoService.initialize();
    if (!result) {
        throw new Error('Failed to initialize video service. Premium subscription required.');
    }
    return result;
});
// Start a video or audio call
exports.startCall = (0, toolkit_1.createAsyncThunk)('call/startCall', async ({ type, receiverId, receiverName, receiverImage }) => {
    const call = await streamVideoService_1.streamVideoService.createCall(type, receiverId, receiverName, receiverImage);
    if (!call) {
        throw new Error('Failed to start call. Please check your subscription.');
    }
    return {
        callId: call.id,
        type,
        partnerId: receiverId,
        partnerName: receiverName,
        partnerImage: receiverImage,
    };
});
// Accept incoming call
exports.acceptCall = (0, toolkit_1.createAsyncThunk)('call/acceptCall', async (callCid) => {
    const call = await streamVideoService_1.streamVideoService.joinCall(callCid);
    if (!call) {
        throw new Error('Failed to accept call');
    }
    return { callId: call.id };
});
// Reject incoming call
exports.rejectCall = (0, toolkit_1.createAsyncThunk)('call/rejectCall', async (callCid) => {
    await streamVideoService_1.streamVideoService.rejectCall(callCid);
    return { callCid };
});
// End current call
exports.endCall = (0, toolkit_1.createAsyncThunk)('call/endCall', async () => {
    await streamVideoService_1.streamVideoService.endCall();
    return null;
});
// Toggle camera
exports.toggleCamera = (0, toolkit_1.createAsyncThunk)('call/toggleCamera', async () => {
    const isEnabled = await streamVideoService_1.streamVideoService.toggleCamera();
    return { isVideoEnabled: isEnabled };
});
// Toggle microphone
exports.toggleMicrophone = (0, toolkit_1.createAsyncThunk)('call/toggleMicrophone', async () => {
    const isEnabled = await streamVideoService_1.streamVideoService.toggleMicrophone();
    return { isAudioEnabled: isEnabled };
});
// Switch camera
exports.switchCamera = (0, toolkit_1.createAsyncThunk)('call/switchCamera', async () => {
    await streamVideoService_1.streamVideoService.switchCamera();
    return null;
});
// Load call history
exports.loadCallHistory = (0, toolkit_1.createAsyncThunk)('call/loadHistory', async (limit = 20) => {
    const history = await streamVideoService_1.streamVideoService.getCallHistory(limit);
    return history;
});
// Create the slice
const callSlice = (0, toolkit_1.createSlice)({
    name: 'call',
    initialState,
    reducers: {
        // Set incoming call
        setIncomingCall: (state, action) => {
            state.incomingCall = {
                ...action.payload,
                isRinging: true,
            };
            state.isIncomingCallModalVisible = true;
        },
        // Clear incoming call
        clearIncomingCall: (state) => {
            state.incomingCall = {
                callId: null,
                callerId: null,
                callerName: null,
                callerImage: undefined,
                type: null,
                isRinging: false,
            };
            state.isIncomingCallModalVisible = false;
        },
        // Update call status
        updateCallStatus: (state, action) => {
            if (state.activeCall.id) {
                state.activeCall.status = action.payload;
            }
        },
        // Update call duration
        updateCallDuration: (state, action) => {
            if (state.activeCall.id) {
                state.activeCall.duration = action.payload;
            }
        },
        // Toggle speaker
        toggleSpeaker: (state) => {
            state.activeCall.isSpeakerEnabled = !state.activeCall.isSpeakerEnabled;
        },
        // Set connection quality
        setConnectionQuality: (state, action) => {
            state.connectionQuality = action.payload;
        },
        // Show/hide call screen
        setCallScreenVisible: (state, action) => {
            state.isCallScreenVisible = action.payload;
        },
        // Increment missed calls
        incrementMissedCalls: (state) => {
            state.missedCallsCount += 1;
        },
        // Clear missed calls count
        clearMissedCallsCount: (state) => {
            state.missedCallsCount = 0;
        },
        // Clear error
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Initialize video service
        builder
            .addCase(exports.initializeVideoService.pending, (state) => {
            state.isInitializing = true;
            state.error = null;
        })
            .addCase(exports.initializeVideoService.fulfilled, (state) => {
            state.isInitializing = false;
        })
            .addCase(exports.initializeVideoService.rejected, (state, action) => {
            state.isInitializing = false;
            state.error = action.error.message || 'Failed to initialize video service';
        });
        // Start call
        builder
            .addCase(exports.startCall.pending, (state) => {
            state.isConnecting = true;
            state.error = null;
        })
            .addCase(exports.startCall.fulfilled, (state, action) => {
            state.isConnecting = false;
            state.activeCall = {
                id: action.payload.callId,
                type: action.payload.type,
                partnerId: action.payload.partnerId,
                partnerName: action.payload.partnerName,
                partnerImage: action.payload.partnerImage,
                status: 'initiated',
                startTime: null,
                isVideoEnabled: action.payload.type === 'video',
                isAudioEnabled: true,
                isSpeakerEnabled: false,
                duration: 0,
            };
            state.isCallScreenVisible = true;
        })
            .addCase(exports.startCall.rejected, (state, action) => {
            state.isConnecting = false;
            state.error = action.error.message || 'Failed to start call';
        });
        // Accept call
        builder
            .addCase(exports.acceptCall.pending, (state) => {
            state.isConnecting = true;
            state.error = null;
        })
            .addCase(exports.acceptCall.fulfilled, (state, action) => {
            state.isConnecting = false;
            state.activeCall = {
                id: action.payload.callId,
                type: state.incomingCall.type,
                partnerId: state.incomingCall.callerId,
                partnerName: state.incomingCall.callerName,
                partnerImage: state.incomingCall.callerImage,
                status: 'accepted',
                startTime: new Date(),
                isVideoEnabled: state.incomingCall.type === 'video',
                isAudioEnabled: true,
                isSpeakerEnabled: false,
                duration: 0,
            };
            state.incomingCall = {
                callId: null,
                callerId: null,
                callerName: null,
                callerImage: undefined,
                type: null,
                isRinging: false,
            };
            state.isIncomingCallModalVisible = false;
            state.isCallScreenVisible = true;
        })
            .addCase(exports.acceptCall.rejected, (state, action) => {
            state.isConnecting = false;
            state.error = action.error.message || 'Failed to accept call';
        });
        // Reject call
        builder
            .addCase(exports.rejectCall.fulfilled, (state) => {
            state.incomingCall = {
                callId: null,
                callerId: null,
                callerName: null,
                callerImage: undefined,
                type: null,
                isRinging: false,
            };
            state.isIncomingCallModalVisible = false;
        });
        // End call
        builder
            .addCase(exports.endCall.fulfilled, (state) => {
            // Calculate total minutes
            if (state.activeCall.startTime) {
                const durationMinutes = Math.ceil(state.activeCall.duration / 60);
                state.totalCallMinutes += durationMinutes;
            }
            // Reset active call
            state.activeCall = {
                id: null,
                type: null,
                partnerId: null,
                partnerName: null,
                partnerImage: undefined,
                status: null,
                startTime: null,
                isVideoEnabled: true,
                isAudioEnabled: true,
                isSpeakerEnabled: false,
                duration: 0,
            };
            state.isCallScreenVisible = false;
            state.connectionQuality = null;
        });
        // Toggle camera
        builder
            .addCase(exports.toggleCamera.fulfilled, (state, action) => {
            state.activeCall.isVideoEnabled = action.payload.isVideoEnabled;
        });
        // Toggle microphone
        builder
            .addCase(exports.toggleMicrophone.fulfilled, (state, action) => {
            state.activeCall.isAudioEnabled = action.payload.isAudioEnabled;
        });
        // Load call history
        builder
            .addCase(exports.loadCallHistory.fulfilled, (state, action) => {
            state.callHistory = action.payload;
            // Calculate total minutes from history
            const totalSeconds = action.payload.reduce((sum, call) => {
                return sum + (call.duration || 0);
            }, 0);
            state.totalCallMinutes = Math.ceil(totalSeconds / 60);
            // Count missed calls
            state.missedCallsCount = action.payload.filter(call => call.status === 'missed').length;
        });
    },
});
// Export actions
_a = callSlice.actions, exports.setIncomingCall = _a.setIncomingCall, exports.clearIncomingCall = _a.clearIncomingCall, exports.updateCallStatus = _a.updateCallStatus, exports.updateCallDuration = _a.updateCallDuration, exports.toggleSpeaker = _a.toggleSpeaker, exports.setConnectionQuality = _a.setConnectionQuality, exports.setCallScreenVisible = _a.setCallScreenVisible, exports.incrementMissedCalls = _a.incrementMissedCalls, exports.clearMissedCallsCount = _a.clearMissedCallsCount, exports.clearError = _a.clearError;
// Selectors
const selectActiveCall = (state) => state.call.activeCall;
exports.selectActiveCall = selectActiveCall;
const selectIncomingCall = (state) => state.call.incomingCall;
exports.selectIncomingCall = selectIncomingCall;
const selectCallHistory = (state) => state.call.callHistory;
exports.selectCallHistory = selectCallHistory;
const selectIsCallActive = (state) => state.call.activeCall.id !== null;
exports.selectIsCallActive = selectIsCallActive;
const selectCallDuration = (state) => state.call.activeCall.duration;
exports.selectCallDuration = selectCallDuration;
const selectCallError = (state) => state.call.error;
exports.selectCallError = selectCallError;
const selectMissedCallsCount = (state) => state.call.missedCallsCount;
exports.selectMissedCallsCount = selectMissedCallsCount;
// Export reducer
exports.default = callSlice.reducer;

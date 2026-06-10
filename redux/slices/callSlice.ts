/**
 * Redux Call Slice for LinkApp
 * 
 * Manages video and audio call state for the Date Mi module.
 * Handles active calls, call history, and call-related UI states.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { streamVideoService, VideoCallSession, VideoCallType } from '../../services/streamVideoService';
import { RootState } from '../store';
import { CallingState } from '@stream-io/video-react-native-sdk';

// UI state machine driven by Stream CallingState
export type CallUiStatus = 'idle' | 'ringing' | 'joining' | 'joined' | 'left';

// Call state interface
export interface CallState {
  // Active call information
  activeCall: {
    id: string | null;
    type: VideoCallType | null;
    partnerId: string | null;
    partnerName: string | null;
    partnerImage?: string;
    status: CallUiStatus;
    startTime: Date | null;
    isVideoEnabled: boolean;
    isAudioEnabled: boolean;
    isSpeakerEnabled: boolean;
    duration: number; // in seconds
  };
  
  // Incoming call information
  incomingCall: {
    callId: string | null;
    callerId: string | null;
    callerName: string | null;
    callerImage?: string;
    type: VideoCallType | null;
    isRinging: boolean;
    notificationId: string | null;
  };
  
  // Call history
  callHistory: VideoCallSession[];
  
  // UI states
  isCallScreenVisible: boolean;
  isIncomingCallModalVisible: boolean;
  isInitializing: boolean;
  isConnecting: boolean;
  error: string | null;
  
  // Call quality
  connectionQuality: 'excellent' | 'good' | 'poor' | null;
  
  // Statistics
  totalCallMinutes: number;
  missedCallsCount: number;
}

// Initial state
const initialState: CallState = {
  activeCall: {
    id: null,
    type: null,
    partnerId: null,
    partnerName: null,
    partnerImage: undefined,
    status: 'idle',
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
    notificationId: null,
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
export const initializeVideoService = createAsyncThunk(
  'call/initializeService',
  async (_, { rejectWithValue }) => {
    try {
      const result = await streamVideoService.initialize();
      
      if (!result) {
        const reason = streamVideoService.getLastInitError?.();
        const errorMessage = reason || 'Failed to initialize video service. Please try again.';
        return rejectWithValue(errorMessage);
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize video service. Please try again.';
      return rejectWithValue(errorMessage);
    }
  }
);

// Start a video or audio call
export const startCall = createAsyncThunk(
  'call/startCall',
  async ({ 
    type, 
    receiverId, 
    receiverName,
    receiverImage 
  }: {
    type: VideoCallType;
    receiverId: string;
    receiverName: string;
    receiverImage?: string;
  }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as RootState;
      const rawCallerImage =
        state?.datemi?.myProfile?.profilePictures?.[0] ||
        state?.auth?.user?.profileImageUrl ||
        undefined;
      const callerImageOverride =
        typeof rawCallerImage === 'string' && /^https?:\/\//i.test(rawCallerImage)
          ? rawCallerImage
          : undefined;

      // Cold-start safety: if the client/token aren't ready yet, initialize now.
      // UI is shown immediately in `pending`, so this won't block rendering.
      if (!streamVideoService.isConnected()) {
        const initialized = await streamVideoService.initialize();
        if (!initialized) {
          const reason = streamVideoService.getLastInitError?.();
          const errorMessage = reason || 'Failed to initialize video service. Please try again.';
          return rejectWithValue(errorMessage);
        }
      }
      
      const call = await streamVideoService.createCall(
        type,
        receiverId,
        receiverName,
        receiverImage,
        callerImageOverride
      );
      
      if (!call) {
        const reason = streamVideoService.getLastCallError?.();
        const errorMessage = reason || 'Failed to start call. Please try again.';
        return rejectWithValue(errorMessage);
      }
      
      return {
        callId: call.id,
        type,
        partnerId: receiverId,
        partnerName: receiverName,
        partnerImage: receiverImage,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start call. Please try again.';
      return rejectWithValue(errorMessage);
    }
  },
  {
    condition: (_arg, { getState }) => {
      const state = getState() as RootState;
      const isBusy =
        state.call.isConnecting ||
        state.call.isCallScreenVisible ||
        state.call.activeCall.partnerId !== null;
      return !isBusy;
    },
  }
);

// Accept incoming call
export const acceptCall = createAsyncThunk(
  'call/acceptCall',
  async (callCid: string, { rejectWithValue, getState }) => {
    try {
      // Ensure video service is initialized (accept can be triggered from notification cold start).
      if (!streamVideoService.isConnected()) {
        const initialized = await streamVideoService.initialize();
        if (!initialized) {
          const reason = streamVideoService.getLastInitError?.();
          return rejectWithValue(reason || 'Failed to initialize video service');
        }
      }

      // Pass the known call type from Redux to skip the extra call.get() HTTP round trip.
      // This saves ~200-800ms on the accept path by avoiding a redundant server fetch.
      const state = getState() as RootState;
      const knownCallType = state.call.incomingCall.type ?? undefined;
      
      // Join the call (this signals acceptance to the caller)
      const call = await streamVideoService.joinCall(callCid, knownCallType);
      if (!call) {
        const reason = streamVideoService.getLastCallError?.();
        return rejectWithValue(reason || 'Failed to accept call');
      }
      
      return { 
        callId: call.id,
        callCid: call.cid,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to accept call');
    }
  },
  {
    condition: (_callCid, { getState }) => {
      const state = getState() as RootState;
      const isBusy =
        state.call.isConnecting ||
        state.call.isCallScreenVisible ||
        state.call.activeCall.partnerId !== null;
      return !isBusy;
    },
  }
);

// Reject incoming call
export const rejectCall = createAsyncThunk(
  'call/rejectCall',
  async (callCid: string) => {
    try {
      // Use the proper rejection method that sends reject signal to caller
      await streamVideoService.rejectIncomingCall(callCid);
      return { callCid };
    } catch {
      // Even if rejection fails on server, we should clear the UI
      return { callCid };
    }
  }
);

// End current call
export const endCall = createAsyncThunk(
  'call/endCall',
  async () => {
    await streamVideoService.endCall();
    return null;
  }
);

// Toggle camera
export const toggleCamera = createAsyncThunk(
  'call/toggleCamera',
  async () => {
    const isEnabled = await streamVideoService.toggleCamera();
    return { isVideoEnabled: isEnabled };
  }
);

// Toggle microphone
export const toggleMicrophone = createAsyncThunk(
  'call/toggleMicrophone',
  async () => {
    const isEnabled = await streamVideoService.toggleMicrophone();
    return { isAudioEnabled: isEnabled };
  }
);

// Switch camera
export const switchCamera = createAsyncThunk(
  'call/switchCamera',
  async () => {
    await streamVideoService.switchCamera();
    return null;
  }
);

// Load call history
export const loadCallHistory = createAsyncThunk(
  'call/loadHistory',
  async (limit: number = 20) => {
    const history = await streamVideoService.getCallHistory(limit);
    return history;
  }
);

// Create the slice
const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    // Set incoming call
    setIncomingCall: (state, action: PayloadAction<{
      callId: string;
      callerId: string;
      callerName: string;
      callerImage?: string;
      type: VideoCallType;
      notificationId?: string | null;
    }>) => {
      state.incomingCall = {
        ...action.payload,
        isRinging: true,
        notificationId: action.payload.notificationId ?? null,
      };
      state.isIncomingCallModalVisible = true;
    },

    // Set the call notification ID (so it can be dismissed later)
    setCallNotificationId: (state, action: PayloadAction<string | null>) => {
      state.incomingCall.notificationId = action.payload;
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
        notificationId: null,
      };
      state.isIncomingCallModalVisible = false;
    },
    
    // Set calling state from Stream SDK CallingState
    setCallingState: (state, action: PayloadAction<CallingState>) => {
      switch (action.payload) {
        case CallingState.UNKNOWN:
        case CallingState.IDLE:
          // Stream's ringing flow can keep the caller in IDLE until they actually join
          // (auto-join happens on `call.session_started` / `call.accepted`).
          // Preserve outgoing "Calling..." UX if Redux already indicates a ringing attempt.
          if (state.activeCall.status === 'ringing') {
            state.isConnecting = false;
            break;
          }

          // If we are already in a join attempt (e.g. accepting an incoming call),
          // don't let IDLE/UNKNOWN flip us back to idle and stop connection UI.
          if (state.isConnecting) {
            state.activeCall.status = 'joining';
            state.isConnecting = true;
            break;
          }

          state.activeCall.status = 'idle';
          state.isConnecting = false;
          break;
        case CallingState.RINGING:
          state.activeCall.status = 'ringing';
          state.isConnecting = false;
          break;
        case CallingState.JOINING:
          state.activeCall.status = 'joining';
          state.isConnecting = true;
          break;
        case CallingState.JOINED:
          state.activeCall.status = 'joined';
          state.isConnecting = false;
          if (!state.activeCall.startTime) {
            state.activeCall.startTime = new Date();
          }
          break;
        case CallingState.LEFT:
          state.activeCall.status = 'left';
          state.isConnecting = false;
          // IMPORTANT:
          // Do NOT auto-close the call screen here. Some transient Stream/SFU issues can
          // cause brief state glitches; auto-popping the UI can leave users without
          // call controls while the underlying session is still cleaning up.
          //
          // VideoCallScreen will render the "Call ended" UI for CallingState.LEFT and
          // the user can close it explicitly (which also resets activeCall via endCall()).
          break;
        case CallingState.RECONNECTING:
        case CallingState.MIGRATING:
        case CallingState.OFFLINE:
          // If we were already in an active call, keep the call marked as joined so
          // duration and in-call state remain stable while the SDK recovers.
          if (state.activeCall.status === 'joined') {
            state.activeCall.status = 'joined';
            state.isConnecting = false;
            break;
          }

          // Otherwise treat as joining/connecting (pre-join recovery).
          state.activeCall.status = 'joining';
          state.isConnecting = true;
          break;
        case CallingState.RECONNECTING_FAILED:
          // Recovery failed. Keep the call on-screen (VideoCallScreen handles the UI),
          // but stop "connecting" spinners so users can choose to end the call.
          if (state.activeCall.status === 'joined') {
            state.activeCall.status = 'joined';
          } else {
            state.activeCall.status = 'joining';
          }
          state.isConnecting = false;
          break;
        default: {
          // Future-proof: keep strict state machine.
          state.activeCall.status = 'joining';
          state.isConnecting = true;
          break;
        }
      }
    },
    
    // Update call duration
    updateCallDuration: (state, action: PayloadAction<number>) => {
      if (state.activeCall.id) {
        state.activeCall.duration = action.payload;
      }
    },
    
    // Toggle speaker
    toggleSpeaker: (state) => {
      state.activeCall.isSpeakerEnabled = !state.activeCall.isSpeakerEnabled;
    },
    
    // Set connection quality
    setConnectionQuality: (state, action: PayloadAction<'excellent' | 'good' | 'poor'>) => {
      state.connectionQuality = action.payload;
    },
    
    // Show/hide call screen
    setCallScreenVisible: (state, action: PayloadAction<boolean>) => {
      state.isCallScreenVisible = action.payload;
      // If the call already ended (LEFT) and the UI is being dismissed,
      // reset the active call state so the user isn't considered "busy".
      if (!action.payload && state.activeCall.status === 'left') {
        state.activeCall = {
          id: null,
          type: null,
          partnerId: null,
          partnerName: null,
          partnerImage: undefined,
          status: 'idle',
          startTime: null,
          isVideoEnabled: true,
          isAudioEnabled: true,
          isSpeakerEnabled: false,
          duration: 0,
        };
        state.connectionQuality = null;
      }
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
    // Set error (e.g. when navigation to call screen fails)
    setCallError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Initialize video service
    builder
      .addCase(initializeVideoService.pending, (state) => {
        state.isInitializing = true;
        state.error = null;
      })
      .addCase(initializeVideoService.fulfilled, (state) => {
        state.isInitializing = false;
      })
      .addCase(initializeVideoService.rejected, (state, action) => {
        state.isInitializing = false;
        // When using rejectWithValue, the error is in action.payload
        state.error = (action.payload as string) || action.error.message || 'Failed to initialize video service';
      });
    
    // Start call
    builder
      .addCase(startCall.pending, (state, action) => {
        state.isConnecting = true;
        state.error = null;
        // Show call screen immediately for fast UI transitions.
        // The call instance may still be initializing in streamVideoService.
        // isConnecting = true ensures VideoCallScreen shows loading UI
        // until the call is fully created (fulfilled sets it to false).
        state.isCallScreenVisible = true;

        const { type, receiverId, receiverName, receiverImage } = action.meta.arg;
        state.activeCall = {
          id: null,
          type,
          partnerId: receiverId,
          partnerName: receiverName,
          partnerImage: receiverImage,
          status: 'idle',
          startTime: null,
          isVideoEnabled: type === 'video',
          isAudioEnabled: true,
          // Video calls default to speaker, voice calls default to earpiece.
          isSpeakerEnabled: type === 'video',
          duration: 0,
        };
      })
      .addCase(startCall.fulfilled, (state, action) => {
        state.isConnecting = false;
        state.activeCall = {
          ...state.activeCall,
          id: action.payload.callId,
          type: action.payload.type,
          partnerId: action.payload.partnerId,
          partnerName: action.payload.partnerName,
          partnerImage: action.payload.partnerImage,
          isVideoEnabled: action.payload.type === 'video',
          status: 'ringing',
        };
        state.isCallScreenVisible = true;
      })
      .addCase(startCall.rejected, (state, action) => {
        state.isConnecting = false;
        // When using rejectWithValue, the error is in action.payload
        state.error = (action.payload as string) || action.error.message || 'Failed to start call';
        state.isCallScreenVisible = false;
      });
    
    // Accept call
    builder
      .addCase(acceptCall.pending, (state) => {
        state.isConnecting = true;
        state.error = null;
        // Fast transition: dismiss the incoming modal and show call screen immediately.
        state.isIncomingCallModalVisible = false;
        state.incomingCall.isRinging = false;
        state.isCallScreenVisible = true;
        state.activeCall = {
          id: null,
          type: state.incomingCall.type,
          partnerId: state.incomingCall.callerId,
          partnerName: state.incomingCall.callerName,
          partnerImage: state.incomingCall.callerImage,
          status: 'idle',
          startTime: null,
          isVideoEnabled: state.incomingCall.type === 'video',
          isAudioEnabled: true,
          // Video calls default to speaker, voice calls default to earpiece.
          isSpeakerEnabled: state.incomingCall.type === 'video',
          duration: 0,
        };
      })
      .addCase(acceptCall.fulfilled, (state, action) => {
        state.isConnecting = false;
        state.activeCall = {
          ...state.activeCall,
          id: action.payload.callId,
        };
        state.incomingCall = {
          callId: null,
          callerId: null,
          callerName: null,
          callerImage: undefined,
          type: null,
          isRinging: false,
          notificationId: null,
        };
        state.isIncomingCallModalVisible = false;
        state.isCallScreenVisible = true;
      })
      .addCase(acceptCall.rejected, (state, action) => {
        state.isConnecting = false;
        // When using rejectWithValue, the error is in action.payload
        state.error = (action.payload as string) || action.error.message || 'Failed to accept call';
        state.isCallScreenVisible = false;
      });
    
    // Reject call
    builder
      .addCase(rejectCall.fulfilled, (state) => {
        state.incomingCall = {
          callId: null,
          callerId: null,
          callerName: null,
          callerImage: undefined,
          type: null,
          isRinging: false,
          notificationId: null,
        };
        state.isIncomingCallModalVisible = false;
      });
    
    // End call
    builder
      .addCase(endCall.fulfilled, (state) => {
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
          status: 'idle',
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
      .addCase(toggleCamera.fulfilled, (state, action) => {
        state.activeCall.isVideoEnabled = action.payload.isVideoEnabled;
      });
    
    // Toggle microphone
    builder
      .addCase(toggleMicrophone.fulfilled, (state, action) => {
        state.activeCall.isAudioEnabled = action.payload.isAudioEnabled;
      });
    
    // Load call history
    builder
      .addCase(loadCallHistory.fulfilled, (state, action) => {
        state.callHistory = action.payload;
        
        // Calculate total minutes from history
        const totalSeconds = action.payload.reduce((sum, call) => {
          return sum + (call.duration || 0);
        }, 0);
        state.totalCallMinutes = Math.ceil(totalSeconds / 60);
        
        // Count missed calls
        state.missedCallsCount = action.payload.filter(
          call => call.status === 'missed'
        ).length;
      });
  },
});

// Export actions
export const {
  setIncomingCall,
  setCallNotificationId,
  clearIncomingCall,
  setCallingState,
  updateCallDuration,
  toggleSpeaker,
  setConnectionQuality,
  setCallScreenVisible,
  incrementMissedCalls,
  clearMissedCallsCount,
  clearError,
  setCallError,
} = callSlice.actions;

// Selectors
export const selectActiveCall = (state: RootState) => state.call.activeCall;
export const selectIncomingCall = (state: RootState) => state.call.incomingCall;
export const selectCallHistory = (state: RootState) => state.call.callHistory;
export const selectIsCallActive = (state: RootState) => state.call.activeCall.id !== null;
export const selectCallDuration = (state: RootState) => state.call.activeCall.duration;
export const selectCallError = (state: RootState) => state.call.error;
export const selectMissedCallsCount = (state: RootState) => state.call.missedCallsCount;

// Export reducer
export default callSlice.reducer;

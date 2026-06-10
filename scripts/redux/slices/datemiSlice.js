"use strict";
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
let _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.setAgeVerified = exports.setPaymentMethods = exports.setRecommendations = exports.toggleAutoRenew = exports.setSubscription = exports.clearError = exports.updateSessionAmount = exports.addMatch = exports.sendMessage = exports.skipProfile = exports.likeProfile = exports.setFilters = exports.setMyProfile = exports.setCurrentProfile = exports.fetchRecommendations = exports.addPaymentMethod = exports.fetchBillingHistory = exports.cancelSubscription = exports.purchaseSubscription = exports.endVideoCall = exports.startVideoCall = exports.createProfile = exports.fetchProfiles = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const subscription_1 = require("../../types/subscription");
const subscriptionService_1 = require("../../services/subscriptionService");
const initialState = {
    profiles: [],
    currentProfile: null,
    myProfile: null,
    isLoading: false,
    error: null,
    isAgeVerified: false,
    ageVerificationDate: null,
    videoCallSession: {
        isActive: false,
        sessionId: null,
        partnerId: null,
        startTime: null,
        currentAmount: 0,
    },
    transactions: [],
    filters: {},
    subscription: {
        current: null,
        availableTiers: subscription_1.SUBSCRIPTION_TIERS,
        paymentMethods: [],
        billingHistory: [],
        isProcessingPayment: false,
    },
    recommendations: {
        trending: [],
        personalized: [],
        recent: [],
        isLoading: false,
    },
};
// Async thunks
exports.fetchProfiles = (0, toolkit_1.createAsyncThunk)('datemi/fetchProfiles', async (filters = {}, { rejectWithValue }) => {
    try {
        // Implementation will connect to Supabase
        return [];
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.createProfile = (0, toolkit_1.createAsyncThunk)('datemi/createProfile', async (profileData, { rejectWithValue }) => {
    try {
        // Implementation will connect to Supabase
        return null;
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.startVideoCall = (0, toolkit_1.createAsyncThunk)('datemi/startVideoCall', async ({ partnerId, serviceType }, { rejectWithValue }) => {
    try {
        // Implementation will connect to video service and create escrow transaction
        return {
            sessionId: 'session-' + Date.now(),
            partnerId,
            startTime: new Date().toISOString(),
        };
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.endVideoCall = (0, toolkit_1.createAsyncThunk)('datemi/endVideoCall', async (_, { getState, rejectWithValue }) => {
    try {
        const state = getState();
        const session = state.datemi.videoCallSession;
        if (!session.isActive)
            return null;
        // Calculate final amount and process payment
        const endTime = new Date();
        const startTime = new Date(session.startTime);
        const durationMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60));
        return {
            sessionId: session.sessionId,
            duration: durationMinutes,
            finalAmount: session.currentAmount,
        };
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
// Subscription-related async thunks
exports.purchaseSubscription = (0, toolkit_1.createAsyncThunk)('datemi/purchaseSubscription', async ({ userId, tierId, paymentMethodType, phone }, { rejectWithValue }) => {
    try {
        const result = await subscriptionService_1.subscriptionService.purchaseSubscription({
            userId,
            tierId,
            paymentMethodType,
            phone,
        });
        return result.subscription;
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.cancelSubscription = (0, toolkit_1.createAsyncThunk)('datemi/cancelSubscription', async ({ subscriptionId, userId }, { rejectWithValue }) => {
    try {
        await subscriptionService_1.subscriptionService.cancelSubscription(subscriptionId, userId);
        return { subscriptionId, cancelledAt: new Date().toISOString() };
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.fetchBillingHistory = (0, toolkit_1.createAsyncThunk)('datemi/fetchBillingHistory', async (userId, { rejectWithValue }) => {
    try {
        return await subscriptionService_1.subscriptionService.getBillingHistory(userId);
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.addPaymentMethod = (0, toolkit_1.createAsyncThunk)('datemi/addPaymentMethod', async (paymentData, { rejectWithValue }) => {
    try {
        // Implementation will connect to payment service
        const paymentMethod = {
            ...paymentData,
            id: 'pm-' + Date.now(),
            createdAt: new Date().toISOString(),
        };
        return paymentMethod;
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.fetchRecommendations = (0, toolkit_1.createAsyncThunk)('datemi/fetchRecommendations', async (userId, { rejectWithValue }) => {
    try {
        const { recommendationService } = await Promise.resolve().then(() => __importStar(require('../../services/recommendationService')));
        const result = await recommendationService.getHomeScreenRecommendations(userId);
        return result;
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
const datemiSlice = (0, toolkit_1.createSlice)({
    name: 'datemi',
    initialState,
    reducers: {
        setCurrentProfile: (state, action) => {
            state.currentProfile = action.payload;
        },
        setMyProfile: (state, action) => {
            state.myProfile = action.payload;
        },
        setAgeVerified: (state, action) => {
            state.isAgeVerified = action.payload.verified;
            state.ageVerificationDate = action.payload.verified
                ? (action.payload.timestamp || new Date().toISOString())
                : null;
        },
        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        likeProfile: (state, action) => {
            // Add like action - this would typically create a match potential
            
        },
        skipProfile: (state, action) => {
            // Add skip action - this would typically hide the profile
            
        },
        addMatch: (state, action) => {
            // Add match when both users like each other
            
        },
        sendMessage: (state, action) => {
            // Add message sending action
            
        },
        updateSessionAmount: (state, action) => {
            if (state.videoCallSession.isActive) {
                state.videoCallSession.currentAmount = action.payload;
            }
        },
        clearError: (state) => {
            state.error = null;
        },
        setSubscription: (state, action) => {
            state.subscription.current = action.payload;
        },
        toggleAutoRenew: (state) => {
            if (state.subscription.current) {
                state.subscription.current.autoRenew = !state.subscription.current.autoRenew;
            }
        },
        setPaymentMethods: (state, action) => {
            state.subscription.paymentMethods = action.payload;
        },
        setRecommendations: (state, action) => {
            state.recommendations = {
                ...action.payload,
                isLoading: false,
            };
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(exports.fetchProfiles.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.fetchProfiles.fulfilled, (state, action) => {
            state.isLoading = false;
            state.profiles = action.payload;
        })
            .addCase(exports.fetchProfiles.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        })
            .addCase(exports.startVideoCall.pending, (state) => {
            state.isLoading = true;
        })
            .addCase(exports.startVideoCall.fulfilled, (state, action) => {
            state.isLoading = false;
            if (action.payload) {
                state.videoCallSession = {
                    isActive: true,
                    sessionId: action.payload.sessionId,
                    partnerId: action.payload.partnerId,
                    startTime: action.payload.startTime,
                    currentAmount: 0,
                };
            }
        })
            .addCase(exports.startVideoCall.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        })
            .addCase(exports.endVideoCall.fulfilled, (state, action) => {
            state.videoCallSession = {
                isActive: false,
                sessionId: null,
                partnerId: null,
                startTime: null,
                currentAmount: 0,
            };
            if (action.payload) {
                // Add to transaction history
                const transaction = {
                    id: 'txn-' + Date.now(),
                    payerId: 'current-user', // Will be replaced with actual user ID
                    payeeId: state.videoCallSession.partnerId || '',
                    amount: action.payload.finalAmount,
                    currency: 'KES',
                    escrowStatus: 'completed',
                    serviceType: 'video_calling',
                    sessionReference: action.payload.sessionId,
                    createdAt: new Date().toISOString(),
                    completionDate: new Date().toISOString(),
                };
                state.transactions.unshift(transaction);
            }
        })
            // Subscription reducers
            .addCase(exports.purchaseSubscription.pending, (state) => {
            state.subscription.isProcessingPayment = true;
            state.error = null;
        })
            .addCase(exports.purchaseSubscription.fulfilled, (state, action) => {
            state.subscription.isProcessingPayment = false;
            state.subscription.current = action.payload;
            if (state.myProfile) {
                state.myProfile.subscriptionTier = action.payload.tier.id;
            }
        })
            .addCase(exports.purchaseSubscription.rejected, (state, action) => {
            state.subscription.isProcessingPayment = false;
            state.error = action.payload;
        })
            .addCase(exports.cancelSubscription.fulfilled, (state) => {
            if (state.subscription.current) {
                state.subscription.current.status = 'cancelled';
                state.subscription.current.autoRenew = false;
            }
            if (state.myProfile) {
                state.myProfile.subscriptionTier = 'free';
            }
        })
            .addCase(exports.fetchBillingHistory.fulfilled, (state, action) => {
            state.subscription.billingHistory = action.payload;
        })
            .addCase(exports.addPaymentMethod.fulfilled, (state, action) => {
            state.subscription.paymentMethods.push(action.payload);
        })
            .addCase(exports.fetchRecommendations.pending, (state) => {
            state.recommendations.isLoading = true;
        })
            .addCase(exports.fetchRecommendations.fulfilled, (state, action) => {
            state.recommendations = {
                ...action.payload,
                isLoading: false,
            };
        })
            .addCase(exports.fetchRecommendations.rejected, (state, action) => {
            state.recommendations.isLoading = false;
            state.error = action.payload;
        });
    },
});
_a = datemiSlice.actions, exports.setCurrentProfile = _a.setCurrentProfile, exports.setMyProfile = _a.setMyProfile, exports.setFilters = _a.setFilters, exports.likeProfile = _a.likeProfile, exports.skipProfile = _a.skipProfile, exports.sendMessage = _a.sendMessage, exports.addMatch = _a.addMatch, exports.updateSessionAmount = _a.updateSessionAmount, exports.clearError = _a.clearError, exports.setSubscription = _a.setSubscription, exports.toggleAutoRenew = _a.toggleAutoRenew, exports.setRecommendations = _a.setRecommendations, exports.setPaymentMethods = _a.setPaymentMethods, exports.setAgeVerified = _a.setAgeVerified;
exports.default = datemiSlice.reducer;

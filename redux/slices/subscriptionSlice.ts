import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  Subscription, 
  SubscriptionTier, 
  BillingCycle, 
  BillingHistory,
  SUBSCRIPTION_TIERS,
  SubscriptionTierData
} from '../../types/subscription';
import { subscriptionService } from '../../services/subscriptionService';

interface SubscriptionState {
  currentSubscription: Subscription | null;
  availableTiers: SubscriptionTierData[];
  billingHistory: BillingHistory[];
  isLoading: boolean;
  error: string | null;
  isCheckingStatus: boolean;
}

const initialState: SubscriptionState = {
  currentSubscription: null,
  availableTiers: SUBSCRIPTION_TIERS,
  billingHistory: [],
  isLoading: false,
  error: null,
  isCheckingStatus: false,
};

export const getCurrentSubscription = createAsyncThunk(
  'subscription/getCurrentSubscription',
  async (userId: string, { rejectWithValue }) => {
    try {
      const subscription = await subscriptionService.getCurrentSubscription(userId);
      return subscription;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch subscription');
    }
  }
);

export const createSubscription = createAsyncThunk(
  'subscription/createSubscription',
  async (params: {
    userId: string;
    tier: 'pro' | 'premium';
    billingCycle: 'monthly' | 'yearly';
    paymentReference: string;
    amount: number;
    currency: string;
    countryCode: string;
  }, { rejectWithValue }) => {
    try {
      const subscription = await subscriptionService.createSubscription(params);
      return subscription;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create subscription');
    }
  }
);

export const cancelSubscription = createAsyncThunk(
  'subscription/cancelSubscription',
  async (params: { subscriptionId: string; userId: string }, { rejectWithValue }) => {
    try {
      await subscriptionService.cancelSubscription(params.subscriptionId, params.userId);
      return params.subscriptionId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to cancel subscription');
    }
  }
);

export const getBillingHistory = createAsyncThunk(
  'subscription/getBillingHistory',
  async (userId: string, { rejectWithValue }) => {
    try {
      const history = await subscriptionService.getBillingHistory(userId);
      return history;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch billing history');
    }
  }
);

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    setCurrentSubscription: (state, action: PayloadAction<Subscription | null>) => {
      state.currentSubscription = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSubscriptionData: (state) => {
      state.currentSubscription = null;
      state.billingHistory = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCurrentSubscription.pending, (state) => {
        state.isCheckingStatus = true;
        state.error = null;
      })
      .addCase(getCurrentSubscription.fulfilled, (state, action) => {
        state.isCheckingStatus = false;
        state.currentSubscription = action.payload;
      })
      .addCase(getCurrentSubscription.rejected, (state, action) => {
        state.isCheckingStatus = false;
        state.error = action.payload as string;
      })
      .addCase(createSubscription.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createSubscription.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentSubscription = action.payload;
      })
      .addCase(createSubscription.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(cancelSubscription.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(cancelSubscription.fulfilled, (state) => {
        state.isLoading = false;
        if (state.currentSubscription) {
          state.currentSubscription.status = 'cancelled';
          state.currentSubscription.autoRenew = false;
          state.currentSubscription.cancelledAt = new Date().toISOString();
        }
      })
      .addCase(cancelSubscription.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(getBillingHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getBillingHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.billingHistory = action.payload;
      })
      .addCase(getBillingHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentSubscription, clearError, clearSubscriptionData } = subscriptionSlice.actions;

export const selectCurrentSubscription = (state: { subscription: SubscriptionState }) => 
  state.subscription.currentSubscription;

export const selectSubscriptionTier = (state: { subscription: SubscriptionState }): SubscriptionTier => 
  state.subscription.currentSubscription?.tier || 'free';

export const selectIsSubscriptionActive = (state: { subscription: SubscriptionState }): boolean => {
  const sub = state.subscription.currentSubscription;
  if (!sub || (sub.status !== 'active' && sub.status !== 'trial' && sub.status !== 'trialing')) return false;
  const endMs = new Date(sub.endDate).getTime();
  return Number.isFinite(endMs) ? endMs > Date.now() : false;
};

export const selectBillingHistory = (state: { subscription: SubscriptionState }) => 
  state.subscription.billingHistory;

export const selectAvailableTiers = (state: { subscription: SubscriptionState }) => 
  state.subscription.availableTiers;

export default subscriptionSlice.reducer;

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { PaymentMethod, BillingHistory, PaymentStatus } from '../../types/subscription';
import { paystackService, PaystackPaymentRequest } from '../../services/paystackService';

interface PaymentTransaction {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  reference: string;
  paymentMethod: string;
  description: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface PaymentState {
  paymentMethods: PaymentMethod[];
  transactions: PaymentTransaction[];
  currentTransaction: PaymentTransaction | null;
  isProcessing: boolean;
  isLoading: boolean;
  error: string | null;
  lastPaymentReference: string | null;
}

const initialState: PaymentState = {
  paymentMethods: [],
  transactions: [],
  currentTransaction: null,
  isProcessing: false,
  isLoading: false,
  error: null,
  lastPaymentReference: null,
};

export const initializePayment = createAsyncThunk(
  'payment/initializePayment',
  async (params: {
    userId: string;
    email: string;
    tier: 'pro' | 'premium';
    billingCycle: 'monthly' | 'yearly';
    countryCode: string;
    paymentChannel?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await paystackService.initializePayment(
        params.userId,
        params.email,
        params.tier,
        params.billingCycle,
        params.countryCode,
        params.paymentChannel
      );
      return {
        reference: response.data.reference,
        authorizationUrl: response.data.authorization_url,
        accessCode: response.data.access_code,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to initialize payment');
    }
  }
);

export const verifyPayment = createAsyncThunk(
  'payment/verifyPayment',
  async (reference: string, { rejectWithValue }) => {
    try {
      const verification = await paystackService.verifyPayment(reference);
      
      if (!verification.status || verification.data.status !== 'success') {
        throw new Error(verification.data.gateway_response || 'Payment verification failed');
      }
      
      const transaction: PaymentTransaction = {
        id: verification.data.id.toString(),
        amount: verification.data.amount / 100,
        currency: verification.data.currency,
        status: verification.data.status as PaymentStatus,
        reference: verification.data.reference,
        paymentMethod: verification.data.channel,
        description: 'Subscription payment',
        createdAt: verification.data.paid_at || verification.data.created_at,
        metadata: verification.data.metadata,
      };
      
      return transaction;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to verify payment');
    }
  }
);

export const addPaymentMethod = createAsyncThunk(
  'payment/addPaymentMethod',
  async (paymentMethod: Omit<PaymentMethod, 'id' | 'createdAt'>, { rejectWithValue }) => {
    try {
      const newMethod: PaymentMethod = {
        ...paymentMethod,
        id: `pm_${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      return newMethod;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to add payment method');
    }
  }
);

export const removePaymentMethod = createAsyncThunk(
  'payment/removePaymentMethod',
  async (paymentMethodId: string, { rejectWithValue }) => {
    try {
      return paymentMethodId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to remove payment method');
    }
  }
);

export const setDefaultPaymentMethod = createAsyncThunk(
  'payment/setDefaultPaymentMethod',
  async (paymentMethodId: string, { rejectWithValue }) => {
    try {
      return paymentMethodId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to set default payment method');
    }
  }
);

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    clearPaymentError: (state) => {
      state.error = null;
    },
    clearCurrentTransaction: (state) => {
      state.currentTransaction = null;
    },
    setLastPaymentReference: (state, action: PayloadAction<string>) => {
      state.lastPaymentReference = action.payload;
    },
    addTransaction: (state, action: PayloadAction<PaymentTransaction>) => {
      state.transactions.unshift(action.payload);
    },
    clearPaymentData: (state) => {
      state.paymentMethods = [];
      state.transactions = [];
      state.currentTransaction = null;
      state.error = null;
      state.lastPaymentReference = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializePayment.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(initializePayment.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.lastPaymentReference = action.payload.reference;
      })
      .addCase(initializePayment.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as string;
      })
      .addCase(verifyPayment.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(verifyPayment.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.currentTransaction = action.payload;
        state.transactions.unshift(action.payload);
      })
      .addCase(verifyPayment.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as string;
      })
      .addCase(addPaymentMethod.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addPaymentMethod.fulfilled, (state, action) => {
        state.isLoading = false;
        state.paymentMethods.push(action.payload);
      })
      .addCase(addPaymentMethod.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(removePaymentMethod.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(removePaymentMethod.fulfilled, (state, action) => {
        state.isLoading = false;
        state.paymentMethods = state.paymentMethods.filter(
          method => method.id !== action.payload
        );
      })
      .addCase(removePaymentMethod.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(setDefaultPaymentMethod.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(setDefaultPaymentMethod.fulfilled, (state, action) => {
        state.isLoading = false;
        state.paymentMethods = state.paymentMethods.map(method => ({
          ...method,
          isDefault: method.id === action.payload,
        }));
      })
      .addCase(setDefaultPaymentMethod.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearPaymentError,
  clearCurrentTransaction,
  setLastPaymentReference,
  addTransaction,
  clearPaymentData,
} = paymentSlice.actions;

export const selectPaymentMethods = (state: { payment: PaymentState }) => 
  state.payment.paymentMethods;

export const selectDefaultPaymentMethod = (state: { payment: PaymentState }) => 
  state.payment.paymentMethods.find(method => method.isDefault);

export const selectTransactions = (state: { payment: PaymentState }) => 
  state.payment.transactions;

export const selectCurrentTransaction = (state: { payment: PaymentState }) => 
  state.payment.currentTransaction;

export const selectIsProcessingPayment = (state: { payment: PaymentState }) => 
  state.payment.isProcessing;

export const selectLastPaymentReference = (state: { payment: PaymentState }) => 
  state.payment.lastPaymentReference;

export default paymentSlice.reducer;

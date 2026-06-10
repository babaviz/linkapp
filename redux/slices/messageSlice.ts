/**
 * Message Redux Slice - Inquiry and Communication State Management
 * TaskMaster Task 8: Contact Management System Implementation
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { PropertyInquiry } from '../../types/property';
import { messageService } from '../../services/messageService';

// Message/Inquiry state interface
interface MessageState {
  // User's sent inquiries
  sentInquiries: PropertyInquiry[];
  
  // Owner's received inquiries
  receivedInquiries: PropertyInquiry[];
  
  // Current conversation/inquiry being viewed
  currentInquiry: PropertyInquiry | null;
  
  // Property-specific inquiries (for property owners)
  propertyInquiries: { [propertyId: string]: PropertyInquiry[] };
  
  // Statistics
  inquiryStats: {
    total_inquiries: number;
    pending_inquiries: number;
    responded_inquiries: number;
    closed_inquiries: number;
  } | null;
  
  // UI state
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  
  // Unread counts
  unreadInquiries: number;
}

const initialState: MessageState = {
  sentInquiries: [],
  receivedInquiries: [],
  currentInquiry: null,
  propertyInquiries: {},
  inquiryStats: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  unreadInquiries: 0
};

// Async thunks for message operations
export const submitInquiry = createAsyncThunk(
  'message/submitInquiry',
  async ({ 
    inquiryData, 
    inquirerName 
  }: { 
    inquiryData: Omit<PropertyInquiry, 'id' | 'created_at' | 'status'>; 
    inquirerName: string;
  }, { rejectWithValue }) => {
    try {
      const inquiry = await messageService.submitInquiry(inquiryData, inquirerName);
      
      // Send notification to owner (don't fail if this fails)
      try {
        await messageService.notifyOwnerOfInquiry(inquiry);
      } catch (notificationError) {
        console.warn('Failed to notify owner, but inquiry was submitted');
      }
      
      return inquiry;
    } catch (error: any) {
      console.error('Error submitting inquiry:', error);
      return rejectWithValue(error.message || 'Failed to submit inquiry');
    }
  }
);

export const fetchUserInquiries = createAsyncThunk(
  'message/fetchUserInquiries',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await messageService.getUserInquiries(userId);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchOwnerInquiries = createAsyncThunk(
  'message/fetchOwnerInquiries',
  async (ownerId: string, { rejectWithValue }) => {
    try {
      return await messageService.getOwnerInquiries(ownerId);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchPropertyInquiries = createAsyncThunk(
  'message/fetchPropertyInquiries',
  async ({ propertyId, ownerId }: { propertyId: string; ownerId: string }, { rejectWithValue }) => {
    try {
      const inquiries = await messageService.getPropertyInquiries(propertyId, ownerId);
      return { propertyId, inquiries };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const respondToInquiry = createAsyncThunk(
  'message/respondToInquiry',
  async ({ 
    inquiryId, 
    responseMessage, 
    ownerId 
  }: { 
    inquiryId: string; 
    responseMessage: string; 
    ownerId: string;
  }, { rejectWithValue }) => {
    try {
      return await messageService.respondToInquiry(inquiryId, responseMessage, ownerId);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const closeInquiry = createAsyncThunk(
  'message/closeInquiry',
  async ({ inquiryId, userId }: { inquiryId: string; userId: string }, { rejectWithValue }) => {
    try {
      await messageService.closeInquiry(inquiryId, userId);
      return inquiryId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteInquiry = createAsyncThunk(
  'message/deleteInquiry',
  async ({ inquiryId, userId }: { inquiryId: string; userId: string }, { rejectWithValue }) => {
    try {
      await messageService.deleteInquiry(inquiryId, userId);
      return inquiryId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchInquiryStats = createAsyncThunk(
  'message/fetchInquiryStats',
  async (ownerId: string, { rejectWithValue }) => {
    try {
      return await messageService.getInquiryStats(ownerId);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Message slice
const messageSlice = createSlice({
  name: 'message',
  initialState,
  reducers: {
    setCurrentInquiry: (state, action: PayloadAction<PropertyInquiry | null>) => {
      state.currentInquiry = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    markInquiryAsRead: (state, action: PayloadAction<string>) => {
      const inquiryId = action.payload;
      
      // Find and mark inquiry as read in received inquiries
      const inquiry = state.receivedInquiries.find(inq => inq.id === inquiryId);
      if (inquiry) {
        // Mark as read logic would go here (if we had a read field)
        state.unreadInquiries = Math.max(0, state.unreadInquiries - 1);
      }
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    clearInquiries: (state) => {
      state.sentInquiries = [];
      state.receivedInquiries = [];
      state.propertyInquiries = {};
      state.currentInquiry = null;
      state.inquiryStats = null;
    },
    
    updateUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadInquiries = action.payload;
    }
  },
  
  extraReducers: (builder) => {
    builder
      // Submit inquiry
      .addCase(submitInquiry.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(submitInquiry.fulfilled, (state, action) => {
        state.isSubmitting = false;
        if (action.payload) {
          state.sentInquiries.unshift(action.payload);
        }
      })
      .addCase(submitInquiry.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })
      
      // Fetch user inquiries
      .addCase(fetchUserInquiries.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserInquiries.fulfilled, (state, action) => {
        state.isLoading = false;
        state.sentInquiries = action.payload;
      })
      .addCase(fetchUserInquiries.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch owner inquiries
      .addCase(fetchOwnerInquiries.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOwnerInquiries.fulfilled, (state, action) => {
        state.isLoading = false;
        state.receivedInquiries = action.payload;
        
        // Update unread count (assuming new inquiries are those with status 'pending')
        state.unreadInquiries = action.payload.filter(inq => inq.status === 'pending').length;
      })
      .addCase(fetchOwnerInquiries.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch property inquiries
      .addCase(fetchPropertyInquiries.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPropertyInquiries.fulfilled, (state, action) => {
        state.isLoading = false;
        const { propertyId, inquiries } = action.payload;
        state.propertyInquiries[propertyId] = inquiries;
      })
      .addCase(fetchPropertyInquiries.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Respond to inquiry
      .addCase(respondToInquiry.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(respondToInquiry.fulfilled, (state, action) => {
        state.isSubmitting = false;
        if (action.payload) {
          // Update the inquiry in received inquiries
          const index = state.receivedInquiries.findIndex(inq => inq.id === action.payload.id);
          if (index !== -1) {
            state.receivedInquiries[index] = action.payload;
          }
          
          // Update in property inquiries
          Object.keys(state.propertyInquiries).forEach(propertyId => {
            const propIndex = state.propertyInquiries[propertyId].findIndex(inq => inq.id === action.payload.id);
            if (propIndex !== -1) {
              state.propertyInquiries[propertyId][propIndex] = action.payload;
            }
          });
          
          // Update current inquiry if it's the same
          if (state.currentInquiry && state.currentInquiry.id === action.payload.id) {
            state.currentInquiry = action.payload;
          }
        }
      })
      .addCase(respondToInquiry.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })
      
      // Close inquiry
      .addCase(closeInquiry.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(closeInquiry.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const inquiryId = action.payload;
        
        // Update status in all inquiry arrays
        const updateInquiryStatus = (inquiries: PropertyInquiry[]) => {
          const index = inquiries.findIndex(inq => inq.id === inquiryId);
          if (index !== -1) {
            inquiries[index] = { ...inquiries[index], status: 'closed' };
          }
        };
        
        updateInquiryStatus(state.sentInquiries);
        updateInquiryStatus(state.receivedInquiries);
        
        Object.keys(state.propertyInquiries).forEach(propertyId => {
          updateInquiryStatus(state.propertyInquiries[propertyId]);
        });
        
        if (state.currentInquiry && state.currentInquiry.id === inquiryId) {
          state.currentInquiry = { ...state.currentInquiry, status: 'closed' };
        }
      })
      .addCase(closeInquiry.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })
      
      // Delete inquiry
      .addCase(deleteInquiry.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(deleteInquiry.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const inquiryId = action.payload;
        
        // Remove from sent inquiries
        state.sentInquiries = state.sentInquiries.filter(inq => inq.id !== inquiryId);
        
        // Clear current inquiry if it was deleted
        if (state.currentInquiry && state.currentInquiry.id === inquiryId) {
          state.currentInquiry = null;
        }
      })
      .addCase(deleteInquiry.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })
      
      // Fetch inquiry stats
      .addCase(fetchInquiryStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInquiryStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.inquiryStats = action.payload;
      })
      .addCase(fetchInquiryStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  }
});

export const {
  setCurrentInquiry,
  clearError,
  markInquiryAsRead,
  setLoading,
  clearInquiries,
  updateUnreadCount
} = messageSlice.actions;

export default messageSlice.reducer;

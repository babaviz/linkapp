"use strict";
/**
 * Message Redux Slice - Inquiry and Communication State Management
 * TaskMaster Task 8: Contact Management System Implementation
 */
let _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUnreadCount = exports.clearInquiries = exports.setLoading = exports.markInquiryAsRead = exports.clearError = exports.setCurrentInquiry = exports.fetchInquiryStats = exports.deleteInquiry = exports.closeInquiry = exports.respondToInquiry = exports.fetchPropertyInquiries = exports.fetchOwnerInquiries = exports.fetchUserInquiries = exports.submitInquiry = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const messageService_1 = require("../../services/messageService");
const initialState = {
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
exports.submitInquiry = (0, toolkit_1.createAsyncThunk)('message/submitInquiry', async ({ inquiryData, inquirerName }, { rejectWithValue }) => {
    try {
        const inquiry = await messageService_1.messageService.submitInquiry(inquiryData, inquirerName);
        // Send notification to owner
        await messageService_1.messageService.notifyOwnerOfInquiry(inquiry);
        return inquiry;
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.fetchUserInquiries = (0, toolkit_1.createAsyncThunk)('message/fetchUserInquiries', async (userId, { rejectWithValue }) => {
    try {
        return await messageService_1.messageService.getUserInquiries(userId);
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.fetchOwnerInquiries = (0, toolkit_1.createAsyncThunk)('message/fetchOwnerInquiries', async (ownerId, { rejectWithValue }) => {
    try {
        return await messageService_1.messageService.getOwnerInquiries(ownerId);
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.fetchPropertyInquiries = (0, toolkit_1.createAsyncThunk)('message/fetchPropertyInquiries', async ({ propertyId, ownerId }, { rejectWithValue }) => {
    try {
        const inquiries = await messageService_1.messageService.getPropertyInquiries(propertyId, ownerId);
        return { propertyId, inquiries };
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.respondToInquiry = (0, toolkit_1.createAsyncThunk)('message/respondToInquiry', async ({ inquiryId, responseMessage, ownerId }, { rejectWithValue }) => {
    try {
        return await messageService_1.messageService.respondToInquiry(inquiryId, responseMessage, ownerId);
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.closeInquiry = (0, toolkit_1.createAsyncThunk)('message/closeInquiry', async ({ inquiryId, userId }, { rejectWithValue }) => {
    try {
        await messageService_1.messageService.closeInquiry(inquiryId, userId);
        return inquiryId;
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.deleteInquiry = (0, toolkit_1.createAsyncThunk)('message/deleteInquiry', async ({ inquiryId, userId }, { rejectWithValue }) => {
    try {
        await messageService_1.messageService.deleteInquiry(inquiryId, userId);
        return inquiryId;
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.fetchInquiryStats = (0, toolkit_1.createAsyncThunk)('message/fetchInquiryStats', async (ownerId, { rejectWithValue }) => {
    try {
        return await messageService_1.messageService.getInquiryStats(ownerId);
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
// Message slice
const messageSlice = (0, toolkit_1.createSlice)({
    name: 'message',
    initialState,
    reducers: {
        setCurrentInquiry: (state, action) => {
            state.currentInquiry = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
        markInquiryAsRead: (state, action) => {
            const inquiryId = action.payload;
            // Find and mark inquiry as read in received inquiries
            const inquiry = state.receivedInquiries.find(inq => inq.id === inquiryId);
            if (inquiry) {
                // Mark as read logic would go here (if we had a read field)
                state.unreadInquiries = Math.max(0, state.unreadInquiries - 1);
            }
        },
        setLoading: (state, action) => {
            state.isLoading = action.payload;
        },
        clearInquiries: (state) => {
            state.sentInquiries = [];
            state.receivedInquiries = [];
            state.propertyInquiries = {};
            state.currentInquiry = null;
            state.inquiryStats = null;
        },
        updateUnreadCount: (state, action) => {
            state.unreadInquiries = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            // Submit inquiry
            .addCase(exports.submitInquiry.pending, (state) => {
            state.isSubmitting = true;
            state.error = null;
        })
            .addCase(exports.submitInquiry.fulfilled, (state, action) => {
            state.isSubmitting = false;
            if (action.payload) {
                state.sentInquiries.unshift(action.payload);
            }
        })
            .addCase(exports.submitInquiry.rejected, (state, action) => {
            state.isSubmitting = false;
            state.error = action.payload;
        })
            // Fetch user inquiries
            .addCase(exports.fetchUserInquiries.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.fetchUserInquiries.fulfilled, (state, action) => {
            state.isLoading = false;
            state.sentInquiries = action.payload;
        })
            .addCase(exports.fetchUserInquiries.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        })
            // Fetch owner inquiries
            .addCase(exports.fetchOwnerInquiries.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.fetchOwnerInquiries.fulfilled, (state, action) => {
            state.isLoading = false;
            state.receivedInquiries = action.payload;
            // Update unread count (assuming new inquiries are those with status 'pending')
            state.unreadInquiries = action.payload.filter(inq => inq.status === 'pending').length;
        })
            .addCase(exports.fetchOwnerInquiries.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        })
            // Fetch property inquiries
            .addCase(exports.fetchPropertyInquiries.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.fetchPropertyInquiries.fulfilled, (state, action) => {
            state.isLoading = false;
            const { propertyId, inquiries } = action.payload;
            state.propertyInquiries[propertyId] = inquiries;
        })
            .addCase(exports.fetchPropertyInquiries.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        })
            // Respond to inquiry
            .addCase(exports.respondToInquiry.pending, (state) => {
            state.isSubmitting = true;
            state.error = null;
        })
            .addCase(exports.respondToInquiry.fulfilled, (state, action) => {
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
            .addCase(exports.respondToInquiry.rejected, (state, action) => {
            state.isSubmitting = false;
            state.error = action.payload;
        })
            // Close inquiry
            .addCase(exports.closeInquiry.pending, (state) => {
            state.isSubmitting = true;
            state.error = null;
        })
            .addCase(exports.closeInquiry.fulfilled, (state, action) => {
            state.isSubmitting = false;
            const inquiryId = action.payload;
            // Update status in all inquiry arrays
            const updateInquiryStatus = (inquiries) => {
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
            .addCase(exports.closeInquiry.rejected, (state, action) => {
            state.isSubmitting = false;
            state.error = action.payload;
        })
            // Delete inquiry
            .addCase(exports.deleteInquiry.pending, (state) => {
            state.isSubmitting = true;
            state.error = null;
        })
            .addCase(exports.deleteInquiry.fulfilled, (state, action) => {
            state.isSubmitting = false;
            const inquiryId = action.payload;
            // Remove from sent inquiries
            state.sentInquiries = state.sentInquiries.filter(inq => inq.id !== inquiryId);
            // Clear current inquiry if it was deleted
            if (state.currentInquiry && state.currentInquiry.id === inquiryId) {
                state.currentInquiry = null;
            }
        })
            .addCase(exports.deleteInquiry.rejected, (state, action) => {
            state.isSubmitting = false;
            state.error = action.payload;
        })
            // Fetch inquiry stats
            .addCase(exports.fetchInquiryStats.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.fetchInquiryStats.fulfilled, (state, action) => {
            state.isLoading = false;
            state.inquiryStats = action.payload;
        })
            .addCase(exports.fetchInquiryStats.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        });
    }
});
_a = messageSlice.actions, exports.setCurrentInquiry = _a.setCurrentInquiry, exports.clearError = _a.clearError, exports.markInquiryAsRead = _a.markInquiryAsRead, exports.setLoading = _a.setLoading, exports.clearInquiries = _a.clearInquiries, exports.updateUnreadCount = _a.updateUnreadCount;
exports.default = messageSlice.reducer;

"use strict";
const __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
let _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectNotificationsByCategory = exports.selectUnreadNotifications = exports.selectNotificationById = exports.selectUnreadCount = exports.selectNotificationState = exports.selectNotifications = exports.setRefreshing = exports.setLoading = exports.resetNotifications = exports.removeNotification = exports.updateNotification = exports.addNotification = exports.clearFilters = exports.updateFilters = exports.setRealtimeConnected = exports.recordNotificationClick = exports.deleteNotification = exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.fetchNotifications = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const notificationService_1 = __importDefault(require("../../services/notificationService"));
// Async thunks for notification operations
exports.fetchNotifications = (0, toolkit_1.createAsyncThunk)('notifications/fetchNotifications', async (params, { rejectWithValue }) => {
    try {
        const { userId, options = {}, isRefresh = false } = params;
        const result = await notificationService_1.default.getNotificationHistory(userId, options);
        const unreadCount = await notificationService_1.default.getUnreadNotificationsCount(userId);
        return {
            ...result,
            unreadCount,
            isRefresh,
            offset: options.offset || 0,
        };
    }
    catch (error) {
        return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch notifications');
    }
});
exports.markNotificationAsRead = (0, toolkit_1.createAsyncThunk)('notifications/markAsRead', async (notificationId, { rejectWithValue }) => {
    try {
        await notificationService_1.default.markNotificationAsRead(notificationId);
        return notificationId;
    }
    catch (error) {
        return rejectWithValue(error instanceof Error ? error.message : 'Failed to mark notification as read');
    }
});
exports.markAllNotificationsAsRead = (0, toolkit_1.createAsyncThunk)('notifications/markAllAsRead', async (userId, { rejectWithValue }) => {
    try {
        await notificationService_1.default.markAllNotificationsAsRead(userId);
        return userId;
    }
    catch (error) {
        return rejectWithValue(error instanceof Error ? error.message : 'Failed to mark all notifications as read');
    }
});
exports.deleteNotification = (0, toolkit_1.createAsyncThunk)('notifications/deleteNotification', async (notificationId, { rejectWithValue }) => {
    try {
        await notificationService_1.default.deleteNotification(notificationId);
        return notificationId;
    }
    catch (error) {
        return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete notification');
    }
});
exports.recordNotificationClick = (0, toolkit_1.createAsyncThunk)('notifications/recordClick', async (notificationId, { rejectWithValue }) => {
    try {
        await notificationService_1.default.recordNotificationClick(notificationId);
        return notificationId;
    }
    catch (error) {
        return rejectWithValue(error instanceof Error ? error.message : 'Failed to record notification click');
    }
});
const initialState = {
    notifications: [],
    loading: false,
    error: null,
    hasMore: false,
    refreshing: false,
    unreadCount: 0,
    currentPage: 0,
    totalNotifications: 0,
    lastFetchTime: null,
    realtimeConnected: false,
    filters: {},
};
const notificationSlice = (0, toolkit_1.createSlice)({
    name: 'notifications',
    initialState,
    reducers: {
        // Set realtime connection status
        setRealtimeConnected: (state, action) => {
            state.realtimeConnected = action.payload;
        },
        // Update filters
        updateFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        // Clear filters
        clearFilters: (state) => {
            state.filters = {};
        },
        // Add new notification from real-time updates
        addNotification: (state, action) => {
            state.notifications.unshift(action.payload);
            state.totalNotifications += 1;
            if (!action.payload.isRead) {
                state.unreadCount += 1;
            }
        },
        // Update notification from real-time updates
        updateNotification: (state, action) => {
            const index = state.notifications.findIndex(n => n.id === action.payload.id);
            if (index !== -1) {
                const oldNotification = state.notifications[index];
                state.notifications[index] = action.payload;
                // Update unread count if read status changed
                if (oldNotification.isRead !== action.payload.isRead) {
                    if (action.payload.isRead) {
                        state.unreadCount = Math.max(0, state.unreadCount - 1);
                    }
                    else {
                        state.unreadCount += 1;
                    }
                }
            }
        },
        // Remove notification from real-time updates
        removeNotification: (state, action) => {
            const index = state.notifications.findIndex(n => n.id === action.payload);
            if (index !== -1) {
                const notification = state.notifications[index];
                state.notifications.splice(index, 1);
                state.totalNotifications = Math.max(0, state.totalNotifications - 1);
                if (!notification.isRead) {
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
            }
        },
        // Reset notifications state
        resetNotifications: () => {
            return initialState;
        },
        // Set loading state
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        // Set refreshing state
        setRefreshing: (state, action) => {
            state.refreshing = action.payload;
        },
    },
    extraReducers: (builder) => {
        // Fetch notifications
        builder
            .addCase(exports.fetchNotifications.pending, (state, action) => {
            if (action.meta.arg.isRefresh) {
                state.refreshing = true;
            }
            else if (action.meta.arg.options?.offset === 0) {
                state.loading = true;
            }
            state.error = null;
        })
            .addCase(exports.fetchNotifications.fulfilled, (state, action) => {
            const { notifications, total, unreadCount, isRefresh, offset } = action.payload;
            state.loading = false;
            state.refreshing = false;
            state.error = null;
            state.unreadCount = unreadCount;
            state.totalNotifications = total;
            state.lastFetchTime = Date.now();
            if (isRefresh || offset === 0) {
                // Replace all notifications
                state.notifications = notifications;
                state.currentPage = 0;
            }
            else {
                // Append notifications for pagination
                state.notifications = [...state.notifications, ...notifications];
                state.currentPage = Math.floor((offset || 0) / 20); // Assuming 20 items per page
            }
            // Calculate if there are more items
            state.hasMore = state.notifications.length < total;
        })
            .addCase(exports.fetchNotifications.rejected, (state, action) => {
            state.loading = false;
            state.refreshing = false;
            state.error = action.payload;
        });
        // Mark notification as read
        builder
            .addCase(exports.markNotificationAsRead.fulfilled, (state, action) => {
            const notificationId = action.payload;
            const index = state.notifications.findIndex(n => n.id === notificationId);
            if (index !== -1 && !state.notifications[index].isRead) {
                state.notifications[index].isRead = true;
                state.notifications[index].readAt = new Date();
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        })
            .addCase(exports.markNotificationAsRead.rejected, (state, action) => {
            state.error = action.payload;
        });
        // Mark all notifications as read
        builder
            .addCase(exports.markAllNotificationsAsRead.fulfilled, (state) => {
            state.notifications = state.notifications.map(notification => ({
                ...notification,
                isRead: true,
                readAt: notification.readAt || new Date(),
            }));
            state.unreadCount = 0;
        })
            .addCase(exports.markAllNotificationsAsRead.rejected, (state, action) => {
            state.error = action.payload;
        });
        // Delete notification
        builder
            .addCase(exports.deleteNotification.fulfilled, (state, action) => {
            const notificationId = action.payload;
            const index = state.notifications.findIndex(n => n.id === notificationId);
            if (index !== -1) {
                const notification = state.notifications[index];
                state.notifications.splice(index, 1);
                state.totalNotifications = Math.max(0, state.totalNotifications - 1);
                if (!notification.isRead) {
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
            }
        })
            .addCase(exports.deleteNotification.rejected, (state, action) => {
            state.error = action.payload;
        });
        // Record notification click
        builder
            .addCase(exports.recordNotificationClick.fulfilled, (state, action) => {
            const notificationId = action.payload;
            const index = state.notifications.findIndex(n => n.id === notificationId);
            if (index !== -1) {
                state.notifications[index].clickedAt = new Date();
                if (!state.notifications[index].isRead) {
                    state.notifications[index].isRead = true;
                    state.notifications[index].readAt = new Date();
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
            }
        })
            .addCase(exports.recordNotificationClick.rejected, (state, action) => {
            state.error = action.payload;
        });
    },
});
_a = notificationSlice.actions, exports.setRealtimeConnected = _a.setRealtimeConnected, exports.updateFilters = _a.updateFilters, exports.clearFilters = _a.clearFilters, exports.addNotification = _a.addNotification, exports.updateNotification = _a.updateNotification, exports.removeNotification = _a.removeNotification, exports.resetNotifications = _a.resetNotifications, exports.setLoading = _a.setLoading, exports.setRefreshing = _a.setRefreshing;
exports.default = notificationSlice.reducer;
// Selectors
const selectNotifications = (state) => state.notifications.notifications;
exports.selectNotifications = selectNotifications;
const selectNotificationState = (state) => state.notifications;
exports.selectNotificationState = selectNotificationState;
const selectUnreadCount = (state) => state.notifications.unreadCount;
exports.selectUnreadCount = selectUnreadCount;
const selectNotificationById = (state, id) => state.notifications.notifications.find(n => n.id === id);
exports.selectNotificationById = selectNotificationById;
const selectUnreadNotifications = (state) => state.notifications.notifications.filter(n => !n.isRead);
exports.selectUnreadNotifications = selectUnreadNotifications;
const selectNotificationsByCategory = (state, category) => state.notifications.notifications.filter(n => n.category === category);
exports.selectNotificationsByCategory = selectNotificationsByCategory;

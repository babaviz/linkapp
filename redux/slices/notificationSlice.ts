import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { NotificationHistoryItem, NotificationListOptions, NotificationListState } from '../../types/notifications';
import notificationService from '../../services/notificationService';
import badgeService from '../../services/badgeService';

// Async thunks for notification operations
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (
    params: {
      userId: string;
      options?: NotificationListOptions;
      isRefresh?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const { userId, options = {}, isRefresh = false } = params;
      const result = await notificationService.getNotificationHistory(userId, options);
      const unreadCount = await notificationService.getUnreadNotificationsCount(userId);
      
      return {
        ...result,
        unreadCount,
        isRefresh,
        offset: options.offset || 0,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch notifications'
      );
    }
  }
);

export const markNotificationAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      await notificationService.markNotificationAsRead(notificationId);
      return notificationId;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to mark notification as read'
      );
    }
  }
);

export const markAllNotificationsAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (userId: string, { rejectWithValue }) => {
    try {
      await notificationService.markAllNotificationsAsRead(userId);
      return userId;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to mark all notifications as read'
      );
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      await notificationService.deleteNotification(notificationId);
      return notificationId;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to delete notification'
      );
    }
  }
);

export const recordNotificationClick = createAsyncThunk(
  'notifications/recordClick',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      await notificationService.recordNotificationClick(notificationId);
      return notificationId;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to record notification click'
      );
    }
  }
);

// Enhanced notification state interface
interface ExtendedNotificationListState extends NotificationListState {
  currentPage: number;
  totalNotifications: number;
  lastFetchTime: number | null;
  realtimeConnected: boolean;
  filters: {
    category?: string[];
    isRead?: boolean;
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

const initialState: ExtendedNotificationListState = {
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

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Set realtime connection status
    setRealtimeConnected: (state, action: PayloadAction<boolean>) => {
      state.realtimeConnected = action.payload;
    },
    
    // Update filters
    updateFilters: (state, action: PayloadAction<typeof initialState.filters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    // Clear filters
    clearFilters: (state) => {
      state.filters = {};
    },
    
    // Add new notification from real-time updates
    addNotification: (state, action: PayloadAction<NotificationHistoryItem>) => {
      state.notifications.unshift(action.payload);
      state.totalNotifications += 1;
      if (!action.payload.isRead) {
        state.unreadCount += 1;
      }
    },
    
    // Update notification from real-time updates
    updateNotification: (state, action: PayloadAction<NotificationHistoryItem>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload.id);
      if (index !== -1) {
        const oldNotification = state.notifications[index];
        state.notifications[index] = action.payload;
        
        // Update unread count if read status changed
        if (oldNotification.isRead !== action.payload.isRead) {
          if (action.payload.isRead) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          } else {
            state.unreadCount += 1;
          }
        }
      }
    },
    
    // Remove notification from real-time updates
    removeNotification: (state, action: PayloadAction<string>) => {
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
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    // Set refreshing state
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.refreshing = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch notifications
    builder
      .addCase(fetchNotifications.pending, (state, action) => {
        if (action.meta.arg.isRefresh) {
          state.refreshing = true;
        } else if (action.meta.arg.options?.offset === 0) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
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
        } else {
          // Append notifications for pagination
          state.notifications = [...state.notifications, ...notifications];
          state.currentPage = Math.floor((offset || 0) / 20); // Assuming 20 items per page
        }
        
        // Calculate if there are more items
        state.hasMore = state.notifications.length < total;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = action.payload as string;
      });
    
    // Mark notification as read
    builder
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const notificationId = action.payload;
        const index = state.notifications.findIndex(n => n.id === notificationId);
        if (index !== -1 && !state.notifications[index].isRead) {
          state.notifications[index].isRead = true;
          state.notifications[index].readAt = new Date();
          state.unreadCount = Math.max(0, state.unreadCount - 1);
          
          // Update badge count immediately
          badgeService.setCount(state.unreadCount).catch(err => 
            console.error('Failed to update badge:', err)
          );
        }
      })
      .addCase(markNotificationAsRead.rejected, (state, action) => {
        state.error = action.payload as string;
      });
    
    // Mark all notifications as read
    builder
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map(notification => ({
          ...notification,
          isRead: true,
          readAt: notification.readAt || new Date(),
        }));
        state.unreadCount = 0;
        
        // Reset badge count immediately
        badgeService.reset().catch(err => 
          console.error('Failed to reset badge:', err)
        );
      })
      .addCase(markAllNotificationsAsRead.rejected, (state, action) => {
        state.error = action.payload as string;
      });
    
    // Delete notification
    builder
      .addCase(deleteNotification.fulfilled, (state, action) => {
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
      .addCase(deleteNotification.rejected, (state, action) => {
        state.error = action.payload as string;
      });
    
    // Record notification click
    builder
      .addCase(recordNotificationClick.fulfilled, (state, action) => {
        const notificationId = action.payload;
        const index = state.notifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
          state.notifications[index].clickedAt = new Date();
          if (!state.notifications[index].isRead) {
            state.notifications[index].isRead = true;
            state.notifications[index].readAt = new Date();
            state.unreadCount = Math.max(0, state.unreadCount - 1);
            
            // Update badge count immediately
            badgeService.setCount(state.unreadCount).catch(err => 
              console.error('Failed to update badge:', err)
            );
          }
        }
      })
      .addCase(recordNotificationClick.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  setRealtimeConnected,
  updateFilters,
  clearFilters,
  addNotification,
  updateNotification,
  removeNotification,
  resetNotifications,
  setLoading,
  setRefreshing,
} = notificationSlice.actions;

export default notificationSlice.reducer;

// Selectors
export const selectNotifications = (state: { notifications: ExtendedNotificationListState }) => 
  state.notifications.notifications;

export const selectNotificationState = (state: { notifications: ExtendedNotificationListState }) => 
  state.notifications;

export const selectUnreadCount = (state: { notifications: ExtendedNotificationListState }) => 
  state.notifications.unreadCount;

export const selectNotificationById = (state: { notifications: ExtendedNotificationListState }, id: string) => 
  state.notifications.notifications.find(n => n.id === id);

export const selectUnreadNotifications = (state: { notifications: ExtendedNotificationListState }) => 
  state.notifications.notifications.filter(n => !n.isRead);

export const selectNotificationsByCategory = (state: { notifications: ExtendedNotificationListState }, category: string) => 
  state.notifications.notifications.filter(n => n.category === category);

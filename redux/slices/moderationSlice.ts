/**
 * Moderation Redux Slice
 * Manages community moderation state and actions
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  ContentReport,
  ModerationAction,
  UserModerationStatus,
  CommunityGuideline,
  ModerationDashboardMetrics,
  ModerationFilter,
  ReportReason,
  ActionType
} from '../../types/moderation';
import moderationService from '../../services/moderationService';

interface ModerationState {
  reports: ContentReport[];
  totalReports: number;
  currentReport: ContentReport | null;
  dashboardMetrics: ModerationDashboardMetrics | null;
  communityGuidelines: CommunityGuideline[];
  userModerationStatus: Record<string, UserModerationStatus>;
  activeFilters: ModerationFilter;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: ModerationState = {
  reports: [],
  totalReports: 0,
  currentReport: null,
  dashboardMetrics: null,
  communityGuidelines: [],
  userModerationStatus: {},
  activeFilters: {},
  isLoading: false,
  isSubmitting: false,
  error: null
};

// Async Thunks
export const reportContent = createAsyncThunk(
  'moderation/reportContent',
  async (payload: {
    contentId: string;
    contentType: string;
    reporterId: string;
    reportedUserId: string;
    reason: ReportReason;
    description?: string;
    evidenceUrls?: string[];
  }) => {
    const {
      contentId,
      contentType,
      reporterId,
      reportedUserId,
      reason,
      description,
      evidenceUrls
    } = payload;
    
    return await moderationService.reportContent(
      contentId,
      contentType,
      reporterId,
      reportedUserId,
      reason,
      description,
      evidenceUrls
    );
  }
);

export const fetchReports = createAsyncThunk(
  'moderation/fetchReports',
  async (payload: {
    filter?: ModerationFilter;
    page?: number;
    limit?: number;
  }) => {
    const { filter, page = 1, limit = 20 } = payload;
    return await moderationService.getReports(filter, page, limit);
  }
);

export const takeModerationAction = createAsyncThunk(
  'moderation/takeModerationAction',
  async (payload: {
    reportId: string;
    targetUserId: string;
    moderatorId: string;
    actionType: ActionType;
    reason: string;
    duration?: number;
  }) => {
    const {
      reportId,
      targetUserId,
      moderatorId,
      actionType,
      reason,
      duration
    } = payload;
    
    return await moderationService.takeModerationAction(
      reportId,
      targetUserId,
      moderatorId,
      actionType,
      reason,
      duration
    );
  }
);

export const fetchDashboardMetrics = createAsyncThunk(
  'moderation/fetchDashboardMetrics',
  async () => {
    return await moderationService.getDashboardMetrics();
  }
);

export const fetchUserModerationStatus = createAsyncThunk(
  'moderation/fetchUserModerationStatus',
  async (userId: string) => {
    return await moderationService.getUserModerationStatus(userId);
  }
);

export const fetchCommunityGuidelines = createAsyncThunk(
  'moderation/fetchCommunityGuidelines',
  async () => {
    return await moderationService.getCommunityGuidelines();
  }
);

// Slice
const moderationSlice = createSlice({
  name: 'moderation',
  initialState,
  reducers: {
    setActiveFilters: (state, action: PayloadAction<ModerationFilter>) => {
      state.activeFilters = action.payload;
    },
    clearCurrentReport: (state) => {
      state.currentReport = null;
    },
    updateReportStatus: (state, action: PayloadAction<{
      reportId: string;
      status: string;
    }>) => {
      const { reportId, status } = action.payload;
      const report = state.reports.find(r => r.id === reportId);
      if (report) {
        report.status = status as any;
      }
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Report Content
    builder
      .addCase(reportContent.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(reportContent.fulfilled, (state, action) => {
        state.isSubmitting = false;
        // Add the new report to the list if it's not already there
        const existingIndex = state.reports.findIndex(r => r.id === action.payload.id);
        if (existingIndex === -1) {
          state.reports.unshift(action.payload);
          state.totalReports += 1;
        }
      })
      .addCase(reportContent.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to report content';
      });

    // Fetch Reports
    builder
      .addCase(fetchReports.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.isLoading = false;
        state.reports = action.payload.reports;
        state.totalReports = action.payload.total;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch reports';
      });

    // Take Moderation Action
    builder
      .addCase(takeModerationAction.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(takeModerationAction.fulfilled, (state, action) => {
        state.isSubmitting = false;
        // Update the corresponding report status
        const report = state.reports.find(r => r.id === action.payload.report_id);
        if (report) {
          report.status = 'resolved';
          report.resolved_at = new Date().toISOString();
        }
      })
      .addCase(takeModerationAction.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message || 'Failed to take moderation action';
      });

    // Fetch Dashboard Metrics
    builder
      .addCase(fetchDashboardMetrics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboardMetrics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dashboardMetrics = action.payload;
      })
      .addCase(fetchDashboardMetrics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch dashboard metrics';
      });

    // Fetch User Moderation Status
    builder
      .addCase(fetchUserModerationStatus.fulfilled, (state, action) => {
        state.userModerationStatus[action.payload.user_id] = action.payload;
      });

    // Fetch Community Guidelines
    builder
      .addCase(fetchCommunityGuidelines.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCommunityGuidelines.fulfilled, (state, action) => {
        state.isLoading = false;
        state.communityGuidelines = action.payload;
      })
      .addCase(fetchCommunityGuidelines.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch community guidelines';
      });
  }
});

export const {
  setActiveFilters,
  clearCurrentReport,
  updateReportStatus,
  clearError
} = moderationSlice.actions;

export default moderationSlice.reducer;

"use strict";
/**
 * Moderation Redux Slice
 * Manages community moderation state and actions
 */
const __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
let _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearError = exports.updateReportStatus = exports.clearCurrentReport = exports.setActiveFilters = exports.fetchCommunityGuidelines = exports.fetchUserModerationStatus = exports.fetchDashboardMetrics = exports.takeModerationAction = exports.fetchReports = exports.reportContent = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const moderationService_1 = __importDefault(require("../../services/moderationService"));
const initialState = {
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
exports.reportContent = (0, toolkit_1.createAsyncThunk)('moderation/reportContent', async (payload) => {
    const { contentId, contentType, reporterId, reportedUserId, reason, description, evidenceUrls } = payload;
    return await moderationService_1.default.reportContent(contentId, contentType, reporterId, reportedUserId, reason, description, evidenceUrls);
});
exports.fetchReports = (0, toolkit_1.createAsyncThunk)('moderation/fetchReports', async (payload) => {
    const { filter, page = 1, limit = 20 } = payload;
    return await moderationService_1.default.getReports(filter, page, limit);
});
exports.takeModerationAction = (0, toolkit_1.createAsyncThunk)('moderation/takeModerationAction', async (payload) => {
    const { reportId, targetUserId, moderatorId, actionType, reason, duration } = payload;
    return await moderationService_1.default.takeModerationAction(reportId, targetUserId, moderatorId, actionType, reason, duration);
});
exports.fetchDashboardMetrics = (0, toolkit_1.createAsyncThunk)('moderation/fetchDashboardMetrics', async () => {
    return await moderationService_1.default.getDashboardMetrics();
});
exports.fetchUserModerationStatus = (0, toolkit_1.createAsyncThunk)('moderation/fetchUserModerationStatus', async (userId) => {
    return await moderationService_1.default.getUserModerationStatus(userId);
});
exports.fetchCommunityGuidelines = (0, toolkit_1.createAsyncThunk)('moderation/fetchCommunityGuidelines', async () => {
    return await moderationService_1.default.getCommunityGuidelines();
});
// Slice
const moderationSlice = (0, toolkit_1.createSlice)({
    name: 'moderation',
    initialState,
    reducers: {
        setActiveFilters: (state, action) => {
            state.activeFilters = action.payload;
        },
        clearCurrentReport: (state) => {
            state.currentReport = null;
        },
        updateReportStatus: (state, action) => {
            const { reportId, status } = action.payload;
            const report = state.reports.find(r => r.id === reportId);
            if (report) {
                report.status = status;
            }
        },
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        // Report Content
        builder
            .addCase(exports.reportContent.pending, (state) => {
            state.isSubmitting = true;
            state.error = null;
        })
            .addCase(exports.reportContent.fulfilled, (state, action) => {
            state.isSubmitting = false;
            // Add the new report to the list if it's not already there
            const existingIndex = state.reports.findIndex(r => r.id === action.payload.id);
            if (existingIndex === -1) {
                state.reports.unshift(action.payload);
                state.totalReports += 1;
            }
        })
            .addCase(exports.reportContent.rejected, (state, action) => {
            state.isSubmitting = false;
            state.error = action.error.message || 'Failed to report content';
        });
        // Fetch Reports
        builder
            .addCase(exports.fetchReports.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.fetchReports.fulfilled, (state, action) => {
            state.isLoading = false;
            state.reports = action.payload.reports;
            state.totalReports = action.payload.total;
        })
            .addCase(exports.fetchReports.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || 'Failed to fetch reports';
        });
        // Take Moderation Action
        builder
            .addCase(exports.takeModerationAction.pending, (state) => {
            state.isSubmitting = true;
            state.error = null;
        })
            .addCase(exports.takeModerationAction.fulfilled, (state, action) => {
            state.isSubmitting = false;
            // Update the corresponding report status
            const report = state.reports.find(r => r.id === action.payload.report_id);
            if (report) {
                report.status = 'resolved';
                report.resolved_at = new Date().toISOString();
            }
        })
            .addCase(exports.takeModerationAction.rejected, (state, action) => {
            state.isSubmitting = false;
            state.error = action.error.message || 'Failed to take moderation action';
        });
        // Fetch Dashboard Metrics
        builder
            .addCase(exports.fetchDashboardMetrics.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.fetchDashboardMetrics.fulfilled, (state, action) => {
            state.isLoading = false;
            state.dashboardMetrics = action.payload;
        })
            .addCase(exports.fetchDashboardMetrics.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || 'Failed to fetch dashboard metrics';
        });
        // Fetch User Moderation Status
        builder
            .addCase(exports.fetchUserModerationStatus.fulfilled, (state, action) => {
            state.userModerationStatus[action.payload.user_id] = action.payload;
        });
        // Fetch Community Guidelines
        builder
            .addCase(exports.fetchCommunityGuidelines.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.fetchCommunityGuidelines.fulfilled, (state, action) => {
            state.isLoading = false;
            state.communityGuidelines = action.payload;
        })
            .addCase(exports.fetchCommunityGuidelines.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || 'Failed to fetch community guidelines';
        });
    }
});
_a = moderationSlice.actions, exports.setActiveFilters = _a.setActiveFilters, exports.clearCurrentReport = _a.clearCurrentReport, exports.updateReportStatus = _a.updateReportStatus, exports.clearError = _a.clearError;
exports.default = moderationSlice.reducer;

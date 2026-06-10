"use strict";
let _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLoading = exports.clearError = exports.clearSearchResults = exports.clearSearchFilters = exports.setSearchFilters = exports.setSearchQuery = exports.setCurrentJob = exports.createJob = exports.getJobById = exports.fetchJobs = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const jobService_1 = require("../../services/jobService");
const initialState = {
    // Job listings
    jobs: [],
    searchResults: [],
    currentJob: null,
    userJobs: [],
    // Applications
    applications: [],
    sentApplications: [],
    // Search and filters
    searchQuery: {
        filters: {},
        sort_by: 'date_newest',
        page: 1,
        limit: 20,
    },
    // Statistics
    stats: null,
    // UI state
    isLoading: false,
    isSubmitting: false,
    error: null,
    // Pagination
    pagination: {
        currentPage: 1,
        totalPages: 1,
        totalResults: 0,
        hasMore: false,
    },
};
// Async thunks
exports.fetchJobs = (0, toolkit_1.createAsyncThunk)('jobs/fetchJobs', async (searchQuery, { rejectWithValue }) => {
    try {
        
        const result = await jobService_1.jobService.fetchJobs(searchQuery);
        
        return result;
    }
    catch (error) {
        
        return rejectWithValue(error.message);
    }
});
exports.getJobById = (0, toolkit_1.createAsyncThunk)('jobs/getJobById', async (jobId, { rejectWithValue }) => {
    try {
        const job = await jobService_1.jobService.getJobById(jobId);
        if (!job) {
            throw new Error('Job not found');
        }
        return job;
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.createJob = (0, toolkit_1.createAsyncThunk)('jobs/createJob', async (jobData, { rejectWithValue }) => {
    try {
        // Implementation will connect to Supabase
        return null;
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
const jobSlice = (0, toolkit_1.createSlice)({
    name: 'jobs',
    initialState,
    reducers: {
        setCurrentJob: (state, action) => {
            state.currentJob = action.payload;
        },
        setSearchQuery: (state, action) => {
            state.searchQuery = { ...state.searchQuery, ...action.payload };
        },
        setSearchFilters: (state, action) => {
            state.searchQuery.filters = { ...state.searchQuery.filters, ...action.payload };
        },
        clearSearchFilters: (state) => {
            state.searchQuery.filters = {};
        },
        clearSearchResults: (state) => {
            state.searchResults = [];
        },
        clearError: (state) => {
            state.error = null;
        },
        setLoading: (state, action) => {
            state.isLoading = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch jobs
            .addCase(exports.fetchJobs.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.fetchJobs.fulfilled, (state, action) => {
            
            state.isLoading = false;
            state.searchResults = action.payload.jobs;
            state.pagination = action.payload.pagination;
            
        })
            .addCase(exports.fetchJobs.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        })
            // Get job by ID
            .addCase(exports.getJobById.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.getJobById.fulfilled, (state, action) => {
            state.isLoading = false;
            state.currentJob = action.payload;
        })
            .addCase(exports.getJobById.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        });
    },
});
_a = jobSlice.actions, exports.setCurrentJob = _a.setCurrentJob, exports.setSearchQuery = _a.setSearchQuery, exports.setSearchFilters = _a.setSearchFilters, exports.clearSearchFilters = _a.clearSearchFilters, exports.clearSearchResults = _a.clearSearchResults, exports.clearError = _a.clearError, exports.setLoading = _a.setLoading;
exports.default = jobSlice.reducer;

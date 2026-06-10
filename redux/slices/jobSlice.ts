import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  JobPosting, 
  JobApplication, 
  JobSearchQuery,
  JobStats,
  JobFilter
} from '../../types/job';
import { jobService } from '../../services/jobService';

interface JobState {
  // Job listings
  jobs: JobPosting[];
  searchResults: JobPosting[];
  currentJob: JobPosting | null;
  userJobs: JobPosting[];
  
  // Applications
  applications: JobApplication[];
  sentApplications: JobApplication[];
  
  // Search and filters
  searchQuery: JobSearchQuery;
  
  // Statistics
  stats: JobStats | null;
  
  // UI state
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  
  // Pagination
  pagination: {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    hasMore: boolean;
  };
}

const initialState: JobState = {
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
export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async (searchQuery: JobSearchQuery, { rejectWithValue }) => {
    try {
      
      const result = await jobService.fetchJobs(searchQuery);
      
      return result;
    } catch (error: any) {
      
      return rejectWithValue(error.message);
    }
  }
);

export const getJobById = createAsyncThunk(
  'jobs/getJobById',
  async (jobId: string, { rejectWithValue }) => {
    try {
      const job = await jobService.getJobById(jobId);
      if (!job) {
        throw new Error('Job not found');
      }
      return job;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createJob = createAsyncThunk(
  'jobs/createJob',
  async ({ jobData, employerId }: { jobData: Partial<JobPosting>; employerId: string }, { rejectWithValue }) => {
    try {
      const created = await jobService.createJob(jobData, employerId);
      return created;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchUserJobs = createAsyncThunk(
  'jobs/fetchUserJobs',
  async (employerId: string, { rejectWithValue }) => {
    try {
      const jobs = await jobService.getEmployerJobs(employerId, true);
      return jobs;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateJob = createAsyncThunk(
  'jobs/updateJob',
  async ({ id, updates }: { id: string; updates: Partial<JobPosting> }, { rejectWithValue }) => {
    try {
      const updated = await jobService.updateJob(id, updates);
      return updated;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const jobSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    setCurrentJob: (state, action: PayloadAction<JobPosting | null>) => {
      state.currentJob = action.payload;
    },
    setJobs: (state, action: PayloadAction<JobPosting[]>) => {
      state.jobs = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<JobSearchQuery>) => {
      state.searchQuery = { ...state.searchQuery, ...action.payload };
    },
    setSearchFilters: (state, action: PayloadAction<JobFilter>) => {
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
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    // Real-time sync reducers
    updateJobInJobs: (state, action: PayloadAction<JobPosting>) => {
      const job = action.payload;
      const idx = state.jobs.findIndex(j => j.id === job.id);
      if (idx !== -1) state.jobs[idx] = job;
    },
    updateJobInUserJobs: (state, action: PayloadAction<JobPosting>) => {
      const job = action.payload;
      const idx = state.userJobs.findIndex(j => j.id === job.id);
      if (idx !== -1) state.userJobs[idx] = job;
    },
    updateJobInSearchResults: (state, action: PayloadAction<JobPosting>) => {
      const job = action.payload;
      const idx = state.searchResults.findIndex(j => j.id === job.id);
      if (idx !== -1) state.searchResults[idx] = job;
    },
    updateCurrentJobIfMatch: (state, action: PayloadAction<JobPosting>) => {
      const job = action.payload;
      if (state.currentJob && state.currentJob.id === job.id) {
        state.currentJob = job;
      }
    },
    removeJobFromJobs: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.jobs = state.jobs.filter(j => j.id !== id);
    },
    removeJobFromUserJobs: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.userJobs = state.userJobs.filter(j => j.id !== id);
    },
    removeJobFromSearchResults: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.searchResults = state.searchResults.filter(j => j.id !== id);
    },
    clearCurrentJobIfMatch: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.currentJob && state.currentJob.id === id) {
        state.currentJob = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch jobs
      .addCase(fetchJobs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        
        state.isLoading = false;
        state.jobs = action.payload.jobs;
        state.searchResults = action.payload.jobs;
        state.pagination = action.payload.pagination;
        
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.jobs = [];
        state.searchResults = [];
        state.pagination = {
          currentPage: 1,
          totalPages: 1,
          totalResults: 0,
          hasMore: false,
        };
      })
      
      // Create job
      .addCase(createJob.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(createJob.fulfilled, (state, action) => {
        state.isSubmitting = false;
        if (action.payload) {
          state.jobs.unshift(action.payload);
          state.userJobs.unshift(action.payload);
          state.searchResults.unshift(action.payload);
          state.pagination.totalResults = state.pagination.totalResults + 1;
        }
      })
      .addCase(createJob.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })

      // Fetch user jobs
      .addCase(fetchUserJobs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserJobs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userJobs = action.payload || [];
      })
      .addCase(fetchUserJobs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update job
      .addCase(updateJob.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(updateJob.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const job = action.payload as JobPosting;
        if (job) {
          const uIdx = state.userJobs.findIndex(j => j.id === job.id);
          if (uIdx !== -1) state.userJobs[uIdx] = job;
          const jIdx = state.jobs.findIndex(j => j.id === job.id);
          if (jIdx !== -1) state.jobs[jIdx] = job;
          const sIdx = state.searchResults.findIndex(j => j.id === job.id);
          if (sIdx !== -1) state.searchResults[sIdx] = job;
          if (state.currentJob && state.currentJob.id === job.id) {
            state.currentJob = job;
          }
        }
      })
      .addCase(updateJob.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })
      
      // Get job by ID
      .addCase(getJobById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getJobById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentJob = action.payload;
      })
      .addCase(getJobById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  setCurrentJob,
  setJobs,
  setSearchQuery, 
  setSearchFilters, 
  clearSearchFilters, 
  clearSearchResults, 
  clearError, 
  setLoading,
  updateJobInJobs,
  updateJobInUserJobs,
  updateJobInSearchResults,
  updateCurrentJobIfMatch,
  removeJobFromJobs,
  removeJobFromUserJobs,
  removeJobFromSearchResults,
  clearCurrentJobIfMatch
} = jobSlice.actions;

// Real-time sync helpers
export const syncJobAcrossLists = (job: JobPosting) => (dispatch: any) => {
  dispatch(updateJobInJobs(job));
  dispatch(updateJobInUserJobs(job));
  dispatch(updateJobInSearchResults(job));
  dispatch(updateCurrentJobIfMatch(job));
};

export const removeJobFromAllLists = (jobId: string) => (dispatch: any) => {
  dispatch(removeJobFromJobs(jobId));
  dispatch(removeJobFromUserJobs(jobId));
  dispatch(removeJobFromSearchResults(jobId));
  dispatch(clearCurrentJobIfMatch(jobId));
};

export default jobSlice.reducer;

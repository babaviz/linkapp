import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface ServiceListing {
  id: string;
  ownerId: string;
  serviceName: string;
  category: string;
  description: string;
  location: string;
  pricingInfo: any;
  imageUrls: string[];
  contactDetails: any;
  createdAt: string;
  status: 'active' | 'inactive';
}

interface ServiceState {
  services: ServiceListing[];
  currentService: ServiceListing | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    category?: string;
    location?: string;
    priceRange?: { min: number; max: number };
  };
}

const initialState: ServiceState = {
  services: [],
  currentService: null,
  isLoading: false,
  error: null,
  filters: {},
};

// Async thunks
export const fetchServices = createAsyncThunk(
  'services/fetchServices',
  async (filters: any = {}, { rejectWithValue }) => {
    try {
      // Implementation will connect to Supabase
      return [];
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const serviceSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {
    setCurrentService: (state, action: PayloadAction<ServiceListing | null>) => {
      state.currentService = action.payload;
    },
    setFilters: (state, action: PayloadAction<typeof initialState.filters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchServices.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.isLoading = false;
        state.services = action.payload;
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.services = [];
        state.currentService = null;
      });
  },
});

export const { setCurrentService, setFilters, clearFilters, clearError } = serviceSlice.actions;
export default serviceSlice.reducer;

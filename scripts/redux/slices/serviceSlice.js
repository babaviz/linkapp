"use strict";
let _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearError = exports.clearFilters = exports.setFilters = exports.setCurrentService = exports.fetchServices = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const initialState = {
    services: [],
    currentService: null,
    isLoading: false,
    error: null,
    filters: {},
};
// Async thunks
exports.fetchServices = (0, toolkit_1.createAsyncThunk)('services/fetchServices', async (filters = {}, { rejectWithValue }) => {
    try {
        // Implementation will connect to Supabase
        return [];
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
const serviceSlice = (0, toolkit_1.createSlice)({
    name: 'services',
    initialState,
    reducers: {
        setCurrentService: (state, action) => {
            state.currentService = action.payload;
        },
        setFilters: (state, action) => {
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
            .addCase(exports.fetchServices.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.fetchServices.fulfilled, (state, action) => {
            state.isLoading = false;
            state.services = action.payload;
        })
            .addCase(exports.fetchServices.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        });
    },
});
_a = serviceSlice.actions, exports.setCurrentService = _a.setCurrentService, exports.setFilters = _a.setFilters, exports.clearFilters = _a.clearFilters, exports.clearError = _a.clearError;
exports.default = serviceSlice.reducer;

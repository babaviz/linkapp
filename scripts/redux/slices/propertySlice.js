"use strict";
let _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.removePropertyFromAllLists = exports.syncPropertyAcrossLists = exports.removeFavoriteProperty = exports.addFavoriteProperty = exports.setPagination = exports.setLoading = exports.clearError = exports.clearSearchResults = exports.clearSearchFilters = exports.setSearchFilters = exports.setSearchQuery = exports.setSearchResults = exports.setProperties = exports.setCurrentProperty = exports.toggleFavoriteProperty = exports.fetchPropertiesByLocation = exports.fetchPropertiesNearLocation = exports.updateInquiryStatus = exports.submitPropertyInquiry = exports.fetchUserInquiries = exports.fetchPropertyStats = exports.updatePropertyStatus = exports.deleteProperty = exports.updateProperty = exports.fetchUserProperties = exports.getPropertyById = exports.createProperty = exports.fetchProperties = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const propertyService_1 = require("../../services/propertyService");
const propertyInquiryService_1 = require("../../services/propertyInquiryService");
const initialState = {
    // Property listings
    listings: [],
    currentProperty: null,
    userProperties: [],
    favoriteProperties: [],
    // Search and filters
    searchQuery: {
        filters: {},
        sort_by: 'date_newest',
        page: 1,
        limit: 20,
    },
    searchResults: [],
    // Inquiries
    inquiries: [],
    sentInquiries: [],
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
// Async thunks - Integrated with Supabase
exports.fetchProperties = (0, toolkit_1.createAsyncThunk)('property/fetchProperties', async (searchQuery, { rejectWithValue }) => {
    try {
        
        const result = await propertyService_1.propertyService.fetchProperties(searchQuery);
        
        return result;
    }
    catch (error) {
        
        return rejectWithValue(error.message);
    }
});
exports.createProperty = (0, toolkit_1.createAsyncThunk)('property/createProperty', async ({ propertyData, ownerId }, { rejectWithValue }) => {
    try {
        return await propertyService_1.propertyService.createProperty(propertyData, ownerId);
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.getPropertyById = (0, toolkit_1.createAsyncThunk)('property/getPropertyById', async (propertyId, { rejectWithValue }) => {
    try {
        const property = await propertyService_1.propertyService.getPropertyById(propertyId);
        if (!property) {
            throw new Error('Property not found');
        }
        return property;
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.fetchUserProperties = (0, toolkit_1.createAsyncThunk)('property/fetchUserProperties', async (userId, { rejectWithValue }) => {
    try {
        return await propertyService_1.propertyService.getUserProperties(userId);
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.updateProperty = (0, toolkit_1.createAsyncThunk)('property/updateProperty', async ({ id, updates }, { rejectWithValue }) => {
    try {
        return await propertyService_1.propertyService.updateProperty(id, updates);
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.deleteProperty = (0, toolkit_1.createAsyncThunk)('property/deleteProperty', async (propertyId, { rejectWithValue }) => {
    try {
        await propertyService_1.propertyService.deleteProperty(propertyId);
        return propertyId;
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.updatePropertyStatus = (0, toolkit_1.createAsyncThunk)('property/updatePropertyStatus', async ({ propertyId, status }, { rejectWithValue }) => {
    try {
        return await propertyService_1.propertyService.updatePropertyStatus(propertyId, status);
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.fetchPropertyStats = (0, toolkit_1.createAsyncThunk)('property/fetchPropertyStats', async (_, { rejectWithValue }) => {
    try {
        return await propertyService_1.propertyService.getPropertyStats();
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
// Property Inquiry thunks
exports.fetchUserInquiries = (0, toolkit_1.createAsyncThunk)('property/fetchUserInquiries', async (userId, { rejectWithValue }) => {
    try {
        return await propertyInquiryService_1.propertyInquiryService.getOwnerInquiries(userId);
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.submitPropertyInquiry = (0, toolkit_1.createAsyncThunk)('property/submitPropertyInquiry', async (inquiryData, { rejectWithValue }) => {
    try {
        return await propertyInquiryService_1.propertyInquiryService.submitInquiry(inquiryData);
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.updateInquiryStatus = (0, toolkit_1.createAsyncThunk)('property/updateInquiryStatus', async ({ inquiryId, status, response }, { rejectWithValue }) => {
    try {
        return await propertyInquiryService_1.propertyInquiryService.updateInquiryStatus(inquiryId, status, response);
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.fetchPropertiesNearLocation = (0, toolkit_1.createAsyncThunk)('property/fetchPropertiesNearLocation', async ({ coordinates, radius = 10, limit = 20, propertyType }, { rejectWithValue }) => {
    try {
        return await propertyService_1.propertyService.getPropertiesNearLocation(coordinates, radius, limit, propertyType);
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.fetchPropertiesByLocation = (0, toolkit_1.createAsyncThunk)('property/fetchPropertiesByLocation', async ({ county, town, propertyType, limit = 20 }, { rejectWithValue }) => {
    try {
        return await propertyService_1.propertyService.getPropertiesByLocation(county, town, propertyType, limit);
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
exports.toggleFavoriteProperty = (0, toolkit_1.createAsyncThunk)('property/toggleFavoriteProperty', async (propertyId, { getState, rejectWithValue }) => {
    try {
        const state = getState();
        const property = state.property.listings.find((p) => p.id === propertyId) ||
            state.property.searchResults.find((p) => p.id === propertyId);
        if (!property) {
            throw new Error('Property not found');
        }
        const isFavorite = state.property.favoriteProperties.some((p) => p.id === propertyId);
        // In a real app, this would make an API call to save/remove favorite
        // For demo purposes, we'll just return the property and action type
        return { property, action: isFavorite ? 'remove' : 'add' };
    }
    catch (error) {
        return rejectWithValue(error.message);
    }
});
const propertySlice = (0, toolkit_1.createSlice)({
    name: 'property',
    initialState,
    reducers: {
        setCurrentProperty: (state, action) => {
            state.currentProperty = action.payload;
        },
        setProperties: (state, action) => {
            state.listings = action.payload;
        },
        setSearchResults: (state, action) => {
            state.searchResults = action.payload;
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
        // Real-time sync reducers
        updatePropertyInListing: (state, action) => {
            const property = action.payload;
            const index = state.listings.findIndex(p => p.id === property.id);
            if (index !== -1) {
                state.listings[index] = property;
            }
        },
        updatePropertyInUserProperties: (state, action) => {
            const property = action.payload;
            const index = state.userProperties.findIndex(p => p.id === property.id);
            if (index !== -1) {
                state.userProperties[index] = property;
            }
        },
        updatePropertyInSearchResults: (state, action) => {
            const property = action.payload;
            const index = state.searchResults.findIndex(p => p.id === property.id);
            if (index !== -1) {
                state.searchResults[index] = property;
            }
        },
        updateCurrentPropertyIfMatch: (state, action) => {
            const property = action.payload;
            if (state.currentProperty && state.currentProperty.id === property.id) {
                state.currentProperty = property;
            }
        },
        removePropertyFromListing: (state, action) => {
            const propertyId = action.payload;
            state.listings = state.listings.filter(p => p.id !== propertyId);
        },
        removePropertyFromUserProperties: (state, action) => {
            const propertyId = action.payload;
            state.userProperties = state.userProperties.filter(p => p.id !== propertyId);
        },
        removePropertyFromSearchResults: (state, action) => {
            const propertyId = action.payload;
            state.searchResults = state.searchResults.filter(p => p.id !== propertyId);
        },
        clearCurrentPropertyIfMatch: (state, action) => {
            const propertyId = action.payload;
            if (state.currentProperty && state.currentProperty.id === propertyId) {
                state.currentProperty = null;
            }
        },
        refreshPropertyData: (state) => {
            // Clear stale data to force refresh
            state.error = null;
            state.isLoading = false;
        },
        setLoading: (state, action) => {
            state.isLoading = action.payload;
        },
        setPagination: (state, action) => {
            state.pagination = { ...state.pagination, ...action.payload };
        },
        addFavoriteProperty: (state, action) => {
            if (!state.favoriteProperties) {
                state.favoriteProperties = [];
            }
            const exists = state.favoriteProperties.find(p => p.id === action.payload.id);
            if (!exists) {
                state.favoriteProperties.push(action.payload);
            }
        },
        removeFavoriteProperty: (state, action) => {
            if (state.favoriteProperties) {
                state.favoriteProperties = state.favoriteProperties.filter(p => p.id !== action.payload);
            }
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch properties
            .addCase(exports.fetchProperties.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.fetchProperties.fulfilled, (state, action) => {
            
            state.isLoading = false;
            // Update both listings and searchResults to ensure data is available
            state.listings = action.payload.properties;
            state.searchResults = action.payload.properties;
            state.pagination = action.payload.pagination;
            
        })
            .addCase(exports.fetchProperties.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        })
            // Create property
            .addCase(exports.createProperty.pending, (state) => {
            state.isSubmitting = true;
            state.error = null;
        })
            .addCase(exports.createProperty.fulfilled, (state, action) => {
            state.isSubmitting = false;
            if (action.payload) {
                // Add to all relevant lists - most recent first
                state.listings.unshift(action.payload);
                state.userProperties.unshift(action.payload);
                state.searchResults.unshift(action.payload);
                // Update pagination to reflect new item
                state.pagination.totalResults = state.pagination.totalResults + 1;
                // Clear any existing error
                state.error = null;
                
            }
        })
            .addCase(exports.createProperty.rejected, (state, action) => {
            state.isSubmitting = false;
            state.error = action.payload;
            
        })
            // Fetch user properties
            .addCase(exports.fetchUserProperties.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.fetchUserProperties.fulfilled, (state, action) => {
            state.isLoading = false;
            state.userProperties = action.payload;
        })
            .addCase(exports.fetchUserProperties.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        })
            // Update property
            .addCase(exports.updateProperty.pending, (state) => {
            state.isSubmitting = true;
            state.error = null;
        })
            .addCase(exports.updateProperty.fulfilled, (state, action) => {
            state.isSubmitting = false;
            if (action.payload) {
                // Update in all relevant lists using sync helper logic
                const property = action.payload;
                // Update in userProperties
                const userIndex = state.userProperties.findIndex(p => p.id === property.id);
                if (userIndex !== -1) {
                    state.userProperties[userIndex] = property;
                }
                // Update in listings
                const listingIndex = state.listings.findIndex(p => p.id === property.id);
                if (listingIndex !== -1) {
                    state.listings[listingIndex] = property;
                }
                // Update in search results
                const searchIndex = state.searchResults.findIndex(p => p.id === property.id);
                if (searchIndex !== -1) {
                    state.searchResults[searchIndex] = property;
                }
                // Update current property if it matches
                if (state.currentProperty && state.currentProperty.id === property.id) {
                    state.currentProperty = property;
                }
            }
        })
            .addCase(exports.updateProperty.rejected, (state, action) => {
            state.isSubmitting = false;
            state.error = action.payload;
        })
            // Delete property
            .addCase(exports.deleteProperty.pending, (state) => {
            state.isSubmitting = true;
            state.error = null;
        })
            .addCase(exports.deleteProperty.fulfilled, (state, action) => {
            state.isSubmitting = false;
            const propertyId = action.payload;
            // Remove from all lists
            state.userProperties = state.userProperties.filter(p => p.id !== propertyId);
            state.listings = state.listings.filter(p => p.id !== propertyId);
            state.searchResults = state.searchResults.filter(p => p.id !== propertyId);
            state.favoriteProperties = state.favoriteProperties.filter(p => p.id !== propertyId);
            // Clear current property if it matches
            if (state.currentProperty && state.currentProperty.id === propertyId) {
                state.currentProperty = null;
            }
            // Update pagination to reflect removal
            state.pagination.totalResults = Math.max(0, state.pagination.totalResults - 1);
        })
            .addCase(exports.deleteProperty.rejected, (state, action) => {
            state.isSubmitting = false;
            state.error = action.payload;
        })
            // Get property by ID
            .addCase(exports.getPropertyById.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.getPropertyById.fulfilled, (state, action) => {
            state.isLoading = false;
            state.currentProperty = action.payload;
        })
            .addCase(exports.getPropertyById.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        })
            // Update property status
            .addCase(exports.updatePropertyStatus.pending, (state) => {
            state.isSubmitting = true;
            state.error = null;
        })
            .addCase(exports.updatePropertyStatus.fulfilled, (state, action) => {
            state.isSubmitting = false;
            if (action.payload) {
                // Update in userProperties
                const index = state.userProperties.findIndex(p => p.id === action.payload.id);
                if (index !== -1) {
                    state.userProperties[index] = action.payload;
                }
                // Update in listings
                const listingIndex = state.listings.findIndex(p => p.id === action.payload.id);
                if (listingIndex !== -1) {
                    state.listings[listingIndex] = action.payload;
                }
                // Update currentProperty if it's the same
                if (state.currentProperty && state.currentProperty.id === action.payload.id) {
                    state.currentProperty = action.payload;
                }
            }
        })
            .addCase(exports.updatePropertyStatus.rejected, (state, action) => {
            state.isSubmitting = false;
            state.error = action.payload;
        })
            // Fetch property stats
            .addCase(exports.fetchPropertyStats.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.fetchPropertyStats.fulfilled, (state, action) => {
            state.isLoading = false;
            state.stats = action.payload;
        })
            .addCase(exports.fetchPropertyStats.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        })
            // Note: submitInquiry cases moved to messageSlice.ts
            // Fetch properties near location
            .addCase(exports.fetchPropertiesNearLocation.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.fetchPropertiesNearLocation.fulfilled, (state, action) => {
            state.isLoading = false;
            state.searchResults = action.payload;
        })
            .addCase(exports.fetchPropertiesNearLocation.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        })
            // Fetch properties by location
            .addCase(exports.fetchPropertiesByLocation.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.fetchPropertiesByLocation.fulfilled, (state, action) => {
            state.isLoading = false;
            state.searchResults = action.payload;
        })
            .addCase(exports.fetchPropertiesByLocation.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        })
            // Toggle favorite property
            .addCase(exports.toggleFavoriteProperty.fulfilled, (state, action) => {
            const { property, action: favoriteAction } = action.payload;
            if (favoriteAction === 'add') {
                if (!state.favoriteProperties.find(p => p.id === property.id)) {
                    state.favoriteProperties.push(property);
                }
            }
            else {
                state.favoriteProperties = state.favoriteProperties.filter(p => p.id !== property.id);
            }
        });
    },
});
_a = propertySlice.actions, exports.setCurrentProperty = _a.setCurrentProperty, exports.setProperties = _a.setProperties, exports.setSearchResults = _a.setSearchResults, exports.setSearchQuery = _a.setSearchQuery, exports.setSearchFilters = _a.setSearchFilters, exports.clearSearchFilters = _a.clearSearchFilters, exports.clearSearchResults = _a.clearSearchResults, exports.clearError = _a.clearError, exports.setLoading = _a.setLoading, exports.setPagination = _a.setPagination, exports.addFavoriteProperty = _a.addFavoriteProperty, exports.removeFavoriteProperty = _a.removeFavoriteProperty;
// Real-time sync helper functions
const syncPropertyAcrossLists = (property) => (dispatch) => {
    // Update in all relevant lists
    dispatch(updatePropertyInListing(property));
    dispatch(updatePropertyInUserProperties(property));
    dispatch(updatePropertyInSearchResults(property));
    // Update current property if it matches
    dispatch(updateCurrentPropertyIfMatch(property));
};
exports.syncPropertyAcrossLists = syncPropertyAcrossLists;
const removePropertyFromAllLists = (propertyId) => (dispatch) => {
    dispatch(removePropertyFromListing(propertyId));
    dispatch(removePropertyFromUserProperties(propertyId));
    dispatch(removePropertyFromSearchResults(propertyId));
    dispatch(clearCurrentPropertyIfMatch(propertyId));
};
exports.removePropertyFromAllLists = removePropertyFromAllLists;
exports.default = propertySlice.reducer;

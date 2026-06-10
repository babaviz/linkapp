import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  Property, 
  PropertyFormData, 
  PropertyFilter, 
  PropertySearchQuery,
  PropertyInquiry,
  PropertyStats
} from '../../types/property';
import { propertyService } from '../../services/propertyService';
import { propertyInquiryService } from '../../services/propertyInquiryService';
import { PropertyStorageService } from '../../utils/propertyStorage';

interface PropertyState {
  // Property listings
  listings: Property[];
  currentProperty: Property | null;
  userProperties: Property[];
  favoriteProperties: Property[];
  
  // Search and filters
  searchQuery: PropertySearchQuery;
  searchResults: Property[];
  
  // Inquiries
  inquiries: PropertyInquiry[];
  sentInquiries: PropertyInquiry[];
  
  // Statistics
  stats: PropertyStats | null;
  
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

const initialState: PropertyState = {
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
export const fetchProperties = createAsyncThunk(
  'property/fetchProperties',
  async (searchQuery: PropertySearchQuery, { rejectWithValue }) => {
    try {
      
      const result = await propertyService.fetchProperties(searchQuery);
      
      return result;
    } catch (error: any) {
      
      return rejectWithValue(error.message);
    }
  }
);

export const createProperty = createAsyncThunk(
  'property/createProperty',
  async ({ propertyData, ownerId }: { propertyData: PropertyFormData; ownerId: string }, { rejectWithValue }) => {
    try {
      return await propertyService.createProperty(propertyData, ownerId);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const getPropertyById = createAsyncThunk(
  'property/getPropertyById',
  async (propertyId: string, { rejectWithValue }) => {
    try {
      const property = await propertyService.getPropertyById(propertyId);
      if (!property) {
        throw new Error('Property not found');
      }
      return property;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchUserProperties = createAsyncThunk(
  'property/fetchUserProperties',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await propertyService.getUserProperties(userId);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateProperty = createAsyncThunk(
  'property/updateProperty',
  async ({ id, updates }: { id: string; updates: Partial<PropertyFormData> }, { rejectWithValue }) => {
    try {
      return await propertyService.updateProperty(id, updates);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteProperty = createAsyncThunk(
  'property/deleteProperty',
  async (propertyId: string, { rejectWithValue }) => {
    try {
      await propertyService.deleteProperty(propertyId);
      return propertyId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updatePropertyStatus = createAsyncThunk(
  'property/updatePropertyStatus',
  async ({ propertyId, status }: { propertyId: string; status: any }, { rejectWithValue }) => {
    try {
      return await propertyService.updatePropertyStatus(propertyId, status);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchPropertyStats = createAsyncThunk(
  'property/fetchPropertyStats',
  async (_, { rejectWithValue }) => {
    try {
      return await propertyService.getPropertyStats();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Property Inquiry thunks
export const fetchUserInquiries = createAsyncThunk(
  'property/fetchUserInquiries',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await propertyInquiryService.getOwnerInquiries(userId);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const submitPropertyInquiry = createAsyncThunk(
  'property/submitPropertyInquiry',
  async (inquiryData: {
    property_id: string;
    inquirer_id: string;
    owner_id: string;
    message: string;
    contact_phone?: string;
    contact_email?: string;
  }, { rejectWithValue }) => {
    try {
      return await propertyInquiryService.submitInquiry(inquiryData);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateInquiryStatus = createAsyncThunk(
  'property/updateInquiryStatus',
  async ({ inquiryId, status, response }: {
    inquiryId: string;
    status: 'pending' | 'responded' | 'closed';
    response?: string;
  }, { rejectWithValue }) => {
    try {
      return await propertyInquiryService.updateInquiryStatus(inquiryId, status, response);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchPropertiesNearLocation = createAsyncThunk(
  'property/fetchPropertiesNearLocation',
  async ({ 
    coordinates, 
    radius = 10, 
    limit = 20, 
    propertyType 
  }: {
    coordinates: { latitude: number; longitude: number };
    radius?: number;
    limit?: number;
    propertyType?: any;
  }, { rejectWithValue }) => {
    try {
      return await propertyService.getPropertiesNearLocation(
        coordinates,
        radius,
        limit,
        propertyType
      );
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchPropertiesByLocation = createAsyncThunk(
  'property/fetchPropertiesByLocation',
  async ({ 
    county, 
    town, 
    propertyType, 
    limit = 20 
  }: {
    county?: string;
    town?: string;
    propertyType?: any;
    limit?: number;
  }, { rejectWithValue }) => {
    try {
      return await propertyService.getPropertiesByLocation(
        county,
        town,
        propertyType,
        limit
      );
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Load favorite properties from storage
export const loadFavoriteProperties = createAsyncThunk(
  'property/loadFavoriteProperties',
  async (_, { rejectWithValue }) => {
    try {
      return await PropertyStorageService.loadFavoriteProperties();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const toggleFavoriteProperty = createAsyncThunk(
  'property/toggleFavoriteProperty',
  async (propertyId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const property = state.property.listings.find((p: Property) => p.id === propertyId) ||
                      state.property.searchResults.find((p: Property) => p.id === propertyId) ||
                      state.property.userProperties.find((p: Property) => p.id === propertyId) ||
                      state.property.favoriteProperties.find((p: Property) => p.id === propertyId);
      
      if (!property) {
        throw new Error('Property not found');
      }
      
      const isFavorite = state.property.favoriteProperties?.some((p: Property) => p.id === propertyId);
      
      let updatedFavorites: Property[];
      if (isFavorite) {
        // Remove from favorites
        updatedFavorites = await PropertyStorageService.removeFavoriteProperty(propertyId);
      } else {
        // Add to favorites
        updatedFavorites = await PropertyStorageService.addFavoriteProperty(property);
      }
      
      return { favorites: updatedFavorites, property, action: isFavorite ? 'remove' : 'add' };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const propertySlice = createSlice({
  name: 'property',
  initialState,
  reducers: {
    setCurrentProperty: (state, action: PayloadAction<Property | null>) => {
      state.currentProperty = action.payload;
    },
    setProperties: (state, action: PayloadAction<Property[]>) => {
      state.listings = action.payload;
    },
    setSearchResults: (state, action: PayloadAction<Property[]>) => {
      state.searchResults = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<PropertySearchQuery>) => {
      state.searchQuery = { ...state.searchQuery, ...action.payload };
    },
    setSearchFilters: (state, action: PayloadAction<PropertyFilter>) => {
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
    updatePropertyInListing: (state, action: PayloadAction<Property>) => {
      const property = action.payload;
      const index = state.listings.findIndex(p => p.id === property.id);
      if (index !== -1) {
        state.listings[index] = property;
      }
    },
    updatePropertyInUserProperties: (state, action: PayloadAction<Property>) => {
      const property = action.payload;
      const index = state.userProperties.findIndex(p => p.id === property.id);
      if (index !== -1) {
        state.userProperties[index] = property;
      }
    },
    updatePropertyInSearchResults: (state, action: PayloadAction<Property>) => {
      const property = action.payload;
      const index = state.searchResults.findIndex(p => p.id === property.id);
      if (index !== -1) {
        state.searchResults[index] = property;
      }
    },
    updateCurrentPropertyIfMatch: (state, action: PayloadAction<Property>) => {
      const property = action.payload;
      if (state.currentProperty && state.currentProperty.id === property.id) {
        state.currentProperty = property;
      }
    },
    removePropertyFromListing: (state, action: PayloadAction<string>) => {
      const propertyId = action.payload;
      state.listings = state.listings.filter(p => p.id !== propertyId);
    },
    removePropertyFromUserProperties: (state, action: PayloadAction<string>) => {
      const propertyId = action.payload;
      state.userProperties = state.userProperties.filter(p => p.id !== propertyId);
    },
    removePropertyFromSearchResults: (state, action: PayloadAction<string>) => {
      const propertyId = action.payload;
      state.searchResults = state.searchResults.filter(p => p.id !== propertyId);
    },
    clearCurrentPropertyIfMatch: (state, action: PayloadAction<string>) => {
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
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setPagination: (state, action: PayloadAction<typeof initialState.pagination>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    addFavoriteProperty: (state, action: PayloadAction<Property>) => {
      if (!state.favoriteProperties) {
        state.favoriteProperties = [];
      }
      const exists = state.favoriteProperties.find(p => p.id === action.payload.id);
      if (!exists) {
        state.favoriteProperties.push(action.payload);
      }
    },
    removeFavoriteProperty: (state, action: PayloadAction<string>) => {
      if (state.favoriteProperties) {
        state.favoriteProperties = state.favoriteProperties.filter(p => p.id !== action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch properties
      .addCase(fetchProperties.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProperties.fulfilled, (state, action) => {
        
        state.isLoading = false;
        
        // Update both listings and searchResults to ensure data is available
        state.listings = action.payload.properties;
        state.searchResults = action.payload.properties;
        state.pagination = action.payload.pagination;

      })
      .addCase(fetchProperties.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create property
      .addCase(createProperty.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(createProperty.fulfilled, (state, action) => {
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
      .addCase(createProperty.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
        
      })
      
      // Fetch user properties
      .addCase(fetchUserProperties.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserProperties.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userProperties = action.payload;
      })
      .addCase(fetchUserProperties.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update property
      .addCase(updateProperty.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(updateProperty.fulfilled, (state, action) => {
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
      .addCase(updateProperty.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })
      
      // Delete property
      .addCase(deleteProperty.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(deleteProperty.fulfilled, (state, action) => {
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
      .addCase(deleteProperty.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })
      
      // Get property by ID
      .addCase(getPropertyById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getPropertyById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentProperty = action.payload;
      })
      .addCase(getPropertyById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update property status
      .addCase(updatePropertyStatus.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(updatePropertyStatus.fulfilled, (state, action) => {
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
      .addCase(updatePropertyStatus.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })
      
      // Fetch property stats
      .addCase(fetchPropertyStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPropertyStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchPropertyStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Note: submitInquiry cases moved to messageSlice.ts
      
      // Fetch properties near location
      .addCase(fetchPropertiesNearLocation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPropertiesNearLocation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.searchResults = action.payload;
      })
      .addCase(fetchPropertiesNearLocation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch properties by location
      .addCase(fetchPropertiesByLocation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPropertiesByLocation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.searchResults = action.payload;
      })
      .addCase(fetchPropertiesByLocation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Load favorite properties from storage
      .addCase(loadFavoriteProperties.pending, (state) => {
        // Optional: set loading state for favorites
      })
      .addCase(loadFavoriteProperties.fulfilled, (state, action) => {
        state.favoriteProperties = action.payload;
      })
      .addCase(loadFavoriteProperties.rejected, (state, action) => {
        
        state.favoriteProperties = [];
      })
      
      // Toggle favorite property
      .addCase(toggleFavoriteProperty.fulfilled, (state, action) => {
        const { favorites } = action.payload;
        state.favoriteProperties = favorites;
      })
  },
});

export const { 
  setCurrentProperty,
  setProperties,
  setSearchResults,
  setSearchQuery, 
  setSearchFilters, 
  clearSearchFilters, 
  clearSearchResults, 
  clearError, 
  setLoading, 
  setPagination,
  addFavoriteProperty,
  removeFavoriteProperty,
  updatePropertyInListing,
  updatePropertyInUserProperties,
  updatePropertyInSearchResults,
  updateCurrentPropertyIfMatch,
  removePropertyFromListing,
  removePropertyFromUserProperties,
  removePropertyFromSearchResults,
  clearCurrentPropertyIfMatch
} = propertySlice.actions;

// Real-time sync helper functions
export const syncPropertyAcrossLists = (property: Property) => (dispatch: any) => {
  // Update in all relevant lists
  dispatch(updatePropertyInListing(property));
  dispatch(updatePropertyInUserProperties(property));
  dispatch(updatePropertyInSearchResults(property));
  
  // Update current property if it matches
  dispatch(updateCurrentPropertyIfMatch(property));
};

export const removePropertyFromAllLists = (propertyId: string) => (dispatch: any) => {
  dispatch(removePropertyFromListing(propertyId));
  dispatch(removePropertyFromUserProperties(propertyId));
  dispatch(removePropertyFromSearchResults(propertyId));
  dispatch(clearCurrentPropertyIfMatch(propertyId));
};

export default propertySlice.reducer;

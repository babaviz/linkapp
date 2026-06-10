/**
 * Search Redux Slice
 * Manages universal search state across all modules
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  UniversalSearchQuery,
  SearchResponse,
  SearchPreferences,
  ModuleType,
  SearchSuggestion
} from '../../types/search';
import { universalSearchService } from '../../services/universalSearchService';

interface SearchState {
  // Current search
  currentQuery: UniversalSearchQuery | null;
  searchResults: SearchResponse | null;
  
  // Search suggestions
  suggestions: SearchSuggestion[];
  recentSearches: string[];
  
  // UI state
  isSearching: boolean;
  isLoadingMore: boolean;
  isLoadingSuggestions: boolean;
  error: string | null;
  
  // Search preferences
  preferences: SearchPreferences | null;
  
  // Active module
  activeModule: ModuleType;
  
  // Search history
  searchHistory: {
    query: string;
    module: ModuleType;
    timestamp: string;
  }[];
}

const initialState: SearchState = {
  currentQuery: null,
  searchResults: null,
  suggestions: [],
  recentSearches: [],
  isSearching: false,
  isLoadingMore: false,
  isLoadingSuggestions: false,
  error: null,
  preferences: null,
  activeModule: 'property',
  searchHistory: []
};

// Async thunks
export const performUniversalSearch = createAsyncThunk(
  'search/performUniversalSearch',
  async (query: UniversalSearchQuery, { rejectWithValue }) => {
    try {
      const response = await universalSearchService.search(query);
      return { query, response };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Search failed');
    }
  }
);

export const loadMoreSearchResults = createAsyncThunk(
  'search/loadMoreSearchResults',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { search: SearchState };
      const currentQuery = state.search.currentQuery;
      const currentResults = state.search.searchResults;
      
      if (!currentQuery || !currentResults?.pagination.hasMore) {
        return { results: [] };
      }
      
      const nextPageQuery = {
        ...currentQuery,
        page: (currentQuery.page || 1) + 1
      };
      
      const response = await universalSearchService.search(nextPageQuery);
      return { results: response.results };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load more results');
    }
  }
);

export const fetchSearchSuggestions = createAsyncThunk(
  'search/fetchSearchSuggestions',
  async ({ partialQuery, module }: { partialQuery: string; module: ModuleType }, { rejectWithValue }) => {
    try {
      const suggestions = await universalSearchService.getSearchSuggestions(partialQuery, module);
      return suggestions;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch suggestions');
    }
  }
);

export const fetchLocationSuggestions = createAsyncThunk(
  'search/fetchLocationSuggestions',
  async (partialQuery: string, { rejectWithValue }) => {
    try {
      const suggestions = universalSearchService.getLocationSuggestions(partialQuery);
      return suggestions;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch location suggestions');
    }
  }
);

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    // Set active module
    setActiveModule: (state, action: PayloadAction<ModuleType>) => {
      state.activeModule = action.payload;
    },
    
    // Clear search results
    clearSearchResults: (state) => {
      state.currentQuery = null;
      state.searchResults = null;
      state.error = null;
    },
    
    // Clear suggestions
    clearSuggestions: (state) => {
      state.suggestions = [];
    },
    
    // Add to recent searches
    addRecentSearch: (state, action: PayloadAction<string>) => {
      const searchText = action.payload;
      state.recentSearches = [
        searchText,
        ...state.recentSearches.filter(s => s !== searchText)
      ].slice(0, 10);
      
      // Add to search history
      state.searchHistory = [
        {
          query: searchText,
          module: state.activeModule,
          timestamp: new Date().toISOString()
        },
        ...state.searchHistory
      ].slice(0, 50);
    },
    
    // Clear recent searches
    clearRecentSearches: (state) => {
      state.recentSearches = [];
    },
    
    // Clear search history
    clearSearchHistory: (state) => {
      state.searchHistory = [];
    },
    
    // Save search preferences
    saveSearchPreferences: (state, action: PayloadAction<SearchPreferences>) => {
      state.preferences = action.payload;
      universalSearchService.saveSearchPreferences(action.payload);
    },
    
    // Update search filters
    updateSearchFilters: (state, action: PayloadAction<any>) => {
      if (state.currentQuery) {
        state.currentQuery.filters = {
          ...state.currentQuery.filters,
          ...action.payload
        };
      }
    },
    
    // Set error
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }
  },
  extraReducers: (builder) => {
    // Perform universal search
    builder
      .addCase(performUniversalSearch.pending, (state) => {
        state.isSearching = true;
        state.error = null;
      })
      .addCase(performUniversalSearch.fulfilled, (state, action) => {
        state.isSearching = false;
        state.currentQuery = action.payload.query;
        state.searchResults = action.payload.response;
        
        // Add to recent searches if there's search text
        if (action.payload.query.searchText) {
          const searchText = action.payload.query.searchText;
          state.recentSearches = [
            searchText,
            ...state.recentSearches.filter(s => s !== searchText)
          ].slice(0, 10);
        }
      })
      .addCase(performUniversalSearch.rejected, (state, action) => {
        state.isSearching = false;
        state.error = action.payload as string;
      })
      
      // Load more search results
      .addCase(loadMoreSearchResults.pending, (state) => {
        state.isLoadingMore = true;
      })
      .addCase(loadMoreSearchResults.fulfilled, (state, action) => {
        state.isLoadingMore = false;
        if (state.searchResults && action.payload.results.length > 0) {
          state.searchResults.results = [
            ...state.searchResults.results,
            ...action.payload.results
          ];
          
          // Update pagination
          state.searchResults.pagination.currentPage += 1;
          state.searchResults.pagination.hasMore = 
            state.searchResults.results.length < state.searchResults.totalResults;
        }
      })
      .addCase(loadMoreSearchResults.rejected, (state, action) => {
        state.isLoadingMore = false;
        state.error = action.payload as string;
      })
      
      // Fetch search suggestions
      .addCase(fetchSearchSuggestions.pending, (state) => {
        state.isLoadingSuggestions = true;
      })
      .addCase(fetchSearchSuggestions.fulfilled, (state, action) => {
        state.isLoadingSuggestions = false;
        state.suggestions = action.payload;
      })
      .addCase(fetchSearchSuggestions.rejected, (state, action) => {
        state.isLoadingSuggestions = false;
        state.error = action.payload as string;
      });
  }
});

export const {
  setActiveModule,
  clearSearchResults,
  clearSuggestions,
  addRecentSearch,
  clearRecentSearches,
  clearSearchHistory,
  saveSearchPreferences,
  updateSearchFilters,
  setError
} = searchSlice.actions;

export default searchSlice.reducer;

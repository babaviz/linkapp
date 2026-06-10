"use strict";
/**
 * Search Redux Slice
 * Manages universal search state across all modules
 */
let _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.setError = exports.updateSearchFilters = exports.saveSearchPreferences = exports.clearSearchHistory = exports.clearRecentSearches = exports.addRecentSearch = exports.clearSuggestions = exports.clearSearchResults = exports.setActiveModule = exports.fetchLocationSuggestions = exports.fetchSearchSuggestions = exports.loadMoreSearchResults = exports.performUniversalSearch = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const universalSearchService_1 = require("../../services/universalSearchService");
const initialState = {
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
exports.performUniversalSearch = (0, toolkit_1.createAsyncThunk)('search/performUniversalSearch', async (query, { rejectWithValue }) => {
    try {
        const response = await universalSearchService_1.universalSearchService.search(query);
        return { query, response };
    }
    catch (error) {
        return rejectWithValue(error.message || 'Search failed');
    }
});
exports.loadMoreSearchResults = (0, toolkit_1.createAsyncThunk)('search/loadMoreSearchResults', async (_, { getState, rejectWithValue }) => {
    try {
        const state = getState();
        const currentQuery = state.search.currentQuery;
        const currentResults = state.search.searchResults;
        if (!currentQuery || !currentResults?.pagination.hasMore) {
            return { results: [] };
        }
        const nextPageQuery = {
            ...currentQuery,
            page: (currentQuery.page || 1) + 1
        };
        const response = await universalSearchService_1.universalSearchService.search(nextPageQuery);
        return { results: response.results };
    }
    catch (error) {
        return rejectWithValue(error.message || 'Failed to load more results');
    }
});
exports.fetchSearchSuggestions = (0, toolkit_1.createAsyncThunk)('search/fetchSearchSuggestions', async ({ partialQuery, module }, { rejectWithValue }) => {
    try {
        const suggestions = await universalSearchService_1.universalSearchService.getSearchSuggestions(partialQuery, module);
        return suggestions;
    }
    catch (error) {
        return rejectWithValue(error.message || 'Failed to fetch suggestions');
    }
});
exports.fetchLocationSuggestions = (0, toolkit_1.createAsyncThunk)('search/fetchLocationSuggestions', async (partialQuery, { rejectWithValue }) => {
    try {
        const suggestions = universalSearchService_1.universalSearchService.getLocationSuggestions(partialQuery);
        return suggestions;
    }
    catch (error) {
        return rejectWithValue(error.message || 'Failed to fetch location suggestions');
    }
});
const searchSlice = (0, toolkit_1.createSlice)({
    name: 'search',
    initialState,
    reducers: {
        // Set active module
        setActiveModule: (state, action) => {
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
        addRecentSearch: (state, action) => {
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
        saveSearchPreferences: (state, action) => {
            state.preferences = action.payload;
            universalSearchService_1.universalSearchService.saveSearchPreferences(action.payload);
        },
        // Update search filters
        updateSearchFilters: (state, action) => {
            if (state.currentQuery) {
                state.currentQuery.filters = {
                    ...state.currentQuery.filters,
                    ...action.payload
                };
            }
        },
        // Set error
        setError: (state, action) => {
            state.error = action.payload;
        }
    },
    extraReducers: (builder) => {
        // Perform universal search
        builder
            .addCase(exports.performUniversalSearch.pending, (state) => {
            state.isSearching = true;
            state.error = null;
        })
            .addCase(exports.performUniversalSearch.fulfilled, (state, action) => {
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
            .addCase(exports.performUniversalSearch.rejected, (state, action) => {
            state.isSearching = false;
            state.error = action.payload;
        })
            // Load more search results
            .addCase(exports.loadMoreSearchResults.pending, (state) => {
            state.isLoadingMore = true;
        })
            .addCase(exports.loadMoreSearchResults.fulfilled, (state, action) => {
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
            .addCase(exports.loadMoreSearchResults.rejected, (state, action) => {
            state.isLoadingMore = false;
            state.error = action.payload;
        })
            // Fetch search suggestions
            .addCase(exports.fetchSearchSuggestions.pending, (state) => {
            state.isLoadingSuggestions = true;
        })
            .addCase(exports.fetchSearchSuggestions.fulfilled, (state, action) => {
            state.isLoadingSuggestions = false;
            state.suggestions = action.payload;
        })
            .addCase(exports.fetchSearchSuggestions.rejected, (state, action) => {
            state.isLoadingSuggestions = false;
            state.error = action.payload;
        });
    }
});
_a = searchSlice.actions, exports.setActiveModule = _a.setActiveModule, exports.clearSearchResults = _a.clearSearchResults, exports.clearSuggestions = _a.clearSuggestions, exports.addRecentSearch = _a.addRecentSearch, exports.clearRecentSearches = _a.clearRecentSearches, exports.clearSearchHistory = _a.clearSearchHistory, exports.saveSearchPreferences = _a.saveSearchPreferences, exports.updateSearchFilters = _a.updateSearchFilters, exports.setError = _a.setError;
exports.default = searchSlice.reducer;

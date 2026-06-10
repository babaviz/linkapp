/**
 * useUniversalSearch Hook
 * Provides universal search functionality to any component
 */

import { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import {
  performUniversalSearch,
  setActiveModule,
  clearSearchResults
} from '../redux/slices/searchSlice';
import {
  UniversalSearchQuery,
  ModuleType,
  UniversalSearchFilters,
  SearchResult
} from '../types/search';

interface UseUniversalSearchProps {
  module: ModuleType;
  defaultFilters?: UniversalSearchFilters;
}

export const useUniversalSearch = ({ module, defaultFilters = {} }: UseUniversalSearchProps) => {
  const dispatch = useAppDispatch();
  const {
    activeModule,
    searchResults,
    isSearching,
    isLoadingMore,
    error
  } = useAppSelector(state => state.search);
  
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<UniversalSearchFilters>(defaultFilters);

  // Initialize module if different
  const initializeModule = useCallback(() => {
    if (activeModule !== module) {
      dispatch(setActiveModule(module));
      dispatch(clearSearchResults());
    }
  }, [dispatch, activeModule, module]);

  // Perform search
  const performSearch = useCallback(async (query: Partial<UniversalSearchQuery>) => {
    const searchQuery: UniversalSearchQuery = {
      module,
      modules: [module],
      filters: { ...defaultFilters, ...currentFilters },
      page: 1,
      limit: 20,
      ...query
    };
    
    try {
      await dispatch(performUniversalSearch(searchQuery)).unwrap();
      setShowSearch(false);
      return true;
    } catch (error) {
      
      return false;
    }
  }, [dispatch, module, currentFilters, defaultFilters]);

  // Quick search with text only
  const quickSearch = useCallback((searchText: string) => {
    return performSearch({ searchText });
  }, [performSearch]);

  // Search with filters
  const searchWithFilters = useCallback((filters: UniversalSearchFilters, searchText?: string) => {
    return performSearch({ searchText, filters });
  }, [performSearch]);

  // Update filters
  const updateFilters = useCallback((newFilters: UniversalSearchFilters) => {
    setCurrentFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setCurrentFilters(defaultFilters);
  }, [defaultFilters]);

  // Clear search results
  const clearResults = useCallback(() => {
    dispatch(clearSearchResults());
  }, [dispatch]);

  // Toggle search modal
  const toggleSearch = useCallback((show?: boolean) => {
    setShowSearch(show !== undefined ? show : !showSearch);
  }, [showSearch]);

  // Toggle filters modal
  const toggleFilters = useCallback((show?: boolean) => {
    setShowFilters(show !== undefined ? show : !showFilters);
  }, [showFilters]);

  // Get formatted results for current module
  const getResults = useCallback(() => {
    if (!searchResults || activeModule !== module) {
      return [];
    }
    return searchResults.results;
  }, [searchResults, activeModule, module]);

  // Check if there are active filters
  const hasActiveFilters = useCallback(() => {
    const filterKeys = Object.keys(currentFilters);
    return filterKeys.some(key => {
      const value = (currentFilters as any)[key];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object' && value !== null) {
        return Object.keys(value).some(subKey => (value as any)[subKey] !== undefined);
      }
      return value !== undefined && value !== null && value !== '';
    });
  }, [currentFilters]);

  return {
    // State
    searchResults: getResults(),
    isSearching,
    isLoadingMore,
    error,
    showSearch,
    showFilters,
    currentFilters,
    hasActiveFilters: hasActiveFilters(),
    
    // Actions
    initializeModule,
    performSearch,
    quickSearch,
    searchWithFilters,
    updateFilters,
    clearFilters,
    clearResults,
    toggleSearch,
    toggleFilters,
    
    // Pagination info
    pagination: searchResults?.pagination || null,
    searchTime: searchResults?.searchTime || null,
    suggestions: searchResults?.suggestions || []
  };
};

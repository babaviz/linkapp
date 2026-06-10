/**
 * Search Types for LinkApp
 * Universal search functionality across all modules
 */

// Module types (stories module removed)
export type ModuleType = 'property' | 'jobs' | 'services' | 'datemi';

// Base search query
export interface BaseSearchQuery {
  searchText?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
}

// Base search filters
export interface BaseSearchFilters {
  location?: {
    county?: string;
    town?: string;
    radius?: number;
  };
  dateRange?: {
    start?: string;
    end?: string;
  };
  priceRange?: {
    min?: number;
    max?: number;
  };
}

// Property search filters
export interface PropertySearchFilters extends BaseSearchFilters {
  property_type?: string;
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  furnished?: boolean;
  parking?: boolean;
  verified?: boolean;
}

// Job search filters
export interface JobSearchFilters extends BaseSearchFilters {
  job_type?: 'full_time' | 'part_time' | 'contract' | 'freelance' | 'internship';
  experience_level?: 'entry' | 'intermediate' | 'senior' | 'expert';
  salary_range?: {
    min?: number;
    max?: number;
  };
  category?: string;
  remote?: boolean;
  company_verified?: boolean;
  posted_within?: 'today' | 'week' | 'month' | 'all';
}

// Service search filters
export interface ServiceSearchFilters extends BaseSearchFilters {
  category?: string;
  subcategory?: string;
  rating?: number;
  verified?: boolean;
  availability?: {
    date?: string;
    timeSlot?: string;
  };
  features?: string[];
}


// DateMi search filters
export interface DateMiSearchFilters extends BaseSearchFilters {
  age_range?: {
    min?: number;
    max?: number;
  };
  gender?: 'male' | 'female' | 'any';
  looking_for?: 'casual' | 'serious' | 'friendship';
  interests?: string[];
  verified?: boolean;
  online_status?: 'online' | 'recently_active' | 'any';
  max_distance?: number;
}

// Universal search filters
export interface UniversalSearchFilters {
  modules?: ModuleType[];
  location?: {
    county?: string;
    town?: string;
    radius?: number;
    coordinates?: {
      latitude: number;
      longitude: number;
      radius?: number;
    };
  };
  priceRange?: {
    min?: number;
    max?: number;
  };
  property?: PropertySearchFilters;
  jobs?: JobSearchFilters;
  services?: ServiceSearchFilters;
  datemi?: DateMiSearchFilters;
}

// Universal search query
export interface UniversalSearchQuery extends BaseSearchQuery {
  module?: ModuleType;
  modules?: ModuleType[];
  filters?: UniversalSearchFilters;
  globalFilters?: BaseSearchFilters;
}

// Search result item
export interface SearchResult {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  module: ModuleType;
  type?: string;
  location?: string | {
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  price?: number;
  currency?: string;
  rating?: number;
  verified?: boolean;
  createdAt: string;
  updatedAt: string;
  relevanceScore?: number;
  metadata?: Record<string, any>;
}

// Search response
export interface SearchResponse {
  results: SearchResult[];
  totalResults?: number;
  pagination: {
    currentPage: number;
    totalPages: number;
    hasMore: boolean;
    totalResults?: number;
  };
  filters?: UniversalSearchFilters;
  suggestions?: SearchSuggestion[];
  aggregations?: {
    modules: Record<ModuleType, number>;
    categories: Record<string, number>;
    locations: Record<string, number>;
    priceRanges: Record<string, number>;
  };
  searchTime: number;
  query?: UniversalSearchQuery;
}

// Search preferences
export interface SearchPreferences {
  userId: string;
  defaultModules: ModuleType[];
  defaultFilters: UniversalSearchFilters;
  savedSearches: SavedSearch[];
  searchHistory: SearchHistoryItem[];
  autoComplete: boolean;
  showSuggestions: boolean;
  resultsPerPage: number;
  defaultSortBy: string;
  locationSettings: {
    useCurrentLocation: boolean;
    defaultLocation?: {
      county: string;
      town: string;
    };
    searchRadius: number;
  };
}

// Saved search
export interface SavedSearch {
  id: string;
  name: string;
  query: UniversalSearchQuery;
  alertsEnabled: boolean;
  frequency?: 'immediate' | 'daily' | 'weekly';
  lastRun?: string;
  resultCount?: number;
  createdAt: string;
  updatedAt?: string;
}

// Search history item
export interface SearchHistoryItem {
  id: string;
  query: string;
  modules: ModuleType[];
  filters?: UniversalSearchFilters;
  resultCount: number;
  timestamp: string;
}

// Note: 'stories' module has been removed from the app

// Search suggestion
export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'query' | 'location' | 'category' | 'recent' | 'trending' | 'autocomplete';
  module?: ModuleType;
  category?: string;
  popularity?: number;
  count?: number;
  metadata?: Record<string, any>;
}

// Search analytics
export interface SearchAnalytics {
  userId?: string;
  period: 'day' | 'week' | 'month' | 'year';
  totalSearches: number;
  uniqueUsers?: number;
  topQueries: {
    query: string;
    count: number;
    module?: ModuleType;
  }[];
  topModules: Record<ModuleType, number>;
  topCategories: Record<string, number>;
  topLocations: Record<string, number>;
  averageResultsPerSearch: number;
  clickThroughRate: number;
  zeroResultQueries: {
    query: string;
    count: number;
  }[];
  searchTrends: {
    date: string;
    searches: number;
    modules: Record<ModuleType, number>;
  }[];
}

// Search filter options
export interface SearchFilterOptions {
  module: ModuleType;
  categories: {
    id: string;
    name: string;
    count?: number;
  }[];
  locations: {
    county: string;
    towns: string[];
    count?: number;
  }[];
  priceRanges: {
    min: number;
    max: number;
    label: string;
    count?: number;
  }[];
  dateRanges: {
    value: string;
    label: string;
    count?: number;
  }[];
  customFilters?: {
    key: string;
    label: string;
    type: 'select' | 'range' | 'boolean' | 'multiselect';
    options?: {
      value: string;
      label: string;
      count?: number;
    }[];
  }[];
}

// Search auto-complete
export interface SearchAutoComplete {
  suggestions: SearchSuggestion[];
  recentSearches: string[];
  popularSearches: string[];
  locationSuggestions: {
    county: string;
    town: string;
    fullName: string;
  }[];
  categorySuggestions: {
    module: ModuleType;
    category: string;
    displayName: string;
  }[];
}

// Search error
export interface SearchError {
  code: string;
  message: string;
  details?: Record<string, any>;
  suggestions?: string[];
}

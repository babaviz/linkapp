/**
 * Universal Search Service
 * Provides unified search functionality across all modules
 */

import {
  UniversalSearchQuery,
  SearchResponse,
  SearchResult,
  SearchSuggestion,
  ModuleType,
  SearchPreferences
} from '../types/search';
import { propertyService } from './propertyService';
import { serviceService, type SearchParams as ServiceSearchParams } from './serviceService';
import { KENYAN_COUNTIES } from '../types/property';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { dateMiService } from './dateMiService';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point  
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

class UniversalSearchService {
  private searchPreferences: SearchPreferences | null = null;
  private recentSearches: string[] = [];

  /**
   * Perform universal search across specified module
   */
  async search(query: UniversalSearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();
    
    try {
      let results: SearchResult[] = [];
      let totalResults = 0;
      let totalPages = 1;
      
      // Route search to appropriate module service
      switch (query.module) {
        case 'property':
          results = await this.searchProperties(query);
          break;
        case 'jobs':
          results = await this.searchJobs(query);
          break;
        case 'services':
          results = await this.searchServices(query);
          break;
        case 'datemi':
          results = await this.searchDateMi(query);
          break;
        default:
          throw new Error(`Unsupported module: ${query.module}`);
      }
      
      // Calculate pagination
      const limit = query.limit || 20;
      const page = query.page || 1;
      totalResults = results.length;
      totalPages = Math.max(Math.ceil(totalResults / limit), 1);
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedResults = results.slice(startIndex, endIndex);
      
      // Store recent search
      if (query.searchText) {
        this.addRecentSearch(query.searchText);
      }
      
      const searchTime = Date.now() - startTime;
      
      return {
        results: paginatedResults,
        totalResults,
        pagination: {
          currentPage: page,
          totalPages,
          totalResults,
          hasMore: endIndex < totalResults
        },
        filters: query.filters,
        suggestions: await this.generateSuggestions(query),
        searchTime
      };
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Search properties
   */
  private async searchProperties(query: UniversalSearchQuery): Promise<SearchResult[]> {
    try {
      const propertyQuery = {
        search_text: query.searchText,
        filters: query.filters,
        sort_by: query.sortBy as any || 'date_newest',
        page: query.page || 1,
        limit: query.limit || 20
      };
      
      const response = await propertyService.fetchProperties(propertyQuery);
      
      return response.properties.map(property => ({
        id: property.id,
        title: property.title,
        description: property.description,
        imageUrl: property.images[0],
        module: 'property' as ModuleType,
        createdAt: property.created_at,
        updatedAt: property.updated_at,
        location: {
          address: property.location.address,
          coordinates: property.location.coordinates
        },
        metadata: {
          price: property.price,
          propertyType: property.property_type,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          status: property.status
        }
      }));
    } catch (error) {
      
      return [];
    }
  }

  /**
   * Search jobs using real Supabase data
   */
  private async searchJobs(query: UniversalSearchQuery): Promise<SearchResult[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      let dbQuery: any = supabase
        .from('job_postings')
        .select('id, job_title, description, employer_name, salary_min, salary_max, location, created_at, updated_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(query.limit || 20);

      if (query.searchText) {
        const q = query.searchText.trim();
        dbQuery = dbQuery.or(
          `job_title.ilike.%${q}%,description.ilike.%${q}%,employer_name.ilike.%${q}%`
        );
      }

      const locationFilter =
        query.filters?.location?.town || query.filters?.location?.county;
      if (locationFilter) {
        dbQuery = dbQuery.ilike('location', `%${locationFilter}%`);
      }

      const { data, error } = await dbQuery;
      if (error || !data) return [];

      return (data as any[]).map((row) => ({
        id: row.id,
        title: row.job_title,
        description: row.description || '',
        imageUrl: undefined,
        module: 'jobs' as ModuleType,
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at || new Date().toISOString(),
        location: { address: row.location || '' },
        metadata: {
          company: row.employer_name,
          salary: row.salary_min || row.salary_max,
        },
      }));
    } catch {
      return [];
    }
  }

  /**
   * Search services (use real serviceService where possible)
   */
  private async searchServices(query: UniversalSearchQuery): Promise<SearchResult[]> {
    try {
      const serviceFilters = query.filters?.services;
      const globalLocation = query.filters?.location;

      const params: ServiceSearchParams = {
        searchText: query.searchText,
        category: serviceFilters?.category,
        subcategory: serviceFilters?.subcategory,
        location: globalLocation?.town || globalLocation?.county,
        priceRange:
          query.filters?.priceRange &&
          typeof query.filters.priceRange.min === 'number' &&
          typeof query.filters.priceRange.max === 'number'
            ? {
                min: query.filters.priceRange.min,
                max: query.filters.priceRange.max
              }
            : undefined,
        availability: serviceFilters?.availability?.date,
        verified: serviceFilters?.verified,
        sortBy: (query.sortBy as ServiceSearchParams['sortBy']) || 'rating'
      };

      const services = await serviceService.searchServices(params);

      return services.map((service) => ({
        id: service.id,
        title: service.serviceName,
        description: service.description,
        imageUrl: service.imageUrls[0],
        module: 'services' as ModuleType,
        createdAt: service.createdAt,
        updatedAt: service.updatedAt || service.createdAt,
        location: {
          address: service.location
        },
        metadata: {
          category: service.category,
          subcategory: service.subcategory,
          rating: service.rating,
          price: (service.pricingInfo as any)?.amount
        }
      }));
    } catch {
      return [];
    }
  }


  /**
   * Search DateMi profiles using real backend data.
   */
  private async searchDateMi(query: UniversalSearchQuery): Promise<SearchResult[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const dateMiFilters = query.filters?.datemi;

      let intention: 'short_term_fun' | 'long_term_partner' | undefined;
      switch (dateMiFilters?.looking_for) {
        case 'casual':
          intention = 'short_term_fun';
          break;
        case 'serious':
          intention = 'long_term_partner';
          break;
        default:
          intention = undefined;
      }

      const ageRange =
        dateMiFilters?.age_range && typeof dateMiFilters.age_range.min === 'number' &&
        typeof dateMiFilters.age_range.max === 'number'
          ? { min: dateMiFilters.age_range.min, max: dateMiFilters.age_range.max }
          : undefined;

      const locationFilter =
        dateMiFilters?.location?.town ||
        dateMiFilters?.location?.county ||
        query.filters?.location?.town ||
        query.filters?.location?.county;

      let isOnline: boolean | undefined;
      if (dateMiFilters?.online_status === 'online' || dateMiFilters?.online_status === 'recently_active') {
        isOnline = true;
      }

      const { profiles } = await dateMiService.profile.searchProfiles(query.searchText || '', {
        intention,
        ageRange,
        location: locationFilter,
        interests: dateMiFilters?.interests,
        verified: dateMiFilters?.verified,
        isOnline,
        limit: query.limit || 20,
        offset: query.page && query.limit ? (query.page - 1) * query.limit : 0,
      });

      const now = new Date().toISOString();

      return profiles.map((profile) => ({
        id: profile.id,
        title: profile.displayName,
        description: profile.aboutMe || '',
        imageUrl: profile.profilePictures?.[0],
        module: 'datemi' as ModuleType,
        createdAt: profile.createdAt || now,
        updatedAt: profile.updatedAt || profile.createdAt || now,
        location: profile.location,
        metadata: {
          age: profile.age,
          interests: profile.interests,
          intention: profile.intention,
          subscriptionTier: profile.subscriptionTier,
          verified: profile.verified,
        },
      }));
    } catch {
      return [];
    }
  }

  /**
   * Generate search suggestions
   */
  private async generateSuggestions(query: UniversalSearchQuery): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];
    
    // Add recent searches
    this.recentSearches.slice(0, 3).forEach((search, index) => {
      suggestions.push({
        id: `recent-${index}`,
        text: search,
        type: 'recent'
      });
    });
    
    // Add module-specific suggestions
    const moduleSuggestions: string[] = [];
    switch (query.module) {
      case 'property':
        moduleSuggestions.push('apartments in Nairobi', '3 bedroom house', 'commercial plots');
        break;
      case 'jobs':
        moduleSuggestions.push('software developer', 'remote work', 'customer service');
        break;
      case 'services':
        moduleSuggestions.push('plumbing', 'house cleaning', 'electrical repair');
        break;
      case 'datemi':
        moduleSuggestions.push('serious relationship', 'casual dating', 'friendship');
        break;
    }
    
    moduleSuggestions.forEach((text, index) => {
      suggestions.push({
        id: `suggestion-${index}`,
        text,
        type: 'trending',
        module: query.module
      });
    });
    
    // Remove duplicates and limit to 5
    const uniqueSuggestions = suggestions.filter((v, i, a) => a.findIndex(t => t.text === v.text) === i);
    return uniqueSuggestions.slice(0, 5);
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSearchSuggestions(
    partialQuery: string, 
    module: ModuleType,
    limit: number = 10
  ): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];
    
    // Add recent searches that match
    this.recentSearches
      .filter(search => search.toLowerCase().includes(partialQuery.toLowerCase()))
      .slice(0, 3)
      .forEach((search, index) => {
        suggestions.push({
          id: `recent-${index}`,
          text: search,
          type: 'recent',
          module
        });
      });
    
    // Add autocomplete suggestions
    const autocompleteSuggestions = await this.getAutocompleteSuggestions(partialQuery, module);
    suggestions.push(...autocompleteSuggestions.slice(0, limit - suggestions.length));
    
    return suggestions;
  }

  /**
   * Get location-based suggestions
   */
  getLocationSuggestions(partialQuery: string): string[] {
    if (!partialQuery) return KENYAN_COUNTIES.slice(0, 10);
    
    const query = partialQuery.toLowerCase();
    return KENYAN_COUNTIES
      .filter(county => county.toLowerCase().includes(query))
      .slice(0, 10);
  }

  /**
   * Save search preferences
   */
  saveSearchPreferences(preferences: SearchPreferences): void {
    this.searchPreferences = preferences;
    // In a real app, this would persist to storage
  }

  /**
   * Get search preferences
   */
  getSearchPreferences(): SearchPreferences | null {
    return this.searchPreferences;
  }

  /**
   * Add to recent searches
   */
  private addRecentSearch(search: string): void {
    this.recentSearches = [
      search,
      ...this.recentSearches.filter(s => s !== search)
    ].slice(0, 10); // Keep only last 10 searches
  }

  /**
   * Get autocomplete suggestions
   */
  private async getAutocompleteSuggestions(
    partialQuery: string, 
    module: ModuleType
  ): Promise<SearchSuggestion[]> {
    // This would typically call an API or use a search index
    // For demo purposes, return static suggestions
    const suggestions: Record<ModuleType, string[]> = {
      property: [
        'apartment', 'house', 'commercial', 'land', 'bedsitter',
        'Nairobi properties', 'Karen homes', 'Westlands apartments'
      ],
      jobs: [
        'software developer', 'designer', 'manager', 'sales',
        'remote jobs', 'part-time', 'freelance', 'internship'
      ],
      services: [
        'plumbing', 'cleaning', 'electrical', 'painting',
        'home repair', 'garden maintenance', 'security'
      ],
      datemi: [
        'serious relationship', 'casual dating', 'friendship',
        'professional networking', 'hobby partner'
      ]
    };
    
    const modulesuggestions = suggestions[module] || [];
    const query = partialQuery.toLowerCase();
    
    return modulesuggestions
      .filter(suggestion => suggestion.toLowerCase().includes(query))
      .map((suggestion, index) => ({
        id: `autocomplete-${index}`,
        text: suggestion,
        type: 'autocomplete' as const,
        module
      }));
  }

  /**
   * Clear recent searches
   */
  clearRecentSearches(): void {
    this.recentSearches = [];
  }
}

// Export singleton instance with lazy initialization
let instance: UniversalSearchService | null = null;
function getInstance(): UniversalSearchService {
  if (!instance) instance = new UniversalSearchService();
  return instance;
}

export const universalSearchService = new Proxy({} as UniversalSearchService, {
  get(target, prop) {
    const service = getInstance();
    const value = (service as any)[prop];
    return typeof value === 'function' ? value.bind(service) : value;
  }
});
export default universalSearchService;

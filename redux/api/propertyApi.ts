/**
 * RTK Query API slice for Property data
 * Provides automatic caching, background updates, and optimized data fetching
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Property, PropertySearchQuery } from '../../types/property';
import { propertyService } from '../../services/propertyService';

// Define the response types
interface PropertyListResponse {
  properties: Property[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    hasMore: boolean;
  };
}

// Use the PropertyStats type from types/property.ts
import type { PropertyStats } from '../../types/property';

export const propertyApi = createApi({
  reducerPath: 'propertyApi',
  baseQuery: fetchBaseQuery({
    // Since we're using a demo service, we'll create a custom baseQuery
    baseUrl: '/',
    fetchFn: async () => new Response(JSON.stringify({ data: {} })) // Placeholder since we're using propertyService
  }),
  tagTypes: ['Property', 'PropertyStats'],
  keepUnusedDataFor: 300, // Keep cached data for 5 minutes
  refetchOnMountOrArgChange: 600, // Refetch if data is older than 10 minutes
  refetchOnFocus: true, // Refetch when window regains focus
  refetchOnReconnect: true, // Refetch when network reconnects
  
  endpoints: (builder) => ({
    // Fetch properties with caching and background updates
    getProperties: builder.query<PropertyListResponse, PropertySearchQuery>({
      queryFn: async (searchQuery) => {
        try {
          
          const result = await propertyService.fetchProperties(searchQuery);
          
          return { data: result };
        } catch (error: any) {
          
          return { error: { status: 'FETCH_ERROR', error: error.message } };
        }
      },
      providesTags: (result, error, query) => [
        'Property' as const,
        // Tag with specific query parameters for granular cache invalidation
        { type: 'Property' as const, id: `list-${JSON.stringify(query)}` },
      ],
    }),

    // Fetch individual property by ID
    getPropertyById: builder.query<Property, string>({
      queryFn: async (propertyId) => {
        try {
          
          const property = await propertyService.getPropertyById(propertyId);
          return { data: property };
        } catch (error: any) {
          
          return { error: { status: 'FETCH_ERROR', error: error.message } };
        }
      },
      providesTags: (result, error, id) => [
        { type: 'Property', id }
      ],
    }),

    // Fetch property statistics with longer cache time
    getPropertyStats: builder.query<PropertyStats, void>({
      queryFn: async () => {
        try {
          
          const stats = await propertyService.getPropertyStats();
          return { data: stats };
        } catch (error: any) {
          
          return { error: { status: 'FETCH_ERROR', error: error.message } };
        }
      },
      providesTags: ['PropertyStats'],
      keepUnusedDataFor: 900, // Keep stats cached for 15 minutes
    }),

    // Fetch properties near location with location-based caching
    getPropertiesNearLocation: builder.query<Property[], {
      coordinates: { latitude: number; longitude: number };
      radius?: number;
      limit?: number;
      propertyType?: string;
    }>({
      queryFn: async ({ coordinates, radius = 10, limit = 20, propertyType }) => {
        try {
          
          const properties = await propertyService.getPropertiesNearLocation(
            coordinates, radius, limit, propertyType as any
          );
          return { data: properties };
        } catch (error: any) {
          
          return { error: { status: 'FETCH_ERROR', error: error.message } };
        }
      },
      providesTags: (result, error, { coordinates }) => [
        'Property',
        { type: 'Property', id: `near-${coordinates.latitude}-${coordinates.longitude}` },
      ],
    }),
  }),
});

// Export hooks for use in components
export const {
  useGetPropertiesQuery,
  useGetPropertyByIdQuery,
  useGetPropertyStatsQuery,
  useGetPropertiesNearLocationQuery,
  useLazyGetPropertiesQuery,
  useLazyGetPropertyByIdQuery,
} = propertyApi;

// Export utilities for manual cache management
export const {
  util: { invalidateTags, resetApiState },
  endpoints,
} = propertyApi;

export default propertyApi;

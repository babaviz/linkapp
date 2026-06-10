"use strict";
/**
 * RTK Query API slice for Property data
 * Provides automatic caching, background updates, and optimized data fetching
 */
let _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.endpoints = exports.resetApiState = exports.invalidateTags = exports.useLazyGetPropertyByIdQuery = exports.useLazyGetPropertiesQuery = exports.useGetPropertiesNearLocationQuery = exports.useGetPropertyStatsQuery = exports.useGetPropertyByIdQuery = exports.useGetPropertiesQuery = exports.propertyApi = void 0;
const react_1 = require("@reduxjs/toolkit/query/react");
const propertyService_1 = require("../../services/propertyService");
exports.propertyApi = (0, react_1.createApi)({
    reducerPath: 'propertyApi',
    baseQuery: (0, react_1.fetchBaseQuery)({
        // Since we're using a demo service, we'll create a custom baseQuery
        baseUrl: '/',
        fetchFn: async () => ({ data: {} }) // Placeholder since we're using propertyService
    }),
    tagTypes: ['Property', 'PropertyStats'],
    keepUnusedDataFor: 300, // Keep cached data for 5 minutes
    refetchOnMountOrArgChange: 600, // Refetch if data is older than 10 minutes
    refetchOnFocus: true, // Refetch when window regains focus
    refetchOnReconnect: true, // Refetch when network reconnects
    endpoints: (builder) => ({
        // Fetch properties with caching and background updates
        getProperties: builder.query({
            queryFn: async (searchQuery) => {
                try {
                    
                    const result = await propertyService_1.propertyService.fetchProperties(searchQuery);
                    
                    return { data: result };
                }
                catch (error) {
                    
                    return { error: { status: 'FETCH_ERROR', error: error.message } };
                }
            },
            providesTags: (result, error, query) => [
                'Property',
                // Tag with specific query parameters for granular cache invalidation
                { type: 'Property', id: `list-${JSON.stringify(query)}` },
            ],
            // Transform the response to add metadata
            transformResponse: (response) => ({
                ...response,
                lastFetched: Date.now(),
            }),
        }),
        // Fetch individual property by ID
        getPropertyById: builder.query({
            queryFn: async (propertyId) => {
                try {
                    
                    const property = await propertyService_1.propertyService.getPropertyById(propertyId);
                    return { data: property };
                }
                catch (error) {
                    
                    return { error: { status: 'FETCH_ERROR', error: error.message } };
                }
            },
            providesTags: (result, error, id) => [
                { type: 'Property', id }
            ],
        }),
        // Fetch property statistics with longer cache time
        getPropertyStats: builder.query({
            queryFn: async () => {
                try {
                    
                    const stats = await propertyService_1.propertyService.getPropertyStats();
                    return { data: stats };
                }
                catch (error) {
                    
                    return { error: { status: 'FETCH_ERROR', error: error.message } };
                }
            },
            providesTags: ['PropertyStats'],
            keepUnusedDataFor: 900, // Keep stats cached for 15 minutes
        }),
        // Fetch properties near location with location-based caching
        getPropertiesNearLocation: builder.query({
            queryFn: async ({ coordinates, radius = 10, limit = 20, propertyType }) => {
                try {
                    
                    const properties = await propertyService_1.propertyService.getPropertiesNearLocation(coordinates, radius, limit, propertyType);
                    return { data: properties };
                }
                catch (error) {
                    
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
exports.useGetPropertiesQuery = exports.propertyApi.useGetPropertiesQuery, exports.useGetPropertyByIdQuery = exports.propertyApi.useGetPropertyByIdQuery, exports.useGetPropertyStatsQuery = exports.propertyApi.useGetPropertyStatsQuery, exports.useGetPropertiesNearLocationQuery = exports.propertyApi.useGetPropertiesNearLocationQuery, exports.useLazyGetPropertiesQuery = exports.propertyApi.useLazyGetPropertiesQuery, exports.useLazyGetPropertyByIdQuery = exports.propertyApi.useLazyGetPropertyByIdQuery;
// Export utilities for manual cache management
_a = exports.propertyApi.util, exports.invalidateTags = _a.invalidateTags, exports.resetApiState = _a.resetApiState, exports.endpoints = exports.propertyApi.endpoints;
exports.default = exports.propertyApi;

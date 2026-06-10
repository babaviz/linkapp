"use strict";
/**
 * Property Service - Supabase Integration Layer
 * Handles all property-related database operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPropertyStats = exports.updatePropertyStatus = exports.getUserProperties = exports.deleteProperty = exports.updateProperty = exports.createProperty = exports.getPropertyById = exports.fetchProperties = exports.propertyService = exports.PropertyService = void 0;
const supabaseClient_1 = require("./supabaseClient");
const storageService_1 = require("./storageService");
// Transform database row to Property interface
const transformRowToProperty = (row) => {
    return {
        id: row.id,
        owner_id: row.owner_id,
        title: row.title,
        description: row.description,
        property_type: row.property_type || 'houses',
        price: row.price,
        price_period: row.price_period || 'monthly',
        currency: 'KSH',
        location: {
            address: row.location_address || 'Address not provided',
            coordinates: row.location_coordinates ? {
                latitude: row.location_coordinates.lat || row.location_coordinates.latitude || 0,
                longitude: row.location_coordinates.lng || row.location_coordinates.longitude || 0
            } : { latitude: 0, longitude: 0 },
            county: row.location_county || 'Not specified',
            town: row.location_town || 'Not specified'
        },
        images: row.image_urls || [],
        amenities: row.amenities || [],
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        area_sqm: row.area_sqm,
        status: row.status || 'available',
        created_at: row.created_at,
        updated_at: row.updated_at || row.created_at,
        is_featured: row.is_featured,
        contact_phone: row.contact_phone,
        contact_email: row.contact_email,
        view_count: row.view_count || 0,
        inquiry_count: row.inquiry_count || 0,
        favorited_count: row.favorited_count || 0
    };
};
// Transform Property to database row format
const transformPropertyToRow = (property, ownerId) => {
    return {
        owner_id: ownerId,
        property_type: property.property_type,
        listing_type: 'rent', // Default to rent for MyNyumb
        title: property.title.trim(),
        description: property.description?.trim() || '',
        location_coordinates: {
            lat: property.location.coordinates.latitude,
            lng: property.location.coordinates.longitude
        },
        price: property.price,
        price_period: property.price_period || 'monthly',
        currency: 'KSH',
        // Location details
        location_address: property.location.address.trim(),
        location_county: property.location.county || 'Nairobi',
        location_town: property.location.town?.trim() || '',
        location_neighborhood: property.location.neighborhood?.trim() || '',
        // Property details
        amenities: property.amenities || [],
        bedrooms: property.bedrooms || null,
        bathrooms: property.bathrooms || null,
        area_sqm: property.area_sqm || null,
        // Contact info (will be handled separately for images)
        contact_phone: property.contact_phone?.trim() || '',
        contact_email: property.contact_email?.trim() || '',
        // Status and metadata
        status: 'available',
        is_featured: false,
        view_count: 0,
        inquiry_count: 0,
        favorited_count: 0
    };
};
/**
 * Property Service Class
 */
class PropertyService {
    constructor() {
        this.tableName = 'property_listings';
    }
    /**
     * Check if service is properly configured
     */
    isConfigured() {
        const configured = (0, supabaseClient_1.isSupabaseConfigured)();
        :', configured);
        return configured;
    }
    /**
     * Fetch properties with search and filter options
     */
    async fetchProperties(searchQuery) {
        );
        // Always check configuration first
        const isConfigured = this.isConfigured();
        
        if (!isConfigured) {
            ');
            try {
                const result = await this.getDemoProperties(searchQuery);
                
                return result;
            }
            catch (error) {
                
                throw error;
            }
        }
        // Only try Supabase if configured
        
        try {
            let query = supabaseClient_1.supabase
                .from(this.tableName)
                .select('*', { count: 'exact' });
            // Apply filters
            const { filters } = searchQuery;
            if (filters.property_type) {
                query = query.eq('property_type', filters.property_type);
            }
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            else {
                // Default to available properties only
                query = query.eq('status', 'available');
            }
            if (filters.min_price) {
                query = query.gte('price', filters.min_price);
            }
            if (filters.max_price) {
                query = query.lte('price', filters.max_price);
            }
            if (filters.bedrooms) {
                query = query.eq('bedrooms', filters.bedrooms);
            }
            if (filters.bathrooms) {
                query = query.eq('bathrooms', filters.bathrooms);
            }
            const hasLocation = Boolean(filters.location);
            if (hasLocation && typeof filters.location.county !== 'undefined') {
                query = query.eq('location_county', filters.location.county);
            }
            if (hasLocation && typeof filters.location.town !== 'undefined') {
                query = query.eq('location_town', filters.location.town);
            }
            // Apply search text
            if (searchQuery.search_text) {
                query = query.or(`title.ilike.%${searchQuery.search_text}%,description.ilike.%${searchQuery.search_text}%`);
            }
            // Apply sorting
            switch (searchQuery.sort_by) {
                case 'price_asc':
                    query = query.order('price', { ascending: true });
                    break;
                case 'price_desc':
                    query = query.order('price', { ascending: false });
                    break;
                case 'date_oldest':
                    query = query.order('created_at', { ascending: true });
                    break;
                default:
                    query = query.order('created_at', { ascending: false });
            }
            // Apply pagination
            const page = searchQuery.page || 1;
            const limit = searchQuery.limit || 20;
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            query = query.range(from, to);
            const { data, error, count } = await query;
            if (error) {
                const message = (error && error.message) ? error.message : 'Unknown error';
                throw new Error(`Failed to fetch properties: ${message}`);
            }
            const properties = (data || []).map(transformRowToProperty);
            const totalResults = count || 0;
            const totalPages = Math.ceil(totalResults / limit);
            const hasMore = page < totalPages;
            // Apply location-based filtering if specified
            let filteredProperties = properties;
            if (hasLocation && filters.location.center_coordinates && filters.location.radius_km) {
                filteredProperties = this.filterPropertiesByDistance(properties, filters.location.center_coordinates, filters.location.radius_km);
            }
            return {
                properties: filteredProperties,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalResults: filteredProperties.length,
                    hasMore: page < totalPages
                }
            };
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Get a single property by ID
     */
    async getPropertyById(propertyId) {
        try {
            if (!this.isConfigured()) {
                
                const demoResult = await this.getDemoProperties({ filters: {}, page: 1, limit: 20 });
                return demoResult.properties.find(p => p.id === propertyId) || null;
            }
            const { data, error } = await supabaseClient_1.supabase
                .from(this.tableName)
                .select('*')
                .eq('id', propertyId)
                .single();
            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // Property not found
                }
                throw new Error(`Failed to fetch property: ${error.message}`);
            }
            return transformRowToProperty(data);
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Create a new property listing with image uploads
     */
    async createProperty(propertyData, ownerId) {
        try {
            if (!this.isConfigured()) {
                throw new Error('Supabase not configured');
            }
            // Create property record first to get the ID
            const propertyId = crypto.randomUUID();
            let uploadedImageUrls = [];
            // Handle image uploads if there are images
            if (propertyData.images && propertyData.images.length > 0) {
                try {
                    // Convert image URIs to File objects for upload
                    const imageFiles = [];
                    for (const imageUri of propertyData.images) {
                        try {
                            const response = await fetch(imageUri);
                            const blob = await response.blob();
                            imageFiles.push(blob);
                        }
                        catch (fetchError) {
                            
                            // Continue with other images
                        }
                    }
                    if (imageFiles.length > 0) {
                        // Upload images to storage
                        const uploadResults = await storageService_1.storageService.uploadPropertyImages(propertyId, ownerId, imageFiles);
                        // Filter successful uploads and get URLs
                        const successfulUploads = uploadResults.filter(result => result.success);
                        uploadedImageUrls = successfulUploads
                            .map(result => result.data?.publicUrl)
                            .filter(url => url);
                        
                    }
                }
                catch (uploadError) {
                    
                    // Continue with property creation without images
                }
            }
            // Prepare row data with uploaded image URLs
            const rowData = {
                ...transformPropertyToRow(propertyData, ownerId),
                id: propertyId,
                image_urls: uploadedImageUrls
            };
            const { data, error } = await supabaseClient_1.supabase
                .from(this.tableName)
                .insert(rowData)
                .select()
                .single();
            if (error) {
                // If property creation fails, try to clean up uploaded images
                if (uploadedImageUrls.length > 0) {
                    try {
                        // Extract file paths from URLs for cleanup
                        const filePaths = uploadedImageUrls.map(url => {
                            const parts = url.split('/property-images/');
                            return parts[1] || '';
                        }).filter(path => path);
                        if (filePaths.length > 0) {
                            await supabaseClient_1.supabase.storage
                                .from('property-images')
                                .remove(filePaths);
                        }
                    }
                    catch (cleanupError) {
                        
                    }
                }
                throw new Error(`Failed to create property: ${error.message}`);
            }
            return transformRowToProperty(data);
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Update an existing property
     */
    async updateProperty(propertyId, updates) {
        try {
            if (!this.isConfigured()) {
                throw new Error('Supabase not configured');
            }
            // Transform updates to database format
            const updateData = {
                updated_at: new Date().toISOString()
            };
            if (updates.title)
                updateData.title = updates.title;
            if (updates.description)
                updateData.description = updates.description;
            if (updates.property_type)
                updateData.property_type = updates.property_type;
            if (updates.price)
                updateData.price = updates.price;
            if (updates.images)
                updateData.image_urls = updates.images;
            if (updates.amenities)
                updateData.amenities = updates.amenities;
            if (updates.bedrooms)
                updateData.bedrooms = updates.bedrooms;
            if (updates.bathrooms)
                updateData.bathrooms = updates.bathrooms;
            if (updates.area_sqm)
                updateData.area_sqm = updates.area_sqm;
            if (updates.contact_phone)
                updateData.contact_phone = updates.contact_phone;
            if (updates.contact_email)
                updateData.contact_email = updates.contact_email;
            if (updates.location) {
                updateData.location_address = updates.location.address;
                updateData.location_county = updates.location.county;
                updateData.location_town = updates.location.town;
                updateData.location_coordinates = {
                    lat: updates.location.coordinates.latitude,
                    lng: updates.location.coordinates.longitude
                };
            }
            const { data, error } = await supabaseClient_1.supabase
                .from(this.tableName)
                .update(updateData)
                .eq('id', propertyId)
                .select()
                .single();
            if (error) {
                throw new Error(`Failed to update property: ${error.message}`);
            }
            return transformRowToProperty(data);
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Delete a property
     */
    async deleteProperty(propertyId) {
        try {
            if (!this.isConfigured()) {
                throw new Error('Supabase not configured');
            }
            const { error } = await supabaseClient_1.supabase
                .from(this.tableName)
                .delete()
                .eq('id', propertyId);
            if (error) {
                throw new Error(`Failed to delete property: ${error.message}`);
            }
            return true;
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Get user's properties
     */
    async getUserProperties(userId) {
        try {
            if (!this.isConfigured()) {
                
                // Return demo properties that belong to the user or assign ownership
                const demoResult = await this.getDemoProperties({ filters: {}, page: 1, limit: 20 });
                // If no properties belong to this user, assign the first few properties to them
                let userProperties = demoResult.properties.filter(p => p.owner_id === userId);
                if (userProperties.length === 0 && demoResult.properties.length > 0) {
                    // Assign first 3 properties to the current user for demo purposes
                    userProperties = demoResult.properties.slice(0, 3).map(property => ({
                        ...property,
                        owner_id: userId
                    }));
                    
                }
                return userProperties;
            }
            const { data, error } = await supabaseClient_1.supabase
                .from(this.tableName)
                .select('*')
                .eq('owner_id', userId)
                .order('created_at', { ascending: false });
            if (error) {
                throw new Error(`Failed to fetch user properties: ${error.message}`);
            }
            return (data || []).map(transformRowToProperty);
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Update property status
     */
    async updatePropertyStatus(propertyId, status) {
        try {
            if (!this.isConfigured()) {
                throw new Error('Supabase not configured');
            }
            const { data, error } = await supabaseClient_1.supabase
                .from(this.tableName)
                .update({
                status,
                updated_at: new Date().toISOString()
            })
                .eq('id', propertyId)
                .select()
                .single();
            if (error) {
                throw new Error(`Failed to update property status: ${error.message}`);
            }
            return transformRowToProperty(data);
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Get property statistics
     */
    async getPropertyStats() {
        try {
            if (!this.isConfigured()) {
                ');
                return {
                    total_properties: 6,
                    available_properties: 6,
                    rented_properties: 0,
                    sold_properties: 0,
                    average_price: 45000000,
                    properties_by_type: {
                        houses: 2,
                        apartments: 2,
                        commercial: 1,
                        bedsitters: 1,
                        one_bedroom: 1
                    },
                    properties_by_county: {
                        'Nairobi': 6
                    }
                };
            }
            // Get basic counts
            const { count: totalProperties } = await supabaseClient_1.supabase
                .from(this.tableName)
                .select('*', { count: 'exact', head: true });
            const { count: availableProperties } = await supabaseClient_1.supabase
                .from(this.tableName)
                .select('*', { count: 'exact', head: true })
                .eq('status', 'available');
            const { count: rentedProperties } = await supabaseClient_1.supabase
                .from(this.tableName)
                .select('*', { count: 'exact', head: true })
                .eq('status', 'rented');
            const { count: soldProperties } = await supabaseClient_1.supabase
                .from(this.tableName)
                .select('*', { count: 'exact', head: true })
                .eq('status', 'sold');
            // Get average price
            const { data: avgPriceData } = await supabaseClient_1.supabase
                .from(this.tableName)
                .select('price')
                .eq('status', 'available');
            const averagePrice = avgPriceData && avgPriceData.length > 0
                ? avgPriceData.reduce((sum, item) => sum + item.price, 0) / avgPriceData.length
                : 0;
            // Get properties by type
            const { data: typeData } = await supabaseClient_1.supabase
                .from(this.tableName)
                .select('property_type');
            const properties_by_type = (typeData || []).reduce((acc, item) => {
                const type = item.property_type;
                acc[type] = (acc[type] || 0) + 1;
                return acc;
            }, {});
            // Get properties by county
            const { data: countyData } = await supabaseClient_1.supabase
                .from(this.tableName)
                .select('location_county');
            const properties_by_county = (countyData || []).reduce((acc, item) => {
                const county = item.location_county || 'Unknown';
                acc[county] = (acc[county] || 0) + 1;
                return acc;
            }, {});
            return {
                total_properties: totalProperties || 0,
                available_properties: availableProperties || 0,
                rented_properties: rentedProperties || 0,
                sold_properties: soldProperties || 0,
                average_price: Math.round(averagePrice),
                properties_by_type,
                properties_by_county
            };
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Filter properties by distance from a center point
     */
    filterPropertiesByDistance(properties, centerCoordinates, radiusKm) {
        return properties.filter(property => {
            const distance = this.calculateDistance(centerCoordinates, property.location.coordinates);
            return distance <= radiusKm;
        });
    }
    /**
     * Calculate distance between two coordinates (Haversine formula)
     */
    calculateDistance(from, to) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(to.latitude - from.latitude);
        const dLon = this.toRadians(to.longitude - from.longitude);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(from.latitude)) *
                Math.cos(this.toRadians(to.latitude)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return Math.round(distance * 10) / 10; // Round to 1 decimal place
    }
    /**
     * Convert degrees to radians
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    /**
     * Get properties near a location
     */
    async getPropertiesNearLocation(centerCoordinates, radiusKm = 10, limit = 20, propertyType) {
        try {
            // First get all properties in the general area (we'll filter by exact distance)
            const searchQuery = {
                filters: {
                    property_type: propertyType,
                    location: {
                        center_coordinates: centerCoordinates,
                        radius_km: radiusKm
                    }
                },
                sort_by: 'date_newest',
                page: 1,
                limit: limit * 2 // Get more to account for distance filtering
            };
            const result = await this.fetchProperties(searchQuery);
            return result.properties.slice(0, limit); // Return requested limit
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Get properties in a specific county or town
     */
    async getPropertiesByLocation(county, town, propertyType, limit = 20) {
        try {
            const searchQuery = {
                filters: {
                    property_type: propertyType,
                    location: {
                        county,
                        town
                    }
                },
                sort_by: 'date_newest',
                page: 1,
                limit
            };
            const result = await this.fetchProperties(searchQuery);
            return result.properties;
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Get demo properties for testing when Supabase is not configured
     */
    getDemoProperties(searchQuery) {
        const demoProperties = [
            {
                id: 'demo-1',
                owner_id: 'demo-user-123',
                title: '3 Bedroom House in Karen',
                description: 'Beautiful family home with garden, modern kitchen, and secure parking. Perfect for families looking for comfort and convenience.',
                property_type: 'houses',
                price: 35000000,
                price_period: 'one_time',
                currency: 'KSH',
                location: {
                    address: '123 Karen Road, Karen',
                    coordinates: { latitude: -1.319167, longitude: 36.685833 },
                    county: 'Nairobi',
                    town: 'Karen'
                },
                images: [
                    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400',
                    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400'
                ],
                amenities: ['Parking', 'Security', 'Water Supply', 'Garden', 'Modern Kitchen'],
                features: ['Garden', 'Parking', 'Balcony', 'Furnished'],
                bedrooms: 3,
                bathrooms: 2,
                area_sqm: 200,
                status: 'available',
                created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                is_featured: true,
                view_count: 152,
                inquiry_count: 8,
                favorited_count: 23
            },
            {
                id: 'demo-2',
                owner_id: 'demo-user-124',
                title: '2 Bedroom Apartment in Westlands',
                description: 'Modern apartment in the heart of Westlands with amenities including gym, pool, and 24/7 security.',
                property_type: 'apartments',
                price: 8500000,
                price_period: 'one_time',
                currency: 'KSH',
                location: {
                    address: '456 Westlands Avenue, Westlands',
                    coordinates: { latitude: -1.264, longitude: 36.81 },
                    county: 'Nairobi',
                    town: 'Westlands'
                },
                images: [
                    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400',
                    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400'
                ],
                amenities: ['Swimming Pool', 'Gym', 'Security', 'Lift/Elevator', 'Parking'],
                features: ['Swimming Pool', 'Gym', 'Balcony', 'Modern'],
                bedrooms: 2,
                bathrooms: 2,
                area_sqm: 120,
                status: 'available',
                created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                is_featured: false,
                view_count: 89,
                inquiry_count: 5,
                favorited_count: 12
            },
            {
                id: 'demo-3',
                owner_id: 'demo-user-125',
                title: 'Commercial Plot in CBD',
                description: 'Prime commercial plot in Nairobi CBD perfect for office buildings or retail spaces.',
                property_type: 'commercial',
                price: 150000000,
                price_period: 'one_time',
                currency: 'KSH',
                location: {
                    address: '789 Kenyatta Avenue, CBD',
                    coordinates: { latitude: -1.286389, longitude: 36.817223 },
                    county: 'Nairobi',
                    town: 'CBD'
                },
                images: [
                    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400'
                ],
                amenities: ['Prime Location', 'High Traffic', 'Commercial Zoning'],
                features: ['Prime Location', 'High Visibility', 'Corner Plot'],
                area_sqm: 500,
                status: 'available',
                created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                is_featured: true,
                view_count: 234,
                inquiry_count: 15,
                favorited_count: 45
            },
            {
                id: 'demo-4',
                owner_id: 'demo-user-126',
                title: '4 Bedroom House in Runda',
                description: 'Luxurious family home in exclusive Runda estate with all modern amenities and beautiful landscaping.',
                property_type: 'houses',
                price: 55000000,
                price_period: 'one_time',
                currency: 'KSH',
                location: {
                    address: '321 Runda Grove, Runda',
                    coordinates: { latitude: -1.208, longitude: 36.765 },
                    county: 'Nairobi',
                    town: 'Runda'
                },
                images: [
                    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400',
                    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400'
                ],
                amenities: ['Swimming Pool', 'Garden', 'Security', 'Servant Quarter', 'Solar Power'],
                features: ['Luxury', 'Swimming Pool', 'Garden', 'Security', 'Solar Power'],
                bedrooms: 4,
                bathrooms: 3,
                area_sqm: 300,
                status: 'available',
                created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                is_featured: true,
                view_count: 178,
                inquiry_count: 12,
                favorited_count: 34
            },
            {
                id: 'demo-5',
                owner_id: 'demo-user-127',
                title: 'Modern Bedsitter in South B',
                description: 'Affordable bedsitter with modern amenities. Perfect for young professionals and students.',
                property_type: 'bedsitters',
                price: 25000,
                price_period: 'monthly',
                currency: 'KSH',
                location: {
                    address: '789 South B Estate, South B',
                    coordinates: { latitude: -1.307, longitude: 36.826 },
                    county: 'Nairobi',
                    town: 'South B'
                },
                images: [
                    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400'
                ],
                amenities: ['Water Supply', 'Electricity', 'Internet/WiFi', 'Security'],
                features: ['Affordable', 'WiFi', 'Security', 'Compact'],
                bedrooms: 0,
                bathrooms: 1,
                area_sqm: 25,
                status: 'available',
                created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
                updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
                is_featured: false,
                view_count: 67,
                inquiry_count: 4,
                favorited_count: 8
            },
            {
                id: 'demo-6',
                owner_id: 'demo-user-128',
                title: '1 Bedroom Apartment for Rent',
                description: 'Cozy 1-bedroom apartment in a quiet neighborhood. Ideal for singles or couples.',
                property_type: 'one_bedroom',
                price: 45000,
                price_period: 'monthly',
                currency: 'KSH',
                location: {
                    address: '456 Kileleshwa Road, Kileleshwa',
                    coordinates: { latitude: -1.285, longitude: 36.78 },
                    county: 'Nairobi',
                    town: 'Kileleshwa'
                },
                images: [
                    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400',
                    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400'
                ],
                amenities: ['Parking', 'Security', 'Water Supply', 'Electricity', 'Balcony'],
                features: ['Balcony', 'Parking', 'Modern Kitchen', 'Quiet'],
                bedrooms: 1,
                bathrooms: 1,
                area_sqm: 45,
                status: 'available',
                created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                is_featured: false,
                view_count: 94,
                inquiry_count: 7,
                favorited_count: 15
            }
        ];
        // Apply filters
        let filteredProperties = [...demoProperties];
        const { filters } = searchQuery;
        if (filters.property_type) {
            filteredProperties = filteredProperties.filter(p => p.property_type === filters.property_type);
        }
        if (filters.min_price) {
            filteredProperties = filteredProperties.filter(p => p.price >= filters.min_price);
        }
        if (filters.max_price) {
            filteredProperties = filteredProperties.filter(p => p.price <= filters.max_price);
        }
        if (filters.location?.county) {
            filteredProperties = filteredProperties.filter(p => p.location.county.toLowerCase().includes(filters.location.county.toLowerCase()));
        }
        if (filters.location?.town) {
            filteredProperties = filteredProperties.filter(p => p.location.town.toLowerCase().includes(filters.location.town.toLowerCase()));
        }
        // Apply sorting
        switch (searchQuery.sort_by) {
            case 'price_asc':
                filteredProperties.sort((a, b) => a.price - b.price);
                break;
            case 'price_desc':
                filteredProperties.sort((a, b) => b.price - a.price);
                break;
            case 'date_oldest':
                filteredProperties.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                break;
            case 'date_newest':
            default:
                filteredProperties.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                break;
        }
        // Apply pagination
        const page = searchQuery.page || 1;
        const limit = searchQuery.limit || 20;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedProperties = filteredProperties.slice(startIndex, endIndex);
        return Promise.resolve({
            properties: paginatedProperties,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(filteredProperties.length / limit),
                totalResults: filteredProperties.length,
                hasMore: endIndex < filteredProperties.length
            }
        });
    }
}
exports.PropertyService = PropertyService;
// Export singleton instance
exports.propertyService = new PropertyService();
// Export individual functions for direct use
exports.fetchProperties = exports.propertyService.fetchProperties, exports.getPropertyById = exports.propertyService.getPropertyById, exports.createProperty = exports.propertyService.createProperty, exports.updateProperty = exports.propertyService.updateProperty, exports.deleteProperty = exports.propertyService.deleteProperty, exports.getUserProperties = exports.propertyService.getUserProperties, exports.updatePropertyStatus = exports.propertyService.updatePropertyStatus, exports.getPropertyStats = exports.propertyService.getPropertyStats;

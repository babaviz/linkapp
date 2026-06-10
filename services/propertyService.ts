/**
 * Property Service - Supabase Integration Layer
 * Handles all property-related database operations
 */

import { ENV } from '../config/environment';
import { supabase, isSupabaseConfigured as checkSupabaseConfigured } from './supabaseClient';
import { storageService } from './storageService';
import { categoryManagementService } from './categoryManagementService';
import locationRecommendationService from './locationRecommendationService';
import { LEGACY_PLAY_STORE_REVIEWER_USER_IDS } from '../utils/playStoreReviewer';
import { formatPostgrestInList } from '../utils/supabaseFilters';
import { 
  Property, 
  PropertyFormData, 
  PropertyFilter, 
  PropertySearchQuery,
  PropertyInquiry,
  PropertyStats,
  PropertyStatus,
  PropertyType 
} from '../types/property';

// Database row type (matches existing schema)
interface PropertyRow {
  id: string;
  created_at: string;
  updated_at?: string;
  owner_id: string;
  property_type: string;
  listing_type: string;
  title: string;
  description: string;
  location_coordinates: any;
  price: number;
  price_period?: string;
  image_urls: string[];
  status: string;
  // Additional fields for our new schema
  currency?: string;
  location_address?: string;
  location_county?: string;
  location_town?: string;
  location_neighborhood?: string;
  amenities?: string[];
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number;
  contact_phone?: string;
  contact_email?: string;
  is_featured?: boolean;
  view_count?: number;
  inquiry_count?: number;
  favorited_count?: number;
}

const extractCoordinates = (locationCoords: any): { latitude: number; longitude: number } => {
  if (!locationCoords) {
    return { latitude: -1.286389, longitude: 36.817223 };
  }
  
  const lat = locationCoords.lat || locationCoords.latitude || 0;
  const lng = locationCoords.lng || locationCoords.longitude || 0;
  
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return { latitude: -1.286389, longitude: 36.817223 };
  }
  
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { latitude: -1.286389, longitude: 36.817223 };
  }
  
  if (lat === 0 && lng === 0) {
    return { latitude: -1.286389, longitude: 36.817223 };
  }
  
  return { latitude: lat, longitude: lng };
};

const transformRowToProperty = (row: PropertyRow): Property => {
  const coordinates = extractCoordinates(row.location_coordinates);
  
  return {
    id: row.id,
    owner_id: row.owner_id,
    title: row.title,
    description: row.description,
    property_type: (row.property_type as PropertyType) || 'houses',
    price: row.price,
    price_period: (row.price_period as 'monthly' | 'yearly' | 'one_time') || 'monthly',
    currency: 'KSH',
    location: {
      address: row.location_address || 'Address not provided',
      coordinates,
      county: row.location_county || 'Not specified',
      town: row.location_town || 'Not specified'
    },
    images: row.image_urls || [],
    amenities: row.amenities || [],
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    area_sqm: row.area_sqm,
    status: (row.status as PropertyStatus) || 'available',
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

const validateCoordinates = (lat: number, lng: number): void => {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error('Coordinates must be numbers');
  }
  if (isNaN(lat) || isNaN(lng)) {
    throw new Error('Invalid coordinates: NaN values not allowed');
  }
  if (lat < -90 || lat > 90) {
    throw new Error('Latitude must be between -90 and 90 degrees');
  }
  if (lng < -180 || lng > 180) {
    throw new Error('Longitude must be between -180 and 180 degrees');
  }
};

const transformPropertyToRow = (property: PropertyFormData, ownerId: string): Partial<PropertyRow> => {
  validateCoordinates(property.location.coordinates.latitude, property.location.coordinates.longitude);
  
  return {
    owner_id: ownerId,
    property_type: property.property_type,
    listing_type: 'rent',
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
export class PropertyService {
  private tableName = 'property_listings';

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    const configured = checkSupabaseConfigured();
    // Supabase configured check done
    return configured;
  }

  /**
   * Fetch properties with search and filter options
   */
  async fetchProperties(searchQuery: PropertySearchQuery): Promise<{
    properties: Property[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalResults: number;
      hasMore: boolean;
    };
  }> {
    if (!this.isConfigured()) {
      throw new Error('Supabase is not configured. Please check your environment variables.');
    }
    
    try {

      let query = supabase
        .from('property_listings')
        .select('*', { count: 'exact' }) as any;

      // Never surface Play Store reviewer/test content in public browse lists
      if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
        query = query.not(
          'owner_id',
          'in',
          formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS)
        );
      }

      // Apply filters
      const { filters } = searchQuery;

      if (filters.property_type) {
        query = query.eq('property_type', filters.property_type);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      } else {
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
      if (hasLocation && filters.location?.county) {
        query = query.ilike('location_county', `%${filters.location.county}%`);
      }

      if (hasLocation && filters.location?.town) {
        query = query.ilike('location_town', `%${filters.location.town}%`);
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
        const message = error?.message || 'Unknown error';
        throw new Error(`Failed to fetch properties: ${message}`);
      }

      const properties = (data || []).map((row: any) => transformRowToProperty(row as PropertyRow));
      const totalResults = count || 0;
      const totalPages = Math.ceil(totalResults / limit);
      const hasMore = page < totalPages;

      // Apply location-based filtering if specified
      let filteredProperties = properties;
      if (hasLocation && filters.location?.center_coordinates && filters.location?.radius_km) {
        filteredProperties = this.filterPropertiesByDistance(
          properties,
          filters.location.center_coordinates,
          filters.location.radius_km
        );
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
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Get a single property by ID
   */
  async getPropertyById(propertyId: string): Promise<Property | null> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Supabase is not configured. Please check your environment variables.');
      }

      const { data, error } = await supabase
        .from('property_listings')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Property not found
        }
        throw new Error(`Failed to fetch property: ${error.message}`);
      }

      return transformRowToProperty(data as any as PropertyRow);
    } catch (error: any) {
      
      throw error;
    }
  }

generateUUID = (): string => {
  // Check if the native crypto API is available safely
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback: Standard RFC4122 version 4 compliant UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

  /**
   * Create a new property listing with image uploads
   */
  async createProperty(propertyData: PropertyFormData, ownerId: string): Promise<Property> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Supabase is not configured. Please check your environment variables.');
      }

      // Ensure the property category exists (auto-create if new)
      await categoryManagementService.ensureCategoryExists(
        'property',
        propertyData.property_type,
        this.formatPropertyTypeName(propertyData.property_type)
      );

      // Create property record first to get the ID
      const propertyId = this.generateUUID();
      let uploadedImageUrls: string[] = [];

      // Handle image uploads if there are images
      if (propertyData.images && propertyData.images.length > 0) {
        try {
          // Convert image URIs to File objects for upload
          const imageFiles: Blob[] = [];
          
          for (const imageUri of propertyData.images) {
            try {
              const response = await fetch(imageUri);
              const blob = await response.blob();
              imageFiles.push(blob);
            } catch (fetchError) {
              
              // Continue with other images
            }
          }

          if (imageFiles.length > 0) {
            // Upload images to storage
            const uploadResults = await storageService.uploadPropertyImages(
              propertyId,
              ownerId,
              imageFiles
            );

            // Filter successful uploads and get URLs
            const successfulUploads = uploadResults.filter(result => result.success);
            uploadedImageUrls = successfulUploads
              .map(result => result.data?.publicUrl)
              .filter(url => url) as string[];

          }
        } catch (uploadError) {
          
          // Continue with property creation without images
        }
      }

      // Prepare row data with uploaded image URLs
      const rowData = {
        ...transformPropertyToRow(propertyData, ownerId),
        id: propertyId,
        image_urls: uploadedImageUrls
      };

      const { data, error } = await supabase
        .from('property_listings')
        .insert(rowData as any)
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
              await supabase.storage
                .from('property-images')
                .remove(filePaths);
            }
          } catch (cleanupError) {
            
          }
        }
        throw new Error(`Failed to create property: ${error.message}`);
      }

      return transformRowToProperty(data as any as PropertyRow);
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Update an existing property
   */
  async updateProperty(propertyId: string, updates: Partial<PropertyFormData>): Promise<Property> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Supabase not configured');
      }

      // Transform updates to database format
      const updateData: Partial<PropertyRow> = {
        updated_at: new Date().toISOString()
      };

      if (updates.title) updateData.title = updates.title;
      if (updates.description) updateData.description = updates.description;
      if (updates.property_type) updateData.property_type = updates.property_type;
      if (updates.price) updateData.price = updates.price;
      if (updates.images) updateData.image_urls = updates.images;
      if (updates.amenities) updateData.amenities = updates.amenities;
      if (updates.bedrooms) updateData.bedrooms = updates.bedrooms;
      if (updates.bathrooms) updateData.bathrooms = updates.bathrooms;
      if (updates.area_sqm) updateData.area_sqm = updates.area_sqm;
      if (updates.contact_phone) updateData.contact_phone = updates.contact_phone;
      if (updates.contact_email) updateData.contact_email = updates.contact_email;

      if (updates.location) {
        updateData.location_address = updates.location.address;
        updateData.location_county = updates.location.county;
        updateData.location_town = updates.location.town;
        updateData.location_coordinates = {
          lat: updates.location.coordinates.latitude,
          lng: updates.location.coordinates.longitude
        };
      }

      const { data, error } = await supabase
        .from('property_listings')
        .update(updateData)
        .eq('id', propertyId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update property: ${error.message}`);
      }

      return transformRowToProperty(data as any as PropertyRow);
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Delete a property
   */
  async deleteProperty(propertyId: string): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Supabase not configured');
      }

      const { error } = await supabase
        .from('property_listings')
        .delete()
        .eq('id', propertyId);

      if (error) {
        throw new Error(`Failed to delete property: ${error.message}`);
      }

      return true;
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Get user's properties
   */
  async getUserProperties(userId: string): Promise<Property[]> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Supabase is not configured. Please check your environment variables.');
      }

      const { data, error } = await supabase
        .from('property_listings')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch user properties: ${error.message}`);
      }

      return (data || []).map((row: any) => transformRowToProperty(row as PropertyRow));
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Update property status
   */
  async updatePropertyStatus(propertyId: string, status: PropertyStatus): Promise<Property> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Supabase is not configured. Please check your environment variables.');
      }

      const { data, error } = await supabase
        .from('property_listings')
        .update({ 
          status
        })
        .eq('id', propertyId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update property status: ${error.message}`);
      }

      return transformRowToProperty(data as any as PropertyRow);
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Get property statistics
   */
  async getPropertyStats(): Promise<PropertyStats> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Supabase is not configured. Please check your environment variables.');
      }

      // Get basic counts
      const { count: totalProperties } = await supabase
        .from('property_listings')
        .select('*', { count: 'exact', head: true }) as any;

      const { count: availableProperties } = await supabase
        .from('property_listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available') as any;

      const { count: rentedProperties } = await supabase
        .from('property_listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rented') as any;

      const { count: soldProperties } = await supabase
        .from('property_listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sold') as any;

      // Get average price
      const { data: avgPriceData } = await supabase
        .from('property_listings')
        .select('price')
        .eq('status', 'available') as any;

      const averagePrice = avgPriceData && avgPriceData.length > 0
        ? avgPriceData.reduce((sum: number, item: any) => sum + item.price, 0) / avgPriceData.length
        : 0;

      // Get properties by type
      const { data: typeData } = await supabase
        .from('property_listings')
        .select('property_type') as any;

      const properties_by_type = (typeData || []).reduce((acc: any, item: any) => {
        const type = item.property_type as PropertyType;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<PropertyType, number>);

      // Get properties by county
      const { data: countyData } = await supabase
        .from('property_listings')
        .select('location_county') as any;

      const properties_by_county = (countyData || []).reduce((acc: any, item: any) => {
        const county = item.location_county || 'Unknown';
        acc[county] = (acc[county] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        total_properties: totalProperties || 0,
        available_properties: availableProperties || 0,
        rented_properties: rentedProperties || 0,
        sold_properties: soldProperties || 0,
        average_price: Math.round(averagePrice),
        properties_by_type,
        properties_by_county
      };
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Filter properties by distance from a center point
   */
  private filterPropertiesByDistance(
    properties: Property[],
    centerCoordinates: { latitude: number; longitude: number },
    radiusKm: number
  ): Property[] {
    return properties.filter(property => {
      const distance = this.calculateDistance(
        centerCoordinates,
        property.location.coordinates
      );
      return distance <= radiusKm;
    });
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(
    from: { latitude: number; longitude: number },
    to: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(to.latitude - from.latitude);
    const dLon = this.toRadians(to.longitude - from.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
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
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get properties near a location with enhanced proximity ranking
   */
  async getPropertiesNearLocation(
    centerCoordinates: { latitude: number; longitude: number },
    radiusKm: number = 10,
    limit: number = 20,
    propertyType?: PropertyType
  ): Promise<Property[]> {
    try {
      const searchQuery: PropertySearchQuery = {
        filters: {
          property_type: propertyType,
          location: {
            center_coordinates: centerCoordinates,
            radius_km: radiusKm
          }
        },
        sort_by: 'date_newest',
        page: 1,
        limit: limit * 3
      };

      const result = await this.fetchProperties(searchQuery);
      
      const nearbyResults = locationRecommendationService.rankByProximity(
        result.properties,
        centerCoordinates,
        limit
      );
      
      return nearbyResults.map(r => r.item);
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Get recommended properties based on user location
   */
  async getRecommendedPropertiesNearby(
    useCurrentLocation: boolean = true,
    radiusKm: number = 10,
    limit: number = 20,
    propertyType?: PropertyType
  ): Promise<{ property: Property; distance?: number; distanceFormatted?: string }[]> {
    try {
      const searchQuery: PropertySearchQuery = {
        filters: {
          property_type: propertyType,
          status: 'available'
        },
        sort_by: 'date_newest',
        page: 1,
        limit: limit * 3
      };

      const result = await this.fetchProperties(searchQuery);
      
      const nearbyResults = await locationRecommendationService.getNearbyRecommendations(
        result.properties,
        {
          radiusKm,
          maxResults: limit,
          useCurrentLocation,
          fallbackLocation: { latitude: -1.286389, longitude: 36.817223 }
        }
      );
      
      return nearbyResults.map(r => ({
        property: r.item,
        distance: r.distance,
        distanceFormatted: r.distanceFormatted
      }));
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Get properties in a specific county or town
   */
  async getPropertiesByLocation(
    county?: string,
    town?: string,
    propertyType?: PropertyType,
    limit: number = 20
  ): Promise<Property[]> {
    try {
      const searchQuery: PropertySearchQuery = {
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
    } catch (error: any) {
      
      throw error;
    }
  }


  /**
   * Format property type to display name
   */
  private formatPropertyTypeName(type: string): string {
    const typeFormatMap: { [key: string]: string } = {
      'houses': 'Houses',
      'apartments': 'Apartments',
      'one_bedroom': '1 Bedroom',
      'two_bedroom': '2 Bedroom',
      'three_bedroom': '3 Bedroom',
      'five_bedroom': '5 Bedroom',
      'bedsitters': 'Bedsitters',
      'commercial': 'Commercial',
      'industrial': 'Industrial',
      'offices': 'Offices',
      'land_plots': 'Land/Plots',
      'container_house': 'Container House',
      'cabin': 'Cabin',
      'farm_house': 'Farm House',
      'cottage': 'Cottage',
      'condo': 'Condo',
      'bungalow': 'Bungalow',
      'villa': 'Villa',
      'town_house': 'Town House',
      'mansionate': 'Mansionate',
      'duplex_house': 'Duplex House'
    };

    return typeFormatMap[type] || type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }
}

let instance: PropertyService | null = null;
function getInstance(): PropertyService {
  if (!instance) instance = new PropertyService();
  return instance;
}

export const propertyService = new Proxy({} as PropertyService, {
  get(target, prop) {
    const service = getInstance();
    const value = (service as any)[prop];
    return typeof value === 'function' ? value.bind(service) : value;
  }
});

// Export individual functions for direct use
export const {
  fetchProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getUserProperties,
  updatePropertyStatus,
  getPropertyStats
} = propertyService;

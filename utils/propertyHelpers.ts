/**
 * Property utility functions for LinkApp
 * Demonstrates usage of the new property types
 */

import { Property, PropertyType, PropertyStatus, KENYAN_COUNTIES, COMMON_AMENITIES, LocationCoordinates } from '../types/property';

/**
 * Format property price with KSH currency
 */
export const formatPrice = (price: number, period?: string): string => {
  const formattedPrice = `KSH ${price.toLocaleString()}`;
  if (period && period !== 'one_time') {
    return `${formattedPrice}/${period === 'monthly' ? 'month' : 'year'}`;
  }
  return formattedPrice;
};

/**
 * Get property type display name
 */
export const getPropertyTypeLabel = (type: PropertyType): string => {
  const labels: Partial<Record<PropertyType, string>> = {
    houses: 'Houses',
    house: 'House',
    apartments: 'Apartments',
    apartment: 'Apartment',
    one_bedroom: '1 Bedroom',
    two_bedroom: '2 Bedroom',
    three_bedroom: '3 Bedroom',
    bedsitters: 'Bedsitters',
    bedsitter: 'Bedsitter',
    commercial: 'Commercial',
    industrial: 'Industrial',
    office: 'Office',
    offices: 'Offices',
    office_space: 'Office Space',
    land_plots: 'Land/Plots',
    land: 'Land',
    penthouse: 'Penthouse',
    student_housing: 'Student Housing',
    studio: 'Studio',
    villa: 'Villa',
    townhouse: 'Townhouse',
    shop: 'Shop',
    warehouse: 'Warehouse'
  };
  return labels[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * Get property status display name and color
 */
export const getPropertyStatusInfo = (status: PropertyStatus) => {
  const statusInfo: Record<PropertyStatus, { label: string; color: string }> = {
    available: { label: 'Available', color: '#10B981' },
    rented: { label: 'Rented', color: '#F59E0B' },
    sold: { label: 'Sold', color: '#EF4444' },
    pending: { label: 'Pending', color: '#6B7280' },
    expired: { label: 'Expired', color: '#9CA3AF' },
    draft: { label: 'Draft', color: '#9CA3AF' }
  };
  return statusInfo[status] ?? { label: 'Unknown', color: '#9CA3AF' };
};

/**
 * Check if property is available for inquiries
 */
export const isPropertyAvailable = (property: Property): boolean => {
  return property.status === 'available';
};

/**
 * Generate property summary text
 */
export const getPropertySummary = (property: Property): string => {
  const parts = [];
  
  if (property.bedrooms) parts.push(`${property.bedrooms} bed`);
  if (property.bathrooms) parts.push(`${property.bathrooms} bath`);
  if (property.area_sqm) parts.push(`${property.area_sqm}m²`);
  
  return parts.join(' • ');
};

/**
 * Get distance text for property location (placeholder for future GPS implementation)
 */
export const getDistanceText = (property: Property): string => {
  // TODO: Implement actual distance calculation when GPS is added
  return `${property.location.town}, ${property.location.county}`;
};

/**
 * Validate property form data
 */
export const validatePropertyData = (data: Partial<Property>): string[] => {
  const errors: string[] = [];
  
  if (!data.title || data.title.trim().length < 5) {
    errors.push('Title must be at least 5 characters long');
  }
  
  if (!data.price || data.price <= 0) {
    errors.push('Price must be greater than 0');
  }
  
  if (!data.property_type) {
    errors.push('Property type is required');
  }
  
  if (!data.location?.address || data.location.address.trim().length < 10) {
    errors.push('Address must be at least 10 characters long');
  }
  
  if (!data.location?.county) {
    errors.push('County is required');
  }
  
  if (!data.location?.town || data.location.town.trim().length < 2) {
    errors.push('Town is required');
  }
  
  if (data.images && data.images.length > 10) {
    errors.push('Maximum 10 images allowed');
  }
  
  return errors;
};

/**
 * Get available counties for dropdown
 */
export const getCounties = () => KENYAN_COUNTIES;

/**
 * Get common amenities for dropdown
 */
export const getCommonAmenities = () => COMMON_AMENITIES;

/**
 * Generate property listing URL slug
 */
export const generatePropertySlug = (property: Property): string => {
  return `${property.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${property.id}`;
};

/**
 * Check if user can edit property (ownership check)
 */
export const canEditProperty = (property: Property, currentUserId: string): boolean => {
  return property.owner_id === currentUserId;
};

/**
 * Calculate property listing quality score
 */
export const calculatePropertyScore = (property: Property): number => {
  let score = 0;
  
  // Base score
  score += 20;
  
  // Images (up to 30 points)
  score += Math.min(property.images.length * 5, 30);
  
  // Description (15 points)
  if (property.description && property.description.length > 50) {
    score += 15;
  }
  
  // Amenities (up to 20 points)
  score += Math.min(property.amenities.length * 2, 20);
  
  // Contact info (15 points total)
  if (property.contact_phone) score += 10;
  if (property.contact_email) score += 5;
  
  return Math.min(score, 100);
};

/**
 * Get property quality rating and suggestions
 */
export const getPropertyQualityRating = (property: Property): {
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  score: number;
  suggestions: string[];
} => {
  const score = calculatePropertyScore(property);
  const suggestions: string[] = [];
  
  if (property.images.length < 3) {
    suggestions.push('Add more photos to showcase your property');
  }
  
  if (!property.description || property.description.length < 50) {
    suggestions.push('Write a detailed description');
  }
  
  if (property.amenities.length < 3) {
    suggestions.push('List more amenities and features');
  }
  
  if (!property.contact_phone) {
    suggestions.push('Add your phone number for easier contact');
  }
  
  let rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  if (score >= 85) rating = 'Excellent';
  else if (score >= 70) rating = 'Good';
  else if (score >= 50) rating = 'Fair';
  else rating = 'Poor';
  
  return { rating, score, suggestions };
};

/**
 * Validate if coordinates are valid for mapping
 */
export const isValidCoordinate = (coord: LocationCoordinates): boolean => {
  const { latitude, longitude } = coord;
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
};

/**
 * Filter properties with valid coordinates for map display
 */
export const filterPropertiesWithValidCoordinates = (properties: Property[]): Property[] => {
  return properties.filter(property => isValidCoordinate(property.location.coordinates));
};

/**
 * Get properties with invalid coordinates (for debugging/reporting)
 */
export const getPropertiesWithInvalidCoordinates = (properties: Property[]): Property[] => {
  return properties.filter(property => !isValidCoordinate(property.location.coordinates));
};

/**
 * Normalize coordinates from various formats
 */
export const normalizeCoordinates = (coords: any): LocationCoordinates => {
  const lat = coords?.lat || coords?.latitude || 0;
  const lng = coords?.lng || coords?.longitude || 0;
  
  if (!isValidCoordinate({ latitude: lat, longitude: lng })) {
    return { latitude: -1.286389, longitude: 36.817223 };
  }
  
  return { latitude: lat, longitude: lng };
};

/**
 * Generate property sharing text
 */
export const generateSharingText = (property: Property): string => {
  const summary = getPropertySummary(property);
  return `Check out this ${getPropertyTypeLabel(property.property_type).toLowerCase()}: ${property.title}\n\n${formatPrice(property.price)}${summary ? ` • ${summary}` : ''}\n\nLocation: ${property.location.address}\n\nShared via LinkApp`;
};

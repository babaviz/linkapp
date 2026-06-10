/**
 * Location Validation and Error Handling Utilities
 * Comprehensive validation for coordinates, addresses, and location data
 */

import { LocationCoordinates, LocationBounds, MapRegion, LocationSearchResult } from '../types/property';

// Kenya bounds for regional validation
const KENYA_BOUNDS: LocationBounds = {
  north: 5.0,
  south: -4.7,
  east: 42.0,
  west: 33.9,
};

// Uganda bounds
const UGANDA_BOUNDS: LocationBounds = {
  north: 4.2,
  south: -1.5,
  east: 35.0,
  west: 29.5,
};

// Tanzania bounds
const TANZANIA_BOUNDS: LocationBounds = {
  north: -0.9,
  south: -11.7,
  east: 40.6,
  west: 29.3,
};

// Global bounds
const GLOBAL_BOUNDS: LocationBounds = {
  north: 90,
  south: -90,
  east: 180,
  west: -180,
};

// Validation error types
export interface LocationValidationError {
  field: string;
  message: string;
  code: string;
}

export interface LocationValidationResult {
  isValid: boolean;
  errors: LocationValidationError[];
  warnings: LocationValidationError[];
}

/**
 * Validate coordinates are within valid ranges
 */
export const validateCoordinates = (
  coordinates: LocationCoordinates,
  strict: boolean = false
): LocationValidationResult => {
  const errors: LocationValidationError[] = [];
  const warnings: LocationValidationError[] = [];
  
  // Check if coordinates exist
  if (!coordinates) {
    errors.push({
      field: 'coordinates',
      message: 'Coordinates are required',
      code: 'COORDINATES_REQUIRED'
    });
    return { isValid: false, errors, warnings };
  }
  
  // Check latitude
  if (typeof coordinates.latitude !== 'number') {
    errors.push({
      field: 'latitude',
      message: 'Latitude must be a number',
      code: 'LATITUDE_TYPE_INVALID'
    });
  } else if (isNaN(coordinates.latitude)) {
    errors.push({
      field: 'latitude',
      message: 'Latitude cannot be NaN',
      code: 'LATITUDE_NAN'
    });
  } else if (coordinates.latitude < -90 || coordinates.latitude > 90) {
    errors.push({
      field: 'latitude',
      message: 'Latitude must be between -90 and 90 degrees',
      code: 'LATITUDE_OUT_OF_RANGE'
    });
  }
  
  // Check longitude
  if (typeof coordinates.longitude !== 'number') {
    errors.push({
      field: 'longitude',
      message: 'Longitude must be a number',
      code: 'LONGITUDE_TYPE_INVALID'
    });
  } else if (isNaN(coordinates.longitude)) {
    errors.push({
      field: 'longitude',
      message: 'Longitude cannot be NaN',
      code: 'LONGITUDE_NAN'
    });
  } else if (coordinates.longitude < -180 || coordinates.longitude > 180) {
    errors.push({
      field: 'longitude',
      message: 'Longitude must be between -180 and 180 degrees',
      code: 'LONGITUDE_OUT_OF_RANGE'
    });
  }
  
  // Check precision (warn if too many decimal places)
  if (strict && typeof coordinates.latitude === 'number') {
    const latDecimals = (coordinates.latitude.toString().split('.')[1] || '').length;
    if (latDecimals > 6) {
      warnings.push({
        field: 'latitude',
        message: 'Latitude has excessive precision (>6 decimal places)',
        code: 'LATITUDE_PRECISION_HIGH'
      });
    }
  }
  
  if (strict && typeof coordinates.longitude === 'number') {
    const lngDecimals = (coordinates.longitude.toString().split('.')[1] || '').length;
    if (lngDecimals > 6) {
      warnings.push({
        field: 'longitude',
        message: 'Longitude has excessive precision (>6 decimal places)',
        code: 'LONGITUDE_PRECISION_HIGH'
      });
    }
  }
  
  // Check for suspicious coordinates (0,0) or repeated digits
  if (coordinates.latitude === 0 && coordinates.longitude === 0) {
    warnings.push({
      field: 'coordinates',
      message: 'Coordinates are at null island (0,0) - verify accuracy',
      code: 'COORDINATES_NULL_ISLAND'
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate coordinates are within regional bounds
 */
export const validateCoordinatesInRegion = (
  coordinates: LocationCoordinates,
  region: 'kenya' | 'uganda' | 'tanzania' | 'global' = 'global'
): LocationValidationResult => {
  const baseValidation = validateCoordinates(coordinates);
  if (!baseValidation.isValid) {
    return baseValidation;
  }
  
  const bounds = getRegionBounds(region);
  const errors: LocationValidationError[] = [...baseValidation.errors];
  const warnings: LocationValidationError[] = [...baseValidation.warnings];
  
  if (!isCoordinateWithinBounds(coordinates, bounds)) {
    errors.push({
      field: 'coordinates',
      message: `Coordinates are outside ${region} region bounds`,
      code: 'COORDINATES_OUTSIDE_REGION'
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Get bounds for a specific region
 */
export const getRegionBounds = (region: string): LocationBounds => {
  switch (region.toLowerCase()) {
    case 'kenya':
      return KENYA_BOUNDS;
    case 'uganda':
      return UGANDA_BOUNDS;
    case 'tanzania':
      return TANZANIA_BOUNDS;
    default:
      return GLOBAL_BOUNDS;
  }
};

/**
 * Check if coordinates are within bounds
 */
export const isCoordinateWithinBounds = (
  coordinates: LocationCoordinates,
  bounds: LocationBounds
): boolean => {
  return (
    coordinates.latitude >= bounds.south &&
    coordinates.latitude <= bounds.north &&
    coordinates.longitude >= bounds.west &&
    coordinates.longitude <= bounds.east
  );
};

/**
 * Validate address string format
 */
export const validateAddress = (
  address: string,
  required: boolean = false
): LocationValidationResult => {
  const errors: LocationValidationError[] = [];
  const warnings: LocationValidationError[] = [];
  
  if (required && (!address || address.trim().length === 0)) {
    errors.push({
      field: 'address',
      message: 'Address is required',
      code: 'ADDRESS_REQUIRED'
    });
    return { isValid: false, errors, warnings };
  }
  
  if (address && typeof address !== 'string') {
    errors.push({
      field: 'address',
      message: 'Address must be a string',
      code: 'ADDRESS_TYPE_INVALID'
    });
  } else if (address) {
    const trimmedAddress = address.trim();
    
    // Check minimum length
    if (trimmedAddress.length < 3) {
      errors.push({
        field: 'address',
        message: 'Address must be at least 3 characters long',
        code: 'ADDRESS_TOO_SHORT'
      });
    }
    
    // Check maximum length
    if (trimmedAddress.length > 500) {
      errors.push({
        field: 'address',
        message: 'Address must be less than 500 characters',
        code: 'ADDRESS_TOO_LONG'
      });
    }
    
    // Check for suspicious patterns
    if (/^\d+,\s*-?\d+(\.\d+)?$/.test(trimmedAddress)) {
      warnings.push({
        field: 'address',
        message: 'Address appears to be coordinates rather than a readable address',
        code: 'ADDRESS_LOOKS_LIKE_COORDINATES'
      });
    }
    
    // Check for repeated characters
    if (/(.)\1{10,}/.test(trimmedAddress)) {
      warnings.push({
        field: 'address',
        message: 'Address contains suspicious repeated characters',
        code: 'ADDRESS_REPEATED_CHARACTERS'
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate map region bounds
 */
export const validateMapRegion = (region: MapRegion): LocationValidationResult => {
  const errors: LocationValidationError[] = [];
  const warnings: LocationValidationError[] = [];
  
  // Validate center coordinates
  const centerValidation = validateCoordinates({
    latitude: region.latitude,
    longitude: region.longitude
  });
  
  if (!centerValidation.isValid) {
    errors.push(...centerValidation.errors.map(error => ({
      ...error,
      field: `region.${error.field}`
    })));
  }
  
  // Validate deltas
  if (typeof region.latitudeDelta !== 'number' || region.latitudeDelta <= 0) {
    errors.push({
      field: 'latitudeDelta',
      message: 'Latitude delta must be a positive number',
      code: 'LATITUDE_DELTA_INVALID'
    });
  } else if (region.latitudeDelta > 180) {
    errors.push({
      field: 'latitudeDelta',
      message: 'Latitude delta cannot exceed 180 degrees',
      code: 'LATITUDE_DELTA_TOO_LARGE'
    });
  }
  
  if (typeof region.longitudeDelta !== 'number' || region.longitudeDelta <= 0) {
    errors.push({
      field: 'longitudeDelta',
      message: 'Longitude delta must be a positive number',
      code: 'LONGITUDE_DELTA_INVALID'
    });
  } else if (region.longitudeDelta > 360) {
    errors.push({
      field: 'longitudeDelta',
      message: 'Longitude delta cannot exceed 360 degrees',
      code: 'LONGITUDE_DELTA_TOO_LARGE'
    });
  }
  
  // Warn about very small or very large regions
  if (region.latitudeDelta < 0.001 || region.longitudeDelta < 0.001) {
    warnings.push({
      field: 'region',
      message: 'Map region is very zoomed in - may affect performance',
      code: 'REGION_TOO_SMALL'
    });
  }
  
  if (region.latitudeDelta > 90 || region.longitudeDelta > 180) {
    warnings.push({
      field: 'region',
      message: 'Map region is very zoomed out - may not be useful',
      code: 'REGION_TOO_LARGE'
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate search results for consistency and accuracy
 */
export const validateSearchResults = (
  results: LocationSearchResult[],
  query: string
): LocationValidationResult => {
  const errors: LocationValidationError[] = [];
  const warnings: LocationValidationError[] = [];
  
  if (!Array.isArray(results)) {
    errors.push({
      field: 'results',
      message: 'Search results must be an array',
      code: 'RESULTS_TYPE_INVALID'
    });
    return { isValid: false, errors, warnings };
  }
  
  // Validate each result
  results.forEach((result, index) => {
    const coordinateValidation = validateCoordinates(result.coordinate);
    if (!coordinateValidation.isValid) {
      errors.push(...coordinateValidation.errors.map(error => ({
        ...error,
        field: `results[${index}].${error.field}`
      })));
    }
    
    // Validate required fields
    if (!result.formattedAddress || result.formattedAddress.trim().length === 0) {
      errors.push({
        field: `results[${index}].formattedAddress`,
        message: 'Formatted address is required',
        code: 'FORMATTED_ADDRESS_REQUIRED'
      });
    }
    
    if (!result.name || result.name.trim().length === 0) {
      warnings.push({
        field: `results[${index}].name`,
        message: 'Result name is empty',
        code: 'RESULT_NAME_EMPTY'
      });
    }
    
    // Validate distance if provided
    if (result.distance !== undefined) {
      if (typeof result.distance !== 'number' || result.distance < 0) {
        warnings.push({
          field: `results[${index}].distance`,
          message: 'Distance should be a non-negative number',
          code: 'DISTANCE_INVALID'
        });
      }
    }
  });
  
  // Check for duplicate results
  const uniqueCoordinates = new Set();
  results.forEach((result, index) => {
    const key = `${result.coordinate.latitude.toFixed(6)},${result.coordinate.longitude.toFixed(6)}`;
    if (uniqueCoordinates.has(key)) {
      warnings.push({
        field: `results[${index}]`,
        message: 'Duplicate coordinate found in results',
        code: 'DUPLICATE_COORDINATE'
      });
    }
    uniqueCoordinates.add(key);
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export const calculateDistance = (
  from: LocationCoordinates,
  to: LocationCoordinates
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Sanitize coordinates to safe precision
 */
export const sanitizeCoordinates = (
  coordinates: LocationCoordinates,
  precision: number = 6
): LocationCoordinates => {
  const factor = Math.pow(10, precision);
  return {
    latitude: Math.round(coordinates.latitude * factor) / factor,
    longitude: Math.round(coordinates.longitude * factor) / factor
  };
};

/**
 * Validate and sanitize location input
 */
export const validateAndSanitizeLocation = (
  coordinates: LocationCoordinates,
  address?: string,
  region: string = 'global',
  strict: boolean = false
): {
  isValid: boolean;
  sanitizedCoordinates: LocationCoordinates | null;
  sanitizedAddress: string | null;
  errors: LocationValidationError[];
  warnings: LocationValidationError[];
} => {
  const allErrors: LocationValidationError[] = [];
  const allWarnings: LocationValidationError[] = [];
  
  // Validate coordinates
  const coordValidation = strict 
    ? validateCoordinatesInRegion(coordinates, region as any)
    : validateCoordinates(coordinates);
  
  allErrors.push(...coordValidation.errors);
  allWarnings.push(...coordValidation.warnings);
  
  // Validate address if provided
  if (address) {
    const addressValidation = validateAddress(address);
    allErrors.push(...addressValidation.errors);
    allWarnings.push(...addressValidation.warnings);
  }
  
  // Sanitize if valid
  const sanitizedCoordinates = allErrors.length === 0 
    ? sanitizeCoordinates(coordinates)
    : null;
  
  const sanitizedAddress = address && allErrors.length === 0 
    ? address.trim()
    : null;
  
  return {
    isValid: allErrors.length === 0,
    sanitizedCoordinates,
    sanitizedAddress,
    errors: allErrors,
    warnings: allWarnings
  };
};

/**
 * Format validation errors for user display
 */
export const formatValidationErrors = (
  errors: LocationValidationError[],
  includeWarnings: boolean = false,
  warnings: LocationValidationError[] = []
): string => {
  const allIssues = includeWarnings ? [...errors, ...warnings] : errors;
  
  if (allIssues.length === 0) {
    return '';
  }
  
  if (allIssues.length === 1) {
    return allIssues[0].message;
  }
  
  return allIssues.map((issue, index) => 
    `${index + 1}. ${issue.message}`
  ).join('\n');
};

/**
 * Check if location is likely to be in a populated area (basic heuristic)
 */
export const isLikelyPopulatedArea = (coordinates: LocationCoordinates): boolean => {
  // Very basic heuristic - avoid obvious water bodies and remote areas
  // This is a simplified check and would need more sophisticated logic in production
  
  // Avoid coordinates that are exactly on major latitude/longitude lines
  if (coordinates.latitude % 1 === 0 && coordinates.longitude % 1 === 0) {
    return false;
  }
  
  // Avoid some obvious ocean areas (very simplified)
  const obviousOceanAreas = [
    // Atlantic Ocean
    { lat: 0, lng: -30, radius: 20 },
    // Pacific Ocean  
    { lat: 0, lng: -150, radius: 30 },
    // Indian Ocean
    { lat: -20, lng: 80, radius: 20 },
  ];
  
  for (const ocean of obviousOceanAreas) {
    const distance = calculateDistance(
      coordinates,
      { latitude: ocean.lat, longitude: ocean.lng }
    );
    if (distance < ocean.radius) {
      return false;
    }
  }
  
  return true;
};

// Export commonly used bounds
export const REGION_BOUNDS = {
  KENYA: KENYA_BOUNDS,
  UGANDA: UGANDA_BOUNDS, 
  TANZANIA: TANZANIA_BOUNDS,
  GLOBAL: GLOBAL_BOUNDS,
};

// Export validation constants
export const VALIDATION_CONSTANTS = {
  MIN_ADDRESS_LENGTH: 3,
  MAX_ADDRESS_LENGTH: 500,
  DEFAULT_COORDINATE_PRECISION: 6,
  MAX_LATITUDE: 90,
  MIN_LATITUDE: -90,
  MAX_LONGITUDE: 180,
  MIN_LONGITUDE: -180,
};

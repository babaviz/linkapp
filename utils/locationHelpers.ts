/**
 * Location utility functions
 */

export type NormalizedUserLocation = {
  county: string;
  town: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
};

const cleanString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const cleanNumber = (value: unknown): number | undefined => {
  if (typeof value !== 'number') return undefined;
  return Number.isFinite(value) ? value : undefined;
};

/**
 * Normalize different location shapes into `{ town, county, coordinates? }`.
 *
 * Supports:
 * - Supabase auth metadata: `{ city, country }`
 * - Stored prefs / profile: `{ town, county, coordinates: { latitude, longitude } }`
 * - Legacy variants: `{ city, country }`, `{ town, county }`, `{ lat/lng }`
 */
export const normalizeUserLocation = (input: unknown): NormalizedUserLocation | undefined => {
  if (!input || typeof input !== 'object') return undefined;

  const obj = input as Record<string, unknown>;

  const town = cleanString(obj['town']) ?? cleanString(obj['city']);
  const county = cleanString(obj['county']) ?? cleanString(obj['country']);

  const coordsRaw = obj['coordinates'];
  const coords =
    coordsRaw && typeof coordsRaw === 'object'
      ? (coordsRaw as Record<string, unknown>)
      : undefined;

  const latitude =
    cleanNumber(coords?.['latitude']) ??
    cleanNumber(coords?.['lat']) ??
    cleanNumber(obj['latitude']) ??
    cleanNumber(obj['lat']);

  const longitude =
    cleanNumber(coords?.['longitude']) ??
    cleanNumber(coords?.['lng']) ??
    cleanNumber(coords?.['lon']) ??
    cleanNumber(obj['longitude']) ??
    cleanNumber(obj['lng']) ??
    cleanNumber(obj['lon']);

  const coordinates =
    latitude !== undefined && longitude !== undefined ? { latitude, longitude } : undefined;

  if (!town && !county && !coordinates) return undefined;

  return {
    town: town || '',
    county: county || '',
    ...(coordinates ? { coordinates } : {}),
  };
};

/**
 * Safely converts a location object to a display string
 * Handles cases where location properties might be objects or undefined
 */
export const formatLocationDisplay = (location: any): string => {
  if (!location) return 'Location not specified';
  
  const getTownString = (town: any): string => {
    if (!town) return '';
    if (typeof town === 'string') return town;
    if (typeof town === 'object') {
      // Handle nested object structures
      return town.name || town.title || town.value || JSON.stringify(town).slice(0, 50);
    }
    return String(town);
  };
  
  const getCountyString = (county: any): string => {
    if (!county) return '';
    if (typeof county === 'string') return county;
    if (typeof county === 'object') {
      // Handle nested object structures
      return county.name || county.title || county.value || JSON.stringify(county).slice(0, 50);
    }
    return String(county);
  };
  
  const townStr = getTownString(location.town);
  const countyStr = getCountyString(location.county);
  const cityStr = getTownString(location.city);
  const countryStr = getCountyString(location.country);
  
  if (cityStr && countryStr) {
    return `${cityStr}, ${countryStr}`;
  } else if (townStr && countyStr) {
    return `${townStr}, ${countyStr}`;
  } else if (cityStr) {
    return cityStr;
  } else if (townStr) {
    return townStr;
  } else if (countyStr) {
    return countyStr;
  } else if (countryStr) {
    return countryStr;
  } else if (location.address) {
    return String(location.address);
  } else if (location.name) {
    return String(location.name);
  } else {
    return 'Location not specified';
  }
};

/**
 * Safely extracts location coordinates
 */
export const getLocationCoordinates = (location: any): { latitude?: number; longitude?: number } => {
  if (!location) return {};
  
  return {
    latitude: typeof location.latitude === 'number' ? location.latitude : undefined,
    longitude: typeof location.longitude === 'number' ? location.longitude : undefined
  };
};

export interface Property {
  id: string;
  title: string;
  description: string;
  property_type: PropertyType;
  category?: PropertyCategory;
  price: number;
  currency: string;
  /** monthly | yearly | one_time */
  price_period?: PricePeriod;
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  square_meters?: number;
  /** preferred canonical area field used across the app */
  area_sqm?: number;
  year_built?: number;
  status: PropertyStatus;
  location: {
    address: string;
    county: string;
    town: string;
    neighborhood?: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    landmarks?: string[];
  };
  images: string[];
  video_url?: string;
  amenities: string[];
  features?: string[];
  owner_id: string;
  agent_info?: {
    name: string;
    phone: string;
    email: string;
    company?: string;
  };
  /** direct contact details used throughout the UI */
  contact_phone?: string;
  contact_email?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  is_featured?: boolean;
  /** analytics counters (optional in demo/service transforms) */
  view_count?: number;
  inquiry_count?: number;
  favorited_count?: number;
}

export type PropertyType =
  // canonical single/plural and category sets used across demo data and services
  | 'house'
  | 'houses'
  | 'apartment'
  | 'apartments'
  | 'one_bedroom'
  | 'two_bedroom'
  | 'three_bedroom'
  | 'bedsitter'
  | 'bedsitters'
  | 'commercial'
  | 'industrial'
  | 'office'
  | 'offices'
  | 'office_space'
  | 'land'
  | 'land_plots'
  | 'penthouse'
  | 'student_housing'
  // additional types for completeness
  | 'studio'
  | 'villa'
  | 'townhouse'
  | 'shop'
  | 'warehouse'
  // newly added property types
  | 'container_house'
  | 'cabin'
  | 'farm_house'
  | 'cottage'
  | 'condo'
  | 'bungalow'
  | 'town_house'
  | 'five_bedroom'
  | 'mansionate'
  | 'duplex_house';

export type PropertyCategory = 'sale' | 'rent' | 'lease';

export type PropertyStatus = 
  | 'available' 
  | 'sold' 
  | 'rented' 
  | 'pending' 
  | 'expired'
  | 'draft';

export interface PropertyFilters {
  property_type?: PropertyType;
  status?: PropertyStatus;
  category?: PropertyCategory;
  /** canonical min/max naming used by services */
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  bathrooms?: number;
  location?: {
    county?: string;
    town?: string;
    /** geospatial search support used by services */
    center_coordinates?: { latitude: number; longitude: number };
    radius_km?: number;
  };
  amenities?: string[];
  features?: string[];
  is_featured?: boolean;
}

export interface PropertySearchQuery {
  search_text?: string;
  filters?: PropertyFilters;
  sort_by?: PropertySortBy;
  page?: number;
  limit?: number;
}

export type PropertySortBy =
  | 'date_newest'
  | 'date_oldest'
  | 'price_asc'
  | 'price_desc'
  | 'views_most'
  | 'views_least';

export interface PropertySearchResponse {
  properties: Property[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: PropertyFilters;
}

// Re-export alias used in some services
export type PropertyFilter = PropertyFilters;

// Common data structures used by services and UI
export type PricePeriod = 'monthly' | 'yearly' | 'one_time';

export interface PropertyFormData {
  title: string;
  description?: string;
  property_type: PropertyType;
  price: number;
  price_period?: PricePeriod;
  images: string[];
  amenities: string[];
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number;
  contact_phone?: string;
  contact_email?: string;
  location: {
    address: string;
    county: string;
    town: string;
    neighborhood?: string;
    coordinates: { latitude: number; longitude: number };
  };
}

export interface PropertyInquiry {
  id: string;
  property_id: string;
  inquirer_id: string;
  owner_id: string;
  message: string;
  contact_phone?: string;
  contact_email?: string;
  status: 'pending' | 'responded' | 'closed';
  created_at: string;
  responded_at?: string;
  response?: string;
}

export interface PropertyStats {
  total_properties: number;
  available_properties: number;
  rented_properties: number;
  sold_properties: number;
  average_price: number;
  properties_by_type: Record<PropertyType, number>;
  properties_by_county: Record<string, number>;
}

// Common property types as categories
export const PROPERTY_CATEGORIES = [
  // Existing categories
  { id: 'houses', name: 'Houses', label: 'Houses', description: 'Family homes & villas', icon: '🏠' },
  { id: 'apartments', name: 'Apartments', label: 'Apartments', description: 'Modern complexes', icon: '🏢' },
  { id: 'one_bedroom', name: '1 Bedroom', label: '1 Bedroom', description: 'Perfect for singles', icon: '🛏️' },
  { id: 'two_bedroom', name: '2 Bedroom', label: '2 Bedroom', description: 'Ideal for couples', icon: '🛏️' },
  { id: 'three_bedroom', name: '3 Bedroom', label: '3 Bedroom', description: 'Family friendly', icon: '🛏️' },
  { id: 'five_bedroom', name: '5 Bedroom', label: '5 Bedroom', description: 'Large families', icon: '🏡' },
  { id: 'bedsitters', name: 'Bedsitters', label: 'Bedsitters', description: 'Studio living', icon: '🛋️' },
  { id: 'studio', name: 'Studio', label: 'Studio', description: 'Compact living', icon: '🏨' },
  // New property types
  { id: 'container_house', name: 'Container House', label: 'Container', description: 'Eco-friendly container homes', icon: '📦' },
  { id: 'cabin', name: 'Cabin', label: 'Cabin', description: 'Cozy cabin retreats', icon: '🏕️' },
  { id: 'farm_house', name: 'Farm House', label: 'Farm House', description: 'Rural farm properties', icon: '🌾' },
  { id: 'cottage', name: 'Cottage', label: 'Cottage', description: 'Charming cottage homes', icon: '🏘️' },
  { id: 'condo', name: 'Condo', label: 'Condo', description: 'Modern condominiums', icon: '🏙️' },
  { id: 'bungalow', name: 'Bungalow', label: 'Bungalow', description: 'Single-story homes', icon: '🏚️' },
  { id: 'villa', name: 'Villa', label: 'Villa', description: 'Luxury villas', icon: '🏰' },
  { id: 'town_house', name: 'Town House', label: 'Town House', description: 'Urban townhouses', icon: '🏘️' },
  { id: 'mansionate', name: 'Mansionate', label: 'Mansionate', description: 'Split-level homes', icon: '🏛️' },
  { id: 'duplex_house', name: 'Duplex House', label: 'Duplex', description: 'Two-level units', icon: '🏬' },
  // Commercial and land
  { id: 'commercial', name: 'Commercial', label: 'Commercial', description: 'Shops & offices', icon: '🏪' },
  { id: 'industrial', name: 'Industrial', label: 'Industrial', description: 'Warehouses & parks', icon: '🏭' },
  { id: 'offices', name: 'Offices', label: 'Offices', description: 'Business centers', icon: '🏢' },
  { id: 'land_plots', name: 'Land/Plots', label: 'Land/Plots', description: 'Plots & acreage', icon: '🌍' },
] as const;

// Common amenities and features
export const PROPERTY_AMENITIES = [
  'Swimming Pool',
  'Gym',
  'Security',
  'Parking',
  'Generator',
  'Borehole',
  'Garden',
  'Balcony',
  'DSTV',
  'Internet',
  'Elevator',
  'Fire Safety',
  'CCTV',
  'Playground',
  'Shopping Center',
  'Hospital',
  'School',
] as const;

// Alias expected by some helpers
export const COMMON_AMENITIES = PROPERTY_AMENITIES;

// Maximum number of images allowed for a property listing
export const MAX_PROPERTY_IMAGES = 10;

export const PROPERTY_FEATURES = [
  'Furnished',
  'Semi-Furnished',
  'Unfurnished',
  'Newly Built',
  'Renovated',
  'Air Conditioning',
  'Kitchen Cabinets',
  'Water Heater',
  'Backup Water',
  'Gated Community',
  'Corner Plot',
  'Main Road',
  'Quiet Neighborhood',
] as const;

// Kenyan counties for location filtering
export const KENYAN_COUNTIES = [
  'Nairobi',
  'Mombasa',
  'Nakuru',
  'Kiambu',
  'Machakos',
  'Kajiado',
  'Murang\'a',
  'Nyeri',
  'Kirinyaga',
  'Nyandarua',
  'Laikipia',
  'Meru',
  'Tharaka Nithi',
  'Embu',
  'Kitui',
  'Kakamega',
  'Bungoma',
  'Busia',
  'Siaya',
  'Kisumu',
  'Homa Bay',
  'Migori',
  'Kisii',
  'Nyamira',
  'Trans Nzoia',
  'Uasin Gishu',
  'Elgeyo Marakwet',
  'Nandi',
  'Baringo',
  'Kericho',
  'Bomet',
  'West Pokot',
  'Samburu',
  'Turkana',
  'Isiolo',
  'Marsabit',
  'Mandera',
  'Wajir',
  'Garissa',
  'Tana River',
  'Lamu',
  'Taita Taveta',
  'Kwale',
  'Kilifi',
] as const;

// Location-related types for enhanced mapping functionality
export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface LocationSearchResult {
  coordinate: LocationCoordinates;
  formattedAddress: string;
  name: string;
  distance?: number;
  accuracy?: number;
}

export interface GeocodeResult {
  success: boolean;
  results?: LocationSearchResult[];
  error?: string;
}

export interface ReverseGeocodeResult {
  success: boolean;
  address?: {
    street?: string;
    city?: string;
    county?: string;
    country?: string;
    postalCode?: string;
    formattedAddress: string;
  };
  error?: string;
}

export interface LocationPermissionResult {
  granted: boolean;
  status: string;
  canAskAgain?: boolean;
}

export interface CurrentLocationResult {
  success: boolean;
  location?: LocationCoordinates;
  error?: string;
}

export interface LocationServiceConfig {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  distanceFilter?: number;
}

export interface MapMarkerData {
  id: string;
  coordinate: LocationCoordinates;
  title: string;
  description?: string;
  type: 'property' | 'user' | 'search' | 'poi';
  status?: PropertyStatus;
  data?: any; // Additional data for the marker
}

export interface MapClusterData {
  id: string;
  coordinate: LocationCoordinates;
  count: number;
  markers: MapMarkerData[];
}

export interface LocationSearchQuery {
  query: string;
  region?: string;
  bounds?: LocationBounds;
  limit?: number;
  includeNearbyProperties?: boolean;
}

export type MapStyle = 'standard' | 'satellite' | 'hybrid' | 'terrain';
export type MapRegionType = 'kenya' | 'uganda' | 'tanzania' | 'global';

export interface MapConfiguration {
  enableClustering: boolean;
  enableLocationSearch: boolean;
  showCurrentLocation: boolean;
  mapStyle: MapStyle;
  region: MapRegionType;
  searchRadius: number; // in kilometers
  clusterRadius: number; // in pixels
  maxZoom: number;
  minZoom: number;
}

export interface LocationHistory {
  id: string;
  query: string;
  coordinate: LocationCoordinates;
  formattedAddress: string;
  timestamp: string;
  resultCount: number;
}

/**
 * Service Types for LinkApp
 * Service listings, bookings, and provider types
 */

// Base service listing
export interface ServiceListing {
  id: string;
  ownerId: string;
  ownerName?: string;
  serviceName: string;
  category: string;
  subcategory?: string;
  description: string;
  location: string;
  pricingInfo: ServicePricing;
  imageUrls: string[];
  contactDetails: ServiceContactDetails;
  createdAt: string;
  updatedAt?: string;
  status: 'active' | 'inactive' | 'suspended';
  rating?: number;
  reviewCount?: number;
  verified?: boolean;
  operatingHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  tags?: string[];
}

// Service pricing structure
export interface ServicePricing {
  type: 'fixed' | 'hourly' | 'negotiable' | 'package';
  amount?: number;
  currency: 'KSH' | 'USD';
  packages?: ServicePackage[];
  hourlyRate?: number;
  minimumCharge?: number;
  additionalFees?: {
    name: string;
    amount: number;
    description?: string;
  }[];
}

// Service packages
export interface ServicePackage {
  id: string;
  name: string;
  description: string;
  price: number;
  duration?: string;
  features: string[];
  popular?: boolean;
}

// Service contact details
export interface ServiceContactDetails {
  phone?: string;
  email?: string;
  whatsapp?: string;
  website?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  preferredContactMethod: 'phone' | 'email' | 'whatsapp' | 'in_app';
  availability?: {
    days: string[];
    hours: {
      start: string;
      end: string;
    };
    timezone: string;
  };
}

// Service categories
export type ServiceCategory = 
  | 'home_services'
  | 'beauty_wellness'
  | 'automotive'
  | 'professional_services'
  | 'event_services'
  | 'tutoring_education'
  | 'health_fitness'
  | 'technology'
  | 'creative_services'
  | 'business_services';

// Service booking
export interface ServiceBooking {
  id: string;
  serviceId: string;
  providerId: string;
  customerId: string;
  packageId?: string;
  scheduledDate: string;
  scheduledTime?: string;
  duration?: number;
  location: BookingLocation;
  status: BookingStatus;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

// Booking location
export interface BookingLocation {
  type: 'customer_location' | 'provider_location' | 'online' | 'other';
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  instructions?: string;
}

// Booking status
export type BookingStatus = 
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

// Payment status
export type PaymentStatus = 
  | 'pending'
  | 'paid'
  | 'partially_paid'
  | 'refunded'
  | 'failed';

// Service review
export interface ServiceReview {
  id: string;
  serviceId: string;
  bookingId: string;
  reviewerId: string;
  providerId: string;
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
  createdAt: string;
  updatedAt?: string;
  helpful?: number;
  response?: {
    comment: string;
    createdAt: string;
  };
}

// Service provider profile
export interface ServiceProvider {
  id: string;
  userId: string;
  businessName?: string;
  description: string;
  categories: ServiceCategory[];
  location: {
    county: string;
    town: string;
    address?: string;
  };
  contactInfo: ServiceContactDetails;
  portfolio: {
    images: string[];
    videos?: string[];
    documents?: string[];
  };
  certifications?: {
    name: string;
    issuer: string;
    dateIssued: string;
    expiryDate?: string;
    documentUrl?: string;
  }[];
  experience: {
    yearsInBusiness: number;
    previousWork?: string[];
    specializations: string[];
  };
  pricing: ServicePricing;
  availability: {
    workingDays: string[];
    workingHours: {
      start: string;
      end: string;
    };
    timeZone: string;
    advanceBooking: number; // days
  };
  stats: {
    totalBookings: number;
    completedBookings: number;
    averageRating: number;
    totalReviews: number;
    responseTime: number; // minutes
    repeatCustomers: number;
  };
  verified: boolean;
  createdAt: string;
  updatedAt?: string;
  lastActive: string;
}

// Service search filters
export interface ServiceSearchFilters {
  category?: ServiceCategory;
  subcategory?: string;
  location?: {
    county?: string;
    town?: string;
    radius?: number;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  rating?: number;
  availability?: {
    date?: string;
    timeSlot?: string;
  };
  verified?: boolean;
  features?: string[];
}

// Service search query
export interface ServiceSearchQuery {
  searchText?: string;
  filters: ServiceSearchFilters;
  sortBy?: 'relevance' | 'price_low' | 'price_high' | 'rating' | 'distance' | 'newest';
  page?: number;
  limit?: number;
}

// Service search result
export interface ServiceSearchResult {
  services: ServiceListing[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    hasMore: boolean;
  };
  filters: ServiceSearchFilters;
}

// Service analytics
export interface ServiceAnalytics {
  serviceId: string;
  period: 'day' | 'week' | 'month' | 'year';
  metrics: {
    views: number;
    inquiries: number;
    bookings: number;
    revenue: number;
    averageRating: number;
    completionRate: number;
  };
  trends: {
    viewsChange: number;
    bookingsChange: number;
    revenueChange: number;
  };
  topKeywords: string[];
  customerDemographics: {
    ageGroups: Record<string, number>;
    locations: Record<string, number>;
  };
}

// Service notification
export interface ServiceNotification {
  id: string;
  userId: string;
  type: 'booking_request' | 'booking_confirmed' | 'booking_cancelled' | 'review_received' | 'payment_received';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

// Service report
export interface ServiceReport {
  id: string;
  serviceId: string;
  reporterId: string;
  reason: 'inappropriate_content' | 'fake_service' | 'poor_quality' | 'overpricing' | 'other';
  description: string;
  evidence?: string[];
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt?: string;
}

// Service inquiry (from a customer to a service owner)
export interface ServiceInquiry {
  id: string;
  service_id: string;
  service_name?: string;
  inquirer_id: string;
  inquirer_name?: string;
  owner_id: string;
  message: string;
  contact_phone?: string;
  contact_email?: string;
  status: 'pending' | 'quoted' | 'confirmed' | 'in_progress' | 'completed' | 'closed';
  created_at: string;
  responded_at?: string;
  response?: string;
}

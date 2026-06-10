/**
 * Service Management Service
 * Handles all service directory operations including search, filtering, booking, and contact
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { ServiceListing, ServiceBooking, ServiceReview, ServiceCategory, ServiceProvider } from '../types/service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyticsService } from './analyticsService';
import { categoryManagementService } from './categoryManagementService';
import { serviceService, type SearchParams } from './serviceService';
import { normalizeCategoryKey } from '../utils/normalizeCategoryKey';

class ServiceManagementService {
  /**
   * Search services with filters
   */
  async searchServices(params: {
    searchText?: string;
    category?: string;
    subcategory?: string;
    location?: string;
    priceRange?: { min: number; max: number };
    availability?: string;
    verified?: boolean;
    sortBy?: 'price' | 'rating' | 'distance' | 'recent';
  }): Promise<ServiceListing[]> {
    try {
      if (!isSupabaseConfigured() && (process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID)) {
        const { ENHANCED_DEMO_SERVICES } = await import('../data/enhancedDemoServices');

        const normalizedCategory = params.category ? normalizeCategoryKey(params.category) : undefined;
        const normalizedSubcategory = params.subcategory ? normalizeCategoryKey(params.subcategory) : undefined;
        const normalizedSearch = typeof params.searchText === 'string' ? params.searchText.trim().toLowerCase() : '';
        const normalizedLocation = typeof params.location === 'string' ? params.location.trim().toLowerCase() : '';

        const demoServices: ServiceListing[] = (ENHANCED_DEMO_SERVICES as any[]).map((s: any) => ({
          id: String(s.id),
          ownerId: String(s.ownerId || s.owner_id || 'demo-owner'),
          ownerName: typeof s.ownerName === 'string' ? s.ownerName : 'Service Provider',
          serviceName: String(s.serviceName || s.service_name || 'Service'),
          category: String(s.category || 'general'),
          subcategory: typeof s.subcategory === 'string' ? s.subcategory : undefined,
          description: String(s.description || ''),
          location: String(s.location || ''),
          pricingInfo: (s.pricingInfo as any) || { type: 'fixed', amount: 0, currency: 'KSH' },
          imageUrls: Array.isArray(s.imageUrls) ? s.imageUrls : [],
          contactDetails: (s.contactDetails as any) || { preferredContactMethod: 'phone' },
          createdAt: typeof s.createdAt === 'string' ? s.createdAt : new Date().toISOString(),
          updatedAt: typeof s.updatedAt === 'string' ? s.updatedAt : undefined,
          status: (s.status as any) || 'active',
          rating: typeof s.rating === 'number' ? s.rating : undefined,
          reviewCount: typeof s.reviewCount === 'number' ? s.reviewCount : typeof s.reviews === 'number' ? s.reviews : undefined,
          verified: typeof s.verified === 'boolean' ? s.verified : undefined,
          operatingHours: s.operatingHours,
          tags: Array.isArray(s.tags) ? s.tags : [],
        }));

        let results = demoServices.filter((s) => s.status === 'active');

        if (normalizedCategory && normalizedCategory !== 'all' && normalizedCategory !== 'search') {
          results = results.filter((s) => normalizeCategoryKey(s.category) === normalizedCategory);
        }
        if (normalizedSubcategory) {
          results = results.filter((s) => normalizeCategoryKey(s.subcategory || '') === normalizedSubcategory);
        }
        if (normalizedLocation) {
          results = results.filter((s) => s.location.toLowerCase().includes(normalizedLocation));
        }
        if (normalizedSearch) {
          results = results.filter((s) => {
            const haystack = [s.serviceName, s.description, s.category, s.location, ...(s.tags || [])]
              .join(' ')
              .toLowerCase();
            return haystack.includes(normalizedSearch);
          });
        }

        if (params.sortBy === 'rating') {
          results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (params.sortBy === 'price') {
          const getPrice = (service: ServiceListing) => {
            const pricing = service.pricingInfo as any;
            if (!pricing) return 0;
            if (typeof pricing.amount === 'number') return pricing.amount;
            if (typeof pricing.hourlyRate === 'number') return pricing.hourlyRate;
            if (typeof pricing.startingPrice === 'number') return pricing.startingPrice;
            return 0;
          };
          results.sort((a, b) => getPrice(a) - getPrice(b));
        } else if (params.sortBy === 'recent') {
          results.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        }

        await analyticsService.trackEvent('service_search', {
          searchText: params.searchText,
          category: params.category,
          resultsCount: results.length,
          source: 'demo',
        });

        return results;
      }

      const results = await serviceService.searchServices(params as SearchParams);
      await analyticsService.trackEvent('service_search', {
        searchText: params.searchText,
        category: params.category,
        resultsCount: results.length,
      });
      return results;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get services owned by a specific user (for service owners/providers)
   */
  async getOwnerServices(
    ownerId: string,
    options?: {
      includeInactive?: boolean;
    }
  ): Promise<ServiceListing[]> {
    try {
      return await serviceService.getServicesByOwner(ownerId, options);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get service details by ID
   */
  async getServiceDetails(serviceId: string): Promise<ServiceListing | null> {
    try {
      const service = await serviceService.getServiceById(serviceId);
      if (service) {
        await analyticsService.trackEvent('service_viewed', {
          serviceId: service.id,
          serviceName: service.serviceName,
          category: service.category,
        });
      }
      return service;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get service categories with counts
   */
  async getServiceCategories(): Promise<Array<{
    id: string;
    name: string;
    icon: string;
    count: number;
    description: string;
  }>> {
    try {
      const { SERVICE_CATEGORIES } = await import('../config/constants');

      const { data } = await supabase
        .from('service_listings')
        .select('category')
        .eq('status', 'active') as any;

      const countByCategory: Record<string, number> = {};
      if (Array.isArray(data)) {
        for (const row of data as { category: string }[]) {
          if (row.category) {
            countByCategory[row.category] = (countByCategory[row.category] || 0) + 1;
          }
        }
      }

      return Object.entries(SERVICE_CATEGORIES).map(([key, value]) => ({
        id: key.toLowerCase(),
        name: value,
        icon: this.getCategoryIcon(key),
        count: countByCategory[value] || countByCategory[key.toLowerCase()] || 0,
        description: this.getCategoryDescription(key),
      }));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Contact service provider
   */
  async contactServiceProvider(params: {
    serviceId: string;
    userId: string;
    message?: string;
    contactMethod: 'phone' | 'email' | 'whatsapp' | 'in_app';
  }): Promise<{ success: boolean; contactInfo?: any }> {
    try {
      const service = await this.getServiceDetails(params.serviceId);
      if (!service) {
        throw new Error('Service not found');
      }

      // Track contact event
      await analyticsService.trackEvent('service_contacted', {
        serviceId: params.serviceId,
        contactMethod: params.contactMethod,
        userId: params.userId
      });

      // Return contact information based on method
      switch (params.contactMethod) {
        case 'phone':
          return {
            success: true,
            contactInfo: { phone: service.contactDetails.phone }
          };
        case 'email':
          return {
            success: true,
            contactInfo: { email: service.contactDetails.email }
          };
        case 'whatsapp':
          return {
            success: true,
            contactInfo: { whatsapp: service.contactDetails.whatsapp || service.contactDetails.phone }
          };
        case 'in_app':
          // For in-app messaging, create a conversation
          await this.createServiceInquiry({
            serviceId: params.serviceId,
            userId: params.userId,
            message: params.message || 'Hello, I am interested in your service.'
          });
          return { success: true };
        default:
          return { success: false };
      }
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Create a service booking
   */
  async createServiceBooking(booking: Partial<ServiceBooking>): Promise<ServiceBooking> {
    try {
      const newBooking: ServiceBooking = {
        id: Math.random().toString(36).substr(2, 9),
        serviceId: booking.serviceId!,
        providerId: booking.providerId!,
        customerId: booking.customerId!,
        scheduledDate: booking.scheduledDate!,
        scheduledTime: booking.scheduledTime,
        location: booking.location!,
        status: 'pending',
        totalAmount: booking.totalAmount!,
        paymentStatus: 'pending',
        notes: booking.notes,
        createdAt: new Date().toISOString()
      };

      // Store booking in local storage for demo
      const existingBookings = await this.getStoredBookings();
      existingBookings.push(newBooking);
      await AsyncStorage.setItem('service_bookings', JSON.stringify(existingBookings));

      // Track booking event
      await analyticsService.trackEvent('service_booked', {
        serviceId: newBooking.serviceId,
        bookingId: newBooking.id,
        amount: newBooking.totalAmount
      });

      return newBooking;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Get user's bookings
   */
  async getUserBookings(userId: string): Promise<ServiceBooking[]> {
    try {
      const bookings = await this.getStoredBookings();
      return bookings.filter(b => b.customerId === userId || b.providerId === userId);
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(bookingId: string, status: ServiceBooking['status']): Promise<void> {
    try {
      const bookings = await this.getStoredBookings();
      const bookingIndex = bookings.findIndex(b => b.id === bookingId);
      
      if (bookingIndex !== -1) {
        bookings[bookingIndex].status = status;
        bookings[bookingIndex].updatedAt = new Date().toISOString();
        
        if (status === 'completed') {
          bookings[bookingIndex].completedAt = new Date().toISOString();
        } else if (status === 'cancelled') {
          bookings[bookingIndex].cancelledAt = new Date().toISOString();
        }

        await AsyncStorage.setItem('service_bookings', JSON.stringify(bookings));

        // Track status update
        await analyticsService.trackEvent('booking_status_updated', {
          bookingId,
          newStatus: status
        });
      }
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Save/unsave a service
   */
  async toggleSaveService(userId: string, serviceId: string): Promise<boolean> {
    try {
      const savedKey = `saved_services_${userId}`;
      const savedServices = await this.getSavedServices(userId);
      
      let isSaved: boolean;
      if (savedServices.includes(serviceId)) {
        // Remove from saved
        const filtered = savedServices.filter(id => id !== serviceId);
        await AsyncStorage.setItem(savedKey, JSON.stringify(filtered));
        isSaved = false;
      } else {
        // Add to saved
        savedServices.push(serviceId);
        await AsyncStorage.setItem(savedKey, JSON.stringify(savedServices));
        isSaved = true;
      }

      // Track save/unsave event
      await analyticsService.trackEvent(isSaved ? 'service_saved' : 'service_unsaved', {
        serviceId,
        userId
      });

      return isSaved;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Get user's saved services
   */
  async getSavedServices(userId: string): Promise<string[]> {
    try {
      const savedKey = `saved_services_${userId}`;
      const saved = await AsyncStorage.getItem(savedKey);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      
      return [];
    }
  }

  /**
   * Create service review
   */
  async createServiceReview(review: Partial<ServiceReview>): Promise<ServiceReview> {
    try {
      const newReview: ServiceReview = {
        id: Math.random().toString(36).substr(2, 9),
        serviceId: review.serviceId!,
        bookingId: review.bookingId!,
        reviewerId: review.reviewerId!,
        providerId: review.providerId!,
        rating: review.rating!,
        title: review.title,
        comment: review.comment,
        images: review.images,
        createdAt: new Date().toISOString(),
        helpful: 0
      };

      // Store review in local storage for demo
      const existingReviews = await this.getStoredReviews();
      existingReviews.push(newReview);
      await AsyncStorage.setItem('service_reviews', JSON.stringify(existingReviews));

      // Track review event
      await analyticsService.trackEvent('service_reviewed', {
        serviceId: newReview.serviceId,
        reviewId: newReview.id,
        rating: newReview.rating
      });

      return newReview;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Get service reviews
   */
  async getServiceReviews(serviceId: string): Promise<ServiceReview[]> {
    try {
      const reviews = await this.getStoredReviews();
      return reviews.filter(r => r.serviceId === serviceId);
    } catch (error) {
      
      return [];
    }
  }

  /**
   * Check service availability
   */
  async checkServiceAvailability(serviceId: string, date: Date): Promise<{
    available: boolean;
    nextAvailable?: Date;
    slots?: Array<{ time: string; available: boolean }>;
  }> {
    try {
      const service = await this.getServiceDetails(serviceId);
      if (!service) {
        return { available: false };
      }

      // Simple availability check based on operating hours
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const hours = service.operatingHours?.[dayOfWeek as keyof typeof service.operatingHours];
      
      if (!hours || hours === 'Closed') {
        return { available: false, nextAvailable: this.getNextAvailableDate(service, date) };
      }

      // Generate time slots
      const slots = this.generateTimeSlots(hours);
      
      return {
        available: true,
        slots
      };
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Create service inquiry
   */
  private async createServiceInquiry(params: {
    serviceId: string;
    userId: string;
    message: string;
  }): Promise<void> {
    try {
      const inquiry = {
        id: Math.random().toString(36).substr(2, 9),
        ...params,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      const existingInquiries = await this.getStoredInquiries();
      existingInquiries.push(inquiry);
      await AsyncStorage.setItem('service_inquiries', JSON.stringify(existingInquiries));
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Helper: Get stored bookings
   */
  private async getStoredBookings(): Promise<ServiceBooking[]> {
    try {
      const bookings = await AsyncStorage.getItem('service_bookings');
      return bookings ? JSON.parse(bookings) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Helper: Get stored reviews
   */
  private async getStoredReviews(): Promise<ServiceReview[]> {
    try {
      const reviews = await AsyncStorage.getItem('service_reviews');
      return reviews ? JSON.parse(reviews) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Helper: Get stored inquiries
   */
  private async getStoredInquiries(): Promise<any[]> {
    try {
      const inquiries = await AsyncStorage.getItem('service_inquiries');
      return inquiries ? JSON.parse(inquiries) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Helper: Get category icon
   */
  private getCategoryIcon(category: string): string {
    const iconMap: { [key: string]: string } = {
      HOSPITALS_HEALTHCARE: '🏥',
      SCHOOLS_EDUCATION: '🎓',
      RETAIL_SHOPS: '🛍️',
      ENTERTAINMENT_VENUES: '🎭',
      HOTELS_ACCOMMODATIONS: '🏨',
      BUSINESS_SERVICES: '💼',
      BEAUTY_WELLNESS: '💆‍♀️',
      TOOLS: '🔧',
      MATERIALS: '🧱',
      EQUIPMENT: '⚙️'
    };
    return iconMap[category] || '📦';
  }

  /**
   * Helper: Get category description
   */
  private getCategoryDescription(category: string): string {
    const descriptionMap: { [key: string]: string } = {
      HOSPITALS_HEALTHCARE: 'Medical services, clinics, pharmacies, and health providers',
      SCHOOLS_EDUCATION: 'Schools, training centers, tutoring, and educational services',
      RETAIL_SHOPS: 'Shops, stores, and retail businesses',
      ENTERTAINMENT_VENUES: 'Entertainment, recreation, and leisure services',
      HOTELS_ACCOMMODATIONS: 'Hotels, lodges, and accommodation services',
      BUSINESS_SERVICES: 'Professional and business services',
      BEAUTY_WELLNESS: 'Beauty, spa, and wellness services',
      TOOLS: 'Tools for rent or sale',
      MATERIALS: 'Construction and building materials',
      EQUIPMENT: 'Equipment rental and sales'
    };
    return descriptionMap[category] || 'Various services and providers';
  }

  /**
   * Helper: Get next available date
   */
  private getNextAvailableDate(service: ServiceListing, currentDate: Date): Date {
    const nextDate = new Date(currentDate);
    for (let i = 1; i <= 7; i++) {
      nextDate.setDate(currentDate.getDate() + i);
      const dayOfWeek = nextDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const hours = service.operatingHours?.[dayOfWeek as keyof typeof service.operatingHours];
      if (hours && hours !== 'Closed') {
        return nextDate;
      }
    }
    return nextDate;
  }

  /**
   * Helper: Generate time slots
   */
  private generateTimeSlots(hours: string): Array<{ time: string; available: boolean }> {
    const slots = [];
    const startTime = 8; // 8 AM
    const endTime = 17; // 5 PM
    
    for (let hour = startTime; hour <= endTime; hour++) {
      slots.push({
        time: `${hour}:00`,
        available: Math.random() > 0.3 // Random availability for demo
      });
    }
    
    return slots;
  }

  /**
   * Create a new service listing with automatic category creation
   */
  async createServiceListing(serviceData: Partial<ServiceListing>, ownerId: string): Promise<ServiceListing> {
    try {
      if (serviceData.category) {
        const key = normalizeCategoryKey(serviceData.category);
        await categoryManagementService.ensureCategoryExists('service', key);
      }

      const created = await serviceService.createServiceListing(serviceData, ownerId);

      await analyticsService.trackEvent('service_created', {
        serviceId: created.id,
        category: created.category,
      });

      return created;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update an existing service listing
   */
  async updateServiceListing(serviceId: string, updates: Partial<ServiceListing>): Promise<ServiceListing> {
    try {
      const updated = await serviceService.updateServiceListing(serviceId, updates);
      await analyticsService.trackEvent('service_updated', {
        serviceId: updated.id,
        category: updated.category,
      });
      return updated;
    } catch (error) {
      throw error;
    }
  }
}

export const serviceManagementService = new ServiceManagementService();

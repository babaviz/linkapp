/**
 * Custom hook for service operations
 * Provides all service-related functionality to components
 */

import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../redux/store';
import { serviceManagementService } from '../services/serviceManagementService';
import { ServiceListing, ServiceBooking, ServiceReview } from '../types/service';
import { Alert, Linking } from 'react-native';
import { analyticsService } from '../services/analyticsService';
import { categoryCountService } from '../services/categoryCountService';
import { realTimeServiceService } from '../services/realTimeServiceService';
import { getUserFacingError } from '../utils/userFacingError';

export const useServiceOperations = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [savedServices, setSavedServices] = useState<string[]>([]);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [reviews, setReviews] = useState<ServiceReview[]>([]);
  const [lastParams, setLastParams] = useState<{
    searchText?: string;
    category?: string;
    subcategory?: string;
    location?: string;
    priceRange?: { min: number; max: number };
    availability?: string;
    verified?: boolean;
    sortBy?: 'price' | 'rating' | 'distance' | 'recent';
  } | null>(null);
  const [ownerSubscriptionUserId, setOwnerSubscriptionUserId] = useState<string | null>(null);
  const [ownerIncludeInactive, setOwnerIncludeInactive] = useState<boolean>(true);

  /**
   * Search services with filters
   */
  const searchServices = useCallback(async (params: {
    searchText?: string;
    category?: string;
    subcategory?: string;
    location?: string;
    priceRange?: { min: number; max: number };
    availability?: string;
    verified?: boolean;
    sortBy?: 'price' | 'rating' | 'distance' | 'recent';
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await serviceManagementService.searchServices(params);
      setServices(results);
      setLastParams(params);
      return results;
    } catch (err: any) {
      setError(err.message || 'Failed to search services');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load services owned by the current user
   */
  const loadOwnerServices = useCallback(async (options?: { includeInactive?: boolean }) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to view your services');
      return [];
    }

    const includeInactive = options?.includeInactive === true;
    setIsLoading(true);
    setError(null);
    try {
      const results = await serviceManagementService.getOwnerServices(user.id, options);
      setServices(results);
      setOwnerIncludeInactive(includeInactive);
      setOwnerSubscriptionUserId(user.id);
      return results;
    } catch (err: any) {
      setError(err?.message || 'Failed to load your services');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Get service details
   */
  const getServiceDetails = useCallback(async (serviceId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const service = await serviceManagementService.getServiceDetails(serviceId);
      return service;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch service details');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Contact service provider
   */
  const contactProvider = useCallback(async (
    serviceId: string,
    contactMethod: 'phone' | 'email' | 'whatsapp' | 'in_app',
    message?: string
  ) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to contact service providers');
      return false;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await serviceManagementService.contactServiceProvider({
        serviceId,
        userId: user.id,
        message,
        contactMethod
      });

      if (result.success) {
        // Handle different contact methods
        switch (contactMethod) {
          case 'phone':
            if (result.contactInfo?.phone) {
              Linking.openURL(`tel:${result.contactInfo.phone}`);
            }
            break;
          case 'email':
            if (result.contactInfo?.email) {
              Linking.openURL(`mailto:${result.contactInfo.email}`);
            }
            break;
          case 'whatsapp':
            if (result.contactInfo?.whatsapp) {
              const whatsappUrl = `whatsapp://send?phone=${result.contactInfo.whatsapp}`;
              Linking.canOpenURL(whatsappUrl).then(supported => {
                if (supported) {
                  Linking.openURL(whatsappUrl);
                } else {
                  Alert.alert('WhatsApp not installed', 'Please install WhatsApp to use this feature');
                }
              });
            }
            break;
          case 'in_app':
            Alert.alert('Message Sent', 'Your inquiry has been sent to the service provider');
            break;
        }

        // Track analytics
        await analyticsService.trackEvent('service_contact_initiated', {
          serviceId,
          contactMethod,
          userId: user.id
        });

        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message || 'Failed to contact provider');
      const friendly = getUserFacingError(err, {
        action: 'contact this service provider',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Create a booking
   */
  const createBooking = useCallback(async (bookingData: {
    serviceId: string;
    providerId: string;
    scheduledDate: string;
    scheduledTime?: string;
    location: any;
    totalAmount: number;
    notes?: string;
  }) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to book services');
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const booking = await serviceManagementService.createServiceBooking({
        ...bookingData,
        customerId: user.id
      });

      // Update local bookings state
      setBookings(prev => [...prev, booking]);

      // Track analytics
      await analyticsService.trackEvent('service_booking_created', {
        serviceId: bookingData.serviceId,
        bookingId: booking.id,
        userId: user.id,
        amount: bookingData.totalAmount
      });

      Alert.alert('Booking Confirmed', 'Your service booking has been confirmed. You will receive a confirmation shortly.');
      return booking;
    } catch (err: any) {
      setError(err.message || 'Failed to create booking');
      Alert.alert('Booking Failed', 'Unable to complete your booking. Please try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Toggle save/unsave service
   */
  const toggleSaveService = useCallback(async (serviceId: string) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to save services');
      return false;
    }

    setIsLoading(true);
    setError(null);
    try {
      const isSaved = await serviceManagementService.toggleSaveService(user.id, serviceId);
      
      // Update local saved services state
      if (isSaved) {
        setSavedServices(prev => [...prev, serviceId]);
      } else {
        setSavedServices(prev => prev.filter(id => id !== serviceId));
      }

      // Track analytics
      await analyticsService.trackEvent(isSaved ? 'service_saved' : 'service_unsaved', {
        serviceId,
        userId: user.id
      });

      return isSaved;
    } catch (err: any) {
      setError(err.message || 'Failed to save service');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Load saved services
   */
  const loadSavedServices = useCallback(async () => {
    if (!user) return [];

    try {
      const saved = await serviceManagementService.getSavedServices(user.id);
      setSavedServices(saved);
      return saved;
    } catch (err) {
      return [];
    }
  }, [user]);

  /**
   * Load user bookings
   */
  const loadUserBookings = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const userBookings = await serviceManagementService.getUserBookings(user.id);
      setBookings(userBookings);
    } catch (err) {
      
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Update booking status
   */
  const updateBookingStatus = useCallback(async (
    bookingId: string,
    status: ServiceBooking['status']
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      await serviceManagementService.updateBookingStatus(bookingId, status);
      
      // Update local bookings state
      setBookings(prev => prev.map(b => 
        b.id === bookingId ? { ...b, status, updatedAt: new Date().toISOString() } : b
      ));

      // Track analytics
      await analyticsService.trackEvent('booking_status_changed', {
        bookingId,
        newStatus: status,
        userId: user?.id
      });

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to update booking status');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Create a review
   */
  const createReview = useCallback(async (reviewData: {
    serviceId: string;
    bookingId: string;
    providerId: string;
    rating: number;
    title?: string;
    comment?: string;
    images?: string[];
  }) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to leave reviews');
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const review = await serviceManagementService.createServiceReview({
        ...reviewData,
        reviewerId: user.id
      });

      // Update local reviews state
      setReviews(prev => [...prev, review]);

      // Track analytics
      await analyticsService.trackEvent('service_review_created', {
        serviceId: reviewData.serviceId,
        reviewId: review.id,
        rating: reviewData.rating,
        userId: user.id
      });

      Alert.alert('Review Submitted', 'Thank you for your feedback!');
      return review;
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
      const friendly = getUserFacingError(err, {
        action: 'submit your review',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Check service availability
   */
  const checkAvailability = useCallback(async (serviceId: string, date: Date) => {
    setIsLoading(true);
    setError(null);
    try {
      const availability = await serviceManagementService.checkServiceAvailability(serviceId, date);
      return availability;
    } catch (err: any) {
      setError(err.message || 'Failed to check availability');
      return { available: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get service categories
   */
  const getCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const categories = await serviceManagementService.getServiceCategories();
      return categories;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch categories');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create a new service listing
  const createService = useCallback(async (serviceData: Partial<ServiceListing>) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to list a service');
      return null;
    }
    setIsLoading(true);
    setError(null);
    try {
      const created = await serviceManagementService.createServiceListing(serviceData, user.id);
      setServices(prev => [created, ...prev]);
      categoryCountService.clearCache();
      await analyticsService.trackEvent('service_listing_created', { serviceId: created.id, userId: user.id });
      return created;
    } catch (err: any) {
      setError(err.message || 'Failed to create service');
      const friendly = getUserFacingError(err, {
        action: 'post this service',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Update an existing service listing
  const updateService = useCallback(async (serviceId: string, updates: Partial<ServiceListing>) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to update a service');
      return null;
    }
    setIsLoading(true);
    setError(null);
    try {
      const updated = await serviceManagementService.updateServiceListing(serviceId, updates);
      setServices(prev => {
        const idx = prev.findIndex(s => s.id === updated.id);
        if (idx === -1) return prev;
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      });
      categoryCountService.clearCache();
      await analyticsService.trackEvent('service_listing_updated', { serviceId: updated.id, userId: user.id });
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to update service');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Realtime matching helper
  const matchesParams = useCallback((svc: ServiceListing, params: NonNullable<typeof lastParams>) => {
    const rawCategory = params.category;
    const normalizedCategory = rawCategory?.toLowerCase();
    const nonStrictKeys = ['all', 'search'];
    const toolsMaterialsKeys = ['tools', 'materials', 'rental', 'movers', 'paint', 'tiles'];
    const shouldFilterByCategory =
      !!normalizedCategory &&
      !nonStrictKeys.includes(normalizedCategory) &&
      !toolsMaterialsKeys.includes(normalizedCategory);

    if (shouldFilterByCategory) {
      if (svc.category.toLowerCase() !== normalizedCategory) return false;
    }
    if (params.subcategory) {
      if ((svc.subcategory || '').toLowerCase() !== params.subcategory.toLowerCase()) return false;
    }
    if (params.searchText) {
      const q = params.searchText.toLowerCase();
      const hay = [svc.serviceName, svc.description, svc.category, svc.location, ...(svc.tags || [])].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (params.priceRange) {
      const price = (svc.pricingInfo as any)?.amount || 0;
      if (price < params.priceRange.min || price > params.priceRange.max) return false;
    }
    return true;
  }, [lastParams]);

  // Subscribe to realtime changes for the owner's services list (when enabled).
  useEffect(() => {
    if (!ownerSubscriptionUserId) return;

    const unsubscribe = realTimeServiceService.subscribeToServiceChanges(`my-services-${ownerSubscriptionUserId}`, {
      filters: {
        ownerId: ownerSubscriptionUserId,
      },
      onServiceChange: ({ eventType, service }) => {
        setServices((prev) => {
          const idx = prev.findIndex((s) => s.id === service.id);

          if (eventType === 'DELETE') {
            return idx !== -1 ? prev.filter((s) => s.id !== service.id) : prev;
          }

          if (!ownerIncludeInactive && service.status !== 'active') {
            return idx !== -1 ? prev.filter((s) => s.id !== service.id) : prev;
          }

          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = service;
            return copy;
          }

          return [service, ...prev];
        });
      },
    });

    return unsubscribe;
  }, [ownerSubscriptionUserId, ownerIncludeInactive]);

  // Subscribe to realtime changes for current params
  useEffect(() => {
    if (!lastParams) return;
    const unsubscribe = realTimeServiceService.subscribeToServiceChanges('service-categories-list', {
      filters: {
        category: lastParams.category,
        subcategory: lastParams.subcategory,
        status: 'active',
      },
      onServiceChange: ({ eventType, service }) => {
        setServices(prev => {
          const idx = prev.findIndex(s => s.id === service.id);
          if (eventType === 'DELETE') {
            return idx !== -1 ? prev.filter(s => s.id !== service.id) : prev;
          }
          const matches = matchesParams(service, lastParams);
          if (matches) {
            if (idx !== -1) {
              const copy = [...prev];
              copy[idx] = service;
              return copy;
            }
            return [service, ...prev];
          } else {
            return idx !== -1 ? prev.filter(s => s.id !== service.id) : prev;
          }
        });
      }
    });
    return unsubscribe;
  }, [lastParams, matchesParams]);

  // Load saved services on mount
  useEffect(() => {
    loadSavedServices();
  }, [loadSavedServices]);

  return {
    // State
    services,
    savedServices,
    bookings,
    reviews,
    isLoading,
    error,
    
    // Actions
    searchServices,
    loadOwnerServices,
    getServiceDetails,
    contactProvider,
    createBooking,
    toggleSaveService,
    loadSavedServices,
    loadUserBookings,
    updateBookingStatus,
    createReview,
    checkAvailability,
    getCategories,
    createService,
    updateService,
    
    // Utils
    isServiceSaved: (serviceId: string) => savedServices.includes(serviceId),
    clearError: () => setError(null)
  };
};

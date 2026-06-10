/**
 * Service Service
 * Handles CRUD and search for service_listings using Supabase.
 * In test environments (when Supabase is mocked/unconfigured), falls back to an in-memory store.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Database } from '../types/supabaseExtended';
import type { ServiceListing } from '../types/service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import locationRecommendationService from './locationRecommendationService';
import { LocationCoordinates } from '../types/property';
import { LEGACY_PLAY_STORE_REVIEWER_USER_IDS } from '../utils/playStoreReviewer';
import { formatPostgrestInList } from '../utils/supabaseFilters';
import { normalizeCategoryKey } from '../utils/normalizeCategoryKey';
import { mapCategoryToParent } from '../config/serviceCategoryMapping';

const LOCAL_CREATED_SERVICES_KEY = 'local_created_service_listings';

// Map a Supabase row to our ServiceListing shape.
// Pass userByOwnerId to hydrate ownerName from the users table.
export function mapDbRowToService(
  row: Database['public']['Tables']['service_listings']['Row'],
  userByOwnerId: Map<string, Record<string, unknown>> = new Map()
): ServiceListing {
  const pricing = (row.pricing_info as any) || {};
  const contact = (row.contact_details as any) || {};
  const tags = (row.tags as string[] | null) || [];
  // Try to derive subcategory from tags (first tag) if present
  const subcategory: string | undefined = tags[0];

  const userProfile = userByOwnerId.get(row.owner_id);
  const rawOwnerName = typeof userProfile?.full_name === 'string' ? userProfile.full_name.trim() : '';
  const ownerName = rawOwnerName || 'Service Provider';

  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName,
    serviceName: row.service_name,
    category: row.category,
    subcategory,
    description: row.description,
    location: row.location,
    pricingInfo: {
      type: pricing.type || 'fixed',
      amount: typeof pricing.amount === 'number' ? pricing.amount : undefined,
      currency: pricing.currency || 'KSH',
      packages: pricing.packages,
      hourlyRate: pricing.hourlyRate,
      minimumCharge: pricing.minimumCharge,
      additionalFees: pricing.additionalFees,
    },
    imageUrls: (row.image_urls as string[] | null) || [],
    contactDetails: {
      phone: contact.phone,
      email: contact.email,
      whatsapp: contact.whatsapp,
      website: contact.website,
      socialMedia: contact.socialMedia,
      preferredContactMethod: contact.preferredContactMethod || 'phone',
      availability: contact.availability,
    },
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || undefined,
    status: (row.status as any) || 'active',
    tags,
  };
}

// Basic filter matcher used for client-side filtering and realtime updates
function getComparablePrice(service: ServiceListing): number {
  const pricing = service.pricingInfo as any;
  if (!pricing) return 0;

  if (typeof pricing.amount === 'number') return pricing.amount;
  if (typeof pricing.hourlyRate === 'number') return pricing.hourlyRate;
  if (typeof pricing.startingPrice === 'number') return pricing.startingPrice;

  return 0;
}

const NON_STRICT_CATEGORY_KEYS = ['all', 'search'];
const TOOLS_MATERIALS_CATEGORY_KEYS = ['tools', 'materials', 'rental', 'movers', 'paint', 'tiles'];

function shouldFilterByCategory(category?: string): category is string {
  if (!category) return false;
  const normalized = normalizeCategoryKey(category);
  if (NON_STRICT_CATEGORY_KEYS.includes(normalized)) return false;
  if (TOOLS_MATERIALS_CATEGORY_KEYS.includes(normalized)) return false;
  return true;
}

function matchesFilters(service: ServiceListing, params: Partial<SearchParams>): boolean {
  if (shouldFilterByCategory(params.category)) {
    if (normalizeCategoryKey(service.category) !== normalizeCategoryKey(params.category!)) return false;
  }
  if (params.subcategory) {
    if (normalizeCategoryKey(service.subcategory || '') !== normalizeCategoryKey(params.subcategory)) return false;
  }
  if (params.searchText) {
    const q = params.searchText.toLowerCase();
    const hay = [service.serviceName, service.description, service.category, service.location, ...(service.tags || [])]
      .join(' ')  
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (params.location) {
    if (!service.location.toLowerCase().includes(params.location.toLowerCase())) return false;
  }
  if (params.priceRange) {
    const price = getComparablePrice(service);
    if (price < params.priceRange.min || price > params.priceRange.max) return false;
  }
  // verified/availability are demo-only; skip strict checks
  return true;
}

export type SearchParams = {
  searchText?: string;
  category?: string;
  subcategory?: string;
  location?: string;
  priceRange?: { min: number; max: number };
  availability?: string;
  verified?: boolean;
  sortBy?: 'price' | 'rating' | 'distance' | 'recent';
};

class ServiceService {
  private getSupabaseRequiredError(): Error {
    return new Error('Services database is not configured. Please check your connection and try again.');
  }

  private shouldUseLocalStore(): boolean {
    // Jest sets NODE_ENV='test' and provides JEST_WORKER_ID.
    return !isSupabaseConfigured() && (process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID);
  }

  private async readLocalCreatedServices(): Promise<ServiceListing[]> {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_CREATED_SERVICES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ServiceListing[]) : [];
    } catch {
      return [];
    }
  }

  private async writeLocalCreatedServices(services: ServiceListing[]): Promise<void> {
    try {
      await AsyncStorage.setItem(LOCAL_CREATED_SERVICES_KEY, JSON.stringify(services));
    } catch {
      // best-effort only
    }
  }

  private makeLocalId(): string {
    return `local-service-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private buildLocalServiceListing(serviceData: Partial<ServiceListing>, ownerId: string): ServiceListing {
    const now = new Date().toISOString();

    const mergedTags = [
      ...(serviceData.subcategory ? [normalizeCategoryKey(serviceData.subcategory)] : []),
      ...((serviceData.tags as any) || []),
    ]
      .map((t) => (typeof t === 'string' ? t.trim() : ''))
      .filter((t) => t !== '');
    const uniqueTags = Array.from(new Set(mergedTags));

    const rawCategory = normalizeCategoryKey(String(serviceData.category || 'general'));
    const canonicalCategory = rawCategory === 'general' ? 'general' : mapCategoryToParent(rawCategory);

    const pricingInfo = (serviceData.pricingInfo as any) || { type: 'fixed', amount: 0, currency: 'KSH' };
    const contactDetails = (serviceData.contactDetails as any) || { preferredContactMethod: 'phone' };

    return {
      id: this.makeLocalId(),
      ownerId,
      ownerName: typeof serviceData.ownerName === 'string' ? serviceData.ownerName : 'Service Provider',
      serviceName: serviceData.serviceName || 'New Service',
      category: canonicalCategory,
      subcategory: serviceData.subcategory ? normalizeCategoryKey(serviceData.subcategory) : undefined,
      description: serviceData.description || '',
      location: serviceData.location || 'Nairobi',
      pricingInfo: {
        ...pricingInfo,
        currency: pricingInfo.currency || 'KSH',
      },
      imageUrls: serviceData.imageUrls || [],
      contactDetails: {
        ...contactDetails,
        preferredContactMethod: contactDetails.preferredContactMethod || 'phone',
      },
      createdAt: now,
      updatedAt: now,
      status: (serviceData.status as any) || 'active',
      rating: typeof (serviceData as any).rating === 'number' ? (serviceData as any).rating : undefined,
      reviewCount: typeof (serviceData as any).reviewCount === 'number' ? (serviceData as any).reviewCount : undefined,
      verified: typeof (serviceData as any).verified === 'boolean' ? (serviceData as any).verified : undefined,
      operatingHours: serviceData.operatingHours,
      tags: uniqueTags,
    };
  }

  // Batch-hydrate owner names from the users table and map rows to ServiceListing objects.
  private async mapDbRowsToServices(
    rows: Database['public']['Tables']['service_listings']['Row'][]
  ): Promise<ServiceListing[]> {
    if (rows.length === 0) return [];

    const ownerIds = [...new Set(rows.map((r) => r.owner_id).filter(Boolean))];
    const userByOwnerId = new Map<string, Record<string, unknown>>();

    if (ownerIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', ownerIds);
      (users || []).forEach((u: any) => {
        if (u.id) userByOwnerId.set(u.id, u as Record<string, unknown>);
      });
    }

    return rows.map((row) => mapDbRowToService(row, userByOwnerId));
  }

  async searchServices(params: SearchParams): Promise<ServiceListing[]> {
    if (!isSupabaseConfigured()) {
      if (this.shouldUseLocalStore()) {
        let results = (await this.readLocalCreatedServices()).filter((s) => s.status === 'active');
        results = results.filter((s) => matchesFilters(s, params));

        if (params.sortBy === 'recent') {
          results.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        } else if (params.sortBy === 'price') {
          results.sort((a, b) => getComparablePrice(a) - getComparablePrice(b));
        } else if (params.sortBy === 'rating') {
          results.sort((a, b) => ((b as any).rating || 0) - ((a as any).rating || 0));
        }

        return results;
      }

      throw this.getSupabaseRequiredError();
    }

    const query = supabase
      .from('service_listings')
      .select('*')
      .eq('status', 'active');

    // Never surface Play Store reviewer/test content in public service listings
    if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
      query.not('owner_id', 'in', formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS));
    }

    if (shouldFilterByCategory(params.category)) {
      query.eq('category', normalizeCategoryKey(params.category));
    }
    if (params.subcategory) {
      // Store subcategory as a tag value to filter by
      query.contains('tags' as any, [normalizeCategoryKey(params.subcategory)]);
    }
    if (params.location) {
      query.ilike('location', `%${params.location}%`);
    }
    if (params.searchText) {
      const q = params.searchText.trim();
      if (q) {
        query.or(
          `service_name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`
        );
      }
    }

    if (params.sortBy === 'recent') {
      query.order('created_at', { ascending: false });
    }

    const { data, error } = await query as any;
    if (error) throw new Error(`Failed to load services: ${error.message}`);
    if (!data) throw new Error('Failed to load services');

    let rows = data as Database['public']['Tables']['service_listings']['Row'][];

    // Defensive filter in case server-side filtering is bypassed
    if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
      rows = rows.filter((r) => !LEGACY_PLAY_STORE_REVIEWER_USER_IDS.includes(r.owner_id));
    }

    let results = await this.mapDbRowsToServices(rows);

    // Client-side price filter since amount is inside JSON
    if (params.priceRange) {
      results = results.filter((s) => matchesFilters(s, { priceRange: params.priceRange }));
    }

    if (params.sortBy === 'price') {
      results.sort((a, b) => getComparablePrice(a) - getComparablePrice(b));
    } else if (params.sortBy === 'rating') {
      results.sort((a, b) => ((b as any).rating || 0) - ((a as any).rating || 0));
    }

    return results;
  }

  async getServicesByOwner(
    ownerId: string,
    options?: { includeInactive?: boolean }
  ): Promise<ServiceListing[]> {
    if (!isSupabaseConfigured()) {
      if (this.shouldUseLocalStore()) {
        const includeInactive = options?.includeInactive === true;
        return (await this.readLocalCreatedServices())
          .filter((s) => s.ownerId === ownerId)
          .filter((s) => (includeInactive ? true : s.status === 'active'))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      }

      throw this.getSupabaseRequiredError();
    }

    const includeInactive = options?.includeInactive === true;

    let query = supabase
      .from('service_listings')
      .select('*')
      .eq('owner_id', ownerId);

    if (!includeInactive) {
      query = query.eq('status', 'active');
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query as any;
    if (error) throw new Error(`Failed to load services: ${error.message}`);
    if (!data) throw new Error('Failed to load services');

    return this.mapDbRowsToServices(
      data as Database['public']['Tables']['service_listings']['Row'][]
    );
  }

  async getServiceById(id: string): Promise<ServiceListing | null> {
    if (!isSupabaseConfigured()) {
      if (this.shouldUseLocalStore()) {
        const local = await this.readLocalCreatedServices();
        return local.find((s) => s.id === id) || null;
      }

      throw this.getSupabaseRequiredError();
    }

    const { data, error } = await supabase
      .from('service_listings')
      .select('*')
      .eq('id', id)
      .maybeSingle() as any;
    if (error) throw new Error(`Failed to load service: ${error.message}`);
    if (!data) return null;

    const mapped = await this.mapDbRowsToServices([
      data as Database['public']['Tables']['service_listings']['Row'],
    ]);
    return mapped[0] ?? null;
  }

  async createServiceListing(serviceData: Partial<ServiceListing>, ownerId: string): Promise<ServiceListing> {
    if (!isSupabaseConfigured()) {
      if (this.shouldUseLocalStore()) {
        const listing = this.buildLocalServiceListing(serviceData, ownerId);
        const local = await this.readLocalCreatedServices();
        local.push(listing);
        await this.writeLocalCreatedServices(local);
        return listing;
      }

      throw this.getSupabaseRequiredError();
    }

    const mergedTags = [
      ...(serviceData.subcategory ? [normalizeCategoryKey(serviceData.subcategory)] : []),
      ...((serviceData.tags as any) || []),
    ]
      .map((t) => (typeof t === 'string' ? t.trim() : ''))
      .filter((t) => t !== '');
    const uniqueTags = Array.from(new Set(mergedTags));

    const rawCategory = normalizeCategoryKey(String(serviceData.category || 'general'));
    const canonicalCategory = rawCategory === 'general' ? 'general' : mapCategoryToParent(rawCategory);

    const toInsert = {
      owner_id: ownerId,
      service_name: serviceData.serviceName || 'New Service',
      category: canonicalCategory,
      description: serviceData.description || '',
      location: serviceData.location || 'Nairobi',
      pricing_info: serviceData.pricingInfo || { type: 'fixed', amount: 0, currency: 'KSH' },
      image_urls: serviceData.imageUrls || [],
      contact_details: serviceData.contactDetails || { preferredContactMethod: 'phone' },
      status: (serviceData.status as any) || 'active',
      tags: uniqueTags,
    } as Database['public']['Tables']['service_listings']['Insert'];

    const { data, error } = await supabase
      .from('service_listings')
      .insert(toInsert as any)
      .select('*')
      .single() as any;
    if (error || !data) throw error || new Error('Failed to create service');

    const mapped = await this.mapDbRowsToServices([
      data as Database['public']['Tables']['service_listings']['Row'],
    ]);
    if (!mapped[0]) throw new Error('Failed to map created service');
    return mapped[0];
  }

  async updateServiceListing(id: string, updates: Partial<ServiceListing>): Promise<ServiceListing> {
    if (!isSupabaseConfigured()) {
      if (this.shouldUseLocalStore()) {
        const local = await this.readLocalCreatedServices();
        const index = local.findIndex((s) => s.id === id);
        const existing = index >= 0 ? local[index] : null;
        if (!existing) {
          throw new Error('Service not found');
        }

        const now = new Date().toISOString();
        const nextRawCategory = updates.category ? normalizeCategoryKey(updates.category) : undefined;
        const nextCategory =
          nextRawCategory === undefined
            ? existing.category
            : nextRawCategory === 'general'
              ? 'general'
              : mapCategoryToParent(nextRawCategory);
        const nextSubcategory =
          typeof updates.subcategory === 'string' ? normalizeCategoryKey(updates.subcategory) : existing.subcategory;

        const mergedTags = [
          ...(nextSubcategory ? [nextSubcategory] : []),
          ...(((updates.tags ?? existing.tags) as any) || []),
        ]
          .map((t) => (typeof t === 'string' ? t.trim() : ''))
          .filter((t) => t !== '');
        const uniqueTags = Array.from(new Set(mergedTags));

        const updated: ServiceListing = {
          ...existing,
          ...updates,
          category: nextCategory,
          subcategory: nextSubcategory,
          pricingInfo: (updates.pricingInfo as any) || existing.pricingInfo,
          contactDetails: (updates.contactDetails as any) || existing.contactDetails,
          imageUrls: updates.imageUrls || existing.imageUrls,
          updatedAt: now,
          tags: uniqueTags,
        };

        local[index] = updated;
        await this.writeLocalCreatedServices(local);
        return updated;
      }

      throw this.getSupabaseRequiredError();
    }

    const mergedTags = [
      ...(updates.subcategory ? [normalizeCategoryKey(updates.subcategory)] : []),
      ...((updates.tags as any) || []),
    ]
      .map((t) => (typeof t === 'string' ? t.trim() : ''))
      .filter((t) => t !== '');
    const uniqueTags = mergedTags.length > 0 ? Array.from(new Set(mergedTags)) : undefined;

    const toUpdate: Database['public']['Tables']['service_listings']['Update'] = {
      service_name: updates.serviceName,
      category: updates.category
        ? (() => {
            const raw = normalizeCategoryKey(updates.category);
            return raw === 'general' ? 'general' : mapCategoryToParent(raw);
          })()
        : undefined,
      description: updates.description,
      location: updates.location,
      pricing_info: updates.pricingInfo as any,
      image_urls: updates.imageUrls as any,
      contact_details: updates.contactDetails as any,
      status: updates.status as any,
      tags: uniqueTags as any,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('service_listings')
      .update(toUpdate)
      .eq('id', id)
      .select('*')
      .single() as any;
    if (error || !data) throw error || new Error('Failed to update service');

    const mapped = await this.mapDbRowsToServices([
      data as Database['public']['Tables']['service_listings']['Row'],
    ]);
    if (!mapped[0]) throw new Error('Failed to map updated service');
    return mapped[0];
  }

  async getServicesNearLocation(
    centerCoordinates: LocationCoordinates,
    radiusKm: number = 10,
    limit: number = 20,
    filters?: {
      category?: string;
      subcategory?: string;
    }
  ): Promise<{ service: ServiceListing; distance?: number; distanceFormatted?: string }[]> {
    if (!isSupabaseConfigured()) {
      if (this.shouldUseLocalStore()) {
        const services = await this.searchServices({
          category: filters?.category,
          subcategory: filters?.subcategory,
        });
        return services.slice(0, limit).map((service) => ({
          service,
          distance: undefined,
          distanceFormatted: 'Distance unknown',
        }));
      }

      throw this.getSupabaseRequiredError();
    }

    const { data, error } = await supabase.rpc('get_nearby_services', {
      lat: centerCoordinates.latitude,
      lng: centerCoordinates.longitude,
      radius_km: radiusKm
    });

    if (error) {
      // RPC unavailable — fall back to standard search within configured DB
      const params: SearchParams = {
        category: filters?.category,
        subcategory: filters?.subcategory,
      };
      const services = await this.searchServices(params);
      return services.slice(0, limit).map((service) => ({
        service,
        distance: undefined,
        distanceFormatted: 'Distance unknown',
      }));
    }

    const services = await Promise.all(
      ((data as any[]) || []).map(async (row: any) => {
        const service = await this.getServiceById(row.id);
        if (!service) return null;
        if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.includes(service.ownerId)) return null;
        return {
          service,
          distance: row.distance_km as number,
          distanceFormatted: `${row.distance_km}km away`,
        };
      })
    );

    return services.filter((s) => s !== null) as {
      service: ServiceListing;
      distance?: number;
      distanceFormatted?: string;
    }[];
  }

  async getRecommendedServicesNearby(
    useCurrentLocation: boolean = true,
    radiusKm: number = 10,
    limit: number = 20,
    filters?: {
      category?: string;
      subcategory?: string;
    }
  ): Promise<{ service: ServiceListing; distance?: number; distanceFormatted?: string }[]> {
    let centerLocation: LocationCoordinates;

    if (useCurrentLocation) {
      const currentLocation = await locationRecommendationService.getUserCurrentLocation();
      centerLocation = currentLocation || locationRecommendationService.getDefaultLocation();
    } else {
      centerLocation = locationRecommendationService.getDefaultLocation();
    }

    return this.getServicesNearLocation(centerLocation, radiusKm, limit, filters);
  }
}

export const serviceService = new ServiceService();
export default serviceService;

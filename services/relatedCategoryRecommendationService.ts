import { supabase } from './supabaseClient';
import { Property } from '../types/property';
import { JobPosting } from '../types/job';
import { ServiceListing } from '../types/service';
import { LEGACY_PLAY_STORE_REVIEWER_USER_IDS } from '../utils/playStoreReviewer';
import { formatPostgrestInList } from '../utils/supabaseFilters';

export interface RelatedItem {
  id: string;
  type: 'property' | 'job' | 'service';
  title: string;
  description?: string;
  imageUrl?: string;
  price?: number | string;
  location?: string;
  category?: string;
  subcategory?: string;
  relevanceScore: number;
  matchReason: string;
  createdAt?: string;
  metadata?: Record<string, any>;
}

export interface RelatedRecommendationOptions {
  limit?: number;
  includePopular?: boolean;
  maxDistance?: number;
  excludeIds?: string[];
}

class RelatedCategoryRecommendationService {
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private calculateRelevanceScore(
    item: any,
    referenceItem: any,
    userInteractions?: any[]
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    if (item.category === referenceItem.category) {
      score += 40;
      reasons.push('Same category');
    }

    if (item.subcategory && item.subcategory === referenceItem.subcategory) {
      score += 30;
      reasons.push('Same subcategory');
    }

    if (item.location?.town && referenceItem.location?.town) {
      if (item.location.town === referenceItem.location.town) {
        score += 20;
        reasons.push(`Same town (${item.location.town})`);
      } else if (
        item.location.county &&
        referenceItem.location?.county &&
        item.location.county === referenceItem.location.county
      ) {
        score += 10;
        reasons.push(`Same county (${item.location.county})`);
      }
    }

    if (
      item.location?.coordinates &&
      referenceItem.location?.coordinates
    ) {
      const distance = this.calculateDistance(
        referenceItem.location.coordinates.latitude,
        referenceItem.location.coordinates.longitude,
        item.location.coordinates.latitude,
        item.location.coordinates.longitude
      );

      if (distance <= 5) {
        score += 15;
        reasons.push('Very close proximity');
      } else if (distance <= 10) {
        score += 10;
        reasons.push('Nearby location');
      } else if (distance <= 20) {
        score += 5;
        reasons.push('In the area');
      }
    }

    if (userInteractions && userInteractions.length > 0) {
      const hasInteractedWithCategory = userInteractions.some(
        (interaction: any) =>
          interaction.metadata?.category === item.category
      );
      if (hasInteractedWithCategory) {
        score += 15;
        reasons.push('Matches your interests');
      }
    }

    if (item.view_count && item.view_count > 100) {
      score += 10;
      reasons.push('Popular listing');
    } else if (item.inquiry_count && item.inquiry_count > 20) {
      score += 10;
      reasons.push('High interest');
    }

    if (item.created_at || item.createdAt) {
      const createdDate = new Date(item.created_at || item.createdAt);
      const daysSinceCreation =
        (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation <= 7) {
        score += 5;
        reasons.push('Recently listed');
      }
    }

    if (referenceItem.price && item.price) {
      const refPrice = typeof referenceItem.price === 'number' 
        ? referenceItem.price 
        : parseFloat(String(referenceItem.price).replace(/[^0-9.]/g, ''));
      const itemPrice = typeof item.price === 'number' 
        ? item.price 
        : parseFloat(String(item.price).replace(/[^0-9.]/g, ''));
      
      if (!isNaN(refPrice) && !isNaN(itemPrice)) {
        const priceRatio = itemPrice / refPrice;
        if (priceRatio >= 0.7 && priceRatio <= 1.3) {
          score += 8;
          reasons.push('Similar price range');
        }
      }
    }

    return { score, reasons };
  }

  async getRelatedProperties(
    property: Property,
    userId?: string,
    options: RelatedRecommendationOptions = {}
  ): Promise<RelatedItem[]> {
    try {
      const {
        limit = 6,
        includePopular = true,
        maxDistance = 50,
        excludeIds = []
      } = options;

      let userInteractions: any[] = [];
      if (userId) {
        const { data } = await supabase
          .from('user_activities')
          .select('*')
          .eq('user_id', userId)
          .eq('content_type', 'property')
          .order('created_at', { ascending: false })
          .limit(50);
        userInteractions = data || [];
      }

      let query = supabase
        .from('property_listings')
        .select('*')
        .eq('status', 'available')
        .neq('id', property.id);

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', formatPostgrestInList(excludeIds));
      }

      if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
        query = query.not(
          'owner_id',
          'in',
          formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS)
        );
      }

      if (property.property_type) {
        query = query.or(
          `property_type.eq.${property.property_type},category.eq.${property.category || property.property_type}`
        );
      }

      if (property.location?.county) {
        query = query.eq('location_coordinates->>county', property.location.county);
      }

      const { data: properties, error } = await query.limit(limit * 3);

      if (error) throw error;

      const scoredItems: RelatedItem[] = (properties || []).map((item: any) => {
        const { score, reasons } = this.calculateRelevanceScore(
          {
            ...item,
            category: item.property_type || item.category,
            subcategory: item.listing_type,
            location: item.location_coordinates || item.location,
            price: item.price,
            view_count: item.view_count,
            inquiry_count: item.inquiry_count,
            created_at: item.created_at
          },
          {
            ...property,
            location: property.location,
            price: property.price
          },
          userInteractions
        );

        const imageUrls = item.image_urls as string[] | null;
        const locationCoords = item.location_coordinates as any;

        return {
          id: item.id,
          type: 'property' as const,
          title: item.title,
          description: item.description || '',
          imageUrl: imageUrls?.[0],
          price: item.price,
          location: locationCoords?.address || locationCoords?.town || item.location,
          category: item.property_type,
          subcategory: item.listing_type,
          relevanceScore: score,
          matchReason: reasons[0] || 'Related listing',
          createdAt: item.created_at,
          metadata: {
            propertyType: item.property_type,
            bedrooms: item.bedrooms,
            bathrooms: item.bathrooms,
            allReasons: reasons
          }
        };
      });

      scoredItems.sort((a, b) => b.relevanceScore - a.relevanceScore);

      const topItems = scoredItems.slice(0, limit);

      if (includePopular && topItems.length < limit) {
        const popularItems = await this.getPopularProperties(
          property.location?.county || 'Kenya',
          limit - topItems.length,
          [...excludeIds, property.id, ...topItems.map(i => i.id)]
        );
        // Ensure type is set correctly for popular items
        const typedPopularItems = popularItems.map(item => ({ ...item, type: 'property' as const }));
        topItems.push(...typedPopularItems);
      }

      return topItems.slice(0, limit);
    } catch (error) {
      console.error('Error fetching related properties:', error);
      return [];
    }
  }

  async getRelatedJobs(
    job: JobPosting,
    userId?: string,
    options: RelatedRecommendationOptions = {}
  ): Promise<RelatedItem[]> {
    try {
      const {
        limit = 6,
        includePopular = true,
        excludeIds = []
      } = options;

      let userInteractions: any[] = [];
      if (userId) {
        const { data } = await supabase
          .from('user_activities')
          .select('*')
          .eq('user_id', userId)
          .eq('content_type', 'job')
          .order('created_at', { ascending: false })
          .limit(50);
        userInteractions = data || [];
      }

      let query = supabase
        .from('job_postings')
        .select('*')
        .eq('status', 'open')
        .neq('id', job.id);

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', formatPostgrestInList(excludeIds));
      }

      if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
        query = query.not(
          'employer_id',
          'in',
          formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS)
        );
      }

      if (job.category) {
        query = query.or(
          `category.eq.${job.category},subcategory.eq.${job.subcategory || job.category}`
        );
      }

      const { data: jobs, error } = await query.limit(limit * 3);

      if (error) throw error;

      const scoredItems: RelatedItem[] = (jobs || []).map((item: any) => {
        const { score, reasons } = this.calculateRelevanceScore(
          {
            ...item,
            category: item.category,
            subcategory: item.subcategory,
            location: item.location,
            price: item.salary,
            view_count: item.viewsCount,
            created_at: item.created_at
          },
          {
            ...job,
            price: job.salary?.min || job.salary?.max
          },
          userInteractions
        );

        return {
          id: item.id,
          type: 'job' as const,
          title: item.job_title,
          description: item.description || '',
          price: item.salary,
          location: `${item.location?.town || ''}, ${item.location?.county || ''}`.trim().replace(/^,\s*/, ''),
          category: item.category,
          subcategory: item.subcategory,
          relevanceScore: score,
          matchReason: reasons[0] || 'Related job',
          createdAt: item.created_at,
          metadata: {
            jobType: item.job_type,
            experienceLevel: item.experience_level,
            company: item.employer?.company,
            allReasons: reasons
          }
        };
      });

      scoredItems.sort((a, b) => b.relevanceScore - a.relevanceScore);

      const topItems = scoredItems.slice(0, limit);

      if (includePopular && topItems.length < limit) {
        const popularItems = await this.getPopularJobs(
          job.category,
          limit - topItems.length,
          [...excludeIds, job.id, ...topItems.map(i => i.id)]
        );
        // Ensure type is set correctly for popular items
        const typedPopularItems = popularItems.map(item => ({ ...item, type: 'job' as const }));
        topItems.push(...typedPopularItems);
      }

      return topItems.slice(0, limit);
    } catch (error) {
      console.error('Error fetching related jobs:', error);
      return [];
    }
  }

  async getRelatedServices(
    service: ServiceListing,
    userId?: string,
    options: RelatedRecommendationOptions = {}
  ): Promise<RelatedItem[]> {
    try {
      const {
        limit = 6,
        includePopular = true,
        excludeIds = []
      } = options;

      let userInteractions: any[] = [];
      if (userId) {
        const { data } = await supabase
          .from('user_activities')
          .select('*')
          .eq('user_id', userId)
          .eq('content_type', 'service')
          .order('created_at', { ascending: false })
          .limit(50);
        userInteractions = data || [];
      }

      let query = supabase
        .from('service_listings')
        .select('*')
        .eq('status', 'active')
        .neq('id', service.id);

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', formatPostgrestInList(excludeIds));
      }

      if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
        query = query.not(
          'owner_id',
          'in',
          formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS)
        );
      }

      if (service.category) {
        query = query.eq('category', service.category);
      }

      const { data: services, error } = await query.limit(limit * 3);

      if (error) throw error;

      const scoredItems: RelatedItem[] = (services || []).map((item: any) => {
        const pricingInfo = item.pricing_info as any;
        const basePrice = pricingInfo?.base_price || pricingInfo?.amount;

        const { score, reasons } = this.calculateRelevanceScore(
          {
            ...item,
            category: item.category,
            subcategory: item.subcategory,
            location: { town: item.location, county: item.location },
            price: basePrice,
            view_count: 0,
            created_at: item.created_at
          },
          {
            ...service,
            location: { town: service.location, county: service.location },
            price: service.pricingInfo?.amount || service.pricingInfo
          },
          userInteractions
        );

        const imageUrls = item.image_urls as string[] | null;

        return {
          id: item.id,
          type: 'service' as const,
          title: item.service_name,
          description: item.description || '',
          imageUrl: imageUrls?.[0],
          price: basePrice,
          location: item.location,
          category: item.category,
          subcategory: item.subcategory,
          relevanceScore: score,
          matchReason: reasons[0] || 'Related service',
          createdAt: item.created_at,
          metadata: {
            rating: item.rating,
            reviewCount: item.reviewCount,
            verified: item.verified,
            allReasons: reasons
          }
        };
      });

      scoredItems.sort((a, b) => b.relevanceScore - a.relevanceScore);

      const topItems = scoredItems.slice(0, limit);

      if (includePopular && topItems.length < limit) {
        const popularItems = await this.getPopularServices(
          service.category,
          limit - topItems.length,
          [...excludeIds, service.id, ...topItems.map(i => i.id)]
        );
        // Ensure type is set correctly for popular items
        const typedPopularItems = popularItems.map(item => ({ ...item, type: 'service' as const }));
        topItems.push(...typedPopularItems);
      }

      return topItems.slice(0, limit);
    } catch (error) {
      console.error('Error fetching related services:', error);
      return [];
    }
  }

  private async getPopularProperties(
    location: string,
    limit: number,
    excludeIds: string[]
  ): Promise<RelatedItem[]> {
    try {
      let query = supabase
        .from('property_listings')
        .select('*')
        .eq('status', 'available')
        .order('view_count', { ascending: false });

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', formatPostgrestInList(excludeIds));
      }

      if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
        query = query.not(
          'owner_id',
          'in',
          formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS)
        );
      }

      const { data: properties } = await query.limit(limit);

      return (properties || []).map((item: any) => {
        const imageUrls = item.image_urls as string[] | null;
        const locationCoords = item.location_coordinates as any;

        return {
          id: item.id,
          type: 'property' as const,
          title: item.title,
          description: item.description,
          imageUrl: imageUrls?.[0],
          price: item.price,
          location: locationCoords?.address || locationCoords?.town,
          category: item.property_type,
          relevanceScore: 25,
          matchReason: 'Popular nearby',
          createdAt: item.created_at,
          metadata: {
            propertyType: item.property_type,
            bedrooms: item.bedrooms
          }
        };
      });
    } catch (error) {
      console.error('Error fetching popular properties:', error);
      return [];
    }
  }

  private async getPopularJobs(
    category: string,
    limit: number,
    excludeIds: string[]
  ): Promise<RelatedItem[]> {
    try {
      let query = supabase
        .from('job_postings')
        .select('*')
        .eq('status', 'open')
        .order('viewsCount', { ascending: false });

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', formatPostgrestInList(excludeIds));
      }

      if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
        query = query.not(
          'employer_id',
          'in',
          formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS)
        );
      }

      const { data: jobs } = await query.limit(limit);

      return (jobs || []).map((item: any) => ({
        id: item.id,
        type: 'job' as const,
        title: item.job_title,
        description: item.description,
        price: item.salary,
        location: `${item.location?.town || ''}, ${item.location?.county || ''}`.trim(),
        category: item.category,
        relevanceScore: 25,
        matchReason: 'Popular job',
        createdAt: item.created_at,
        metadata: {
          jobType: item.job_type,
          company: item.employer?.company
        }
      }));
    } catch (error) {
      console.error('Error fetching popular jobs:', error);
      return [];
    }
  }

  private async getPopularServices(
    category: string,
    limit: number,
    excludeIds: string[]
  ): Promise<RelatedItem[]> {
    try {
      let query = supabase
        .from('service_listings')
        .select('*')
        .eq('status', 'active')
        .order('rating', { ascending: false });

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', formatPostgrestInList(excludeIds));
      }

      if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
        query = query.not(
          'owner_id',
          'in',
          formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS)
        );
      }

      const { data: services } = await query.limit(limit);

      return (services || []).map((item: any) => {
        const imageUrls = item.image_urls as string[] | null;
        const pricingInfo = item.pricing_info as any;

        return {
          id: item.id,
          type: 'service' as const,
          title: item.service_name,
          description: item.description,
          imageUrl: imageUrls?.[0],
          price: pricingInfo?.base_price,
          location: item.location,
          category: item.category,
          relevanceScore: 25,
          matchReason: 'Popular service',
          createdAt: item.created_at,
          metadata: {
            rating: item.rating,
            verified: item.verified
          }
        };
      });
    } catch (error) {
      console.error('Error fetching popular services:', error);
      return [];
    }
  }

  async recordRecommendationView(
    userId: string,
    item: RelatedItem
  ): Promise<void> {
    try {
      await supabase.from('user_activities').insert([
        {
          user_id: userId,
          action: 'view_recommendation',
          content_type: item.type,
          content_id: item.id,
          metadata: {
            relevance_score: item.relevanceScore,
            match_reason: item.matchReason,
            ...item.metadata
          },
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (error) {
      console.error('Error recording recommendation view:', error);
    }
  }

  async recordRecommendationClick(
    userId: string,
    item: RelatedItem
  ): Promise<void> {
    try {
      await supabase.from('user_activities').insert([
        {
          user_id: userId,
          action: 'click_recommendation',
          content_type: item.type,
          content_id: item.id,
          metadata: {
            relevance_score: item.relevanceScore,
            match_reason: item.matchReason,
            ...item.metadata
          },
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (error) {
      console.error('Error recording recommendation click:', error);
    }
  }
}

export const relatedCategoryRecommendationService = new RelatedCategoryRecommendationService();

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { LEGACY_PLAY_STORE_REVIEWER_USER_IDS } from '../utils/playStoreReviewer';
import { formatPostgrestInList } from '../utils/supabaseFilters';
import { mapCategoryToParent, PARENT_CATEGORIES } from '../config/serviceCategoryMapping';

export interface CategoryCount {
  category: string;
  count: number;
}

export interface CategoryCountCache {
  [category: string]: number;
}

class CategoryCountService {
  private propertyCountCache: CategoryCountCache = {};
  private jobCountCache: CategoryCountCache = {};
  private serviceCountCache: CategoryCountCache = {};
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_DURATION;
  }

  async getPropertyCountsByCategory(): Promise<CategoryCountCache> {
    if (this.isCacheValid() && Object.keys(this.propertyCountCache).length > 0) {
      return this.propertyCountCache;
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    let query = supabase
      .from('property_listings')
      .select('property_type')
      .eq('status', 'available');

    if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
      query = query.not(
        'owner_id',
        'in',
        formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS)
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    const counts: CategoryCountCache = {};
    (data || []).forEach((row: { property_type: string }) => {
      const type = row.property_type;
      counts[type] = (counts[type] || 0) + 1;
    });

    this.propertyCountCache = counts;
    this.cacheTimestamp = Date.now();
    return counts;
  }

  async getJobCountsByCategory(): Promise<CategoryCountCache> {
    if (this.isCacheValid() && Object.keys(this.jobCountCache).length > 0) {
      return this.jobCountCache;
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const sb = supabase as any;
    let query = sb
      .from('job_postings')
      .select('category')
      .in('status', ['open', 'active']);

    if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
      query = query.not(
        'employer_id',
        'in',
        formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS)
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    const counts: CategoryCountCache = {};
    (data || []).forEach((row: any) => {
      const category = typeof row?.category === 'string' ? row.category : '';
      if (!category) return;
      counts[category] = (counts[category] || 0) + 1;
    });

    this.jobCountCache = counts;
    this.cacheTimestamp = Date.now();
    return counts;
  }

  async getServiceCountsByCategory(): Promise<CategoryCountCache> {
    if (this.isCacheValid() && Object.keys(this.serviceCountCache).length > 0) {
      return this.serviceCountCache;
    }

    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    let query = supabase
      .from('service_listings')
      .select('category')
      .eq('status', 'active');

    if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
      query = query.not(
        'owner_id',
        'in',
        formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS)
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    // Count exactly what's in the database; map legacy subcategory values to parent for display
    const rawCounts: CategoryCountCache = {};
    (data || []).forEach((row: { category: string }) => {
      const cat = row.category;
      rawCounts[cat] = (rawCounts[cat] || 0) + 1;
    });

    const counts: CategoryCountCache = {};
    PARENT_CATEGORIES.forEach((parent) => {
      counts[parent] = 0;
    });
    Object.entries(rawCounts).forEach(([category, count]) => {
      const parent = mapCategoryToParent(category);
      if (counts[parent] !== undefined) {
        counts[parent] += count;
      } else {
        counts[category] = (counts[category] || 0) + count;
      }
    });

    this.serviceCountCache = counts;
    this.cacheTimestamp = Date.now();
    return counts;
  }

  async getTotalPropertyCount(): Promise<number> {
    if (!isSupabaseConfigured()) return 0;

    const { count, error } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available');

    if (error) return 0;
    return count || 0;
  }

  async getTotalJobCount(): Promise<number> {
    if (!isSupabaseConfigured()) return 0;

    const { count, error } = await supabase
      .from('job_postings')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'active']);

    if (error) return 0;
    return count || 0;
  }

  async getTotalServiceCount(): Promise<number> {
    if (!isSupabaseConfigured()) return 0;

    const { count, error } = await supabase
      .from('service_listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (error) return 0;
    return count || 0;
  }

  clearCache(): void {
    this.propertyCountCache = {};
    this.jobCountCache = {};
    this.serviceCountCache = {};
    this.cacheTimestamp = 0;
  }
}

export const categoryCountService = new CategoryCountService();
export default categoryCountService;

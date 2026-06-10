/**
 * Category Management Service
 * Handles dynamic category creation and management across all modules
 * Automatically creates new categories when items are added
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Category {
  id: string;
  module: 'property' | 'job' | 'service';
  key: string;
  name: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  light_color: string;
  count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  display_order?: number;
}

export interface CategoryCreateData {
  module: 'property' | 'job' | 'service';
  key: string;
  name: string;
  label?: string;
  description?: string;
  icon?: string;
  color?: string;
  lightColor?: string;
  displayOrder?: number;
}

class CategoryManagementService {
  private tableName = 'categories';
  private cacheKey = 'cached_categories';
  private cacheExpiry = 300000; // 5 minutes

  /**
   * Get all categories for a specific module
   */
  async getCategoriesByModule(module: 'property' | 'job' | 'service'): Promise<Category[]> {
    try {
      // Check cache first
      const cached = await this.getCachedCategories(module);
      if (cached) {
        return cached;
      }

      if (!isSupabaseConfigured()) {
        // Return default categories for demo mode
        return this.getDefaultCategories(module);
      }

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('module', module)
        .eq('is_active', true)
        .order('display_order', { ascending: true }) as any;

      if (error || !data) {
        return this.getDefaultCategories(module);
      }

      const categories: Category[] = (data as any[]).map((row: any) => ({
        id: row.id,
        module: row.module,
        key: row.key,
        name: row.name,
        label: row.label,
        description: row.description,
        icon: row.icon,
        color: row.color,
        light_color: row.light_color,
        count: row.count || 0,
        display_order: row.display_order,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
      
      // Update counts
      const categoriesWithCounts = await this.updateCategoryCounts(categories, module);
      
      // Cache the results
      await this.cacheCategories(module, categoriesWithCounts);
      
      return categoriesWithCounts;
    } catch (error) {
      return this.getDefaultCategories(module);
    }
  }

  /**
   * Create or update a category
   */
  async upsertCategory(categoryData: CategoryCreateData): Promise<Category | null> {
    try {
      if (!isSupabaseConfigured()) {
        // In demo mode, just return a mock category
        return this.createMockCategory(categoryData);
      }

      // Check if category already exists
      const existing = await this.getCategoryByKey(categoryData.module, categoryData.key);
      
      if (existing) {
        // Update the existing category count or other properties if needed
        return existing;
      }

      // Generate default values if not provided
      const defaultIcon = this.getDefaultIcon(categoryData.module, categoryData.key);
      const defaultColors = this.getDefaultColors(categoryData.module);
      
      const newCategory = {
        module: categoryData.module,
        key: categoryData.key.toLowerCase().replace(/\s+/g, '_'),
        name: categoryData.name,
        label: categoryData.label || categoryData.name,
        description: categoryData.description || `${categoryData.name} in ${categoryData.module}`,
        icon: categoryData.icon || defaultIcon,
        color: categoryData.color || defaultColors.color,
        light_color: categoryData.lightColor || defaultColors.lightColor,
        count: 0,
        is_active: true,
        display_order: categoryData.displayOrder || 999,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('categories')
        .insert(newCategory as any)
        .select()
        .single() as any;

      if (error) {
        return null;
      }

      // Clear cache for this module
      await this.clearCacheForModule(categoryData.module);
      
      return data as Category;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check and create category if it doesn't exist
   */
  async ensureCategoryExists(module: 'property' | 'job' | 'service', categoryKey: string, categoryName?: string): Promise<void> {
    try {
      const existing = await this.getCategoryByKey(module, categoryKey);
      
      if (!existing) {
        await this.upsertCategory({
          module,
          key: categoryKey,
          name: categoryName || this.formatCategoryName(categoryKey),
          label: categoryName || this.formatCategoryName(categoryKey),
          description: `${this.formatCategoryName(categoryKey)} listings`
        });
      }
    } catch (error) {
      // Silently handle errors
    }
  }

  /**
   * Get a specific category by key
   */
  private async getCategoryByKey(module: 'property' | 'job' | 'service', key: string): Promise<Category | null> {
    try {
      if (!isSupabaseConfigured()) {
        const categories = this.getDefaultCategories(module);
        return categories.find(c => c.key === key) || null;
      }

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('module', module)
        .eq('key', key.toLowerCase().replace(/\s+/g, '_'))
        .single() as any;

      if (error || !data) {
        return null;
      }
      
      const row: any = data;
      return {
        id: row.id,
        module: row.module,
        key: row.key,
        name: row.name,
        label: row.label,
        description: row.description,
        icon: row.icon,
        color: row.color,
        light_color: row.light_color,
        count: row.count || 0,
        display_order: row.display_order,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Update category counts based on actual data
   */
  private async updateCategoryCounts(categories: Category[], module: 'property' | 'job' | 'service'): Promise<Category[]> {
    try {
      if (!isSupabaseConfigured()) {
        // For demo mode, return categories with mock counts
        return categories.map(cat => ({
          ...cat,
          count: Math.floor(Math.random() * 100) + 10
        }));
      }

      // Get counts from respective tables
      const tableName = module === 'property' ? 'property_listings' : 
                       module === 'job' ? 'job_postings' : 
                       'service_listings';
      
      const typeField = module === 'property' ? 'property_type' : 
                       module === 'job' ? 'category' : 
                       'category';

      const countPromises = categories.map(async (category) => {
        const categoryValue = module === 'job' ? category.name : category.key;
        const { count } = await (supabase
          .from(tableName as any)
          .select('*', { count: 'exact', head: true })
          .eq(typeField, categoryValue)
          .eq('status', module === 'property' ? 'available' : module === 'job' ? 'open' : 'active') as any);
        
        return { ...category, count: count || 0 };
      });
      
      return await Promise.all(countPromises);
    } catch (error) {
      return categories;
    }
  }

  /**
   * Get cached categories
   */
  private async getCachedCategories(module: string): Promise<Category[] | null> {
    try {
      const cacheKey = `${this.cacheKey}_${module}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      
      if (Date.now() - timestamp > this.cacheExpiry) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }
      
      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Cache categories
   */
  private async cacheCategories(module: string, categories: Category[]): Promise<void> {
    try {
      const cacheKey = `${this.cacheKey}_${module}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        data: categories,
        timestamp: Date.now()
      }));
    } catch (error) {
      // Silently handle cache errors
    }
  }

  /**
   * Clear cache for a specific module
   */
  private async clearCacheForModule(module: string): Promise<void> {
    try {
      const cacheKey = `${this.cacheKey}_${module}`;
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      // Silently handle cache errors
    }
  }

  /**
   * Format category key to display name
   */
  private formatCategoryName(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace('And', 'and')
      .replace('Or', 'or');
  }

  /**
   * Get default icon for category
   */
  private getDefaultIcon(module: string, key: string): string {
    const iconMap: { [key: string]: string } = {
      // Property icons
      houses: '🏠',
      apartments: '🏢',
      one_bedroom: '🛏️',
      two_bedroom: '🛏️',
      three_bedroom: '🏠',
      bedsitters: '🛌',
      commercial: '🏪',
      industrial: '🏭',
      offices: '🏢',
      land_plots: '🏞️',
      container_house: '📦',
      cabin: '🏕️',
      farm_house: '🌾',
      cottage: '🏘️',
      condo: '🏙️',
      bungalow: '🏚️',
      villa: '🏰',
      town_house: '🏘️',
      mansionate: '🏛️',
      duplex_house: '🏬',
      // Job icons
      technology: '💻',
      healthcare: '🏥',
      education: '🎓',
      finance: '💰',
      retail: '🛍️',
      construction: '🏗️',
      hospitality: '🏨',
      // Service icons
      plumbing: '🔧',
      electrical: '⚡',
      cleaning: '🧹',
      moving: '📦',
      catering: '🍽️',
      photography: '📷',
      // Default
      default: '📋'
    };
    
    return iconMap[key.toLowerCase()] || iconMap.default;
  }

  /**
   * Get default colors for module
   */
  private getDefaultColors(module: string): { color: string; lightColor: string } {
    const colorSchemes = {
      property: { color: '#3B82F6', lightColor: '#DBEAFE' },
      job: { color: '#10B981', lightColor: '#D1FAE5' },
      service: { color: '#F59E0B', lightColor: '#FEF3C7' }
    };
    
    return colorSchemes[module] || colorSchemes.property;
  }

  /**
   * Create mock category for demo mode
   */
  private createMockCategory(data: CategoryCreateData): Category {
    const defaultColors = this.getDefaultColors(data.module);
    
    return {
      id: `mock-${Date.now()}`,
      module: data.module,
      key: data.key.toLowerCase().replace(/\s+/g, '_'),
      name: data.name,
      label: data.label || data.name,
      description: data.description || `${data.name} in ${data.module}`,
      icon: data.icon || this.getDefaultIcon(data.module, data.key),
      color: data.color || defaultColors.color,
      light_color: data.lightColor || defaultColors.lightColor,
      count: Math.floor(Math.random() * 100) + 10,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      display_order: data.displayOrder || 999
    };
  }

  /**
   * Get default categories for a module
   */
  private getDefaultCategories(module: 'property' | 'job' | 'service'): Category[] {
    if (module === 'property') {
      return this.getDefaultPropertyCategories();
    } else if (module === 'job') {
      return this.getDefaultJobCategories();
    } else {
      return this.getDefaultServiceCategories();
    }
  }

  private getDefaultPropertyCategories(): Category[] {
    const categories = [
      { key: 'houses', name: 'Houses', icon: '🏠', color: '#3B82F6', lightColor: '#DBEAFE' },
      { key: 'apartments', name: 'Apartments', icon: '🏢', color: '#10B981', lightColor: '#D1FAE5' },
      { key: 'one_bedroom', name: '1 Bedroom', icon: '🛏️', color: '#F59E0B', lightColor: '#FEF3C7' },
      { key: 'two_bedroom', name: '2 Bedroom', icon: '🛏️', color: '#8B5CF6', lightColor: '#EDE9FE' },
      { key: 'three_bedroom', name: '3 Bedroom', icon: '🏠', color: '#EF4444', lightColor: '#FEE2E2' },
      { key: 'bedsitters', name: 'Bedsitters', icon: '🛌', color: '#06B6D4', lightColor: '#CFFAFE' },
      { key: 'commercial', name: 'Commercial', icon: '🏪', color: '#F97316', lightColor: '#FED7AA' },
      { key: 'industrial', name: 'Industrial', icon: '🏭', color: '#84CC16', lightColor: '#ECFCCB' },
      { key: 'offices', name: 'Offices', icon: '🏢', color: '#6366F1', lightColor: '#E0E7FF' },
      { key: 'land_plots', name: 'Land/Plots', icon: '🏞️', color: '#DC2626', lightColor: '#FEE2E2' }
    ];

    return categories.map((cat, index) => ({
      id: `default-prop-${index}`,
      module: 'property' as const,
      key: cat.key,
      name: cat.name,
      label: cat.name,
      description: `${cat.name} properties`,
      icon: cat.icon,
      color: cat.color,
      light_color: cat.lightColor,
      count: Math.floor(Math.random() * 100) + 10,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      display_order: index
    }));
  }

  private getDefaultJobCategories(): Category[] {
    const categories = [
      { key: 'technology', name: 'Technology', icon: '💻', color: '#3B82F6' },
      { key: 'healthcare', name: 'Healthcare', icon: '🏥', color: '#10B981' },
      { key: 'education', name: 'Education', icon: '🎓', color: '#F59E0B' },
      { key: 'finance', name: 'Finance', icon: '💰', color: '#8B5CF6' },
      { key: 'retail', name: 'Retail', icon: '🛍️', color: '#EF4444' }
    ];

    return categories.map((cat, index) => ({
      id: `default-job-${index}`,
      module: 'job' as const,
      key: cat.key,
      name: cat.name,
      label: cat.name,
      description: `${cat.name} jobs`,
      icon: cat.icon,
      color: cat.color,
      light_color: cat.color + '20',
      count: Math.floor(Math.random() * 50) + 5,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      display_order: index
    }));
  }

  private getDefaultServiceCategories(): Category[] {
    const categories = [
      { key: 'plumbing', name: 'Plumbing', icon: '🔧', color: '#3B82F6' },
      { key: 'electrical', name: 'Electrical', icon: '⚡', color: '#F59E0B' },
      { key: 'cleaning', name: 'Cleaning', icon: '🧹', color: '#10B981' },
      { key: 'moving', name: 'Moving', icon: '📦', color: '#8B5CF6' },
      { key: 'catering', name: 'Catering', icon: '🍽️', color: '#EF4444' }
    ];

    return categories.map((cat, index) => ({
      id: `default-service-${index}`,
      module: 'service' as const,
      key: cat.key,
      name: cat.name,
      label: cat.name,
      description: `${cat.name} services`,
      icon: cat.icon,
      color: cat.color,
      light_color: cat.color + '20',
      count: Math.floor(Math.random() * 30) + 3,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      display_order: index
    }));
  }
}

// Export singleton instance
export const categoryManagementService = new CategoryManagementService();

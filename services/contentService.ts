/**
 * Unified Content Service
 * Handles content creation, validation, and management across all app modules
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { imageUploadService } from './imageUploadService';
import type { MediaItem } from '../components/common/MediaUpload';

// Base content interface
export interface BaseContent {
  id?: string;
  user_id: string;
  title: string;
  description?: string;
  media_urls?: string[];
  location?: {
    county: string;
    town: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  tags?: string[];
  status: 'draft' | 'active' | 'inactive' | 'pending_review' | 'rejected';
  created_at?: string;
  updated_at?: string;
}

// Module-specific content types
export interface PropertyContent extends BaseContent {
  module: 'property';
  property_type: string;
  price: number;
  price_period?: 'monthly' | 'yearly' | 'one_time';
  currency: string;
  amenities?: string[];
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number;
  contact_phone?: string;
  contact_email?: string;
}

export interface JobContent extends BaseContent {
  module: 'jobs';
  job_type: 'full_time' | 'part_time' | 'contract' | 'freelance';
  skill_category: string;
  salary_min?: number;
  salary_max?: number;
  salary_period?: 'hourly' | 'daily' | 'monthly' | 'yearly';
  requirements?: string[];
  application_deadline?: string;
  company_name?: string;
}

export interface ServiceContent extends BaseContent {
  module: 'services';
  service_category: string;
  business_name: string;
  price_type: 'fixed' | 'hourly' | 'daily' | 'negotiable';
  price_amount?: number;
  currency: string;
  availability?: 'available' | 'busy' | 'unavailable';
  contact_phone: string;
  working_hours?: Record<string, any>;
  features?: string[];
}


export interface DateMiContent extends BaseContent {
  module: 'datemi';
  content_type: 'profile' | 'photo' | 'preference';
  birth_date?: string;
  gender?: string;
  looking_for?: string;
  interests?: string[];
  height?: number;
  education?: string;
  occupation?: string;
  preferences?: Record<string, any>;
}

export type ContentType = 
  | PropertyContent 
  | JobContent 
  | ServiceContent 
  | DateMiContent;

export interface ContentValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ContentSubmissionResult {
  success: boolean;
  content_id?: string;
  errors?: string[];
  uploaded_media?: string[];
}

export interface ContentModerationResult {
  approved: boolean;
  flags?: string[];
  confidence_score?: number;
  requires_review?: boolean;
}

export interface ContentFilters {
  module?: string;
  user_id?: string;
  status?: string;
  location?: {
    county?: string;
    town?: string;
  };
  date_range?: {
    start: string;
    end: string;
  };
}

export interface ContentSearchQuery {
  search_text?: string;
  filters: ContentFilters;
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'relevance';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Content Service Class
 */
export class ContentService {
  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  /**
   * Validate content based on module requirements
   */
  validateContent(content: ContentType): ContentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Base validation
    if (!content.title?.trim()) {
      errors.push('Title is required');
    } else if (content.title.length < 5) {
      warnings.push('Title is quite short - consider making it more descriptive');
    } else if (content.title.length > 100) {
      errors.push('Title must be less than 100 characters');
    }

    if (content.description && content.description.length > 2000) {
      errors.push('Description must be less than 2000 characters');
    }

    // Module-specific validation
    switch (content.module) {
      case 'property':
        const propContent = content as PropertyContent;
        if (!propContent.property_type) {
          errors.push('Property type is required');
        }
        if (!propContent.price || propContent.price <= 0) {
          errors.push('Valid price is required');
        }
        if (propContent.price > 1000000000) {
          warnings.push('Price seems unusually high - please verify');
        }
        if (!propContent.location?.county || !propContent.location?.town) {
          errors.push('Location (county and town) is required');
        }
        break;

      case 'jobs':
        const jobContent = content as JobContent;
        if (!jobContent.skill_category) {
          errors.push('Skill category is required');
        }
        if (!jobContent.job_type) {
          errors.push('Job type is required');
        }
        if (jobContent.application_deadline) {
          const deadline = new Date(jobContent.application_deadline);
          const now = new Date();
          if (deadline < now) {
            errors.push('Application deadline cannot be in the past');
          }
        }
        break;

      case 'services':
        const serviceContent = content as ServiceContent;
        if (!serviceContent.service_category) {
          errors.push('Service category is required');
        }
        if (!serviceContent.business_name?.trim()) {
          errors.push('Business name is required');
        }
        if (!serviceContent.contact_phone?.trim()) {
          errors.push('Contact phone is required');
        }
        break;


      case 'datemi':
        const datemiContent = content as DateMiContent;
        if (!datemiContent.content_type) {
          errors.push('Content type is required');
        }
        if (datemiContent.content_type === 'profile') {
          if (!datemiContent.birth_date) {
            errors.push('Birth date is required for profile');
          }
          if (!datemiContent.gender) {
            errors.push('Gender is required for profile');
          }
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Upload media files for content
   */
  async uploadContentMedia(
    media: MediaItem[],
    contentId: string,
    module: string
  ): Promise<{ successful: string[]; failed: string[] }> {
    const successful: string[] = [];
    const failed: string[] = [];

    for (const item of media) {
      try {
        // Convert MediaItem to format expected by imageUploadService
        const file = {
          uri: item.uri,
          type: item.mimeType || `${item.type}/jpeg`,
          name: item.name || `${item.type}_${Date.now()}`,
          size: item.size || 0,
        };

        const result = await imageUploadService.uploadImage(
          file, 
          `${module}-${contentId}`,
          { fileName: `${module}/${contentId}/${item.name}` }
        );

        if (result.success && result.url) {
          successful.push(result.url);
        } else {
          failed.push(result.error || 'Unknown upload error');
        }
      } catch (error: any) {
        
        failed.push(`Failed to upload ${item.name}: ${error.message}`);
      }
    }

    return { successful, failed };
  }

  /**
   * Basic content moderation (can be extended with AI services)
   */
  async moderateContent(content: ContentType): Promise<ContentModerationResult> {
    const flags: string[] = [];
    let confidence_score = 1.0;

    // Basic keyword filtering
    const inappropriateKeywords = [
      'spam', 'scam', 'fake', 'illegal', 'drugs', 'weapons'
    ];

    const textToCheck = `${content.title} ${content.description || ''}`.toLowerCase();
    
    for (const keyword of inappropriateKeywords) {
      if (textToCheck.includes(keyword)) {
        flags.push(`Contains inappropriate keyword: ${keyword}`);
        confidence_score -= 0.2;
      }
    }

    // Price validation for property/services
    if ('price' in content && content.price !== undefined) {
      if (content.price <= 0) {
        flags.push('Invalid price value');
        confidence_score -= 0.3;
      }
      if (content.price > 100000000) { // 100M
        flags.push('Unusually high price - may be spam');
        confidence_score -= 0.2;
      }
    }

    // Contact info validation
    const phonePattern = /(\+?254|0)[0-9]{9}/;
    if ('contact_phone' in content && content.contact_phone) {
      if (!phonePattern.test(content.contact_phone)) {
        flags.push('Invalid phone number format');
        confidence_score -= 0.1;
      }
    }

    return {
      approved: confidence_score > 0.5,
      flags: flags.length > 0 ? flags : undefined,
      confidence_score,
      requires_review: confidence_score < 0.7 && confidence_score > 0.3,
    };
  }

  /**
   * Submit content to database
   */
  async submitContent(
    content: ContentType,
    media?: MediaItem[]
  ): Promise<ContentSubmissionResult> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          errors: ['Database not configured. Please check your connection.'],
        };
      }

      // Validate content
      const validation = this.validateContent(content);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // Moderate content
      const moderation = await this.moderateContent(content);
      if (!moderation.approved) {
        return {
          success: false,
          errors: moderation.flags || ['Content failed moderation'],
        };
      }

      // Generate content ID if not provided
      const contentId = content.id || `${content.module}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Upload media if provided
      let uploadedMedia: string[] = [];
      if (media && media.length > 0) {
        const uploadResult = await this.uploadContentMedia(media, contentId, content.module);
        uploadedMedia = uploadResult.successful;
        
        if (uploadResult.failed.length > 0) {
          
        }
      }

      // Prepare content for database
      const contentData = {
        ...content,
        id: contentId,
        media_urls: [...(content.media_urls || []), ...uploadedMedia],
        status: moderation.requires_review ? 'pending_review' : 'active',
        updated_at: new Date().toISOString(),
        created_at: content.created_at || new Date().toISOString(),
      };

      // Insert into appropriate table based on module
      const tableName = this.getTableName(content.module);
      const { data, error } = await (supabase
        .from(tableName) as any)
        .insert(contentData)
        .select()
        .single();

      if (error) {
        
        return {
          success: false,
          errors: [`Failed to save content: ${error.message}`],
        };
      }

      const record = data as any;
      return {
        success: true,
        content_id: record?.id,
        uploaded_media: uploadedMedia,
      };

    } catch (error: any) {
      
      return {
        success: false,
        errors: [`Submission error: ${error.message}`],
      };
    }
  }

  /**
   * Update existing content
   */
  async updateContent(
    contentId: string,
    updates: Partial<ContentType>,
    newMedia?: MediaItem[]
  ): Promise<ContentSubmissionResult> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          errors: ['Database not configured'],
        };
      }

      // Upload new media if provided
      let uploadedMedia: string[] = [];
      if (newMedia && newMedia.length > 0 && updates.module) {
        const uploadResult = await this.uploadContentMedia(newMedia, contentId, updates.module);
        uploadedMedia = uploadResult.successful;
      }

      // Prepare update data
      const updateData = {
        ...updates,
        media_urls: newMedia ? uploadedMedia : updates.media_urls,
        updated_at: new Date().toISOString(),
      };

      if (updates.module) {
        const tableName = this.getTableName(updates.module);
        const { data, error } = await (supabase
          .from(tableName) as any)
          .update(updateData)
          .eq('id', contentId)
          .select()
          .single();

        if (error) {
          return {
            success: false,
            errors: [`Failed to update content: ${error.message}`],
          };
        }

        const record = data as any;
        return {
          success: true,
          content_id: record?.id,
          uploaded_media: uploadedMedia,
        };
      }

      return {
        success: false,
        errors: ['Module not specified for update'],
      };

    } catch (error: any) {
      
      return {
        success: false,
        errors: [`Update error: ${error.message}`],
      };
    }
  }

  /**
   * Delete content and associated media
   */
  async deleteContent(contentId: string, module: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Database not configured',
        };
      }

      const tableName = this.getTableName(module);
      
      // Get content to retrieve media URLs for deletion
      const { data: content } = await supabase
        .from(tableName)
        .select('media_urls')
        .eq('id', contentId)
        .single();

      // Delete from database
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', contentId);

      if (deleteError) {
        return {
          success: false,
          error: `Failed to delete content: ${deleteError.message}`,
        };
      }

      // Delete associated media files
      const record = content as any;
      if (record?.media_urls && record.media_urls.length > 0) {
        const mediaPaths = record.media_urls
          .map((url: string) => imageUploadService.extractPathFromUrl(url))
          .filter(Boolean);

        if (mediaPaths.length > 0) {
          await imageUploadService.deleteMultipleImages(mediaPaths);
        }
      }

      return { success: true };

    } catch (error: any) {
      
      return {
        success: false,
        error: `Delete error: ${error.message}`,
      };
    }
  }

  /**
   * Search and retrieve content
   */
  async searchContent(query: ContentSearchQuery): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    error?: string;
  }> {
    try {
      if (!this.isConfigured()) {
        return {
          data: [],
          total: 0,
          page: query.page || 1,
          limit: query.limit || 20,
          error: 'Database not configured',
        };
      }

      const page = query.page || 1;
      const limit = query.limit || 20;
      const offset = (page - 1) * limit;

      if (!query.filters.module) {
        return {
          data: [],
          total: 0,
          page,
          limit,
          error: 'Module filter is required',
        };
      }

      const tableName = this.getTableName(query.filters.module);
      let queryBuilder: any = supabase.from(tableName).select('*', { count: 'exact' });

      // Apply filters
      if (query.filters.user_id) {
        queryBuilder = queryBuilder.eq('user_id', query.filters.user_id);
      }

      if (query.filters.status) {
        queryBuilder = queryBuilder.eq('status', query.filters.status);
      }

      if (query.filters.location?.county) {
        queryBuilder = queryBuilder.eq('location->>county', query.filters.location.county);
      }

      if (query.search_text) {
        queryBuilder = queryBuilder.or(`title.ilike.%${query.search_text}%,description.ilike.%${query.search_text}%`);
      }

      // Apply sorting
      const sortBy = query.sort_by || 'created_at';
      const order = query.order || 'desc';
      queryBuilder = queryBuilder.order(sortBy, { ascending: order === 'asc' });

      // Apply pagination
      queryBuilder = queryBuilder.range(offset, offset + limit - 1);

      const { data, error, count } = await queryBuilder;

      if (error) {
        return {
          data: [],
          total: 0,
          page,
          limit,
          error: `Search failed: ${error.message}`,
        };
      }

      return {
        data: data || [],
        total: count || 0,
        page,
        limit,
      };

    } catch (error: any) {
      
      return {
        data: [],
        total: 0,
        page: query.page || 1,
        limit: query.limit || 20,
        error: `Search error: ${error.message}`,
      };
    }
  }

  /**
   * Get table name for module
   */
  private getTableName(module: string): 'property_listings' | 'job_postings' | 'service_listings' | 'date_mi_profiles' {
    const tableMap: Record<string, 'property_listings' | 'job_postings' | 'service_listings' | 'date_mi_profiles'> = {
      property: 'property_listings',
      jobs: 'job_postings',
      services: 'service_listings',
      datemi: 'date_mi_profiles',
    };

    return tableMap[module] || 'property_listings';
  }

  /**
   * Get content statistics
   */
  async getContentStats(module: string, userId?: string): Promise<{
    total: number;
    active: number;
    pending: number;
    draft: number;
    error?: string;
  }> {
    try {
      if (!this.isConfigured()) {
        return {
          total: 0,
          active: 0,
          pending: 0,
          draft: 0,
          error: 'Database not configured',
        };
      }

      const tableName = this.getTableName(module);
      let queryBuilder: any = supabase.from(tableName).select('status');

      if (userId) {
        queryBuilder = queryBuilder.eq('user_id', userId);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        return {
          total: 0,
          active: 0,
          pending: 0,
          draft: 0,
          error: error.message,
        };
      }

      const stats = (data as any[]).reduce(
        (acc, item) => {
          acc.total++;
          switch (item.status) {
            case 'active':
              acc.active++;
              break;
            case 'pending_review':
              acc.pending++;
              break;
            case 'draft':
              acc.draft++;
              break;
          }
          return acc;
        },
        { total: 0, active: 0, pending: 0, draft: 0 }
      );

      return stats;

    } catch (error: any) {
      
      return {
        total: 0,
        active: 0,
        pending: 0,
        draft: 0,
        error: error.message,
      };
    }
  }
}

// Export singleton instance
export const contentService = new ContentService();

// Export commonly used functions
export const {
  validateContent,
  submitContent,
  updateContent,
  deleteContent,
  searchContent,
  getContentStats
} = contentService;

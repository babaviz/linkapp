import { supabase } from './supabaseClient';

export interface CreatorService {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  serviceType: 'video_call' | 'photo_content' | 'chat_session' | 'custom';
  price: number;
  duration?: number; // in minutes
  isActive: boolean;
  previewImageUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ContentItem {
  id: string;
  creatorId: string;
  title: string;
  description?: string;
  contentType: 'photo' | 'video' | 'audio';
  fileUrl: string;
  thumbnailUrl?: string;
  price: number;
  isPublic: boolean;
  tags: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorStats {
  totalEarnings: number;
  monthlyEarnings: number;
  totalSessions: number;
  averageRating: number;
  profileViews: number;
  conversionRate: number;
  followers: number;
  contentItems: number;
}

export interface EarningsRecord {
  id: string;
  creatorId: string;
  serviceId?: string;
  contentId?: string;
  amount: number;
  currency: string;
  source: 'video_call' | 'content_purchase' | 'tip' | 'subscription';
  customerId: string;
  sessionReference?: string;
  createdAt: string;
}

// Helper function to transform database row to CreatorService
const transformToCreatorService = (data: any): CreatorService => ({
  id: data.id,
  creatorId: data.creator_id,
  title: data.title,
  description: data.description,
  serviceType: data.service_type,
  price: data.price,
  duration: data.duration,
  isActive: data.is_active,
  previewImageUrl: data.preview_image_url,
  metadata: data.metadata,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

class CreatorServiceClass {
  
  // Get creator services
  async getCreatorServices(creatorId: string): Promise<CreatorService[]> {
    try {
      const { data, error } = await supabase
        .from('creator_services')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(transformToCreatorService);
    } catch (error) {
      
      throw error;
    }
  }

  // Create new service
  async createService(service: Omit<CreatorService, 'id' | 'createdAt' | 'updatedAt'>): Promise<CreatorService> {
    try {
      const { data, error } = await (supabase
        .from('creator_services') as any)
        .insert([{
          creator_id: service.creatorId,
          title: service.title,
          description: service.description,
          service_type: service.serviceType,
          price: service.price,
          duration: service.duration,
          is_active: service.isActive,
          preview_image_url: service.previewImageUrl,
          metadata: service.metadata,
        }])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned');

      return {
        id: (data as any).id,
        creatorId: (data as any).creator_id,
        title: (data as any).title,
        description: (data as any).description,
        serviceType: (data as any).service_type,
        price: (data as any).price,
        duration: (data as any).duration,
        isActive: (data as any).is_active,
        previewImageUrl: (data as any).preview_image_url,
        metadata: (data as any).metadata,
        createdAt: (data as any).created_at,
        updatedAt: (data as any).updated_at,
      };
    } catch (error) {
      
      throw error;
    }
  }

  // Update service
  async updateService(serviceId: string, updates: Partial<CreatorService>): Promise<void> {
    try {
      const { error } = await (supabase
        .from('creator_services') as any)
        .update({
          title: updates.title,
          description: updates.description,
          service_type: updates.serviceType,
          price: updates.price,
          duration: updates.duration,
          is_active: updates.isActive,
          preview_image_url: updates.previewImageUrl,
          metadata: updates.metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', serviceId);

      if (error) throw error;
    } catch (error) {
      
      throw error;
    }
  }

  // Delete service
  async deleteService(serviceId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('creator_services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;
    } catch (error) {
      
      throw error;
    }
  }

  // Get creator content library
  async getCreatorContent(creatorId: string): Promise<ContentItem[]> {
    try {
      const { data, error } = await supabase
        .from('creator_content')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        creatorId: item.creator_id,
        title: item.title,
        description: item.description,
        contentType: item.content_type,
        fileUrl: item.file_url,
        thumbnailUrl: item.thumbnail_url,
        price: item.price,
        isPublic: item.is_public,
        tags: item.tags || [],
        metadata: item.metadata,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
    } catch (error) {
      
      throw error;
    }
  }

  // Upload content
  async uploadContent(
    content: Omit<ContentItem, 'createdAt' | 'updatedAt'>
  ): Promise<ContentItem> {
    try {
      const payload: any = {
        creator_id: content.creatorId,
        title: content.title,
        description: content.description,
        content_type: content.contentType,
        file_url: content.fileUrl,
        thumbnail_url: content.thumbnailUrl,
        price: content.price,
        is_public: content.isPublic,
        tags: content.tags,
        metadata: content.metadata,
      };

      // Allow caller to provide a pre-generated UUID so storage
      // paths can safely reference the content ID.
      if (content.id) {
        payload.id = content.id;
      }

      const { data, error } = await (supabase
        .from('creator_content') as any)
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned');

      return {
        id: (data as any).id,
        creatorId: (data as any).creator_id,
        title: (data as any).title,
        description: (data as any).description,
        contentType: (data as any).content_type,
        fileUrl: (data as any).file_url,
        thumbnailUrl: (data as any).thumbnail_url,
        price: (data as any).price,
        isPublic: (data as any).is_public,
        tags: (data as any).tags || [],
        metadata: (data as any).metadata,
        createdAt: (data as any).created_at,
        updatedAt: (data as any).updated_at,
      };
    } catch (error) {
      
      throw error;
    }
  }

  // Update existing content metadata
  async updateContent(
    contentId: string,
    updates: Partial<Omit<ContentItem, 'id' | 'creatorId' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    try {
      const payload: any = {};

      if (typeof updates.title !== 'undefined') {
        payload.title = updates.title;
      }
      if (typeof updates.description !== 'undefined') {
        payload.description = updates.description;
      }
      if (typeof updates.contentType !== 'undefined') {
        payload.content_type = updates.contentType;
      }
      if (typeof updates.fileUrl !== 'undefined') {
        payload.file_url = updates.fileUrl;
      }
      if (typeof updates.thumbnailUrl !== 'undefined') {
        payload.thumbnail_url = updates.thumbnailUrl;
      }
      if (typeof updates.price !== 'undefined') {
        payload.price = updates.price;
      }
      if (typeof updates.isPublic !== 'undefined') {
        payload.is_public = updates.isPublic;
      }
      if (typeof updates.tags !== 'undefined') {
        payload.tags = updates.tags;
      }
      if (typeof updates.metadata !== 'undefined') {
        payload.metadata = updates.metadata;
      }

      if (Object.keys(payload).length === 0) {
        return;
      }

      payload.updated_at = new Date().toISOString();

      const { error } = await (supabase
        .from('creator_content') as any)
        .update(payload)
        .eq('id', contentId);

      if (error) throw error;
    } catch (error) {
      
      throw error;
    }
  }

  // Delete content item
  async deleteContent(contentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('creator_content')
        .delete()
        .eq('id', contentId);

      if (error) throw error;
    } catch (error) {
      
      throw error;
    }
  }

  // Get creator statistics
  async getCreatorStats(creatorId: string): Promise<CreatorStats> {
    try {
      // In production, this would aggregate from multiple tables
      // For now, return mock data
      return {
        totalEarnings: 45750,
        monthlyEarnings: 12300,
        totalSessions: 89,
        averageRating: 4.8,
        profileViews: 1567,
        conversionRate: 23.5,
        followers: 234,
        contentItems: 12,
      };
    } catch (error) {
      
      throw error;
    }
  }

  // Get earnings history
  async getEarningsHistory(creatorId: string, limit = 50): Promise<EarningsRecord[]> {
    try {
      const { data, error } = await supabase
        .from('creator_earnings')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((record: any) => ({
        id: record.id,
        creatorId: record.creator_id,
        serviceId: record.service_id,
        contentId: record.content_id,
        amount: record.amount,
        currency: record.currency,
        source: record.source,
        customerId: record.customer_id,
        sessionReference: record.session_reference,
        createdAt: record.created_at,
      }));
    } catch (error) {
      
      throw error;
    }
  }

  // Record earnings from a session or purchase
  async recordEarning(earning: Omit<EarningsRecord, 'id' | 'createdAt'>): Promise<void> {
    try {
      const { error } = await (supabase
        .from('creator_earnings') as any)
        .insert([{
          creator_id: earning.creatorId,
          service_id: earning.serviceId,
          content_id: earning.contentId,
          amount: earning.amount,
          currency: earning.currency,
          source: earning.source,
          customer_id: earning.customerId,
          session_reference: earning.sessionReference,
        }]);

      if (error) throw error;
    } catch (error) {
      
      throw error;
    }
  }

  // Toggle creator status for user
  async toggleCreatorStatus(userId: string, isCreator: boolean): Promise<void> {
    try {
      const { error } = await (supabase
        .from('date_mi_profiles') as any)
        .update({ 
          creator_status: isCreator,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      
      throw error;
    }
  }

  // Get creator payout balance
  async getPayoutBalance(creatorId: string): Promise<{
    availableBalance: number;
    pendingBalance: number;
    totalEarnings: number;
  }> {
    try {
      // This would typically calculate from earnings and payout records
      return {
        availableBalance: 8500,
        pendingBalance: 2300,
        totalEarnings: 45750,
      };
    } catch (error) {
      
      throw error;
    }
  }

  // Request payout
  async requestPayout(creatorId: string, amount: number, paymentMethodId: string): Promise<void> {
    try {
      const { error } = await (supabase
        .from('payout_requests') as any)
        .insert([{
          creator_id: creatorId,
          amount,
          payment_method_id: paymentMethodId,
          status: 'pending',
          requested_at: new Date().toISOString(),
        }]);

      if (error) throw error;
    } catch (error) {
      
      throw error;
    }
  }
}

export const creatorService = new CreatorServiceClass();

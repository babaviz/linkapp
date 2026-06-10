/**
 * Property Inquiry Service
 * Handles property inquiry operations with Supabase
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { PropertyInquiry } from '../types/property';
import { PropertyNotificationService } from './propertyNotificationService';

// Database row type for inquiries
interface InquiryRow {
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

// Transform database row to PropertyInquiry interface
const transformRowToInquiry = (row: InquiryRow): PropertyInquiry => {
  return {
    id: row.id,
    property_id: row.property_id,
    inquirer_id: row.inquirer_id,
    owner_id: row.owner_id,
    message: row.message,
    contact_phone: row.contact_phone,
    contact_email: row.contact_email,
    status: row.status,
    created_at: row.created_at,
    responded_at: row.responded_at
  };
};

/**
 * Property Inquiry Service Class
 */
export class PropertyInquiryService {
  private tableName = 'property_inquiries';

  /**
   * Submit a new property inquiry
   */
  async submitInquiry(inquiryData: {
    property_id: string;
    inquirer_id: string;
    owner_id: string;
    message: string;
    contact_phone?: string;
    contact_email?: string;
  }): Promise<PropertyInquiry> {
    try {
      if (inquiryData.inquirer_id === inquiryData.owner_id) {
        throw new Error('Cannot send inquiry to your own property.');
      }
      if (isSupabaseConfigured) {
        const { data: existing } = await supabase
          .from('property_inquiries')
          .select('id')
          .eq('property_id', inquiryData.property_id)
          .eq('inquirer_id', inquiryData.inquirer_id)
          .neq('status', 'closed')
          .limit(1) as any;

        if (existing && existing.length > 0) {
          throw new Error('You already have an open inquiry for this property.');
        }
      }
      if (!isSupabaseConfigured) {
        // Demo mode - return mock inquiry
        const mockInquiry: PropertyInquiry = {
          id: `demo-inquiry-${Date.now()}`,
          property_id: inquiryData.property_id,
          inquirer_id: inquiryData.inquirer_id,
          owner_id: inquiryData.owner_id,
          message: inquiryData.message,
          contact_phone: inquiryData.contact_phone,
          contact_email: inquiryData.contact_email,
          status: 'pending',
          created_at: new Date().toISOString()
      };

      // Send notification even in demo mode
      try {
        await PropertyNotificationService.notifyNewInquiry(mockInquiry, 'Demo Property');
      } catch (notifError) {
        
      }
      
      return mockInquiry;
      }

      const { data, error } = await supabase
        .from('property_inquiries')
        .insert({
          property_id: inquiryData.property_id,
          inquirer_id: inquiryData.inquirer_id,
          owner_id: inquiryData.owner_id,
          message: inquiryData.message,
          contact_phone: inquiryData.contact_phone,
          contact_email: inquiryData.contact_email,
          status: 'pending'
        } as any)
        .select()
        .single() as any;

      if (error) {
        throw new Error(`Failed to submit inquiry: ${error.message}`);
      }

      return transformRowToInquiry(data as InquiryRow);
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Get inquiries for a property owner
   */
  async getOwnerInquiries(ownerId: string): Promise<PropertyInquiry[]> {
    try {
      if (!isSupabaseConfigured) {
        // Demo mode - return mock inquiries
        return [
          {
            id: 'demo-inquiry-1',
            property_id: 'demo-property-1',
            inquirer_id: 'demo-user-1',
            owner_id: ownerId,
            message: 'Hi, I\'m interested in viewing this property. Is it still available?',
            contact_phone: '+254712345678',
            contact_email: 'inquirer@example.com',
            status: 'pending',
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'demo-inquiry-2',
            property_id: 'demo-property-2',
            inquirer_id: 'demo-user-2',
            owner_id: ownerId,
            message: 'What are the lease terms for this apartment?',
            contact_phone: '+254787654321',
            contact_email: 'tenant@example.com',
            status: 'responded',
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            responded_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
      }

      const { data, error } = await supabase
        .from('property_inquiries')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false }) as any;

      if (error) {
        throw new Error(`Failed to fetch inquiries: ${error.message}`);
      }

      return (data || []).map((row: any) => transformRowToInquiry(row as InquiryRow));
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Get inquiries submitted by a user
   */
  async getUserInquiries(userId: string): Promise<PropertyInquiry[]> {
    try {
      if (!isSupabaseConfigured) {
        // Demo mode - return empty array
        return [];
      }

      const { data, error } = await supabase
        .from('property_inquiries')
        .select('*')
        .eq('inquirer_id', userId)
        .order('created_at', { ascending: false }) as any;

      if (error) {
        throw new Error(`Failed to fetch user inquiries: ${error.message}`);
      }

      return (data || []).map((row: any) => transformRowToInquiry(row as InquiryRow));
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Update inquiry status
   */
  async updateInquiryStatus(
    inquiryId: string, 
    status: 'pending' | 'responded' | 'closed',
    response?: string
  ): Promise<PropertyInquiry> {
    try {
      if (!isSupabaseConfigured) {
        // Demo mode - return mock updated inquiry
        const mockInquiry: PropertyInquiry = {
          id: inquiryId,
          property_id: 'demo-property-1',
          inquirer_id: 'demo-user-1',
          owner_id: 'demo-owner-1',
          message: 'Mock inquiry message',
          status,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          responded_at: status === 'responded' ? new Date().toISOString() : undefined
        };
        
        return mockInquiry;
      }

      const updateData: any = {
        status,
        responded_at: status === 'responded' ? new Date().toISOString() : undefined
      };

      if (response) {
        updateData.response = response;
      }

      const { data, error } = await supabase
        .from('property_inquiries')
        .update(updateData as any)
        .eq('id', inquiryId)
        .select()
        .single() as any;

      if (error) {
        throw new Error(`Failed to update inquiry: ${error.message}`);
      }

      return transformRowToInquiry(data as InquiryRow);
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Get inquiry statistics for a property owner
   */
  async getInquiryStats(ownerId: string): Promise<{
    total: number;
    pending: number;
    responded: number;
    closed: number;
  }> {
    try {
      if (!isSupabaseConfigured) {
        // Demo mode - return mock stats
        return {
          total: 2,
          pending: 1,
          responded: 1,
          closed: 0
        };
      }

      const inquiries = await this.getOwnerInquiries(ownerId);
      
      const stats = {
        total: inquiries.length,
        pending: inquiries.filter(i => i.status === 'pending').length,
        responded: inquiries.filter(i => i.status === 'responded').length,
        closed: inquiries.filter(i => i.status === 'closed').length
      };

      return stats;
    } catch (error: any) {
      
      throw error;
    }
  }
}

// Export singleton instance with lazy initialization
let instance: PropertyInquiryService | null = null;
function getInstance(): PropertyInquiryService {
  if (!instance) instance = new PropertyInquiryService();
  return instance;
}

export const propertyInquiryService = new Proxy({} as PropertyInquiryService, {
  get(target, prop) {
    const service = getInstance();
    const value = (service as any)[prop];
    return typeof value === 'function' ? value.bind(service) : value;
  }
});

// Export individual functions for direct use
export const {
  submitInquiry,
  getOwnerInquiries,
  getUserInquiries,
  updateInquiryStatus,
  getInquiryStats
} = propertyInquiryService;

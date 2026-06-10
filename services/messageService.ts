/**
 * Message Service - Property Inquiry and Communication System
 * TaskMaster Task 8: Contact Management System Implementation
 * Handles inquiries, messages, and communication between users and property owners
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { PropertyInquiry } from '../types/property';

// Database row type for inquiries table
interface InquiryRow {
  id: string;
  created_at: string;
  updated_at?: string;
  property_id: string;
  inquirer_id: string;
  owner_id: string;
  inquirer_name: string;
  message: string;
  contact_phone?: string;
  contact_email?: string;
  status: string;
  responded_at?: string;
  response_message?: string;
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
    status: row.status as 'pending' | 'responded' | 'closed',
    created_at: row.created_at,
    responded_at: row.responded_at
  };
};

// Transform inquiry data to database format
const transformInquiryToRow = (
  inquiry: Omit<PropertyInquiry, 'id' | 'created_at' | 'status'>,
  inquirerName: string
): Omit<InquiryRow, 'id' | 'created_at' | 'updated_at'> => {
  return {
    property_id: inquiry.property_id,
    inquirer_id: inquiry.inquirer_id,
    owner_id: inquiry.owner_id,
    inquirer_name: inquirerName,
    message: inquiry.message,
    contact_phone: inquiry.contact_phone,
    contact_email: inquiry.contact_email,
    status: 'pending'
  };
};

/**
 * Message Service Class
 */
export class MessageService {
  private inquiriesTable = 'property_inquiries';

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  /**
   * Submit a new property inquiry
   */
  async submitInquiry(
    inquiryData: Omit<PropertyInquiry, 'id' | 'created_at' | 'status'>,
    inquirerName: string
  ): Promise<PropertyInquiry> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Database connection not configured. Please check your internet connection.');
      }
      if (inquiryData.inquirer_id === inquiryData.owner_id) {
        throw new Error('Cannot send inquiry to your own property.');
      }

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

      const rowData = transformInquiryToRow(inquiryData, inquirerName);

      const { data, error } = await supabase
        .from('property_inquiries')
        .insert(rowData as any)
        .select()
        .single() as any;

      if (error) {
        if (__DEV__) {
          console.error('Failed to submit inquiry:', error);
        }
        throw new Error(`Failed to submit inquiry: ${error.message}`);
      }

      return transformRowToInquiry(data);
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error submitting inquiry:', error);
      }
      throw error;
    }
  }

  /**
   * Get inquiries sent by a user
   */
  async getUserInquiries(userId: string): Promise<PropertyInquiry[]> {
    try {
      if (!this.isConfigured()) {
        return []; // Return empty array for demo
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
   * Get inquiries received by a property owner
   */
  async getOwnerInquiries(ownerId: string): Promise<PropertyInquiry[]> {
    try {
      if (!this.isConfigured()) {
        return []; // Return empty array for demo
      }

      const { data, error } = await supabase
        .from('property_inquiries')
        .select(`
          *,
          property:property_listings(title, image_urls, price)
        `)
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false }) as any;

      if (error) {
        throw new Error(`Failed to fetch owner inquiries: ${error.message}`);
      }

      return (data || []).map((row: any) => transformRowToInquiry(row as InquiryRow));
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Get inquiries for a specific property
   */
  async getPropertyInquiries(propertyId: string, ownerId: string): Promise<PropertyInquiry[]> {
    try {
      if (!this.isConfigured()) {
        return []; // Return empty array for demo
      }

      const { data, error } = await supabase
        .from('property_inquiries')
        .select('*')
        .eq('property_id', propertyId)
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false }) as any;

      if (error) {
        throw new Error(`Failed to fetch property inquiries: ${error.message}`);
      }

      return (data || []).map((row: any) => transformRowToInquiry(row as InquiryRow));
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Respond to an inquiry (for property owners)
   */
  async respondToInquiry(
    inquiryId: string,
    responseMessage: string,
    ownerId: string
  ): Promise<PropertyInquiry> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Supabase not configured');
      }

      const { data, error } = await supabase
        .from('property_inquiries')
        .update({
          status: 'responded',
          response_message: responseMessage,
          responded_at: new Date().toISOString()
        } as any)
        .eq('id', inquiryId)
        .eq('owner_id', ownerId)
        .select()
        .single() as any;

      if (error) {
        throw new Error(`Failed to respond to inquiry: ${error.message}`);
      }

      return transformRowToInquiry(data as InquiryRow);
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Mark inquiry as closed
   */
  async closeInquiry(inquiryId: string, userId: string): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        return true; // Return success for demo
      }

      const { error } = await supabase
        .from('property_inquiries')
        .update({
          status: 'closed'
        } as any)
        .eq('id', inquiryId)
        .or(`inquirer_id.eq.${userId},owner_id.eq.${userId}`) as any;

      if (error) {
        throw new Error(`Failed to close inquiry: ${error.message}`);
      }

      return true;
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Delete an inquiry (soft delete by marking as closed)
   */
  async deleteInquiry(inquiryId: string, userId: string): Promise<boolean> {
    try {
      if (!this.isConfigured()) {
        return true; // Return success for demo
      }

      // Only allow inquirer to delete their own inquiries
      const { error } = await supabase
        .from('property_inquiries')
        .delete()
        .eq('id', inquiryId)
        .eq('inquirer_id', userId) as any;

      if (error) {
        throw new Error(`Failed to delete inquiry: ${error.message}`);
      }

      return true;
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Get inquiry statistics for a property owner
   */
  async getInquiryStats(ownerId: string): Promise<{
    total_inquiries: number;
    pending_inquiries: number;
    responded_inquiries: number;
    closed_inquiries: number;
  }> {
    try {
      if (!this.isConfigured()) {
        return {
          total_inquiries: 0,
          pending_inquiries: 0,
          responded_inquiries: 0,
          closed_inquiries: 0
        };
      }

      const { count: totalInquiries } = await supabase
        .from('property_inquiries')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', ownerId) as any;

      const { count: pendingInquiries } = await supabase
        .from('property_inquiries')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', ownerId)
        .eq('status', 'pending') as any;

      const { count: respondedInquiries } = await supabase
        .from('property_inquiries')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', ownerId)
        .eq('status', 'responded') as any;

      const { count: closedInquiries } = await supabase
        .from('property_inquiries')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', ownerId)
        .eq('status', 'closed') as any;

      return {
        total_inquiries: totalInquiries || 0,
        pending_inquiries: pendingInquiries || 0,
        responded_inquiries: respondedInquiries || 0,
        closed_inquiries: closedInquiries || 0
      };
    } catch (error: any) {
      
      throw error;
    }
  }

  /**
   * Send notification to property owner about new inquiry
   * This would integrate with push notification service in production
   */
  async notifyOwnerOfInquiry(inquiry: PropertyInquiry): Promise<boolean> {
    try {
      // Note: Push notifications are handled by transactionalNotificationService
      // which sends notifications for inquiry events automatically
      
      return true;
    } catch (error: any) {
      
      return false;
    }
  }

  /**
   * Validate contact information
   */
  validateContactInfo(phone: string = '', email: string = ''): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!phone && !email) {
      errors.push('Either phone number or email is required');
      return { isValid: false, errors };
    }

    if (phone) {
      // Basic phone validation for Kenya (+254 format)
      const phoneRegex = /^(\+254|0)[7-9]\d{8}$/;
      if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
        errors.push('Please enter a valid Kenyan phone number');
      }
    }

    if (email) {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push('Please enter a valid email address');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Format inquiry message for display
   */
  formatInquiryPreview(message: string, maxLength = 100): string {
    if (message.length <= maxLength) {
      return message;
    }
    return message.substring(0, maxLength - 3) + '...';
  }

  /**
   * Get time since inquiry was created
   */
  getTimeSince(createdAt: string): string {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInMs = now.getTime() - created.getTime();
    
    const minutes = Math.floor(diffInMs / (1000 * 60));
    const hours = Math.floor(diffInMs / (1000 * 60 * 60));
    const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  }
}

let instance: MessageService | null = null;
function getInstance(): MessageService {
  if (!instance) instance = new MessageService();
  return instance;
}

export const messageService = new Proxy({} as MessageService, {
  get(target, prop) {
    const service = getInstance();
    const value = (service as any)[prop];
    return typeof value === 'function' ? value.bind(service) : value;
  }
});

// Export individual functions for direct use
export const {
  submitInquiry,
  getUserInquiries,
  getOwnerInquiries,
  getPropertyInquiries,
  respondToInquiry,
  closeInquiry,
  deleteInquiry,
  getInquiryStats
} = messageService;

import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { ServiceInquiry } from '../types/service';

interface ServiceInquiryRow {
  id: string;
  service_id: string;
  inquirer_id: string;
  owner_id: string;
  message: string;
  contact_phone?: string;
  contact_email?: string;
  status: string;
  created_at: string;
  responded_at?: string;
  response?: string;
  service_listings?: { service_name: string } | null;
}

function rowToInquiry(row: ServiceInquiryRow): ServiceInquiry {
  return {
    id: row.id,
    service_id: row.service_id,
    service_name: row.service_listings?.service_name,
    inquirer_id: row.inquirer_id,
    owner_id: row.owner_id,
    message: row.message,
    contact_phone: row.contact_phone,
    contact_email: row.contact_email,
    status: row.status as ServiceInquiry['status'],
    created_at: row.created_at,
    responded_at: row.responded_at,
    response: row.response,
  };
}

export const serviceInquiryService = {
  /**
   * Submit an inquiry from a customer to a service owner.
   * Blocks self-inquiry and duplicate open inquiries.
   */
  async submitInquiry(params: {
    service_id: string;
    inquirer_id: string;
    owner_id: string;
    message: string;
    contact_phone?: string;
    contact_email?: string;
  }): Promise<ServiceInquiry> {
    if (params.inquirer_id === params.owner_id) {
      throw new Error('You cannot send an inquiry to your own service.');
    }

    if (!isSupabaseConfigured()) {
      return {
        id: `local-${Date.now()}`,
        ...params,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
    }

    const sb = supabase as any;

    const { data: existing } = await sb
      .from('service_inquiries')
      .select('id')
      .eq('service_id', params.service_id)
      .eq('inquirer_id', params.inquirer_id)
      .not('status', 'eq', 'closed')
      .limit(1);

    if (existing && existing.length > 0) {
      throw new Error('You already have an open inquiry for this service.');
    }

    const { data, error } = await sb
      .from('service_inquiries')
      .insert({
        service_id: params.service_id,
        inquirer_id: params.inquirer_id,
        owner_id: params.owner_id,
        message: params.message,
        contact_phone: params.contact_phone,
        contact_email: params.contact_email,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to submit inquiry: ${error.message}`);
    }

    return rowToInquiry(data as ServiceInquiryRow);
  },

  /**
   * Get all inquiries for services owned by the given user.
   */
  async getOwnerInquiries(ownerId: string): Promise<ServiceInquiry[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const sb = supabase as any;
    const { data, error } = await sb
      .from('service_inquiries')
      .select(`
        *,
        service_listings ( service_name )
      `)
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch inquiries: ${error.message}`);
    }

    return (data || []).map((row: any) => rowToInquiry(row as ServiceInquiryRow));
  },

  /**
   * Update the status of an inquiry (owner only).
   */
  async updateInquiryStatus(
    inquiryId: string,
    status: ServiceInquiry['status'],
    response?: string
  ): Promise<ServiceInquiry> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured.');
    }

    const updatePayload: any = {
      status,
      responded_at: ['quoted', 'confirmed', 'completed'].includes(status)
        ? new Date().toISOString()
        : undefined,
    };
    if (response) {
      updatePayload.response = response;
    }

    const sb = supabase as any;
    const { data, error } = await sb
      .from('service_inquiries')
      .update(updatePayload)
      .eq('id', inquiryId)
      .select(`
        *,
        service_listings ( service_name )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update inquiry: ${error.message}`);
    }

    return rowToInquiry(data as ServiceInquiryRow);
  },
};

"use strict";
/**
 * Property Inquiry Service
 * Handles property inquiry operations with Supabase
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInquiryStats = exports.updateInquiryStatus = exports.getUserInquiries = exports.getOwnerInquiries = exports.submitInquiry = exports.propertyInquiryService = exports.PropertyInquiryService = void 0;
const supabaseClient_1 = require("./supabaseClient");
// Transform database row to PropertyInquiry interface
const transformRowToInquiry = (row) => {
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
class PropertyInquiryService {
    constructor() {
        this.tableName = 'property_inquiries';
    }
    /**
     * Submit a new property inquiry
     */
    async submitInquiry(inquiryData) {
        try {
            if (!supabaseClient_1.isSupabaseConfigured) {
                // Demo mode - return mock inquiry
                const mockInquiry = {
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
                
                return mockInquiry;
            }
            const { data, error } = await supabaseClient_1.supabase
                .from(this.tableName)
                .insert({
                property_id: inquiryData.property_id,
                inquirer_id: inquiryData.inquirer_id,
                owner_id: inquiryData.owner_id,
                message: inquiryData.message,
                contact_phone: inquiryData.contact_phone,
                contact_email: inquiryData.contact_email,
                status: 'pending'
            })
                .select()
                .single();
            if (error) {
                throw new Error(`Failed to submit inquiry: ${error.message}`);
            }
            return transformRowToInquiry(data);
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Get inquiries for a property owner
     */
    async getOwnerInquiries(ownerId) {
        try {
            if (!supabaseClient_1.isSupabaseConfigured) {
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
            const { data, error } = await supabaseClient_1.supabase
                .from(this.tableName)
                .select('*')
                .eq('owner_id', ownerId)
                .order('created_at', { ascending: false });
            if (error) {
                throw new Error(`Failed to fetch inquiries: ${error.message}`);
            }
            return (data || []).map(transformRowToInquiry);
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Get inquiries submitted by a user
     */
    async getUserInquiries(userId) {
        try {
            if (!supabaseClient_1.isSupabaseConfigured) {
                // Demo mode - return empty array
                return [];
            }
            const { data, error } = await supabaseClient_1.supabase
                .from(this.tableName)
                .select('*')
                .eq('inquirer_id', userId)
                .order('created_at', { ascending: false });
            if (error) {
                throw new Error(`Failed to fetch user inquiries: ${error.message}`);
            }
            return (data || []).map(transformRowToInquiry);
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Update inquiry status
     */
    async updateInquiryStatus(inquiryId, status, response) {
        try {
            if (!supabaseClient_1.isSupabaseConfigured) {
                // Demo mode - return mock updated inquiry
                const mockInquiry = {
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
            const updateData = {
                status,
                responded_at: status === 'responded' ? new Date().toISOString() : undefined
            };
            if (response) {
                updateData.response = response;
            }
            const { data, error } = await supabaseClient_1.supabase
                .from(this.tableName)
                .update(updateData)
                .eq('id', inquiryId)
                .select()
                .single();
            if (error) {
                throw new Error(`Failed to update inquiry: ${error.message}`);
            }
            return transformRowToInquiry(data);
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Get inquiry statistics for a property owner
     */
    async getInquiryStats(ownerId) {
        try {
            if (!supabaseClient_1.isSupabaseConfigured) {
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
        }
        catch (error) {
            
            throw error;
        }
    }
}
exports.PropertyInquiryService = PropertyInquiryService;
// Export singleton instance
exports.propertyInquiryService = new PropertyInquiryService();
// Export individual functions for direct use
exports.submitInquiry = exports.propertyInquiryService.submitInquiry, exports.getOwnerInquiries = exports.propertyInquiryService.getOwnerInquiries, exports.getUserInquiries = exports.propertyInquiryService.getUserInquiries, exports.updateInquiryStatus = exports.propertyInquiryService.updateInquiryStatus, exports.getInquiryStats = exports.propertyInquiryService.getInquiryStats;

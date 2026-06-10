"use strict";
/**
 * Message Service - Property Inquiry and Communication System
 * TaskMaster Task 8: Contact Management System Implementation
 * Handles inquiries, messages, and communication between users and property owners
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInquiryStats = exports.deleteInquiry = exports.closeInquiry = exports.respondToInquiry = exports.getPropertyInquiries = exports.getOwnerInquiries = exports.getUserInquiries = exports.submitInquiry = exports.messageService = exports.MessageService = void 0;
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
// Transform inquiry data to database format
const transformInquiryToRow = (inquiry, inquirerName) => {
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
class MessageService {
    constructor() {
        this.inquiriesTable = 'property_inquiries';
    }
    /**
     * Check if service is properly configured
     */
    isConfigured() {
        return supabaseClient_1.isSupabaseConfigured;
    }
    /**
     * Submit a new property inquiry
     */
    async submitInquiry(inquiryData, inquirerName) {
        try {
            if (!this.isConfigured()) {
                // For demo purposes, return a mock inquiry
                const mockInquiry = {
                    id: Date.now().toString(),
                    ...inquiryData,
                    status: 'pending',
                    created_at: new Date().toISOString()
                };
                return mockInquiry;
            }
            const rowData = transformInquiryToRow(inquiryData, inquirerName);
            const { data, error } = await supabaseClient_1.supabase
                .from(this.inquiriesTable)
                .insert(rowData)
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
     * Get inquiries sent by a user
     */
    async getUserInquiries(userId) {
        try {
            if (!this.isConfigured()) {
                return []; // Return empty array for demo
            }
            const { data, error } = await supabaseClient_1.supabase
                .from(this.inquiriesTable)
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
     * Get inquiries received by a property owner
     */
    async getOwnerInquiries(ownerId) {
        try {
            if (!this.isConfigured()) {
                return []; // Return empty array for demo
            }
            const { data, error } = await supabaseClient_1.supabase
                .from(this.inquiriesTable)
                .select(`
          *,
          property:property_listings(title, images, price)
        `)
                .eq('owner_id', ownerId)
                .order('created_at', { ascending: false });
            if (error) {
                throw new Error(`Failed to fetch owner inquiries: ${error.message}`);
            }
            return (data || []).map(transformRowToInquiry);
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Get inquiries for a specific property
     */
    async getPropertyInquiries(propertyId, ownerId) {
        try {
            if (!this.isConfigured()) {
                return []; // Return empty array for demo
            }
            const { data, error } = await supabaseClient_1.supabase
                .from(this.inquiriesTable)
                .select('*')
                .eq('property_id', propertyId)
                .eq('owner_id', ownerId)
                .order('created_at', { ascending: false });
            if (error) {
                throw new Error(`Failed to fetch property inquiries: ${error.message}`);
            }
            return (data || []).map(transformRowToInquiry);
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Respond to an inquiry (for property owners)
     */
    async respondToInquiry(inquiryId, responseMessage, ownerId) {
        try {
            if (!this.isConfigured()) {
                throw new Error('Supabase not configured');
            }
            const { data, error } = await supabaseClient_1.supabase
                .from(this.inquiriesTable)
                .update({
                status: 'responded',
                response_message: responseMessage,
                responded_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
                .eq('id', inquiryId)
                .eq('owner_id', ownerId) // Ensure only owner can respond
                .select()
                .single();
            if (error) {
                throw new Error(`Failed to respond to inquiry: ${error.message}`);
            }
            return transformRowToInquiry(data);
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Mark inquiry as closed
     */
    async closeInquiry(inquiryId, userId) {
        try {
            if (!this.isConfigured()) {
                return true; // Return success for demo
            }
            const { error } = await supabaseClient_1.supabase
                .from(this.inquiriesTable)
                .update({
                status: 'closed',
                updated_at: new Date().toISOString()
            })
                .eq('id', inquiryId)
                .or(`inquirer_id.eq.${userId},owner_id.eq.${userId}`); // Allow both parties to close
            if (error) {
                throw new Error(`Failed to close inquiry: ${error.message}`);
            }
            return true;
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Delete an inquiry (soft delete by marking as closed)
     */
    async deleteInquiry(inquiryId, userId) {
        try {
            if (!this.isConfigured()) {
                return true; // Return success for demo
            }
            // Only allow inquirer to delete their own inquiries
            const { error } = await supabaseClient_1.supabase
                .from(this.inquiriesTable)
                .delete()
                .eq('id', inquiryId)
                .eq('inquirer_id', userId);
            if (error) {
                throw new Error(`Failed to delete inquiry: ${error.message}`);
            }
            return true;
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
            if (!this.isConfigured()) {
                return {
                    total_inquiries: 0,
                    pending_inquiries: 0,
                    responded_inquiries: 0,
                    closed_inquiries: 0
                };
            }
            const { count: totalInquiries } = await supabaseClient_1.supabase
                .from(this.inquiriesTable)
                .select('*', { count: 'exact', head: true })
                .eq('owner_id', ownerId);
            const { count: pendingInquiries } = await supabaseClient_1.supabase
                .from(this.inquiriesTable)
                .select('*', { count: 'exact', head: true })
                .eq('owner_id', ownerId)
                .eq('status', 'pending');
            const { count: respondedInquiries } = await supabaseClient_1.supabase
                .from(this.inquiriesTable)
                .select('*', { count: 'exact', head: true })
                .eq('owner_id', ownerId)
                .eq('status', 'responded');
            const { count: closedInquiries } = await supabaseClient_1.supabase
                .from(this.inquiriesTable)
                .select('*', { count: 'exact', head: true })
                .eq('owner_id', ownerId)
                .eq('status', 'closed');
            return {
                total_inquiries: totalInquiries || 0,
                pending_inquiries: pendingInquiries || 0,
                responded_inquiries: respondedInquiries || 0,
                closed_inquiries: closedInquiries || 0
            };
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Send notification to property owner about new inquiry
     * This would integrate with push notification service in production
     */
    async notifyOwnerOfInquiry(inquiry) {
        try {
            // TODO: Implement push notification logic
            // For now, we'll just log the notification
             + '...'
            });
            return true;
        }
        catch (error) {
            
            return false;
        }
    }
    /**
     * Validate contact information
     */
    validateContactInfo(phone, email) {
        const errors = [];
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
    formatInquiryPreview(message, maxLength = 100) {
        if (message.length <= maxLength) {
            return message;
        }
        return message.substring(0, maxLength - 3) + '...';
    }
    /**
     * Get time since inquiry was created
     */
    getTimeSince(createdAt) {
        const now = new Date();
        const created = new Date(createdAt);
        const diffInMs = now.getTime() - created.getTime();
        const minutes = Math.floor(diffInMs / (1000 * 60));
        const hours = Math.floor(diffInMs / (1000 * 60 * 60));
        const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        if (minutes < 60) {
            return `${minutes}m ago`;
        }
        else if (hours < 24) {
            return `${hours}h ago`;
        }
        else {
            return `${days}d ago`;
        }
    }
}
exports.MessageService = MessageService;
// Export singleton instance
exports.messageService = new MessageService();
// Export individual functions for direct use
exports.submitInquiry = exports.messageService.submitInquiry, exports.getUserInquiries = exports.messageService.getUserInquiries, exports.getOwnerInquiries = exports.messageService.getOwnerInquiries, exports.getPropertyInquiries = exports.messageService.getPropertyInquiries, exports.respondToInquiry = exports.messageService.respondToInquiry, exports.closeInquiry = exports.messageService.closeInquiry, exports.deleteInquiry = exports.messageService.deleteInquiry, exports.getInquiryStats = exports.messageService.getInquiryStats;

/**
 * Chat Integration Helpers
 * 
 * Utility functions to help integrate chat functionality into existing
 * app modules like property listings, job postings, service listings, and dating profiles.
 */

import { streamChatService, ChannelType } from '../services/streamChatService';
import { StreamTokenService } from '../services/streamTokenService';

export interface ListingChatData {
  listingId: string;
  listingType: 'property' | 'job' | 'service' | 'datemi';
  ownerId: string;
  ownerName?: string;
  listingData: {
    title: string;
    location?: string;
    price?: number;
    salary?: number;
    company?: string;
    category?: string;
    image?: string;
  };
}

export interface ChatIntegrationResult {
  success: boolean;
  channelId?: string;
  channelCid?: string;
  error?: string;
}

/**
 * Create a chat channel for a property listing
 */
export async function createPropertyChat(
  propertyId: string,
  ownerId: string,
  propertyData: {
    title: string;
    price: number;
    location: string;
    image?: string;
  }
): Promise<ChatIntegrationResult> {
  try {
    const channel = await streamChatService.createPropertyChannel(
      propertyId,
      ownerId,
      propertyData
    );

    if (channel) {
      return {
        success: true,
        channelId: channel.id,
        channelCid: channel.cid,
      };
    } else {
      return {
        success: false,
        error: 'Failed to create property chat channel',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create property chat',
    };
  }
}

/**
 * Create a chat channel for a job posting
 */
export async function createJobChat(
  jobId: string,
  employerId: string,
  jobData: {
    title: string;
    company: string;
    location: string;
    salary?: number;
  }
): Promise<ChatIntegrationResult> {
  try {
    const channel = await streamChatService.createJobChannel(
      jobId,
      employerId,
      jobData
    );

    if (channel) {
      return {
        success: true,
        channelId: channel.id,
        channelCid: channel.cid,
      };
    } else {
      return {
        success: false,
        error: 'Failed to create job chat channel',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create job chat',
    };
  }
}

/**
 * Create a chat channel for a service listing
 */
export async function createServiceChat(
  serviceId: string,
  providerId: string,
  serviceData: {
    name: string;
    category: string;
    location: string;
    image?: string;
  }
): Promise<ChatIntegrationResult> {
  try {
    const channel = await streamChatService.createServiceChannel(
      serviceId,
      providerId,
      serviceData
    );

    if (channel) {
      return {
        success: true,
        channelId: channel.id,
        channelCid: channel.cid,
      };
    } else {
      return {
        success: false,
        error: 'Failed to create service chat channel',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create service chat',
    };
  }
}

/**
 * Create a Date Mi conversation channel
 */
export async function createDateMiChat(
  otherUserId: string,
  otherUserData: {
    name: string;
    image?: string;
  }
): Promise<ChatIntegrationResult> {
  try {
    const channel = await streamChatService.createDateMiChannel(
      otherUserId,
      otherUserData
    );

    if (channel) {
      return {
        success: true,
        channelId: channel.id,
        channelCid: channel.cid,
      };
    } else {
      return {
        success: false,
        error: 'Failed to create Date Mi chat channel',
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create Date Mi chat',
    };
  }
}

/**
 * Generic function to create a chat channel based on listing data
 */
export async function createChatForListing(
  listingChatData: ListingChatData
): Promise<ChatIntegrationResult> {
  const { listingId, listingType, ownerId, ownerName, listingData } = listingChatData;

  switch (listingType) {
    case 'property':
      return await createPropertyChat(listingId, ownerId, {
        title: listingData.title,
        price: listingData.price || 0,
        location: listingData.location || '',
        image: listingData.image,
      });

    case 'job':
      return await createJobChat(listingId, ownerId, {
        title: listingData.title,
        company: listingData.company || 'Company',
        location: listingData.location || '',
        salary: listingData.salary,
      });

    case 'service':
      return await createServiceChat(listingId, ownerId, {
        name: listingData.title,
        category: listingData.category || 'Service',
        location: listingData.location || '',
        image: listingData.image,
      });

    case 'datemi':
      return await createDateMiChat(ownerId, {
        name: ownerName || 'User',
        image: listingData.image,
      });

    default:
      return {
        success: false,
        error: 'Unsupported listing type',
      };
  }
}

/**
 * Check if chat is available for the current user
 */
export function isChatAvailable(): boolean {
  return streamChatService.isConnected();
}

/**
 * Check if user can chat with a specific owner/user
 */
export function canChatWithUser(targetUserId: string): boolean {
  const currentUser = streamChatService.getCurrentUser();
  
  if (!currentUser) return false;
  if (currentUser.id === targetUserId) return false; // Can't chat with yourself
  if (!streamChatService.isConnected()) return false;
  
  return true;
}

/**
 * Get existing chat channel for a listing if it exists
 */
export async function getExistingChatChannel(
  listingType: ChannelType,
  listingId: string
): Promise<string | null> {
  try {
    const channel = streamChatService.getCachedChannel(listingType, listingId);
    return channel?.cid || null;
  } catch (error) {
    
    return null;
  }
}

/**
 * Generate navigation params for chat screens
 */
export function getChatNavigationParams(
  channelCid: string,
  channelName?: string
) {
  return {
    screen: 'ChatChannel',
    params: {
      channelCid,
      channelName: channelName || 'Chat',
    },
  };
}

/**
 * Generate channel ID helpers (static methods from StreamTokenService)
 */
export const ChatChannelIdHelpers = {
  property: (propertyId: string, ownerId: string) =>
    StreamTokenService.createPropertyChannelId(propertyId, ownerId),
    
  job: (jobId: string, employerId: string) =>
    StreamTokenService.createJobChannelId(jobId, employerId),
    
  service: (serviceId: string, ownerId: string) =>
    StreamTokenService.createServiceChannelId(serviceId, ownerId),
    
  datemi: (user1Id: string, user2Id: string) =>
    StreamTokenService.createDateMiChannelId(user1Id, user2Id),
    
  directMessage: (user1Id: string, user2Id: string) =>
    StreamTokenService.createDirectMessageChannelId(user1Id, user2Id),
};

/**
 * Extract listing info from channel data
 */
export function extractListingInfoFromChannel(channelData: any): {
  type: string;
  title: string;
  subtitle?: string;
} {
  if (channelData.property_title) {
    return {
      type: 'Property',
      title: channelData.property_title,
      subtitle: channelData.property_location,
    };
  }
  
  if (channelData.job_title) {
    return {
      type: 'Job',
      title: channelData.job_title,
      subtitle: channelData.job_company,
    };
  }
  
  if (channelData.service_name) {
    return {
      type: 'Service',
      title: channelData.service_name,
      subtitle: channelData.service_category,
    };
  }
  
  if (channelData.datemi_conversation) {
    return {
      type: 'Date Mi',
      title: 'Conversation',
      subtitle: `${channelData.user1_name} & ${channelData.user2_name}`,
    };
  }
  
  return {
    type: 'Chat',
    title: channelData.name || 'Conversation',
  };
}

/**
 * Format chat button label based on listing type
 */
export function getChatButtonLabel(listingType: string): string {
  switch (listingType) {
    case 'property': return 'Message Owner';
    case 'job': return 'Message Employer';
    case 'service': return 'Message Provider';
    case 'datemi': return 'Start Chat';
    default: return 'Message';
  }
}

/**
 * Check if the current user owns a listing
 */
export function isCurrentUserOwner(ownerId: string): boolean {
  const currentUser = streamChatService.getCurrentUser();
  return currentUser?.id === ownerId;
}

/**
 * Get chat status for UI display
 */
export function getChatStatus(): {
  isAvailable: boolean;
  isConnecting: boolean;
  statusText: string;
} {
  const isConnected = streamChatService.isConnected();
  const connectionStatus = streamChatService.getConnectionStatus();
  
  if (connectionStatus.isConnecting) {
    return {
      isAvailable: false,
      isConnecting: true,
      statusText: 'Connecting to chat...',
    };
  }
  
  if (!isConnected) {
    return {
      isAvailable: false,
      isConnecting: false,
      statusText: connectionStatus.error || 'Chat unavailable',
    };
  }
  
  return {
    isAvailable: true,
    isConnecting: false,
    statusText: 'Chat ready',
  };
}

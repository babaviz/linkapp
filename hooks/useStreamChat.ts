/**
 * useStreamChat Hook
 * 
 * This hook is now a thin context reader.
 *
 * All Stream Chat lifecycle (connect/disconnect/reconnect listeners) is centralized
 * in the app-root `StreamChatWrapper` so we don't register duplicate listeners
 * per-screen or accidentally re-initialize the SDK.
 */

import { useContext } from 'react';
import { Channel, ChannelData } from 'stream-chat';
import { ChannelType, MessageData } from '../services/streamChatService';
import { StreamUserData } from '../services/streamTokenService';
import { StreamChatContext } from '../components/chat/StreamChatWrapper';

export interface UseStreamChatReturn {
  // Connection status
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  user?: StreamUserData;
  
  // Connection methods
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
  
  // Channel methods
  getChannel: (type: ChannelType, id: string, data?: Partial<ChannelData>) => Promise<Channel | null>;
  getUserChannels: (limit?: number, type?: ChannelType) => Promise<Channel[]>;
  searchChannels: (query: string, type?: ChannelType) => Promise<Channel[]>;
  
  // Messaging methods
  sendMessage: (channel: Channel, message: MessageData) => Promise<boolean>;
  
  // Utility methods
  createPropertyChannel: (
    propertyId: string,
    ownerId: string,
    data: { title: string; price: number; location: string; image?: string }
  ) => Promise<Channel | null>;
  createJobChannel: (
    jobId: string,
    employerId: string,
    data: { title: string; company: string; location: string; salary?: number }
  ) => Promise<Channel | null>;
  createServiceChannel: (
    serviceId: string,
    providerId: string,
    data: { name: string; category: string; location: string; image?: string }
  ) => Promise<Channel | null>;
  createDateMiChannel: (
    otherUserId: string,
    userData: { name: string; image?: string }
  ) => Promise<Channel | null>;
  createDirectMessageChannel: (otherUserId: string, otherUserName: string) => Promise<Channel | null>;
}

export function useStreamChat(): UseStreamChatReturn {
  const ctx = useContext(StreamChatContext);
  if (!ctx) {
    throw new Error('useStreamChat must be used within StreamChatWrapper');
  }
  return ctx;
}

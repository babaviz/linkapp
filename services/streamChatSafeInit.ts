/**
 * Stream Chat Safe Initialization Service
 *
 * This service provides safe initialization for Stream Chat to prevent
 * property configuration errors that can occur with Stream Chat v7.x
 * and React Native 0.79.5, especially when using Hermes.
 */

import { StreamChat } from 'stream-chat';
import { ENV } from '../config/environment';

// Track initialization state
let isInitializing = false;
let streamChatClient: StreamChat | null = null;

/**
 * Safely get a Stream Chat client instance
 * 
 * This function implements defensive programming to prevent property
 * descriptor conflicts and ensure stable initialization.
 */
export function getSafeStreamChatClient(): StreamChat | null {
  try {
    // Return existing client if available
    if (streamChatClient) {
      return streamChatClient;
    }
    
    // Prevent concurrent initialization
    if (isInitializing) {
      return null;
    }
    
    isInitializing = true;
    
    // Check for required API key
    const apiKey = ENV.STREAM_CHAT_API_KEY;
    if (!apiKey) {
      isInitializing = false;
      return null;
    }
    
    // Create Stream Chat client with safe configuration
    // Use the simplest form to avoid type conflicts with different Stream Chat versions
    streamChatClient = StreamChat.getInstance(apiKey);
    
    // Apply safe configurations and feature flags
    safeConfigureClient(streamChatClient);
    
    isInitializing = false;
    return streamChatClient;
    
  } catch (error) {
    isInitializing = false;
    return null;
  }
}

/**
 * Apply safe configurations to the Stream Chat client to prevent property conflicts
 */
function safeConfigureClient(client: StreamChat): void {
  try {
    // Apply safe feature flags
    const safeFlags = {
      useNewChannelPreviewAPI: false,
      useNewMessageSystemAPI: false,
      useNewChannelAPI: false
    };
    
    // Apply feature flags one by one with error handling
    Object.entries(safeFlags).forEach(([flag, value]) => {
      try {
        // @ts-ignore - Using internal API
        if (typeof client[flag] !== 'undefined') {
          // @ts-ignore - Using internal API
          client[flag] = value;
        }
      } catch (e) {
        // Silently continue if setting a flag fails
      }
    });
    
    // Apply safe property descriptors for known problematic properties
    const propsToProtect = ['_user', 'user', 'userID', '_userID'];
    
    propsToProtect.forEach(prop => {
      try {
        // Ensure getter always returns the same value
        const currentValue = (client as any)[prop];
        if (currentValue !== undefined) {
          Object.defineProperty(client, `_safe_${prop}`, {
            value: currentValue,
            writable: true,
            enumerable: false
          });
          
          // This may fail if property is not configurable, which is fine
          try {
            Object.defineProperty(client, prop, {
              get: () => (client as any)[`_safe_${prop}`],
              set: (v) => {
                (client as any)[`_safe_${prop}`] = v;
                return true;
              },
              enumerable: true,
              configurable: true
            });
          } catch (e) {
            // Property was likely not configurable, continue silently
          }
        }
      } catch (e) {
        // Continue silently if protecting a property fails
      }
    });
    
  } catch (e) {
    // Continue with initialization even if safe configurations fail
  }
}

/**
 * Reset the Stream Chat client and clear any cached state
 */
export function resetStreamChatClient(): void {
  streamChatClient = null;
  isInitializing = false;
}

/**
 * Create a new safe Stream Chat client instance
 */
export function createNewStreamChatClient(): StreamChat | null {
  // Reset existing client first
  resetStreamChatClient();
  
  // Create a new client
  return getSafeStreamChatClient();
}

export default {
  getSafeStreamChatClient,
  resetStreamChatClient,
  createNewStreamChatClient
};

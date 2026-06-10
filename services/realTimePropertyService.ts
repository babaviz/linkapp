/**
 * Real-time Property Service using Supabase Real-time Subscriptions
 * Provides WebSocket-like functionality for live property updates
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { Property } from '../types/property';
import { store } from '../redux/store';
import { propertyApi } from '../redux/api/propertyApi';
import { syncPropertyAcrossLists, removePropertyFromAllLists } from '../redux/slices/propertySlice';
import { propertyService } from './propertyService';

export type PropertyRealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface PropertyChangePayload {
  eventType: PropertyRealtimeEvent;
  property: Property;
  old?: Property;
}

export interface PropertySubscriptionOptions {
  filters?: {
    propertyType?: string;
    location?: { county?: string; town?: string };
    priceRange?: { min?: number; max?: number };
    status?: string;
  };
  onPropertyChange?: (payload: PropertyChangePayload) => void;
  onError?: (error: Error) => void;
}

class RealTimePropertyService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscriptions: Map<string, PropertySubscriptionOptions> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Initialize the real-time service
   */
  public async initialize(): Promise<void> {
    try {

      // Check if Supabase is properly configured
      if (!supabase) {
        
        return;
      }

      this.isConnected = true;
      
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Subscribe to property changes with filters
   */
  public subscribeToPropertyChanges(
    subscriptionId: string,
    options: PropertySubscriptionOptions = {}
  ): () => void {

    // Store subscription options
    this.subscriptions.set(subscriptionId, options);

    // If Supabase is not configured, return mock cleanup function
    if (!supabase) {
      
      return () => {
        
        this.subscriptions.delete(subscriptionId);
      };
    }

    try {
      // Create channel for this subscription
      const channel = supabase
        .channel(`properties-${subscriptionId}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'property_listings',
            // Add filters if specified
            ...(options.filters?.status && {
              filter: `status=eq.${options.filters.status}`
            })
          },
          (payload: RealtimePostgresChangesPayload<Property>) => {
            this.handlePropertyChange(subscriptionId, payload);
          }
        )
        .subscribe((status) => {

          if (status === 'SUBSCRIBED') {
            
          } else if (status === 'CLOSED') {
            
            this.handleConnectionError(subscriptionId);
          }
        });

      // Store channel for cleanup
      this.channels.set(subscriptionId, channel);

      // Return cleanup function
      return () => this.unsubscribe(subscriptionId);
    } catch (error) {
      
      options.onError?.(error as Error);
      
      // Return empty cleanup function
      return () => {};
    }
  }

  /**
   * Subscribe to properties in a specific location
   */
  public subscribeToLocationProperties(
    subscriptionId: string,
    location: { county?: string; town?: string },
    onPropertyChange: (payload: PropertyChangePayload) => void
  ): () => void {
    return this.subscribeToPropertyChanges(subscriptionId, {
      filters: { location },
      onPropertyChange,
    });
  }

  /**
   * Subscribe to properties by type
   */
  public subscribeToPropertyType(
    subscriptionId: string,
    propertyType: string,
    onPropertyChange: (payload: PropertyChangePayload) => void
  ): () => void {
    return this.subscribeToPropertyChanges(subscriptionId, {
      filters: { propertyType },
      onPropertyChange,
    });
  }

  /**
   * Subscribe to featured properties
   */
  public subscribeToFeaturedProperties(
    subscriptionId: string,
    onPropertyChange: (payload: PropertyChangePayload) => void
  ): () => void {

    if (!supabase) {
      return () => {};
    }

    try {
      const channel = supabase
        .channel(`featured-properties-${subscriptionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'property_listings',
            filter: 'is_featured=eq.true'
          },
          (payload: RealtimePostgresChangesPayload<Property>) => {
            
            this.handlePropertyChange(subscriptionId, payload);
          }
        )
        .subscribe();

      this.channels.set(`featured-${subscriptionId}`, channel);
      this.subscriptions.set(`featured-${subscriptionId}`, { onPropertyChange });

      return () => this.unsubscribe(`featured-${subscriptionId}`);
    } catch (error) {
      
      return () => {};
    }
  }

  /**
   * Handle property changes from Supabase real-time
   */
  private handlePropertyChange(
    subscriptionId: string,
    payload: RealtimePostgresChangesPayload<Property>
  ): void {
    try {

      const options = this.subscriptions.get(subscriptionId);
      if (!options) return;

      // Apply client-side filters
      if (payload.new && !this.matchesFilters(payload.new as Property, options.filters)) {
        return;
      }

      // Create change payload
      const changePayload: PropertyChangePayload = {
        eventType: payload.eventType as PropertyRealtimeEvent,
        property: (payload.new || payload.old) as Property,
        old: payload.old as Property | undefined,
      };

      // Call the callback
      options.onPropertyChange?.(changePayload);

      // Update RTK Query cache
      this.updateRTKQueryCache(changePayload);

      // Also synchronize Redux listings immediately for visible UI updates
      const { dispatch } = store;
      const id = (payload.new as any)?.id || (payload.old as any)?.id;
      if (id) {
        if (changePayload.eventType === 'DELETE') {
          dispatch(removePropertyFromAllLists(id) as any);
        } else {
          // Resolve latest row into Property shape
          propertyService.getPropertyById(id)
            .then((prop) => {
              if (prop) {
                dispatch(syncPropertyAcrossLists(prop) as any);
              }
            })
            .catch(() => {});
        }
      }

    } catch (error) {
      
      const options = this.subscriptions.get(subscriptionId);
      options?.onError?.(error as Error);
    }
  }

  /**
   * Update RTK Query cache based on real-time changes
   */
  private updateRTKQueryCache(payload: PropertyChangePayload): void {
    const { dispatch } = store;

    switch (payload.eventType) {
      case 'INSERT':
        
        // Invalidate all property queries to refetch with new data
        dispatch(propertyApi.util.invalidateTags(['Property']));
        break;

      case 'UPDATE':
        
        // Update specific property queries
        dispatch(propertyApi.util.invalidateTags([
          { type: 'Property', id: payload.property.id }
        ]));
        break;

      case 'DELETE':
        
        // Invalidate queries and remove from cache
        dispatch(propertyApi.util.invalidateTags([
          'Property',
          { type: 'Property', id: payload.property.id }
        ]));
        break;
    }
  }

  /**
   * Check if property matches subscription filters
   */
  private matchesFilters(
    property: Property,
    filters?: PropertySubscriptionOptions['filters']
  ): boolean {
    if (!filters) return true;

    // Check property type
    if (filters.propertyType && property.property_type !== filters.propertyType) {
      return false;
    }

    // Check status
    if (filters.status && property.status !== filters.status) {
      return false;
    }

    // Check location
    if (filters.location) {
      if (filters.location.county && property.location.county !== filters.location.county) {
        return false;
      }
      if (filters.location.town && property.location.town !== filters.location.town) {
        return false;
      }
    }

    // Check price range
    if (filters.priceRange) {
      if (filters.priceRange.min && property.price < filters.priceRange.min) {
        return false;
      }
      if (filters.priceRange.max && property.price > filters.priceRange.max) {
        return false;
      }
    }

    return true;
  }

  /**
   * Handle connection errors and implement reconnection logic
   */
  private handleConnectionError(subscriptionId: string): void {

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      
      setTimeout(() => {
        const options = this.subscriptions.get(subscriptionId);
        if (options) {
          
          this.unsubscribe(subscriptionId);
          this.subscribeToPropertyChanges(subscriptionId, options);
        }
      }, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
    } else {
      
      const options = this.subscriptions.get(subscriptionId);
      options?.onError?.(new Error('Max reconnection attempts reached'));
    }
  }

  /**
   * Unsubscribe from property changes
   */
  public unsubscribe(subscriptionId: string): void {

    const channel = this.channels.get(subscriptionId);
    if (channel) {
      supabase?.removeChannel(channel);
      this.channels.delete(subscriptionId);
    }
    
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Unsubscribe from all property changes
   */
  public unsubscribeAll(): void {

    this.channels.forEach((channel, subscriptionId) => {
      this.unsubscribe(subscriptionId);
    });
    
    this.reconnectAttempts = 0;
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): { 
    isConnected: boolean; 
    activeSubscriptions: number;
    reconnectAttempts: number;
  } {
    return {
      isConnected: this.isConnected,
      activeSubscriptions: this.subscriptions.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Manual trigger for testing (demo mode)
   */
  public triggerDemoUpdate(property: Property, eventType: PropertyRealtimeEvent = 'UPDATE'): void {

    this.subscriptions.forEach((options, subscriptionId) => {
      if (this.matchesFilters(property, options.filters)) {
        const payload: PropertyChangePayload = {
          eventType,
          property,
        };
        options.onPropertyChange?.(payload);
        this.updateRTKQueryCache(payload);
      }
    });
  }
}

// Create singleton instance
export const realTimePropertyService = new RealTimePropertyService();

// Export for use in components
export default realTimePropertyService;

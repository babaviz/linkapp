/**
 * Image Cache Utilities
 * Helper functions for managing image caching and cache invalidation
 */

import { ImageCacheManager } from '../components/common/OptimizedImage';

/**
 * Add cache-busting timestamp to image URL
 * This forces the image to reload even if the URL stays the same
 */
export const addCacheBuster = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    // Add timestamp as query parameter
    urlObj.searchParams.set('t', Date.now().toString());
    return urlObj.toString();
  } catch {
    // If URL parsing fails, append timestamp manually
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}`;
  }
};

/**
 * Clear cached image when updating profile photo
 */
export const clearProfileImageCache = async (imageUrl: string | null | undefined): Promise<void> => {
  if (!imageUrl) return;
  
  try {
    const cacheManager = ImageCacheManager.getInstance();
    // Remove the specific image from cache
    await (cacheManager as any).removeCachedImage(imageUrl);
    
    // Also clear cache-busted versions
    const baseUrl = imageUrl.split('?')[0];
    await (cacheManager as any).removeCachedImage(baseUrl);
  } catch (error) {
    if (__DEV__) {
      console.warn('Failed to clear image cache:', error);
    }
  }
};

/**
 * Preload image and add to cache
 */
export const preloadProfileImage = async (imageUrl: string): Promise<void> => {
  if (!imageUrl) return;
  
  try {
    const cacheManager = ImageCacheManager.getInstance();
    // The cache manager will handle preloading via the Image component
    await (cacheManager as any).cacheImage(imageUrl, imageUrl, 100000);
  } catch (error) {
    if (__DEV__) {
      console.warn('Failed to preload image:', error);
    }
  }
};

/**
 * Clear all profile image caches (useful for logout)
 */
export const clearAllProfileImageCaches = async (): Promise<void> => {
  try {
    const cacheManager = ImageCacheManager.getInstance();
    await cacheManager.clearCache();
  } catch (error) {
    if (__DEV__) {
      console.warn('Failed to clear all image caches:', error);
    }
  }
};

/**
 * Get cache info for debugging
 */
export const getImageCacheInfo = () => {
  try {
    const cacheManager = ImageCacheManager.getInstance();
    return cacheManager.getCacheInfo();
  } catch {
    return { entries: 0, sizeBytes: 0, sizeMB: 0 };
  }
};

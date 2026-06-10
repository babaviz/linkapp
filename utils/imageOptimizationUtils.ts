/**
 * Image Optimization Utilities
 * Compress, resize, and optimize images before upload
 */

import * as ImageManipulator from 'expo-image-manipulator';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: 'jpeg' | 'png' | 'webp';
}

const DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8,
  format: 'jpeg',
};

/**
 * Optimize profile image before upload
 * - Resizes to max dimensions
 * - Compresses to reduce file size
 * - Converts to efficient format
 */
export const optimizeProfileImage = async (
  imageUri: string,
  options: ImageOptimizationOptions = {}
): Promise<string> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    // Get image dimensions first
    const imageInfo = await ImageManipulator.manipulateAsync(
      imageUri,
      [],
      { base64: false }
    );
    
    const actions: ImageManipulator.Action[] = [];
    
    // Calculate resize dimensions if needed
    if (imageInfo.width > opts.maxWidth || imageInfo.height > opts.maxHeight) {
      const aspectRatio = imageInfo.width / imageInfo.height;
      let newWidth = opts.maxWidth;
      let newHeight = opts.maxHeight;
      
      if (aspectRatio > 1) {
        // Landscape
        newHeight = Math.round(opts.maxWidth / aspectRatio);
      } else {
        // Portrait or square
        newWidth = Math.round(opts.maxHeight * aspectRatio);
      }
      
      actions.push({
        resize: {
          width: newWidth,
          height: newHeight,
        },
      });
    }
    
    // Apply optimizations
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      actions,
      {
        compress: opts.quality,
        format: opts.format === 'png' 
          ? ImageManipulator.SaveFormat.PNG 
          : ImageManipulator.SaveFormat.JPEG,
      }
    );
    
    return result.uri;
  } catch (error) {
    if (__DEV__) {
      console.error('Image optimization failed:', error);
    }
    // If optimization fails, return original URI
    return imageUri;
  }
};

/**
 * Generate thumbnail for progressive loading
 * Creates a small, highly compressed version for blur-up effect
 */
export const generateThumbnail = async (
  imageUri: string,
  size: number = 50
): Promise<string> => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          resize: {
            width: size,
            height: size,
          },
        },
      ],
      {
        compress: 0.1,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    
    return result.uri;
  } catch (error) {
    if (__DEV__) {
      console.error('Thumbnail generation failed:', error);
    }
    return imageUri;
  }
};

/**
 * Get image file size estimate
 */
export const getImageSize = async (imageUri: string): Promise<number> => {
  try {
    const FileSystem = require('expo-file-system');
    const info = await FileSystem.getInfoAsync(imageUri);
    return info.size || 0;
  } catch {
    return 0;
  }
};

/**
 * Check if image needs optimization
 */
export const needsOptimization = async (
  imageUri: string,
  maxSizeMB: number = 2
): Promise<boolean> => {
  const size = await getImageSize(imageUri);
  const sizeMB = size / (1024 * 1024);
  return sizeMB > maxSizeMB;
};

/**
 * Optimize image with progress callback
 */
export const optimizeWithProgress = async (
  imageUri: string,
  onProgress?: (progress: number) => void,
  options: ImageOptimizationOptions = {}
): Promise<string> => {
  onProgress?.(0);
  
  const optimized = await optimizeProfileImage(imageUri, options);
  
  onProgress?.(100);
  
  return optimized;
};

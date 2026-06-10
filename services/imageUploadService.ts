/**
 * Image Upload Service - Supabase Storage Integration
 * Handles property image uploads and management
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  path?: string;
}

export interface ImageUploadOptions {
  quality?: number; // 0-1, for image compression
  maxWidth?: number;
  maxHeight?: number;
  fileName?: string;
}

/**
 * Image Upload Service Class
 */
export class ImageUploadService {
  private bucketName = 'property-images';
  private maxFileSize = 5 * 1024 * 1024; // 5MB
  private allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  /**
   * Generate a unique file name for the image
   */
  private generateFileName(originalName: string, propertyId?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    
    if (propertyId) {
      return `property-${propertyId}/${timestamp}-${random}.${extension}`;
    }
    
    return `temp/${timestamp}-${random}.${extension}`;
  }

  /**
   * Validate image file
   */
  private validateImage(file: any): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    if (!this.allowedTypes.includes(file.type)) {
      return { 
        valid: false, 
        error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' 
      };
    }

    if (file.size > this.maxFileSize) {
      return { 
        valid: false, 
        error: 'File size too large. Maximum size is 5MB.' 
      };
    }

    return { valid: true };
  }

  /**
   * Upload a single image to Supabase Storage
   */
  async uploadImage(
    imageData: any, 
    propertyId?: string, 
    options: ImageUploadOptions = {}
  ): Promise<UploadResult> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Supabase not configured. Please add your Supabase credentials.'
        };
      }

      // Validate image
      const validation = this.validateImage(imageData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Generate file path
      const fileName = options.fileName || this.generateFileName(imageData.name, propertyId);
      const filePath = fileName;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, imageData, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        return {
          success: false,
          error: `Upload failed: ${error.message}`
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return {
        success: true,
        url: urlData.publicUrl,
        path: filePath
      };

    } catch (error: any) {
      
      return {
        success: false,
        error: `Upload error: ${error.message}`
      };
    }
  }

  /**
   * Upload multiple images for a property
   */
  async uploadMultipleImages(
    images: any[], 
    propertyId: string,
    options: ImageUploadOptions = {}
  ): Promise<{
    successful: UploadResult[];
    failed: UploadResult[];
    urls: string[];
  }> {
    const successful: UploadResult[] = [];
    const failed: UploadResult[] = [];

    // Limit to 6 images as per PRD
    const limitedImages = images.slice(0, 6);

    for (const image of limitedImages) {
      const result = await this.uploadImage(image, propertyId, options);
      
      if (result.success) {
        successful.push(result);
      } else {
        failed.push(result);
      }
    }

    const urls = successful.map(result => result.url!);

    return {
      successful,
      failed,
      urls
    };
  }

  /**
   * Delete an image from storage
   */
  async deleteImage(imagePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Supabase not configured'
        };
      }

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([imagePath]);

      if (error) {
        return {
          success: false,
          error: `Delete failed: ${error.message}`
        };
      }

      return { success: true };

    } catch (error: any) {
      
      return {
        success: false,
        error: `Delete error: ${error.message}`
      };
    }
  }

  /**
   * Delete multiple images
   */
  async deleteMultipleImages(imagePaths: string[]): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let successful = 0;
    let failed = 0;

    for (const path of imagePaths) {
      const result = await this.deleteImage(path);
      
      if (result.success) {
        successful++;
      } else {
        failed++;
        if (result.error) {
          errors.push(result.error);
        }
      }
    }

    return {
      successful,
      failed,
      errors
    };
  }

  /**
   * Get image URL from storage path
   */
  getImageUrl(imagePath: string): string {
    if (!this.isConfigured()) {
      return '';
    }

    const { data } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(imagePath);

    return data.publicUrl;
  }

  /**
   * Check if storage bucket exists and create if needed
   */
  async initializeBucket(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Supabase not configured'
        };
      }

      // Check if bucket exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();

      if (listError) {
        return {
          success: false,
          error: `Failed to list buckets: ${listError.message}`
        };
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);

      if (!bucketExists) {
        // Create bucket
        const { error: createError } = await supabase.storage.createBucket(this.bucketName, {
          public: true,
          allowedMimeTypes: this.allowedTypes,
          fileSizeLimit: this.maxFileSize
        });

        if (createError) {
          return {
            success: false,
            error: `Failed to create bucket: ${createError.message}`
          };
        }
      }

      return { success: true };

    } catch (error: any) {
      
      return {
        success: false,
        error: `Initialization error: ${error.message}`
      };
    }
  }

  /**
   * Extract image path from URL
   */
  extractPathFromUrl(url: string): string | null {
    try {
      // Extract path from Supabase public URL
      const urlParts = url.split(`/storage/v1/object/public/${this.bucketName}/`);
      return urlParts[1] || null;
    } catch (error) {
      
      return null;
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    error?: string;
  }> {
    try {
      if (!this.isConfigured()) {
        return {
          totalFiles: 0,
          totalSize: 0,
          error: 'Supabase not configured'
        };
      }

      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .list();

      if (error) {
        return {
          totalFiles: 0,
          totalSize: 0,
          error: error.message
        };
      }

      const totalFiles = data?.length || 0;
      const totalSize = data?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0;

      return {
        totalFiles,
        totalSize
      };

    } catch (error: any) {
      
      return {
        totalFiles: 0,
        totalSize: 0,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const imageUploadService = new ImageUploadService();

// Export individual functions for direct use
export const {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
  getImageUrl,
  initializeBucket,
  extractPathFromUrl,
  getStorageStats
} = imageUploadService;

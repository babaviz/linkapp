import { supabase, isSupabaseConfigured } from './supabaseClient';

// Use any for file type to support both web (File/Blob) and React Native (Uint8Array)
export interface StorageUploadOptions {
  bucket: string;
  path: string;
  file: File | Blob | Uint8Array | any;
  fileType?: string;
  cacheControl?: string;
  upsert?: boolean;
}

export interface StorageUploadResult {
  success: boolean;
  data?: {
    path: string;
    fullPath: string;
    publicUrl: string | null;
  };
  error?: string;
}

export interface StorageDeleteResult {
  success: boolean;
  error?: string;
}

export type StorageBucket = 
  | 'avatars'
  | 'property-images'
  | 'service-images'
  | 'datemi-photos'
  | 'creator-content'
  | 'documents'
  | 'profile-images'
  | 'stories'
  | 'story-media';

class StorageService {
  // Check if storage is available and configured
  isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  // Generate a unique file path with proper folder structure
  generateFilePath(bucket: StorageBucket, userId: string, fileName: string, itemId?: string): string {
    const timestamp = Date.now();
    const extension = fileName.split('.').pop();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    switch (bucket) {
      case 'avatars':
      case 'profile-images':
        return `${userId}/profile_${timestamp}.${extension}`;
      
      case 'property-images':
        if (!itemId) throw new Error('Property ID required for property images');
        return `${itemId}/${userId}_${timestamp}_${sanitizedFileName}`;
      
      case 'service-images':
        if (!itemId) throw new Error('Service ID required for service images');
        return `${itemId}/${userId}_${timestamp}_${sanitizedFileName}`;
      
      case 'datemi-photos':
        return `${userId}/datemi_${timestamp}.${extension}`;
      
      case 'creator-content':
        if (!itemId) throw new Error('Content ID required for creator content');
        return `${itemId}/${userId}_${timestamp}_${sanitizedFileName}`;
      
      case 'documents':
        return `${userId}/document_${timestamp}.${extension}`;
      
      default:
        return `${userId}/${timestamp}_${sanitizedFileName}`;
    }
  }

  // Upload file to storage
  async uploadFile(options: StorageUploadOptions): Promise<StorageUploadResult> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Storage not configured. Please add Supabase credentials to .env file.'
        };
      }

      const { bucket, path, file, fileType, cacheControl = '3600', upsert = false } = options;

      // Convert File/Blob/Uint8Array to a format Supabase accepts.
      // In React Native, Blob.arrayBuffer() is unreliable, so prefer
      // Uint8Array / ArrayBuffer paths and only use Blob.arrayBuffer() as
      // a last resort (wrapped in try/catch).
      let fileData: ArrayBuffer | Uint8Array | Blob;

      if (file instanceof Uint8Array) {
        // React Native preferred path — Uint8Array (or Buffer which extends it)
        fileData = file;
      } else if (typeof ArrayBuffer !== 'undefined' && file instanceof ArrayBuffer) {
        fileData = file;
      } else if (typeof File !== 'undefined' && file instanceof File) {
        fileData = await file.arrayBuffer();
      } else if (typeof Blob !== 'undefined' && file instanceof Blob) {
        // React Native Blob may not support arrayBuffer(); try it, but
        // fall back to passing the Blob directly to Supabase which can
        // also handle it in many environments.
        try {
          if (typeof file.arrayBuffer === 'function') {
            fileData = await file.arrayBuffer();
          } else {
            fileData = file;
          }
        } catch {
          fileData = file;
        }
      } else {
        // Fallback: pass as-is and let Supabase attempt to handle it
        fileData = file as ArrayBuffer | Uint8Array;
      }

      const uploadOptions: any = {
        cacheControl,
        upsert
      };

      if (fileType) {
        uploadOptions.contentType = fileType;
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, fileData, uploadOptions);

      if (error) {
        
        return {
          success: false,
          error: `Upload failed: ${error.message}`
        };
      }

      // Get public URL for public buckets
      let publicUrl: string | null = null;
      if (this.isPublicBucket(bucket as StorageBucket)) {
        const { data: urlData } = supabase.storage
          .from(bucket as any)
          .getPublicUrl(path);
        publicUrl = urlData.publicUrl;
      }

      return {
        success: true,
        data: {
          path: data.path,
          fullPath: data.fullPath,
          publicUrl
        }
      };
    } catch (error: any) {
      
      return {
        success: false,
        error: error.message || 'Upload failed'
      };
    }
  }

  // Upload profile image
  async uploadProfileImage(userId: string, imageFile: File | Blob | Uint8Array | any): Promise<StorageUploadResult> {
    const path = this.generateFilePath('avatars', userId, 'profile.jpg');
    
    return this.uploadFile({
      bucket: 'avatars',
      path,
      file: imageFile,
      fileType: 'image/jpeg',
      upsert: true // Allow overwriting existing profile images
    });
  }

  // Upload Date Mi profile avatar (stored in a public bucket)
  async uploadDateMiProfileImage(
    userId: string,
    imageFile: File | Blob | Uint8Array | any,
    options?: {
      fileType?: 'image/jpeg' | 'image/png' | 'image/webp';
      cacheControl?: string;
    }
  ): Promise<StorageUploadResult> {
    const fileType = options?.fileType || 'image/jpeg';
    const extension = fileType === 'image/png' ? 'png' : fileType === 'image/webp' ? 'webp' : 'jpg';
    const path = this.generateFilePath('datemi-photos', userId, `datemi_profile.${extension}`);

    return this.uploadFile({
      bucket: 'datemi-photos',
      path,
      file: imageFile,
      fileType,
      cacheControl: options?.cacheControl || '31536000',
      upsert: true,
    });
  }

  // Upload property images
  async uploadPropertyImages(
    propertyId: string, 
    userId: string, 
    imageFiles: (File | Blob)[]
  ): Promise<StorageUploadResult[]> {
    const results: StorageUploadResult[] = [];
    
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const path = this.generateFilePath('property-images', userId, `property_${i + 1}.jpg`, propertyId);
      
      const result = await this.uploadFile({
        bucket: 'property-images',
        path,
        file,
        fileType: 'image/jpeg'
      });
      
      results.push(result);
    }
    
    return results;
  }

  // Upload service images
  async uploadServiceImages(
    serviceId: string,
    userId: string,
    imageFiles: (File | Blob)[]
  ): Promise<StorageUploadResult[]> {
    const results: StorageUploadResult[] = [];
    
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const path = this.generateFilePath('service-images', userId, `service_${i + 1}.jpg`, serviceId);
      
      const result = await this.uploadFile({
        bucket: 'service-images',
        path,
        file,
        fileType: 'image/jpeg'
      });
      
      results.push(result);
    }
    
    return results;
  }

  // Upload Date Mi profile photos
  async uploadDateMiPhotos(
    userId: string, 
    photoFiles: (File | Blob)[]
  ): Promise<StorageUploadResult[]> {
    const results: StorageUploadResult[] = [];
    
    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      const path = this.generateFilePath('datemi-photos', userId, `photo_${i + 1}.jpg`);
      
      const result = await this.uploadFile({
        bucket: 'datemi-photos',
        path,
        file,
        fileType: 'image/jpeg'
      });
      
      results.push(result);
    }
    
    return results;
  }

  // Upload story media (images or videos)
  async uploadStoryMedia(
    storyId: string,
    userId: string,
    mediaFiles: (File | Blob)[],
    mediaType: 'image' | 'video' = 'image'
  ): Promise<StorageUploadResult[]> {
    const results: StorageUploadResult[] = [];
    const fileType = mediaType === 'image' ? 'image/jpeg' : 'video/mp4';
    
    for (let i = 0; i < mediaFiles.length; i++) {
      const file = mediaFiles[i];
      const extension = mediaType === 'image' ? 'jpg' : 'mp4';
      const path = this.generateFilePath('story-media', userId, `media_${i + 1}.${extension}`, storyId);
      
      const result = await this.uploadFile({
        bucket: 'story-media' as StorageBucket,
        path,
        file,
        fileType
      });
      
      results.push(result);
    }
    
    return results;
  }

  // Upload creator content (premium content)
  async uploadCreatorContent(
    contentId: string,
    userId: string,
    contentFile: File | Blob,
    contentType: 'image' | 'video' | 'audio'
  ): Promise<StorageUploadResult> {
    const typeMap = {
      image: { type: 'image/jpeg', ext: 'jpg' },
      video: { type: 'video/mp4', ext: 'mp4' },
      audio: { type: 'audio/mpeg', ext: 'mp3' }
    };
    
    const { type, ext } = typeMap[contentType];
    const path = this.generateFilePath('creator-content', userId, `content.${ext}`, contentId);
    
    return this.uploadFile({
      bucket: 'creator-content',
      path,
      file: contentFile,
      fileType: type
    });
  }

  // Upload document (for KYC/verification)
  async uploadDocument(
    userId: string,
    documentFile: File | Blob,
    documentType: string
  ): Promise<StorageUploadResult> {
    const path = this.generateFilePath('documents', userId, `${documentType}_document.pdf`);
    
    return this.uploadFile({
      bucket: 'documents',
      path,
      file: documentFile,
      fileType: 'application/pdf'
    });
  }

  // Delete file from storage
  async deleteFile(bucket: StorageBucket, filePath: string): Promise<StorageDeleteResult> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Storage not configured'
        };
      }

      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

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
        error: error.message || 'Delete failed'
      };
    }
  }

  // Get signed URL for private content
  async getSignedUrl(
    bucket: StorageBucket, 
    filePath: string, 
    expiresIn: number = 3600
  ): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Storage not configured'
        };
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

      if (error || !data) {
        return {
          success: false,
          error: `Failed to generate signed URL: ${error?.message}`
        };
      }

      return {
        success: true,
        signedUrl: data.signedUrl
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to generate signed URL'
      };
    }
  }

  // Get public URL for public content
  getPublicUrl(bucket: StorageBucket, filePath: string): string | null {
    if (!this.isConfigured() || !this.isPublicBucket(bucket)) {
      return null;
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  // List files in a folder
  async listFiles(
    bucket: StorageBucket, 
    folder?: string, 
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: { column: string; order: string };
    }
  ) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Storage not configured'
        };
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .list(folder, options);

      if (error) {
        return {
          success: false,
          error: `Failed to list files: ${error.message}`
        };
      }

      return {
        success: true,
        files: data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to list files'
      };
    }
  }

  // Check if bucket is public
  private isPublicBucket(bucket: StorageBucket): boolean {
    const publicBuckets: StorageBucket[] = [
      'avatars',
      'profile-images',
      'property-images', 
      'service-images',
      'datemi-photos'
    ];
    return publicBuckets.includes(bucket);
  }

  // Validate file size
  validateFileSize(file: File | Blob, bucket: StorageBucket): { valid: boolean; error?: string } {
    const limits: Partial<Record<StorageBucket, number>> = {
      'profile-images': 5 * 1024 * 1024, // 5MB
      'property-images': 10 * 1024 * 1024, // 10MB
      'service-images': 10 * 1024 * 1024, // 10MB
      'datemi-photos': 10 * 1024 * 1024, // 10MB
      'creator-content': 100 * 1024 * 1024, // 100MB
      'documents': 10 * 1024 * 1024, // 10MB
      'avatars': 5 * 1024 * 1024, // 5MB
      'stories': 10 * 1024 * 1024,
      'story-media': 10 * 1024 * 1024
    };

    const limit = limits[bucket];
    if (file.size > limit) {
      return {
        valid: false,
        error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds limit of ${(limit / 1024 / 1024).toFixed(0)}MB`
      };
    }

    return { valid: true };
  }

  // Validate file type
  validateFileType(file: File | Blob, bucket: StorageBucket): { valid: boolean; error?: string } {
    const allowedTypes: Partial<Record<StorageBucket, string[]>> = {
      'profile-images': ['image/jpeg', 'image/png', 'image/webp'],
      'property-images': ['image/jpeg', 'image/png', 'image/webp'],
      'service-images': ['image/jpeg', 'image/png', 'image/webp'],
      'datemi-photos': ['image/jpeg', 'image/png', 'image/webp'],
      'creator-content': ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm', 'audio/mpeg', 'audio/wav'],
      'documents': ['image/jpeg', 'image/png', 'application/pdf'],
      'avatars': ['image/jpeg', 'image/png', 'image/webp'],
      'stories': ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
      'story-media': ['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
    };

    const allowed = allowedTypes[bucket];
    const fileType = file.type || 'unknown';

    if (!allowed.includes(fileType)) {
      return {
        valid: false,
        error: `File type ${fileType} not allowed. Allowed types: ${allowed.join(', ')}`
      };
    }

    return { valid: true };
  }
}

export const storageService = new StorageService();

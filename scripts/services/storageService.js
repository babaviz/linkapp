"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = void 0;
const supabaseClient_1 = require("./supabaseClient");
class StorageService {
    // Check if storage is available and configured
    isConfigured() {
        return (0, supabaseClient_1.isSupabaseConfigured)();
    }
    // Generate a unique file path with proper folder structure
    generateFilePath(bucket, userId, fileName, itemId) {
        const timestamp = Date.now();
        const extension = fileName.split('.').pop();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        switch (bucket) {
            case 'avatars':
                return `${userId}/profile_${timestamp}.${extension}`;
            case 'property-images':
                if (!itemId)
                    throw new Error('Property ID required for property images');
                return `${itemId}/${userId}_${timestamp}_${sanitizedFileName}`;
            case 'service-images':
                if (!itemId)
                    throw new Error('Service ID required for service images');
                return `${itemId}/${userId}_${timestamp}_${sanitizedFileName}`;
            case 'stories':
                if (!itemId)
                    throw new Error('Story ID required for story media');
                return `${userId}/${itemId}/${timestamp}_${sanitizedFileName}`;
            case 'datemi-photos':
                return `${userId}/datemi_${timestamp}.${extension}`;
            case 'creator-content':
                if (!itemId)
                    throw new Error('Content ID required for creator content');
                return `${itemId}/${userId}_${timestamp}_${sanitizedFileName}`;
            case 'documents':
                return `${userId}/document_${timestamp}.${extension}`;
            default:
                return `${userId}/${timestamp}_${sanitizedFileName}`;
        }
    }
    // Upload file to storage
    async uploadFile(options) {
        try {
            if (!this.isConfigured()) {
                return {
                    success: false,
                    error: 'Storage not configured. Please add Supabase credentials to .env file.'
                };
            }
            const { bucket, path, file, fileType, cacheControl = '3600', upsert = false } = options;
            // Convert File/Blob to ArrayBuffer for React Native compatibility
            let fileData;
            if (file instanceof File || file instanceof Blob) {
                fileData = await file.arrayBuffer();
            }
            else {
                throw new Error('Invalid file type. Expected File or Blob.');
            }
            const uploadOptions = {
                cacheControl,
                upsert
            };
            if (fileType) {
                uploadOptions.contentType = fileType;
            }
            const { data, error } = await supabaseClient_1.supabase.storage
                .from(bucket)
                .upload(path, fileData, uploadOptions);
            if (error) {
                
                return {
                    success: false,
                    error: `Upload failed: ${error.message}`
                };
            }
            // Get public URL for public buckets
            let publicUrl = null;
            if (this.isPublicBucket(bucket)) {
                const { data: urlData } = supabaseClient_1.supabase.storage
                    .from(bucket)
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
        }
        catch (error) {
            
            return {
                success: false,
                error: error.message || 'Upload failed'
            };
        }
    }
    // Upload profile image
    async uploadProfileImage(userId, imageFile) {
        const path = this.generateFilePath('avatars', userId, 'profile.jpg');
        return this.uploadFile({
            bucket: 'avatars',
            path,
            file: imageFile,
            fileType: 'image/jpeg',
            upsert: true // Allow overwriting existing profile images
        });
    }
    // Upload property images
    async uploadPropertyImages(propertyId, userId, imageFiles) {
        const results = [];
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
    async uploadServiceImages(serviceId, userId, imageFiles) {
        const results = [];
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
    async uploadDateMiPhotos(userId, photoFiles) {
        const results = [];
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
    async uploadStoryMedia(storyId, userId, mediaFiles, mediaType = 'image') {
        const results = [];
        const fileType = mediaType === 'image' ? 'image/jpeg' : 'video/mp4';
        for (let i = 0; i < mediaFiles.length; i++) {
            const file = mediaFiles[i];
            const extension = mediaType === 'image' ? 'jpg' : 'mp4';
            const path = this.generateFilePath('story-media', userId, `media_${i + 1}.${extension}`, storyId);
            const result = await this.uploadFile({
                bucket: 'stories',
                path,
                file,
                fileType
            });
            results.push(result);
        }
        return results;
    }
    // Upload creator content (premium content)
    async uploadCreatorContent(contentId, userId, contentFile, contentType) {
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
    async uploadDocument(userId, documentFile, documentType) {
        const path = this.generateFilePath('documents', userId, `${documentType}_document.pdf`);
        return this.uploadFile({
            bucket: 'documents',
            path,
            file: documentFile,
            fileType: 'application/pdf'
        });
    }
    // Delete file from storage
    async deleteFile(bucket, filePath) {
        try {
            if (!this.isConfigured()) {
                return {
                    success: false,
                    error: 'Storage not configured'
                };
            }
            const { error } = await supabaseClient_1.supabase.storage
                .from(bucket)
                .remove([filePath]);
            if (error) {
                return {
                    success: false,
                    error: `Delete failed: ${error.message}`
                };
            }
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Delete failed'
            };
        }
    }
    // Get signed URL for private content
    async getSignedUrl(bucket, filePath, expiresIn = 3600) {
        try {
            if (!this.isConfigured()) {
                return {
                    success: false,
                    error: 'Storage not configured'
                };
            }
            const { data, error } = await supabaseClient_1.supabase.storage
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
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to generate signed URL'
            };
        }
    }
    // Get public URL for public content
    getPublicUrl(bucket, filePath) {
        if (!this.isConfigured() || !this.isPublicBucket(bucket)) {
            return null;
        }
        const { data } = supabaseClient_1.supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);
        return data.publicUrl;
    }
    // List files in a folder
    async listFiles(bucket, folder, options) {
        try {
            if (!this.isConfigured()) {
                return {
                    success: false,
                    error: 'Storage not configured'
                };
            }
            const { data, error } = await supabaseClient_1.supabase.storage
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
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Failed to list files'
            };
        }
    }
    // Check if bucket is public
    isPublicBucket(bucket) {
        const publicBuckets = [
            'profile-images',
            'property-images',
            'service-images',
            'story-media'
        ];
        return publicBuckets.includes(bucket);
    }
    // Validate file size
    validateFileSize(file, bucket) {
        const limits = {
            'profile-images': 5 * 1024 * 1024, // 5MB
            'property-images': 10 * 1024 * 1024, // 10MB
            'service-images': 10 * 1024 * 1024, // 10MB
            'story-media': 50 * 1024 * 1024, // 50MB
            'datemi-photos': 10 * 1024 * 1024, // 10MB
            'creator-content': 100 * 1024 * 1024, // 100MB
            'documents': 10 * 1024 * 1024 // 10MB
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
    validateFileType(file, bucket) {
        const allowedTypes = {
            'profile-images': ['image/jpeg', 'image/png', 'image/webp'],
            'property-images': ['image/jpeg', 'image/png', 'image/webp'],
            'service-images': ['image/jpeg', 'image/png', 'image/webp'],
            'story-media': ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'],
            'datemi-photos': ['image/jpeg', 'image/png', 'image/webp'],
            'creator-content': ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm', 'audio/mpeg', 'audio/wav'],
            'documents': ['image/jpeg', 'image/png', 'application/pdf']
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
exports.storageService = new StorageService();

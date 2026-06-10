/**
 * File Upload Service
 * Handles file uploads for resumes, documents, and other attachments
 */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabaseClient';

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

class FileUploadService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_RESUME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  /**
   * Pick a document from device
   */
  async pickDocument(
    options: {
      allowedTypes?: string[];
      multiple?: boolean;
    } = {}
  ): Promise<DocumentPicker.DocumentPickerResult> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: options.allowedTypes || this.ALLOWED_RESUME_TYPES,
        multiple: options.multiple || false,
        copyToCacheDirectory: true
      });

      return result;
    } catch (error) {
      
      throw new Error('Failed to pick document');
    }
  }

  /**
   * Upload resume file
   */
  async uploadResume(
    file: DocumentPicker.DocumentPickerAsset,
    userId: string,
    jobId?: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedFile> {
    try {
      // Validate file
      if (!this.validateFile(file)) {
        throw new Error('Invalid file format or size');
      }

      // Generate unique file name
      const timestamp = Date.now();
      const fileName = `resumes/${userId}/${timestamp}_${file.name}`;

      // For demo mode, simulate upload
      if (!this.isSupabaseConfigured()) {
        return this.simulateUpload(file, fileName, onProgress);
      }

      // Read file as base64
      const fileBase64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: 'base64'
      });

      // Convert base64 to blob
      const blob = this.base64ToBlob(fileBase64, file.mimeType);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('resumes')
        .upload(fileName, blob, {
          contentType: file.mimeType,
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);

      // Save file metadata to database
      const uploadedFile: UploadedFile = {
        id: `file_${timestamp}`,
        name: file.name,
        url: urlData.publicUrl,
        size: file.size || 0,
        mimeType: file.mimeType || 'application/pdf',
        uploadedAt: new Date().toISOString()
      };

      // If jobId provided, associate with job application
      if (jobId) {
        await this.associateResumeWithJob(uploadedFile.id, userId, jobId);
      }

      return uploadedFile;
    } catch (error) {
      
      throw new Error('Failed to upload resume');
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: DocumentPicker.DocumentPickerAsset[],
    userId: string,
    type: 'resume' | 'portfolio' | 'certificate'
  ): Promise<UploadedFile[]> {
    const uploadPromises = files.map(file => 
      this.uploadFile(file, userId, type)
    );

    try {
      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      
      throw new Error('Failed to upload files');
    }
  }

  /**
   * Generic file upload
   */
  private async uploadFile(
    file: DocumentPicker.DocumentPickerAsset,
    userId: string,
    type: string
  ): Promise<UploadedFile> {
    const timestamp = Date.now();
    const fileName = `${type}/${userId}/${timestamp}_${file.name}`;

    // For demo mode
    if (!this.isSupabaseConfigured()) {
      return {
        id: `file_${timestamp}`,
        name: file.name,
        url: `demo://files/${fileName}`,
        size: file.size || 0,
        mimeType: file.mimeType || 'application/octet-stream',
        uploadedAt: new Date().toISOString()
      };
    }

    // Actual upload logic here
    // Similar to uploadResume but more generic
    return this.uploadResume(file, userId);
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      if (!this.isSupabaseConfigured()) {
        return true; // Simulate success in demo mode
      }

      // Extract file path from URL
      const filePath = this.extractFilePathFromUrl(fileUrl);
      
      const { error } = await supabase.storage
        .from('resumes')
        .remove([filePath]);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      
      return false;
    }
  }

  /**
   * Download file to device
   */
  async downloadFile(fileUrl: string, fileName: string): Promise<string> {
    try {
      const documentDirectory = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory;
      if (!documentDirectory) {
        throw new Error('Cache directory not available');
      }
      const downloadResumable = FileSystem.createDownloadResumable(
        fileUrl,
        documentDirectory + fileName,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          // Upload progress tracked
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (result) {
        return result.uri;
      }
      
      throw new Error('Download failed');
    } catch (error) {
      
      throw new Error('Failed to download file');
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: DocumentPicker.DocumentPickerAsset): boolean {
    // Check file size
    if (file.size && file.size > this.MAX_FILE_SIZE) {
      throw new Error('File size exceeds 10MB limit');
    }

    // Check file type for resumes
    if (file.mimeType && !this.ALLOWED_RESUME_TYPES.includes(file.mimeType)) {
      throw new Error('Invalid file format. Please upload PDF, DOC, DOCX, or TXT files');
    }

    return true;
  }

  /**
   * Convert base64 to blob
   */
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Extract file path from Supabase URL
   */
  private extractFilePathFromUrl(url: string): string {
    const urlParts = url.split('/');
    const storageIndex = urlParts.indexOf('storage');
    
    if (storageIndex !== -1) {
      return urlParts.slice(storageIndex + 3).join('/');
    }
    
    return url;
  }

  /**
   * Associate resume with job application
   */
  private async associateResumeWithJob(
    fileId: string,
    userId: string,
    jobId: string
  ): Promise<void> {
    if (!this.isSupabaseConfigured()) {
      return; // Skip in demo mode
    }

    try {
      const { error } = await supabase
        .from('job_application_documents')
        .insert({
          file_id: fileId,
          user_id: userId,
          job_id: jobId,
          document_type: 'resume',
          created_at: new Date().toISOString()
        });

      if (error) {
        
      }
    } catch (error) {
      
    }
  }

  /**
   * Simulate file upload for demo mode
   */
  private async simulateUpload(
    file: DocumentPicker.DocumentPickerAsset,
    fileName: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedFile> {
    // Simulate upload progress
    if (onProgress) {
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        onProgress({
          loaded: (file.size || 1000) * (i / 100),
          total: file.size || 1000,
          percentage: i
        });
      }
    }

    return {
      id: `demo_file_${Date.now()}`,
      name: file.name,
      url: `demo://files/${fileName}`,
      size: file.size || 0,
      mimeType: file.mimeType || 'application/pdf',
      uploadedAt: new Date().toISOString()
    };
  }

  /**
   * Check if Supabase is configured
   */
  private isSupabaseConfigured(): boolean {
    return !!process.env.EXPO_PUBLIC_SUPABASE_URL && 
           !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  }

  /**
   * Get user's uploaded resumes
   */
  async getUserResumes(userId: string): Promise<UploadedFile[]> {
    try {
      if (!this.isSupabaseConfigured()) {
        // Return demo resumes
        return [
          {
            id: 'demo_resume_1',
            name: 'My_Resume_2025.pdf',
            url: 'demo://files/resumes/demo_resume.pdf',
            size: 256000,
            mimeType: 'application/pdf',
            uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
      }

      const { data, error } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', userId)
        .eq('document_type', 'resume')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Transform to UploadedFile format
      return (data || []).map((doc: any) => ({
        id: doc.id,
        name: doc.file_name,
        url: doc.file_url,
        size: doc.file_size,
        mimeType: doc.mime_type,
        uploadedAt: doc.created_at
      }));
    } catch (error) {
      
      return [];
    }
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();

/**
 * Unified Media Upload Component - Material 3 Design
 * Supports image, video, and document uploads for all app modules
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { getUserFacingError } from '../../utils/userFacingError';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type MediaType = 'image' | 'video' | 'document' | 'all';

export interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video' | 'document';
  name?: string;
  size?: number;
  mimeType?: string;
}

export interface MediaUploadProps {
  mediaType?: MediaType;
  maxFiles?: number;
  maxSizePerFile?: number; // in MB
  allowedExtensions?: string[];
  onMediaSelected?: (media: MediaItem[]) => void;
  onMediaRemoved?: (mediaId: string) => void;
  onUploadProgress?: (progress: number) => void;
  onUploadComplete?: (urls: string[]) => void;
  onUploadError?: (error: string) => void;
  selectedMedia?: MediaItem[];
  placeholder?: string;
  uploadButton?: boolean;
  disabled?: boolean;
  module?: 'property' | 'services' | 'jobs' | 'stories' | 'datemi';
  style?: any;
}

export default function MediaUpload({
  mediaType = 'image',
  maxFiles = 10,
  maxSizePerFile = 5,
  allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'],
  onMediaSelected,
  onMediaRemoved,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  selectedMedia = [],
  placeholder,
  uploadButton = true,
  disabled = false,
  module = 'property',
  style,
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Module-specific styling
  const getModuleColors = () => {
    switch (module) {
      case 'property':
      case 'jobs':
        return {
          primary: '#0F766E', // teal-700
          secondary: '#14B8A6', // teal-500
          surface: '#F0FDFA', // teal-50
          accent: '#065F46', // teal-800
        };
      case 'services':
      case 'datemi':
        return {
          primary: '#7C3AED', // purple-600
          secondary: '#A855F7', // purple-500
          surface: '#FAF5FF', // purple-50
          accent: '#581C87', // purple-800
        };
      case 'stories':
        return {
          primary: '#059669', // emerald-600
          secondary: '#10B981', // emerald-500
          surface: '#ECFDF5', // emerald-50
          accent: '#047857', // emerald-700
        };
      default:
        return {
          primary: '#0F766E',
          secondary: '#14B8A6',
          surface: '#F0FDFA',
          accent: '#065F46',
        };
    }
  };

  const colors = getModuleColors();

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant access to your photo library to upload media.'
      );
      return false;
    }
    return true;
  };

  const validateFile = (asset: any): { valid: boolean; error?: string } => {
    if (asset.fileSize && asset.fileSize > maxSizePerFile * 1024 * 1024) {
      return {
        valid: false,
        error: `File size exceeds ${maxSizePerFile}MB limit`,
      };
    }

    if (mediaType === 'image') {
      const extension = asset.uri.split('.').pop()?.toLowerCase();
      if (!allowedExtensions.includes(extension || '')) {
        return {
          valid: false,
          error: `File type .${extension} not allowed`,
        };
      }
    }

    return { valid: true };
  };

  const pickImages = async () => {
    if (!await requestPermissions()) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images' as any,
        allowsMultipleSelection: true,
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets) {
        const validAssets = [];
        const errors = [];

        for (const asset of result.assets) {
          if (selectedMedia.length + validAssets.length >= maxFiles) {
            break;
          }

          const validation = validateFile(asset);
          if (validation.valid) {
            const mediaItem: MediaItem = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              uri: asset.uri,
              type: 'image',
              name: asset.fileName || `image_${Date.now()}.jpg`,
              size: asset.fileSize || 0,
            };
            validAssets.push(mediaItem);
          } else {
            errors.push(validation.error);
          }
        }

        if (validAssets.length > 0) {
          onMediaSelected?.(validAssets);
        }

        if (errors.length > 0) {
          Alert.alert('Upload Issues', errors.join('\n'));
        }
      }
    } catch (error) {
      
      const friendly = getUserFacingError(error, {
        action: 'select images',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  };

  const pickVideos = async () => {
    if (!await requestPermissions()) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Videos' as any,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const asset = result.assets[0];
        const validation = validateFile(asset);

        if (validation.valid) {
          const mediaItem: MediaItem = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            uri: asset.uri,
            type: 'video',
            name: asset.fileName || `video_${Date.now()}.mp4`,
            size: asset.fileSize || 0,
          };
          onMediaSelected?.([mediaItem]);
        } else {
          Alert.alert('Upload Error', validation.error);
        }
      }
    } catch (error) {
      
      const friendly = getUserFacingError(error, {
        action: 'select a video',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  };

  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const validAssets = [];
        const errors = [];

        for (const asset of result.assets) {
          if (selectedMedia.length + validAssets.length >= maxFiles) {
            break;
          }

          const validation = validateFile(asset);
          if (validation.valid) {
            const mediaItem: MediaItem = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              uri: asset.uri,
              type: 'document',
              name: asset.name,
              size: asset.size || 0,
              mimeType: asset.mimeType,
            };
            validAssets.push(mediaItem);
          } else {
            errors.push(validation.error);
          }
        }

        if (validAssets.length > 0) {
          onMediaSelected?.(validAssets);
        }

        if (errors.length > 0) {
          Alert.alert('Upload Issues', errors.join('\n'));
        }
      }
    } catch (error) {
      
      const friendly = getUserFacingError(error, {
        action: 'select documents',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  };

  const removeMedia = (mediaId: string) => {
    onMediaRemoved?.(mediaId);
  };

  const renderMediaItem = (item: MediaItem, index: number) => {
    const itemWidth = (SCREEN_WIDTH - 64) / 3 - 8;

    return (
      <View key={item.id} style={[styles.mediaItem, { width: itemWidth, height: itemWidth }]}>
        {item.type === 'image' ? (
          <Image
            source={{ uri: item.uri }}
            style={[styles.mediaImage, { backgroundColor: colors.surface }]}
          />
        ) : (
          <View 
            style={[styles.mediaPlaceholder, { backgroundColor: colors.surface }]}
          >
            <Ionicons 
              name={item.type === 'video' ? 'videocam' : 'document'} 
              size={32} 
              color={colors.primary} 
            />
            <Text 
              style={[styles.mediaFileName, { color: colors.primary }]} 
              numberOfLines={2}
            >
              {item.name}
            </Text>
          </View>
        )}
        
        {/* Remove button */}
        <TouchableOpacity
          onPress={() => removeMedia(item.id)}
          style={styles.removeButton}
          disabled={disabled}
        >
          <Ionicons name="close" size={16} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderUploadOptions = () => {
    if (!uploadButton) return null;

    const canAddMore = selectedMedia.length < maxFiles;

    return (
      <View style={styles.uploadOptions}>
        {(mediaType === 'image' || mediaType === 'all') && canAddMore && (
          <TouchableOpacity
            onPress={pickImages}
            disabled={disabled || uploading}
            style={[
              styles.uploadButton,
              { 
                backgroundColor: disabled ? '#F3F4F6' : colors.surface,
                borderColor: colors.primary,
              }
            ]}
          >
            <Ionicons name="image" size={20} color={colors.primary} />
            <Text style={[styles.uploadButtonText, { color: colors.primary }]}>
              Add Images
            </Text>
          </TouchableOpacity>
        )}

        {(mediaType === 'video' || mediaType === 'all') && canAddMore && (
          <TouchableOpacity
            onPress={pickVideos}
            disabled={disabled || uploading}
            style={[
              styles.uploadButton,
              { 
                backgroundColor: disabled ? '#F3F4F6' : colors.surface,
                borderColor: colors.primary,
              }
            ]}
          >
            <Ionicons name="videocam" size={20} color={colors.primary} />
            <Text style={[styles.uploadButtonText, { color: colors.primary }]}>
              Add Video
            </Text>
          </TouchableOpacity>
        )}

        {(mediaType === 'document' || mediaType === 'all') && canAddMore && (
          <TouchableOpacity
            onPress={pickDocuments}
            disabled={disabled || uploading}
            style={[
              styles.uploadButton,
              { 
                backgroundColor: disabled ? '#F3F4F6' : colors.surface,
                borderColor: colors.primary,
              }
            ]}
          >
            <Ionicons name="document" size={20} color={colors.primary} />
            <Text style={[styles.uploadButtonText, { color: colors.primary }]}>
              Add Document
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Upload progress */}
      {uploading && (
        <View style={[styles.uploadProgress, { backgroundColor: colors.surface }]}>
          <View style={styles.uploadProgressHeader}>
            <Text style={[styles.uploadProgressTitle, { color: colors.primary }]}>
              Uploading...
            </Text>
            <Text style={[styles.uploadProgressPercent, { color: colors.primary }]}>
              {Math.round(uploadProgress)}%
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar,
                { 
                  backgroundColor: colors.secondary,
                  width: `${uploadProgress}%` 
                }
              ]}
            />
          </View>
        </View>
      )}

      {/* Selected media grid */}
      {selectedMedia.length > 0 && (
        <View style={styles.selectedMediaContainer}>
          <Text style={[styles.selectedMediaTitle, { color: colors.accent }]}>
            Selected Media ({selectedMedia.length}/{maxFiles})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.mediaGrid}>
              {selectedMedia.map((item, index) => renderMediaItem(item, index))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Upload options */}
      {renderUploadOptions()}

      {/* Placeholder when no media selected */}
      {selectedMedia.length === 0 && placeholder && (
        <View 
          style={[styles.placeholder, { borderColor: colors.primary }]}
        >
          <Ionicons name="cloud-upload" size={48} color={colors.primary} />
          <Text style={[styles.placeholderText, { color: colors.primary }]}>
            {placeholder}
          </Text>
        </View>
      )}

      {/* File limit indicator */}
      <View style={styles.fileLimitContainer}>
        <Text style={styles.fileLimitText}>
          Max {maxFiles} files, {maxSizePerFile}MB each
        </Text>
        {selectedMedia.length > 0 && (
          <Text style={[styles.selectedCount, { color: colors.primary }]}>
            {selectedMedia.length} selected
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  mediaItem: {
    position: 'relative',
    marginRight: 8,
    marginBottom: 8,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  mediaPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  mediaFileName: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  uploadButtonText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  uploadProgress: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  uploadProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  uploadProgressTitle: {
    fontWeight: '500',
  },
  uploadProgressPercent: {
    fontSize: 14,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  selectedMediaContainer: {
    marginBottom: 16,
  },
  selectedMediaTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  mediaGrid: {
    flexDirection: 'row',
  },
  placeholder: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    textAlign: 'center',
    marginTop: 8,
  },
  fileLimitContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  fileLimitText: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedCount: {
    fontSize: 14,
  },
});

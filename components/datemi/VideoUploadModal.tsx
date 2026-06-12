// components/datemi/VideoUploadModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabaseClient';
import { getUserFacingError } from '../../utils/userFacingError';

const { width: screenWidth } = Dimensions.get('window');
const MAX_DURATION_SECONDS = 60;
const MAX_FILE_SIZE_MB = 45;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface VideoUploadModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: string;
  onUploadSuccess?: () => void;
}

interface VideoAsset {
  uri: string;
  name: string;
  duration?: number;
  fileSize?: number;
}

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({ 
  visible, 
  onClose, 
  userId,
  onUploadSuccess 
}) => {
  const [selectedVideo, setSelectedVideo] = useState<VideoAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<Video>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const getFileInfo = async (uri: string): Promise<{ size: number; name: string }> => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        return {
          size: fileInfo.size || 0,
          name: uri.split('/').pop() || 'video.mp4',
        };
      }
    } catch (error) {
      console.warn('Error getting file info:', error);
    }
    return { size: 0, name: 'video.mp4' };
  };

  const validateVideo = async (asset: ImagePicker.ImagePickerAsset): Promise<boolean> => {
    setValidationError(null);
    
    // Check duration
    if (asset.duration && asset.duration/1000 > MAX_DURATION_SECONDS) {
      setValidationError(`Video must be ${MAX_DURATION_SECONDS} seconds or less. Current: ${Math.round(asset.duration/1000)}s`);
      return false;
    }
    
    // Check file size
    const fileInfo = await getFileInfo(asset.uri);
    const fileSizeMB = fileInfo.size / (1024 * 1024);
    
    if (fileInfo.size > MAX_FILE_SIZE_BYTES) {
      setValidationError(`Video must be ${MAX_FILE_SIZE_MB}MB or less. Current: ${fileSizeMB.toFixed(1)}MB`);
      return false;
    }
    
    return true;
  };

  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your media library to upload videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.8,
        videoMaxDuration: MAX_DURATION_SECONDS,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const isValid = await validateVideo(asset);
        
        if (isValid) {
          const fileInfo = await getFileInfo(asset.uri);
          setSelectedVideo({
            uri: asset.uri,
            name: `video_${Date.now()}.mp4`,
            duration: asset.duration/1000,
            fileSize: fileInfo.size,
          });
        }
      }
    } catch (error) {
      const friendly = getUserFacingError(error, {
        action: 'select a video',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message);
    }
  };

  const recordVideo = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow camera access to record videos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.8,
        videoMaxDuration: MAX_DURATION_SECONDS,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const isValid = await validateVideo(asset);
        
        if (isValid) {
          const fileInfo = await getFileInfo(asset.uri);
          setSelectedVideo({
            uri: asset.uri,
            name: `video_${Date.now()}.mp4`,
            duration: asset.duration/1000,
            fileSize: fileInfo.size,
          });
        }
      }
    } catch (error) {
      const friendly = getUserFacingError(error, {
        action: 'record a video',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message);
    }
  };

  const compressVideo = async (uri: string): Promise<string> => {
    // Note: For production, you might want to use a video compression library
    // For now, we'll return the original URI and rely on validation
    // Consider using expo-video-compressor or similar for actual compression
    return uri;
  };

  const handleUpload = async () => {
    if (!userId) {
      Alert.alert('Error', 'You must be signed in to upload videos.');
      return;
    }

    if (!selectedVideo) {
      Alert.alert('No Video', 'Please select or record a video first.');
      return;
    }

    // Re-validate before upload
    if (selectedVideo.fileSize && selectedVideo.fileSize > MAX_FILE_SIZE_BYTES) {
      setValidationError(`Video exceeds ${MAX_FILE_SIZE_MB}MB limit`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Compress if needed (simulate progress)
      setUploadProgress(20);
      
      let videoUri = selectedVideo.uri;
      if (selectedVideo.fileSize && selectedVideo.fileSize > MAX_FILE_SIZE_BYTES * 0.8) {
        videoUri = await compressVideo(selectedVideo.uri);
      }
      
      setUploadProgress(40);
      
      // Read video file
      const base64 = await FileSystem.readAsStringAsync(videoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      setUploadProgress(60);
      
      const fileData = Buffer.from(base64, 'base64');
      const fileName = `${userId}/${Date.now()}_${selectedVideo.name}`;
      
      // Upload to Supabase storage with progress tracking
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('datemi-short-videos')
        .upload(fileName, fileData, {
          contentType: 'video/mp4',
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;
      
      setUploadProgress(80);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('datemi-short-videos')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get video URL');
      }

      // Get current user's profile
      const { data: profileData, error: profileError } = await supabase
        .from('date_mi_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      setUploadProgress(90);

      // Save video metadata to database
      const { error: insertError } = await supabase
        .from('date_mi_short_videos')
        .insert({
          video_url: urlData.publicUrl,
          user_id: userId,
          profile_id: profileData.id,
          caption: caption.trim() || null,
          likes_count: 0,
          comments_count: 0,
          favorites_count: 0,
          views_count: 0,
          is_active: true,
          duration: selectedVideo.duration || null,
          file_size: selectedVideo.fileSize || null,
        });

      if (insertError) throw insertError;
      
      setUploadProgress(100);

      Alert.alert('Success!', 'Your video has been uploaded successfully.', [
        { 
          text: 'OK', 
          onPress: () => {
            resetForm();
            onUploadSuccess?.();
            onClose();
          }
        }
      ]);
    } catch (error) {
      const friendly = getUserFacingError(error, {
        action: 'upload this video',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setSelectedVideo(null);
    setCaption('');
    setIsUploading(false);
    setUploadProgress(0);
    setValidationError(null);
    setIsPlaying(false);
  };

  const handleClose = () => {
    if (isUploading) {
      Alert.alert('Upload in Progress', 'Please wait for the upload to complete.');
      return;
    }
    resetForm();
    onClose();
  };

  const togglePlayback = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pauseAsync();
      } else {
        videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f3460']}
          style={StyleSheet.absoluteFillObject}
        />
        
        {/* Header */}
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'transparent']}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} disabled={isUploading} style={styles.headerButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <Text style={styles.title}>Upload Video</Text>
            
            <TouchableOpacity 
              onPress={handleUpload} 
              disabled={isUploading || !selectedVideo || !!validationError}
              style={[
                styles.postButton,
                (!selectedVideo || !!validationError) && styles.postButtonDisabled
              ]}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.postButtonText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
        
        {/* Upload Progress */}
          {isUploading && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <Animated.View 
                  style={[
                    styles.progressFill, 
                    { width: `${uploadProgress}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {uploadProgress < 40 ? 'Preparing video...' : 
                 uploadProgress < 80 ? 'Uploading...' : 
                 'Finalizing...'} {uploadProgress}%
              </Text>
            </View>
          )}

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {/* Video Preview */}
          {selectedVideo ? (
            <View style={styles.videoPreviewContainer}>
              <TouchableOpacity 
                activeOpacity={0.9}
                onPress={togglePlayback}
                style={styles.videoWrapper}
              >
                <Video
                  ref={videoRef}
                  source={{ uri: selectedVideo.uri }}
                  style={styles.videoPreview}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={false}
                  isLooping={false}
                  useNativeControls={false}
                  onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                    if (status.isLoaded) {
                      setIsPlaying(status.isPlaying);
                    }
                  }}
                />
                
                {/* Play/Pause Overlay */}
                {!isPlaying && (
                  <View style={styles.playOverlay}>
                    <LinearGradient
                      colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)']}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <View style={styles.playButton}>
                      <Ionicons name="play" size={40} color="#FFFFFF" />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
              
              {/* Video Info Badges */}
              <View style={styles.videoInfoBadges}>
                <View style={styles.badge}>
                  <Ionicons name="time-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.badgeText}>{formatDuration(selectedVideo.duration)}</Text>
                </View>
                <View style={styles.badge}>
                  <Ionicons name="document-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.badgeText}>{formatFileSize(selectedVideo.fileSize)}</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.removeVideoButton} 
                onPress={() => setSelectedVideo(null)}
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  style={styles.removeButtonGradient}
                >
                  <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.selectVideoContainer}>
              <Text style={styles.selectTitle}>Choose a Video</Text>
              <Text style={styles.selectSubtitle}>
                Max {MAX_DURATION_SECONDS}s • Max {MAX_FILE_SIZE_MB}MB
              </Text>
              
              <View style={styles.selectButtonsRow}>
                <TouchableOpacity style={styles.selectButton} onPress={pickVideo}>
                  <LinearGradient
                    colors={['#6012f1', '#8b5cf6']}
                    style={styles.selectButtonGradient}
                  >
                    <Ionicons name="images-outline" size={32} color="#FFFFFF" />
                    <Text style={styles.selectButtonText}>Gallery</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.selectButton} onPress={recordVideo}>
                  <LinearGradient
                    colors={['#EF4444', '#F97316']}
                    style={styles.selectButtonGradient}
                  >
                    <Ionicons name="camera-outline" size={32} color="#FFFFFF" />
                    <Text style={styles.selectButtonText}>Record</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Validation Error */}
          {validationError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text style={styles.errorText}>{validationError}</Text>
            </View>
          )}

          {/* Caption Input */}
          {selectedVideo && (
            <View style={styles.captionContainer}>
              <Text style={styles.captionLabel}>Caption</Text>
              <View style={styles.captionInputWrapper}>
                <TextInput
                  style={styles.captionInput}
                  placeholder="Write a caption..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  maxLength={150}
                />
                <Text style={styles.charCount}>{caption.length}/150</Text>
              </View>
            </View>
          )}
          

          {/* Guidelines */}
          <View style={styles.guidelinesContainer}>
            <View style={styles.guidelinesHeader}>
              <Ionicons name="information-circle-outline" size={20} color="#8b5cf6" />
              <Text style={styles.guidelinesTitle}>Video Guidelines</Text>
            </View>
            <View style={styles.guidelinesList}>
              <View style={styles.guidelineItem}>
                <Ionicons name="time-outline" size={16} color="#8b5cf6" />
                <Text style={styles.guidelinesText}>Maximum {MAX_DURATION_SECONDS} seconds duration</Text>
              </View>
              <View style={styles.guidelineItem}>
                <Ionicons name="cube-outline" size={16} color="#8b5cf6" />
                <Text style={styles.guidelinesText}>Maximum {MAX_FILE_SIZE_MB}MB file size</Text>
              </View>
              <View style={styles.guidelineItem}>
                <Ionicons name="shield-outline" size={16} color="#8b5cf6" />
                <Text style={styles.guidelinesText}>No inappropriate or offensive content</Text>
              </View>
              <View style={styles.guidelineItem}>
                <Ionicons name="heart-outline" size={16} color="#8b5cf6" />
                <Text style={styles.guidelinesText}>Respect community guidelines</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  postButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EF4444',
  },
  postButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#6B7280',
  },
  postButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  videoPreviewContainer: {
    position: 'relative',
    aspectRatio: 9 / 16,
    backgroundColor: '#000',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  videoWrapper: {
    flex: 1,
  },
  videoPreview: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoInfoBadges: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  removeVideoButton: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  removeButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectVideoContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  selectTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  selectSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 24,
  },
  selectButtonsRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  selectButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  selectButtonGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
  },
  captionContainer: {
    marginBottom: 20,
  },
  captionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  captionInputWrapper: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  captionInput: {
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    margin: 8,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 3,
  },
  progressText: {
    marginTop: 8,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  guidelinesContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  guidelinesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  guidelinesList: {
    gap: 8,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guidelinesText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
});
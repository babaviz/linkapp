// components/datemi/VideoUploadModal.tsx
import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabaseClient';
import { storageService } from '../../services/storageService';
import { getUserFacingError } from '../../utils/userFacingError';

interface VideoUploadModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: string;
}

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({ visible, onClose, userId }) => {
  const [selectedVideo, setSelectedVideo] = useState<{ uri: string; name: string } | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoRef = useRef<Video>(null);

  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your media library to upload videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedVideo({
          uri: result.assets[0].uri,
          name: `video_${Date.now()}.mp4`,
        });
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
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedVideo({
          uri: result.assets[0].uri,
          name: `video_${Date.now()}.mp4`,
        });
      }
    } catch (error) {
      const friendly = getUserFacingError(error, {
        action: 'record a video',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message);
    }
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

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Read video file as base64
      const base64 = await FileSystem.readAsStringAsync(selectedVideo.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const fileData = Buffer.from(base64, 'base64');
      const fileName = `${userId}/${Date.now()}_${selectedVideo.name}`;
      
      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('datemi-short-videos')
        .upload(fileName, fileData, {
          contentType: 'video/mp4',
        });

      if (uploadError) throw uploadError;

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
        });

      if (insertError) throw insertError;

      Alert.alert('Success!', 'Your video has been uploaded successfully.', [
        { text: 'OK', onPress: () => {
          setSelectedVideo(null);
          setCaption('');
          onClose();
        }}
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
  };

  const handleClose = () => {
    if (isUploading) {
      Alert.alert('Upload in Progress', 'Please wait for the upload to complete.');
      return;
    }
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <LinearGradient colors={['#6B46C1', '#553C9A', '#4C1D95']} style={StyleSheet.absoluteFillObject} />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} disabled={isUploading}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Upload Video</Text>
          <TouchableOpacity onPress={handleUpload} disabled={isUploading || !selectedVideo}>
            {isUploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={[styles.uploadButton, !selectedVideo && styles.uploadButtonDisabled]}>
                Post
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Video Preview */}
          {selectedVideo ? (
            <View style={styles.videoPreviewContainer}>
              <Video
                ref={videoRef}
                source={{ uri: selectedVideo.uri }}
                style={styles.videoPreview}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                isLooping
                useNativeControls
              />
              <TouchableOpacity style={styles.removeVideoButton} onPress={() => setSelectedVideo(null)}>
                <Ionicons name="close-circle" size={32} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.selectVideoContainer}>
              <TouchableOpacity style={styles.selectButton} onPress={pickVideo}>
                <Ionicons name="images-outline" size={32} color="#FFFFFF" />
                <Text style={styles.selectButtonText}>Choose from Gallery</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.selectButton} onPress={recordVideo}>
                <Ionicons name="camera-outline" size={32} color="#FFFFFF" />
                <Text style={styles.selectButtonText}>Record Video</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Caption Input */}
          {selectedVideo && (
            <View style={styles.captionContainer}>
              <Text style={styles.captionLabel}>Caption</Text>
              <TextInput
                style={styles.captionInput}
                placeholder="Write a caption..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={150}
              />
              <Text style={styles.charCount}>{caption.length}/150</Text>
            </View>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
              </View>
              <Text style={styles.progressText}>Uploading video... {uploadProgress}%</Text>
            </View>
          )}

          {/* Guidelines */}
          <View style={styles.guidelinesContainer}>
            <Text style={styles.guidelinesTitle}>📋 Guidelines</Text>
            <Text style={styles.guidelinesText}>• Videos must be 60 seconds or less</Text>
            <Text style={styles.guidelinesText}>• No inappropriate or offensive content</Text>
            <Text style={styles.guidelinesText}>• Respect community guidelines</Text>
            <Text style={styles.guidelinesText}>• Original content only</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  cancelButton: { fontSize: 17, color: '#9CA3AF' },
  title: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  uploadButton: { fontSize: 17, fontWeight: '600', color: '#EF4444' },
  uploadButtonDisabled: { opacity: 0.5 },
  content: { flex: 1, padding: 16 },
  videoPreviewContainer: {
    position: 'relative',
    aspectRatio: 9 / 16,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  videoPreview: { width: '100%', height: '100%' },
  removeVideoButton: { position: 'absolute', top: 8, right: 8 },
  selectVideoContainer: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  selectButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  selectButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  captionContainer: { marginBottom: 20 },
  captionLabel: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 8 },
  captionInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  charCount: { textAlign: 'right', marginTop: 4, fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  progressContainer: { marginBottom: 20 },
  progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#EF4444', borderRadius: 2 },
  progressText: { marginTop: 8, fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  guidelinesContainer: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16 },
  guidelinesTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginBottom: 8 },
  guidelinesText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
});
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image
} from 'react-native';
import { showDialog, showPrompt } from '../../utils/dialogService';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { authService } from '../../services/authService';
import { initializeUserProfile } from '../../redux/slices/userSlice';
import { userProfileService } from '../../services/userProfileService';
import { signOut, setUser } from '../../redux/slices/authSlice';
import { storageService } from '../../services/storageService';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '../../navigation/ProfileStackNavigator';
import { clearProfileImageCache } from '../../utils/imageCacheUtils';
import { optimizeProfileImage } from '../../utils/imageOptimizationUtils';

type EditProfileScreenProps = {
  navigation: StackNavigationProp<ProfileStackParamList, 'EditProfile'>;
};

export default function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentProfile } = useAppSelector((state) => state.user);
  const myProfile = useAppSelector((state) => state.datemi.myProfile);

  // Ensure form state uses strings only for text inputs
  type FormDataState = {
    fullName: string;
    email: string;
    phone: string;
    bio: string;
    location: string;
  };

  // Convert possible object location to a human-readable string
  const toLocationString = (loc: unknown): string => {
    if (!loc) return '';
    if (typeof loc === 'string') return loc;
    try {
      const obj = loc as { county?: string; town?: string };
      const parts = [obj.town, obj.county].filter(Boolean) as string[];
      return parts.join(', ');
    } catch {
      return '';
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(user?.profileImageUrl || null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  const [formData, setFormData] = useState<FormDataState>({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phoneNumber || '',
    bio: currentProfile?.bio || '',
    location: toLocationString(user?.location as unknown)
  });

  // Initialize form data only once when component mounts or when user/profile first loads
  useEffect(() => {
    if ((user || currentProfile) && !isInitialized) {
      setFormData({
        fullName: user?.fullName || '',
        email: user?.email || '',
        phone: user?.phoneNumber || '',
        bio: currentProfile?.bio || '',
        location: toLocationString(user?.location as unknown)
      });
      // Update profile image if available
      if (user?.profileImageUrl) {
        setProfileImage(user.profileImageUrl);
      }
      setIsInitialized(true);
    }
  }, [user, currentProfile, isInitialized]);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Clear old image cache if image changed
      if (user?.profileImageUrl && user.profileImageUrl !== profileImage) {
        await clearProfileImageCache(user.profileImageUrl);
      }
      
      const existingLocation = user?.location
        ? { town: user.location.town, county: user.location.county }
        : undefined;

      const nextLocation = (() => {
        const raw = formData.location.trim();
        if (!raw) return existingLocation;

        const parts = raw
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);

        const town = parts[0] || existingLocation?.town || '';
        const county = parts[1] || existingLocation?.county || '';

        if (!town && !county) return existingLocation;
        return { town, county };
      })();

      // Update profile via authService (single network call)
      const { error } = await authService.updateProfile({
        fullName: formData.fullName,
        phoneNumber: formData.phone,
        profileImageUrl: profileImage,
        bio: formData.bio,
        location: nextLocation,
      });

      if (error) {
        throw error;
      }

      // Refresh auth user profile from backend to get latest data.
      // If that fails (e.g. transient network), fall back to an optimistic local update.
      const updatedUser = await authService.getCurrentUser();

      const mergedUser = updatedUser
        ? {
            ...updatedUser,
            fullName: formData.fullName,
            phoneNumber: formData.phone,
            profileImageUrl: profileImage,
            bio: formData.bio,
            location: nextLocation ?? updatedUser.location,
          }
        : user
          ? {
              ...user,
              fullName: formData.fullName,
              phoneNumber: formData.phone,
              profileImageUrl: profileImage,
              bio: formData.bio,
              location: nextLocation ?? user.location,
              updatedAt: new Date().toISOString(),
            }
          : null;

      if (mergedUser) {
        dispatch(setUser(mergedUser));
        await dispatch(initializeUserProfile(mergedUser));
      }
      
      await showDialog({
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully!',
        type: 'success',
        buttons: [
          { 
            text: 'OK', 
            onPress: () => {
              // Simply go back without animation to avoid navigation issues
              navigation.goBack();
            }
          }
        ]
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile. Please try again.';
      await showDialog({
        title: 'Update Failed',
        message: errorMessage,
        type: 'error',
        buttons: [{ text: 'OK' }]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleChangePhoto = async () => {
    await showDialog({
      title: 'Change Profile Photo',
      message: 'Choose a photo source. You\'ll be able to crop and adjust before saving.',
      icon: { name: 'photo-camera', color: '#3B82F6', size: 28 },
      buttons: [
        { text: 'Camera', onPress: () => pickImage('camera') },
        { text: 'Gallery', onPress: () => pickImage('gallery') },
        { text: 'Remove Photo', onPress: () => removePhoto(), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ]
    });
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      // Request permissions
      const permissionResult = source === 'camera' 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        await showDialog({
          title: 'Permission Required',
          message: `Please enable ${source === 'camera' ? 'camera' : 'photo library'} access in your device settings.`,
          type: 'warning',
          buttons: [{ text: 'OK' }]
        });
        return;
      }

      // Launch image picker
      const pickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1] as [number, number],
        quality: 0.8,
      };

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(pickerOptions)
        : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (!result.canceled && result.assets[0]) {
        setIsUploadingImage(true);
        try {
          let imageUri = result.assets[0].uri;
          
          // Optimize image before upload (compress & resize)
          imageUri = await optimizeProfileImage(imageUri, {
            maxWidth: 1024,
            maxHeight: 1024,
            quality: 0.8,
            format: 'jpeg',
          });
          
          let uploadedUrl = imageUri;
          
          // Upload to Supabase storage if configured and not already a URL
          if (user?.id && storageService.isConfigured() && !imageUri.startsWith('http')) {
            try {
              // Read image as base64
              const base64 = await FileSystem.readAsStringAsync(imageUri, {
                encoding: 'base64',
              });
              
              // Determine MIME type from URI
              const mimeType = imageUri.toLowerCase().endsWith('.png') 
                ? 'image/png' 
                : imageUri.toLowerCase().endsWith('.webp')
                ? 'image/webp'
                : 'image/jpeg';
              
              // Convert base64 to Uint8Array for React Native
              const byteCharacters = atob(base64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              
              // Upload to Supabase using profile-images bucket
              const uploadResult = await storageService.uploadFile({
                bucket: 'profile-images',
                path: storageService.generateFilePath('profile-images', user.id, 'profile.jpg'),
                file: byteArray,
                fileType: mimeType,
                upsert: true
              });
              
              if (uploadResult.success && uploadResult.data?.publicUrl) {
                uploadedUrl = uploadResult.data.publicUrl;
              } else {
                throw new Error(uploadResult.error || 'Upload failed');
              }
            } catch (uploadError) {
              // If upload fails, throw error to show user
              // eslint-disable-next-line no-console
              if (__DEV__) {
                console.error('Image upload failed:', uploadError);
              }
              const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown error';
              throw new Error(`Failed to upload image: ${errorMessage}`);
            }
          }
          
          // Update local state with the uploaded URL
          setProfileImage(uploadedUrl);
        } catch (error) {
          // eslint-disable-next-line no-console
          if (__DEV__) {
            console.error('Error uploading image:', error);
          }
          await showDialog({
            title: 'Upload Failed',
            message: 'Failed to upload image. Please try again.',
            type: 'error',
            buttons: [{ text: 'OK' }]
          });
        } finally {
          setIsUploadingImage(false);
        }
      }
    } catch {
      await showDialog({
        title: 'Error',
        message: 'Failed to pick image. Please try again.',
        type: 'error',
        buttons: [{ text: 'OK' }]
      });
    }
  };


  const removePhoto = () => {
    setProfileImage(null);
  };

  const usePhotoFromDateMi = async () => {
    if (!myProfile?.profilePictures?.[0]) {
      await showDialog({
        title: 'No Date Mi Photo',
        message: 'You don\'t have a Date Mi profile photo set yet.',
        type: 'info',
        buttons: [{ text: 'OK' }]
      });
      return;
    }

    await showDialog({
      title: 'Use Date Mi Photo?',
      message: 'This will set your main profile photo to match your Date Mi photo. Continue?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Use Date Mi Photo', 
          onPress: () => {
            setProfileImage(myProfile.profilePictures[0]);
          }
        }
      ]
    });
  };

  const handleDeleteAccount = async () => {
    await showDialog({
      title: 'Delete Account',
      message: 'Are you sure you want to permanently delete your account?',
      type: 'warning',
      icon: { name: 'warning', color: '#F59E0B', size: 32 },
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          style: 'destructive',
          onPress: async () => {
            // Second confirmation with text input
            const input = await showPrompt({
              title: 'Confirm Account Deletion',
              message: 'Type "DELETE" to confirm you want to permanently delete your account and all associated data.',
              placeholder: 'Type DELETE',
              inputType: 'plain-text',
              autoCapitalize: 'characters',
              validate: (value) => {
                if (value.toUpperCase() !== 'DELETE') {
                  return 'Please type DELETE to confirm account deletion.';
                }
                return true;
              },
              buttons: [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete My Account',
                  style: 'destructive',
                }
              ],
              icon: { name: 'lock', color: '#EF4444', size: 32 },
            });
            
            if (input?.toUpperCase() === 'DELETE') {
              await performAccountDeletion();
            }
          }
        }
      ]
    });
  };

  const performAccountDeletion = async () => {
    setIsLoading(true);
    try {
      const userId = user?.id;

      if (!userId) {
        throw new Error('You must be signed in to delete your account. Please sign in again and try again.');
      }
      
      // Delete account through service
      const { error } = await userProfileService.deleteUserAccount(userId, {
        expectedEmail: user?.email ?? null,
      });
      
      if (error) {
        throw error;
      }
      
      await showDialog({
        title: 'Account Deleted',
        message: 'Your account has been permanently deleted.',
        type: 'success',
        buttons: [
          {
            text: 'OK',
            onPress: () => {
              // Sign out and navigate to auth
              dispatch(signOut());
            }
          }
        ]
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete account. Please try again or contact support.';
      await showDialog({
        title: 'Deletion Failed',
        message: errorMessage,
        type: 'error',
        buttons: [{ text: 'OK' }]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const FormField = ({ label, value, onChangeText, placeholder, keyboardType, multiline, error }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad' | 'decimal-pad';
    multiline?: boolean;
    error?: string;
  }) => (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[
          styles.textInput,
          multiline && styles.textInputMultiline,
          error && styles.textInputError
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        autoCorrect={keyboardType !== 'email-address'}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  const SettingOption = ({ title, description, onPress, rightElement }: {
    title: string;
    description?: string;
    onPress: () => void;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity style={styles.settingOption} onPress={onPress}>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      {rightElement || <Text style={styles.settingArrow}>›</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Icon name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>✏️ Edit Profile</Text>
            
            <TouchableOpacity
              style={[
                styles.saveButton,
                isLoading && styles.saveButtonDisabled
              ]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Profile Photo Section */}
            <Animated.View 
              style={[
                styles.photoSection,
                {
                  transform: [{
                    scale: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1]
                    })
                  }]
                }
              ]}
            >
              <Text style={styles.photoSectionTitle}>👤 Main Profile Photo</Text>
              <Text style={styles.photoSectionDescription}>
                This photo appears across LinkApp (Property, Jobs, Services). Your Date Mi profile uses separate photos.
              </Text>
              
              <View style={styles.avatarContainer}>
                {profileImage ? (
                  <Image 
                    source={{ uri: profileImage }} 
                    style={styles.avatar}
                    key={profileImage}
                  />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>👤</Text>
                  </View>
                )}
                <View style={styles.cameraIcon}>
                  {isUploadingImage ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.cameraEmoji}>📷</Text>
                  )}
                </View>
              </View>
              
              <TouchableOpacity 
                style={[styles.changePhotoButton, isUploadingImage && styles.changePhotoButtonDisabled]}
                onPress={handleChangePhoto}
                disabled={isUploadingImage}
              >
                <Text style={styles.changePhotoText}>
                  {isUploadingImage ? 'Uploading...' : '📷 Change Photo'}
                </Text>
              </TouchableOpacity>

              {myProfile?.profilePictures?.[0] && (
                <TouchableOpacity 
                  style={[styles.usePhotoButton, isUploadingImage && styles.changePhotoButtonDisabled]}
                  onPress={usePhotoFromDateMi}
                  disabled={isUploadingImage}
                >
                  <Text style={styles.usePhotoText}>
                    💝 Use Date Mi Photo
                  </Text>
                </TouchableOpacity>
              )}
            </Animated.View>

            {/* Personal Information */}
            <Animated.View 
              style={[
                styles.section,
                {
                  transform: [{
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 50],
                      outputRange: [0, 20],
                      extrapolate: 'clamp'
                    })
                  }]
                }
              ]}
            >
              <Text style={styles.sectionTitle}>👤 Personal Information</Text>
              
              <FormField
                label="Full Name"
                value={formData.fullName}
                onChangeText={(text) => updateField('fullName', text)}
                placeholder="Enter your full name"
                error={errors.fullName}
              />
              
              <FormField
                label="Email Address"
                value={formData.email}
                onChangeText={(text) => updateField('email', text)}
                placeholder="Enter your email address"
                keyboardType="email-address"
                error={errors.email}
              />
              
              <FormField
                label="Phone Number"
                value={formData.phone}
                onChangeText={(text) => updateField('phone', text)}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                error={errors.phone}
              />
              
              <FormField
                label="Location"
                value={formData.location}
                onChangeText={(text) => updateField('location', text)}
                placeholder="City, Country (e.g., Nairobi, Kenya)"
              />
              
              <FormField
                label="Bio"
                value={formData.bio}
                onChangeText={(text) => updateField('bio', text)}
                placeholder="Tell us about yourself..."
                multiline
              />
            </Animated.View>

            {/* Account Settings */}
            <Animated.View 
              style={[
                styles.section,
                {
                  transform: [{
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 50],
                      outputRange: [0, 15],
                      extrapolate: 'clamp'
                    })
                  }]
                }
              ]}
            >
              <Text style={styles.sectionTitle}>⚙️ Account Settings</Text>
              
              <SettingOption
                title="Change Password"
                description="Update your account password"
                onPress={async () => {
                  await showDialog({
                    title: 'Change Password',
                    message: 'Password change feature coming soon!',
                    type: 'info',
                    buttons: [{ text: 'OK' }]
                  });
                }}
              />
              
              <SettingOption
                title="Privacy Settings"
                description="Manage your privacy preferences"
                onPress={async () => {
                  await showDialog({
                    title: 'Privacy Settings',
                    message: 'Privacy settings coming soon!',
                    type: 'info',
                    buttons: [{ text: 'OK' }]
                  });
                }}
              />
              
              <SettingOption
                title="Verification Status"
                description="Verify your account for enhanced features"
                onPress={async () => {
                  await showDialog({
                    title: 'Verification',
                    message: 'Account verification coming soon!',
                    type: 'info',
                    buttons: [{ text: 'OK' }]
                  });
                }}
                rightElement={
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{user?.kycStatus || 'Pending'}</Text>
                  </View>
                }
              />
            </Animated.View>

            {/* Danger Zone */}
            <Animated.View 
              style={[
                styles.dangerSection,
                {
                  transform: [{
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 50],
                      outputRange: [0, 10],
                      extrapolate: 'clamp'
                    })
                  }]
                }
              ]}
            >
              <Text style={styles.dangerTitle}>⚠️ Danger Zone</Text>
              
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeleteAccount()}
              >
                <Text style={styles.deleteButtonText}>🗑️ Delete Account</Text>
                <Text style={styles.deleteButtonSubtext}>This action cannot be undone</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    width: 48,
    height: 48,
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  photoSection: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  photoSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  photoSectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    backgroundColor: '#6B7280',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 42,
    color: '#ffffff',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  cameraEmoji: {
    fontSize: 16,
  },
  changePhotoButton: {
    backgroundColor: '#EBF8FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  changePhotoText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  changePhotoButtonDisabled: {
    opacity: 0.6,
  },
  usePhotoButton: {
    backgroundColor: '#FFF0F5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF69B4',
    marginTop: 12,
  },
  usePhotoText: {
    color: '#FF69B4',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
  },
  formField: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 52,
  },
  textInputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  textInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 6,
    fontWeight: '500',
  },
  settingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingContent: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  settingArrow: {
    fontSize: 20,
    color: '#9CA3AF',
    fontWeight: '300',
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#D97706',
    fontSize: 14,
    fontWeight: '600',
  },
  dangerSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    shadowColor: '#EF4444',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 16,
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deleteButtonSubtext: {
    color: '#7F1D1D',
    fontSize: 12,
    fontStyle: 'italic',
  },
});

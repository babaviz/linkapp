import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useSelector, useDispatch } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { RootState, AppDispatch } from '../../redux/store';
import {
  updatePrivacySettings,
  signOutDateMi,
  resetPasscodeVerification,
  updateProfile as updateDateMiProfile,
} from '../../redux/slices/datemiSlice';
import { storageService } from '../../services/storageService';
import usePremiumAccess from '../../hooks/usePremiumAccess';

const FALLBACK_PROFILE_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjE2MCIgcj0iNjAiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTEyMCAzMDBDMTIwIDI2MC44IDI2MC44IDI0MCAzMDAgMjQwQzMzOS4yIDI0MCAzNjAgMjYwLjggMzYwIDMwMEgxMjBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
import { clearProfileImageCache } from '../../utils/imageCacheUtils';
import { optimizeProfileImage } from '../../utils/imageOptimizationUtils';
import { getUserFacingError } from '../../utils/userFacingError';

type DateMiProfileSettingsNavigationProp = StackNavigationProp<RootStackParamList>;

export default function DateMiProfileSettingsScreen() {
  const navigation = useNavigation<DateMiProfileSettingsNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  
  // Get user data from Redux
  const user = useSelector((state: RootState) => state.auth.user);
  const myProfile = useSelector((state: RootState) => state.datemi.myProfile);
  const premiumAccess = usePremiumAccess();
  
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string>(
    myProfile?.profilePictures?.[0] || FALLBACK_PROFILE_AVATAR
  );

  // Sync profile image when Redux state changes
  useEffect(() => {
    const currentImage = myProfile?.profilePictures?.[0] || FALLBACK_PROFILE_AVATAR;
    if (currentImage !== profileImage && currentImage !== FALLBACK_PROFILE_AVATAR) {
      setProfileImage(currentImage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myProfile?.profilePictures]);
  
  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState({
    showOnlineStatus: myProfile?.privacySettings?.showOnlineStatus ?? true,
    showLastSeen: myProfile?.privacySettings?.showLastSeen ?? true,
    showReadReceipts: myProfile?.privacySettings?.showReadReceipts ?? true,
    allowMessageFromMatches: myProfile?.privacySettings?.allowMessageFromMatches ?? true,
    allowVideoCallRequests: myProfile?.privacySettings?.allowVideoCallRequests ?? false,
    hideFromNearbySearch: myProfile?.privacySettings?.hideFromNearbySearch ?? false,
    verifiedProfilesOnly: myProfile?.privacySettings?.verifiedProfilesOnly ?? false,
    blockScreenshots: myProfile?.privacySettings?.blockScreenshots ?? false,
    autoDeleteMessages: myProfile?.privacySettings?.autoDeleteMessages ?? false,
    requirePhotoVerification: myProfile?.privacySettings?.requirePhotoVerification ?? false,
  });

  // Demo profile data if not available
  const displayName = myProfile?.displayName || user?.fullName || 'User';
  const age = myProfile?.age || 25;
  const location = myProfile?.location || 'Location unavailable';
  const aboutMe = myProfile?.aboutMe || 'No bio added yet';
  const interests = myProfile?.interests || ['Music', 'Travel', 'Art'];
  const subscriptionTier = premiumAccess.currentTier;
  const isVerified = myProfile?.verified || false;

  const handlePrivacyToggle = (setting: string, value: boolean) => {
    const newSettings = { ...privacySettings, [setting]: value };
    setPrivacySettings(newSettings);
    
    // In a real app, this would update the backend
    dispatch(updatePrivacySettings(newSettings));
  };

  const handleEditProfile = () => {
    navigation.navigate('CreateProfile');
  };

  const handleManageSubscription = () => {
    navigation.navigate('SubscriptionManagement');
  };

  const handleSafetySettings = () => {
    navigation.navigate('SafetySettings');
  };

  const handleHelpSupport = () => {
    navigation.navigate('HelpSupport');
  };

  const handleAboutDateMi = () => {
    Alert.alert(
      'About Date Mi',
      'Date Mi is a premium social networking and dating platform designed for meaningful connections.',
      [
        { text: 'OK' }
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out from Date Mi',
      'This will sign you out of Date Mi only. You\'ll remain logged into your main LinkApp account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out of Date Mi',
          style: 'destructive',
          onPress: () => {
            dispatch(signOutDateMi());
            dispatch(resetPasscodeVerification());

            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          }
        }
      ]
    );
  };

  const handleImagePicker = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photos to update your profile picture.'
        );
        return;
      }

      // Show options
      Alert.alert(
        'Update Profile Photo',
        'Choose a photo source. You\'ll be able to crop and position your photo before saving.',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              const pickerOptions = {
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1] as [number, number],
                quality: 0.8,
              };
              
              const result = await ImagePicker.launchCameraAsync(pickerOptions);
              
              if (!result.canceled && result.assets[0]) {
                handleImageUpdate(result.assets[0].uri);
              }
            }
          },
          {
            text: 'Choose from Library',
            onPress: async () => {
              const pickerOptions = {
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1] as [number, number],
                quality: 0.8,
              };
              
              const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
              
              if (!result.canceled && result.assets[0]) {
                handleImageUpdate(result.assets[0].uri);
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      const friendly = getUserFacingError(error, {
        action: 'choose a profile photo',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  };

  // Convert base64 string to a Uint8Array suitable for Supabase storage upload.
  // Uses the globally-polyfilled Buffer (extends Uint8Array) which the upload
  // handler processes directly — avoids React Native Blob.arrayBuffer() issues.
  const base64ToUint8Array = (base64: string): Uint8Array => {
    return Buffer.from(base64, 'base64');
  };

  const usePhotoFromMainProfile = async () => {
    if (!user?.profileImageUrl) {
      Alert.alert(
        'No Main Profile Photo',
        'You don\'t have a main profile photo set yet. Please set one in your main profile settings.'
      );
      return;
    }

    Alert.alert(
      'Use Main Profile Photo?',
      'This will set your Date Mi profile photo to match your main profile photo. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Use Main Photo', 
          onPress: () => handleImageUpdate(user.profileImageUrl!)
        }
      ]
    );
  };

  const handleImageUpdate = async (imageUri: string) => {
    if (!user?.id) {
      const friendly = getUserFacingError(new Error('Not authenticated'), {
        action: 'update your profile photo',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
      return;
    }
    if (!myProfile?.id) {
      const friendly = getUserFacingError(new Error('Date Mi profile not found'), {
        action: 'update your profile photo',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
      return;
    }

    try {
      setIsLoading(true);
      
      // Clear old image cache if exists
      const oldImage = myProfile?.profilePictures?.[0];
      if (oldImage && oldImage !== FALLBACK_PROFILE_AVATAR) {
        await clearProfileImageCache(oldImage);
      }
      
      const isRemoteInput = /^https?:\/\//.test(imageUri);

      // If this is already a remote URL (e.g., "Use Main Profile Photo"), persist directly.
      if (isRemoteInput) {
        setProfileImage(imageUri);
        await dispatch(
          updateDateMiProfile({
            id: myProfile.id,
            profilePictures: [imageUri, ...(myProfile.profilePictures?.slice(1) || [])],
          }) as any
        ).unwrap();
        Alert.alert('Success', 'Profile photo updated successfully!');
        return;
      }

      // Local image selected: optimize then upload to a public bucket.
      const optimizedUri = await optimizeProfileImage(imageUri, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.85,
        format: 'jpeg',
      });

      // Optimistically show local image while uploading
      setProfileImage(optimizedUri);

      let nextImageUrl: string = optimizedUri;

      if (storageService.isConfigured()) {
        // Read image as base64
        const base64 = await FileSystem.readAsStringAsync(optimizedUri, {
          encoding: 'base64',
        });

        const lower = optimizedUri.toLowerCase();
        const mimeType = lower.endsWith('.png')
          ? 'image/png'
          : lower.endsWith('.webp')
          ? 'image/webp'
          : 'image/jpeg';

        // Convert to Uint8Array for upload
        const fileData = base64ToUint8Array(base64);

        const uploadResult = await storageService.uploadDateMiProfileImage(user.id, fileData, {
          fileType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
        });

        if (!uploadResult.success || !uploadResult.data?.publicUrl) {
          throw new Error(uploadResult.error || 'Upload failed');
        }

        if (!/^https?:\/\//.test(uploadResult.data.publicUrl)) {
          throw new Error('Upload failed: invalid image URL');
        }

        nextImageUrl = uploadResult.data.publicUrl;
      } else {
        // Demo / development without Supabase: allow local preview persistence in Redux only.
        nextImageUrl = optimizedUri;
      }

      // Persist updated Date Mi profile to Supabase and Redux (remote-only in production)
      await dispatch(
        updateDateMiProfile({
          id: myProfile.id,
          profilePictures: [nextImageUrl, ...(myProfile.profilePictures?.slice(1) || [])],
        }) as any
      ).unwrap();

      if (/^https?:\/\//.test(nextImageUrl)) {
        setProfileImage(nextImageUrl);
      }
      
      Alert.alert('Success', 'Profile photo updated successfully!');
    } catch (error) {
      const friendly = getUserFacingError(error, {
        action: 'update your profile photo',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
      // Revert to previous image on error
      const fallbackImage = myProfile?.profilePictures?.[0] || FALLBACK_PROFILE_AVATAR;
      setProfileImage(fallbackImage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#2d2d2d']}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Profile Settings</Text>
        
        {/* Profile Image in Header */}
        <TouchableOpacity 
          style={styles.headerProfileImageContainer}
          onPress={handleImagePicker}
          disabled={isLoading}
        >
          {profileImage && profileImage !== FALLBACK_PROFILE_AVATAR ? (
            <Image
              source={{ uri: profileImage }}
              style={styles.headerProfileImage}
              onError={() => setProfileImage(FALLBACK_PROFILE_AVATAR)}
            />
          ) : (
            <View style={[styles.headerProfileImage, { backgroundColor: '#6B7280', alignItems: 'center', justifyContent: 'center' }]}>
              <MaterialIcons name="person" size={24} color="#FFF" />
            </View>
          )}
          <View style={styles.headerEditImageButton}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <MaterialIcons name="camera-alt" size={14} color="#FFF" />
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Text style={styles.profileSectionHeader}>💝 Date Mi Profile</Text>
          <Text style={styles.profileSectionSubheader}>
            Your dating profile is private and separate from your main LinkApp profile
          </Text>
          
          <View style={styles.profileCard}>
            <View style={styles.profileMainInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName}>{displayName}</Text>
                {isVerified && (
                  <MaterialIcons name="verified" size={22} color="#4A90E2" />
                )}
              </View>
              <Text style={styles.profileDetails}>
                {age} years • {location}
              </Text>
            </View>
            
            <LinearGradient
              colors={
                subscriptionTier === 'premium' 
                  ? ['#FFD700', '#FFA500']
                  : subscriptionTier === 'pro'
                  ? ['#9C27B0', '#673AB7']
                  : ['#808080', '#606060']
              }
              style={styles.tierBadge}
            >
              <MaterialIcons 
                name={subscriptionTier === 'premium' ? 'stars' : subscriptionTier === 'pro' ? 'workspace-premium' : 'person'} 
                size={16} 
                color="#FFF" 
              />
              <Text style={styles.tierText}>
                {subscriptionTier.toUpperCase()}
              </Text>
            </LinearGradient>
          </View>
          
          {/* Bio Section */}
          <View style={styles.bioCard}>
            <Text style={styles.bioLabel}>About Me</Text>
            <Text style={styles.bioText}>{aboutMe}</Text>
          </View>
          
          {/* Interests */}
          <View style={styles.interestsContainer}>
            {interests.map((interest, index) => (
              <View key={index} style={styles.interestChip}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleEditProfile}
          >
            <MaterialIcons name="edit" size={24} color="#FF6B6B" />
            <Text style={styles.actionButtonText}>Edit Profile</Text>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          {user?.profileImageUrl && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={usePhotoFromMainProfile}
            >
              <MaterialIcons name="person" size={24} color="#4A90E2" />
              <Text style={styles.actionButtonText}>Use Main Profile Photo</Text>
              <MaterialIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleManageSubscription}
          >
            <MaterialIcons name="star" size={24} color="#FFD700" />
            <Text style={styles.actionButtonText}>Manage Subscription</Text>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleSafetySettings}
          >
            <MaterialIcons name="security" size={24} color="#4A90E2" />
            <Text style={styles.actionButtonText}>Safety & Security</Text>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Show Online Status</Text>
              <Text style={styles.settingDescription}>
                Let others see when you're online
              </Text>
            </View>
            <Switch
              value={privacySettings.showOnlineStatus}
              onValueChange={(value) => handlePrivacyToggle('showOnlineStatus', value)}
              trackColor={{ false: '#767577', true: '#FF6B6B' }}
              thumbColor={privacySettings.showOnlineStatus ? '#FFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Show Last Seen</Text>
              <Text style={styles.settingDescription}>
                Display when you were last active
              </Text>
            </View>
            <Switch
              value={privacySettings.showLastSeen}
              onValueChange={(value) => handlePrivacyToggle('showLastSeen', value)}
              trackColor={{ false: '#767577', true: '#FF6B6B' }}
              thumbColor={privacySettings.showLastSeen ? '#FFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Read Receipts</Text>
              <Text style={styles.settingDescription}>
                Show when you've read messages
              </Text>
            </View>
            <Switch
              value={privacySettings.showReadReceipts}
              onValueChange={(value) => handlePrivacyToggle('showReadReceipts', value)}
              trackColor={{ false: '#767577', true: '#FF6B6B' }}
              thumbColor={privacySettings.showReadReceipts ? '#FFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Video Call Requests</Text>
              <Text style={styles.settingDescription}>
                Allow matches to request video calls
              </Text>
            </View>
            <Switch
              value={privacySettings.allowVideoCallRequests}
              onValueChange={(value) => handlePrivacyToggle('allowVideoCallRequests', value)}
              trackColor={{ false: '#767577', true: '#FF6B6B' }}
              thumbColor={privacySettings.allowVideoCallRequests ? '#FFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Hide from Nearby</Text>
              <Text style={styles.settingDescription}>
                Don't appear in nearby searches
              </Text>
            </View>
            <Switch
              value={privacySettings.hideFromNearbySearch}
              onValueChange={(value) => handlePrivacyToggle('hideFromNearbySearch', value)}
              trackColor={{ false: '#767577', true: '#FF6B6B' }}
              thumbColor={privacySettings.hideFromNearbySearch ? '#FFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Verified Profiles Only</Text>
              <Text style={styles.settingDescription}>
                Only interact with verified users
              </Text>
            </View>
            <Switch
              value={privacySettings.verifiedProfilesOnly}
              onValueChange={(value) => handlePrivacyToggle('verifiedProfilesOnly', value)}
              trackColor={{ false: '#767577', true: '#FF6B6B' }}
              thumbColor={privacySettings.verifiedProfilesOnly ? '#FFF' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleHelpSupport}
          >
            <MaterialIcons name="help" size={24} color="#666" />
            <Text style={styles.actionButtonText}>Help & Support</Text>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleAboutDateMi}
          >
            <MaterialIcons name="info" size={24} color="#666" />
            <Text style={styles.actionButtonText}>About Date Mi</Text>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.signOutButton]}
            onPress={handleSignOut}
          >
            <MaterialIcons name="logout" size={24} color="#FF4444" />
            <Text style={[styles.actionButtonText, styles.signOutText]}>
              Sign Out of Date Mi
            </Text>
          </TouchableOpacity>
        </View>

        {/* Version Info */}
        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>Date Mi Version 1.0.0</Text>
          <Text style={styles.versionText}>© 2026 LinkApp</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  headerProfileImageContainer: {
    position: 'relative',
  },
  headerProfileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  headerEditImageButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#1a1a1a',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  profileSection: {
    padding: 20,
    paddingBottom: 0,
  },
  profileSectionHeader: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  profileSectionSubheader: {
    fontSize: 13,
    color: '#AAA',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  profileCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  profileMainInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
  },
  profileDetails: {
    fontSize: 15,
    color: '#AAA',
    fontWeight: '400',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  bioCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  bioLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  bioText: {
    fontSize: 14,
    color: '#CCC',
    lineHeight: 20,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  interestChip: {
    backgroundColor: 'rgba(255,107,107,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
  },
  interestText: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  section: {
    padding: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 5,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
    marginLeft: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#999',
  },
  signOutButton: {
    marginTop: 10,
  },
  signOutText: {
    color: '#FF4444',
  },
  versionInfo: {
    alignItems: 'center',
    padding: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
});

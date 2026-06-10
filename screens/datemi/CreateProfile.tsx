/**
 * Create Profile Screen - Complete Date Mi profile creation
 * Features: Photo upload, preferences, bio, interests, intentions
 * Fixed: Keyboard handling, button styling, header design
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Platform,
  Keyboard,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { setMyProfile, createProfile, updateProfile, switchIntention } from '../../redux/slices/datemiSlice';
import Material3Card from '../../components/common/Material3Card';
import { IndeterminateProgressBar } from '../../components/common';
import { getUserFacingError } from '../../utils/userFacingError';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import * as FileSystem from 'expo-file-system/legacy';
import { EnhancedDatePicker } from '../../components/datemi/EnhancedDatePicker';
import locationService from '../../services/locationService';
import { decodeBase64 } from '../../utils/base64';

interface CreateProfileProps {
  navigation: any;
}

interface ProfileData {
  displayName: string;
  dateOfBirth: Date;
  bio: string;
  interests: string[];
  intention: 'short_term_fun' | 'long_term_partner';
  location: string;
  genderPreferences: string[];
  photos: string[];
}

type ReverseAddress = {
  street?: string;
  city?: string;
  county?: string;
  country?: string;
  postalCode?: string;
  formattedAddress: string;
};

const formatCityCountry = (address: ReverseAddress): string => {
  const city = address.city || address.county || address.street;
  const country = address.country;
  if (city && country) return `${city}, ${country}`;
  return city || country || '';
};

const INTERESTS = [
  'Travel', 'Music', 'Fitness', 'Cooking', 'Movies', 'Reading',
  'Photography', 'Dancing', 'Sports', 'Art', 'Technology', 'Fashion',
  'Gaming', 'Yoga', 'Hiking', 'Wine', 'Coffee', 'Beach', 'Nature',
];

const INTENTIONS = [
  { value: 'short_term_fun', label: 'Casual Dating', icon: '🔥' },
  { value: 'long_term_partner', label: 'Long Term Relationship', icon: '💕' },
];

const GENDER_PREFERENCES = [
  { value: 'male', label: 'Men' },
  { value: 'female', label: 'Women' },
  { value: 'any', label: 'Everyone' },
];

const { width: screenWidth } = Dimensions.get('window');

export const CreateProfile: React.FC<CreateProfileProps> = ({ navigation }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { user } = useSelector((state: RootState) => state.auth);
  const myProfile = useSelector((state: RootState) => state.datemi.myProfile);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Check if we're in edit mode (if myProfile exists)
  const isEditMode = !!myProfile;
  
  // Refs for input fields to prevent focus loss
  const nameInputRef = useRef<TextInput>(null);
  const locationInputRef = useRef<TextInput>(null);
  const bioInputRef = useRef<TextInput>(null);

  // Calculate date of birth from age if profile exists
  const calculateDateOfBirth = (age?: number): Date => {
    if (!age) {
      // Default to 25 years old
      const defaultDate = new Date();
      defaultDate.setFullYear(defaultDate.getFullYear() - 25);
      return defaultDate;
    }
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - age);
    return dob;
  };

  // Calculate age from date of birth
  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Initialize state with default values or existing profile data
  const [displayName, setDisplayName] = useState<string>(
    myProfile?.displayName || user?.fullName || ''
  );
  const [dateOfBirth, setDateOfBirth] = useState<Date>(
    calculateDateOfBirth(myProfile?.age)
  );
  const [bio, setBio] = useState<string>(
    myProfile?.aboutMe || ''
  );
  const [location, setLocation] = useState<string>(
    myProfile?.location || ''
  );
  const [interests, setInterests] = useState<string[]>(
    myProfile?.interests || []
  );
  const [intention, setIntention] = useState<'short_term_fun' | 'long_term_partner'>(
    myProfile?.intention || 'short_term_fun'
  );
  const [genderPreferences, setGenderPreferences] = useState<string[]>(
    myProfile?.genderPreferences || []
  );
  const [photos, setPhotos] = useState<string[]>(
    myProfile?.profilePictures || []
  );
  const hasAutoFilledLocationRef = useRef(false);

  useEffect(() => {
    requestPermissions();
    
    // Keyboard listeners to track keyboard state
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });
    
    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, []);

  useEffect(() => {
    if (location.trim() || hasAutoFilledLocationRef.current) {
      return;
    }

    hasAutoFilledLocationRef.current = true;

    const autoFillLocation = async () => {
      const result = await locationService.getCurrentLocation({ useCache: true });
      if (!result.success || !result.location) {
        return;
      }

      const reverseResult = await locationService.reverseGeocode(result.location);
      if (!reverseResult.success || !reverseResult.address) {
        return;
      }

      const formatted = formatCityCountry(reverseResult.address as ReverseAddress);
      if (formatted) {
        setLocation(formatted);
      }
    };

    autoFillLocation();
  }, [location]);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need camera roll permissions to upload your photos.'
        );
      }
    }
  };

  const pickImage = async (index: number) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled) {
        const newPhotos = [...photos];
        newPhotos[index] = result.assets[0].uri;
        setPhotos(newPhotos);
      }
    } catch (error) {
      const friendly = getUserFacingError(error, {
        action: 'choose a photo',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  };

  // Upload photos to Supabase storage and return public URLs
  const uploadPhotosToStorage = async (photoUris: string[]): Promise<string[]> => {
    if (!isSupabaseConfigured() || !user?.id) {
      // If Supabase not configured, return local URIs
      return photoUris;
    }

    const uploadedUrls: string[] = [];
    
    for (let i = 0; i < photoUris.length; i++) {
      const uri = photoUris[i];
      
      // Skip if already a URL (not a local file)
      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        uploadedUrls.push(uri);
        continue;
      }
      
      try {
        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Determine file extension
        const extension = uri.toLowerCase().endsWith('.png') ? 'png' : 
                         uri.toLowerCase().endsWith('.webp') ? 'webp' : 'jpg';
        const mimeType = extension === 'png' ? 'image/png' : 
                        extension === 'webp' ? 'image/webp' : 'image/jpeg';
        
        // Create unique file path
        const fileName = `photo_${i + 1}_${Date.now()}.${extension}`;
        const filePath = `${user.id}/${fileName}`;
        
        // Convert base64 to ArrayBuffer
        const binaryString = decodeBase64(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }
        
        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from('datemi-photos')
          .upload(filePath, bytes, {
            contentType: mimeType,
            upsert: true,
          });
        
        if (error) {
          throw error;
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('datemi-photos')
          .getPublicUrl(filePath);
        
        if (urlData?.publicUrl && /^https?:\/\//.test(urlData.publicUrl)) {
          uploadedUrls.push(urlData.publicUrl);
        } else {
          throw new Error('Failed to generate a public photo URL');
        }
      } catch (uploadError: any) {
        const message =
          typeof uploadError?.message === 'string' && uploadError.message.trim().length > 0
            ? uploadError.message
            : `Failed to upload photo ${i + 1}. Please try again.`;
        throw new Error(message);
      }
    }
    
    return uploadedUrls;
  };

  const toggleInterest = (interest: string) => {
    const newInterests = interests.includes(interest)
      ? interests.filter(i => i !== interest)
      : [...interests, interest];
    
    if (newInterests.length <= 10) {
      setInterests(newInterests);
      // Haptic feedback would go here if using expo-haptics
    } else {
      Alert.alert(
        '💝 Maximum Interests',
        'You can select up to 10 interests',
        [{ text: 'OK' }]
      );
    }
  };

  const toggleGenderPreference = (gender: string) => {
    const newPrefs = genderPreferences.includes(gender)
      ? genderPreferences.filter(g => g !== gender)
      : [...genderPreferences, gender];
    setGenderPreferences(newPrefs);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        // Enhanced validation with better user feedback
        const name = displayName.trim();
        if (!name) {
          Alert.alert(
            '📝 Display Name Required',
            'Please enter a display name for your profile',
            [{ text: 'OK', onPress: () => nameInputRef.current?.focus() }]
          );
          return false;
        }
        if (name.length < 2) {
          Alert.alert(
            '📝 Name Too Short',
            'Display name must be at least 2 characters',
            [{ text: 'OK', onPress: () => nameInputRef.current?.focus() }]
          );
          return false;
        }
        const userAge = calculateAge(dateOfBirth);
        if (userAge < 18) {
          Alert.alert(
            '🔞 Age Verification',
            'You must be 18 or older to use Date Mi. Please select a valid date of birth.',
            [{ text: 'OK' }]
          );
          return false;
        }
        if (userAge > 100) {
          Alert.alert(
            '🎂 Invalid Age',
            'Please select a valid date of birth. Age cannot exceed 100 years.',
            [{ text: 'OK' }]
          );
          return false;
        }
        return true;
        
      case 2:
        const photoCount = photos.filter(p => p).length;
        if (photoCount === 0) {
          Alert.alert(
            '📸 Photos Required',
            'Please add at least 2 photos to showcase yourself',
            [{ text: 'Add Photos' }]
          );
          return false;
        }
        if (photoCount === 1) {
          Alert.alert(
            '📸 One More Photo',
            'Please add at least one more photo (minimum 2 required)',
            [{ text: 'Add Another' }]
          );
          return false;
        }
        return true;
        
      case 3:
        const bioText = bio.trim();
        if (!bioText) {
          Alert.alert(
            '✍️ Bio Required',
            'Tell potential matches about yourself',
            [{ text: 'Write Bio', onPress: () => bioInputRef.current?.focus() }]
          );
          return false;
        }
        if (bioText.length < 20) {
          Alert.alert(
            '✍️ Bio Too Short',
            `Please write at least 20 characters (${bioText.length}/20)`,
            [{ text: 'Continue Writing', onPress: () => bioInputRef.current?.focus() }]
          );
          return false;
        }
        return true;
        
      case 4:
        const interestCount = interests.length;
        if (interestCount === 0) {
          Alert.alert(
            '💝 Interests Required',
            'Select interests to help find compatible matches',
            [{ text: 'Select Interests' }]
          );
          return false;
        }
        if (interestCount < 3) {
          Alert.alert(
            '💝 More Interests',
            `Please select at least 3 interests (${interestCount}/3)`,
            [{ text: 'Add More' }]
          );
          return false;
        }
        return true;
        
      case 5:
        if (genderPreferences.length === 0) {
          Alert.alert(
            '👥 Preferences Required',
            'Please select who you would like to meet',
            [{ text: 'Select Preferences' }]
          );
          return false;
        }
        return true;
        
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Upload photos to storage and get public URLs
      const validPhotos = photos.filter(p => p);
      const uploadedPhotoUrls = await uploadPhotosToStorage(validPhotos);
      
      if (!user?.id) {
        throw new Error('You must be signed in to create or update a profile');
      }

      const profile = {
        userId: user.id,
        displayName: displayName.trim(),
        age: calculateAge(dateOfBirth),
        dateOfBirth: dateOfBirth.toISOString(),
        aboutMe: bio.trim(),
        interests: interests,
        intention: intention,
        location: location.trim(),
        genderPreferences: genderPreferences,
        profilePictures: uploadedPhotoUrls, // Use uploaded URLs instead of local URIs
        ageVerified: true,
        creatorStatus: false,
        isOnline: false,
        lastSeen: new Date().toISOString(),
        subscriptionTier: 'free' as const,
        privacySettings: {
          showOnlineStatus: true,
          showLastSeen: true,
          showReadReceipts: true,
          allowMessageFromMatches: true,
          allowVideoCallRequests: false,
          hideFromNearbySearch: false,
          verifiedProfilesOnly: false,
          blockScreenshots: false,
          autoDeleteMessages: false,
          requirePhotoVerification: false,
        },
      };

      let resultAction;
      
      if (isEditMode && myProfile) {
        // Update existing profile
        const updateData = {
          ...profile,
          id: myProfile.id,
        };
        resultAction = await dispatch(updateProfile(updateData) as any);
      } else {
        // Create new profile
        resultAction = await dispatch(createProfile(profile) as any);
      }
      
      const isSuccess = isEditMode 
        ? updateProfile.fulfilled.match(resultAction)
        : createProfile.fulfilled.match(resultAction);
        
      const isRejected = isEditMode
        ? updateProfile.rejected.match(resultAction)
        : createProfile.rejected.match(resultAction);
      
      if (isSuccess) {
        // Profile created/updated successfully
        const savedProfile = resultAction.payload;
        dispatch(setMyProfile(savedProfile));
        
        // Initialize matching data for new profiles
        if (!isEditMode && savedProfile.userId) {
          try {
            await supabase.from('datemi_matching_preferences').upsert({
              user_id: savedProfile.userId,
              age_range_min: 18,
              age_range_max: 35,
              max_distance_km: 50,
              gender_preference: genderPreferences,
              intention_preference: [intention],
              verified_only: false,
              creators_only: false,
            }, { onConflict: 'user_id' });

            await supabase.from('datemi_user_behavior').upsert({
              user_id: savedProfile.userId,
              avg_response_time_minutes: 30,
              active_hours: [9, 10, 11, 18, 19, 20, 21],
              weekly_activity: [3, 5, 4, 6, 7, 5, 2],
              message_length: 'medium',
              engagement_rate: 0.75,
            }, { onConflict: 'user_id' });
          } catch {
            // Ignore matching-data initialization failures; profile creation succeeded.
          }
        }
        
        // Show success and navigate based on intention
        const successTitle = isEditMode ? 'Profile Updated! ✅' : 'Profile Created! 🎉';
        const successMessage = isEditMode 
          ? 'Your profile changes have been saved successfully!'
          : 'Your Date Mi profile is ready. Start matching now!';
        const buttonText = isEditMode ? 'Continue Browsing' : 'Start Matching';
        
        Alert.alert(
          successTitle,
          successMessage,
          [
            {
              text: buttonText,
              onPress: () => {
                // Ensure the DateMi browse toggle matches what the user selected in profile creation
                dispatch(switchIntention(intention));
                // Navigate to the correct DateMi browse screen (avoid legacy Browse)
                navigation.navigate('DateMiBrowse');
              },
            },
          ],
          { cancelable: false }
        );
      } else if (isRejected) {
        // Handle error
        const errorMessage = resultAction.payload || (isEditMode ? 'Failed to update profile' : 'Failed to create profile');

        const errorTitle = isEditMode ? '❌ Profile Update Failed' : '❌ Profile Creation Failed';
        const errorText = isEditMode 
          ? 'Failed to update profile. Please check your connection and try again.'
          : 'Failed to create profile. Please check your connection and try again.';
        
        Alert.alert(
          errorTitle,
          typeof errorMessage === 'string' ? errorMessage : errorText,
          [
            { 
              text: 'Try Again', 
              onPress: () => setIsLoading(false),
              style: 'default'
            },
            {
              text: 'Go Back',
              onPress: () => navigation.goBack(),
              style: 'cancel'
            }
          ]
        );
      }
    } catch (error: any) {
      
      const action = isEditMode ? 'update your profile' : 'create your profile';
      const friendly = getUserFacingError(error, { action, displayStyle: 'alert' });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return renderBasicInfo();
      case 2:
        return renderPhotoUpload();
      case 3:
        return renderBio();
      case 4:
        return renderInterests();
      case 5:
        return renderPreferences();
      default:
        return null;
    }
  };

  const renderBasicInfo = () => {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Basic Information</Text>
        <Text style={styles.stepSubtitle}>Let's start with the basics</Text>

        <View style={styles.simpleInputCard}>
          <TextInput
            ref={nameInputRef}
            style={styles.input}
            placeholder="Display Name"
            placeholderTextColor="#9CA3AF"
            value={displayName}
            onChangeText={setDisplayName}
            returnKeyType="next"
            onSubmitEditing={() => locationInputRef.current?.focus()}
            blurOnSubmit={false}
            autoCorrect={false}
          />
        </View>

        <EnhancedDatePicker
          value={dateOfBirth}
          onChange={setDateOfBirth}
          mode="birthdate"
          label="Date of Birth"
          accentColor="#9C27B0"
          textColor="#111827"
          minimumDate={new Date(1900, 0, 1)}
          maximumDate={new Date()}
        />

        <View style={styles.simpleInputCard}>
          <TextInput
            ref={locationInputRef}
            style={styles.input}
            placeholder="Location (e.g., City, Country)"
            placeholderTextColor="#9CA3AF"
            value={location}
            onChangeText={setLocation}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            autoCorrect={false}
          />
        </View>
      </View>
    );
  };

  const renderPhotoUpload = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Add Your Photos</Text>
      <Text style={styles.stepSubtitle}>
        Upload at least 2 photos • {photos.filter(p => p).length}/6 added
      </Text>

      <View style={styles.photoGrid}>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <TouchableOpacity
            key={index}
            style={styles.photoSlot}
            onPress={() => pickImage(index)}
          >
            {photos[index] ? (
              <>
                <Image source={{ uri: photos[index] }} style={styles.photo} />
                {index === 0 && (
                  <View style={styles.mainPhotoLabel}>
                    <Text style={styles.mainPhotoText}>Main</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialIcons
                  name={index === 0 ? 'add-a-photo' : 'add-photo-alternate'}
                  size={32}
                  color="#9CA3AF"
                />
                {index === 0 && <Text style={styles.photoLabel}>Main Photo</Text>}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderBio = () => {
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>About You</Text>
        <Text style={styles.stepSubtitle}>Tell potential matches about yourself</Text>

        <View style={styles.bioCard}>
          <TextInput
            ref={bioInputRef}
            style={styles.bioInput}
            placeholder="Write something interesting about yourself..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
            value={bio}
            onChangeText={setBio}
            textAlignVertical="top"
            returnKeyType="default"
            blurOnSubmit={true}
          />
          <Text style={styles.charCount}>{bio.length}/500</Text>
        </View>

      <Text style={styles.sectionTitle}>What are you looking for?</Text>
      <View style={styles.intentionContainer}>
        {INTENTIONS.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[
              styles.intentionCard,
              intention === item.value && styles.intentionCardActive,
            ]}
            onPress={() => setIntention(item.value as any)}
          >
            <Text style={styles.intentionIcon}>{item.icon}</Text>
            <Text
              style={[
                styles.intentionLabel,
                intention === item.value && styles.intentionLabelActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      </View>
    );
  };

  const renderInterests = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Your Interests</Text>
      <Text style={styles.stepSubtitle}>
        Select at least 3 interests • {interests.length}/10 selected
      </Text>
      
      {interests.length >= 3 && (
        <View style={styles.successBadge}>
          <MaterialIcons name="check-circle" size={16} color="#10B981" />
          <Text style={styles.successBadgeText}>Great choices!</Text>
        </View>
      )}

      <View style={styles.interestsGrid}>
        {INTERESTS.map((interest) => (
          <TouchableOpacity
            key={interest}
            style={[
              styles.interestChip,
              interests.includes(interest) && styles.interestChipActive,
            ]}
            onPress={() => toggleInterest(interest)}
          >
            <Text
              style={[
                styles.interestText,
                interests.includes(interest) && styles.interestTextActive,
              ]}
            >
              {interest}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPreferences = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Your Preferences</Text>
      <Text style={styles.stepSubtitle}>Who would you like to meet?</Text>

      <View style={styles.preferenceContainer}>
        {GENDER_PREFERENCES.map((pref) => (
          <TouchableOpacity
            key={pref.value}
            style={[
              styles.preferenceCard,
              genderPreferences.includes(pref.value) && styles.preferenceCardActive,
            ]}
            onPress={() => toggleGenderPreference(pref.value)}
          >
            <MaterialIcons
              name={genderPreferences.includes(pref.value) ? 'check-box' : 'check-box-outline-blank'}
              size={24}
              color={genderPreferences.includes(pref.value) ? '#9C27B0' : '#9CA3AF'}
            />
            <Text
              style={[
                styles.preferenceLabel,
                genderPreferences.includes(pref.value) && styles.preferenceLabelActive,
              ]}
            >
              {pref.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <View style={{ width: '70%', maxWidth: 280, marginBottom: 16 }}>
            <IndeterminateProgressBar
              color="#9C27B0"
              trackColor="rgba(156,39,176,0.2)"
              height={5}
            />
          </View>
          <Text style={styles.loadingText}>{isEditMode ? 'Updating your profile...' : 'Creating your profile...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#9C27B0" />
      <View style={{ flex: 1 }}>
        {/* Enhanced Header with consistent Date Mi styling */}
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 10 }]}>
          <LinearGradient
            colors={['#9C27B0', '#7B1FA2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <TouchableOpacity
              onPress={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : navigation.goBack()}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <MaterialIcons name="favorite" size={20} color="rgba(255,255,255,0.9)" style={{ marginBottom: 4 }} />
              <Text style={styles.headerTitle}>{isEditMode ? 'Edit Your Profile' : 'Create Your Profile'}</Text>
              <View style={styles.stepIndicator}>
                <Text style={styles.headerSubtitle}>Step {currentStep} of {totalSteps}</Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => {
                if (isEditMode) {
                  navigation.goBack();
                } else {
                  Alert.alert(
                    'Skip Profile Setup?',
                    'You can always complete your profile later from settings.',
                    [
                      { text: 'Continue Setup', style: 'cancel' },
                      { 
                        text: 'Skip', 
                        onPress: () => navigation.goBack(),
                        style: 'destructive'
                      }
                    ]
                  );
                }
              }}
            >
              <Text style={styles.skipButtonText}>{isEditMode ? 'Cancel' : 'Skip'}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Enhanced Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={['#9C27B0', '#BA68C8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressFill,
                { width: `${(currentStep / totalSteps) * 100}%` },
              ]}
            />
          </View>
          <View style={styles.progressDots}>
            {[...Array(totalSteps)].map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index < currentStep && styles.progressDotActive,
                  index === currentStep - 1 && styles.progressDotCurrent,
                ]}
              />
            ))}
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          removeClippedSubviews={false}
        >
          {renderStep()}
        </ScrollView>

        {/* Enhanced Button Container with Safe Area */}
        <View style={[
          styles.buttonContainer, 
          keyboardVisible && styles.buttonContainerKeyboard,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 24 }
        ]}>
          <TouchableOpacity
            onPress={handleNext}
            style={styles.continueButton}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#9C27B0', '#7B1FA2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueButtonGradient}
            >
              <Text style={styles.continueButtonText}>
                {currentStep === totalSteps 
                  ? (isEditMode ? 'Update Profile' : 'Create Profile')
                  : 'Continue'
                }
              </Text>
              <MaterialIcons 
                name={currentStep === totalSteps ? 'check' : 'arrow-forward'} 
                size={20} 
                color="#FFFFFF" 
                style={{ marginLeft: 8 }}
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    shadowColor: '#7B1FA2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.95)',
    marginTop: 2,
    fontWeight: '500',
  },
  stepIndicator: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    backgroundColor: '#9C27B0',
  },
  progressDotCurrent: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#7B1FA2',
    borderWidth: 2,
    borderColor: '#BA68C8',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40, // Extra padding at bottom for better scrolling experience
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 22,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  successBadgeText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 6,
  },
  inputCard: {
    marginBottom: 16,
    paddingHorizontal: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  simpleInputCard: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  input: {
    fontSize: 16,
    color: '#111827',
    padding: 16,
    backgroundColor: 'transparent',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoSlot: {
    width: '31%',
    aspectRatio: 3 / 4,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  photoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  mainPhotoLabel: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#9C27B0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mainPhotoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bioCard: {
    marginBottom: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  bioInput: {
    fontSize: 16,
    color: '#111827',
    padding: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  intentionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  intentionCard: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  intentionCardActive: {
    backgroundColor: '#F3E5F5',
    borderColor: '#9C27B0',
  },
  intentionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  intentionLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  intentionLabelActive: {
    color: '#9C27B0',
    fontWeight: '600',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  interestChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  interestChipActive: {
    backgroundColor: '#F3E5F5',
    borderColor: '#9C27B0',
  },
  interestText: {
    fontSize: 14,
    color: '#6B7280',
  },
  interestTextActive: {
    color: '#9C27B0',
    fontWeight: '600',
  },
  preferenceContainer: {
    marginTop: 12,
  },
  preferenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  preferenceCardActive: {
    backgroundColor: '#F3E5F5',
    borderColor: '#9C27B0',
  },
  preferenceLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 12,
  },
  preferenceLabelActive: {
    color: '#111827',
    fontWeight: '600',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonContainerKeyboard: {
    paddingBottom: 16,
  },
  continueButton: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#9C27B0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: Platform.OS === 'android' ? 8 : 0, // Extra margin for Android
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
});

export default CreateProfile;

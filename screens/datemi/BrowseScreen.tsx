import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Dimensions, 
  Alert,
  Linking,
  RefreshControl,
  StatusBar,
  TextInput,
  Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootState } from '../../redux/store';
import { fetchProfiles, setFilters, likeProfile, skipProfile, createMatch, setProfilesFromCache } from '../../redux/slices/datemiSlice';
import { dateMiProfileCacheService } from '../../services/dateMiProfileCacheService';
import { DateMiProfile } from '../../redux/slices/datemiSlice';
import { enhancedMatchingService } from '../../services/enhancedMatchingService';
import DateMiNotificationService from '../../services/dateMiNotificationService';
import { DateMiProfileService } from '../../services/dateMiService';
import { RootStackParamList } from '../../navigation/AppNavigator';
import CategorySelector, { DATING_CATEGORIES } from '../../components/datemi/CategorySelector';
import DailyLikesIndicator from '../../components/datemi/DailyLikesIndicator';
import usePremiumAccess from '../../hooks/usePremiumAccess';
import { useProfileLoader } from '../../hooks/useProfileLoader';
import StandardScreenTitle from '../../components/common/StandardScreenTitle';
import { MaterialIcons } from '@expo/vector-icons';
import { useDateMiPresence } from '../../hooks/useDateMiPresence';
import locationService from '../../services/locationService';
import { LEGACY_PLAY_STORE_REVIEWER_USER_IDS } from '../../utils/playStoreReviewer';

type BrowseScreenRouteProp = RouteProp<RootStackParamList, 'Browse'>;

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const cardWidth = (screenWidth - 48) / 2; // 2 columns with 20px side padding and 8px gap

const shuffleProfiles = (profiles: DateMiProfile[], seed: number): DateMiProfile[] => {
  if (profiles.length <= 1) return profiles;
  const result = [...profiles];
  let seedValue = seed || 1;

  for (let i = result.length - 1; i > 0; i -= 1) {
    seedValue = (seedValue * 9301 + 49297) % 233280;
    const randomValue = seedValue / 233280;
    const swapIndex = Math.floor(randomValue * (i + 1));
    [result[i], result[swapIndex]] = [result[swapIndex], result[i]];
  }

  return result;
};

interface ProfileCardProps {
  profile: DateMiProfile;
  onProfilePress: (profile: DateMiProfile) => void;
  onLike?: (profileId: string) => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onProfilePress, onLike }) => {
  const [scale] = useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={() => onProfilePress(profile)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={{
        width: cardWidth,
        marginBottom: 6
      }}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)'
        }}
      >
        {/* Profile Image */}
        <View style={{ position: 'relative', aspectRatio: 3 / 4 }}>
          {profile.profilePictures && profile.profilePictures.length > 0 ? (
            <Image
              source={{ uri: profile.profilePictures[0] }}
              style={{
                width: '100%',
                height: '100%'
              }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(255,255,255,0.05)',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Text style={{ fontSize: 40, opacity: 0.3 }}>👤</Text>
            </View>
          )}

          {/* Option C: hide real-time presence in browse listings */}

          {/* Verification Badge */}
          {profile.verified && (
            <View style={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: '#3B82F6',
              paddingHorizontal: 6,
              paddingVertical: 3,
              borderRadius: 8
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>
                ✓
              </Text>
            </View>
          )}

          {/* Creator Badge */}
          {profile.creatorStatus && (
            <View style={{
              position: 'absolute',
              top: 30,
              right: 8,
              backgroundColor: '#F59E0B',
              paddingHorizontal: 6,
              paddingVertical: 3,
              borderRadius: 8
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>
                ⭐
              </Text>
            </View>
          )}

          {/* Like/Favorite Button Overlay */}
          {onLike && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onLike(profile.id);
              }}
              style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                width: 32,
                height: 32,
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.3)'
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 16, color: '#EF4444' }}>💕</Text>
            </TouchableOpacity>
          )}

          {/* Gradient Overlay for Name */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 12,
              paddingVertical: 12
            }}
          >
            <Text 
              style={{ 
                fontSize: 18, 
                fontWeight: 'bold', 
                color: '#FFFFFF'
              }}
              numberOfLines={1}
            >
              {profile.displayName}{profile.age ? `, ${profile.age}` : ''}
            </Text>
          </LinearGradient>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function BrowseScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route = useRoute<BrowseScreenRouteProp>();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { profiles, isLoading, filters } = useSelector((state: RootState) => state.datemi);
  const premiumAccess = usePremiumAccess();
  const authUserId = useSelector((state: RootState) => state.auth.user?.id);
  
  // Load user's profile automatically
  const { myProfile, isLoading: profileLoading, needsProfile } = useProfileLoader();

  useDateMiPresence({ userId: authUserId, enabled: true });
  
  const [selectedCategory, setSelectedCategory] = useState(route.params?.category || 'casual_dating');
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DateMiProfile[]>([]);
  const [displayProfiles, setDisplayProfiles] = useState<DateMiProfile[]>(profiles);
  const [nearbyProfiles, setNearbyProfiles] = useState<DateMiProfile[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [hasShownNearbyLocationPrompt, setHasShownNearbyLocationPrompt] = useState(false);
  const [nearbyPromptLoaded, setNearbyPromptLoaded] = useState(false);
  const hasLoadedCacheRef = useRef<boolean>(false);

  const isNearbyCategory = selectedCategory === 'nearby';
  
  // Preload cached profiles immediately on mount for instant display
  useEffect(() => {
    if (hasLoadedCacheRef.current || isNearbyCategory) return;
    hasLoadedCacheRef.current = true;
    
    const loadCachedProfiles = async () => {
      try {
        const intention = selectedCategory === 'casual_dating' 
          ? 'short_term_fun' 
          : selectedCategory === 'serious_relationships' 
            ? 'long_term_partner' 
            : undefined;
            
        const cached = await dateMiProfileCacheService.getCachedProfiles(intention);
        if (cached && cached.profiles.length > 0 && profiles.length === 0) {
          // Show cached profiles immediately
          dispatch(setProfilesFromCache(cached.profiles));
        }
      } catch {
        // Ignore cache errors, will fetch from network
      }
    };
    
    loadCachedProfiles();
  }, []);
  const handleNearbyLocationError = useCallback((error: string) => {
    setNearbyError(error);
  }, []);

  const handleEnableNearbyLocation = useCallback(async () => {
    try {
      const permission = await locationService.checkLocationPermissions();

      if (!permission.granted && permission.canAskAgain === false) {
        Alert.alert(
          'Enable location in Settings',
          'Location access was previously denied. Please enable it in Settings to see nearby connections.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                Linking.openSettings().catch(() => {
                  // ignore
                });
              }
            }
          ]
        );
        return;
      }

      if (!authUserId) return;

      const result = await locationService.getCurrentLocation({ forceRefresh: true });
      if (result.success && result.location) {
        await DateMiProfileService.saveUserLocationCoordinates(authUserId, result.location);
        setNearbyError(null);
        const refreshed = await DateMiProfileService.getProfilesNearSavedUserLocation(authUserId, {
          radiusKm: 20,
          limit: 40,
          filters: { ageRange: filters?.ageRange },
        });
        setNearbyProfiles(refreshed.map((r) => r.profile));
      } else {
        setNearbyError(result.error || 'Could not get location');
      }
    } catch {
      if (!authUserId) return;
      const result = await locationService.getCurrentLocation({ forceRefresh: true });
      if (result.success && result.location) {
        await DateMiProfileService.saveUserLocationCoordinates(authUserId, result.location);
        setNearbyError(null);
        const refreshed = await DateMiProfileService.getProfilesNearSavedUserLocation(authUserId, {
          radiusKm: 20,
          limit: 40,
          filters: { ageRange: filters?.ageRange },
        });
        setNearbyProfiles(refreshed.map((r) => r.profile));
      } else {
        setNearbyError(result.error || 'Could not get location');
      }
    }
  }, [authUserId, filters?.ageRange]);

  const baseProfiles = useMemo(() => {
    // "Nearby" uses saved coordinates; if unavailable, fall back to normal profiles so the screen isn't empty.
    if (isNearbyCategory && nearbyProfiles.length > 0) {
      return nearbyProfiles;
    }
    return profiles;
  }, [isNearbyCategory, nearbyProfiles, profiles]);

  useEffect(() => {
    const loadPromptFlag = async () => {
      try {
        const raw = await AsyncStorage.getItem('datemi_nearby_location_prompt_shown_v1');
        setHasShownNearbyLocationPrompt(raw === 'true');
      } catch {
        // ignore
      } finally {
        setNearbyPromptLoaded(true);
      }
    };
    loadPromptFlag();
  }, []);

  useEffect(() => {
    if (!nearbyPromptLoaded) return;
    if (!isNearbyCategory) return;
    if (!nearbyError || nearbyError !== 'Location not set') return;
    if (hasShownNearbyLocationPrompt) return;

    setHasShownNearbyLocationPrompt(true);
    AsyncStorage.setItem('datemi_nearby_location_prompt_shown_v1', 'true').catch(() => {
      // ignore
    });
  }, [nearbyPromptLoaded, isNearbyCategory, nearbyError, hasShownNearbyLocationPrompt]);

  useFocusEffect(
    useCallback(() => {
      if (isSearching || isNearbyCategory) return;
      setShuffleSeed(Date.now());
    }, [isSearching, isNearbyCategory, selectedCategory])
  );

  // Search functionality
  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    
    if (!text.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const searchLower = text.toLowerCase();

    const visibleProfiles = baseProfiles.filter(
      (profile) =>
        profile.userId !== authUserId &&
        !LEGACY_PLAY_STORE_REVIEWER_USER_IDS.includes(profile.userId) &&
        (profile.displayName || '').toLowerCase() !== 'play store reviewer'
    );

    // Search across multiple fields
    const results = visibleProfiles.filter(profile => {
      const matchesCategory = selectedCategory === 'casual_dating' 
        ? profile.intention === 'short_term_fun'
        : selectedCategory === 'serious_relationships'
        ? profile.intention === 'long_term_partner'
        : true;

      if (!matchesCategory) return false;

      // Search in name, location, interests, and bio
      return (
        profile.displayName?.toLowerCase().includes(searchLower) ||
        profile.location?.toLowerCase().includes(searchLower) ||
        profile.interests?.some(interest => interest.toLowerCase().includes(searchLower)) ||
        profile.aboutMe?.toLowerCase().includes(searchLower)
      );
    });
    
    setSearchResults(results);
  }, [selectedCategory, baseProfiles, authUserId]);

  useEffect(() => {
    const visibleProfiles = baseProfiles.filter(
      (profile) =>
        profile.userId !== authUserId &&
        !LEGACY_PLAY_STORE_REVIEWER_USER_IDS.includes(profile.userId) &&
        (profile.displayName || '').toLowerCase() !== 'play store reviewer'
    );

    // Filter profiles based on selected category when not searching
    if (!isSearching) {
      const filteredProfiles = visibleProfiles.filter(profile => {
        if (selectedCategory === 'casual_dating') {
          return profile.intention === 'short_term_fun';
        } else if (selectedCategory === 'serious_relationships') {
          return profile.intention === 'long_term_partner';
        }
        return true;
      });
      const shouldShuffle = !isNearbyCategory && (selectedCategory === 'casual_dating' || selectedCategory === 'serious_relationships');
      setDisplayProfiles(shouldShuffle ? shuffleProfiles(filteredProfiles, shuffleSeed) : filteredProfiles);
    } else {
      setDisplayProfiles(searchResults);
    }
  }, [selectedCategory, isSearching, searchResults, baseProfiles, authUserId, isNearbyCategory, shuffleSeed]);

  useEffect(() => {
    if (isNearbyCategory) {
      return;
    }
    // Fetch profiles with intention filter
    dispatch(fetchProfiles({ intention: selectedCategory === 'casual_dating' ? 'short_term_fun' : selectedCategory === 'serious_relationships' ? 'long_term_partner' : undefined }) as any);
  }, [selectedCategory, dispatch, isNearbyCategory]);

  useEffect(() => {
    if (!isNearbyCategory) return;
    // If user opens Nearby but hasn’t granted location, still show fallback profiles
    // so the screen never looks empty.
    if ((profiles?.length || 0) > 0) return;
    if (isLoading) return;
    dispatch(fetchProfiles({}) as any);
  }, [isNearbyCategory, profiles?.length, isLoading, dispatch]);

  useEffect(() => {
    if (!isNearbyCategory) {
      return;
    }

    const loadNearby = async () => {
      setNearbyLoading(true);
      setNearbyError(null);
      try {
        if (!authUserId) {
          setNearbyProfiles([]);
          return;
        }

        const results = await DateMiProfileService.getProfilesNearSavedUserLocation(authUserId, {
          radiusKm: 20,
          limit: 40,
          filters: {
            ageRange: filters?.ageRange,
          },
        });
        setNearbyProfiles(results.map((result) => result.profile));
      } catch (error: any) {
        const message = error?.message || 'Failed to load nearby profiles';
        setNearbyError(message);
        setNearbyProfiles([]);
      } finally {
        setNearbyLoading(false);
      }
    };

    loadNearby();
  }, [isNearbyCategory, authUserId, filters?.ageRange]);

  // Get screen title based on category
  const getScreenTitle = () => {
    if (selectedCategory === 'casual_dating') return 'Short Term Fun';
    if (selectedCategory === 'serious_relationships') return 'Long Term Partner';
    if (selectedCategory === 'nearby') return 'Nearby Connections';
    return 'Discover';
  };

  const handleCategorySelect = (categoryKey: string) => {
    setSelectedCategory(categoryKey);
    if (categoryKey !== 'nearby') {
      dispatch(setFilters({ intention: categoryKey }));
    }
  };

  const handleProfilePress = (profile: DateMiProfile) => {
    navigation.navigate('ProfileView', { profileId: profile.id });
  };

  const handleLike = async (profileId: string) => {
    if (!premiumAccess.canAccess('unlimitedLikes') && premiumAccess.getRemainingDailyLikes() <= 0) {
      Alert.alert(
        'Out of Daily Likes! 🔒',
        'You\'ve used all your daily likes. Upgrade to Pro for unlimited likes and never run out again.',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade Now', onPress: () => navigation.navigate('SubscriptionPlans') }
        ]
      );
      return;
    }
    
    const profile = displayProfiles.find(p => p.id === profileId);
    if (profile) {
      const myProfile = (window as any).__currentUserProfile || { userId: 'default-user' };
      
      const result = await enhancedMatchingService.recordLike(
        myProfile.userId,
        profileId,
        false,
        0
      );
      
      dispatch(likeProfile({ profileId }));
      
      if (result.isMatch) {
        dispatch(createMatch({ profile }));
        await DateMiNotificationService.notifyNewMatch(profile, false);
        
        Alert.alert(
          '🎉 It\'s a Match!',
          `You and ${profile.displayName} liked each other! Start a conversation now.`,
          [
            { text: 'Continue Browsing', style: 'default' },
            {
              text: 'Send Message',
              onPress: () =>
                navigation.navigate('DateMiChat', {
                  match: { id: profile.userId, name: profile.displayName },
                  recipientId: profile.userId,
                }),
            }
          ]
        );
      } else {
        Alert.alert(
          'Like Sent! 💕',
          `You liked ${profile.displayName}. If they like you back, it's a match!`,
          [
            { text: 'Continue Browsing', style: 'default' },
            { text: 'View Matches', onPress: () => navigation.navigate('Matches') }
          ]
        );
      }
    }
  };


  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Show loading state while checking for profile
  if (profileLoading) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={['#6B46C1', '#553C9A', '#4C1D95']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <MaterialIcons name="favorite" size={64} color="rgba(255,255,255,0.5)" />
          <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 16, textAlign: 'center' }}>
            Loading your profile...
          </Text>
        </View>
      </View>
    );
  }

  // Show profile creation prompt if user doesn't have a profile
  if (needsProfile) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={['#6B46C1', '#553C9A', '#4C1D95']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <MaterialIcons name="favorite" size={80} color="rgba(255,255,255,0.6)" style={{ marginBottom: 24 }} />
          
          <Text style={{ 
            fontSize: 28, 
            fontWeight: 'bold', 
            color: '#FFFFFF', 
            marginBottom: 16, 
            textAlign: 'center',
            letterSpacing: 0.5 
          }}>
            Create Your Date Mi Profile
          </Text>
          
          <Text style={{ 
            fontSize: 16, 
            color: 'rgba(255,255,255,0.85)', 
            marginBottom: 40, 
            textAlign: 'center', 
            lineHeight: 24,
            maxWidth: 320 
          }}>
            Start your dating journey by creating a profile.{'\n'}
            It only takes a few minutes!
          </Text>
          
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateProfile')}
            style={{ 
              borderRadius: 30, 
              overflow: 'hidden', 
              marginBottom: 24,
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            }}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F3F4F6']}
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'center', 
                paddingVertical: 18, 
                paddingHorizontal: 40, 
                gap: 12 
              }}
            >
              <MaterialIcons name="add-circle-outline" size={24} color="#6B46C1" />
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '700', 
                color: '#6B46C1',
                letterSpacing: 0.5 
              }}>
                Create Profile
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <Text style={{ 
            fontSize: 14, 
            color: 'rgba(255,255,255,0.6)', 
            textAlign: 'center',
            fontStyle: 'italic' 
          }}>
            Get matched • Chat • Video call • Make connections
          </Text>
        </View>
      </View>
    );
  }

  const isSavedLocationMissing = nearbyError === 'Location not set';
  const shouldShowNearbyCallout =
    isNearbyCategory && isSavedLocationMissing && nearbyPromptLoaded && !hasShownNearbyLocationPrompt;
  const shouldShowNearbyBanner = isNearbyCategory && isSavedLocationMissing;
  const isNearbyLoading = isNearbyCategory && nearbyLoading;

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#6B46C1', '#553C9A', '#4C1D95']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            paddingBottom: insets.bottom + 80
          }}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 16
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 24, marginRight: 8 }}>
                {selectedCategory === 'casual_dating' ? '🎉' : selectedCategory === 'serious_relationships' ? '💕' : '🔥'}
              </Text>
              <StandardScreenTitle color="#FFFFFF">
                {getScreenTitle()}
              </StandardScreenTitle>
            </View>
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '500' }}>
                {displayProfiles.length} profiles
              </Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)'
            }}>
              <Text style={{ fontSize: 20, marginRight: 12, opacity: 0.8 }}>🔍</Text>
              <TextInput
                value={searchText}
                onChangeText={handleSearch}
                placeholder="Search profiles by name, interests..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                style={{ 
                  flex: 1, 
                  color: '#FFFFFF',
                  fontSize: 16
                }}
              />
              {searchText.length > 0 && (
                <TouchableOpacity 
                  onPress={() => handleSearch('')}
                  style={{ padding: 4 }}
                >
                  <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Search Results Indicator */}
          {isSearching && (
            <View style={{ 
              paddingHorizontal: 20, 
              marginBottom: 12,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <Text style={{ 
                color: 'rgba(255,255,255,0.9)', 
                fontSize: 14,
                fontWeight: '500'
              }}>
                {searchResults.length === 0 
                  ? 'No profiles found matching "' + searchText + '"' 
                  : `Found ${searchResults.length} profile${searchResults.length === 1 ? '' : 's'} matching "${searchText}"`
                }
              </Text>
            </View>
          )}

          {/* Daily Likes Indicator */}
          {!isSearching && (
            <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
              <DailyLikesIndicator 
                onUpgrade={() => navigation.navigate('SubscriptionPlans')}
              />
            </View>
          )}

          {isNearbyCategory && !!nearbyError && !isSavedLocationMissing && (
            <View style={{
              marginHorizontal: 20,
              marginBottom: 12,
              padding: 14,
              borderRadius: 14,
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)'
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: 13 }}>
                {nearbyError}
              </Text>
            </View>
          )}

          {shouldShowNearbyCallout && (
            <View style={{
              marginHorizontal: 20,
              marginBottom: 12,
              padding: 16,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.22)'
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginBottom: 6 }}>
                Turn on location for true “nearby”
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 18, marginBottom: 12 }}>
                We’ll use your location to sort profiles by distance. If you skip it, we’ll still show profiles here,
                just not ranked by proximity.
              </Text>
              <TouchableOpacity
                onPress={handleEnableNearbyLocation}
                style={{
                  alignSelf: 'flex-start',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.3)'
                }}
                activeOpacity={0.85}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Enable location</Text>
              </TouchableOpacity>
            </View>
          )}

          {shouldShowNearbyBanner && !shouldShowNearbyCallout && (
            <View style={{
              marginHorizontal: 20,
              marginBottom: 12,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 14,
              backgroundColor: 'rgba(255,255,255,0.10)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.18)',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' }}>
                Location off • showing profiles (not by distance)
              </Text>
              <TouchableOpacity onPress={handleEnableNearbyLocation} activeOpacity={0.85}>
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>Enable</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Profile Grid */}
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            {isNearbyLoading ? (
              <View style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 50
              }}>
                <Text style={{ fontSize: 48, marginBottom: 10, opacity: 0.5 }}>⏳</Text>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#FFFFFF',
                  textAlign: 'center'
                }}>
                  Finding nearby connections...
                </Text>
              </View>
            ) : displayProfiles.length > 0 ? (
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                gap: 8
              }}>
                {displayProfiles.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    onProfilePress={handleProfilePress}
                    onLike={handleLike}
                  />
                ))}
              </View>
            ) : (
              <View style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 60
              }}>
                <Text style={{ fontSize: 60, marginBottom: 10, opacity: 0.5 }}>🔍</Text>
                <Text style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: '#FFFFFF',
                  textAlign: 'center',
                  marginBottom: 8
                }}>
                  No Profiles Available
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.7)',
                  textAlign: 'center',
                  lineHeight: 20,
                  paddingHorizontal: 40
                }}>
                  Try changing your category or check back later for new profiles!
                </Text>
              </View>
            )}
          </View>

          {/* Stats */}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

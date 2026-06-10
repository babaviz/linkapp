import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StatusBar, Modal, StyleSheet, Image, Dimensions, TextInput, FlatList, ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '../../redux/store';
import { fetchProfiles, switchIntention, setProfilesFromCache } from '../../redux/slices/datemiSlice';
import { dateMiProfileCacheService } from '../../services/dateMiProfileCacheService';

import { RootStackParamList } from '../../navigation/AppNavigator';
import { useProfileLoader } from '../../hooks/useProfileLoader';
// import SubscriptionStatus from '../../components/datemi/SubscriptionStatus';
import { DateMiProfile } from '../../redux/slices/datemiSlice';
import { StandardScreenTitle } from '../../components/common';
import { useScreenshotPrevention } from '../../utils/dateMiSecurity';
import { MaterialIcons } from '@expo/vector-icons';
import { useDateMiPresence } from '../../hooks/useDateMiPresence';
import { ProfileGridSkeleton } from '../../components/datemi/ProfileCardSkeleton';
import { LEGACY_PLAY_STORE_REVIEWER_USER_IDS } from '../../utils/playStoreReviewer';
import DateMiChatFab from '../../components/datemi/DateMiChatFab';
import { navigateToDateMiConversations } from '../../navigation/dateMiNavigation';

type DateMiBrowseNavigationProp = StackNavigationProp<RootStackParamList>;

type Category = 'short_term_fun' | 'long_term_partner';

const { width: screenWidth } = Dimensions.get('window');
const GRID_SIDE_PADDING = 20;
const GRID_COLUMN_GAP = 8;
const cardWidth = (screenWidth - GRID_SIDE_PADDING * 2 - GRID_COLUMN_GAP) / 2;
const DEFAULT_SHUFFLE_SEEDS: Record<Category, number> = {
  short_term_fun: 0,
  long_term_partner: 0,
};

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

// Profile Card Component
interface ProfileCardProps {
  profile: DateMiProfile;
  onPressProfileId: (profileId: string) => void;
}

const ProfileCard: React.FC<ProfileCardProps> = React.memo(({ profile, onPressProfileId }) => {
  return (
    <TouchableOpacity
      style={styles.profileCard}
      onPress={() => onPressProfileId(profile.id)}
      activeOpacity={0.9}
    >
      <View style={styles.profileImageContainer}>
        {profile.profilePictures && profile.profilePictures.length > 0 ? (
          <Image
            source={{ uri: profile.profilePictures[0] }}
            style={styles.profileImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.profileImage, styles.placeholderImage]}>
            <Text style={styles.placeholderIcon}>👤</Text>
          </View>
        )}
        
        {/* Option C: hide real-time presence in browse listings */}
        
        {/* Verified Badge */}
        {profile.verified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedIcon}>✓</Text>
          </View>
        )}
        
        {/* Creator Badge */}
        {profile.creatorStatus && (
          <View style={styles.creatorBadge}>
            <Text style={styles.creatorIcon}>⭐</Text>
          </View>
        )}
        
        {/* Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.profileOverlay}
        >
          <Text style={styles.profileName}>
            {profile.displayName}
            {profile.age && `, ${profile.age}`}
          </Text>
          {profile.location && (
            <Text style={styles.profileLocation}>
              📍 {profile.location}
            </Text>
          )}
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
});

export default function DateMiBrowseScreen() {
  const navigation = useNavigation<DateMiBrowseNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const currentIntention = useSelector((state: RootState) => state.datemi.currentIntention);
  const [activeCategory, setActiveCategory] = useState<Category>(currentIntention);
  const [showMenu, setShowMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [shuffleSeeds, setShuffleSeeds] = useState<Record<Category, number>>(DEFAULT_SHUFFLE_SEEDS);
  const insets = useSafeAreaInsets();
  
  // Load user's profile automatically
  const { myProfile, isLoading: profileLoading, needsProfile, error: profileError, refetch: refetchProfile } = useProfileLoader();
  const authUserId = useSelector((state: RootState) => state.auth.user?.id);
  
  // Get profiles from Redux state
  const { profiles: reduxProfiles, profilesLoading, profilesError } = useSelector((state: RootState) => state.datemi);
  
  // Prevent screenshots for privacy
  useScreenshotPrevention(true);
  useDateMiPresence({ userId: authUserId, enabled: true });

  // Realtime refresh controls (avoid overlapping fetches + request pile-ups)
  const activeCategoryRef = useRef<Category>(activeCategory);
  const profilesLoadingRef = useRef<boolean>(profilesLoading);
  const realtimeLastRefreshAtRef = useRef<number>(0);
  const realtimeRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCacheLoadedForRef = useRef<Category | null>(null);
  const lastFetchAtRef = useRef<number>(0);

  // Preload cached profiles for the active category for instant display
  useEffect(() => {
    if (lastCacheLoadedForRef.current === activeCategory) return;
    lastCacheLoadedForRef.current = activeCategory;
    
    const loadCachedProfiles = async () => {
      try {
        const cached = await dateMiProfileCacheService.getCachedProfiles(activeCategory);
        const hasAnyForThisIntention = (reduxProfiles || []).some((p) => p.intention === activeCategory);
        if (cached && cached.profiles.length > 0 && !hasAnyForThisIntention) {
          // Show cached profiles immediately (fast path)
          dispatch(setProfilesFromCache(cached.profiles));
        }
      } catch {
        // Ignore cache errors, will fetch from network
      }
    };
    
    loadCachedProfiles();
  }, [activeCategory, dispatch, reduxProfiles]);

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  useEffect(() => {
    profilesLoadingRef.current = profilesLoading;
  }, [profilesLoading]);

  // Use real profiles from Redux, filtering out user's own profile
  const allProfiles = useMemo(() => {
    // Filter out user's own profile from the list
    const ownProfileId = myProfile?.id;
    const ownUserId = authUserId;
    return (reduxProfiles || []).filter((profile) => {
      if (ownProfileId && profile.id === ownProfileId) {
        return false;
      }
      if (ownUserId && profile.userId === ownUserId) {
        return false;
      }
      if (
        LEGACY_PLAY_STORE_REVIEWER_USER_IDS.includes(profile.userId) ||
        (profile.displayName || '').toLowerCase() === 'play store reviewer'
      ) {
        return false;
      }
      return true;
    });
  }, [reduxProfiles, myProfile?.id, authUserId]);

  // Get filtered profiles based on active category and search
  const filteredProfiles = useMemo(() => {
    let profiles = allProfiles;
    
    // Filter by category
    profiles = profiles.filter(profile => profile.intention === activeCategory);
    
    // Apply search filter if searching
    if (isSearching && searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      profiles = profiles.filter(profile => 
        profile.displayName?.toLowerCase().includes(searchLower) ||
        profile.location?.toLowerCase().includes(searchLower) ||
        profile.interests?.some(interest => interest.toLowerCase().includes(searchLower)) ||
        profile.aboutMe?.toLowerCase().includes(searchLower)
      );
    }
    
    return profiles;
  }, [allProfiles, activeCategory, isSearching, searchTerm]);

  const displayedProfiles = useMemo(() => {
    if (isSearching) {
      return filteredProfiles;
    }
    return shuffleProfiles(filteredProfiles, shuffleSeeds[activeCategory]);
  }, [filteredProfiles, isSearching, shuffleSeeds, activeCategory]);

  // Fetch profiles on mount and when category changes
  useEffect(() => {
    dispatch(fetchProfiles({ intention: activeCategory }));
    lastFetchAtRef.current = Date.now();
  }, [activeCategory, dispatch]);

  // Refresh profiles when returning to the screen
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const minRefreshIntervalMs = 15000;
      if (!profilesLoading && now - lastFetchAtRef.current >= minRefreshIntervalMs) {
        dispatch(fetchProfiles({ intention: activeCategory }));
        lastFetchAtRef.current = now;
      }
    }, [activeCategory, dispatch, profilesLoading])
  );

  useFocusEffect(
    useCallback(() => {
      if (isSearching) return;
      setShuffleSeeds((prev) => ({
        ...prev,
        [activeCategory]: Date.now(),
      }));
    }, [activeCategory, isSearching])
  );

  useEffect(() => {
    // Keep local toggle aligned when other screens update the global intention
    setActiveCategory(currentIntention);
  }, [currentIntention]);

  const handleProfileActionPress = () => {
    if (myProfile) {
      navigation.navigate('DateMiProfileSettings');
    } else {
      navigation.navigate('CreateProfile');
    }
  };

  // Realtime sync: subscribe to profile changes and refresh list
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel('rt-date-mi-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'date_mi_profiles' }, () => {
        // Throttle realtime refreshes to avoid overlapping fetches and request pile-up
        if (profilesLoadingRef.current) return;

        const minIntervalMs = 4000;
        const now = Date.now();
        const elapsed = now - realtimeLastRefreshAtRef.current;

        const trigger = () => {
          if (profilesLoadingRef.current) return;
          realtimeLastRefreshAtRef.current = Date.now();
          dispatch(fetchProfiles({ intention: activeCategoryRef.current }));
        };

        if (elapsed >= minIntervalMs) {
          trigger();
          return;
        }

        if (!realtimeRefreshTimerRef.current) {
          realtimeRefreshTimerRef.current = setTimeout(() => {
            realtimeRefreshTimerRef.current = null;
            trigger();
          }, minIntervalMs - elapsed);
        }
      })
      .subscribe();

    return () => {
      try {
        if (realtimeRefreshTimerRef.current) {
          clearTimeout(realtimeRefreshTimerRef.current);
          realtimeRefreshTimerRef.current = null;
        }
        supabase.removeChannel(channel);
      } catch {
        // ignore cleanup errors
      }
    };
  }, [dispatch]);


  const handleMenuPress = (action: string) => {
    setShowMenu(false);
    switch (action) {
      case 'profile':
        handleProfileActionPress();
        break;
      case 'matches':
        navigation.navigate('Matches');
        break;
      case 'chats':
        navigateToDateMiConversations(navigation as any);
        break;
      case 'search':
        setIsSearching(true);
        break;
      case 'filters':
        navigation.navigate('PersonalizedMatching');
        break;
      case 'nearby':
        navigation.navigate('Browse', { category: 'nearby' });
        break;
      case 'safety':
        navigation.navigate('SafetySettings');
        break;
      case 'premium':
        navigation.navigate('SubscriptionPlans');
        break;
    }
  };

  const handleProfilePressById = useCallback(
    (profileId: string) => {
      navigation.navigate('ProfileView', { profileId });
    },
    [navigation]
  );

  // Show profile creation prompt if user doesn't have a profile
  if (needsProfile) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={['#6B46C1', '#553C9A', '#4C1D95']}
          style={StyleSheet.absoluteFillObject}
        />
        
        <View style={styles.profilePromptContainer}>
          <MaterialIcons name="favorite" size={80} color="rgba(255,255,255,0.6)" style={{ marginBottom: 24 }} />
          
          <Text style={styles.profilePromptTitle}>
            Create Your Date Mi Profile
          </Text>
          
          <Text style={styles.profilePromptSubtitle}>
            Start your dating journey by creating a profile.{'\n'}
            It only takes a few minutes!
          </Text>
          
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateProfile')}
            style={styles.createProfileButton}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F3F4F6']}
              style={styles.createProfileButtonGradient}
            >
              <MaterialIcons name="add-circle-outline" size={24} color="#6B46C1" />
              <Text style={styles.createProfileButtonText}>Create Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <Text style={styles.profilePromptFooter}>
            Get matched • Chat • Video call • Make connections
          </Text>
        </View>
      </View>
    );
  }

  const isProfilesLoading = profilesLoading && filteredProfiles.length === 0;
  const shouldShowProfilesError = !!profilesError && !profilesLoading && filteredProfiles.length === 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#6B46C1', '#553C9A', '#4C1D95']}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Status bar overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)', 'transparent']}
        style={[styles.statusBarOverlay, { height: insets.top + 20 }]}
      />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.emoji}>💕</Text>
            <StandardScreenTitle color="#FFFFFF" testID="datemi-screen-title">
              Date Mi
            </StandardScreenTitle>
            
            <View style={styles.ageIndicator}>
              <Text style={styles.ageIndicatorText}>18+ Only</Text>
            </View>
          </View>
          
          {/* Menu Button */}
          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            style={styles.menuButton}
            activeOpacity={0.8}
            accessibilityLabel="Open Date Mi menu"
          >
            <Text style={styles.menuIcon}>⋯</Text>
          </TouchableOpacity>
        </View>

        {/* Subscription status */}
        {/* TODO: Implement SubscriptionStatus component */}
        {/* {premiumAccess.currentTier && premiumAccess.currentTier !== 'free' && (
          <View style={styles.subscriptionContainer}>
            <SubscriptionStatus
              subscription={null}
              onPress={() => navigation.navigate('SubscriptionManagement')}
              compact
            />
          </View>
        )} */}

        {/* Category Toggle */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleWrapper}>
            <TouchableOpacity
              onPress={() => {
                setActiveCategory('short_term_fun');
                dispatch(switchIntention('short_term_fun'));
              }}
              style={[
                styles.toggleButton,
                activeCategory === 'short_term_fun' && styles.toggleButtonActive
              ]}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.toggleButtonText,
                activeCategory === 'short_term_fun' && styles.toggleButtonTextActive
              ]}>
                🎉 Casual
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => {
                setActiveCategory('long_term_partner');
                dispatch(switchIntention('long_term_partner'));
              }}
              style={[
                styles.toggleButton,
                activeCategory === 'long_term_partner' && styles.toggleButtonActive
              ]}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.toggleButtonText,
                activeCategory === 'long_term_partner' && styles.toggleButtonTextActive
              ]}>
                💕 Long Term
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={displayedProfiles}
        keyExtractor={(item) => item.id}
        numColumns={2}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 160 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        removeClippedSubviews
        windowSize={7}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        refreshing={profilesLoading && filteredProfiles.length > 0}
        onRefresh={() => dispatch(fetchProfiles({ intention: activeCategory }))}
        ListHeaderComponent={
          <>
            {profileLoading && (
              <View style={styles.profileErrorBanner}>
                <Text style={styles.profileErrorTitle}>Preparing your profile…</Text>
                <Text style={styles.profileErrorText}>You can start browsing while we finish loading.</Text>
              </View>
            )}

            {isSearching && (
              <View style={styles.searchContainer}>
                <View style={styles.searchRow}>
                  <View style={styles.searchInputWrapper}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                      value={searchTerm}
                      onChangeText={setSearchTerm}
                      placeholder="Search profiles..."
                      placeholderTextColor="rgba(255,255,255,0.6)"
                      style={styles.searchInput}
                      autoCorrect={false}
                      autoCapitalize="none"
                      returnKeyType="search"
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setIsSearching(false);
                      setSearchTerm('');
                    }}
                    style={styles.searchDoneButton}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.searchDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {profileError && !profileLoading && !myProfile && (
              <View style={styles.profileErrorBanner}>
                <Text style={styles.profileErrorTitle}>Profile loading issue</Text>
                <Text style={styles.profileErrorText}>{profileError}</Text>
                <TouchableOpacity
                  onPress={refetchProfile}
                  style={styles.profileErrorButton}
                  activeOpacity={0.85}
                >
                  <Text style={styles.profileErrorButtonText}>Retry profile load</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        }
        renderItem={({ item }: { item: DateMiProfile }) => (
          <ProfileCard profile={item} onPressProfileId={handleProfilePressById} />
        )}
        ListEmptyComponent={
          isProfilesLoading ? (
            <View style={styles.profilesContainer}>
              <ProfileGridSkeleton count={6} />
            </View>
          ) : shouldShowProfilesError ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>⚠️</Text>
              <Text style={styles.emptyStateTitle}>Couldn’t load profiles</Text>
              <Text style={styles.emptyStateText}>{profilesError}</Text>
              <TouchableOpacity
                onPress={() => dispatch(fetchProfiles({ intention: activeCategory }))}
                style={styles.retryButton}
                activeOpacity={0.9}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>
                {activeCategory === 'short_term_fun' ? '🎉' : '💕'}
              </Text>
              <Text style={styles.emptyStateTitle}>No profiles found</Text>
              <Text style={styles.emptyStateText}>
                Try switching categories or check back later for new profiles.
              </Text>
            </View>
          )
        }
        columnWrapperStyle={filteredProfiles.length > 0 ? styles.profileRow : undefined}
      />

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <LinearGradient
            colors={['#6B46C1', '#553C9A', '#4C1D95']}
            style={styles.menuModal}
          >
            <Text style={styles.menuTitle}>DateMi Menu</Text>

            {[
              { key: 'profile', icon: myProfile ? '👤' : '➕', label: myProfile ? 'My profile & settings' : 'Create my profile' },
              { key: 'matches', icon: '💘', label: 'My Matches' },
              { key: 'chats', icon: '💬', label: 'My Chats' },
              { key: 'search', icon: '🔍', label: 'Search profiles' },
              { key: 'filters', icon: '⚙️', label: 'Advanced filters' },
              { key: 'nearby', icon: '📍', label: 'Nearby connections' },
              { key: 'safety', icon: '🛡️', label: 'Safety settings' },
              { key: 'premium', icon: '💎', label: 'Subscription & Premium' }
            ].map((item, index, arr) => (
              <TouchableOpacity
                key={item.key}
                onPress={() => handleMenuPress(item.key)}
                style={[styles.menuItem, index < arr.length - 1 && styles.menuItemMargin]}
                activeOpacity={0.7}
              >
                <Text style={styles.menuItemIcon}>{item.icon}</Text>
                <Text style={styles.menuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </LinearGradient>
        </TouchableOpacity>
      </Modal>

      <DateMiChatFab />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  header: {
    backgroundColor: 'rgba(107, 70, 193, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 24,
    marginRight: 8,
  },
  ageIndicator: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  ageIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  menuButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  menuIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  subscriptionContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  toggleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  toggleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  toggleButtonTextActive: {
    color: '#6B46C1',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
    opacity: 0.9,
  },
  searchPlaceholder: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    flex: 1,
  },
  searchInput: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
    paddingVertical: 0,
  },
  searchDoneButton: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  searchDoneText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  profileErrorBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  profileErrorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  profileErrorText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
  },
  profileErrorButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileErrorButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  profilesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  profilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  profileRow: {
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  profileCard: {
    width: cardWidth,
    marginBottom: 6,
  },
  profileImageContainer: {
    position: 'relative',
    aspectRatio: 3/4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 40,
    opacity: 0.3,
  },
  onlineIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  creatorBadge: {
    position: 'absolute',
    top: 30,
    right: 8,
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorIcon: {
    fontSize: 12,
  },
  profileOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  profileLocation: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateIcon: {
    fontSize: 60,
    opacity: 0.3,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  menuModal: {
    borderRadius: 24,
    width: '100%',
    maxWidth: 380,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  menuTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 28,
  },
  menuItem: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  menuItemMargin: {
    marginBottom: 16,
  },
  menuItemIcon: {
    fontSize: 22,
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 16,
    textAlign: 'center',
  },
  profilePromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  profilePromptTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  profilePromptSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  createProfileButton: {
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  createProfileButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 40,
    gap: 12,
  },
  createProfileButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B46C1',
    letterSpacing: 0.5,
  },
  profilePromptFooter: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

// DateMiBrowseScreen.tsx - Updated with Notch-like Tab Design
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StatusBar, 
  Modal, 
  StyleSheet, 
  Image, 
  Dimensions, 
  TextInput, 
  FlatList, 
  ListRenderItem,
  Alert,
  ScrollView,
  Animated
} from 'react-native';
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
import { DateMiProfile } from '../../redux/slices/datemiSlice';
import { StandardScreenTitle } from '../../components/common';
import { useScreenshotPrevention } from '../../utils/dateMiSecurity';
import { Ionicons, MaterialIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { useDateMiPresence } from '../../hooks/useDateMiPresence';
import { ProfileGridSkeleton } from '../../components/datemi/ProfileCardSkeleton';
import { LEGACY_PLAY_STORE_REVIEWER_USER_IDS } from '../../utils/playStoreReviewer';
import DateMiChatFab from '../../components/datemi/DateMiChatFab';
import { navigateToDateMiConversations } from '../../navigation/dateMiNavigation';
import { VideoFeed } from '../../components/datemi/VideoFeed';
import { VideoUploadModal } from '../../components/datemi/VideoUploadModal';
import { ShortTermDatingTab } from '../../components/datemi/ShortTermDatingTab';

type DateMiBrowseNavigationProp = StackNavigationProp<RootStackParamList>;

type TabType = 'short_term' | 'short_videos';

const { width: screenWidth } = Dimensions.get('window');
const GRID_SIDE_PADDING = 20;
const GRID_COLUMN_GAP = 8;
const cardWidth = (screenWidth - GRID_SIDE_PADDING * 2 - GRID_COLUMN_GAP) / 2;
const DEFAULT_SHUFFLE_SEEDS: Record<string, number> = {
  short_term: 0,
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

// Profile Card Component for Short Term Dating
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
        
        {profile.verified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedIcon}>✓</Text>
          </View>
        )}
        
        {profile.creatorStatus && (
          <View style={styles.creatorBadge}>
            <Text style={styles.creatorIcon}>⭐</Text>
          </View>
        )}
        
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

// Fancy Tab Component with Notch-like Design
const FancyTab: React.FC<{
  activeTab: TabType;
  onTabPress: (tab: TabType) => void;
}> = ({ activeTab, onTabPress }) => {
  const slideAnim = useRef(new Animated.Value(activeTab === 'short_term' ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeTab === 'short_term' ? 0 : 1,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [activeTab]);

  const indicatorPosition = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, screenWidth / 2],
  });

  return (
    <View style={styles.tabOuterContainer}>
      <View style={styles.tabGlowContainer}>
        <LinearGradient
          colors={['rgba(107, 70, 193, 0.3)', 'rgba(107, 70, 193, 0)']}
          style={styles.tabGlow}
        />
      </View>
      
      <View style={styles.tabWrapper}>
        {/* Animated Sliding Background */}
        <Animated.View 
          style={[
            styles.tabActiveBackground,
            { transform: [{ translateX: indicatorPosition }] }
          ]}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.tabActiveBackgroundGradient}
          />
        </Animated.View>

        {/* Short Term Tab */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => onTabPress('short_term')}
          activeOpacity={0.9}
        >
          <View style={styles.tabContent}>
            <Text style={styles.tabEmoji}>🔥</Text>
            <Text style={[
              styles.tabButtonText,
              activeTab === 'short_term' && styles.tabButtonTextActive
            ]}>
              Short Term
            </Text>
          </View>
          {activeTab === 'short_term' && (
            <View style={styles.tabNotch}>
              <View style={styles.tabNotchInner} />
            </View>
          )}
        </TouchableOpacity>

        {/* Short Videos Tab */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => onTabPress('short_videos')}
          activeOpacity={0.9}
        >
          <View style={styles.tabContent}>
            <Text style={styles.tabEmoji}>🎬</Text>
            <Text style={[
              styles.tabButtonText,
              activeTab === 'short_videos' && styles.tabButtonTextActive
            ]}>
              Short Videos
            </Text>
          </View>
          {activeTab === 'short_videos' && (
            <View style={styles.tabNotch}>
              <View style={styles.tabNotchInner} />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function DateMiBrowseScreen() {
  const navigation = useNavigation<DateMiBrowseNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const currentIntention = useSelector((state: RootState) => state.datemi.currentIntention);
  const [activeTab, setActiveTab] = useState<TabType>('short_term');
  const [showMenu, setShowMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [shuffleSeeds, setShuffleSeeds] = useState<Record<string, number>>(DEFAULT_SHUFFLE_SEEDS);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const insets = useSafeAreaInsets();
  
  const { myProfile, isLoading: profileLoading, needsProfile, error: profileError, refetch: refetchProfile } = useProfileLoader();
  const authUserId = useSelector((state: RootState) => state.auth.user?.id);
  const { profiles: reduxProfiles, profilesLoading, profilesError } = useSelector((state: RootState) => state.datemi);
  
  useScreenshotPrevention(true);
  useDateMiPresence({ userId: authUserId, enabled: true });

  const activeTabRef = useRef<TabType>(activeTab);
  const profilesLoadingRef = useRef<boolean>(profilesLoading);
  const lastCacheLoadedForRef = useRef<string | null>(null);
  const lastFetchAtRef = useRef<number>(0);

  // Preload cached profiles for short term dating
  useEffect(() => {
    if (activeTab !== 'short_term') return;
    if (lastCacheLoadedForRef.current === activeTab) return;
    lastCacheLoadedForRef.current = activeTab;
    
    const loadCachedProfiles = async () => {
      try {
        const cached = await dateMiProfileCacheService.getCachedProfiles('short_term_fun');
        const hasAnyForThisIntention = (reduxProfiles || []).some((p) => p.intention === 'short_term_fun');
        if (cached && cached.profiles.length > 0 && !hasAnyForThisIntention) {
          dispatch(setProfilesFromCache(cached.profiles));
        }
      } catch {
        // Ignore cache errors
      }
    };
    
    loadCachedProfiles();
  }, [activeTab, dispatch, reduxProfiles]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    profilesLoadingRef.current = profilesLoading;
  }, [profilesLoading]);

  // Filter profiles for short term dating
  const allProfiles = useMemo(() => {
    const ownProfileId = myProfile?.id;
    const ownUserId = authUserId;
    return (reduxProfiles || []).filter((profile) => {
      if (ownProfileId && profile.id === ownProfileId) return false;
      if (ownUserId && profile.userId === ownUserId) return false;
      if (
        LEGACY_PLAY_STORE_REVIEWER_USER_IDS.includes(profile.userId) ||
        (profile.displayName || '').toLowerCase() === 'play store reviewer'
      ) return false;
      return true;
    });
  }, [reduxProfiles, myProfile?.id, authUserId]);

  const filteredProfiles = useMemo(() => {
    if (activeTab !== 'short_term') return [];
    
    let profiles = allProfiles.filter(profile => profile.intention === 'short_term_fun');
    
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
  }, [allProfiles, activeTab, isSearching, searchTerm]);

  const displayedProfiles = useMemo(() => {
    if (activeTab !== 'short_term') return [];
    if (isSearching) return filteredProfiles;
    return shuffleProfiles(filteredProfiles, shuffleSeeds['short_term']);
  }, [filteredProfiles, isSearching, shuffleSeeds, activeTab]);

  // Fetch profiles when on short term tab
  useEffect(() => {
    if (activeTab === 'short_term') {
      dispatch(fetchProfiles({ intention: 'short_term_fun' }));
      lastFetchAtRef.current = Date.now();
    }
  }, [activeTab, dispatch]);

  useFocusEffect(
    useCallback(() => {
      if (activeTab !== 'short_term') return;
      const now = Date.now();
      const minRefreshIntervalMs = 15000;
      if (!profilesLoading && now - lastFetchAtRef.current >= minRefreshIntervalMs) {
        dispatch(fetchProfiles({ intention: 'short_term_fun' }));
        lastFetchAtRef.current = now;
      }
    }, [activeTab, dispatch, profilesLoading])
  );

  useFocusEffect(
    useCallback(() => {
      if (activeTab !== 'short_term' || isSearching) return;
      setShuffleSeeds((prev) => ({
        ...prev,
        short_term: Date.now(),
      }));
    }, [activeTab, isSearching])
  );

  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'short_term') {
      dispatch(switchIntention('short_term_fun'));
    }
    setIsSearching(false);
    setSearchTerm('');
  };

  const handleProfileActionPress = () => {
    setShowMenu(false);
    if (myProfile) {
      navigation.navigate('DateMiProfileSettings');
    } else {
      navigation.navigate('CreateProfile');
    }
  };

  const handleMenuPress = (action: string) => {
    setShowMenu(false);
    switch (action) {
      case 'profile':
        handleProfileActionPress();
        break;
      case 'upload':
        setShowUploadModal(true);
        break;
      case 'matches':
        navigation.navigate('Matches');
        break;
      case 'chats':
        navigateToDateMiConversations(navigation as any);
        break;
      case 'search':
        if (activeTab === 'short_term') setIsSearching(true);
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

  const handleProfilePressById = useCallback((profileId: string) => {
    navigation.navigate('ProfileView', { profileId });
  }, [navigation]);

  // Show profile creation prompt if needed
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
          <Text style={styles.profilePromptTitle}>Create Your Date Mi Profile</Text>
          <Text style={styles.profilePromptSubtitle}>
            Start your dating journey by creating a profile.{'\n'}It only takes a few minutes!
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreateProfile')} style={styles.createProfileButton} activeOpacity={0.9}>
            <LinearGradient colors={['#FFFFFF', '#F3F4F6']} style={styles.createProfileButtonGradient}>
              <MaterialIcons name="add-circle-outline" size={24} color="#6B46C1" />
              <Text style={styles.createProfileButtonText}>Create Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.profilePromptFooter}>Get matched • Chat • Video call • Make connections</Text>
        </View>
      </View>
    );
  }

  const isProfilesLoading = profilesLoading && filteredProfiles.length === 0;
  const shouldShowProfilesError = !!profilesError && !profilesLoading && filteredProfiles.length === 0;

  // Professional Menu Modal Component
  const renderProfessionalMenuModal = () => (
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
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderIcon}>
              <LinearGradient
                colors={['#6B46C1', '#553C9A']}
                style={styles.modalHeaderGradient}
              >
                <FontAwesome5 name="heart" size={22} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.modalTitle}>Date Mi</Text>
            <Text style={styles.modalSubtitle}>Discover meaningful connections</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setShowMenu(false)}
            >
              <Feather name="x" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            <TouchableOpacity
              style={styles.menuSection}
              onPress={() => handleMenuPress('profile')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, styles.profileIconBg]}>
                {myProfile ? (
                  <FontAwesome5 name="user-circle" size={22} color="#6B46C1" />
                ) : (
                  <MaterialIcons name="person-add" size={22} color="#6B46C1" />
                )}
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>
                  {myProfile ? 'My Profile' : 'Create Profile'}
                </Text>
                <Text style={styles.menuDescription}>
                  {myProfile ? 'View and edit your dating profile' : 'Get started with Date Mi'}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            {activeTab === 'short_videos' && (
              <TouchableOpacity
                style={styles.menuSection}
                onPress={() => handleMenuPress('upload')}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconContainer, styles.uploadIconBg]}>
                  <Feather name="video" size={22} color="#EF4444" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Upload Video</Text>
                  <Text style={styles.menuDescription}>Share a short video with the community</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#D1D5DB" />
              </TouchableOpacity>
            )}

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuSection}
              onPress={() => handleMenuPress('matches')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, styles.matchesIconBg]}>
                <FontAwesome5 name="heart" size={20} color="#EC4899" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>My Matches</Text>
                <Text style={styles.menuDescription}>View all your mutual matches</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuSection}
              onPress={() => handleMenuPress('chats')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, styles.chatsIconBg]}>
                <Feather name="message-circle" size={20} color="#3B82F6" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Messages</Text>
                <Text style={styles.menuDescription}>Chat with your connections</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuSection}
              onPress={() => handleMenuPress('search')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, styles.searchIconBg]}>
                <Feather name="search" size={20} color="#8B5CF6" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Search</Text>
                <Text style={styles.menuDescription}>Find specific profiles</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuSection}
              onPress={() => handleMenuPress('filters')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, styles.filtersIconBg]}>
                <Feather name="sliders" size={20} color="#10B981" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Advanced Filters</Text>
                <Text style={styles.menuDescription}>Customize your matching preferences</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuSection}
              onPress={() => handleMenuPress('nearby')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, styles.nearbyIconBg]}>
                <Feather name="map-pin" size={20} color="#F59E0B" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Nearby</Text>
                <Text style={styles.menuDescription}>Discover people around you</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuSection}
              onPress={() => handleMenuPress('safety')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, styles.safetyIconBg]}>
                <Feather name="shield" size={20} color="#6366F1" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Privacy & Safety</Text>
                <Text style={styles.menuDescription}>Manage your security settings</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuSection, styles.premiumSection]}
              onPress={() => handleMenuPress('premium')}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, styles.premiumIconBg]}>
                <FontAwesome5 name="crown" size={20} color="#F59E0B" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, styles.premiumText]}>Go Premium</Text>
                <Text style={styles.menuDescription}>Unlock unlimited features</Text>
              </View>
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>PRO</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Text style={styles.modalFooterText}>Date Mi • Version 1.0.0</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#6B46C1', '#553C9A', '#4C1D95']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)', 'transparent']}
        style={[styles.statusBarOverlay, { height: insets.top + 20 }]}
      />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.emoji}>{activeTab === 'short_term' ? '💕' : '🎬'}</Text>
            <StandardScreenTitle color="#FFFFFF" testID="datemi-screen-title">
              Date Mi
            </StandardScreenTitle>
            
            <View style={styles.ageIndicator}>
              <Text style={styles.ageIndicatorText}>18+ Only</Text>
            </View>
          </View>
          
          <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuButton} activeOpacity={0.8}>
            <Feather name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Fancy Notch-like Tabs */}
        <FancyTab activeTab={activeTab} onTabPress={handleTabPress} />
      </View>

      {/* Content based on active tab */}
      {activeTab === 'short_term' ? (
        <ShortTermDatingTab
          profiles={displayedProfiles}
          isLoading={isProfilesLoading}
          error={shouldShowProfilesError ? profilesError : null}
          isSearching={isSearching}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSearchDone={() => setIsSearching(false)}
          onProfilePress={handleProfilePressById}
          onRefresh={() => dispatch(fetchProfiles({ intention: 'short_term_fun' }))}
          profileLoading={profileLoading}
          profileError={profileError}
          onRetryProfile={refetchProfile}
        />
      ) : (
        <VideoFeed
          userId={authUserId}
          onProfilePress={handleProfilePressById}
          onUploadPress={() => setShowUploadModal(true)}
        />
      )}

      {/* Professional Menu Modal */}
      {renderProfessionalMenuModal()}

      {/* Chat FAB - Only show on short term tab */}
      {activeTab === 'short_term' && <DateMiChatFab />}

      {/* Upload Modal */}
      <VideoUploadModal
        visible={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        userId={authUserId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  header: {
    backgroundColor: 'rgba(107, 70, 193, 0.95)',
    borderBottomWidth: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 5,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: { fontSize: 24, marginRight: 8 },
  ageIndicator: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  ageIndicatorText: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  
  // Fancy Tab Styles
  tabOuterContainer: {
    position: 'relative',
    marginTop: 0,
  },
  tabGlowContainer: {
    position: 'absolute',
    top: -20,
    left: 0,
    right: 0,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabGlow: {
    width: screenWidth * 0.7,
    height: 30,
    borderRadius: 15,
    opacity: 0.5,
  },
  tabWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 20,
    marginBottom: 0,
    borderRadius: 30,
    padding: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  tabActiveBackground: {
    position: 'absolute',
    width: '50%',
    height: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    top: 0,
    left: 0,
  },
  tabActiveBackgroundGradient: {
    flex: 1,
    borderRadius: 28,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    position: 'relative',
    zIndex: 1,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabEmoji: {
    fontSize: 18,
  },
  tabButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  tabButtonTextActive: {
    color: '#6B46C1',
  },
  tabNotch: {
    position: 'absolute',
    bottom: -8,
    width: 40,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabNotchInner: {
    width: 24,
    height: 8,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  
  profileCard: { width: cardWidth, marginBottom: 6 },
  profileImageContainer: { position: 'relative', aspectRatio: 3/4, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  profileImage: { width: '100%', height: '100%' },
  placeholderImage: { backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  placeholderIcon: { fontSize: 40, opacity: 0.3 },
  verifiedBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#3B82F6', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  verifiedIcon: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  creatorBadge: { position: 'absolute', top: 30, right: 8, backgroundColor: '#F59E0B', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  creatorIcon: { fontSize: 12 },
  profileOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 12, paddingVertical: 12 },
  profileName: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 2 },
  profileLocation: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  
  // Professional Modal Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    minWidth: '100%',
    minHeight: '95%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
    overflow: 'hidden',
  },
  modalHeader: {
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    position: 'relative',
  },
  modalHeaderIcon: {
    marginBottom: 12,
  },
  modalHeaderGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6B46C1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollView: {
    flex: 1,
    minHeight: 500,
  },
  modalScrollContent: {
    paddingVertical: 8,
  },
  menuSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIconBg: {
    backgroundColor: '#F3E8FF',
  },
  uploadIconBg: {
    backgroundColor: '#FEE2E2',
  },
  matchesIconBg: {
    backgroundColor: '#FCE7F3',
  },
  chatsIconBg: {
    backgroundColor: '#DBEAFE',
  },
  searchIconBg: {
    backgroundColor: '#EDE9FE',
  },
  filtersIconBg: {
    backgroundColor: '#D1FAE5',
  },
  nearbyIconBg: {
    backgroundColor: '#FEF3C7',
  },
  safetyIconBg: {
    backgroundColor: '#E0E7FF',
  },
  premiumIconBg: {
    backgroundColor: '#FEF3C7',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  premiumText: {
    color: '#F59E0B',
  },
  premiumSection: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  premiumBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  premiumBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 20,
    marginVertical: 4,
  },
  modalFooter: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalFooterText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  profilePromptContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  profilePromptTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 16, textAlign: 'center', letterSpacing: 0.5 },
  profilePromptSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 40, textAlign: 'center', lineHeight: 24, maxWidth: 320 },
  createProfileButton: { borderRadius: 30, overflow: 'hidden', marginBottom: 24, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  createProfileButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 40, gap: 12 },
  createProfileButtonText: { fontSize: 18, fontWeight: '700', color: '#6B46C1', letterSpacing: 0.5 },
  profilePromptFooter: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontStyle: 'italic' },
});
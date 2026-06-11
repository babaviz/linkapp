// DateMiBrowseScreen.tsx - Updated with Video Feed and Dating Tabs
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
  Alert
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
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
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
              {activeTab === 'short_term' ? 'Short Term Dating' : 'Short Videos'}
            </StandardScreenTitle>
            
            <View style={styles.ageIndicator}>
              <Text style={styles.ageIndicatorText}>18+ Only</Text>
            </View>
          </View>
          
          <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuButton} activeOpacity={0.8}>
            <Text style={styles.menuIcon}>⋯</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Toggle */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleWrapper}>
            <TouchableOpacity
              style={[styles.toggleButton, activeTab === 'short_term' && styles.toggleButtonActive]}
              onPress={() => handleTabPress('short_term')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleButtonText, activeTab === 'short_term' && styles.toggleButtonTextActive]}>
                🔥 Short Term Dating
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, activeTab === 'short_videos' && styles.toggleButtonActive]}
              onPress={() => handleTabPress('short_videos')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleButtonText, activeTab === 'short_videos' && styles.toggleButtonTextActive]}>
                🎬 Short Videos
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Upload Button - only show on videos tab */}
        {activeTab === 'short_videos' && (
          <View style={styles.uploadHeader}>
            <TouchableOpacity
              onPress={() => setShowUploadModal(true)}
              style={styles.uploadButton}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={28} color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>Upload Video</Text>
            </TouchableOpacity>
          </View>
        )}
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

      {/* Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <LinearGradient colors={['#6B46C1', '#553C9A', '#4C1D95']} style={styles.menuModal}>
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

       {activeTab === 'short_term'?
        <DateMiChatFab />
        :null}

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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  menuIcon: { fontSize: 20, color: '#FFFFFF' },
  toggleContainer: { paddingHorizontal: 20, paddingBottom: 16 },
  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggleButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  toggleButtonActive: { backgroundColor: '#FFFFFF' },
  toggleButtonText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  toggleButtonTextActive: { color: '#6B46C1' },
  uploadHeader: { paddingHorizontal: 20, paddingBottom: 12, alignItems: 'flex-end' },
  uploadButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6 },
  uploadButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  menuModal: { borderRadius: 24, width: '100%', maxWidth: 380, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  menuTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: 28 },
  menuItem: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  menuItemMargin: { marginBottom: 16 },
  menuItemIcon: { fontSize: 22, marginRight: 16 },
  menuItemText: { fontSize: 16, color: '#FFFFFF', fontWeight: '500', flex: 1 },
  profilePromptContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  profilePromptTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 16, textAlign: 'center', letterSpacing: 0.5 },
  profilePromptSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 40, textAlign: 'center', lineHeight: 24, maxWidth: 320 },
  createProfileButton: { borderRadius: 30, overflow: 'hidden', marginBottom: 24, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  createProfileButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 40, gap: 12 },
  createProfileButtonText: { fontSize: 18, fontWeight: '700', color: '#6B46C1', letterSpacing: 0.5 },
  profilePromptFooter: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontStyle: 'italic' },
});
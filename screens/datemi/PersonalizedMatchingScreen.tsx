/**
 * Personalized Matching Screen with Advanced AI Algorithms
 * Features intelligent recommendations and learning-based matching
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { SmartFilters } from '../../components/datemi/SmartFilters';
import { matchingService, MatchScore, MatchingPreferences } from '../../services/matchingService';
import { enhancedMatchingService } from '../../services/enhancedMatchingService';
import { analyticsService } from '../../services/analyticsService';
import { RootState } from '../../redux/store';
import { DateMiProfile, likeProfile, skipProfile, createMatch } from '../../redux/slices/datemiSlice';
import { material3Animations } from '../../utils/material3Animations';
import { getUserFacingError } from '../../utils/userFacingError';
// import { demoMatchingProfiles, mockCurrentUserProfile } from '../../data/demoMatchingProfiles';
import { fetchProfiles } from '../../redux/slices/datemiSlice';
import usePremiumAccess from '../../hooks/usePremiumAccess';
import { UpgradePrompt } from '../../components/datemi/UpgradePrompt';
import { useScreenshotPrevention } from '../../utils/dateMiSecurity';
import DateMiNotificationService from '../../services/dateMiNotificationService';

interface PersonalizedMatchingScreenProps {
  navigation: any;
}

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = (screenWidth - 60) / 2; // 2 columns with padding

const PersonalizedMatchingScreen: React.FC<PersonalizedMatchingScreenProps> = ({
  navigation,
}) => {
  const dispatch = useDispatch();
  const premiumAccess = usePremiumAccess();
  const { matches: reduxMatches } = useSelector((state: RootState) => state.datemi);
  
  // Prevent screenshots for privacy
  useScreenshotPrevention(true);
  
  // Use Redux data for real-time consistency
  const profiles = useSelector((state: RootState) => state.datemi.profiles);
  const myProfile = useSelector((state: RootState) => state.datemi.myProfile);
  
  const [matches, setMatches] = useState<MatchScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [preferences, setPreferences] = useState<MatchingPreferences>(
    matchingService.getDefaultPreferences()
  );

  const currentMatchIndex = useRef(0);

  useEffect(() => {
    // Ensure profiles are loaded
    dispatch(fetchProfiles({ intention: myProfile?.intention }) as any);
    initializeMatching();
    trackScreenView();
  }, [dispatch, myProfile?.intention]);

  useEffect(() => {
    generateMatches();
  }, [preferences, profiles]);

  const initializeMatching = async () => {
    setIsLoading(true);
    
    try {
      // Initialize user behavior data (normally from analytics)
      if (myProfile) {
        matchingService.updateBehaviorData(myProfile.id, {
          avgResponseTime: 30, // 30 minutes average
          activeHours: [9, 10, 11, 18, 19, 20, 21], // Most active hours
          weeklyActivity: [3, 5, 4, 6, 7, 5, 2], // Activity by day
          messageLength: 'medium',
          engagementRate: 0.75,
          lastActiveHours: 2,
        });
      }
      
      await generateMatches();
    } catch (error) {
      
    } finally {
      setIsLoading(false);
    }
  };

  const generateMatches = async () => {
    if (!myProfile || !myProfile.userId) return;

    try {
      setIsLoading(true);
      
      // Use enhanced service with database optimization
      const newMatches = await enhancedMatchingService.getOptimizedRecommendations(
        myProfile.userId,
        preferences,
        30 // Get more matches for grid display
      );
      
      setMatches(newMatches);
      
      // Track matching generation
      analyticsService.trackEvent('matches_generated', {
        userId: myProfile.id,
        mode: 'enhanced',
        matchCount: newMatches.length,
        avgScore: newMatches.reduce((sum, m) => sum + m.score, 0) / newMatches.length || 0,
      });
      
    } catch (error) {
      if (__DEV__) {
        console.error('Error generating matches:', error);
      }
      const friendly = getUserFacingError(error, {
        action: 'generate matches',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setIsLoading(false);
    }
  };


  const trackScreenView = () => {
    analyticsService.trackEvent('screen_view', {
      screen_name: 'personalized_matching',
      user_id: myProfile?.id,
    });
  };

  const handleLike = async (profileId: string) => {
    if (!myProfile?.userId) return;
    
    const matchScore = matches.find(m => m.profileId === profileId)?.score || 0;
    
    // Record like in database and check for match
    const result = await enhancedMatchingService.recordLike(
      myProfile.userId,
      profileId,
      false,
      matchScore
    );
    
    // Dispatch Redux action
    dispatch(likeProfile({ profileId }));
    
    // Check if this creates a match
    if (result.isMatch) {
      const profile = profiles.find(p => p.id === profileId);
      if (profile) {
        // Add to matches
        dispatch(createMatch({ profile }));
        
        // Send match notification
        await DateMiNotificationService.notifyNewMatch(profile, false);
        
        // Show match celebration
        showMatchCelebration(profile);
      }
    }
    
    // Remove from current matches and show next
    const updatedMatches = matches.filter(m => m.profileId !== profileId);
    setMatches(updatedMatches);
    
    // Track interaction
    analyticsService.trackEvent('match_action', {
      action: 'like',
      profileId,
      userId: myProfile.id,
      matchScore,
      isMatch: result.isMatch,
    });
  };

  const handlePass = async (profileId: string) => {
    if (!myProfile?.userId) return;
    
    // Record pass in database
    await enhancedMatchingService.recordPass(myProfile.userId, profileId);
    
    // Dispatch Redux action
    dispatch(skipProfile({ profileId }));
    
    // Remove from current matches
    const updatedMatches = matches.filter(m => m.profileId !== profileId);
    setMatches(updatedMatches);
    
    // Track interaction
    analyticsService.trackEvent('match_action', {
      action: 'pass',
      profileId,
      userId: myProfile.id,
      matchScore: matches.find(m => m.profileId === profileId)?.score,
    });
  };

  const handleSuperLike = async (profileId: string) => {
    if (!myProfile?.userId) return;
    
    const matchScore = matches.find(m => m.profileId === profileId)?.score || 0;
    
    // Record super like in database
    const result = await enhancedMatchingService.recordLike(
      myProfile.userId,
      profileId,
      true,
      matchScore
    );
    
    // Dispatch Redux action with super flag
    dispatch(likeProfile({ profileId, isSuper: true }));
    
    // Check if this creates a match
    if (result.isMatch) {
      const profile = profiles.find(p => p.id === profileId);
      if (profile) {
        // Add to matches
        dispatch(createMatch({ profile }));
        
        // Send super match notification
        await DateMiNotificationService.notifyNewMatch(profile, true);
        
        // Show special celebration
        showMatchCelebration(profile);
      }
    } else {
      // Still notify them of super like
      const profile = profiles.find(p => p.id === profileId);
      if (profile) {
        await DateMiNotificationService.notifySuperLike(profile);
      }
    }
    
    // Remove from current matches
    const updatedMatches = matches.filter(m => m.profileId !== profileId);
    setMatches(updatedMatches);
    
    // Track interaction
    analyticsService.trackEvent('match_action', {
      action: 'super_like',
      profileId,
      userId: myProfile.id,
      matchScore,
      isMatch: result.isMatch,
    });
    
    Alert.alert(
      'Super Like Sent! 🌟',
      'They\'ll be notified that you super liked them and your profile will be highlighted.',
      [{ text: 'Great!', style: 'default' }]
    );
  };

  const handleViewDetails = (profileId: string) => {
    navigation.navigate('ProfileDetails', { profileId });
  };

  const showMatchCelebration = (profile: DateMiProfile) => {
    const handleSendMessage = () => {
      // Check if user has premium access for unlimited messaging
      if (!premiumAccess.canAccess('unlimitedMessaging')) {
        setShowUpgradePrompt(true);
        return;
      }
      navigation.navigate('DateMiChat', { 
        match: {
          id: profile.userId,
          name: profile.displayName,
          age: profile.age,
          location: profile.location,
          profileImage: profile.profilePictures?.[0],
        },
        recipientId: profile.userId,
      });
    };

    Alert.alert(
      '🎉 It\'s a Match!',
      `You and ${profile.displayName} liked each other! Start a conversation now.`,
      [
        { text: 'Keep Browsing', style: 'cancel' },
        { 
          text: 'Send Message', 
          style: 'default',
          onPress: handleSendMessage
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await generateMatches();
    setRefreshing(false);
  };

  // Profile Card Component
  const ProfileCard: React.FC<{ matchScore: MatchScore }> = ({ matchScore }) => {
    const profile = profiles.find(p => p.id === matchScore.profileId);
    if (!profile) return null;

    return (
      <TouchableOpacity
        style={styles.profileCard}
        onPress={() => handleViewDetails(profile.id)}
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
          
          {/* Match Score Badge */}
          <View style={[
            styles.matchBadge,
            { backgroundColor: matchScore.score >= 80 ? '#10B981' : matchScore.score >= 60 ? '#F59E0B' : '#6B46C1' }
          ]}>
            <Text style={styles.matchBadgeText}>{matchScore.score}%</Text>
          </View>
          
          {/* Option C: hide real-time presence in recommendations */}
          
          {/* Verified Badge */}
          {profile.verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedIcon}>✓</Text>
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
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Smart Matching</Text>
          <Text style={styles.subtitle}>
            AI-powered recommendations just for you
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate(myProfile ? 'DateMiProfileSettings' : 'CreateProfile')}
            style={styles.filtersButton}
            activeOpacity={0.8}
            accessibilityLabel={myProfile ? 'Open Date Mi profile settings' : 'Create your Date Mi profile'}
          >
            <MaterialIcons name={myProfile ? 'person' : 'person-add'} size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={styles.filtersButton}
            activeOpacity={0.8}
            accessibilityLabel="Open matching filters"
          >
            <MaterialIcons name="tune" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="favorite" size={64} color="rgba(255,255,255,0.5)" />
      <Text style={styles.emptyTitle}>No matches yet</Text>
      <Text style={styles.emptySubtitle}>
        Try adjusting your filters or check back later for new profiles
      </Text>
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={generateMatches}
      >
        <Text style={styles.refreshButtonText}>Refresh Matches</Text>
      </TouchableOpacity>
    </View>
  );

  if (!myProfile) {
    
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient
          colors={['#6B46C1', '#553C9A', '#4C1D95']}
          style={StyleSheet.absoluteFillObject}
        />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.errorState}>
            <MaterialIcons name="error" size={64} color="#FFFFFF" />
            <Text style={styles.errorTitle}>Profile Required</Text>
            <Text style={styles.errorSubtitle}>
              Please complete your Date Mi profile to start matching
            </Text>
            <TouchableOpacity
              style={styles.createProfileButton}
              onPress={() => navigation.navigate('CreateProfile')}
            >
              <Text style={styles.createProfileText}>Create Profile</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#6B46C1', '#553C9A', '#4C1D95']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFFFFF"
            />
          }
        >
          {renderHeader()}
          
          {/* Profiles Grid */}
          <View style={styles.profilesContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Finding your perfect matches...</Text>
              </View>
            ) : matches.length > 0 ? (
              <View style={styles.profilesGrid}>
                {matches.map((matchScore) => (
                  <ProfileCard key={matchScore.profileId} matchScore={matchScore} />
                ))}
              </View>
            ) : (
              renderEmptyState()
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
      
      <SmartFilters
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        preferences={preferences}
        onPreferencesChange={setPreferences}
        onApplyFilters={setPreferences}
        userProfile={myProfile}
        onUpgradeRequired={() => setShowUpgradePrompt(true)}
      />
      
      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="Unlimited Messaging"
        tier="pro"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
  filtersButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  profilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
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
  profileOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileLocation: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  matchBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 36,
    right: 12,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  verifiedIcon: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createProfileButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  createProfileText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PersonalizedMatchingScreen;

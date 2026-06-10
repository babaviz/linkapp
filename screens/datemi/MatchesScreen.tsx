import React, { useCallback, useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Dimensions,
  Alert,
  StatusBar,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootState } from '../../redux/store';
import { DateMiProfile } from '../../redux/slices/datemiSlice';
import { MatchScore } from '../../services/matchingService';
import { UpgradePrompt } from '../../components/datemi/UpgradePrompt';
import { useScreenshotPrevention } from '../../utils/dateMiSecurity';
import { getDateMiActivityLabelWithPrivacy } from '../../utils/dateMiActivityStatus';
import EmptyState from '../../components/common/EmptyState';
import usePremiumAccess from '../../hooks/usePremiumAccess';
import { DateMiProfileService } from '../../services/dateMiService';
import { getUserFacingError } from '../../utils/userFacingError';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import dateMiNotificationManager from '../../services/dateMiNotificationManager';
import DateMiChatFab from '../../components/datemi/DateMiChatFab';

const { width: screenWidth } = Dimensions.get('window');
const cardWidth = (screenWidth - 60) / 2;

interface MatchCardProps {
  profile: DateMiProfile;
  matchScore: MatchScore;
  onPress: (profile: DateMiProfile) => void;
  onMessage: (profile: DateMiProfile) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ profile, matchScore, onPress, onMessage }) => {
  const activityLabel = getDateMiActivityLabelWithPrivacy({
    lastSeen: profile.lastSeen,
    showOnlineStatus: profile.privacySettings?.showOnlineStatus,
    showLastSeen: profile.privacySettings?.showLastSeen,
  });

  return (
    <TouchableOpacity
      onPress={() => onPress(profile)}
      style={{
        width: cardWidth,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
      }}
      activeOpacity={0.9}
    >
      {/* Profile Image */}
      <View style={{ position: 'relative' }}>
        {profile.profilePictures && profile.profilePictures.length > 0 ? (
          <Image
            source={{ uri: profile.profilePictures[0] }}
            style={{ 
              width: '100%', 
              height: 180,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16
            }}
            resizeMode="cover"
          />
        ) : (
          <View style={{
            width: '100%',
            height: 180,
            backgroundColor: 'rgba(255,255,255,0.05)',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Text style={{ fontSize: 60, opacity: 0.3 }}>👤</Text>
          </View>
        )}

        {/* Match Score Badge */}
        <View style={{
          position: 'absolute',
          top: 12,
          right: 12,
          backgroundColor: matchScore.score >= 80 ? '#10B981' : matchScore.score >= 60 ? '#F59E0B' : '#EF4444',
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 12
        }}>
          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }}>
            {matchScore.score}% Match
          </Text>
        </View>

        {/* Option C: privacy-safe activity status */}
        {activityLabel && (
          <View style={{
            position: 'absolute',
            top: 12,
            left: 12,
            backgroundColor: 'rgba(0,0,0,0.55)',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.25)'
          }}>
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>
              {activityLabel}
            </Text>
          </View>
        )}

        {/* Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            justifyContent: 'flex-end',
            paddingHorizontal: 12,
            paddingBottom: 12
          }}
        >
          <Text style={{ 
            fontSize: 16, 
            fontWeight: 'bold', 
            color: '#FFFFFF'
          }}>
            {profile.displayName}
          </Text>
        </LinearGradient>
      </View>

      {/* Profile Info */}
      <View style={{ padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          {profile.age && (
            <Text style={{ 
              fontSize: 14, 
              color: 'rgba(255,255,255,0.8)',
              marginRight: 8
            }}>
              {profile.age} years
            </Text>
          )}
          {profile.verified && (
            <View style={{
              backgroundColor: '#3B82F6',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 8,
              marginRight: 4
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>
                ✓
              </Text>
            </View>
          )}
          {profile.creatorStatus && (
            <View style={{
              backgroundColor: '#F59E0B',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 8
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>
                ⭐
              </Text>
            </View>
          )}
        </View>

        {profile.location && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 12, marginRight: 4 }}>📍</Text>
            <Text style={{ 
              fontSize: 12, 
              color: 'rgba(255,255,255,0.7)'
            }}>
              {profile.location}
            </Text>
          </View>
        )}

        {/* Match Reasons */}
        {matchScore.reasons.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ 
              fontSize: 11, 
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 15
            }} numberOfLines={2}>
              {matchScore.reasons.slice(0, 2).join(', ')}
            </Text>
          </View>
        )}

        {/* Action Button */}
        <TouchableOpacity
          onPress={() => onMessage(profile)}
          style={{
            backgroundColor: '#EF4444',
            paddingVertical: 8,
            borderRadius: 8,
            alignItems: 'center'
          }}
          activeOpacity={0.8}
        >
          <Text style={{ 
            color: '#FFFFFF', 
            fontSize: 12, 
            fontWeight: 'bold'
          }}>
            Say Hello 💕
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function MatchesScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { myProfile, matches: reduxMatches } = useSelector((state: RootState) => state.datemi);
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);
  const browseProfiles = useSelector((state: RootState) => state.datemi.profiles);
  const dateMiNewLikes = useSelector((state: RootState) => state.datemi.notifications.newLikes);
  const premiumAccess = usePremiumAccess();
  const [matches, setMatches] = useState<Array<{ profile: DateMiProfile; matchScore: MatchScore }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const lastRefreshAtRef = useRef<number>(0);
  
  // Prevent screenshots for privacy
  useScreenshotPrevention(true);

  // Auto-clear Date Mi like alerts when user views the Matches screen.
  useFocusEffect(
    useCallback(() => {
      if (dateMiNewLikes <= 0) return;
      dateMiNotificationManager.clearLikes().catch(() => {
        // ignore
      });
    }, [dateMiNewLikes])
  );

  const mergeWithLatestProfile = useCallback(
    (profile: DateMiProfile): DateMiProfile => {
      const fromBrowse =
        browseProfiles.find((p) => p.id === profile.id) ||
        browseProfiles.find((p) => p.userId === profile.userId);

      if (!fromBrowse) return profile;

      const profileUpdatedAt = profile.updatedAt ? new Date(profile.updatedAt).getTime() : 0;
      const browseUpdatedAt = fromBrowse.updatedAt ? new Date(fromBrowse.updatedAt).getTime() : NaN;

      if (Number.isFinite(browseUpdatedAt) && browseUpdatedAt > profileUpdatedAt) {
        return { ...profile, ...fromBrowse };
      }

      const hasRemoteImage = (p: DateMiProfile) =>
        Array.isArray(p.profilePictures) &&
        typeof p.profilePictures[0] === 'string' &&
        /^https?:\/\//.test(p.profilePictures[0]);

      if (!hasRemoteImage(profile) && hasRemoteImage(fromBrowse)) {
        return { ...profile, ...fromBrowse };
      }

      return profile;
    },
    [browseProfiles]
  );

  const buildMatchEntries = useCallback(
    (profiles: DateMiProfile[]): Array<{ profile: DateMiProfile; matchScore: MatchScore }> => {
      if (!myProfile) return [];

      return (profiles || []).map((raw) => {
        const profile = mergeWithLatestProfile(raw);
        const matchScore: MatchScore = {
          profileId: profile.id,
          score: 85,
          reasons: ['Mutual like', 'You both matched'],
          compatibility: {
            interests: 80,
            location: 75,
            age: 85,
            intention: 90,
            lifestyle: 70,
            activity: 75,
            communication: 80,
          },
          confidenceLevel: 'high',
          matchType:
            profile.creatorStatus
              ? 'creator'
              : myProfile.intention === 'long_term_partner'
              ? 'serious'
              : 'casual',
        };
        return { profile, matchScore };
      });
    },
    [mergeWithLatestProfile, myProfile]
  );

  useEffect(() => {
    // Use Redux matches only - no demo fallback
    if (reduxMatches.list && reduxMatches.list.length > 0 && myProfile) {
      setMatches(buildMatchEntries(reduxMatches.list));
    } else {
      setMatches([]);
    }
    setIsLoading(false);
  }, [reduxMatches.list, myProfile, buildMatchEntries]);

  const refreshMatches = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent === true;
      if (!currentUserId) return;
      if (!isSupabaseConfigured()) return;

      try {
        if (!silent) {
          setIsLoading(true);
        }
        const profiles = await DateMiProfileService.getMatches(currentUserId);
        setMatches(buildMatchEntries(profiles || []));
      } catch (error) {
        if (!silent) {
          const friendly = getUserFacingError(error, {
            action: 'refresh your matches',
            displayStyle: 'alert',
          });
          Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
        }
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [buildMatchEntries, currentUserId]
  );

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const minIntervalMs = 15000;
      if (now - lastRefreshAtRef.current < minIntervalMs) {
        return;
      }
      lastRefreshAtRef.current = now;
      void refreshMatches({ silent: true });
    }, [refreshMatches])
  );

  const handleProfilePress = (profile: DateMiProfile) => {
    Alert.alert(
      profile.displayName,
      'View full profile and learn more about your match?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Profile', onPress: () => navigation.navigate('ProfileView', { profileId: profile.id }) }
      ]
    );
  };

  const handleMessage = (profile: DateMiProfile) => {

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
        location: typeof profile.location === 'string' ? profile.location : (profile.location as any).city,
        profileImage: Array.isArray(profile.profilePictures) ? profile.profilePictures[0] : (profile.profilePictures as any)?.[0]?.url
      },
      recipientId: profile.userId
    });
  };

  const getTopMatches = () => matches.filter(match => match.matchScore.score >= 70);
  const getGoodMatches = () => matches.filter(match => match.matchScore.score >= 50 && match.matchScore.score < 70);
  const getPotentialMatches = () => matches.filter(match => match.matchScore.score < 50);

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
          contentContainerStyle={{ paddingBottom: 96 }}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
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
              <Text style={{ fontSize: 24, marginRight: 8 }}>💘</Text>
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: '#FFFFFF'
              }}>
                Your Matches
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate(myProfile ? 'DateMiProfileSettings' : 'CreateProfile')}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.25)'
                }}
                activeOpacity={0.85}
                accessibilityLabel={myProfile ? 'Open Date Mi profile settings' : 'Create your Date Mi profile'}
              >
                <Text style={{ fontSize: 16 }}>{myProfile ? '👤' : '➕'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  void refreshMatches();
                }}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12
                }}
                activeOpacity={0.85}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '500' }}>
                  Refresh
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
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
                onChangeText={setSearchText}
                placeholder="Search your matches..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                style={{ 
                  flex: 1, 
                  color: '#FFFFFF',
                  fontSize: 16
                }}
              />
            </View>
          </View>

          {isLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 16 }}>Finding your matches...</Text>
            </View>
          ) : matches.length === 0 ? (
            <EmptyState
              tone="dark"
              accentColor="#EF4444"
              icon={<Text style={{ fontSize: 64 }}>💔</Text>}
              title={myProfile ? 'No matches yet' : 'Create your profile to start matching'}
              description={
                myProfile
                  ? 'Try refreshing, broadening your preferences, or check back later for new profiles.'
                  : 'Your Date Mi profile helps us find people you’ll actually connect with.'
              }
              style={{ flex: 0, paddingTop: 28, paddingBottom: 40 }}
              primaryAction={{
                label: myProfile ? 'Refresh Matches' : 'Create Date Mi Profile',
                onPress: () => {
                  if (!myProfile) {
                    navigation.navigate('CreateProfile');
                    return;
                  }
                  void refreshMatches();
                },
              }}
              secondaryAction={{
                label: myProfile ? 'Update Preferences' : 'Go to Browse',
                onPress: () => {
                  if (!myProfile) {
                    navigation.navigate('DateMiBrowse');
                    return;
                  }
                  navigation.navigate('DateMiProfileSettings');
                },
              }}
            />
          ) : (
            <>
              {/* Top Matches */}
              {getTopMatches().length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    marginBottom: 10
                  }}>
                    <Text style={{ fontSize: 20 }}>🔥</Text>
                    <Text style={{
                      fontSize: 18,
                      fontWeight: 'bold',
                      color: '#FFFFFF',
                      marginLeft: 8
                    }}>
                      Perfect Matches ({getTopMatches().length})
                    </Text>
                  </View>
                  <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    paddingHorizontal: 20,
                    gap: 8
                  }}>
                    {getTopMatches().map(({ profile, matchScore }) => (
                      <MatchCard
                        key={profile.id}
                        profile={profile}
                        matchScore={matchScore}
                        onPress={handleProfilePress}
                        onMessage={handleMessage}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Good Matches */}
              {getGoodMatches().length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    marginBottom: 10
                  }}>
                    <Text style={{ fontSize: 20 }}>✨</Text>
                    <Text style={{
                      fontSize: 18,
                      fontWeight: 'bold',
                      color: '#FFFFFF',
                      marginLeft: 8
                    }}>
                      Good Matches ({getGoodMatches().length})
                    </Text>
                  </View>
                  <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    paddingHorizontal: 20,
                    gap: 8
                  }}>
                    {getGoodMatches().map(({ profile, matchScore }) => (
                      <MatchCard
                        key={profile.id}
                        profile={profile}
                        matchScore={matchScore}
                        onPress={handleProfilePress}
                        onMessage={handleMessage}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Potential Matches */}
              {getPotentialMatches().length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    marginBottom: 10
                  }}>
                    <Text style={{ fontSize: 20 }}>🌟</Text>
                    <Text style={{
                      fontSize: 18,
                      fontWeight: 'bold',
                      color: '#FFFFFF',
                      marginLeft: 8
                    }}>
                      Potential Matches ({getPotentialMatches().length})
                    </Text>
                  </View>
                  <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    paddingHorizontal: 20,
                    gap: 8
                  }}>
                    {getPotentialMatches().map(({ profile, matchScore }) => (
                      <MatchCard
                        key={profile.id}
                        profile={profile}
                        matchScore={matchScore}
                        onPress={handleProfilePress}
                        onMessage={handleMessage}
                      />
                    ))}
                  </View>
                </View>
              )}
            </>
          )}

          {/* Stats */}
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            marginHorizontal: 20,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.2)'
          }}>
            <Text style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 'bold',
              marginBottom: 12,
              textAlign: 'center'
            }}>
              Match Statistics
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 }}>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#10B981' }}>
                  {getTopMatches().length}
                </Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                  Perfect
                </Text>
              </View>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#F59E0B' }}>
                  {getGoodMatches().length}
                </Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                  Good
                </Text>
              </View>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }}>
                  {matches.length}
                </Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                  Total
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <DateMiChatFab />
      
      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="Unlimited Messaging"
        tier="pro"
      />
    </View>
  );
}

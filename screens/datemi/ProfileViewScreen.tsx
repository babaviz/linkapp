import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Alert,
  StatusBar,
  Animated,
  Modal,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { likeProfile, reportProfile } from '../../redux/slices/datemiSlice';
import type { ProfileReport } from '../../redux/slices/datemiSlice';
import { startCall } from '../../redux/slices/callSlice';
import { RootState, AppDispatch } from '../../redux/store';
import { getUserFacingError } from '../../utils/userFacingError';
import {
  requestAudioCallPermissionsWithAlert,
  requestVideoCallPermissionsWithAlert,
} from '../../utils/callPermissions';
import SafeImage from '../../components/common/SafeImage';
import { UpgradePrompt } from '../../components/datemi/UpgradePrompt';
import { ReportModal } from '../../components/datemi/ReportModal';
import { ViewReportsModal } from '../../components/datemi/ViewReportsModal';
import { ReportOptionsModal } from '../../components/datemi/ReportOptionsModal';
import { PremiumPaywall } from '../../components/datemi/PremiumPaywall';
import { useScreenshotPrevention } from '../../utils/dateMiSecurity';
import { FullScreenImageGallery } from '../property/components';
import { getDateMiActivityLabelWithPrivacy } from '../../utils/dateMiActivityStatus';
import usePremiumAccess from '../../hooks/usePremiumAccess';
import useDateMiAccess from '../../hooks/useDateMiAccess';
import { useStreamVideoClient as useAppStreamVideoClient } from '../../components/call/StreamVideoWrapper';
import { showDialog } from '../../utils/dialogService';

const FALLBACK_PROFILE_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjE2MCIgcj0iNjAiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTEyMCAzMDBDMTIwIDI2MC44IDI2MC44IDI0MCAzMDAgMjQwQzMzOS4yIDI0MCAzNjAgMjYwLjggMzYwIDMwMEgxMjBaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
const EMPTY_REPORTS: ProfileReport[] = [];

type ProfileViewRouteProp = RouteProp<RootStackParamList, 'ProfileView'>;
type ProfileViewNavigationProp = StackNavigationProp<RootStackParamList, 'ProfileView'>;

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ProfileViewScreen() {
  const navigation = useNavigation<ProfileViewNavigationProp>();
  const route = useRoute<ProfileViewRouteProp>();
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const premiumAccess = usePremiumAccess();
  const dateMiAccess = useDateMiAccess();
  const { client: streamVideoClient, error: streamVideoError } = useAppStreamVideoClient();
  const { profileId } = route.params;
  
  const handleBackPress = React.useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    // If the screen was opened as an entry route (e.g. deep link), ensure users
    // still have a safe escape hatch back into the app.
    navigation.replace('MainTabs');
  }, [navigation]);

  // Get current LinkApp user and Date Mi profile for header avatar
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  // Get report data from Redux with memoized selectors
  const reportCount = useSelector((state: RootState) => 
    state.datemi.reportCounts?.[profileId] ?? 0
  );
  const reports = useSelector((state: RootState) => {
    const profileReports = state.datemi.reports?.[profileId];
    return profileReports || EMPTY_REPORTS;
  });
  const currentUserId = useSelector((state: RootState) => 
    state.auth.user?.id || ''
  );
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageGalleryVisible, setIsImageGalleryVisible] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string>('Unlimited Messaging');
  const [upgradeTier, setUpgradeTier] = useState<'pro' | 'premium'>('pro');
  const [isCheckingFeatureAccess, setIsCheckingFeatureAccess] = useState<
    null | 'messaging' | 'voice_call' | 'video_call'
  >(null);
  const [showFeaturePaywall, setShowFeaturePaywall] = useState(false);
  const [paywallConfig, setPaywallConfig] = useState<{
    title: string;
    message: string;
    requiredTier: 'pro' | 'premium';
    entryFeature: 'messaging' | 'voice_call' | 'video_call';
  }>({
    title: '💬 Unlock Messaging',
    message: 'Upgrade to Pro to send and receive unlimited messages with your matches.',
    requiredTier: 'pro',
    entryFeature: 'messaging',
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [showViewReportsModal, setShowViewReportsModal] = useState(false);
  const [showReportOptionsModal, setShowReportOptionsModal] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const attemptedReportsLoadProfileIdsRef = useRef<Set<string>>(new Set());
  
  useScreenshotPrevention(true);
  
  useEffect(() => {
    let isCancelled = false;

    const hasAttempted = attemptedReportsLoadProfileIdsRef.current.has(profileId);
    const shouldLoad = reports.length === 0 && !hasAttempted;

    if (!shouldLoad) {
      return () => {
        isCancelled = true;
      };
    }

    attemptedReportsLoadProfileIdsRef.current.add(profileId);
    setIsLoadingReports(true);

    (async () => {
      try {
        const { DateMiProfileService } = await import('../../services/dateMiService');
        const backendReports = await DateMiProfileService.getProfileReports(profileId);

        if (backendReports && backendReports.length > 0) {
          backendReports.forEach((report: any) => {
            dispatch(
              reportProfile({
                profileId: report.profile_id,
                reporterId: report.reporter_id,
                reason: report.reason,
                details: report.details || '',
              })
            );
          });
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('Failed to load profile reports from backend; showing local state only');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingReports(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [dispatch, profileId, reports.length]);
  
  const profilesFromStore = useSelector((state: RootState) => state.datemi.profiles);
  const myProfileFromStore = useSelector((state: RootState) => state.datemi.myProfile);
  const profile = profilesFromStore.find(p => p.id === profileId) || (myProfileFromStore?.id === profileId ? myProfileFromStore : undefined);
  const matchedProfiles = useSelector((state: RootState) => state.datemi.matches.list);
  const isMatch = matchedProfiles.some(p => p.id === profileId);
  
  if (!profile) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#FFF', fontSize: 18, marginBottom: 20 }}>Profile not found</Text>
          <TouchableOpacity 
            onPress={handleBackPress}
            style={{ backgroundColor: '#FFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }}
          >
            <Text style={{ color: '#000', fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </GestureHandlerRootView>
    );
  }

  const activityLabel = isMatch
    ? getDateMiActivityLabelWithPrivacy({
        lastSeen: profile.lastSeen,
        showOnlineStatus: profile.privacySettings?.showOnlineStatus,
        showLastSeen: profile.privacySettings?.showLastSeen,
      })
    : null;

  // Header avatar should always reflect the logged-in user's Date Mi profile,
  // falling back to their main LinkApp profile image, then to the generic avatar.
  const headerProfileImage =
    myProfileFromStore?.profilePictures?.[0] ||
    currentUser?.profileImageUrl ||
    FALLBACK_PROFILE_AVATAR;

  const handleLike = () => {

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();

    // Check daily likes limit for free users (handled via premiumAccess abstraction)
    const remainingLikes = premiumAccess.getRemainingDailyLikes();
    if (premiumAccess.currentTier === 'free' && remainingLikes <= 0) {
      setUpgradeFeature('Unlimited Daily Likes');
      setUpgradeTier('pro');
      setShowUpgradePrompt(true);
      return;
    }
    
    dispatch(likeProfile({ profileId }));
    
    const remainingAfterLike = Math.max(remainingLikes - 1, 0);

    void showDialog({
      type: 'success',
      title: 'Like sent',
      message: `You liked ${profile.displayName}. ${
        premiumAccess.currentTier === 'free'
          ? `You have ${remainingAfterLike} likes remaining today.`
          : 'Enjoy unlimited likes with your premium subscription!'
      }`,
      icon: {
        name: 'favorite',
        color: '#EC4899',
        size: 48,
      },
      dismissOnBackdrop: true,
      buttons: [
        { text: 'Stay here', style: 'cancel' },
        { text: 'Keep browsing', onPress: handleBackPress },
      ],
      accessibilityLabel: 'Like sent dialog',
    });
  };

  const handleMessage = async () => {
    if (!currentUser?.id) {
      Alert.alert('Not signed in', 'Please sign in and try again.', [{ text: 'OK', style: 'cancel' }]);
      return;
    }

    if (isCheckingFeatureAccess) {
      return;
    }

    setIsCheckingFeatureAccess('messaging');
    try {
      const latestStatus = await dateMiAccess.refresh();
      if (!latestStatus) {
        await showDialog({
          type: 'error',
          title: 'Unable to verify access',
          message: 'Please check your connection and try again.',
          buttons: [{ text: 'OK' }],
          dismissOnBackdrop: true,
          accessibilityLabel: 'DateMi access verification failed dialog',
        });
        return;
      }

      // Check messaging permissions (DateMi per-feature access)
      if (!latestStatus.access.canSendMessages) {
        setPaywallConfig({
          title: '💬 Unlock Messaging',
          message: 'Upgrade to Pro to send and receive unlimited messages with your matches.',
          requiredTier: 'pro',
          entryFeature: 'messaging',
        });
        setShowFeaturePaywall(true);
        return;
      }
      
      // Special handling for creator profiles - requires Premium
      if (profile.creatorStatus && !premiumAccess.isPremium) {
        setUpgradeFeature('Creator Messaging');
        setUpgradeTier('premium');
        setShowUpgradePrompt(true);
        return;
      }

      // Open real Stream chat UI (Alert.prompt is iOS-only and appears as "no response" on Android)
      if (!profile.userId || profile.userId.trim() === '') {
        const friendly = getUserFacingError(new Error('Recipient not found'), {
          action: 'open this chat',
          displayStyle: 'alert',
        });
        Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
        return;
      }

      navigation.navigate('DateMiChat', {
        match: {
          id: profileId,
          name: profile.displayName,
          age: profile.age,
          location: profile.location,
          profileImage: profile.profilePictures?.[0],
        },
        recipientId: profile.userId,
        // conversationId: undefined -> DateMiChatScreen will create/get the Stream channel
      });
    } finally {
      setIsCheckingFeatureAccess(null);
    }
  };

  const handleVideoCall = async () => {
    if (!currentUser?.id) {
      Alert.alert('Not signed in', 'Please sign in and try again.', [{ text: 'OK', style: 'cancel' }]);
      return;
    }

    if (isCheckingFeatureAccess) {
      return;
    }

    setIsCheckingFeatureAccess('video_call');
    try {
      const latestStatus = await dateMiAccess.refresh();
      if (!latestStatus) {
        await showDialog({
          type: 'error',
          title: 'Unable to verify access',
          message: 'Please check your connection and try again.',
          buttons: [{ text: 'OK' }],
          dismissOnBackdrop: true,
          accessibilityLabel: 'DateMi access verification failed dialog',
        });
        return;
      }

      if (!latestStatus.access.canMakeVideoCalls) {
        setPaywallConfig({
          title: '🎥 Unlock Video Calls',
          message: 'Unlock Video Calls for $1/month or upgrade to Premium ($2/month) for everything.',
          requiredTier: 'premium',
          entryFeature: 'video_call',
        });
        setShowFeaturePaywall(true);
        return;
      }

      if (!streamVideoClient) {
        Alert.alert(
          'Call Service Not Ready',
          streamVideoError || 'Please wait a moment and try again.',
          [{ text: 'OK', style: 'cancel' }]
        );
        return;
      }

      try {
        if (!profile.userId || profile.userId.trim() === '') {
          throw new Error('Recipient not found');
        }

        const permissions = await requestVideoCallPermissionsWithAlert();
        if (!permissions.microphone || !permissions.camera) return;

        // Start video call via service
        await dispatch(startCall({
          type: 'video',
          receiverId: profile.userId,
          receiverName: profile.displayName,
          receiverImage: profile.profilePictures?.[0],
        })).unwrap();
        // Navigation is handled centrally by CallNavigationCoordinator
      } catch (err) {
        const friendly = getUserFacingError(err, {
          action: 'start a video call',
          displayStyle: 'alert',
        });
        Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
      }
    } finally {
      setIsCheckingFeatureAccess(null);
    }
  };
  
  const handleVoiceCall = async () => {
    if (!currentUser?.id) {
      Alert.alert('Not signed in', 'Please sign in and try again.', [{ text: 'OK', style: 'cancel' }]);
      return;
    }

    if (isCheckingFeatureAccess) {
      return;
    }

    setIsCheckingFeatureAccess('voice_call');
    try {
      const latestStatus = await dateMiAccess.refresh();
      if (!latestStatus) {
        await showDialog({
          type: 'error',
          title: 'Unable to verify access',
          message: 'Please check your connection and try again.',
          buttons: [{ text: 'OK' }],
          dismissOnBackdrop: true,
          accessibilityLabel: 'DateMi access verification failed dialog',
        });
        return;
      }

      if (!latestStatus.access.canMakeVoiceCalls) {
        setPaywallConfig({
          title: '📞 Unlock Voice Calls',
          message: 'Unlock Voice Calls for $1/month or upgrade to Premium ($2/month) for everything.',
          requiredTier: 'premium',
          entryFeature: 'voice_call',
        });
        setShowFeaturePaywall(true);
        return;
      }

      if (!streamVideoClient) {
        Alert.alert(
          'Please wait',
          'Call service is still starting. Please try again in a moment.',
          [{ text: 'OK', style: 'cancel' }]
        );
        return;
      }

      try {
        if (!profile.userId || profile.userId.trim() === '') {
          throw new Error('Recipient not found');
        }

        const permissions = await requestAudioCallPermissionsWithAlert();
        if (!permissions.microphone) return;

        await dispatch(
          startCall({
            type: 'audio',
            receiverId: profile.userId,
            receiverName: profile.displayName,
            receiverImage: profile.profilePictures?.[0],
          })
        ).unwrap();
      } catch (err) {
        const friendly = getUserFacingError(err, {
          action: 'start a voice call',
          displayStyle: 'alert',
        });
        Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
      }
    } finally {
      setIsCheckingFeatureAccess(null);
    }
  };

  // (Optional) Additional actions like Super Like/Skip can be wired when UI exposes them
  
  const handleReport = () => {
    if (!currentUserId) {
      Alert.alert(
        'Sign in required',
        'You need to be signed in to report or block profiles.',
        [{ text: 'OK', style: 'cancel' }],
      );
      return;
    }
    setShowReportOptionsModal(true);
  };
  
  const handleReportPress = () => {
    
    setShowReportModal(true);
  };
  
  const handleViewReportsPress = () => {
    
    setShowViewReportsModal(true);
  };
  
  const handleSubmitReport = async (reason: string, details: string) => {
    if (!currentUserId) {
      throw new Error('User must be signed in to submit a report');
    }
    try {
      const { DateMiProfileService } = await import('../../services/dateMiService');
      const success = await DateMiProfileService.reportProfile(
        currentUserId,
        profileId,
        reason,
        details
      );

      if (!success) {
        throw new Error('Failed to submit report to server');
      }

      dispatch(reportProfile({
        profileId,
        reporterId: currentUserId,
        reason,
        details
      }));
      
      setShowReportModal(false);
    } catch (error) {
      throw error;
    }
  };
  
  const handleBlock = async () => {
    if (!currentUserId) {
      Alert.alert(
        'Sign in required',
        'You need to be signed in to block profiles.',
        [{ text: 'OK', style: 'cancel' }],
      );
      return;
    }
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${profile.displayName}? They won't be able to see your profile or send you messages.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const { DateMiProfileService } = await import('../../services/dateMiService');
              const success = await DateMiProfileService.blockProfile(
                currentUserId,
                profileId,
                'Blocked from profile view'
              );

              if (success) {
                Alert.alert(
                  'User Blocked',
                  `${profile.displayName} has been blocked. You can manage blocked users in Settings > Privacy & Safety.`,
                  [
                    {
                      text: 'OK',
                      onPress: handleBackPress
                    }
                  ]
                );
              } else {
                const friendly = getUserFacingError(new Error('Block failed'), {
                  action: 'block this user',
                  displayStyle: 'alert',
                });
                Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
              }
            } catch (error) {
              if (__DEV__) {
                console.error('Error blocking user:', error);
              }
              const friendly = getUserFacingError(error, {
                action: 'block this user',
                displayStyle: 'alert',
              });
              Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
            }
          }
        }
      ]
    );
  };
  
  // (Optional) Upgrade navigation handled by UpgradePrompt

  const navigateToImage = (index: number) => {
    if (profile?.profilePictures && index >= 0 && index < profile.profilePictures.length) {
      setCurrentImageIndex(index);
    }
  };

  const handleImageTap = (side: 'left' | 'right') => {
    const totalImages = profile?.profilePictures?.length ?? 0;
    if (totalImages <= 1) {
      return;
    }

    if (side === 'left') {
      const nextIndex = currentImageIndex === 0 ? totalImages - 1 : currentImageIndex - 1;
      navigateToImage(nextIndex);
    } else {
      const nextIndex = currentImageIndex === totalImages - 1 ? 0 : currentImageIndex + 1;
      navigateToImage(nextIndex);
    }
  };

  // Log subscription state for debugging

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Clean Header */}
      <View style={{
        position: 'absolute',
        top: insets.top + 10,
        left: 20,
        right: 20,
        zIndex: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => navigation.navigate('DateMiProfileSettings' as never)}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            borderWidth: 2,
            borderColor: '#FF6B6B',
            backgroundColor: 'rgba(0,0,0,0.5)',
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {headerProfileImage && headerProfileImage !== FALLBACK_PROFILE_AVATAR ? (
            <SafeImage
              source={{ uri: headerProfileImage }}
              fallbackSource={{ uri: FALLBACK_PROFILE_AVATAR }}
              showPlaceholder
              placeholderIcon="person"
              style={{
                width: 52,
                height: 52,
                borderRadius: 26
              }}
            />
          ) : (
            <View style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: '#6B7280',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MaterialIcons name="person" size={24} color="#FFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Hero Section */}
        <View style={{ position: 'relative' }}>
          {profile.profilePictures && profile.profilePictures.length > 0 ? (
            <View style={{ width: screenWidth, height: screenHeight * 0.7 }}>
              {/* Current Image Display */}
              <TouchableOpacity
                activeOpacity={0.9}
                style={{ width: '100%', height: '100%' }}
                onPress={() => {
                  if (profile.profilePictures && profile.profilePictures.length > 0) {
                    setIsImageGalleryVisible(true);
                  }
                }}
              >
                <Image
                  source={{ uri: profile.profilePictures[currentImageIndex] }}
                  style={{
                    width: '100%',
                    height: '100%'
                  }}
                  resizeMode="cover"
                  onError={() => {
                  
                  }}
                />
              </TouchableOpacity>
              
              {/* Touch Zones for Navigation - Only show for multiple images */}
              {profile.profilePictures.length > 1 && (
                <>
                  {/* Left tap zone */}
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: screenWidth * 0.3,
                      height: screenHeight * 0.7,
                      backgroundColor: 'transparent'
                    }}
                    onPress={() => handleImageTap('left')}
                    activeOpacity={1}
                  />
                  
                  {/* Right tap zone */}
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      width: screenWidth * 0.3,
                      height: screenHeight * 0.7,
                      backgroundColor: 'transparent'
                    }}
                    onPress={() => handleImageTap('right')}
                    activeOpacity={1}
                  />
                </>
              )}
            </View>
          ) : (
            <View style={{
              width: screenWidth,
              height: screenHeight * 0.7,
              backgroundColor: '#333',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MaterialIcons name="person" size={80} color="rgba(255,255,255,0.3)" />
            </View>
          )}
          
          {/* Interactive Image Indicators - Only show for multiple images */}
          {profile.profilePictures && profile.profilePictures.length > 1 && (
            <View style={{
              position: 'absolute',
              top: 80,
              left: 20,
              right: 20,
              flexDirection: 'row',
              gap: 6
            }}>
              {profile.profilePictures.map((_, index) => (
                <TouchableOpacity
                  key={`indicator-${index}`}
                  onPress={() => navigateToImage(index)}
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: index === currentImageIndex ? '#FFF' : 'rgba(255,255,255,0.4)',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4
                  }}
                />
              ))}
            </View>
          )}

          {/* Name Overlay - Bottom */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 150,
              justifyContent: 'flex-end',
              paddingHorizontal: 24,
              paddingBottom: 20
            }}
          >
            <View>
              {/* Name and Age */}
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 }}>
                <Text style={{ 
                  fontSize: 32, 
                  fontWeight: '700', 
                  color: '#FFF',
                  letterSpacing: -0.5
                }}>
                  {profile.displayName}
                </Text>
                {profile.age && (
                  <Text style={{ 
                    fontSize: 26, 
                    color: 'rgba(255,255,255,0.9)',
                    fontWeight: '500',
                    marginLeft: 10
                  }}>
                    {profile.age}
                  </Text>
                )}
              </View>
              
              {/* Action Buttons Row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 8, paddingHorizontal: 20, marginBottom: 12 }}>
                {/* Audio Call Button */}
                <TouchableOpacity
                  onPress={handleVoiceCall}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: dateMiAccess.canVoiceCall ? '#10B981' : 'rgba(16, 185, 129, 0.45)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 0,
                    shadowColor: '#10B981',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 3
                  }}
                >
                  <MaterialIcons name="phone" size={24} color="#FFF" />
                </TouchableOpacity>
                
                {/* Video Call Button */}
                <TouchableOpacity
                  onPress={handleVideoCall}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: dateMiAccess.canVideoCall ? '#EC4899' : 'rgba(236, 72, 153, 0.45)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 0,
                    shadowColor: '#EC4899',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 3
                  }}
                >
                  <MaterialIcons name="videocam" size={24} color="#FFF" />
                </TouchableOpacity>
                
                {/* Message Button */}
                <TouchableOpacity
                  onPress={handleMessage}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: dateMiAccess.canMessage ? '#3B82F6' : 'rgba(59, 130, 246, 0.45)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 0,
                    shadowColor: '#3B82F6',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 3
                  }}
                >
                  <MaterialIcons name="chat-bubble" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Content with DateMi Theme Background */}
        <View style={{ 
          backgroundColor: '#FFF1F2', 
          paddingHorizontal: 24, 
          paddingTop: 24, 
          paddingBottom: 120,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          marginTop: -20,
          minHeight: 300
        }}>
          
          {/* Verified Badge and Location Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            {profile.verified && (
              <View style={{
                backgroundColor: 'rgba(248, 113, 113, 0.1)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: 'rgba(248, 113, 113, 0.2)'
              }}>
                <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600' }}>✓ Verified</Text>
              </View>
            )}
            {profile.location && (
              <Text style={{ fontSize: 14, color: '#737373' }}>
                📍 {profile.location} • 2.1 km away
              </Text>
            )}
            {activityLabel && (
              <View style={{
                backgroundColor: 'rgba(0,0,0,0.06)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.08)'
              }}>
                <Text style={{ color: '#404040', fontSize: 13, fontWeight: '600' }}>
                  {activityLabel}
                </Text>
              </View>
            )}
          </View>

          {/* Bio - always show full text for better UX */}
          {profile.aboutMe && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#262626', marginBottom: 8 }}>Bio</Text>
              <Text
                style={{
                  fontSize: 15,
                  color: '#525252',
                  lineHeight: 22
                }}
              >
                {profile.aboutMe}
              </Text>
            </View>
          )}

          {/* Interests - softer access control without upgrade button */}
          {profile.interests && profile.interests.length > 0 && (
            <View style={{ marginBottom: 24, position: 'relative' }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#262626', marginBottom: 12 }}>Interests</Text>
              {premiumAccess.canAccess('unlimitedMessaging') ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {profile.interests.map((interest, index) => (
                    <View
                      key={index}
                      style={{
                        backgroundColor: '#FFFFFF',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: '#FFE4E6',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 1
                      }}
                    >
                      <Text style={{ color: '#525252', fontSize: 14, fontWeight: '500' }}>
                        {interest}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {profile.interests.slice(0, 6).map((interest, index) => (
                    <View
                      key={index}
                      style={{
                        backgroundColor: '#FFFFFF',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: '#FFE4E6'
                      }}
                    >
                      <Text style={{ color: '#525252', fontSize: 14, fontWeight: '500' }}>
                        {interest}
                      </Text>
                    </View>
                  ))}
                  {profile.interests.length > 6 && (
                    <View
                      style={{
                        backgroundColor: '#F3F4F6',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: '#E5E7EB'
                      }}
                    >
                      <Text style={{ color: '#9CA3AF', fontSize: 14, fontWeight: '500' }}>
                        +{profile.interests.length - 6} more
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modern Action Bar - Bottom Right Aligned */}
      <View style={{
        position: 'absolute',
        bottom: insets.bottom + 20,
        right: 24,
        alignItems: 'flex-end',
        gap: 12
      }}>
        {/* Report Button with Badge - Top */}
        <TouchableOpacity
          onPress={handleReport}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3
          }}
        >
          <MaterialIcons name="flag" size={22} color="#EF4444" />
          {reportCount > 0 && (
            <View style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: '#EF4444',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 4
            }}>
              <Text style={{
                color: '#FFF',
                fontSize: 11,
                fontWeight: '700'
              }}>
                {reportCount > 99 ? '99+' : reportCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Like Button - Middle */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            onPress={handleLike}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#F87171',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#EF4444',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5
            }}
          >
            <MaterialIcons name="favorite" size={22} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>

        {/* Message Button - Bottom (Full Width) */}
        <TouchableOpacity
          onPress={handleMessage}
          style={{
            width: screenWidth - 48,
            height: 56,
            backgroundColor:
              dateMiAccess.canMessage && (!profile.creatorStatus || premiumAccess.isPremium)
                ? profile.creatorStatus
                  ? '#EC4899'
                  : '#F472B6'
                : '#FFE4E6',
            borderRadius: 28,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2
          }}
        >
          <MaterialIcons 
            name="message" 
            size={20} 
            color={dateMiAccess.canMessage && (!profile.creatorStatus || premiumAccess.isPremium) ? '#FFF' : '#F87171'} 
          />
          <Text style={{ 
            color: dateMiAccess.canMessage && (!profile.creatorStatus || premiumAccess.isPremium) ? '#FFF' : '#F87171', 
            fontSize: 16, 
            fontWeight: '600' 
          }}>
            {profile.creatorStatus && !premiumAccess.isPremium ? 'Premium Message' : 'Send Message'}
          </Text>
          {!(dateMiAccess.canMessage && (!profile.creatorStatus || premiumAccess.isPremium)) && (
            <MaterialIcons name="lock" size={16} color="#F87171" />
          )}
        </TouchableOpacity>
      </View>
      
      <Modal
        visible={showFeaturePaywall}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFeaturePaywall(false)}
      >
        <PremiumPaywall
          variant="overlay"
          title={paywallConfig.title}
          message={paywallConfig.message}
          feature={paywallConfig.entryFeature}
          requiredTier={paywallConfig.requiredTier}
          onUpgrade={() => {
            setShowFeaturePaywall(false);
            // Use setTimeout to ensure modal dismisses before navigation
            setTimeout(() => {
              navigation.navigate('SubscriptionPlans', { entryFeature: paywallConfig.entryFeature });
            }, 100);
          }}
          onClose={() => setShowFeaturePaywall(false)}
          showClose
        />
      </Modal>

      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature={upgradeFeature}
        tier={upgradeTier}
      />
      
      <ReportOptionsModal
        visible={showReportOptionsModal}
        onClose={() => setShowReportOptionsModal(false)}
        onReportPress={handleReportPress}
        onViewReportsPress={handleViewReportsPress}
        onBlockPress={handleBlock}
        profileName={profile.displayName}
        reportCount={reportCount}
      />
      
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        profileId={profileId}
        profileName={profile.displayName}
        onSubmitReport={handleSubmitReport}
        existingReports={reportCount}
      />
      
      <ViewReportsModal
        visible={showViewReportsModal}
        onClose={() => setShowViewReportsModal(false)}
        profileName={profile.displayName}
        reports={reports}
        isLoading={isLoadingReports}
      />

      <FullScreenImageGallery
        images={profile.profilePictures ?? []}
        initialIndex={currentImageIndex}
        visible={isImageGalleryVisible}
        onClose={() => setIsImageGalleryVisible(false)}
      />
    </SafeAreaView>
  );
}

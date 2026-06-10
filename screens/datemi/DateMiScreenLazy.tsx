/**
 * DateMiScreenLazy - Lazy-loaded wrapper for DateMiScreen
 * This wrapper delays loading of DateMiScreen and its problematic dependencies
 * (react-native-reanimated, react-native-gesture-handler) until the screen is actually accessed.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, InteractionManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showDialog } from '../../utils/dialogService';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../redux/store';
import { IndeterminateProgressBar } from '../../components/common';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAgeVerified, setPasscodeStatus, verifyPasscode, resetPasscodeVerification, fetchProfiles } from '../../redux/slices/datemiSlice';
import AgeVerificationCover from '../../components/datemi/AgeVerificationCover';
import PasscodeSetup from '../../components/datemi/PasscodeSetup';
import PasscodeEntry from '../../components/datemi/PasscodeEntry';
import { hasPasscode, removePasscode, migratePasscodeToUser } from '../../utils/passcodeManager';
import { encodeBase64 } from '../../utils/base64';
import { clearOldPasscodeData } from '../../utils/clearPasscodeData';
import PrivacyPolicyModal from '../../components/common/PrivacyPolicyModal';
import { privacyPolicyService } from '../../services/privacyPolicyService';

// Manual lazy loading for React Native
let DateMiScreen: React.ComponentType | null = null;
let loadingPromise: Promise<React.ComponentType> | null = null;

const loadDateMiScreen = async () => {
  if (DateMiScreen) return DateMiScreen;
  if (loadingPromise) return loadingPromise;
  
  loadingPromise = import('./DateMiBrowseScreen').then(module => {
    DateMiScreen = module.default;
    return DateMiScreen;
  });
  
  return loadingPromise;
};

// Loading placeholder component
const DateMiLoadingScreen = () => (
  <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
    <LinearGradient
      colors={['#6B46C1', '#553C9A', '#4C1D95']}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    />
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center',
      width: '100%',
      maxWidth: 420,
      alignSelf: 'center',
      paddingHorizontal: 24,
      paddingVertical: 24,
    }}>
      <View style={{ width: '70%', maxWidth: 280, marginBottom: 20 }}>
        <IndeterminateProgressBar
          color="#FFFFFF"
          trackColor="rgba(255,255,255,0.25)"
          height={5}
        />
      </View>
      <Text style={{ 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 8 
      }}>
        💕 Date Mi
      </Text>
      <View style={{ alignItems: 'center', width: '100%', maxWidth: 320 }}>
        <Text style={{ 
          fontSize: 16, 
          fontWeight: '600', 
          color: '#FFFFFF',
          opacity: 0.95,
          textAlign: 'center' 
        }}>
          Opening Date Mi...
        </Text>
        <Text style={{ 
          marginTop: 6,
          fontSize: 14, 
          color: 'rgba(255,255,255,0.8)',
          textAlign: 'center' 
        }}>
          Loading dating features
        </Text>
      </View>
    </View>
  </SafeAreaView>
);

// Error boundary for DateMi screen
class DateMiErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: React.ErrorInfo) {}

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          <LinearGradient
            colors={['#6B46C1', '#553C9A', '#4C1D95']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: 20 
          }}>
            <Text style={{ 
              fontSize: 24, 
              marginBottom: 16,
              textAlign: 'center' 
            }}>
              💔
            </Text>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: 'bold', 
              color: '#FFFFFF',
              marginBottom: 8,
              textAlign: 'center' 
            }}>
              Date Mi Unavailable
            </Text>
            <Text style={{ 
              fontSize: 14, 
              color: 'rgba(255,255,255,0.8)',
              textAlign: 'center',
              lineHeight: 20 
            }}>
              Sorry, the dating features are currently unavailable. Please try again later.
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const AGE_VERIFICATION_KEY_PREFIX = '@datemi_age_verified';
const LEGACY_AGE_VERIFICATION_KEY = '@datemi_age_verified';

function getAgeVerificationKey(userId?: string | null): string {
  if (userId && userId.trim()) {
    return `${AGE_VERIFICATION_KEY_PREFIX}:${userId}`;
  }
  return LEGACY_AGE_VERIFICATION_KEY;
}

function getVerificationTimestampKey(userId?: string | null): string {
  if (userId && userId.trim()) {
    return `@datemi_verification_timestamp:${userId}`;
  }
  return '@datemi_verification_timestamp';
}

function getDobEncryptedKey(userId?: string | null): string {
  if (userId && userId.trim()) {
    return `@datemi_dob_encrypted:${userId}`;
  }
  return '@datemi_dob_encrypted';
}

// Temporarily disable the first-run privacy policy gate for Date Mi so users see the
// Date Mi cover screen first. Re-enable when you're ready to enforce acceptance again.
const DATE_MI_PRIVACY_POLICY_GATE_ENABLED = false;

export default function DateMiScreenLazy() {
  const dispatch = useDispatch();
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const isAgeVerified = useSelector((state: RootState) => state.datemi.isAgeVerified);
  const isPasscodeVerified = useSelector((state: RootState) => state.datemi.isPasscodeVerified);
  const currentIntention = useSelector((state: RootState) => state.datemi.currentIntention);
  const [LoadedComponent, setLoadedComponent] = useState<React.ComponentType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(true);
  const [showPasscodeSetup, setShowPasscodeSetup] = useState(false);
  const [showPasscodeEntry, setShowPasscodeEntry] = useState(false);
  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false);
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(!DATE_MI_PRIVACY_POLICY_GATE_ENABLED);
  const hasPrefetchedProfilesRef = useRef(false);

  // Prefetch DateMi browse screen while the user is on passcode/setup UI.
  // This avoids a long wait right after a successful passcode entry.
  useEffect(() => {
    if (!isAgeVerified) return;
    if (!showPasscodeEntry && !showPasscodeSetup && !isPasscodeVerified) return;

    let cancelled = false;
    InteractionManager.runAfterInteractions(() => {
      loadDateMiScreen()
        .then(() => {
          // Warm cache only; don't set state while user is still on passcode/setup.
          if (cancelled) return;
        })
        .catch((_e) => {
          void _e;
        });
    });

    return () => {
      cancelled = true;
    };
  }, [isAgeVerified, isPasscodeVerified, showPasscodeEntry, showPasscodeSetup]);

  // Check privacy policy acceptance and age verification on mount (optimized)
  // Wait for userId before running - user must be authenticated to access Date Mi
  useEffect(() => {
    if (!userId) {
      setIsCheckingVerification(true);
      return;
    }

    setIsCheckingVerification(true);

    const checkVerificationStatus = async () => {
      try {
        const ageKey = getAgeVerificationKey(userId);
        const timestampKey = getVerificationTimestampKey(userId);

        // Batch AsyncStorage reads for better performance
        const needsAcceptancePromise = DATE_MI_PRIVACY_POLICY_GATE_ENABLED
          ? privacyPolicyService.needsAcceptance()
          : Promise.resolve(false);

        const [needsAcceptance, verified, timestamp, passcodeExistsResult] = await Promise.all([
          needsAcceptancePromise,
          AsyncStorage.getItem(ageKey),
          AsyncStorage.getItem(timestampKey),
          hasPasscode(userId),
        ]);

        let passcodeExists = passcodeExistsResult;

        // Migration: if user-scoped passcode is false but legacy exists, migrate
        if (!passcodeExists) {
          const legacyHasPasscode = await hasPasscode(null);
          if (legacyHasPasscode) {
            const migrated = await migratePasscodeToUser(userId);
            if (migrated) passcodeExists = true;
          }
        }

        // Migration: if user-scoped key is empty, check legacy key for existing users
        let verifiedValue = verified;
        let timestampValue = timestamp;
        if ((!verifiedValue || verifiedValue !== 'true') && ageKey !== LEGACY_AGE_VERIFICATION_KEY) {
          const [legacyVerified, legacyTimestamp, legacyDob] = await Promise.all([
            AsyncStorage.getItem(LEGACY_AGE_VERIFICATION_KEY),
            AsyncStorage.getItem('@datemi_verification_timestamp'),
            AsyncStorage.getItem('@datemi_dob_encrypted'),
          ]);
          if (legacyVerified === 'true') {
            verifiedValue = legacyVerified;
            timestampValue = legacyTimestamp || undefined;
            const dobKey = getDobEncryptedKey(userId);
            // Migrate to user-scoped keys
            await AsyncStorage.setItem(ageKey, 'true');
            if (legacyTimestamp) {
              await AsyncStorage.setItem(timestampKey, legacyTimestamp);
            }
            if (legacyDob) {
              await AsyncStorage.setItem(dobKey, legacyDob);
            }
            await AsyncStorage.removeItem(LEGACY_AGE_VERIFICATION_KEY).catch(() => {});
            await AsyncStorage.removeItem('@datemi_verification_timestamp').catch(() => {});
            await AsyncStorage.removeItem('@datemi_dob_encrypted').catch(() => {});
          }
        }

        // Check privacy policy acceptance first
        if (needsAcceptance) {
          setShowPrivacyPolicyModal(true);
          setIsCheckingVerification(false);
          return;
        }
        setPrivacyPolicyAccepted(true);

        // Process age verification
        if (verifiedValue === 'true') {
          dispatch(setAgeVerified({
            verified: true,
            timestamp: timestampValue || undefined,
          }));

          dispatch(setPasscodeStatus({
            isSet: passcodeExists,
            isVerified: false,
          }));

          if (passcodeExists) {
            setShowPasscodeEntry(true);
          } else {
            setShowPasscodeSetup(true);
          }
        }

        setIsCheckingVerification(false);

        // Clean up old passcode data with invalid keys (deferred to background)
        InteractionManager.runAfterInteractions(() => {
          clearOldPasscodeData();
        });
      } catch (_error) {
        void _error;
        setIsCheckingVerification(false);
      }
    };

    checkVerificationStatus();
  }, [dispatch, userId]);
  
  // Reset passcode verification when component unmounts
  useEffect(() => {
    return () => {
      dispatch(resetPasscodeVerification());
    };
  }, [dispatch]);

  // Load component when age is verified and passcode is verified - deferred to not block UI
  useEffect(() => {
    let isMounted = true;
    
    if (!isAgeVerified || !isPasscodeVerified) {
      return;
    }
    
    const loadComponent = async () => {
      try {
        // Prefetch profiles while DateMi is still on its own loading screen (avoids empty-state flash in browse)
        if (!hasPrefetchedProfilesRef.current) {
          hasPrefetchedProfilesRef.current = true;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dispatch(fetchProfiles({ intention: currentIntention }) as any);
        }

        const Component = await loadDateMiScreen();
        
        if (isMounted) {
          setLoadedComponent(() => Component);
          setIsLoading(false);
        }
      } catch (_error) {
        void _error;
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    loadComponent();
    
    return () => {
      isMounted = false;
    };
  }, [isAgeVerified, isPasscodeVerified]);

  // Incoming ringing calls are handled globally by `RingingCallsHandler` (useCalls()).

  const handleVerificationComplete = async (dateOfBirth: string) => {
    if (!userId) return;
    try {
      const ageKey = getAgeVerificationKey(userId);
      const dobKey = getDobEncryptedKey(userId);
      const timestampKey = getVerificationTimestampKey(userId);

      // Store verification status (user-scoped)
      await AsyncStorage.setItem(ageKey, 'true');

      // Store encrypted date of birth (base64 encoding for basic protection)
      const encodedDOB = encodeBase64(dateOfBirth);
      await AsyncStorage.setItem(dobKey, encodedDOB);

      // Store verification timestamp
      const verificationTimestamp = new Date().toISOString();
      await AsyncStorage.setItem(timestampKey, verificationTimestamp);

      // Update Redux state with timestamp
      dispatch(setAgeVerified({
        verified: true,
        timestamp: verificationTimestamp,
      }));

      // Check if passcode exists
      const passcodeExists = await hasPasscode(userId);
      if (passcodeExists) {
        setShowPasscodeEntry(true);
      } else {
        setShowPasscodeSetup(true);
      }
    } catch (_error) {
      void _error;
    }
  };
  
  const handlePasscodeSetupComplete = async () => {
    dispatch(setPasscodeStatus({ 
      isSet: true, 
      isVerified: true,
      timestamp: new Date().toISOString()
    }));
    setShowPasscodeSetup(false);
    setShowPasscodeEntry(false);
  };
  
  const handlePasscodeSuccess = () => {
    dispatch(verifyPasscode());
    setShowPasscodeEntry(false);
  };
  
  const handleForgotPasscode = async () => {
    if (!userId) return;
    await showDialog({
      title: 'Reset Passcode',
      message: 'Resetting your passcode will require you to verify your age again. Continue?',
      type: 'warning',
      icon: { name: 'warning', color: '#F59E0B', size: 32 },
      buttons: [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove passcode for current user
              await removePasscode(userId);
              // Clear age verification for current user
              await AsyncStorage.removeItem(getAgeVerificationKey(userId));
              await AsyncStorage.removeItem(getDobEncryptedKey(userId));
              await AsyncStorage.removeItem(getVerificationTimestampKey(userId));

              // Reset Redux state
              dispatch(setAgeVerified({ verified: false }));
              dispatch(setPasscodeStatus({ isSet: false, isVerified: false }));

              // Reset component state
              setShowPasscodeEntry(false);
              setShowPasscodeSetup(false);
            } catch {
              await showDialog({
                title: 'Error',
                message: 'Failed to reset passcode. Please try again.',
                type: 'error',
                buttons: [{ text: 'OK' }]
              });
            }
          },
        },
      ]
    });
  };

  const handlePrivacyPolicyAccept = async () => {
    if (!userId) return;
    try {
      await privacyPolicyService.acceptPolicy();
      setPrivacyPolicyAccepted(true);
      setShowPrivacyPolicyModal(false);

      // Now check age verification (user-scoped)
      const ageKey = getAgeVerificationKey(userId);
      const verified = await AsyncStorage.getItem(ageKey);
      if (verified === 'true') {
        const timestampKey = getVerificationTimestampKey(userId);
        const timestamp = await AsyncStorage.getItem(timestampKey);
        dispatch(setAgeVerified({
          verified: true,
          timestamp: timestamp || undefined,
        }));

        const passcodeExists = await hasPasscode(userId);
        dispatch(setPasscodeStatus({
          isSet: passcodeExists,
          isVerified: false,
        }));

        if (passcodeExists) {
          setShowPasscodeEntry(true);
        } else {
          setShowPasscodeSetup(true);
        }
      }
    } catch {
      await showDialog({
        title: 'Error',
        message: 'Failed to accept privacy policy. Please try again.',
        type: 'error',
        buttons: [{ text: 'OK' }]
      });
    }
  };

  // Show loading while checking verification status
  if (isCheckingVerification) {
    return <DateMiLoadingScreen />;
  }

  // Show privacy policy modal if not accepted
  if (DATE_MI_PRIVACY_POLICY_GATE_ENABLED && (!privacyPolicyAccepted || showPrivacyPolicyModal)) {
    return (
      <>
        <DateMiLoadingScreen />
        <PrivacyPolicyModal
          visible={showPrivacyPolicyModal}
          onAccept={handlePrivacyPolicyAccept}
          isFirstView={true}
          showAcceptButton={true}
        />
      </>
    );
  }

  // Show age verification cover if not verified
  if (!isAgeVerified) {
    return <AgeVerificationCover onVerificationComplete={handleVerificationComplete} />;
  }
  
  // Show passcode setup if age verified but passcode not set
  if (isAgeVerified && showPasscodeSetup) {
    return <PasscodeSetup onSetupComplete={handlePasscodeSetupComplete} userId={userId} />;
  }
  
  // Show passcode entry if passcode is set but not verified
  if (isAgeVerified && showPasscodeEntry) {
    return (
      <PasscodeEntry
        onSuccess={handlePasscodeSuccess}
        onForgotPasscode={handleForgotPasscode}
        userId={userId}
      />
    );
  }

  // Show loading while loading Date Mi screen
  if (isLoading) {
    return <DateMiLoadingScreen />;
  }

  if (hasError || !LoadedComponent) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <LinearGradient
          colors={['#6B46C1', '#553C9A', '#4C1D95']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: 20 
        }}>
          <Text style={{ 
            fontSize: 24, 
            marginBottom: 16,
            textAlign: 'center' 
          }}>
            💔
          </Text>
          <Text style={{ 
            fontSize: 18, 
            fontWeight: 'bold', 
            color: '#FFFFFF',
            marginBottom: 8,
            textAlign: 'center' 
          }}>
            Date Mi Unavailable
          </Text>
          <Text style={{ 
            fontSize: 14, 
            color: 'rgba(255,255,255,0.8)',
            textAlign: 'center',
            lineHeight: 20 
          }}>
            Sorry, the dating features are currently unavailable. Please try again later.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <DateMiErrorBoundary>
      <>
        <LoadedComponent />
      </>
    </DateMiErrorBoundary>
  );
}

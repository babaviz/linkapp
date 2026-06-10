import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  RefreshControl, 
  StyleSheet, 
  Animated,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { signOut } from '../../redux/slices/authSlice';
import { initializeUserProfile } from '../../redux/slices/userSlice';
import { ProfileSettings } from '../../components/profile';
import { ProfileScreenProps } from '../../types/navigation';
import { formatLocationDisplay } from '../../utils/locationHelpers';
import { useCallback } from 'react';

export default function ProfileScreen({ navigation }: ProfileScreenProps<'ProfileMain'>) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentProfile } = useAppSelector((state) => state.user);
  const [showSettings, setShowSettings] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  // Initialize enhanced profile when auth user is available
  useEffect(() => {
    if (user && !currentProfile) {
      dispatch(initializeUserProfile(user));
    }
  }, [user, currentProfile, dispatch]);

  // Optimized focus effect - only refresh if user changed, not on every focus
  const previousUserIdRef = useRef<string | undefined>(undefined);
  const hasRefreshedRef = useRef(false);
  
  useFocusEffect(
    useCallback(() => {
      // Only refresh once per session, or if user ID changed
      if (user && (!hasRefreshedRef.current || user.id !== previousUserIdRef.current || !currentProfile)) {
        previousUserIdRef.current = user.id;
        hasRefreshedRef.current = true;
        
        // Defer refresh until after transition and only if needed
        const timeoutId = setTimeout(() => {
          if (user && (user.id === previousUserIdRef.current)) {
            // Only refresh enhanced profile, don't call getCurrentUser as it may cause navigation issues
            dispatch(initializeUserProfile(user));
          }
        }, 500);
        
        return () => {
          clearTimeout(timeoutId);
        };
      }
    }, [user, currentProfile, dispatch])
  );

  // Fast entrance animations for smooth transitions
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200, // Reduced from 600ms
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200, // Reduced from 500ms
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 150, // Increased tension for faster animation
        friction: 10, // Increased friction for snappier feel
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  const handleSignOut = () => {
    setShowSignOutDialog(true);
  };

  const confirmSignOut = () => {
    setShowSignOutDialog(false);
    dispatch(signOut());
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (user) {
        await dispatch(initializeUserProfile(user));
      }
    } catch {
      // Error refreshing profile
    } finally {
      setRefreshing(false);
    }
  };


  const ProfileOption = ({ icon, title, onPress, showArrow = true }: {
    icon: string;
    title: string;
    onPress: () => void;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity 
      style={styles.profileOption}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.profileOptionLeft}>
        <View style={styles.iconContainer}>
          <Text style={styles.optionIcon}>{icon}</Text>
        </View>
        <Text style={styles.optionTitle}>{title}</Text>
      </View>
      {showArrow && <Text style={styles.arrow}>›</Text>}
    </TouchableOpacity>
  );

  const StatusBadge = ({ label, status, type }: {
    label: string;
    status: string;
    type: 'warning' | 'info' | 'success';
  }) => {
    const badgeStyle = type === 'warning' ? styles.warningBadge : 
                      type === 'success' ? styles.successBadge : styles.infoBadge;
    const textStyle = type === 'warning' ? styles.warningText : 
                      type === 'success' ? styles.successText : styles.infoText;
    
    return (
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>{label}</Text>
        <View style={badgeStyle}>
          <Text style={[styles.statusText, textStyle]}>{status}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        {/* Sticky Profile Header */}
        <Animated.View 
          style={[
            styles.stickyProfileHeader,
            {
              transform: [{
                scale: scaleAnim.interpolate({
                  inputRange: [0.9, 1],
                  outputRange: [0.9, 1],
                  extrapolate: 'clamp'
                })
              }]
            }
          ]}
        >
          <View style={styles.avatarContainer}>
            {user?.profileImageUrl ? (
              <Image 
                source={{ uri: user.profileImageUrl }} 
                style={styles.avatar}
                onError={() => {
                  // Handle image load error gracefully
                }}
                key={user.profileImageUrl}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>👤</Text>
              </View>
            )}
            {(user?.kycStatus === 'verified' || currentProfile?.verified) && (
              <View style={styles.profileBadge}>
                <Text style={styles.badgeText}>✓</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.userName}>{user?.fullName || 'User Profile'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'Email not available'}</Text>
          
          {user?.location && (
            <View style={styles.locationContainer}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationText}>{formatLocationDisplay(user.location)}</Text>
            </View>
          )}
        </Animated.View>

        {/* Scrollable Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#6B7280']}
              tintColor="#6B7280"
              progressBackgroundColor="#ffffff"
            />
          }
        >
          {/* Profile Options */}
          <Animated.View style={[
            styles.section,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 20],
                  extrapolate: 'clamp'
                })
              }]
            }
          ]}>
            <Text style={styles.sectionTitle}>⚙️ Account Management</Text>
            <View style={styles.optionsContainer}>
              <ProfileOption 
                icon="📊" 
                title="My Dashboard" 
                onPress={() => navigation.navigate('UserDashboard')}
              />
              <ProfileOption 
                icon="🏠" 
                title="My Properties" 
                onPress={() => navigation.navigate('MyProperties')}
              />
              <ProfileOption 
                icon="✏️" 
                title="Edit Profile" 
                onPress={() => navigation.navigate('EditProfile')}
              />
              <ProfileOption 
                icon="🎁" 
                title="Referral Program" 
                onPress={() => navigation.navigate('ReferralProgram')}
              />
              <ProfileOption 
                icon="⚙️" 
                title="Settings & Privacy" 
                onPress={() => setShowSettings(true)}
              />
              <ProfileOption 
                icon="🔔" 
                title="Notification Settings" 
                onPress={() => navigation.navigate('NotificationSettings')}
              />
              <ProfileOption 
                icon="❓" 
                title="Help & Support" 
                onPress={() => navigation.navigate('HelpSupport')}
                showArrow={false}
              />
            </View>
          </Animated.View>

          {/* Account Status */}
          <Animated.View style={[
            styles.section,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 15],
                  extrapolate: 'clamp'
                })
              }]
            }
          ]}>
            <Text style={styles.sectionTitle}>🛡️ Account Status</Text>
            <View style={styles.statusContainer}>
              <StatusBadge 
                label="KYC Verification"
                status={user?.kycStatus === 'verified' ? 'Verified' : user?.kycStatus || 'Pending'}
                type={user?.kycStatus === 'verified' ? 'success' : 'warning'}
              />
              <StatusBadge 
                label="Creator Status"
                status={user?.creatorVerificationStatus === 'verified' ? 'Verified' : 'Not Applied'}
                type={user?.creatorVerificationStatus === 'verified' ? 'success' : 'info'}
              />
            </View>
          </Animated.View>


          {/* Sign Out */}
          <Animated.View style={[
            styles.signOutContainer,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 5],
                  extrapolate: 'clamp'
                })
              }]
            }
          ]}>
            <TouchableOpacity 
              style={styles.signOutButton}
              onPress={handleSignOut}
              activeOpacity={0.8}
            >
              <Text style={styles.signOutIcon}>👋</Text>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </Animated.View>
      
      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettings(false)}
      >
        <ProfileSettings onClose={() => setShowSettings(false)} />
      </Modal>

      {/* Sign Out Dialog */}
      <Modal
        visible={showSignOutDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSignOutDialog(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogContainer}>
            <View style={styles.dialogIconContainer}>
              <Text style={styles.dialogIcon}>👋</Text>
            </View>
            
            <Text style={styles.dialogTitle}>Sign Out</Text>
            <Text style={styles.dialogMessage}>
              Are you sure you want to sign out of LinkApp?
            </Text>
            
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={[styles.dialogButton, styles.cancelButton]}
                onPress={() => setShowSignOutDialog(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.dialogButton, styles.confirmButton]}
                onPress={confirmSignOut}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 80,
  },
  stickyProfileHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    backgroundColor: '#6B7280',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 42,
    color: '#ffffff',
  },
  profileBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    backgroundColor: '#10B981',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
    textAlign: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  optionsContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  profileOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  profileOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionIcon: {
    fontSize: 20,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  arrow: {
    fontSize: 20,
    color: '#9CA3AF',
    fontWeight: '300',
  },
  statusContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statusLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  successBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  infoBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  warningText: {
    color: '#D97706',
  },
  successText: {
    color: '#059669',
  },
  infoText: {
    color: '#2563EB',
  },
  signOutContainer: {
    marginTop: 8,
  },
  signOutButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  signOutIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  signOutText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dialogContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  dialogIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  dialogIcon: {
    fontSize: 36,
  },
  dialogTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  dialogMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  dialogButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  dialogButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButton: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

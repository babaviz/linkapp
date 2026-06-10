import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Switch, 
  ScrollView, 
  Alert, 
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { updateUserSettings } from '../../redux/slices/userSlice';
import { userProfileService } from '../../services/userProfileService';
import PrivacyPolicyModal from '../common/PrivacyPolicyModal';

interface ProfileSettingsProps {
  onClose?: () => void;
}

export default function ProfileSettings({ onClose }: ProfileSettingsProps) {
  const dispatch = useAppDispatch();
  const { currentProfile, isUpdatingProfile } = useAppSelector((state) => state.user);
  const [localSettings, setLocalSettings] = useState(currentProfile?.settings);
  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false);

  // Sync localSettings when currentProfile changes
  useEffect(() => {
    if (currentProfile?.settings) {
      setLocalSettings(currentProfile.settings);
    }
  }, [currentProfile?.settings]);

  if (!currentProfile || !localSettings) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No profile found</Text>
      </View>
    );
  }

  const handleSaveSettings = async () => {
    try {
      // Save to backend first
      const userId = currentProfile?.id || 'demo-user-123';
      const { error: backendError } = await userProfileService.updateUserSettings(
        userId,
        localSettings
      );

      if (backendError) {
        throw backendError;
      }

      // Then update Redux state
      await dispatch(updateUserSettings(localSettings)).unwrap();
      
      Alert.alert(
        '✅ Settings Updated',
        'Your settings have been updated successfully!',
        [
          { 
            text: 'OK', 
            onPress: () => onClose?.()
          }
        ]
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update settings. Please try again.';
      Alert.alert('❌ Error', errorMessage);
    }
  };

  const updateNotificationSetting = (category: string, value: boolean) => {
    setLocalSettings(prev => prev ? {
      ...prev,
      notifications: {
        ...prev.notifications,
        categories: {
          ...prev.notifications.categories,
          [category]: value,
        },
      },
    } : prev);
  };

  const updatePrivacySetting = (setting: string, value: boolean | string) => {
    setLocalSettings(prev => prev ? {
      ...prev,
      privacy: {
        ...prev.privacy,
        [setting]: value,
      },
    } : prev);
  };

  const SettingOption = ({ title, description, value, onValueChange, icon }: {
    title: string;
    description?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    icon: string;
  }) => (
    <View style={styles.settingOption}>
      <View style={styles.settingContent}>
        <View style={styles.settingLeft}>
          <View style={styles.settingIconContainer}>
            <Text style={styles.settingIcon}>{icon}</Text>
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>{title}</Text>
            {description && <Text style={styles.settingDescription}>{description}</Text>}
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#e5e7eb', true: '#3B82F6' }}
          thumbColor={value ? '#ffffff' : '#ffffff'}
          ios_backgroundColor="#e5e7eb"
        />
      </View>
    </View>
  );

  const NavigationOption = ({ title, value, onPress }: {
    title: string;
    value: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.navigationOption} onPress={onPress}>
      <Text style={styles.navigationTitle}>{title}</Text>
      <View style={styles.navigationRight}>
        <Text style={styles.navigationValue}>{value}</Text>
        <Text style={styles.navigationArrow}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => onClose?.()}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <Text style={styles.backButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>⚙️ Settings & Privacy</Text>
            
            <TouchableOpacity
              style={[
                styles.saveButton,
                isUpdatingProfile && styles.saveButtonDisabled
              ]}
              onPress={handleSaveSettings}
              disabled={isUpdatingProfile}
            >
              {isUpdatingProfile ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
          >

            {/* Notifications Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔔 Notifications</Text>
              
              <SettingOption
                title="Email Notifications"
                description="Receive notifications via email"
                value={localSettings.notifications.email}
                onValueChange={(value) => 
                  setLocalSettings(prev => prev ? {
                    ...prev,
                    notifications: { ...prev.notifications, email: value },
                  } : prev)
                }
                icon="📧"
              />
              
              <SettingOption
                title="Push Notifications"
                description="Receive push notifications on your device"
                value={localSettings.notifications.push}
                onValueChange={(value) => 
                  setLocalSettings(prev => prev ? {
                    ...prev,
                    notifications: { ...prev.notifications, push: value },
                  } : prev)
                }
                icon="📱"
              />
              
              <SettingOption
                title="SMS Notifications"
                description="Receive notifications via text message"
                value={localSettings.notifications.sms}
                onValueChange={(value) => 
                  setLocalSettings(prev => prev ? {
                    ...prev,
                    notifications: { ...prev.notifications, sms: value },
                  } : prev)
                }
                icon="💬"
              />
            </View>

            {/* Notification Categories */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 Notification Categories</Text>
              
              {Object.entries(localSettings.notifications.categories).map(([category, enabled]) => {
                const categoryIcons: Record<string, string> = {
                  messages: '💌',
                  matches: '💝',
                  updates: '🔄',
                  security: '🔒',
                  marketing: '📢'
                };
                
                return (
                  <SettingOption
                    key={category}
                    title={category.replace(/([A-Z])/g, ' $1').trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    value={enabled}
                    onValueChange={(value) => updateNotificationSetting(category, value)}
                    icon={categoryIcons[category] || '📝'}
                  />
                );
              })}
            </View>

            {/* Privacy Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔒 Privacy Settings</Text>
              
              <SettingOption
                title="Public Profile"
                description={localSettings.privacy.profileVisibility === 'public' 
                  ? 'Your profile is visible to everyone' 
                  : 'Your profile is only visible to you'}
                value={localSettings.privacy.profileVisibility === 'public'}
                onValueChange={(value) => 
                  updatePrivacySetting('profileVisibility', value ? 'public' : 'private')
                }
                icon="👁️"
              />
              
              <SettingOption
                title="Show Location"
                description="Allow others to see your location"
                value={localSettings.privacy.showLocation}
                onValueChange={(value) => updatePrivacySetting('showLocation', value)}
                icon="📍"
              />
              
              <SettingOption
                title="Show Online Status"
                description="Let others know when you're online"
                value={localSettings.privacy.showOnlineStatus}
                onValueChange={(value) => updatePrivacySetting('showOnlineStatus', value)}
                icon="🟢"
              />
              
              <SettingOption
                title="Allow Direct Messages"
                description="Receive messages from other users"
                value={localSettings.privacy.allowDirectMessages}
                onValueChange={(value) => updatePrivacySetting('allowDirectMessages', value)}
                icon="💌"
              />
            </View>

            {/* General Settings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚙️ General Settings</Text>
              
              <NavigationOption
                title="Language"
                value={localSettings.language === 'en' ? 'English' : localSettings.language}
                onPress={() => Alert.alert('Coming Soon', 'Language selection will be available in a future update.')}
              />
              
              <NavigationOption
                title="Theme"
                value={localSettings.theme.charAt(0).toUpperCase() + localSettings.theme.slice(1)}
                onPress={() => Alert.alert('Coming Soon', 'Theme selection will be available in a future update.')}
              />
            </View>


            {/* Legal & Privacy */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 Legal & Privacy</Text>
              
              <NavigationOption
                title="Privacy Policy"
                value="View"
                onPress={() => setShowPrivacyPolicyModal(true)}
              />
              
              <NavigationOption
                title="Terms of Service"
                value="View"
                onPress={() => Alert.alert('Coming Soon', 'Terms of Service will be available in a future update.')}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        visible={showPrivacyPolicyModal}
        onAccept={() => setShowPrivacyPolicyModal(false)}
        onClose={() => setShowPrivacyPolicyModal(false)}
        isFirstView={false}
        showAcceptButton={false}
      />
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 18,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
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
  settingOption: {
    marginBottom: 4,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingIcon: {
    fontSize: 20,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  navigationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  navigationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  navigationRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navigationValue: {
    fontSize: 16,
    color: '#6B7280',
    marginRight: 8,
  },
  navigationArrow: {
    fontSize: 20,
    color: '#9CA3AF',
    fontWeight: '300',
  },
});

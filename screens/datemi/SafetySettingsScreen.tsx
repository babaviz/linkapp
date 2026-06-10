import React, { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  Alert,
  StatusBar 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { updatePrivacySettings } from '../../redux/slices/datemiSlice';
import { RootStackParamList } from '../../navigation/AppNavigator';
import Material3Card from '../../components/common/Material3Card';
import Material3Button from '../../components/common/Material3Button';
import { useScreenshotPrevention } from '../../utils/dateMiSecurity';

type SafetySettingsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface SafetySettings {
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  showReadReceipts: boolean;
  allowMessageFromMatches: boolean;
  allowVideoCallRequests: boolean;
  hideFromNearbySearch: boolean;
  verifiedProfilesOnly: boolean;
  blockScreenshots: boolean;
  autoDeleteMessages: boolean;
  requirePhotoVerification: boolean;
}

export default function SafetySettingsScreen() {
  const navigation = useNavigation<SafetySettingsScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  
  const { myProfile } = useSelector((state: RootState) => state.datemi);
  
  // Initialize settings from profile or defaults
  useScreenshotPrevention(true);
  
  const [settings, setSettings] = useState<SafetySettings>({
    showOnlineStatus: myProfile?.privacySettings?.showOnlineStatus ?? true,
    showLastSeen: myProfile?.privacySettings?.showLastSeen ?? true,
    showReadReceipts: myProfile?.privacySettings?.showReadReceipts ?? true,
    allowMessageFromMatches: myProfile?.privacySettings?.allowMessageFromMatches ?? true,
    allowVideoCallRequests: myProfile?.privacySettings?.allowVideoCallRequests ?? false,
    hideFromNearbySearch: myProfile?.privacySettings?.hideFromNearbySearch ?? false,
    verifiedProfilesOnly: myProfile?.privacySettings?.verifiedProfilesOnly ?? false,
    blockScreenshots: myProfile?.privacySettings?.blockScreenshots ?? false,
    autoDeleteMessages: myProfile?.privacySettings?.autoDeleteMessages ?? false,
    requirePhotoVerification: myProfile?.privacySettings?.requirePhotoVerification ?? false,
  });

  const updateSetting = (key: keyof SafetySettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = () => {
    // Dispatch action to save settings
    dispatch(updatePrivacySettings(settings));
    Alert.alert('Settings Saved', 'Your privacy and safety settings have been updated.');
    navigation.goBack();
  };

  const handleBlockedUsers = () => {
    navigation.navigate('BlockedUsers' as any);
  };

  const handleReportUser = () => {
    Alert.alert(
      'Report a User',
      'If someone is making you uncomfortable or violating community guidelines, you can report them from their profile or message thread.',
      [{ text: 'OK' }]
    );
  };

  const handleSafetyTips = () => {
    Alert.alert(
      'Safety Tips',
      '• Never share personal information\n• Meet in public places\n• Trust your instincts\n• Use video calls before meeting\n• Report inappropriate behavior',
      [{ text: 'Got it' }]
    );
  };

  const renderSettingItem = (
    title: string,
    subtitle: string,
    key: keyof SafetySettings,
    iconName: string
  ) => (
    <Material3Card style={{ marginBottom: 12 }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        justifyContent: 'space-between'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <MaterialIcons name={iconName as any} size={24} color="#6B7280" style={{marginRight: 12}} />
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#111827',
              marginBottom: 4
            }}>
              {title}
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#6B7280',
              lineHeight: 20
            }}>
              {subtitle}
            </Text>
          </View>
        </View>
        <Switch
          value={settings[key]}
          onValueChange={(value) => updateSetting(key, value)}
          trackColor={{ false: '#E5E7EB', true: '#EF4444' }}
          thumbColor={settings[key] ? '#FFFFFF' : '#FFFFFF'}
        />
      </View>
    </Material3Card>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <LinearGradient
        colors={['#6B46C1', '#553C9A']}
        style={{ paddingBottom: 20 }}
      >
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: insets.top + 10,
          paddingBottom: 10
        }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16
            }}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#FFFFFF'
            }}>
              Privacy & Safety
            </Text>
            <Text style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.8)',
              marginTop: 2
            }}>
              Control your DateMi experience
            </Text>
          </View>
          
          <MaterialIcons name="security" size={24} color="#FFFFFF" />
        </View>
      </LinearGradient>

      <ScrollView 
        style={{ flex: 1, backgroundColor: '#F9FAFB' }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Visibility Settings */}
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: 16
        }}>
          Profile Visibility
        </Text>

        {renderSettingItem(
          'Show Online Status',
          'Let matches see when you\'re online',
          'showOnlineStatus',
          'radio-button-checked'
        )}

        {renderSettingItem(
          'Show Last Seen',
          'Display when you were last active',
          'showLastSeen',
          'visibility'
        )}

        {renderSettingItem(
          'Hide from Nearby Search',
          'Don\'t appear in location-based searches',
          'hideFromNearbySearch',
          'location-on'
        )}

        {/* Communication Settings */}
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: '#111827',
          marginTop: 24,
          marginBottom: 16
        }}>
          Communication
        </Text>

        {renderSettingItem(
          'Read Receipts',
          'Show when you\'ve read messages',
          'showReadReceipts',
          'menu-book'
        )}

        {renderSettingItem(
          'Messages from Matches Only',
          'Only allow messages from mutual matches',
          'allowMessageFromMatches',
          'message'
        )}

        {renderSettingItem(
          'Video Call Requests',
          'Allow matches to request video calls',
          'allowVideoCallRequests',
          'videocam'
        )}

        {renderSettingItem(
          'Auto-Delete Messages',
          'Messages disappear after 24 hours',
          'autoDeleteMessages',
          'schedule'
        )}

        {/* Safety & Verification */}
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: '#111827',
          marginTop: 24,
          marginBottom: 16
        }}>
          Safety & Verification
        </Text>

        {renderSettingItem(
          'Verified Profiles Only',
          'Only show verified user profiles',
          'verifiedProfilesOnly',
          'verified'
        )}

        {renderSettingItem(
          'Require Photo Verification',
          'Matches must verify their photos',
          'requirePhotoVerification',
          'photo-camera'
        )}

        {renderSettingItem(
          'Block Screenshots',
          'Prevent screenshots in video calls',
          'blockScreenshots',
          'block'
        )}

        {/* Action Buttons */}
        <View style={{ marginTop: 32 }}>
          <Material3Button
            onPress={handleSaveSettings}
            variant="filled"
            style={{ marginBottom: 16 }}
          >
            Save Settings
          </Material3Button>

          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            <Material3Button
              onPress={handleBlockedUsers}
              variant="outlined"
              style={{ flex: 1, marginRight: 8 }}
            >
              Blocked Users
            </Material3Button>
            <Material3Button
              onPress={handleReportUser}
              variant="outlined"
              style={{ flex: 1, marginLeft: 8 }}
            >
              Report User
            </Material3Button>
          </View>

          <Material3Button
            onPress={handleSafetyTips}
            variant="text"
            style={{ alignSelf: 'center' }}
          >
            Safety Tips
          </Material3Button>
        </View>

        {/* Help Text */}
        <Text style={{
          fontSize: 14,
          color: '#6B7280',
          textAlign: 'center',
          marginTop: 24,
          lineHeight: 20
        }}>
          Your safety is our priority. These settings help you control your DateMi experience and protect your privacy.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  Text,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabaseClient';
import notificationService from '../services/notificationService';
import { NotificationSettingsCard, NotificationPermissionBanner } from '../components/notifications';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationSettings } from '../types/notifications';
import { colors, commonStyles } from '../theme';
import SkeletonLoader from '../components/common/SkeletonLoader';

export default function NotificationSettingsScreen() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  const { permissionStatus } = useNotifications();

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    checkPermissionStatus();
  }, [permissionStatus]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        unsubscribe = subscribeToSettingsChanges(user.id);
      }
    };
    
    setupSubscription();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const checkPermissionStatus = () => {
    if (permissionStatus === 'denied' || permissionStatus === 'undetermined') {
      setShowPermissionBanner(true);
    } else {
      setShowPermissionBanner(false);
    }
  };

  const loadSettings = async () => {
    try {
      setLoading(true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setLoading(false);
        return;
      }

      const existingSettings = await notificationService.getNotificationSettings(user.id);
      
      if (existingSettings) {
        setSettings(existingSettings);
      } else {
        const defaultSettings: NotificationSettings = {
          userId: user.id,
          jobAlerts: true,
          messageNotifications: true,
          paymentAlerts: true,
          systemUpdates: true,
          marketingMessages: false,
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00',
          },
        };
        
        setSettings(defaultSettings);
        await notificationService.updateNotificationSettings(defaultSettings);
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to load notification settings. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const subscribeToSettingsChanges = (userId: string) => {
    const channel = supabase
      .channel(`notification_settings_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_settings',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updated = payload.new as any;
            setSettings({
              userId: updated.user_id,
              jobAlerts: updated.job_alerts,
              messageNotifications: updated.message_notifications,
              paymentAlerts: updated.payment_alerts,
              systemUpdates: updated.system_updates,
              marketingMessages: updated.marketing_messages,
              quietHours: {
                enabled: updated.quiet_hours_enabled,
                startTime: updated.quiet_hours_start,
                endTime: updated.quiet_hours_end,
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const handleSettingsChange = async (newSettings: NotificationSettings) => {
    const previousSettings = settings;
    try {
      setSettings(newSettings);
      await notificationService.updateNotificationSettings(newSettings);
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to update notification settings. Please try again.',
        [{ text: 'OK' }]
      );
      if (previousSettings) setSettings(previousSettings);
    }
  };

  const openAppSettings = async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Unable to open settings. Please open your device settings manually.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRequestPermission = async () => {
    try {
      const permission = await notificationService.requestPermissions();
      if (permission.status === 'granted') {
        setShowPermissionBanner(false);
        Alert.alert(
          'Success',
          'Notifications enabled! You will now receive important updates.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Permission Denied',
          'To receive notifications, please enable them in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: openAppSettings
            },
          ]
        );
      }
    } catch (error) {
      
      Alert.alert(
        'Error',
        'Failed to request notification permission. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleDismissPermissionBanner = () => {
    setShowPermissionBanner(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSettings();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              <SkeletonLoader width="100%" height={96} borderRadius={16} style={{ marginBottom: 16 }} />
              <SkeletonLoader width="70%" height={18} style={{ marginBottom: 12 }} />

              <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16 }}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <View
                    key={`notification-setting-skeleton-${index}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 14,
                      borderBottomWidth: index === 5 ? 0 : 1,
                      borderBottomColor: colors.border.light,
                    }}
                  >
                    <SkeletonLoader width="55%" height={14} />
                    <SkeletonLoader width={44} height={24} borderRadius={12} />
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.container}>
          <NotificationPermissionBanner
            visible={showPermissionBanner}
            onRequestPermission={handleRequestPermission}
            onDismiss={handleDismissPermissionBanner}
          />

          {settings && (
            <NotificationSettingsCard
              settings={settings}
              onSettingsChange={handleSettingsChange}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.text.secondary,
  },
});

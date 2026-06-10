import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../theme';
import { NotificationSettings } from '../../types/notifications';

interface NotificationSettingsCardProps {
  settings: NotificationSettings;
  onSettingsChange: (settings: NotificationSettings) => void;
}

export const NotificationSettingsCard: React.FC<NotificationSettingsCardProps> = ({
  settings,
  onSettingsChange,
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const updateSettings = (updates: Partial<NotificationSettings>) => {
    onSettingsChange({ ...settings, ...updates });
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <View style={styles.container}>

      {/* Main notification toggles */}
      <View style={styles.section}>
        <SettingsItem
          icon="briefcase-outline"
          label="Job Alerts"
          description="Notifications about new job opportunities"
          value={settings.jobAlerts}
          onValueChange={(value) => updateSettings({ jobAlerts: value })}
        />

        <SettingsItem
          icon="chatbubble-outline"
          label="Message Notifications"
          description="Chat messages and communications"
          value={settings.messageNotifications}
          onValueChange={(value) => updateSettings({ messageNotifications: value })}
        />

        <SettingsItem
          icon="card-outline"
          label="Payment Alerts"
          description="Payment confirmations and updates"
          value={settings.paymentAlerts}
          onValueChange={(value) => updateSettings({ paymentAlerts: value })}
        />

        <SettingsItem
          icon="information-circle-outline"
          label="System Updates"
          description="App updates and important announcements"
          value={settings.systemUpdates}
          onValueChange={(value) => updateSettings({ systemUpdates: value })}
        />

        <SettingsItem
          icon="megaphone-outline"
          label="Marketing Messages"
          description="Promotional offers and news"
          value={settings.marketingMessages}
          onValueChange={(value) => updateSettings({ marketingMessages: value })}
        />
      </View>

      {/* Quiet Hours Section */}
      <TouchableOpacity 
        style={styles.sectionHeader}
        onPress={() => toggleSection('quietHours')}
      >
        <View style={styles.sectionHeaderContent}>
          <Ionicons 
            name="moon-outline" 
            size={20} 
            color={colors.text.secondary} 
            style={styles.sectionIcon}
          />
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
        </View>
        <Ionicons 
          name={expandedSection === 'quietHours' ? "chevron-up" : "chevron-down"} 
          size={20} 
          color={colors.text.secondary} 
        />
      </TouchableOpacity>

      {expandedSection === 'quietHours' && (
        <View style={styles.expandedSection}>
          <SettingsItem
            label="Enable Quiet Hours"
            description="Mute notifications during specific times"
            value={settings.quietHours.enabled}
            onValueChange={(value) => 
              updateSettings({
                quietHours: { ...settings.quietHours, enabled: value }
              })
            }
          />
          
          {settings.quietHours.enabled && (
            <View style={styles.timeSettings}>
              <TimeSelector
                label="Start Time"
                time={settings.quietHours.startTime}
                onTimeChange={(time) =>
                  updateSettings({
                    quietHours: { ...settings.quietHours, startTime: time }
                  })
                }
              />
              
              <TimeSelector
                label="End Time"
                time={settings.quietHours.endTime}
                onTimeChange={(time) =>
                  updateSettings({
                    quietHours: { ...settings.quietHours, endTime: time }
                  })
                }
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
};

interface SettingsItemProps {
  icon?: string;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  label,
  description,
  value,
  onValueChange,
}) => (
  <View style={styles.settingsItem}>
    <View style={styles.settingsItemContent}>
      {icon && (
        <Ionicons 
          name={icon as any} 
          size={20} 
          color={colors.text.secondary} 
          style={styles.itemIcon}
        />
      )}
      <View style={styles.itemText}>
        <Text style={styles.itemLabel}>{label}</Text>
        <Text style={styles.itemDescription}>{description}</Text>
      </View>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.secondary[200], true: colors.primary[200] }}
      thumbColor={value ? colors.primary[600] : colors.secondary[400]}
    />
  </View>
);

interface TimeSelectorProps {
  label: string;
  time: string;
  onTimeChange: (time: string) => void;
}

const TimeSelector: React.FC<TimeSelectorProps> = ({
  label,
  time,
  onTimeChange,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(() => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  });

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (selectedDate) {
      setTempDate(selectedDate);
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      onTimeChange(timeString);
    }
  };

  const handlePress = () => {
    setShowPicker(true);
  };

  const handleClose = () => {
    setShowPicker(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <TouchableOpacity style={styles.timeSelector} onPress={handlePress}>
        <Text style={styles.timeSelectorLabel}>{label}</Text>
        <Text style={styles.timeSelectorValue}>{time}</Text>
      </TouchableOpacity>
      
      {showPicker && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
          themeVariant="light"
        />
      )}
      
      {showPicker && Platform.OS === 'ios' && (
        <View style={styles.iosPickerButtons}>
          <TouchableOpacity
            style={[styles.iosButton, styles.iosCancelButton]}
            onPress={handleClose}
          >
            <Text style={styles.iosButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iosButton, styles.iosDoneButton]}
            onPress={handleClose}
          >
            <Text style={[styles.iosButtonText, styles.iosDoneText]}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing[4],
    marginVertical: spacing[3],
    ...shadows.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  section: {
    padding: spacing[4],
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  settingsItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    marginRight: spacing[3],
  },
  itemText: {
    flex: 1,
  },
  itemLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing[1],
  },
  itemDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    backgroundColor: colors.secondary[50],
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: spacing[2],
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  expandedSection: {
    padding: spacing[4],
    backgroundColor: colors.secondary[25],
  },
  timeSettings: {
    flexDirection: 'row',
    gap: spacing[4],
    marginTop: spacing[3],
  },
  timeSelector: {
    flex: 1,
    backgroundColor: colors.card,
    padding: spacing[3],
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  timeSelectorLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing[1],
  },
  timeSelectorValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  iosPickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  iosButton: {
    flex: 1,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  iosCancelButton: {
    backgroundColor: colors.secondary[100],
  },
  iosDoneButton: {
    backgroundColor: colors.primary,
  },
  iosButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  iosDoneText: {
    color: '#FFFFFF',
  },
});

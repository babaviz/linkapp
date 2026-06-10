import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { jobService } from '../../services/jobService';
import { useAppSelector } from '../../redux/hooks';
import { spacing, fontSize } from '../../utils/responsive';
import { getUserFacingError } from '../../utils/userFacingError';

type CompanyProfileNavigationProp = StackNavigationProp<any>;

interface CompanyProfile {
  id?: string;
  user_id: string;
  company_name: string;
  industry: string;
  description: string;
  website: string;
  location: string;
  county: string;
  town: string;
  employee_count: string;
  founded_year: string;
  contact_email: string;
  contact_phone: string;
}

const INDUSTRIES = [
  'Construction & Building',
  'Agriculture & Farming',
  'Automotive & Mechanics',
  'Beauty & Personal Care',
  'Catering & Food Service',
  'Cleaning & Maintenance',
  'Electrical & Electronics',
  'Fashion & Tailoring',
  'Health & Medical',
  'Information Technology',
  'Manufacturing & Production',
  'Marketing & Sales',
  'Transportation & Logistics',
  'Business & Finance',
  'Creative & Design',
  'Education & Training',
  'Real Estate',
  'Retail & Wholesale',
  'Security & Safety',
  'Other',
];

const EMPLOYEE_COUNTS = [
  '1-5',
  '6-10',
  '11-25',
  '26-50',
  '51-100',
  '101-250',
  '250+',
];

const emptyProfile: CompanyProfile = {
  user_id: '',
  company_name: '',
  industry: '',
  description: '',
  website: '',
  location: '',
  county: '',
  town: '',
  employee_count: '',
  founded_year: '',
  contact_email: '',
  contact_phone: '',
};

export default function CompanyProfileScreen() {
  const navigation = useNavigation<CompanyProfileNavigationProp>();
  const { user } = useAppSelector(state => state.auth);

  const [profile, setProfile] = useState<CompanyProfile>({ ...emptyProfile });
  const [isExisting, setIsExisting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [stats, setStats] = useState({ totalJobs: 0, activeJobs: 0, totalApplications: 0 });

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [user?.id])
  );

  const loadProfile = async () => {
    if (!user?.id) {
      setError('Please log in to manage your company profile.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [existing, employerStats] = await Promise.all([
        jobService.getCompanyProfile(user.id),
        jobService.getEmployerStats(user.id),
      ]);

      setStats(employerStats);

      if (existing) {
        setProfile({
          id: existing.id,
          user_id: existing.user_id,
          company_name: existing.company_name || '',
          industry: existing.industry || '',
          description: existing.description || '',
          website: existing.website || '',
          location: existing.location || '',
          county: existing.county || '',
          town: existing.town || '',
          employee_count: existing.employee_count || '',
          founded_year: existing.founded_year?.toString() || '',
          contact_email: existing.contact_email || '',
          contact_phone: existing.contact_phone || '',
        });
        setIsExisting(true);
      } else {
        setProfile({
          ...emptyProfile,
          user_id: user.id,
          contact_email: user.email || '',
        });
        setIsExisting(false);
      }
      setHasChanges(false);
    } catch (err) {
      setError('Failed to load company profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof CompanyProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!profile.company_name.trim()) {
      Alert.alert('Missing Information', 'Please enter your company name.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        company_name: profile.company_name.trim(),
        industry: profile.industry || null,
        description: profile.description.trim() || null,
        website: profile.website.trim() || null,
        location: profile.county
          ? `${profile.county}${profile.town ? `, ${profile.town}` : ''}`
          : null,
        county: profile.county.trim() || null,
        town: profile.town.trim() || null,
        employee_count: profile.employee_count || null,
        founded_year: profile.founded_year ? parseInt(profile.founded_year) : null,
        contact_email: profile.contact_email.trim() || null,
        contact_phone: profile.contact_phone.trim() || null,
      };

      if (isExisting) {
        await jobService.updateCompanyProfile(user!.id, payload);
      } else {
        await jobService.createCompanyProfile({
          user_id: user!.id,
          company_name: payload.company_name as string,
          industry: payload.industry as string | undefined,
          description: payload.description as string | undefined,
          website: payload.website as string | undefined,
          location: payload.location as string | undefined,
          county: payload.county as string | undefined,
          town: payload.town as string | undefined,
          employee_count: payload.employee_count as string | undefined,
          founded_year: payload.founded_year as number | undefined,
          contact_email: payload.contact_email as string | undefined,
          contact_phone: payload.contact_phone as string | undefined,
        });
        setIsExisting(true);
      }

      setHasChanges(false);
      Alert.alert(
        'Profile Saved',
        isExisting
          ? 'Your company profile has been updated.'
          : 'Your company profile has been created. It will be used when posting jobs.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      const friendly = getUserFacingError(err, {
        action: 'save your company profile',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <LinearGradient colors={['#1E40AF', '#1E3A8A', '#172554']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.loadingText}>Loading company profile...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={['#1E40AF', '#1E3A8A', '#172554']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />
          <View style={styles.centerContainer}>
            <MaterialIcons name="error-outline" size={48} color="rgba(255,255,255,0.8)" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadProfile} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1E40AF', '#1E3A8A', '#172554']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Company Profile</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving || !hasChanges}
              style={[
                styles.saveButton,
                (!hasChanges || isSaving) && styles.saveButtonDisabled,
              ]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Save company profile"
              accessibilityState={{ disabled: isSaving || !hasChanges }}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#1E40AF" />
              ) : (
                <View style={styles.saveButtonContent}>
                  <MaterialIcons
                    name="save"
                    size={18}
                    color={!hasChanges ? 'rgba(30, 64, 175, 0.75)' : '#1E40AF'}
                  />
                  <Text
                    style={[
                      styles.saveButtonText,
                      !hasChanges && styles.saveButtonTextDisabled,
                    ]}
                  >
                    Save
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Company Header */}
          <View style={styles.profileSummary}>
            <View style={styles.companyIcon}>
              <MaterialIcons name="business" size={28} color="#1E40AF" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.companyName} numberOfLines={1}>
                {profile.company_name || 'Set Up Your Company'}
              </Text>
              <Text style={styles.companySubtitle}>
                {profile.industry || 'Add your industry'}
                {profile.county ? ` - ${profile.county}` : ''}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalJobs}</Text>
              <Text style={styles.statLabel}>Jobs Posted</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.activeJobs}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalApplications}</Text>
              <Text style={styles.statLabel}>Applications</Text>
            </View>
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Basic Information */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="business" size={20} color="#1E40AF" />
                <Text style={styles.sectionTitle}>Basic Information</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Company Name *</Text>
                <TextInput
                  value={profile.company_name}
                  onChangeText={(v) => updateField('company_name', v)}
                  placeholder="e.g., Nairobi Construction Co."
                  placeholderTextColor="#9CA3AF"
                  style={styles.textInput}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Industry</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginHorizontal: -spacing.lg }}
                  contentContainerStyle={{ paddingHorizontal: spacing.lg }}
                >
                  <View style={styles.chipRow}>
                    {INDUSTRIES.map((ind) => (
                      <TouchableOpacity
                        key={ind}
                        onPress={() => updateField('industry', profile.industry === ind ? '' : ind)}
                        style={[
                          styles.selectChip,
                          {
                            backgroundColor: profile.industry === ind ? '#1E40AF' : '#FFFFFF',
                            borderColor: profile.industry === ind ? '#1E40AF' : '#D1D5DB',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.selectChipText,
                            { color: profile.industry === ind ? '#FFFFFF' : '#374151' },
                          ]}
                        >
                          {ind}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>About the Company</Text>
                <TextInput
                  value={profile.description}
                  onChangeText={(v) => updateField('description', v)}
                  placeholder="Describe what your company does, your mission, and what makes you unique..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  style={[styles.textInput, styles.textArea]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Website</Text>
                <TextInput
                  value={profile.website}
                  onChangeText={(v) => updateField('website', v)}
                  placeholder="https://www.example.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="url"
                  autoCapitalize="none"
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* Location & Size */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="location-on" size={20} color="#1E40AF" />
                <Text style={styles.sectionTitle}>Location & Size</Text>
              </View>

              <View style={styles.fieldRow}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>County</Text>
                  <TextInput
                    value={profile.county}
                    onChangeText={(v) => updateField('county', v)}
                    placeholder="e.g., Nairobi"
                    placeholderTextColor="#9CA3AF"
                    style={styles.textInput}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Town</Text>
                  <TextInput
                    value={profile.town}
                    onChangeText={(v) => updateField('town', v)}
                    placeholder="e.g., Westlands"
                    placeholderTextColor="#9CA3AF"
                    style={styles.textInput}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Number of Employees</Text>
                <View style={styles.chipRow}>
                  {EMPLOYEE_COUNTS.map((count) => (
                    <TouchableOpacity
                      key={count}
                      onPress={() => updateField('employee_count', profile.employee_count === count ? '' : count)}
                      style={[
                        styles.selectChip,
                        {
                          backgroundColor: profile.employee_count === count ? '#1E40AF' : '#FFFFFF',
                          borderColor: profile.employee_count === count ? '#1E40AF' : '#D1D5DB',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectChipText,
                          { color: profile.employee_count === count ? '#FFFFFF' : '#374151' },
                        ]}
                      >
                        {count}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Founded Year</Text>
                <TextInput
                  value={profile.founded_year}
                  onChangeText={(v) => updateField('founded_year', v)}
                  placeholder="e.g., 2015"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={4}
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* Contact Information */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="contacts" size={20} color="#1E40AF" />
                <Text style={styles.sectionTitle}>Contact Information</Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Contact Email</Text>
                <TextInput
                  value={profile.contact_email}
                  onChangeText={(v) => updateField('contact_email', v)}
                  placeholder="jobs@company.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.textInput}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Contact Phone</Text>
                <TextInput
                  value={profile.contact_phone}
                  onChangeText={(v) => updateField('contact_phone', v)}
                  placeholder="+254 7XX XXX XXX"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="flash-on" size={20} color="#1E40AF" />
                <Text style={styles.sectionTitle}>Quick Actions</Text>
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('PostJob')}
                style={styles.actionButton}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
                  <MaterialIcons name="add-circle-outline" size={20} color="#059669" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Post a New Job</Text>
                  <Text style={styles.actionSubtitle}>
                    Your company details will be auto-filled
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('MyPostings')}
                style={styles.actionButton}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}>
                  <MaterialIcons name="list-alt" size={20} color="#1E40AF" />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>My Job Postings</Text>
                  <Text style={styles.actionSubtitle}>
                    {stats.activeJobs} active, {stats.totalJobs - stats.activeJobs} closed
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Save Button (bottom) */}
            {hasChanges && (
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                style={styles.bottomSaveButton}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.bottomSaveRow}>
                    <MaterialIcons name="save" size={20} color="#FFFFFF" />
                    <Text style={styles.bottomSaveText}>Save Company Profile</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    fontSize: fontSize.base,
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: fontSize.base,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    color: 'white',
    fontSize: fontSize.base,
    fontWeight: '600',
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backButton: {
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderColor: 'rgba(255,255,255,0.55)',
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saveButtonText: {
    color: '#1E40AF',
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  saveButtonTextDisabled: {
    color: 'rgba(30, 64, 175, 0.75)',
  },

  // Profile Summary
  profileSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  companyIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  companySubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Section Card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: 'bold',
    color: '#111827',
  },

  // Fields
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing.sm,
  },
  fieldRow: {
    flexDirection: 'row',
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: fontSize.base,
    color: '#111827',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  selectChipText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },

  // Actions
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#111827',
  },
  actionSubtitle: {
    fontSize: fontSize.sm,
    color: '#6B7280',
    marginTop: 2,
  },

  // Bottom Save
  bottomSaveButton: {
    backgroundColor: '#1E40AF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bottomSaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomSaveText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});

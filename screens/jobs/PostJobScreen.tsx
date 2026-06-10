import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StatusBar, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SKILL_CATEGORIES } from '../../config/constants';
import { 
  spacing,
  fontSize
} from '../../utils/responsive';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { createJob } from '../../redux/slices/jobSlice';
import { jobService } from '../../services/jobService';
import { categoryCountService } from '../../services/categoryCountService';
import type { JobsStackParamList } from '../../navigation/JobsStackNavigator';
import type { JobType, ExperienceLevel } from '../../types/job';
import { getUserFacingError } from '../../utils/userFacingError';

type PostJobNavigationProp = StackNavigationProp<JobsStackParamList>;

const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
  { value: 'temporary', label: 'Temporary' },
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'senior', label: 'Senior' },
  { value: 'expert', label: 'Expert' },
];

export default function PostJobScreen() {
  const navigation = useNavigation<PostJobNavigationProp>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  
  const [isPosting, setIsPosting] = useState(false);
  const [companyLoaded, setCompanyLoaded] = useState(false);
  const [companyName, setCompanyName] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    salary: '',
    category: '',
    jobType: 'full_time' as JobType,
    experienceLevel: 'intermediate' as ExperienceLevel,
    skills: '',
    benefits: '',
  });

  // Auto-populate location from company profile
  useEffect(() => {
    loadCompanyProfile();
  }, [user?.id]);

  const loadCompanyProfile = async () => {
    if (!user?.id) return;
    try {
      const profile = await jobService.getCompanyProfile(user.id);
      if (profile) {
        setCompanyName(profile.company_name || '');
        if (profile.county && !formData.location) {
          setFormData(prev => ({
            ...prev,
            location: profile.county + (profile.town ? `, ${profile.town}` : ''),
          }));
        }
      }
      setCompanyLoaded(true);
    } catch {
      setCompanyLoaded(true);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePostJob = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Missing Information', 'Please enter a job title.');
      return;
    }
    if (!formData.description.trim()) {
      Alert.alert('Missing Information', 'Please enter a job description.');
      return;
    }
    if (!formData.category) {
      Alert.alert('Missing Information', 'Please select a job category.');
      return;
    }

    setIsPosting(true);
    try {
      if (!user?.id) {
        const friendly = getUserFacingError(new Error('Not authenticated'), {
          action: 'post a job',
          displayStyle: 'alert',
        });
        Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
        return;
      }

      const employerId = user.id;
      const salaryMatch = formData.salary.match(/(\d+[,.]?\d*)/g);
      const min = salaryMatch && salaryMatch[0] ? parseInt(salaryMatch[0].replace(/[,.]/g, ''), 10) : 25000;
      const max = salaryMatch && salaryMatch[1] ? parseInt(salaryMatch[1].replace(/[,.]/g, ''), 10) : min;

      // Parse skills from comma-separated input
      const skillsList = formData.skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const jobPayload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        job_type: formData.jobType,
        experience_level: formData.experienceLevel,
        location: {
          county: formData.location.split(',')[0]?.trim() || 'Nairobi',
          town: formData.location.split(',')[1]?.trim() || '',
          remote: false,
          onsite: true,
        },
        salary: {
          min,
          max,
          currency: 'KSH' as const,
          period: 'monthly' as const,
        },
        requirements: skillsList.map(skill => ({
          skill,
          level: 'intermediate' as const,
          required: true,
        })),
        benefits: formData.benefits
          .split(',')
          .map(b => b.trim())
          .filter(Boolean),
      };

      const created = await dispatch(createJob({ jobData: jobPayload, employerId })).unwrap();
      categoryCountService.clearCache();

      Alert.alert(
        'Job Posted Successfully!',
        `"${created.title}" is now live.`,
        [
          {
            text: 'Go to Jobs',
            onPress: () => navigation.navigate('JobsMain'),
          },
          {
            text: 'View My Postings',
            onPress: () => navigation.navigate('MyPostings'),
          },
          {
            text: 'Post Another',
            style: 'cancel',
            onPress: () => {
              setFormData({
                title: '',
                description: '',
                location: formData.location,
                salary: '',
                category: '',
                jobType: 'full_time',
                experienceLevel: 'intermediate',
                skills: '',
                benefits: '',
              });
            },
          },
        ]
      );
    } catch (err) {
      const friendly = getUserFacingError(err, {
        action: 'post this job',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      {/* Header */}
      <View style={styles.headerBar}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post a Job</Text>
          <View style={{ width: 40 }} />
        </View>
        {companyName ? (
          <View style={styles.companyBanner}>
            <Icon name="business" size={16} color="#059669" />
            <Text style={styles.companyBannerText}>Posting as {companyName}</Text>
          </View>
        ) : companyLoaded ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('CompanyProfile')}
            style={styles.setupBanner}
          >
            <Icon name="info-outline" size={16} color="#D97706" />
            <Text style={styles.setupBannerText}>
              Set up your company profile for better visibility
            </Text>
            <Icon name="chevron-right" size={16} color="#D97706" />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Job Title */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Job Title *</Text>
          <TextInput
            value={formData.title}
            onChangeText={(v) => handleInputChange('title', v)}
            placeholder="e.g. Senior Mason, Plumber, Electrician"
            placeholderTextColor="#9CA3AF"
            style={styles.textInput}
          />
        </View>

        {/* Job Description */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Job Description *</Text>
          <TextInput
            value={formData.description}
            onChangeText={(v) => handleInputChange('description', v)}
            placeholder="Describe the role, responsibilities, and requirements..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            style={[styles.textInput, styles.textArea]}
          />
        </View>

        {/* Job Category */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Job Category *</Text>
            <View style={styles.chipRow}>
              {Object.values(SKILL_CATEGORIES).map((category) => (
                <TouchableOpacity
                  key={category}
                  onPress={() => handleInputChange('category', category)}
                  style={[
                    styles.selectChip,
                    {
                      backgroundColor: formData.category === category ? '#059669' : '#FFFFFF',
                      borderColor: formData.category === category ? '#059669' : '#D1D5DB',
                    },
                  ]}
                >
                  <Text style={{
                    fontSize: fontSize.sm,
                    fontWeight: '500',
                    color: formData.category === category ? 'white' : '#374151',
                  }}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
        </View>

        {/* Location */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Location</Text>
          <TextInput
            value={formData.location}
            onChangeText={(v) => handleInputChange('location', v)}
            placeholder="e.g. Nairobi, Westlands"
            placeholderTextColor="#9CA3AF"
            style={styles.textInput}
          />
        </View>

        {/* Salary Range */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Salary Range (KSH)</Text>
          <TextInput
            value={formData.salary}
            onChangeText={(v) => handleInputChange('salary', v)}
            placeholder="e.g. 30,000 - 50,000 per month"
            placeholderTextColor="#9CA3AF"
            style={styles.textInput}
            keyboardType="numeric"
          />
        </View>

        {/* Job Type */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Job Type</Text>
          <View style={styles.chipRow}>
            {JOB_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                onPress={() => handleInputChange('jobType', type.value)}
                style={[
                  styles.selectChip,
                  {
                    backgroundColor: formData.jobType === type.value ? '#059669' : '#FFFFFF',
                    borderColor: formData.jobType === type.value ? '#059669' : '#D1D5DB',
                  },
                ]}
              >
                <Text style={{
                  fontSize: fontSize.sm,
                  fontWeight: '500',
                  color: formData.jobType === type.value ? 'white' : '#374151',
                }}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Experience Level */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Experience Level</Text>
          <View style={styles.chipRow}>
            {EXPERIENCE_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                onPress={() => handleInputChange('experienceLevel', level.value)}
                style={[
                  styles.selectChip,
                  {
                    backgroundColor: formData.experienceLevel === level.value ? '#059669' : '#FFFFFF',
                    borderColor: formData.experienceLevel === level.value ? '#059669' : '#D1D5DB',
                  },
                ]}
              >
                <Text style={{
                  fontSize: fontSize.sm,
                  fontWeight: '500',
                  color: formData.experienceLevel === level.value ? 'white' : '#374151',
                }}>
                  {level.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Required Skills */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Required Skills</Text>
          <TextInput
            value={formData.skills}
            onChangeText={(v) => handleInputChange('skills', v)}
            placeholder="e.g. Bricklaying, Concrete Work, Stone Masonry"
            placeholderTextColor="#9CA3AF"
            style={styles.textInput}
          />
          <Text style={styles.fieldHint}>Separate multiple skills with commas</Text>
        </View>

        {/* Benefits */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Benefits</Text>
          <TextInput
            value={formData.benefits}
            onChangeText={(v) => handleInputChange('benefits', v)}
            placeholder="e.g. Transport Allowance, Medical Cover, Overtime Pay"
            placeholderTextColor="#9CA3AF"
            style={styles.textInput}
          />
          <Text style={styles.fieldHint}>Separate multiple benefits with commas</Text>
        </View>

        {/* Post Job Button */}
        <TouchableOpacity
          onPress={handlePostJob}
          disabled={isPosting}
          style={[styles.postButton, isPosting && { opacity: 0.7 }]}
          activeOpacity={0.8}
        >
          {isPosting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.postButtonInner}>
              <Icon name="work" size={20} color="#FFFFFF" />
              <Text style={styles.postButtonText}>Post Job</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            onPress={() => navigation.navigate('MyPostings')}
            style={styles.actionRow}
            activeOpacity={0.8}
          >
            <Icon name="list-alt" size={20} color="#059669" style={{ marginRight: spacing.md }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>View My Job Postings</Text>
              <Text style={styles.actionSubtitle}>Manage your existing job posts</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('CompanyProfile')}
            style={styles.actionRow}
            activeOpacity={0.8}
          >
            <Icon name="business" size={20} color="#1E40AF" style={{ marginRight: spacing.md }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Company Profile</Text>
              <Text style={styles.actionSubtitle}>Update your company details</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    borderRadius: 9999,
    backgroundColor: '#F3F4F6',
    padding: 8,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: '#111827',
  },
  companyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: spacing.sm,
    gap: 8,
  },
  companyBannerText: {
    fontSize: fontSize.sm,
    color: '#059669',
    fontWeight: '500',
  },
  setupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: spacing.sm,
    gap: 6,
  },
  setupBannerText: {
    fontSize: fontSize.sm,
    color: '#D97706',
    fontWeight: '500',
    flex: 1,
  },

  // Form fields
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing.sm,
  },
  fieldHint: {
    fontSize: fontSize.xs,
    color: '#9CA3AF',
    marginTop: 4,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
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
    gap: spacing.sm,
  },
  chipRowHorizontal: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  selectChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 24,
    borderWidth: 1,
  },

  // Post Button
  postButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: 56,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  postButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  postButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: fontSize.lg,
  },

  // Quick Actions
  quickActions: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  quickActionsTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing.md,
  },
  actionRow: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.sm,
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
});

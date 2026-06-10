import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StatusBar, Modal , StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { JobPosting, JobType, ExperienceLevel, SkillLevel } from '../../types/job';
import { SKILL_CATEGORIES } from '../../config/constants';
import { 
  getDynamicDimensions, 
  getResponsiveMargin, 
  getResponsivePadding, 
  spacing,
  fontSize
} from '../../utils/responsive';
import { useAppDispatch } from '../../redux/hooks';
import { updateJob } from '../../redux/slices/jobSlice';
import { jobService } from '../../services/jobService';
import { getUserFacingError } from '../../utils/userFacingError';

type EditJobRouteProp = RouteProp<{ params: { jobId: string } }, 'params'>;
type EditJobNavigationProp = StackNavigationProp<any>;

interface JobRequirement {
  skill: string;
  level: SkillLevel;
  required: boolean;
}

export default function EditJobScreen() {
  const route = useRoute<EditJobRouteProp>();
  const navigation = useNavigation<EditJobNavigationProp>();
  
  const { jobId } = route.params;
  const { width: screenWidth, isTablet } = getDynamicDimensions();
  const dispatch = useAppDispatch();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddRequirementModal, setShowAddRequirementModal] = useState(false);
  
  const [jobData, setJobData] = useState<Partial<JobPosting>>({
    title: '',
    description: '',
    job_type: 'full_time',
    experience_level: 'intermediate',
    location: {
      county: '',
      town: '',
      remote: false,
      onsite: true
    },
    salary: {
      min: 25000,
      max: 50000,
      currency: 'KSH',
      period: 'monthly'
    },
    category: '',
    requirements: [],
    benefits: []
  });

  const [newRequirement, setNewRequirement] = useState<JobRequirement>({
    skill: '',
    level: 'intermediate',
    required: true
  });

  const [newBenefit, setNewBenefit] = useState('');


  useEffect(() => {
    loadJobData();
  }, [jobId]);

  const loadJobData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const job = await jobService.getJobById(jobId);
      if (job) {
        setJobData(job);
      } else {
        setError('Job not found');
      }
    } catch (error) {
      console.error('Failed to load job data:', error);
      setError('Failed to load job data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!jobData.title?.trim()) {
      Alert.alert('Missing information', 'Please enter a job title.');
      return;
    }
    if (!jobData.description?.trim()) {
      Alert.alert('Missing information', 'Please enter a job description.');
      return;
    }
    if (!jobData.location?.county || !jobData.location?.town) {
      Alert.alert('Missing information', 'Please enter location details.');
      return;
    }
    if (!jobData.category) {
      Alert.alert('Missing information', 'Please select a category.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await dispatch(updateJob({ id: jobId, updates: jobData })).unwrap();
      
      Alert.alert(
        'Success',
        'Job posting updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error: any) {
      
      const friendly = getUserFacingError(error, {
        action: 'update this job posting',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRequirement = () => {
    if (!newRequirement.skill.trim()) {
      Alert.alert('Missing information', 'Please enter a skill name.');
      return;
    }

    const requirement: JobRequirement = {
      skill: newRequirement.skill.trim(),
      level: newRequirement.level,
      required: newRequirement.required
    };

    setJobData(prev => ({
      ...prev,
      requirements: [...(prev.requirements || []), requirement]
    }));

    setNewRequirement({
      skill: '',
      level: 'intermediate',
      required: true
    });
    setShowAddRequirementModal(false);
  };

  const handleRemoveRequirement = (index: number) => {
    setJobData(prev => ({
      ...prev,
      requirements: prev.requirements?.filter((_, i) => i !== index) || []
    }));
  };

  const handleAddBenefit = () => {
    if (!newBenefit.trim()) return;
    
    setJobData(prev => ({
      ...prev,
      benefits: [...(prev.benefits || []), newBenefit.trim()]
    }));
    setNewBenefit('');
  };

  const handleRemoveBenefit = (index: number) => {
    setJobData(prev => ({
      ...prev,
      benefits: prev.benefits?.filter((_, i) => i !== index) || []
    }));
  };

  const AddRequirementModal = () => (
    <Modal
      visible={showAddRequirementModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAddRequirementModal(false)}
    >
      <SafeAreaView style={styles.style1}>
        <View style={[styles.style2, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
          <View style={styles.style3}>
            <TouchableOpacity onPress={() => setShowAddRequirementModal(false)}>
              <Text style={{ color: '#059669', fontWeight: '600', fontSize: fontSize.base }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827' }}>
              Add Requirement
            </Text>
            <TouchableOpacity onPress={handleAddRequirement}>
              <Text style={{ color: '#059669', fontWeight: '600', fontSize: fontSize.base }}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={[styles.style4, { padding: spacing.lg }]}>
          {/* Skill Name */}
          <View style={styles.style5}>
            <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#111827', marginBottom: spacing.sm }}>
              Skill Name
            </Text>
            <TextInput
              value={newRequirement.skill}
              onChangeText={(text) => setNewRequirement(prev => ({ ...prev, skill: text }))}
              placeholder="e.g., Bricklaying, Pipe Installation"
              style={[styles.style6, {
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                fontSize: fontSize.base,
                color: '#111827'
              }]}
            />
          </View>

          {/* Skill Level */}
          <View style={styles.style5}>
            <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#111827', marginBottom: spacing.sm }}>
              Required Level
            </Text>
            <View style={[styles.style7, { gap: spacing.sm }]}>
              {(['beginner', 'intermediate', 'advanced', 'expert'] as SkillLevel[]).map((level) => (
                <TouchableOpacity
                  key={level}
                  onPress={() => setNewRequirement(prev => ({ ...prev, level }))}
                  style={[
                    styles.skillLevelButton,
                    {
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      backgroundColor: newRequirement.level === level ? '#059669' : '#FFFFFF',
                      borderColor: newRequirement.level === level ? '#059669' : '#D1D5DB'
                    }
                  ]}
                >
                  <Text style={{
                    fontSize: fontSize.sm,
                    fontWeight: '500',
                    textTransform: 'capitalize',
                    color: newRequirement.level === level ? 'white' : '#374151'
                  }}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Required */}
          <View style={styles.style5}>
            <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#111827', marginBottom: spacing.sm }}>
              Requirement Type
            </Text>
            <View style={[styles.style8, { gap: spacing.sm }]}>
              <TouchableOpacity
                onPress={() => setNewRequirement(prev => ({ ...prev, required: true }))}
                style={[
                  styles.requirementTypeButton,
                  {
                    paddingVertical: spacing.md,
                    backgroundColor: newRequirement.required ? '#FEE2E2' : '#FFFFFF',
                    borderColor: newRequirement.required ? '#FECACA' : '#D1D5DB'
                  }
                ]}
              >
                <Text style={{
                  fontSize: fontSize.sm,
                  fontWeight: '500',
                  textAlign: 'center',
                  color: newRequirement.required ? '#DC2626' : '#374151'
                }}>
                  Required
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setNewRequirement(prev => ({ ...prev, required: false }))}
                style={[
                  styles.requirementTypeButton,
                  {
                    paddingVertical: spacing.md,
                    backgroundColor: !newRequirement.required ? '#EFF6FF' : '#FFFFFF',
                    borderColor: !newRequirement.required ? '#BFDBFE' : '#D1D5DB'
                  }
                ]}
              >
                <Text style={{
                  fontSize: fontSize.sm,
                  fontWeight: '500',
                  textAlign: 'center',
                  color: !newRequirement.required ? '#2563EB' : '#374151'
                }}>
                  Preferred
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.style1}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.style9}>
          <Text style={{ fontSize: fontSize.lg, color: '#6B7280' }}>Loading job details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.style1}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.style9}>
          <Text style={{ fontSize: fontSize.lg, color: '#DC2626', textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity
            onPress={loadJobData}
            style={{
              backgroundColor: '#059669',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
              marginTop: 16
            }}
          >
            <Text style={{ color: 'white', fontSize: fontSize.base, fontWeight: '600' }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.style1}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <AddRequirementModal />
      
      {/* Header */}
      <View style={[styles.style2, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
        <View style={styles.style3}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.style10}
          >
            <MaterialIcons name="arrow-back" size={fontSize.lg} color="#1F2937" />
          </TouchableOpacity>
          <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827' }}>
            Edit Job Posting
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            style={{
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: isSaving ? '#9CA3AF' : '#059669'
            }}
          >
            <Text style={{ color: 'white', fontSize: fontSize.sm, fontWeight: '600' }}>
              {isSaving ? 'Updating...' : 'Update Job'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={[styles.style4, { padding: spacing.lg }]}>
        {/* Basic Information */}
        <View style={[styles.style11, { padding: spacing.lg }]}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827', marginBottom: spacing.md }}>
            Basic Information
          </Text>
          
          {/* Job Title */}
          <View style={styles.style12}>
            <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#111827', marginBottom: spacing.sm }}>
              Job Title *
            </Text>
            <TextInput
              value={jobData.title}
              onChangeText={(text) => setJobData(prev => ({ ...prev, title: text }))}
              placeholder="e.g., Senior Mason, Plumber, Electrician"
              style={[styles.style13, {
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                fontSize: fontSize.base,
                color: '#111827'
              }]}
            />
          </View>

          {/* Job Description */}
          <View style={styles.style12}>
            <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#111827', marginBottom: spacing.sm }}>
              Job Description *
            </Text>
            <TextInput
              value={jobData.description}
              onChangeText={(text) => setJobData(prev => ({ ...prev, description: text }))}
              placeholder="Describe the job responsibilities, requirements, and what you're looking for..."
              multiline
              numberOfLines={4}
              style={[styles.style13, {
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                fontSize: fontSize.base,
                color: '#111827',
                textAlignVertical: 'top'
              }]}
            />
          </View>

          {/* Job Type */}
          <View style={styles.style12}>
            <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#111827', marginBottom: spacing.sm }}>
              Job Type
            </Text>
            <View style={[styles.style7, { gap: spacing.sm }]}>
              {(['full_time', 'part_time', 'contract', 'freelance'] as JobType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setJobData(prev => ({ ...prev, job_type: type }))}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: 24,
                    borderWidth: 1,
                    backgroundColor: jobData.job_type === type ? '#059669' : '#FFFFFF',
                    borderColor: jobData.job_type === type ? '#059669' : '#D1D5DB',
                  }}
                >
                  <Text style={{
                    fontSize: fontSize.sm,
                    fontWeight: '500',
                    textTransform: 'capitalize',
                    color: jobData.job_type === type ? 'white' : '#374151'
                  }}>
                    {type.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Experience Level */}
          <View style={styles.style12}>
            <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#111827', marginBottom: spacing.sm }}>
              Experience Level
            </Text>
            <View style={[styles.style7, { gap: spacing.sm }]}>
              {(['entry_level', 'intermediate', 'senior', 'expert'] as ExperienceLevel[]).map((level) => (
                <TouchableOpacity
                  key={level}
                  onPress={() => setJobData(prev => ({ ...prev, experience_level: level }))}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: 24,
                    borderWidth: 1,
                    backgroundColor: jobData.experience_level === level ? '#059669' : '#FFFFFF',
                    borderColor: jobData.experience_level === level ? '#059669' : '#D1D5DB',
                  }}
                >
                  <Text style={{
                    fontSize: fontSize.sm,
                    fontWeight: '500',
                    textTransform: 'capitalize',
                    color: jobData.experience_level === level ? 'white' : '#374151'
                  }}>
                    {level.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Skill Category */}
          <View>
            <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#111827', marginBottom: spacing.sm }}>
              Skill Category *
            </Text>
            <ScrollView 
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -spacing.lg }}
              contentContainerStyle={{ paddingHorizontal: spacing.lg }}
            >
              <View style={[styles.style7, { gap: spacing.sm }]}>
                {Object.values(SKILL_CATEGORIES).map((category) => (
                  <TouchableOpacity
                    key={category}
                  onPress={() => setJobData(prev => ({ ...prev, category: category }))}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      borderRadius: 24,
                      borderWidth: 1,
                    backgroundColor: jobData.category === category ? '#059669' : '#FFFFFF',
                    borderColor: jobData.category === category ? '#059669' : '#D1D5DB',
                    }}
                  >
                    <Text style={{
                      fontSize: fontSize.sm,
                      fontWeight: '500',
                    color: jobData.category === category ? 'white' : '#374151'
                    }}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Location */}
        <View style={[styles.style11, { padding: spacing.lg }]}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827', marginBottom: spacing.md }}>
            Location
          </Text>
          
          <View style={[styles.style8, { gap: spacing.md, marginBottom: spacing.md }]}>
            <View style={styles.style4}>
              <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#111827', marginBottom: spacing.sm }}>
                County *
              </Text>
              <TextInput
                value={jobData.location?.county}
                onChangeText={(text) => setJobData(prev => ({ 
                  ...prev, 
                  location: { ...prev.location!, county: text } 
                }))}
                placeholder="e.g., Nairobi"
                style={[styles.style13, {
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  fontSize: fontSize.base,
                  color: '#111827'
                }]}
              />
            </View>
            <View style={styles.style4}>
              <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#111827', marginBottom: spacing.sm }}>
                Town *
              </Text>
              <TextInput
                value={jobData.location?.town}
                onChangeText={(text) => setJobData(prev => ({ 
                  ...prev, 
                  location: { ...prev.location!, town: text } 
                }))}
                placeholder="e.g., CBD"
                style={[styles.style13, {
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  fontSize: fontSize.base,
                  color: '#111827'
                }]}
              />
            </View>
          </View>

          {/* Work Type */}
          <View style={[styles.style8, { gap: spacing.sm }]}>
            <TouchableOpacity
              onPress={() => setJobData(prev => ({ 
                ...prev, 
                location: { ...prev.location!, onsite: !prev.location?.onsite } 
              }))}
              style={[
                styles.workTypeButton,
                {
                  paddingVertical: spacing.md,
                  backgroundColor: jobData.location?.onsite ? '#EFF6FF' : '#FFFFFF',
                  borderColor: jobData.location?.onsite ? '#BFDBFE' : '#D1D5DB'
                }
              ]}
            >
              <Text style={{
                fontSize: fontSize.sm,
                fontWeight: '500',
                textAlign: 'center',
                color: jobData.location?.onsite ? '#2563EB' : '#374151'
              }}>
                On-site
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setJobData(prev => ({ 
                ...prev, 
                location: { ...prev.location!, remote: !prev.location?.remote } 
              }))}
              style={[
                styles.workTypeButton,
                {
                  paddingVertical: spacing.md,
                  backgroundColor: jobData.location?.remote ? '#DCFCE7' : '#FFFFFF',
                  borderColor: jobData.location?.remote ? '#BBF7D0' : '#D1D5DB'
                }
              ]}
            >
              <Text style={{
                fontSize: fontSize.sm,
                fontWeight: '500',
                textAlign: 'center',
                color: jobData.location?.remote ? '#059669' : '#374151'
              }}>
                Remote
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Salary */}
        <View style={[styles.style11, { padding: spacing.lg }]}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827', marginBottom: spacing.md }}>
            Salary Range
          </Text>
          
          <View style={[styles.style8, { gap: spacing.md, marginBottom: spacing.md }]}>
            <View style={styles.style4}>
              <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#111827', marginBottom: spacing.sm }}>
                Minimum (KSH)
              </Text>
              <TextInput
                value={jobData.salary?.min?.toString()}
                onChangeText={(text) => setJobData(prev => ({ 
                  ...prev, 
                  salary: { ...prev.salary!, min: parseInt(text) || 0 } 
                }))}
                placeholder="25000"
                keyboardType="numeric"
                style={[
                  styles.style13,
                  {
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    fontSize: fontSize.base,
                    color: '#111827'
                  }
                ]}
              />
            </View>
            <View style={styles.style4}>
              <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#111827', marginBottom: spacing.sm }}>
                Maximum (KSH)
              </Text>
              <TextInput
                value={jobData.salary?.max?.toString()}
                onChangeText={(text) => setJobData(prev => ({ 
                  ...prev, 
                  salary: { ...prev.salary!, max: parseInt(text) || 0 } 
                }))}
                placeholder="50000"
                keyboardType="numeric"
                style={[
                  styles.style13,
                  {
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    fontSize: fontSize.base,
                    color: '#111827'
                  }
                ]}
              />
            </View>
          </View>

          {/* Period */}
          <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#111827', marginBottom: spacing.sm }}>
            Payment Period
          </Text>
          <View style={[styles.style7, { gap: spacing.sm }]}>
            {(['hourly', 'daily', 'weekly', 'monthly', 'project'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                onPress={() => setJobData(prev => ({ 
                  ...prev, 
                  salary: { ...prev.salary!, period } 
                }))}
                style={[
                  styles.periodButton,
                  {
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    backgroundColor: jobData.salary?.period === period ? '#059669' : '#FFFFFF',
                    borderColor: jobData.salary?.period === period ? '#059669' : '#D1D5DB'
                  }
                ]}
              >
                <Text style={{
                  fontSize: fontSize.sm,
                  fontWeight: '500',
                  textTransform: 'capitalize',
                  color: jobData.salary?.period === period ? 'white' : '#374151'
                }}>
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Requirements */}
        <View style={[styles.style11, { padding: spacing.lg }]}>
          <View style={styles.style14}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827' }}>
              Skills & Requirements
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddRequirementModal(true)}
              style={styles.style15}
            >
              <Text style={{ color: 'white', fontSize: fontSize.sm, fontWeight: '600' }}>
                + Add
              </Text>
            </TouchableOpacity>
          </View>
          
          {jobData.requirements && jobData.requirements.length > 0 ? (
            <View style={{ gap: spacing.sm }}>
              {jobData.requirements.map((req, index) => (
                <View key={index} style={[styles.style16, { padding: spacing.sm }]}>
                  <View style={styles.style4}>
                    <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#111827' }}>
                      {req.skill} {req.required && '*'}
                    </Text>
                    <Text style={{ fontSize: fontSize.sm, color: '#6B7280', textTransform: 'capitalize' }}>
                      {req.level} level
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveRequirement(index)}
                    style={styles.style17}
                  >
                    <Text style={{ color: '#DC2626', fontSize: fontSize.sm }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: fontSize.sm, color: '#6B7280', textAlign: 'center', fontStyle: 'italic' }}>
              No requirements added yet
            </Text>
          )}
        </View>

        {/* Benefits */}
        <View style={[styles.style11, { padding: spacing.lg }]}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827', marginBottom: spacing.md }}>
            Benefits (Optional)
          </Text>
          
          <View style={[styles.style18, { gap: spacing.sm }]}>
            <TextInput
              value={newBenefit}
              onChangeText={setNewBenefit}
              placeholder="e.g., Medical Cover, Transport Allowance"
              style={[
                styles.style19,
                {
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  fontSize: fontSize.base,
                  color: '#111827'
                }
              ]}
            />
            <TouchableOpacity
              onPress={handleAddBenefit}
              style={styles.style20}
            >
              <Text style={{ color: 'white', fontSize: fontSize.sm, fontWeight: '600' }}>
                Add
              </Text>
            </TouchableOpacity>
          </View>
          
          {jobData.benefits && jobData.benefits.length > 0 ? (
            <View style={[styles.style7, { gap: spacing.sm }]}>
              {jobData.benefits.map((benefit, index) => (
                <View key={index} style={[styles.style21, { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }]}>
                  <Text style={{ fontSize: fontSize.sm, color: '#059669', marginRight: spacing.xs }}>
                    {benefit}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveBenefit(index)}>
                    <Text style={{ color: '#DC2626', fontSize: fontSize.xs }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: fontSize.sm, color: '#6B7280', textAlign: 'center', fontStyle: 'italic' }}>
              No benefits added yet
            </Text>
          )}
        </View>

        {/* Contact Information - DISABLED: properties not in JobPosting type */}
        {/* TODO: Add application_method and contact_info to JobPosting type */}
        {/*
        <View style={[styles.style11, { padding: spacing.lg }]}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827', marginBottom: spacing.md }}>
            Contact Information
          </Text>
          ...
        </View>
        */}
      </ScrollView>

      {/* Fixed Save Button */}
      <View style={[styles.style22, { padding: spacing.lg }]}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={[
            styles.saveButton,
            {
              paddingVertical: spacing.md,
              backgroundColor: isSaving ? '#9CA3AF' : '#059669'
            }
          ]}
        >
          <Text style={{ 
            color: 'white', 
            fontSize: fontSize.lg, 
            fontWeight: 'bold', 
            textAlign: 'center' 
          }}>
            {isSaving ? 'Saving Changes...' : 'Save Job Posting'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  style1: {
  'flex': 1,
  'backgroundColor': '#F9FAFB'
},
  style2: {
  'backgroundColor': '#FFFFFF',
  'borderBottomWidth': 1,
  'borderColor': '#E5E7EB'
},
  style3: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between'
},
  style4: {
  'flex': 1
},
  style5: {
  'marginBottom': 24
},
  style6: {
  'backgroundColor': '#FFFFFF',
  'borderWidth': 1,
  'borderColor': '#D1D5DB',
  'borderRadius': 8
},
  style7: {
  'flexDirection': 'row'
},
  style8: {
  'flexDirection': 'row'
},
  style9: {
  'flex': 1,
  'justifyContent': 'center',
  'alignItems': 'center'
},
  style10: {
  'borderRadius': 9999,
  'backgroundColor': '#F3F4F6',
  'padding': 8
},
  style11: {
  'backgroundColor': '#FFFFFF',
  'borderRadius': 12,
  'borderWidth': 1,
  'borderColor': '#F3F4F6',
  'marginBottom': 24
},
  style12: {
  'marginBottom': 16
},
  style13: {
  'backgroundColor': '#F9FAFB',
  'borderWidth': 1,
  'borderColor': '#D1D5DB',
  'borderRadius': 8
},
  style14: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'marginBottom': 16
},
  style15: {
  'borderRadius': 8,
  'paddingHorizontal': 12,
  'paddingVertical': 8
},
  style16: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'backgroundColor': '#F9FAFB',
  'borderRadius': 8
},
  style17: {
  'backgroundColor': '#FEE2E2',
  'borderRadius': 9999,
  'padding': 4
},
  style18: {
  'flexDirection': 'row',
  'marginBottom': 16
},
  style19: {
  'flex': 1,
  'backgroundColor': '#F9FAFB',
  'borderWidth': 1,
  'borderColor': '#D1D5DB',
  'borderRadius': 8
},
  style20: {
  'borderRadius': 8,
  'paddingHorizontal': 16,
  'paddingVertical': 8
},
  style21: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'backgroundColor': '#F0FDF4',
  'borderWidth': 1,
  'borderRadius': 8
},
  style22: {
  'backgroundColor': '#FFFFFF',
  'borderTopWidth': 1,
  'borderColor': '#E5E7EB'
},
  skillLevelButton: {
    borderRadius: 9999,
    borderWidth: 1
  },
  requirementTypeButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1
  },
  workTypeButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1
  },
  periodButton: {
    borderRadius: 9999,
    borderWidth: 1
  },
  applicationMethodButton: {
    borderRadius: 9999,
    borderWidth: 1
  },
  saveButton: {
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  }
});

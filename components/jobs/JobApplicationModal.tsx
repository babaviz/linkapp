/**
 * Job Application Modal Component
 * Enhanced modal for job applications with resume upload
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { BaseModal } from '../common/BaseModal';
import { ModalHeader, ModalFooter } from '../../utils/modalHelpers';
import { fileUploadService, UploadedFile } from '../../services/fileUploadService';
import { jobService } from '../../services/jobService';
import { useAppSelector } from '../../redux/hooks';
import { getUserFacingError } from '../../utils/userFacingError';
import { JobPosting } from '../../types/job';
import { getCurrencySymbol } from '../../utils/currencyHelpers';
import {
  getDynamicDimensions,
  spacing,
  fontSize,
  getCrossPlatformShadow
} from '../../utils/responsive';

interface JobApplicationModalProps {
  visible: boolean;
  job: JobPosting;
  onClose: () => void;
  onSubmit: (applicationData: any) => Promise<void>;
}

export const JobApplicationModal: React.FC<JobApplicationModalProps> = ({
  visible,
  job,
  onClose,
  onSubmit
}) => {
  const { width: screenWidth, isTablet } = getDynamicDimensions();
  const { user } = useAppSelector(state => state.auth);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    coverLetter: '',
    expectedSalary: '',
    availabilityDate: '',
    yearsOfExperience: ''
  });
  
  const [resume, setResume] = useState<UploadedFile | null>(null);
  const [previousResumes, setPreviousResumes] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [useExistingResume, setUseExistingResume] = useState(false);

  useEffect(() => {
    if (visible && user) {
      // Pre-fill user data
      setFormData(prev => ({
        ...prev,
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || ''
      }));
      
      // Load previous resumes
      loadPreviousResumes();
    }
  }, [visible, user]);

  const loadPreviousResumes = async () => {
    if (!user) return;
    
    try {
      const resumes = await fileUploadService.getUserResumes(user.id);
      setPreviousResumes(resumes);
      
      if (resumes.length > 0) {
        setUseExistingResume(true);
        setResume(resumes[0]); // Select most recent by default
      }
    } catch (error) {
      
    }
  };

  const handlePickResume = async () => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      const result = await fileUploadService.pickDocument({
        allowedTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
      });
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        
        if (!user) {
          const friendly = getUserFacingError(new Error('Not authenticated'), {
            action: 'upload your resume',
            displayStyle: 'alert',
          });
          Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
          return;
        }
        
        const uploadedFile = await fileUploadService.uploadResume(
          file,
          user.id,
          job.id,
          (progress) => {
            setUploadProgress(progress.percentage);
          }
        );
        
        setResume(uploadedFile);
        setUseExistingResume(false);
        Alert.alert('Success', 'Resume uploaded successfully!');
      }
    } catch (error: any) {
      Alert.alert('Upload Error', error.message || 'Failed to upload resume');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^(\+254|0)[7]\d{8}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Invalid Kenyan phone number';
    }
    
    if (!formData.coverLetter.trim()) {
      newErrors.coverLetter = 'Cover letter is required';
    } else if (formData.coverLetter.trim().length < 50) {
      newErrors.coverLetter = 'Cover letter must be at least 50 characters';
    }
    
    if (!resume) {
      newErrors.resume = 'Please upload or select a resume';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill all required fields correctly');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const applicationData = {
        ...formData,
        jobId: job.id,
        resumeUrl: resume?.url,
        resumeName: resume?.name,
        appliedAt: new Date().toISOString()
      };
      
      await onSubmit(applicationData);
      
      Alert.alert(
        'Application Submitted!',
        'Your application has been submitted successfully. The employer will review it and contact you if interested.',
        [{ text: 'OK', onPress: onClose }]
      );
      
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        coverLetter: '',
        expectedSalary: '',
        availabilityDate: '',
        yearsOfExperience: ''
      });
      setResume(null);
      setErrors({});
    } catch (error: any) {
      const friendly = getUserFacingError(error, {
        action: 'submit your application',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderResumeSection = () => (
    <View style={styles.resumeSection}>
      <Text style={styles.label}>
        Resume/CV <Text style={styles.required}>*</Text>
      </Text>
      
      {previousResumes.length > 0 && (
        <View style={styles.resumeOptions}>
          <TouchableOpacity
            style={[
              styles.resumeOption,
              useExistingResume && styles.resumeOptionActive
            ]}
            onPress={() => {
              setUseExistingResume(true);
              setResume(previousResumes[0]);
            }}
          >
            <Icon 
              name="description" 
              size={20} 
              color={useExistingResume ? '#059669' : '#6B7280'} 
            />
            <Text style={[
              styles.resumeOptionText,
              useExistingResume && styles.resumeOptionTextActive
            ]}>
              Use existing resume
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.resumeOption,
              !useExistingResume && styles.resumeOptionActive
            ]}
            onPress={() => setUseExistingResume(false)}
          >
            <Icon 
              name="upload-file" 
              size={20} 
              color={!useExistingResume ? '#059669' : '#6B7280'} 
            />
            <Text style={[
              styles.resumeOptionText,
              !useExistingResume && styles.resumeOptionTextActive
            ]}>
              Upload new resume
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {useExistingResume && previousResumes.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {previousResumes.map((prevResume) => (
            <TouchableOpacity
              key={prevResume.id}
              style={[
                styles.resumeCard,
                resume?.id === prevResume.id && styles.resumeCardSelected
              ]}
              onPress={() => setResume(prevResume)}
            >
              <Icon name="description" size={24} color="#059669" />
              <Text style={styles.resumeName} numberOfLines={1}>
                {prevResume.name}
              </Text>
              <Text style={styles.resumeDate}>
                Uploaded {new Date(prevResume.uploadedAt).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <>
          {resume ? (
            <View style={styles.uploadedResume}>
              <Icon name="check-circle" size={24} color="#059669" />
              <View style={styles.resumeInfo}>
                <Text style={styles.resumeName}>{resume.name}</Text>
                <Text style={styles.resumeSize}>
                  {(resume.size / 1024).toFixed(2)} KB
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setResume(null)}
                style={styles.removeButton}
              >
                <Icon name="close" size={20} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handlePickResume}
              disabled={isUploading}
            >
              {isUploading ? (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator size="small" color="#059669" />
                  <Text style={styles.uploadingText}>
                    Uploading... {uploadProgress}%
                  </Text>
                </View>
              ) : (
                <>
                  <Icon name="cloud-upload" size={24} color="#059669" />
                  <Text style={styles.uploadButtonText}>
                    Choose Resume (PDF, DOC, DOCX)
                  </Text>
                  <Text style={styles.uploadHint}>Max size: 10MB</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </>
      )}
      
      {errors.resume && (
        <Text style={styles.errorText}>{errors.resume}</Text>
      )}
    </View>
  );

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      size="large"
      dismissOnBackdrop={true}
      dismissOnBackButton={true}
      animationType="slide"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={[
          styles.modalContent,
          { width: isTablet ? screenWidth * 0.7 : screenWidth * 0.95 }
        ]}>
          {/* Header */}
          <ModalHeader
            title="Apply for Job"
            onClose={onClose}
            showCloseButton={true}
            isDarkMode={false}
          />
            
            {/* Job Info */}
            <View style={styles.jobInfo}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.jobCompany}>{job.employer.company}</Text>
            </View>
            
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Full Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.fullName && styles.inputError]}
                  value={formData.fullName}
                  onChangeText={(text) => setFormData({...formData, fullName: text})}
                  placeholder="Enter your full name"
                />
                {errors.fullName && (
                  <Text style={styles.errorText}>{errors.fullName}</Text>
                )}
              </View>
              
              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Email <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={formData.email}
                  onChangeText={(text) => setFormData({...formData, email: text})}
                  placeholder="your.email@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>
              
              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Phone Number <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.phone && styles.inputError]}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({...formData, phone: text})}
                  placeholder="+254 7XX XXX XXX"
                  keyboardType="phone-pad"
                />
                {errors.phone && (
                  <Text style={styles.errorText}>{errors.phone}</Text>
                )}
              </View>
              
              {/* Years of Experience */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Years of Experience</Text>
                <TextInput
                  style={styles.input}
                  value={formData.yearsOfExperience}
                  onChangeText={(text) => setFormData({...formData, yearsOfExperience: text})}
                  placeholder="e.g., 3"
                  keyboardType="numeric"
                />
              </View>
              
              {/* Expected Salary */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Expected Salary ({(() => {
                  const user = useAppSelector((state) => state.auth.user);
                  const userCountry = user?.location?.county;
                  return getCurrencySymbol(userCountry);
                })()})</Text>
                <TextInput
                  style={styles.input}
                  value={formData.expectedSalary}
                  onChangeText={(text) => setFormData({...formData, expectedSalary: text})}
                  placeholder="e.g., 50000"
                  keyboardType="numeric"
                />
              </View>
              
              {/* Availability */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Available to Start</Text>
                <TextInput
                  style={styles.input}
                  value={formData.availabilityDate}
                  onChangeText={(text) => setFormData({...formData, availabilityDate: text})}
                  placeholder="e.g., Immediately / 2 weeks notice"
                />
              </View>
              
              {/* Cover Letter */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Cover Letter <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.textArea, errors.coverLetter && styles.inputError]}
                  value={formData.coverLetter}
                  onChangeText={(text) => setFormData({...formData, coverLetter: text})}
                  placeholder="Tell us why you're interested in this position and why you're the right fit..."
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                {errors.coverLetter && (
                  <Text style={styles.errorText}>{errors.coverLetter}</Text>
                )}
              </View>
              
              {/* Resume Upload Section */}
              {renderResumeSection()}
            </ScrollView>
            
            {/* Modal Footer */}
            <ModalFooter
              primaryAction={{
                label: 'Submit Application',
                onPress: handleSubmit,
                loading: isSubmitting,
                disabled: isSubmitting
              }}
              cancelAction={{
                label: 'Cancel',
                onPress: onClose
              }}
              isDarkMode={false}
            />
          </View>
        </KeyboardAvoidingView>
    </BaseModal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%'
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    maxHeight: '90%',
    ...getCrossPlatformShadow({ elevation: 8 })
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: '#111827'
  },
  closeButton: {
    padding: spacing.xs
  },
  jobInfo: {
    padding: spacing.lg,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  jobTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4
  },
  jobCompany: {
    fontSize: fontSize.sm,
    color: '#6B7280'
  },
  scrollContent: {
    padding: spacing.lg
  },
  inputGroup: {
    marginBottom: spacing.lg
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#374151',
    marginBottom: spacing.sm
  },
  required: {
    color: '#DC2626'
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: '#111827'
  },
  inputError: {
    borderColor: '#DC2626'
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: '#111827',
    minHeight: 120
  },
  errorText: {
    color: '#DC2626',
    fontSize: fontSize.sm,
    marginTop: 4
  },
  resumeSection: {
    marginBottom: spacing.xl
  },
  resumeOptions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md
  },
  resumeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  resumeOptionActive: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4'
  },
  resumeOptionText: {
    fontSize: fontSize.sm,
    color: '#6B7280'
  },
  resumeOptionTextActive: {
    color: '#059669',
    fontWeight: '500'
  },
  resumeCard: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginRight: spacing.md,
    minWidth: 150,
    alignItems: 'center'
  },
  resumeCardSelected: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4'
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#059669',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: '#F0FDF4'
  },
  uploadButtonText: {
    color: '#059669',
    fontSize: fontSize.base,
    fontWeight: '500',
    marginTop: spacing.sm
  },
  uploadHint: {
    color: '#6B7280',
    fontSize: fontSize.sm,
    marginTop: 4
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  uploadingText: {
    color: '#059669',
    fontSize: fontSize.base
  },
  uploadedResume: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#059669'
  },
  resumeInfo: {
    flex: 1,
    marginLeft: spacing.md
  },
  resumeName: {
    fontSize: fontSize.base,
    color: '#111827',
    fontWeight: '500'
  },
  resumeSize: {
    fontSize: fontSize.sm,
    color: '#6B7280',
    marginTop: 2
  },
  resumeDate: {
    fontSize: fontSize.xs,
    color: '#6B7280',
    marginTop: 4
  },
  removeButton: {
    padding: spacing.xs
  },
  submitButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md
  },
  submitButtonText: {
    color: 'white',
    fontSize: fontSize.base,
    fontWeight: '600'
  },
  buttonDisabled: {
    opacity: 0.6
  }
});

export default JobApplicationModal;

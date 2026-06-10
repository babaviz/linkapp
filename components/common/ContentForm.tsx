/**
 * Unified Content Form Component with Validation
 * Handles content creation and editing across all modules
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MediaUpload, { MediaItem } from './MediaUpload';
import { getUserFacingError } from '../../utils/userFacingError';
import {
  contentService,
  ContentType,
  PropertyContent,
  JobContent,
  ServiceContent,
  DateMiContent,
  ContentValidationResult,
} from '../../services/contentService';

export interface ContentFormProps {
  module: 'property' | 'jobs' | 'services' | 'datemi';
  initialContent?: Partial<ContentType>;
  onSubmitSuccess?: (contentId: string) => void;
  onSubmitError?: (errors: string[]) => void;
  onCancel?: () => void;
  isEditing?: boolean;
  style?: any;
}

interface FormErrors {
  [key: string]: string[];
}

export default function ContentForm({
  module,
  initialContent,
  onSubmitSuccess,
  onSubmitError,
  onCancel,
  isEditing = false,
  style,
}: ContentFormProps) {
  const [formData, setFormData] = useState<Partial<ContentType>>(
    initialContent || { module, status: 'draft' }
  );
  const [selectedMedia, setSelectedMedia] = useState<MediaItem[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationResult, setValidationResult] = useState<ContentValidationResult | null>(null);

  // Module-specific styling
  const getModuleColors = () => {
    switch (module) {
      case 'property':
      case 'jobs':
        return {
          primary: '#0F766E',
          secondary: '#14B8A6',
          surface: '#F0FDFA',
          accent: '#065F46',
        };
      case 'services':
      case 'datemi':
        return {
          primary: '#7C3AED',
          secondary: '#A855F7',
          surface: '#FAF5FF',
          accent: '#581C87',
        };
      default:
        return {
          primary: '#0F766E',
          secondary: '#14B8A6',
          surface: '#F0FDFA',
          accent: '#065F46',
        };
    }
  };

  const colors = getModuleColors();

  // Update form data handler
  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate form in real-time
  useEffect(() => {
    if (Object.keys(formData).length > 1) {
      const result = contentService.validateContent(formData as ContentType);
      setValidationResult(result);
      setWarnings(result.warnings || []);
      
      // Convert errors to field-specific format
      const fieldErrors: FormErrors = {};
      result.errors.forEach(error => {
        if (error.toLowerCase().includes('title')) {
          fieldErrors.title = fieldErrors.title || [];
          fieldErrors.title.push(error);
        } else if (error.toLowerCase().includes('description')) {
          fieldErrors.description = fieldErrors.description || [];
          fieldErrors.description.push(error);
        } else if (error.toLowerCase().includes('price')) {
          fieldErrors.price = fieldErrors.price || [];
          fieldErrors.price.push(error);
        } else {
          fieldErrors.general = fieldErrors.general || [];
          fieldErrors.general.push(error);
        }
      });
      
      setErrors(fieldErrors);
    }
  }, [formData]);

  // Handle media selection
  const handleMediaSelected = (media: MediaItem[]) => {
    setSelectedMedia(prev => [...prev, ...media]);
  };

  const handleMediaRemoved = (mediaId: string) => {
    setSelectedMedia(prev => prev.filter(item => item.id !== mediaId));
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validationResult?.valid) {
      Alert.alert('Validation Error', 'Please fix all errors before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = isEditing
        ? await contentService.updateContent(
            formData.id!,
            formData,
            selectedMedia.length > 0 ? selectedMedia : undefined
          )
        : await contentService.submitContent(formData as ContentType, selectedMedia);

      if (result.success) {
        Alert.alert('Success', isEditing ? 'Content updated successfully!' : 'Content created successfully!');
        onSubmitSuccess?.(result.content_id!);
      } else {
        Alert.alert('Submit Error', result.errors?.join('\n') || 'Unknown error occurred');
        onSubmitError?.(result.errors || ['Unknown error']);
      }
    } catch (error: any) {
      
      const action = isEditing ? 'update this content' : 'create this content';
      const friendly = getUserFacingError(error, { action, displayStyle: 'alert' });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
      onSubmitError?.([friendly.message]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save as draft
  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    
    try {
      const draftData = { ...formData, status: 'draft' as const };
      const result = isEditing
        ? await contentService.updateContent(formData.id!, draftData, selectedMedia)
        : await contentService.submitContent(draftData as ContentType, selectedMedia);

      if (result.success) {
        Alert.alert('Draft Saved', 'Your content has been saved as a draft');
        onSubmitSuccess?.(result.content_id!);
      } else {
        const friendly = getUserFacingError(result.errors?.join('\n') || new Error('Draft save failed'), {
          action: 'save your draft',
          displayStyle: 'alert',
        });
        Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
      }
    } catch (error: any) {
      
      const friendly = getUserFacingError(error, {
        action: 'save your draft',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render form field with error handling
  const renderField = (
    label: string,
    field: string,
    placeholder: string,
    options: {
      multiline?: boolean;
      keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
      required?: boolean;
      maxLength?: number;
    } = {}
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={[styles.fieldLabel, { color: colors.accent }]}>
        {label}
        {options.required && <Text style={styles.requiredMarker}>*</Text>}
      </Text>
      <TextInput
        value={formData[field as keyof typeof formData]?.toString() || ''}
        onChangeText={(value) => updateFormData(field, value)}
        placeholder={placeholder}
        multiline={options.multiline}
        numberOfLines={options.multiline ? 4 : 1}
        keyboardType={options.keyboardType}
        maxLength={options.maxLength}
        style={[
          styles.textInput,
          errors[field] ? styles.textInputError : styles.textInputNormal,
          {
            backgroundColor: errors[field] ? '#FEF2F2' : 'white',
            minHeight: options.multiline ? 100 : 44,
            textAlignVertical: options.multiline ? 'top' : 'center',
          }
        ]}
        editable={!isSubmitting}
      />
      {errors[field] && (
        <View style={styles.errorContainer}>
          {errors[field].map((error, index) => (
            <Text key={index} style={styles.errorText}>
              • {error}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  // Render module-specific fields
  const renderModuleFields = () => {
    switch (module) {
      case 'property':
        return (
          <>
            {renderField('Property Type', 'property_type', 'e.g., Apartment, House', { required: true })}
            {renderField('Price (KSH)', 'price', 'Enter amount', { required: true, keyboardType: 'numeric' })}
            {renderField('Bedrooms', 'bedrooms', 'Number of bedrooms', { keyboardType: 'numeric' })}
            {renderField('Bathrooms', 'bathrooms', 'Number of bathrooms', { keyboardType: 'numeric' })}
            {renderField('Area (sqm)', 'area_sqm', 'Area in square meters', { keyboardType: 'numeric' })}
            {renderField('Contact Phone', 'contact_phone', '+254xxxxxxxxx', { keyboardType: 'phone-pad' })}
          </>
        );

      case 'jobs':
        return (
          <>
            {renderField('Job Type', 'job_type', 'e.g., Full-time, Part-time', { required: true })}
            {renderField('Skill Category', 'skill_category', 'e.g., Technology, Healthcare', { required: true })}
            {renderField('Company Name', 'company_name', 'Company or organization name')}
            {renderField('Min Salary (KSH)', 'salary_min', 'Minimum salary', { keyboardType: 'numeric' })}
            {renderField('Max Salary (KSH)', 'salary_max', 'Maximum salary', { keyboardType: 'numeric' })}
          </>
        );

      case 'services':
        return (
          <>
            {renderField('Business Name', 'business_name', 'Your business name', { required: true })}
            {renderField('Service Category', 'service_category', 'e.g., Plumbing, Catering', { required: true })}
            {renderField('Price Amount (KSH)', 'price_amount', 'Service price', { keyboardType: 'numeric' })}
            {renderField('Contact Phone', 'contact_phone', '+254xxxxxxxxx', { required: true, keyboardType: 'phone-pad' })}
          </>
        );

      case 'datemi':
        return (
          <>
            {renderField('Content Type', 'content_type', 'profile, photo, preference', { required: true })}
            {renderField('Birth Date', 'birth_date', 'YYYY-MM-DD')}
            {renderField('Gender', 'gender', 'Male, Female, Other')}
            {renderField('Looking For', 'looking_for', 'What are you looking for?')}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={[styles.container, style]}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={[styles.headerTitle, { color: colors.primary }]}>
            {isEditing ? 'Edit' : 'Create'} {module.charAt(0).toUpperCase() + module.slice(1)} Content
          </Text>
          <Text style={styles.headerSubtitle}>
            Fill in the details below to {isEditing ? 'update' : 'create'} your content
          </Text>
        </View>

        {/* Validation Status */}
        {validationResult && (
          <View style={[
            styles.validationContainer,
            validationResult.valid ? styles.validationSuccess : styles.validationError
          ]}>
            <View style={styles.validationRow}>
              <Ionicons 
                name={validationResult.valid ? 'checkmark-circle' : 'alert-circle'} 
                size={20} 
                color={validationResult.valid ? '#10B981' : '#EF4444'} 
              />
              <Text style={[
                styles.validationText,
                validationResult.valid ? styles.validationTextSuccess : styles.validationTextError
              ]}>
                {validationResult.valid ? 'Form is valid' : 'Please fix errors below'}
              </Text>
            </View>
          </View>
        )}

        {/* General errors */}
        {errors.general && (
          <View style={styles.generalErrorContainer}>
            {errors.general.map((error, index) => (
              <Text key={index} style={styles.generalErrorText}>• {error}</Text>
            ))}
          </View>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <View style={styles.warningsContainer}>
            <View style={styles.warningsHeader}>
              <Ionicons name="warning" size={16} color="#D97706" />
              <Text style={styles.warningsTitle}>Warnings</Text>
            </View>
            {warnings.map((warning, index) => (
              <Text key={index} style={styles.warningText}>• {warning}</Text>
            ))}
          </View>
        )}

        {/* Basic Fields */}
        {renderField('Title', 'title', 'Enter a descriptive title', { required: true, maxLength: 100 })}
        {renderField('Description', 'description', 'Provide detailed information...', { multiline: true, maxLength: 2000 })}

        {/* Module-specific fields */}
        {renderModuleFields()}

        {/* Media Upload */}
        <View style={styles.mediaSection}>
          <Text style={[styles.sectionTitle, { color: colors.accent }]}>
            Media Files
          </Text>
          <MediaUpload
            mediaType="all"
            maxFiles={module === 'property' ? 10 : 6}
            selectedMedia={selectedMedia}
            onMediaSelected={handleMediaSelected}
            onMediaRemoved={handleMediaRemoved}
            module={module}
            placeholder={`Add images, videos or documents for your ${module} content`}
            disabled={isSubmitting}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            onPress={onCancel}
            disabled={isSubmitting}
            style={[styles.cancelButton, { borderColor: colors.primary }]}
          >
            <Text style={[styles.cancelButtonText, { color: colors.primary }]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSaveDraft}
            disabled={isSubmitting}
            style={[
              styles.draftButton,
              { 
                backgroundColor: colors.surface,
                borderColor: colors.secondary,
              }
            ]}
          >
            <Text style={[styles.draftButtonText, { color: colors.secondary }]}>
              Save Draft
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || !validationResult?.valid}
            style={[
              styles.submitButton,
              { 
                backgroundColor: isSubmitting || !validationResult?.valid 
                  ? '#D1D5DB' 
                  : colors.primary 
              }
            ]}
          >
            {isSubmitting && (
              <ActivityIndicator size="small" color="white" style={styles.loadingIndicator} />
            )}
            <Text style={styles.submitButtonText}>
              {isSubmitting 
                ? (isEditing ? 'Updating...' : 'Creating...') 
                : (isEditing ? 'Update' : 'Publish')
              }
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  headerContainer: {
    marginBottom: 24
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8
  },
  headerSubtitle: {
    color: '#6B7280' // text-gray-600
  },
  fieldContainer: {
    marginBottom: 16
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8
  },
  requiredMarker: {
    color: '#EF4444', // text-red-500
    marginLeft: 4
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  textInputNormal: {
    borderColor: '#D1D5DB' // border-gray-300
  },
  textInputError: {
    borderColor: '#EF4444' // border-red-500
  },
  errorContainer: {
    marginTop: 4
  },
  errorText: {
    color: '#EF4444', // text-red-500
    fontSize: 14
  },
  validationContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8
  },
  validationSuccess: {
    backgroundColor: '#F0FDF4' // bg-green-50
  },
  validationError: {
    backgroundColor: '#FEF2F2' // bg-red-50
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  validationText: {
    marginLeft: 8,
    fontWeight: '500'
  },
  validationTextSuccess: {
    color: '#166534' // text-green-800
  },
  validationTextError: {
    color: '#991B1B' // text-red-800
  },
  generalErrorContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FEF2F2', // bg-red-50
    borderRadius: 8
  },
  generalErrorText: {
    color: '#991B1B' // text-red-800
  },
  warningsContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFFBEB', // bg-yellow-50
    borderRadius: 8
  },
  warningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  warningsTitle: {
    marginLeft: 8,
    fontWeight: '500',
    color: '#92400E' // text-yellow-800
  },
  warningText: {
    color: '#92400E', // text-yellow-800
    fontSize: 14
  },
  mediaSection: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center'
  },
  cancelButtonText: {
    fontWeight: '500'
  },
  draftButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center'
  },
  draftButtonText: {
    fontWeight: '500'
  },
  submitButton: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '500'
  },
  loadingIndicator: {
    marginRight: 8
  }
});

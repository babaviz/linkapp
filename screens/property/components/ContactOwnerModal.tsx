/**
 * ContactOwnerModal Component
 * Modal for contacting property owners and submitting inquiries
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView, 
  StyleSheet 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BaseModal } from '../../../components/common/BaseModal';
import { ModalHeader, ModalFooter } from '../../../utils/modalHelpers';
import { useAppDispatch, useAppSelector } from '../../../redux/hooks';
import { submitInquiry } from '../../../redux/slices/messageSlice';
import { Property } from '../../../types/property';
import { formatPrice } from '../../../utils/propertyHelpers';

interface ContactOwnerModalProps {
  property: Property;
  visible: boolean;
  onClose: () => void;
}

const ContactOwnerModal: React.FC<ContactOwnerModalProps> = ({
  property,
  visible,
  onClose
}) => {
  const dispatch = useAppDispatch();
  const { isSubmitting } = useAppSelector(state => state.message);
  const { user } = useAppSelector(state => state.auth);

  // Form state
  const [inquiryForm, setInquiryForm] = useState({
    message: '',
    contactPhone: '',
    contactEmail: '',
    name: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!inquiryForm.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!inquiryForm.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (inquiryForm.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    if (!inquiryForm.contactPhone.trim() && !inquiryForm.contactEmail.trim()) {
      newErrors.contact = 'Please provide either phone number or email';
    }

    if (inquiryForm.contactEmail.trim() && 
        !inquiryForm.contactEmail.includes('@')) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }

    if (inquiryForm.contactPhone.trim() && 
        inquiryForm.contactPhone.trim().length < 10) {
      newErrors.contactPhone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmitInquiry = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user?.id) {
      Alert.alert('Authentication Error', 'Please log in to send an inquiry.');
      return;
    }

    try {
      const inquiryData = {
        property_id: property.id,
        inquirer_id: user.id,
        owner_id: property.owner_id,
        message: inquiryForm.message.trim(),
        contact_phone: inquiryForm.contactPhone.trim() || undefined,
        contact_email: inquiryForm.contactEmail.trim() || undefined
      };

      await dispatch(submitInquiry({ 
        inquiryData, 
        inquirerName: inquiryForm.name.trim() 
      })).unwrap();

      Alert.alert(
        'Inquiry Sent!',
        'Your inquiry has been sent to the property owner. They will contact you soon.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setInquiryForm({
                message: '',
                contactPhone: '',
                contactEmail: '',
                name: ''
              });
              setErrors({});
              onClose();
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to send inquiry. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Pre-fill message
  const handleQuickMessage = (template: string) => {
    setInquiryForm(prev => ({ ...prev, message: template }));
  };

  const quickMessages = [
    'Hi, I am interested in this property. Could you please provide more details?',
    'Is this property still available? I would like to schedule a viewing.',
    'What are the terms and conditions for renting this property?',
    'I am interested in purchasing this property. Could we discuss the price?'
  ];

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      size="large"
      dismissOnBackdrop={true}
      dismissOnBackButton={true}
      animationType="slideUp"
      headerContent={
        <ModalHeader
          title="Contact Owner"
          onClose={onClose}
          showCloseButton={false}
          leftAction={{
            label: 'Cancel',
            onPress: onClose
          }}
          rightAction={{
            label: isSubmitting ? 'Sending...' : 'Send',
            onPress: handleSubmitInquiry,
            disabled: isSubmitting,
            color: '#0D9488'
          }}
          isDarkMode={false}
        />
      }
      footerContent={
        <ModalFooter
          primaryAction={{
            label: 'Send Inquiry',
            onPress: handleSubmitInquiry,
            loading: isSubmitting,
            disabled: isSubmitting
          }}
          isDarkMode={false}
        />
      }
    >
      <View style={styles.container}>

        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
        >
          {/* Property Info */}
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyTitle}>
              {property.title}
            </Text>
            <Text style={styles.propertyPrice}>
              {formatPrice(property.price, property.price_period)}
            </Text>
            <Text style={styles.propertyLocation}>
              {property.location.town}, {property.location.county}
            </Text>
          </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Your Name *
                </Text>
                <TextInput
                  value={inquiryForm.name}
                  onChangeText={(text) => setInquiryForm(prev => ({ ...prev, name: text }))}
                  placeholder="Enter your full name"
                  style={styles.textInput}
                  autoCapitalize="words"
                />
                {errors.name && (
                  <Text style={styles.errorText}>{errors.name}</Text>
                )}
              </View>

              {/* Contact Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Phone Number
                </Text>
                <TextInput
                  value={inquiryForm.contactPhone}
                  onChangeText={(text) => setInquiryForm(prev => ({ ...prev, contactPhone: text }))}
                  placeholder="e.g., +254712345678"
                  style={styles.textInput}
                  keyboardType="phone-pad"
                />
                {errors.contactPhone && (
                  <Text style={styles.errorText}>{errors.contactPhone}</Text>
                )}
              </View>

              {/* Contact Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Email Address
                </Text>
                <TextInput
                  value={inquiryForm.contactEmail}
                  onChangeText={(text) => setInquiryForm(prev => ({ ...prev, contactEmail: text }))}
                  placeholder="your.email@example.com"
                  style={styles.textInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.contactEmail && (
                  <Text style={styles.errorText}>{errors.contactEmail}</Text>
                )}
                {errors.contact && (
                  <Text style={styles.errorText}>{errors.contact}</Text>
                )}
              </View>

              {/* Quick Message Templates */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Quick Messages
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {quickMessages.map((template, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleQuickMessage(template)}
                      style={[styles.quickMessageButton, { minWidth: 200 }]}
                    >
                      <Text style={styles.quickMessageText} numberOfLines={2}>
                        {template}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Message Input */}
              <View style={styles.messageInputGroup}>
                <Text style={styles.inputLabel}>
                  Your Message *
                </Text>
                <TextInput
                  value={inquiryForm.message}
                  onChangeText={(text) => setInquiryForm(prev => ({ ...prev, message: text }))}
                  placeholder="Tell the owner about your interest in this property..."
                  style={styles.messageTextInput}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                {errors.message && (
                  <Text style={styles.errorText}>{errors.message}</Text>
                )}
                <Text style={styles.characterCount}>
                  Minimum 10 characters ({inquiryForm.message.length}/10)
                </Text>
              </View>

              {/* Disclaimer */}
              <View style={styles.disclaimer}>
                <Text style={styles.disclaimerText}>
                  💡 Your contact information will be shared with the property owner so they can respond to your inquiry.
                </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </BaseModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelButton: {
    fontSize: 18,
    fontWeight: '500',
    color: '#0D9488',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  sendButton: {
    fontSize: 18,
    fontWeight: '500',
    color: '#0D9488',
  },
  disabledButton: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  propertyInfo: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  propertyPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0D9488',
  },
  propertyLocation: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginTop: 4,
  },
  quickMessageButton: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  quickMessageText: {
    color: '#047857',
    fontSize: 14,
  },
  messageInputGroup: {
    marginBottom: 24,
  },
  messageTextInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#0D9488',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  disclaimer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
  },
  disclaimerText: {
    color: '#92400E',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default ContactOwnerModal;

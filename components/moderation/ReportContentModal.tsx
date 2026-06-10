/**
 * ReportContentModal - Content Reporting Interface
 * Allows users to report inappropriate content with Material 3 design
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { Material3Card } from '../common';
import { reportContent } from '../../redux/slices/moderationSlice';
import { ReportReason } from '../../types/moderation';
import { getUserFacingError } from '../../utils/userFacingError';

interface ReportContentModalProps {
  visible: boolean;
  onClose: () => void;
  contentId: string;
  contentType: 'property' | 'job' | 'service' | 'story' | 'profile' | 'message';
  reportedUserId: string;
}

interface ReportReasonOption {
  key: ReportReason;
  title: string;
  description: string;
  icon: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const REPORT_REASONS: ReportReasonOption[] = [
  {
    key: 'spam',
    title: 'Spam or Repetitive Content',
    description: 'Unwanted promotional content or repetitive posts',
    icon: '📧',
    severity: 'low'
  },
  {
    key: 'inappropriate_content',
    title: 'Inappropriate Content',
    description: 'Content that is not suitable for the community',
    icon: '🚫',
    severity: 'medium'
  },
  {
    key: 'false_information',
    title: 'False Information',
    description: 'Misleading or incorrect information',
    icon: '❌',
    severity: 'medium'
  },
  {
    key: 'scam_fraud',
    title: 'Scam or Fraud',
    description: 'Suspicious activity or fraudulent content',
    icon: '⚠️',
    severity: 'high'
  },
  {
    key: 'harassment',
    title: 'Harassment or Bullying',
    description: 'Targeted harassment or bullying behavior',
    icon: '😤',
    severity: 'high'
  },
  {
    key: 'hate_speech',
    title: 'Hate Speech',
    description: 'Discriminatory or hateful content',
    icon: '💢',
    severity: 'high'
  },
  {
    key: 'violence_threats',
    title: 'Violence or Threats',
    description: 'Threatening or violent content',
    icon: '🚨',
    severity: 'critical'
  },
  {
    key: 'illegal_content',
    title: 'Illegal Content',
    description: 'Content that may be illegal',
    icon: '🔒',
    severity: 'critical'
  },
  {
    key: 'impersonation',
    title: 'Impersonation',
    description: 'Pretending to be someone else',
    icon: '🎭',
    severity: 'medium'
  },
  {
    key: 'copyright',
    title: 'Copyright Violation',
    description: 'Unauthorized use of copyrighted material',
    icon: '©️',
    severity: 'medium'
  },
  {
    key: 'other',
    title: 'Other',
    description: 'Other violations not listed above',
    icon: '❓',
    severity: 'low'
  }
];

export default function ReportContentModal({
  visible,
  onClose,
  contentId,
  contentType,
  reportedUserId
}: ReportContentModalProps) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { isSubmitting } = useAppSelector(state => state.moderation);

  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason || !user?.id) {
      Alert.alert('Missing information', 'Please select a reason for reporting.');
      return;
    }

    try {
      await dispatch(reportContent({
        contentId,
        contentType,
        reporterId: user.id,
        reportedUserId,
        reason: selectedReason,
        description: description.trim() || undefined
      })).unwrap();

      // Reset form
      setSelectedReason(null);
      setDescription('');
      setIsAnonymous(false);

      Alert.alert(
        'Report Submitted',
        'Thank you for helping keep our community safe. We\'ll review this report within 24 hours.',
        [
          {
            text: 'OK',
            onPress: onClose
          }
        ]
      );
    } catch (error) {
      const friendly = getUserFacingError(error, {
        action: 'submit this report',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  };

  const getSeverityColor = (severity: string): string => {
    const colors = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444',
      critical: '#7C2D12'
    };
    return colors[severity as keyof typeof colors] || colors.low;
  };

  const ReasonCard: React.FC<{ reason: ReportReasonOption }> = ({ reason }) => (
    <TouchableOpacity
      onPress={() => setSelectedReason(reason.key)}
      activeOpacity={0.7}
      style={styles.reasonCardContainer}
    >
      <Material3Card
        variant={selectedReason === reason.key ? "elevated" : "outlined"}
        style={[
          styles.reasonCard,
          (selectedReason === reason.key 
            ? {
                backgroundColor: `${getSeverityColor(reason.severity)}10`,
                borderColor: getSeverityColor(reason.severity)
              }
            : {
                backgroundColor: 'white',
                borderColor: '#E5E7EB'
              }) as any
        ] as any}
      >
        <View style={styles.reasonCardHeader}>
          <Text style={styles.reasonIcon}>{reason.icon}</Text>
          <View style={styles.reasonInfo}>
            <Text 
              style={[
                styles.reasonTitle,
                { 
                  color: selectedReason === reason.key 
                    ? getSeverityColor(reason.severity)
                    : '#111827' 
                }
              ]}
            >
              {reason.title}
            </Text>
            <View style={styles.severityRow}>
              <View
                style={[
                  styles.severityDot,
                  { backgroundColor: getSeverityColor(reason.severity) }
                ]}
              />
              <Text style={styles.severityText}>
                {reason.severity} severity
              </Text>
            </View>
          </View>
          {selectedReason === reason.key && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </View>
        <Text style={styles.reasonDescription}>
          {reason.description}
        </Text>
      </Material3Card>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>
                Report Content
              </Text>
              <Text style={styles.headerSubtitle}>
                Help us maintain a safe community
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Content Info */}
          <Material3Card variant="filled" style={styles.contentInfo}>
            <View style={styles.contentInfoHeader}>
              <Text style={styles.contentInfoIcon}>🔍</Text>
              <Text style={styles.contentInfoTitle}>
                Reporting {contentType} content
              </Text>
            </View>
            <Text style={styles.contentInfoDescription}>
              Your report helps us identify content that may violate our community guidelines.
              All reports are reviewed by our moderation team.
            </Text>
          </Material3Card>

          {/* Reason Selection */}
          <Text style={styles.sectionTitle}>
            What's the issue?
          </Text>
          
          {REPORT_REASONS.map(reason => (
            <ReasonCard key={reason.key} reason={reason} />
          ))}

          {/* Additional Details */}
          {selectedReason && (
            <View style={styles.additionalDetailsContainer}>
              <Text style={styles.additionalDetailsTitle}>
                Additional Details (Optional)
              </Text>
              <Material3Card variant="outlined" style={styles.textInputCard}>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Provide additional context about this report..."
                  multiline
                  numberOfLines={4}
                  style={styles.textInput}
                  maxLength={500}
                />
                <View style={styles.characterCountContainer}>
                  <Text style={styles.characterCount}>
                    {description.length}/500 characters
                  </Text>
                </View>
              </Material3Card>
            </View>
          )}

          {/* Privacy Notice */}
          <Material3Card variant="filled" style={styles.privacyNotice}>
            <View style={styles.privacyNoticeRow}>
              <Text style={styles.privacyIcon}>🔒</Text>
              <View style={styles.privacyContent}>
                <Text style={styles.privacyTitle}>
                  Privacy & Anonymity
                </Text>
                <Text style={styles.privacyDescription}>
                  Your identity is kept confidential during the review process. 
                  Only our moderation team can see who submitted the report.
                </Text>
              </View>
            </View>
          </Material3Card>
        </ScrollView>

        {/* Submit Button */}
        {selectedReason && (
          <View style={styles.submitContainer}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[
                styles.submitButton,
                isSubmitting ? styles.submitButtonDisabled : styles.submitButtonEnabled
              ]}
            >
              <Text style={[
                styles.submitButtonText,
                isSubmitting ? styles.submitButtonTextDisabled : styles.submitButtonTextEnabled
              ]}>
                {isSubmitting ? 'Submitting Report...' : 'Submit Report'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#4B5563',
    fontSize: 18,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  contentInfo: {
    padding: 16,
    marginBottom: 24,
  },
  contentInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contentInfoIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  contentInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  contentInfoDescription: {
    fontSize: 14,
    color: '#4B5563',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  reasonCardContainer: {
    marginBottom: 12,
  },
  reasonCard: {
    padding: 16,
  },
  reasonCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reasonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  reasonInfo: {
    flex: 1,
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  severityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  severityText: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  checkmark: {
    width: 24,
    height: 24,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  reasonDescription: {
    fontSize: 14,
    color: '#4B5563',
  },
  additionalDetailsContainer: {
    marginTop: 24,
  },
  additionalDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  textInputCard: {
    padding: 0,
    overflow: 'hidden',
  },
  textInput: {
    padding: 16,
    fontSize: 16,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  characterCountContainer: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  characterCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  privacyNotice: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    marginTop: 24,
  },
  privacyNoticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  privacyIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
    marginBottom: 4,
  },
  privacyDescription: {
    fontSize: 12,
    color: '#B45309',
  },
  submitContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  submitButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  submitButtonEnabled: {
    backgroundColor: '#DC2626',
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonTextEnabled: {
    color: '#FFFFFF',
  },
  submitButtonTextDisabled: {
    color: '#6B7280',
  },
});

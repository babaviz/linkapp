import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { showDialog } from '../../utils/dialogService';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  profileId: string;
  profileName: string;
  onSubmitReport: (reason: string, details: string) => Promise<void>;
  existingReports?: number;
}

type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

const reportReasons: Array<{
  id: string;
  label: string;
  icon: MaterialIconName;
  color: string;
  bgColor: string;
}> = [
  { id: 'fake', label: 'Fake Profile', icon: 'person-remove', color: '#EF4444', bgColor: '#FFEDED' },
  { id: 'inappropriate', label: 'Inappropriate Content', icon: 'block', color: '#F59E0B', bgColor: '#FFF7ED' },
  { id: 'harassment', label: 'Harassment or Bullying', icon: 'warning', color: '#EC4899', bgColor: '#FFEEF8' },
  { id: 'spam', label: 'Spam or Scam', icon: 'mail', color: '#8B5CF6', bgColor: '#F3EDFF' },
  { id: 'underage', label: 'Appears Underage', icon: 'child-care', color: '#3B82F6', bgColor: '#EDF4FF' },
  { id: 'other', label: 'Other Issue', icon: 'edit', color: '#10B981', bgColor: '#EDFFF8' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  onClose,
  profileName,
  onSubmitReport,
  existingReports = 0
}) => {
  const insets = useSafeAreaInsets();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customDetails, setCustomDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason && !customDetails.trim()) {
      await showDialog({
        title: 'Please select a reason',
        message: 'You must select a reason or provide details for your report.',
        type: 'warning',
        buttons: [{ text: 'OK' }]
      });
      return;
    }

    if (selectedReason === 'other' && !customDetails.trim()) {
      await showDialog({
        title: 'Details Required',
        message: 'Please provide details about the issue when selecting "Other Issue".',
        type: 'warning',
        buttons: [{ text: 'OK' }]
      });
      return;
    }

    if (selectedReason === 'other' && customDetails.trim().length < 10) {
      await showDialog({
        title: 'More Details Needed',
        message: 'Please provide at least 10 characters describing the issue.',
        type: 'warning',
        buttons: [{ text: 'OK' }]
      });
      return;
    }

    setIsSubmitting(true);
    
    const reason = selectedReason || 'custom';
    const details = customDetails.trim() || reportReasons.find(r => r.id === selectedReason)?.label || '';
    
    try {
      await onSubmitReport(reason, details);
      
      await showDialog({
        title: 'Report Submitted',
        message: 'Thank you for helping keep our community safe. We take all reports seriously and will review this profile.',
        type: 'success',
        buttons: [{ text: 'OK', onPress: handleClose }]
      });
    } catch (error) {
      await showDialog({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to submit report. Please try again.',
        type: 'error',
        buttons: [{ text: 'OK' }]
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setCustomDetails('');
    setShowCustomInput(false);
    onClose();
  };

  const handleReasonSelect = (reasonId: string) => {
    setSelectedReason(reasonId);
    if (reasonId === 'other') {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      setCustomDetails('');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
      }}>
        <TouchableOpacity 
          style={{ flex: 1 }} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <View style={{
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 8,
          maxHeight: '90%'
        }}>
          {/* Handle Bar */}
          <View style={{
            width: 40,
            height: 4,
            backgroundColor: '#E5E5E5',
            borderRadius: 2,
            alignSelf: 'center',
            marginBottom: 16
          }} />
          
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB'
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: '#171717'
              }}>
                Report User
              </Text>
              <Text style={{
                fontSize: 13,
                color: '#737373',
                marginTop: 4
              }}>
                Help us understand the problem with {profileName}'s profile
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#F5F5F5',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MaterialIcons name="close" size={20} color="#737373" />
            </TouchableOpacity>
          </View>

          {/* Existing Reports Badge */}
          {existingReports > 0 && (
            <View style={styles.existingReportsBadge}>
              <MaterialIcons name="warning" size={20} color="#EF4444" />
              <Text style={styles.existingReportsText}>
                This profile has been reported {existingReports} {existingReports === 1 ? 'time' : 'times'}
              </Text>
            </View>
          )}

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
          >
          {/* Report Reasons */}
          <Text style={styles.sectionTitle}>
            Why are you reporting this profile?
          </Text>

          <View style={styles.reasonsContainer}>
            {reportReasons.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                onPress={() => handleReasonSelect(reason.id)}
                style={[
                  styles.reasonItem,
                  selectedReason === reason.id && styles.reasonItemSelected
                ]}
              >
                <View style={[styles.reasonIcon, { backgroundColor: reason.bgColor }]}>
                  <MaterialIcons name={reason.icon} size={20} color={reason.color} />
                </View>
                <Text style={[
                  styles.reasonText,
                  selectedReason === reason.id && styles.reasonTextSelected
                ]}>
                  {reason.label}
                </Text>
                {selectedReason === reason.id && (
                  <MaterialIcons name="check-circle" size={20} color="#F87171" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Details Input */}
          {(showCustomInput || selectedReason) && (
            <View style={styles.detailsContainer}>
              <Text style={styles.detailsLabel}>
                {showCustomInput ? 'Please provide details (required)' : 'Additional details (optional)'}
              </Text>
              <View style={styles.detailsInputContainer}>
                <TextInput
                  value={customDetails}
                  onChangeText={setCustomDetails}
                  placeholder="Describe the issue in detail..."
                  placeholderTextColor="#A3A3A3"
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  style={styles.detailsInput}
                  textAlignVertical="top"
                  autoCorrect={true}
                  spellCheck={true}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: '#737373' }}>
                    {showCustomInput && customDetails.length < 10 && 'Minimum 10 characters'}
                  </Text>
                  <Text style={styles.characterCount}>
                    {customDetails.length}/500
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Information Notice */}
          <View style={styles.infoNotice}>
            <MaterialIcons name="info" size={18} color="#0284C7" style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>
                Your report is anonymous
              </Text>
              <Text style={styles.infoText}>
                {profileName} won't know who reported them. We review all reports within 24 hours and take appropriate action to keep our community safe.
              </Text>
            </View>
          </View>
        </ScrollView>
        
        {/* Footer */}
        <View style={{
          flexDirection: 'row',
          padding: 20,
          paddingBottom: insets.bottom + 20,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          backgroundColor: '#FFFFFF',
          gap: 12
        }}>
          <TouchableOpacity
            onPress={handleClose}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#D1D5DB',
              alignItems: 'center'
            }}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#6B7280'
            }}>
              Cancel
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || (!selectedReason && !customDetails.trim())}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              backgroundColor: (isSubmitting || (!selectedReason && !customDetails.trim())) ? '#F87171' : '#EF4444',
              alignItems: 'center',
              opacity: (isSubmitting || (!selectedReason && !customDetails.trim())) ? 0.5 : 1
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#FFFFFF'
              }}>
                Submit Report
              </Text>
            )}
          </TouchableOpacity>
        </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    paddingHorizontal: 20,
  },
  existingReportsBadge: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
  },
  existingReportsText: {
    marginLeft: 8,
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 12,
  },
  reasonsContainer: {
    marginBottom: 20,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 8,
  },
  reasonItemSelected: {
    backgroundColor: '#FFF1F2',
    borderColor: '#F87171',
  },
  reasonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reasonText: {
    flex: 1,
    fontSize: 15,
    color: '#262626',
    fontWeight: '400',
  },
  reasonTextSelected: {
    fontWeight: '600',
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#262626',
    marginBottom: 8,
  },
  detailsInputContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 12,
  },
  detailsInput: {
    fontSize: 15,
    color: '#262626',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#737373',
    marginTop: 8,
    textAlign: 'right',
  },
  infoNotice: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    flexDirection: 'row',
  },
  infoIcon: {
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
    marginLeft: 8,
  },
  infoTitle: {
    fontSize: 13,
    color: '#075985',
    fontWeight: '500',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#0C4A6E',
    lineHeight: 18,
  },
});

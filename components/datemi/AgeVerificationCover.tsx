import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  Modal,
  ScrollView,
} from 'react-native';
import { showDialog } from '../../utils/dialogService';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { EnhancedDatePicker } from './EnhancedDatePicker';

interface AgeVerificationCoverProps {
  onVerificationComplete: (dateOfBirth: string) => void;
}

export default function AgeVerificationCover({ onVerificationComplete }: AgeVerificationCoverProps) {
  const [showModal, setShowModal] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState(new Date(2000, 0, 1));
  const [consentChecked, setConsentChecked] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const insets = useSafeAreaInsets();

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleVerifyAge = async () => {
    const age = calculateAge(dateOfBirth);
    
    // Validate age requirement
    if (age < 18) {
      await showDialog({
        title: 'Age Requirement Not Met',
        message: 'You must be 18+ to use Date Mi. Please verify your date of birth.',
        type: 'error',
        icon: { name: 'error', color: '#EF4444', size: 32 },
        buttons: [{ text: 'OK' }]
      });
      return;
    }

    // Validate consent checkbox
    if (!consentChecked) {
      await showDialog({
        title: 'Consent Required',
        message: 'Please confirm that you are 18 years or older to continue.',
        type: 'warning',
        icon: { name: 'warning', color: '#F59E0B', size: 32 },
        buttons: [{ text: 'OK' }]
      });
      return;
    }

    // Verification successful
    setShowModal(false);
    await showDialog({
      title: 'Verification Complete',
      message: 'Your age has been verified. Welcome to Date Mi!',
      type: 'success',
      icon: { name: 'check-circle', color: '#10B981', size: 48 },
      buttons: [
        { 
          text: 'Continue', 
          style: 'default',
          onPress: () => {
            onVerificationComplete(dateOfBirth.toISOString());
          }
        }
      ]
    });
  };


  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Cover Image Background - Full graphic with proper coverage */}
      <Image
        source={require('../../assets/images/datemi_cover.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
        onLoadEnd={() => setImageLoaded(true)}
        fadeDuration={0}
      />
      
      {/* Subtle overlay for text readability */}
      <View style={[styles.imageOverlay, !imageLoaded && styles.loadingOverlay]} />

      {/* Content Layer - positioned above background */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }] }>
          <Text style={styles.headerTitle}>Date Mi</Text>
        </View>

        {/* Hero Illustration */}
        <View style={styles.heroContainer}>
          <View style={styles.illustrationContainer}>
            {/* Calendar icon with lock overlay */}
            <View style={styles.calendarIllustration}>
              <Text style={styles.calendar}>📅</Text>
              {/* Lock icon positioned to complement calendar */}
              <View style={styles.lockOverlay}>
                <Text style={styles.lock}>🔒</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          <Text style={styles.headline}>Age Verification Required</Text>
          <Text style={styles.subtext}>
            Date Mi is for adults 18+ only.{'\n'}
            Verify your age to continue.
          </Text>

          {/* Benefits List */}
          <View style={styles.benefitsList}>
            <Text style={styles.benefitItem}>✓ Verified once, never again</Text>
            <Text style={styles.benefitItem}>✓ Secure & encrypted</Text>
            <Text style={styles.benefitItem}>✓ Takes under 2 minutes</Text>
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() => setShowModal(true)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#8B5FFF', '#7B4FEF']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.buttonText}>Verify My Age</Text>
              <Text style={styles.buttonIcon}>→</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Your date of birth is used to verify your age and will also appear{'\n'}
            in your profile details so we can use age in the matching algorithm.
          </Text>
        </View>
      </ScrollView>

      {/* Verification Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verify Your Age</Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <EnhancedDatePicker
                value={dateOfBirth}
                onChange={setDateOfBirth}
                mode="birthdate"
                label="Date of Birth"
                placeholder="Select your date of birth"
                accentColor="#6B46C1"
                textColor="#333333"
                minimumDate={new Date(1900, 0, 1)}
                maximumDate={new Date()}
              />

              {/* Consent Checkbox */}
              <TouchableOpacity
                style={styles.consentContainer}
                onPress={() => setConsentChecked(!consentChecked)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, consentChecked && styles.checkboxChecked]}>
                  {consentChecked && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.consentText}>
                  I confirm I am 18 years or older
                </Text>
              </TouchableOpacity>

              {/* Legal Disclaimer */}
              <View style={styles.disclaimerBox}>
                <Text style={styles.disclaimerTitle}>Legal Disclaimer</Text>
                <Text style={styles.disclaimerContent}>
                  By proceeding, you confirm you are at least 18 years old. Providing false information may result in account suspension. Your date of birth is used to verify your age and will also appear in your profile details so we can use age in the matching algorithm.
                </Text>
              </View>

              {/* Privacy Notice Link */}
              <TouchableOpacity style={styles.privacyLink}>
                <Text style={styles.privacyLinkText}>🔒 Privacy Notice</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!consentChecked || calculateAge(dateOfBirth) < 18) && styles.submitButtonDisabled
                ]}
                onPress={handleVerifyAge}
                activeOpacity={0.9}
                disabled={!consentChecked || calculateAge(dateOfBirth) < 18}
              >
                <LinearGradient
                  colors={consentChecked && calculateAge(dateOfBirth) >= 18 
                    ? ['#6B46C1', '#553C9A'] 
                    : ['#CCCCCC', '#999999']}
                  style={styles.submitButtonGradient}
                >
                  <Text style={styles.submitButtonText}>Verify & Continue</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  loadingOverlay: {
    backgroundColor: '#6B46C1',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 0,
  },
  heroContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 100,
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarIllustration: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  calendar: {
    fontSize: 72,
    color: '#D1C4E9',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 5,
  },
  lock: {
    fontSize: 24,
    color: '#FFB74D',
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF', // White color for Date Mi title
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textAlign: 'center',
  },
  contentContainer: {
    paddingHorizontal: 30,
    paddingTop: 32,
    paddingBottom: 40,
  },
  headline: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtext: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  benefitsList: {
    alignItems: 'center',
  },
  benefitItem: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  verifyButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 40,
    marginBottom: 32,
    marginHorizontal: 24,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  buttonIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  disclaimer: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666666',
    fontWeight: 'bold',
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  ageRequirement: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(164, 241, 79, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 30,
    gap: 10,
  },
  requirementIcon: {
    fontSize: 20,
  },
  requirementText: {
    flex: 1,
    fontSize: 13,
    color: '#333333',
    lineHeight: 18,
  },
  submitButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#6B46C1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  consentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#6B46C1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#6B46C1',
    borderColor: '#6B46C1',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  consentText: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
    fontWeight: '500',
  },
  disclaimerBox: {
    backgroundColor: 'rgba(107, 70, 193, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(107, 70, 193, 0.2)',
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B46C1',
    marginBottom: 8,
  },
  disclaimerContent: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 18,
  },
  privacyLink: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  privacyLinkText: {
    fontSize: 14,
    color: '#6B46C1',
    fontWeight: '600',
  },
});

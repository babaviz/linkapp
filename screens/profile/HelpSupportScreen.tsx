import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Alert, 
  Linking,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Modal
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getUserFacingError } from '../../utils/userFacingError';

export default function HelpSupportScreen() {
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);

  // Disable swipe back gesture for this screen
  React.useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerShown: false,
    });
  }, [navigation]);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  // Entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const supportCategories = [
    { id: 'account', title: 'Account Issues', icon: '👤' },
    { id: 'billing', title: 'Billing & Payments', icon: '💳' },
    { id: 'technical', title: 'Technical Support', icon: '⚙️' },
    { id: 'safety', title: 'Safety & Security', icon: '🛡️' },
    { id: 'feature', title: 'Feature Request', icon: '💡' },
    { id: 'other', title: 'Other', icon: '❓' },
  ];

  const contactMethods = [
    { 
      title: 'Email Support',
      description: 'Get help via email within 24 hours',
      action: () => Linking.openURL('mailto:linkapp254@gmail.com'),
      icon: '📧'
    },
    {
      title: 'Live Chat',
      description: 'Chat with our support team (9 AM - 6 PM)',
      action: () => Alert.alert('Live Chat', 'Live chat feature coming soon!'),
      icon: '💬'
    },
    {
      title: 'WhatsApp Support',
      description: 'Quick help via WhatsApp',
      action: () => Linking.openURL('https://wa.me/254726757886'),
      icon: '📱'
    },
    {
      title: 'FAQ',
      description: 'Browse frequently asked questions',
      action: () => Alert.alert('FAQ', 'FAQ section coming soon!'),
      icon: '📚'
    },
  ];

  const handleQuickLink = (linkType: string) => {
    switch (linkType) {
      case 'terms':
        Linking.openURL('https://link-app.co/terms-of-service');
        break;
      case 'privacy':
        Linking.openURL('https://link-app.co/privacy-policy');
        break;
      case 'safety':
        Linking.openURL('https://link-app.co/safety-guidelines');
        break;
      case 'about':
        setShowAboutDialog(true);
        break;
      default:
        Alert.alert('Link', 'This link will be available in a future update.');
    }
  };

  const handleSubmitTicket = async () => {
    if (!selectedCategory || !subject.trim() || !message.trim()) {
      Alert.alert('Missing Information', 'Please fill in all fields to submit your support request.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert(
        'Support Request Sent',
        'Your support request has been submitted successfully. We\'ll get back to you within 24 hours.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Clear form
              setSelectedCategory('');
              setSubject('');
              setMessage('');
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      const friendly = getUserFacingError(error, {
        action: 'submit your support request',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const ContactMethod = ({ icon, title, description, onPress }: {
    icon: string;
    title: string;
    description: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity 
      style={styles.contactMethod}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.contactMethodLeft}>
        <View style={styles.methodIconContainer}>
          <Text style={styles.methodIcon}>{icon}</Text>
        </View>
        <View style={styles.contactMethodContent}>
          <Text style={styles.methodTitle}>{title}</Text>
          <Text style={styles.methodDescription}>{description}</Text>
        </View>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  const CategoryChip = ({ category, isSelected, onPress }: {
    category: { id: string; title: string; icon: string };
    isSelected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        isSelected ? styles.categoryChipSelected : styles.categoryChipDefault
      ]}
      onPress={onPress}
    >
      <Text style={styles.categoryIcon}>{category.icon}</Text>
      <Text style={[
        styles.categoryText,
        isSelected ? styles.categoryTextSelected : styles.categoryTextDefault
      ]}>
        {category.title}
      </Text>
    </TouchableOpacity>
  );

  const QuickLink = ({ icon, title, onPress }: {
    icon: string;
    title: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity 
      style={styles.quickLink}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.quickLinkLeft}>
        <View style={styles.linkIconContainer}>
          <Text style={styles.linkIcon}>{icon}</Text>
        </View>
        <Text style={styles.linkTitle}>{title}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Contact Methods */}
          <Animated.View style={[
            styles.section,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 25],
                  extrapolate: 'clamp'
                })
              }]
            }
          ]}>
            <Text style={styles.sectionTitle}>📞 Contact Support</Text>
            <View style={styles.contactMethodsContainer}>
              {contactMethods.map((method, index) => (
                <ContactMethod
                  key={index}
                  icon={method.icon}
                  title={method.title}
                  description={method.description}
                  onPress={method.action}
                />
              ))}
            </View>
          </Animated.View>

          {/* Submit Support Request */}
          <Animated.View style={[
            styles.section,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 20],
                  extrapolate: 'clamp'
                })
              }]
            }
          ]}>
            <Text style={styles.sectionTitle}>✉️ Submit Support Request</Text>
            
            {/* Category Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.categoriesScrollView}
                contentInsetAdjustmentBehavior="automatic"
              >
                <View style={styles.categoriesContainer}>
                  {supportCategories.map((category) => (
                    <CategoryChip
                      key={category.id}
                      category={category}
                      isSelected={selectedCategory === category.id}
                      onPress={() => setSelectedCategory(category.id)}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Subject */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Subject</Text>
              <TextInput
                style={styles.textInput}
                value={subject}
                onChangeText={setSubject}
                placeholder="Brief description of your issue"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Message */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Message</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                value={message}
                onChangeText={setMessage}
                placeholder="Please describe your issue in detail..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled
              ]}
              onPress={handleSubmitTicket}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <View style={styles.submitButtonLoading}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.submitButtonText}>Submitting...</Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Quick Links */}
          <Animated.View style={[
            styles.section,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 15],
                  extrapolate: 'clamp'
                })
              }]
            }
          ]}>
            <Text style={styles.sectionTitle}>🔗 Quick Links</Text>
            <View style={styles.quickLinksContainer}>
              <QuickLink 
                icon="📋" 
                title="Terms of Service" 
                onPress={() => handleQuickLink('terms')}
              />
              <QuickLink 
                icon="🔒" 
                title="Privacy Policy" 
                onPress={() => handleQuickLink('privacy')}
              />
              <QuickLink 
                icon="🛡️" 
                title="Safety Guidelines" 
                onPress={() => handleQuickLink('safety')}
              />
              <QuickLink 
                icon="ℹ️" 
              title="About LinkApp" 
                onPress={() => handleQuickLink('about')}
              />
            </View>
          </Animated.View>
        </ScrollView>
      </Animated.View>

      {/* About LinkApp Dialog */}
      <Modal
        visible={showAboutDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAboutDialog(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogContainer}>
            <View style={styles.dialogIconContainer}>
              <Text style={styles.dialogIcon}>ℹ️</Text>
            </View>
            
            <Text style={styles.dialogTitle}>About LinkApp</Text>
            <Text style={styles.dialogMessage}>
              LinkApp connects communities by providing a platform for property listings, job opportunities, services, and social connections.
            </Text>
            
            <View style={styles.versionContainer}>
              <View style={styles.versionRow}>
                <Text style={styles.versionLabel}>Version</Text>
                <Text style={styles.versionValue}>1.0.0</Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowAboutDialog(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 18,
    color: '#374151',
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  contactMethodsContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  contactMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  contactMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIconContainer: {
    width: 44,
    height: 44,
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  methodIcon: {
    fontSize: 20,
  },
  contactMethodContent: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  methodDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  arrow: {
    fontSize: 20,
    color: '#9CA3AF',
    fontWeight: '300',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  categoriesScrollView: {
    marginBottom: 4,
  },
  categoriesContainer: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  categoryChip: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 2,
    minWidth: 80,
  },
  categoryChipDefault: {
    backgroundColor: '#f8fafc',
    borderColor: '#e5e7eb',
  },
  categoryChipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  categoryTextDefault: {
    color: '#6B7280',
  },
  categoryTextSelected: {
    color: '#ffffff',
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },
  textAreaInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0.1,
  },
  submitButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickLinksContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  quickLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  linkIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  linkIcon: {
    fontSize: 18,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dialogContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  dialogIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  dialogIcon: {
    fontSize: 36,
  },
  dialogTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  dialogMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  versionContainer: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  versionValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '700',
  },
  closeButton: {
    width: '100%',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

/**
 * Content Creation Demo Component
 * Tests and demonstrates unified content creation across all modules
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ContentForm from './ContentForm';
import MediaUpload from './MediaUpload';
import { useContentModeration } from '../../hooks/useContentModeration';
import { contentService, ContentType } from '../../services/contentService';

interface DemoSection {
  id: string;
  title: string;
  module: 'property' | 'jobs' | 'services' | 'datemi';
  icon: string;
  color: string;
  description: string;
}

const demoSections: DemoSection[] = [
  {
    id: 'property',
    title: 'Property Hub',
    module: 'property',
    icon: 'home',
    color: '#0F766E',
    description: 'Create property listings with images and details',
  },
  {
    id: 'jobs',
    title: 'Jobs & Skills',
    module: 'jobs',
    icon: 'briefcase',
    color: '#0F766E',
    description: 'Post job opportunities and skill requirements',
  },
  {
    id: 'services',
    title: 'Services & Tools',
    module: 'services',
    icon: 'construct',
    color: '#7C3AED',
    description: 'Offer services and tools for rent or sale',
  },
  {
    id: 'datemi',
    title: 'Date Mi',
    module: 'datemi',
    icon: 'heart',
    color: '#7C3AED',
    description: 'Create dating profile and preferences',
  },
];

export default function ContentCreationDemo() {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [createdContent, setCreatedContent] = useState<Record<string, any[]>>({});
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  const { moderateContent } = useContentModeration();

  // Sample content for testing
  const getSampleContent = (module: string): Partial<ContentType> => {
    const baseContent = {
      user_id: 'demo-user-123',
      title: '',
      description: '',
      status: 'draft' as const,
      location: {
        county: 'Nairobi',
        town: 'Westlands',
        coordinates: { latitude: -1.2921, longitude: 36.8219 },
      },
    };

    switch (module) {
      case 'property':
        return {
          ...baseContent,
          module: 'property',
          title: 'Modern 2BR Apartment in Westlands',
          description: 'Spacious apartment with modern amenities, parking, and security',
          property_type: 'apartments',
          price: 45000,
          price_period: 'monthly',
          currency: 'KSH',
          bedrooms: 2,
          bathrooms: 2,
          area_sqm: 85,
          amenities: ['Parking', 'Security', 'WiFi', 'Generator'],
          contact_phone: '+254712345678',
        };

      case 'jobs':
        return {
          ...baseContent,
          module: 'jobs',
          title: 'Senior Software Developer - React Native',
          description: 'Looking for experienced React Native developer for mobile app development',
          job_type: 'full_time',
          skill_category: 'Technology',
          salary_min: 80000,
          salary_max: 120000,
          salary_period: 'monthly',
          requirements: ['3+ years React Native', 'TypeScript experience', 'Mobile app deployment'],
          company_name: 'Tech Innovators Kenya',
        };

      case 'services':
        return {
          ...baseContent,
          module: 'services',
          title: 'Professional Plumbing Services',
          description: 'Expert plumbing installation and repair services available 24/7',
          service_category: 'Home Services',
          business_name: 'Nairobi Plumbers Pro',
          price_type: 'hourly',
          price_amount: 1500,
          currency: 'KSH',
          availability: 'available',
          contact_phone: '+254723456789',
          features: ['24/7 Service', 'Licensed', 'Insured', 'Emergency Response'],
        };

      case 'datemi':
        return {
          ...baseContent,
          module: 'datemi',
          title: 'Dating Profile - Sarah',
          description: 'Looking for meaningful connections and someone to explore Nairobi with',
          content_type: 'profile',
          birth_date: '1995-05-15',
          gender: 'Female',
          looking_for: 'Serious relationship',
          interests: ['travel', 'photography', 'cooking', 'hiking'],
          height: 165,
          education: 'Bachelor\'s Degree',
          occupation: 'Marketing Manager',
        };

      default:
        return baseContent;
    }
  };

  // Test content validation and moderation
  const testModule = async (module: string) => {
    try {
      const sampleContent = getSampleContent(module) as ContentType;
      
      // Test validation
      const validation = contentService.validateContent(sampleContent);
      
      // Transform content for moderation
      const getModerationType = (mod: string): 'property' | 'job' | 'service' | 'profile' | 'message' => {
        switch (mod) {
          case 'property': return 'property';
          case 'jobs': return 'job';
          case 'services': return 'service';
          case 'datemi': return 'profile';
          default: return 'property';
        }
      };
      
      const contentSubmission = {
        type: getModerationType(module),
        title: sampleContent.title,
        description: sampleContent.description,
        userId: 'demo-user-id'
      };
      
      // Test moderation
      const moderation = await moderateContent(contentSubmission);
      
      // Store test results
      setTestResults(prev => ({
        ...prev,
        [module]: {
          validation,
          moderation,
          sampleContent,
          timestamp: new Date().toISOString(),
        },
      }));

      Alert.alert(
        'Test Results',
        `Module: ${module}\n` +
        `Validation: ${validation.valid ? 'PASSED' : 'FAILED'}\n` +
        `Moderation: ${moderation.approved ? 'APPROVED' : 'NEEDS REVIEW'}\n` +
        `Safety Score: ${Math.round((moderation.safetyResult.confidence_score || 0) * 100)}%`
      );
    } catch (error: any) {
      Alert.alert('Test Error', `Failed to test ${module}: ${error.message}`);
    }
  };

  // Handle form submission success
  const handleSubmitSuccess = (contentId: string, module: string) => {
    setCreatedContent(prev => ({
      ...prev,
      [module]: [...(prev[module] || []), { id: contentId, created: new Date().toISOString() }],
    }));
    setShowForm(false);
    setSelectedModule(null);
    Alert.alert('Success!', `Content created successfully with ID: ${contentId}`);
  };

  // Handle form submission error
  const handleSubmitError = (errors: string[]) => {
    Alert.alert('Submission Error', errors.join('\n'));
  };

  const getModuleColor = (module: string) => {
    return demoSections.find(s => s.id === module)?.color || '#0F766E';
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            Content Creation System Demo
          </Text>
          <Text style={styles.subtitle}>
            Test unified content creation across all app modules
          </Text>
          
          {/* Metrics */}
          <View style={styles.metricsCard}>
            <Text style={styles.metricsTitle}>Test Metrics</Text>
            <View style={styles.metricsRow}>
              <Text style={styles.metricText}>Checked: {Object.keys(testResults).length}</Text>
              <Text style={styles.approvedText}>Approved: {Object.values(testResults).filter((r: any) => r.moderation?.approved).length}</Text>
              <Text style={styles.rejectedText}>Rejected: {Object.values(testResults).filter((r: any) => !r.moderation?.approved).length}</Text>
              <Text style={styles.pendingText}>Pending: {Object.values(testResults).filter((r: any) => r.moderation?.requiresReview).length}</Text>
            </View>
            {Object.keys(testResults).length > 0 && (
              <Text style={styles.averageText}>
                Average Score: {Math.round((Object.values(testResults).reduce((acc: number, r: any) => acc + (r.moderation?.safetyResult?.score || 0), 0) / Object.keys(testResults).length) * 100)}%
              </Text>
            )}
          </View>
        </View>

        {/* Module Cards */}
        <Text style={styles.moduleTitle}>
          Select Module to Test
        </Text>
        
        {demoSections.map((section) => (
          <View key={section.id} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionRow}>
                <View 
                  style={[styles.iconContainer, { backgroundColor: section.color + '20' }]}
                >
                  <Ionicons name={section.icon as any} size={24} color={section.color} />
                </View>
                <View style={styles.sectionTextContainer}>
                  <Text style={styles.sectionTitle}>
                    {section.title}
                  </Text>
                  <Text style={styles.sectionDescription}>
                    {section.description}
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={() => testModule(section.module)}
                style={[styles.testButton, { borderColor: section.color }]}
              >
                <Text style={[styles.testButtonText, { color: section.color }]}>
                  Quick Test
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSelectedModule(section.module);
                  setShowForm(true);
                }}
                style={[styles.createButton, { backgroundColor: section.color }]}
              >
                <Text style={styles.createButtonText}>Create Content</Text>
              </TouchableOpacity>
            </View>

            {/* Test Results */}
            {testResults[section.module] && (
              <View style={styles.resultsCard}>
                <Text style={styles.resultsTitle}>Last Test Result:</Text>
                <View style={styles.resultsRow}>
                  <Text style={[
                    styles.resultText,
                    testResults[section.module].validation.valid ? styles.validText : styles.invalidText
                  ]}>
                    Validation: {testResults[section.module].validation.valid ? 'PASS' : 'FAIL'}
                  </Text>
                  <Text style={[
                    styles.resultText,
                    testResults[section.module].moderation.approved ? styles.approvedText : styles.pendingText
                  ]}>
                    Moderation: {testResults[section.module].moderation.approved ? 'APPROVED' : 'REVIEW'}
                  </Text>
                </View>
                {testResults[section.module].moderation.flags && (
                  <Text style={styles.flagsText}>
                    Flags: {testResults[section.module].moderation.flags.join(', ')}
                  </Text>
                )}
              </View>
            )}

            {/* Created Content Count */}
            {createdContent[section.module]?.length > 0 && (
              <View style={styles.contentCountContainer}>
                <Text style={styles.contentCountText}>
                  ✅ {createdContent[section.module].length} content(s) created
                </Text>
              </View>
            )}
          </View>
        ))}

        {/* Overall Test Button */}
        <TouchableOpacity
          onPress={() => {
            demoSections.forEach(section => {
              setTimeout(() => testModule(section.module), 100 * demoSections.indexOf(section));
            });
          }}
          style={styles.testAllButton}
        >
          <Text style={styles.testAllButtonText}>Test All Modules</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Content Form Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForm(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                Create {selectedModule?.charAt(0).toUpperCase()}{selectedModule?.slice(1)} Content
              </Text>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {selectedModule && (
            <ContentForm
              module={selectedModule as any}
              initialContent={getSampleContent(selectedModule)}
              onSubmitSuccess={(contentId) => handleSubmitSuccess(contentId, selectedModule)}
              onSubmitError={handleSubmitError}
              onCancel={() => setShowForm(false)}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    color: '#6B7280',
    marginBottom: 16,
  },
  metricsCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  metricsTitle: {
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricText: {
    fontSize: 12,
    color: '#6B7280',
  },
  approvedText: {
    fontSize: 12,
    color: '#059669',
  },
  rejectedText: {
    fontSize: 12,
    color: '#DC2626',
  },
  pendingText: {
    fontSize: 12,
    color: '#D97706',
  },
  averageText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  sectionCard: {
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTextContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  testButton: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    fontWeight: '500',
  },
  createButton: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  resultsCard: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  resultsTitle: {
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resultText: {
    fontSize: 12,
  },
  validText: {
    color: '#059669',
  },
  invalidText: {
    color: '#DC2626',
  },
  flagsText: {
    fontSize: 10,
    color: '#DC2626',
    marginTop: 4,
  },
  contentCountContainer: {
    marginTop: 8,
  },
  contentCountText: {
    fontSize: 12,
    color: '#6B7280',
  },
  testAllButton: {
    marginTop: 16,
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  testAllButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 18,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
});

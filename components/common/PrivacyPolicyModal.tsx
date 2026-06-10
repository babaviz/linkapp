import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { privacyPolicyService } from '../../services/privacyPolicyService';
import { privacyPolicyData } from '../../data/privacyPolicy';

interface PrivacyPolicyModalProps {
  visible: boolean;
  onAccept: () => void;
  onClose?: () => void;
  isFirstView?: boolean;
  showAcceptButton?: boolean;
}

export default function PrivacyPolicyModal({
  visible,
  onAccept,
  onClose,
  isFirstView = false,
  showAcceptButton = true,
}: PrivacyPolicyModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const canDismiss = !isFirstView;

  useEffect(() => {
    // Mark as viewed if it's the first view
    if (visible && isFirstView) {
      privacyPolicyService.markAsViewedFirstTime();
    }
  }, [visible, isFirstView]);

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await privacyPolicyService.acceptPolicy();
      onAccept();
    } catch {
      // Handle error - could show alert here
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (canDismiss && onClose) {
      onClose();
    }
  };

  // Parse markdown-like content (simple implementation)
  const renderContent = () => {
    const lines = privacyPolicyData.content.split('\n');
    const elements: React.ReactNode[] = [];
    let currentParagraph: string[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('# ')) {
        // Main heading
        if (currentParagraph.length > 0) {
          elements.push(
            <Text key={`para-${index}`} style={styles.paragraph}>
              {currentParagraph.join(' ')}
            </Text>
          );
          currentParagraph = [];
        }
        elements.push(
          <Text key={`h1-${index}`} style={styles.heading1}>
            {trimmedLine.substring(2)}
          </Text>
        );
      } else if (trimmedLine.startsWith('## ')) {
        // Subheading
        if (currentParagraph.length > 0) {
          elements.push(
            <Text key={`para-${index}`} style={styles.paragraph}>
              {currentParagraph.join(' ')}
            </Text>
          );
          currentParagraph = [];
        }
        elements.push(
          <Text key={`h2-${index}`} style={styles.heading2}>
            {trimmedLine.substring(3)}
          </Text>
        );
      } else if (trimmedLine.startsWith('### ')) {
        // Sub-subheading
        if (currentParagraph.length > 0) {
          elements.push(
            <Text key={`para-${index}`} style={styles.paragraph}>
              {currentParagraph.join(' ')}
            </Text>
          );
          currentParagraph = [];
        }
        elements.push(
          <Text key={`h3-${index}`} style={styles.heading3}>
            {trimmedLine.substring(4)}
          </Text>
        );
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        // List item
        if (currentParagraph.length > 0) {
          elements.push(
            <Text key={`para-${index}`} style={styles.paragraph}>
              {currentParagraph.join(' ')}
            </Text>
          );
          currentParagraph = [];
        }
        elements.push(
          <View key={`list-${index}`} style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listText}>{trimmedLine.substring(2)}</Text>
          </View>
        );
      } else if (trimmedLine.length > 0) {
        // Regular paragraph text
        currentParagraph.push(trimmedLine);
      } else {
        // Empty line - end current paragraph
        if (currentParagraph.length > 0) {
          elements.push(
            <Text key={`para-${index}`} style={styles.paragraph}>
              {currentParagraph.join(' ')}
            </Text>
          );
          currentParagraph = [];
        }
      }
    });

    // Add any remaining paragraph
    if (currentParagraph.length > 0) {
      elements.push(
        <Text key="para-final" style={styles.paragraph}>
          {currentParagraph.join(' ')}
        </Text>
      );
    }

    return elements;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>🔒 Privacy Policy</Text>
            <Text style={styles.headerSubtitle}>
              Version {privacyPolicyData.version} • Last Updated: {privacyPolicyData.lastUpdated}
            </Text>
          </View>
          {canDismiss && onClose && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={true}
        >
          {renderContent()}
        </ScrollView>

        {/* Footer */}
        {showAcceptButton && (
          <View style={styles.footer}>
            {isFirstView && (
              <View style={styles.firstViewNotice}>
                <MaterialIcons name="info-outline" size={20} color="#0284c7" />
                <Text style={styles.firstViewText}>
                  Please read and accept our Privacy Policy to continue
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.acceptButton, isLoading && styles.acceptButtonDisabled]}
              onPress={handleAccept}
              disabled={isLoading}
              accessibilityLabel="Accept Privacy Policy"
              accessibilityRole="button"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.acceptButtonText}>I Accept</Text>
              )}
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
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  closeButton: {
    padding: 8,
    marginLeft: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  heading1: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 12,
  },
  heading2: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 20,
    marginBottom: 10,
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
  },
  bullet: {
    fontSize: 16,
    color: '#0284c7',
    marginRight: 12,
    fontWeight: 'bold',
  },
  listText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#ffffff',
  },
  firstViewNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  firstViewText: {
    flex: 1,
    fontSize: 14,
    color: '#0284c7',
    marginLeft: 8,
    fontWeight: '500',
  },
  acceptButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    shadowColor: '#0284c7',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  acceptButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});


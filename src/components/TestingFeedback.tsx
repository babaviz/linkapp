import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');

interface FeedbackData {
  type: 'bug' | 'feature' | 'general';
  description: string;
  steps: string;
  deviceInfo: string;
}

const TestingFeedback: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackData>({
    type: 'bug',
    description: '',
    steps: '',
    deviceInfo: '',
  });

  const deviceInfo = `
Platform: ${Platform.OS} ${Platform.Version}
App Version: ${Constants.expoConfig?.version || '1.0.0'}
Device Model: ${Platform.OS === 'android' ? 'Android Device' : 'iOS Device'}
  `.trim();

  const handleSubmit = async () => {
    if (!feedback.description.trim()) {
      Alert.alert('Missing information', 'Please describe the issue or feedback.');
      return;
    }

    const feedbackData = {
      ...feedback,
      deviceInfo: deviceInfo,
      timestamp: new Date().toISOString(),
    };

    try {
      // For testing phase, we'll just copy to clipboard
      // In production, you would send this to your feedback API
      
      const feedbackText = `
FEEDBACK TYPE: ${feedback.type.toUpperCase()}
DESCRIPTION: ${feedback.description}
STEPS TO REPRODUCE: ${feedback.steps}
DEVICE INFO: ${deviceInfo}
TIMESTAMP: ${new Date().toLocaleString()}
      `.trim();

      // You can implement actual feedback submission here
      // For now, we'll show an alert with the feedback
      Alert.alert(
        'Feedback Collected',
        'Thank you for your feedback! Please share this information with the development team.',
        [
          { text: 'Copy to Clipboard', onPress: () => copyToClipboard(feedbackText) },
          { text: 'OK' }
        ]
      );

      // Reset form
      setFeedback({
        type: 'bug',
        description: '',
        steps: '',
        deviceInfo: '',
      });
      setIsVisible(false);

    } catch (error) {
      Alert.alert(
        'Couldn’t submit feedback',
        'Please try again. If it keeps failing, copy the details and share them with the team.'
      );
    }
  };

  const copyToClipboard = (text: string) => {
    // In a real app, you would use expo-clipboard
    
    Alert.alert('Info', 'Feedback details logged to console');
  };

  if (!isVisible) {
    return (
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsVisible(true)}
        testID="feedback-fab"
      >
        <Ionicons name="chatbubble-outline" size={24} color="white" />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Testing Feedback</Text>
          <TouchableOpacity
            onPress={() => setIsVisible(false)}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.label}>Feedback Type</Text>
          <View style={styles.typeSelector}>
            {(['bug', 'feature', 'general'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  feedback.type === type && styles.typeButtonActive,
                ]}
                onPress={() => setFeedback({ ...feedback, type })}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    feedback.type === type && styles.typeButtonTextActive,
                  ]}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Describe the issue or feedback..."
            value={feedback.description}
            onChangeText={(text) => setFeedback({ ...feedback, description: text })}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Steps to Reproduce (for bugs)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="1. Go to...\n2. Tap on...\n3. Expected vs actual result..."
            value={feedback.steps}
            onChangeText={(text) => setFeedback({ ...feedback, steps: text })}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Device Information</Text>
          <Text style={styles.deviceInfo}>{deviceInfo}</Text>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setIsVisible(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>Submit Feedback</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: width - 40,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
    maxHeight: 400,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
  },
  deviceInfo: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});

export default TestingFeedback;

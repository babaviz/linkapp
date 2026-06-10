/**
 * HomeScreen - Video calling test home screen
 * 
 * This screen allows users to initiate video or voice calls.
 * It integrates with the existing app's StreamVideoWrapper context.
 * 
 * Based on: https://getstream.io/video/sdk/react-native/tutorial/video-calling/
 */

import React, { useState } from 'react';
import { 
  Text, 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStreamVideoClient } from '@stream-io/video-react-native-sdk';

type Props = {
  goToCallScreen: (callId: string, callType: 'audio' | 'video') => void;
};

export const HomeScreen = ({ goToCallScreen }: Props) => {
  const [callId, setCallId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const client = useStreamVideoClient();

  // Generate a random call ID
  const generateCallId = () => {
    const randomId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setCallId(randomId);
  };

  // Handle joining a video call
  const handleJoinVideoCall = async () => {
    if (!callId.trim()) {
      generateCallId();
      return;
    }
    
    setIsJoining(true);
    // Small delay for UX
    await new Promise(resolve => setTimeout(resolve, 300));
    goToCallScreen(callId.trim(), 'video');
    setIsJoining(false);
  };

  // Handle joining an audio call
  const handleJoinAudioCall = async () => {
    if (!callId.trim()) {
      generateCallId();
      return;
    }
    
    setIsJoining(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    goToCallScreen(callId.trim(), 'audio');
    setIsJoining(false);
  };

  // Check if client is available
  const isClientReady = !!client;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="videocam" size={40} color="#8B5CF6" />
          </View>
          <Text style={styles.title}>Video Calling</Text>
          <Text style={styles.subtitle}>
            Test voice and video calls using GetStream SDK
          </Text>
        </View>

        {/* Connection Status */}
        <View style={[
          styles.statusBadge, 
          { backgroundColor: isClientReady ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
        ]}>
          <View style={[
            styles.statusDot,
            { backgroundColor: isClientReady ? '#10B981' : '#EF4444' }
          ]} />
          <Text style={[
            styles.statusText,
            { color: isClientReady ? '#10B981' : '#EF4444' }
          ]}>
            {isClientReady ? 'Connected to Stream' : 'Not connected'}
          </Text>
        </View>

        {/* Call ID Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Call ID</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter or generate a call ID"
              placeholderTextColor="#9CA3AF"
              value={callId}
              onChangeText={setCallId}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity 
              style={styles.generateButton}
              onPress={generateCallId}
            >
              <Ionicons name="shuffle" size={20} color="#8B5CF6" />
            </TouchableOpacity>
          </View>
          <Text style={styles.inputHint}>
            Share this ID with others to join the same call
          </Text>
        </View>

        {/* Call Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[
              styles.callButton,
              styles.videoCallButton,
              (!isClientReady || isJoining) && styles.buttonDisabled,
            ]}
            onPress={handleJoinVideoCall}
            disabled={!isClientReady || isJoining}
          >
            {isJoining ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="videocam" size={24} color="#FFFFFF" />
                <Text style={styles.buttonText}>Start Video Call</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.callButton,
              styles.audioCallButton,
              (!isClientReady || isJoining) && styles.buttonDisabled,
            ]}
            onPress={handleJoinAudioCall}
            disabled={!isClientReady || isJoining}
          >
            {isJoining ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="call" size={24} color="#FFFFFF" />
                <Text style={styles.buttonText}>Start Voice Call</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>How to test:</Text>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>1</Text>
            <Text style={styles.instructionText}>
              Generate or enter a call ID
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>2</Text>
            <Text style={styles.instructionText}>
              Start a video or voice call
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>3</Text>
            <Text style={styles.instructionText}>
              Share the call ID with another device to join
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 32,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputSection: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  generateButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  inputHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  buttonsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  videoCallButton: {
    backgroundColor: '#8B5CF6',
  },
  audioCallButton: {
    backgroundColor: '#10B981',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  instructionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },
});
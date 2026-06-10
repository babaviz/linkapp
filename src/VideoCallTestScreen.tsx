/**
 * VideoCallTestScreen - Main entry point for video calling test
 * 
 * This screen manages navigation between HomeScreen and CallScreen
 * for testing video/audio calls using GetStream SDK.
 * 
 * It must be rendered within a StreamVideo context (StreamVideoWrapper).
 * 
 * Based on: https://getstream.io/video/sdk/react-native/tutorial/video-calling/
 */

import React, { useState, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeScreen } from './components/Homescreen';
import { CallScreen } from './CallScreen';

type ActiveScreen = 'home' | 'call';

interface CallParams {
  callId: string;
  callType: 'audio' | 'video';
}

export const VideoCallTestScreen = () => {
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('home');
  const [callParams, setCallParams] = useState<CallParams>({
    callId: '',
    callType: 'video',
  });

  // Navigate to call screen with specified call ID and type
  const goToCallScreen = useCallback((callId: string, callType: 'audio' | 'video') => {
    setCallParams({ callId, callType });
    setActiveScreen('call');
  }, []);

  // Navigate back to home screen
  const goToHomeScreen = useCallback(() => {
    setActiveScreen('home');
    // Clear call params
    setCallParams({ callId: '', callType: 'video' });
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {activeScreen === 'call' && callParams.callId ? (
        <CallScreen
          goToHomeScreen={goToHomeScreen}
          callId={callParams.callId}
          callType={callParams.callType}
        />
      ) : (
        <HomeScreen goToCallScreen={goToCallScreen} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default VideoCallTestScreen;

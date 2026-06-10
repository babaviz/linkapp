/**
 * Call Permissions Utility
 * 
 * Handles camera and microphone permissions for video/audio calls
 */

import { Platform, Alert, Linking } from 'react-native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';

export interface CallPermissions {
  camera: boolean;
  microphone: boolean;
}

export interface PermissionResult {
  granted: boolean;
  canAskAgain: boolean;
  message?: string;
}

/**
 * Request camera permission
 */
export async function requestCameraPermission(): Promise<PermissionResult> {
  try {
    if (Platform.OS === 'web') {
      return { granted: true, canAskAgain: false };
    }

    const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain: canAskAgain ?? false,
      message: status === 'granted' 
        ? undefined 
        : 'Camera permission is required for video calls',
    };
  } catch (_error) {
    return {
      granted: false,
      canAskAgain: false,
      message: 'Failed to request camera permission',
    };
  }
}

/**
 * Request microphone permission
 */
export async function requestMicrophonePermission(): Promise<PermissionResult> {
  try {
    if (Platform.OS === 'web') {
      return { granted: true, canAskAgain: false };
    }

    const { status } = await Audio.requestPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain: status === 'undetermined',
      message: status === 'granted' 
        ? undefined 
        : 'Microphone permission is required for calls',
    };
  } catch (_error) {
    return {
      granted: false,
      canAskAgain: false,
      message: 'Failed to request microphone permission',
    };
  }
}

/**
 * Check camera permission status
 */
export async function checkCameraPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      return true;
    }

    const { status } = await ImagePicker.getCameraPermissionsAsync();
    return status === 'granted';
  } catch (_error) {
    return false;
  }
}

/**
 * Check microphone permission status
 */
export async function checkMicrophonePermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      return true;
    }

    const { status } = await Audio.getPermissionsAsync();
    return status === 'granted';
  } catch (_error) {
    return false;
  }
}

/**
 * Request permissions for video call (camera + microphone)
 * NOTE: Does not show alerts - caller should handle permission denied state
 */
export async function requestVideoCallPermissions(): Promise<CallPermissions> {
  const [cameraResult, micResult] = await Promise.all([
    requestCameraPermission(),
    requestMicrophonePermission(),
  ]);

  return {
    camera: cameraResult.granted,
    microphone: micResult.granted,
  };
}

/**
 * Request permissions for video call with user-facing alerts
 */
export async function requestVideoCallPermissionsWithAlert(): Promise<CallPermissions> {
  const permissions = await requestVideoCallPermissions();

  // Show alert if permissions denied
  if (!permissions.camera || !permissions.microphone) {
    const deniedPermissions: string[] = [];
    if (!permissions.camera) deniedPermissions.push('Camera');
    if (!permissions.microphone) deniedPermissions.push('Microphone');

    Alert.alert(
      'Permissions Required',
      `${deniedPermissions.join(' and ')} permission${deniedPermissions.length > 1 ? 's are' : ' is'} required for video calls.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  }

  return permissions;
}

/**
 * Request permissions for audio call (microphone only)
 * NOTE: Does not show alerts - caller should handle permission denied state
 */
export async function requestAudioCallPermissions(): Promise<CallPermissions> {
  const micResult = await requestMicrophonePermission();

  return {
    camera: false, // Not needed for audio calls
    microphone: micResult.granted,
  };
}

/**
 * Request permissions for audio call with user-facing alerts
 */
export async function requestAudioCallPermissionsWithAlert(): Promise<CallPermissions> {
  const permissions = await requestAudioCallPermissions();

  if (!permissions.microphone) {
    Alert.alert(
      'Microphone Permission Required',
      'Microphone permission is required for audio calls.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  }

  return permissions;
}

/**
 * Check all required permissions for call type
 */
export async function checkCallPermissions(callType: 'audio' | 'video'): Promise<CallPermissions> {
  const [cameraGranted, micGranted] = await Promise.all([
    callType === 'video' ? checkCameraPermission() : Promise.resolve(false),
    checkMicrophonePermission(),
  ]);

  return {
    camera: cameraGranted,
    microphone: micGranted,
  };
}


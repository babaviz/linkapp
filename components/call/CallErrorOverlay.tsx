/**
 * Shows a clear in-app error when a call fails or the call screen could not be opened.
 * Rendered globally so the user always sees feedback even when Alert is missed.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useNavigationState } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { selectCallError, clearError } from '../../redux/slices/callSlice';

const TITLE = "Call didn't start";
const DISMISS_LABEL = 'OK';

export function CallErrorOverlay() {
  const dispatch = useAppDispatch();
  const error = useAppSelector(selectCallError);
  const { width: windowWidth } = useWindowDimensions();

  const routeName = useNavigationState((state) => {
    if (!state?.routes?.length) return undefined;
    const route = state.routes[state.index] as { name?: string };
    return route?.name;
  });

  const isOnVideoCallScreen = routeName === 'VideoCall';
  const visible = Boolean(error) && !isOnVideoCallScreen;

  const handleDismiss = () => {
    dispatch(clearError());
  };

  if (!visible) return null;

  const cardWidth = Math.min(windowWidth - 32, 360);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleDismiss}
      >
        <TouchableOpacity
          style={[styles.card, { width: cardWidth }]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="call-outline" size={32} color="#EF4444" />
          </View>
          <Text style={styles.title}>{TITLE}</Text>
          <Text style={styles.message}>{error}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{DISMISS_LABEL}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default CallErrorOverlay;

import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Vibration,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NumericKeypadProps {
  onPress: (value: string) => void;
  onDelete: () => void;
  onClear?: () => void;
  disabled?: boolean;
  theme?: 'light' | 'dark';
  showClearButton?: boolean;
}

export default function NumericKeypad({ 
  onPress, 
  onDelete, 
  onClear,
  disabled = false,
  theme = 'dark',
  showClearButton = false 
}: NumericKeypadProps) {
  const handlePress = (value: string) => {
    if (!disabled) {
      if (Platform.OS === 'ios') {
        Vibration.vibrate(10);
      }
      onPress(value);
    }
  };

  const handleDelete = () => {
    if (!disabled) {
      if (Platform.OS === 'ios') {
        Vibration.vibrate(10);
      }
      onDelete();
    }
  };

  const handleClear = () => {
    if (!disabled && onClear) {
      if (Platform.OS === 'ios') {
        Vibration.vibrate(10);
      }
      onClear();
    }
  };

  const isDark = theme === 'dark';
  const buttonStyle = [
    styles.button,
    isDark ? styles.buttonDark : styles.buttonLight,
    disabled && styles.buttonDisabled,
  ];

  const buttonTextStyle = [
    styles.buttonText,
    isDark ? styles.buttonTextDark : styles.buttonTextLight,
    disabled && styles.buttonTextDisabled,
  ];

  const actionButtonStyle = [
    styles.button,
    styles.actionButton,
    isDark ? styles.actionButtonDark : styles.actionButtonLight,
    disabled && styles.buttonDisabled,
  ];

  return (
    <View style={styles.container}>
      {/* Row 1: 1, 2, 3 */}
      <View style={styles.row}>
        {['1', '2', '3'].map((num) => (
          <TouchableOpacity
            key={num}
            style={buttonStyle}
            onPress={() => handlePress(num)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={buttonTextStyle}>{num}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Row 2: 4, 5, 6 */}
      <View style={styles.row}>
        {['4', '5', '6'].map((num) => (
          <TouchableOpacity
            key={num}
            style={buttonStyle}
            onPress={() => handlePress(num)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={buttonTextStyle}>{num}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Row 3: 7, 8, 9 */}
      <View style={styles.row}>
        {['7', '8', '9'].map((num) => (
          <TouchableOpacity
            key={num}
            style={buttonStyle}
            onPress={() => handlePress(num)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={buttonTextStyle}>{num}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Row 4: Clear/Empty, 0, Delete */}
      <View style={styles.row}>
        {showClearButton ? (
          <TouchableOpacity
            style={actionButtonStyle}
            onPress={handleClear}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, isDark ? styles.actionTextDark : styles.actionTextLight]}>
              Clear
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.button, styles.emptyButton]} />
        )}

        <TouchableOpacity
          style={buttonStyle}
          onPress={() => handlePress('0')}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={buttonTextStyle}>0</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={actionButtonStyle}
          onPress={handleDelete}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="backspace-outline" 
            size={24} 
            color={isDark ? '#FFFFFF' : '#333333'} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  button: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  buttonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonLight: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 26,
    fontWeight: '600',
  },
  buttonTextDark: {
    color: '#FFFFFF',
  },
  buttonTextLight: {
    color: '#333333',
  },
  buttonTextDisabled: {
    opacity: 0.5,
  },
  actionButton: {
    backgroundColor: 'transparent',
  },
  actionButtonDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonLight: {
    backgroundColor: '#F0F0F0',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionTextDark: {
    color: '#FFFFFF',
  },
  actionTextLight: {
    color: '#666666',
  },
  emptyButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
});

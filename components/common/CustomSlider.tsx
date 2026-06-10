/**
 * Custom Slider Component - Simple Material 3 Design
 * Replacement for external slider dependency
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';

interface CustomSliderProps {
  minimumValue: number;
  maximumValue: number;
  value: number;
  onValueChange: (value: number) => void;
  style?: any;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  thumbStyle?: any;
}

const { width } = Dimensions.get('window');
const SLIDER_WIDTH = width * 0.7;

export const CustomSlider: React.FC<CustomSliderProps> = ({
  minimumValue,
  maximumValue,
  value,
  onValueChange,
  style,
  minimumTrackTintColor = '#6650A4',
  maximumTrackTintColor = '#E0E0E0',
  thumbTintColor,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const getValueFromPosition = (position: number) => {
    const percentage = Math.max(0, Math.min(1, position / SLIDER_WIDTH));
    return minimumValue + percentage * (maximumValue - minimumValue);
  };

  const getPositionFromValue = () => {
    const percentage = (value - minimumValue) / (maximumValue - minimumValue);
    return percentage * SLIDER_WIDTH;
  };

  const handlePress = (event: any) => {
    const position = event.nativeEvent.locationX;
    const newValue = getValueFromPosition(position);
    onValueChange(Math.round(newValue));
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.track}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {/* Background track */}
        <View style={[styles.trackBackground, { backgroundColor: maximumTrackTintColor }]} />
        
        {/* Active track */}
        <View
          style={[
            styles.trackActive,
            {
              width: getPositionFromValue(),
              backgroundColor: minimumTrackTintColor,
            },
          ]}
        />
        
        {/* Thumb */}
        <View
          style={[
            styles.thumb,
            {
              left: getPositionFromValue() - 10,
              backgroundColor: thumbTintColor || minimumTrackTintColor,
            },
          ]}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  track: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBackground: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  trackActive: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default CustomSlider;

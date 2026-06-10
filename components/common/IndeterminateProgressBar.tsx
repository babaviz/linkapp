import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutChangeEvent, StyleSheet, View, ViewStyle } from 'react-native';

interface IndeterminateProgressBarProps {
  color?: string;
  trackColor?: string;
  height?: number;
  durationMs?: number;
  style?: ViewStyle;
}

export const IndeterminateProgressBar: React.FC<IndeterminateProgressBarProps> = ({
  color = '#3B82F6',
  trackColor = 'rgba(0,0,0,0.08)',
  height = 4,
  durationMs = 900,
  style,
}) => {
  const progress = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();
    return () => animation.stop();
  }, [durationMs, progress]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width !== containerWidth) {
      setContainerWidth(width);
    }
  };

  const indicatorWidth = Math.max(32, Math.round(containerWidth * 0.35));

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-indicatorWidth, Math.max(0, containerWidth)],
  });

  return (
    <View
      accessibilityRole="progressbar"
      onLayout={handleLayout}
      style={[
        styles.track,
        {
          backgroundColor: trackColor,
          height,
          borderRadius: height / 2,
        },
        style,
      ]}
    >
      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: color,
              height,
              width: indicatorWidth,
              borderRadius: height / 2,
              transform: [{ translateX }],
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});

export default IndeterminateProgressBar;


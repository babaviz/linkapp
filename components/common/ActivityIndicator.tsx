import React, { useState, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { analyticsService } from '../../services/analyticsService';

interface ActivityIndicatorProps {
  module: 'property' | 'jobs' | 'services' | 'datemi';
  userRole?: string;
  style?: import('react-native').StyleProp<import('react-native').ViewStyle>;
  textStyle?: import('react-native').TextStyle;
  showIcon?: boolean;
}

interface ActivityData {
  count: number;
  activity: string;
  color: string;
}

export default function ActivityIndicator({ 
  module, 
  userRole, 
  style,
  textStyle,
  showIcon = true
}: ActivityIndicatorProps) {
  const [activityData, setActivityData] = useState<ActivityData>({ 
    count: 0, 
    activity: 'Updating activity...', 
    color: '#10B981' 
  });
  const [pulseAnim] = useState(new Animated.Value(1));

  // Use analytics service for real-time activity updates
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const initial = await analyticsService.fetchActivityIndicator(module, userRole);
        if (!isMounted) return;
        setActivityData({
          count: initial.count,
          activity: initial.activity,
          color: initial.color,
        });
      } catch {
        // ignore (component will keep placeholder / last known)
      }
    };

    load();

    const unsubscribe = analyticsService.subscribeToActivityIndicator(
      module,
      (activity) => {
        if (!isMounted) return;
        setActivityData({
          count: activity.count,
          activity: activity.activity,
          color: activity.color,
        });
      },
      userRole
    );

    const pollId = setInterval(() => {
      load();
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(pollId);
      unsubscribe();
    };
  }, [module, userRole]);

  // Pulse animation for live indicator
  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    };

    pulse(); // Initial pulse
    const pulseInterval = setInterval(pulse, 3000); // Pulse every 3 seconds

    return () => clearInterval(pulseInterval);
  }, [pulseAnim]);

  return (
    <View style={[styles.container, { marginTop: 16 }, style]}>
      {showIcon && (
        <>
          {/* Animated Live Indicator Dot */}
          <Animated.View 
            style={[styles.liveDot, { 
              backgroundColor: activityData.color,
              transform: [{ scale: pulseAnim }],
              shadowColor: activityData.color,
            }]} 
          />
          
          {/* Live indicator icon */}
          <Text style={{ fontSize: 12, marginRight: 6 }}>📈</Text>
        </>
      )}
      
      {/* Activity Text */}
      <Text style={[styles.activityText, {
        color: textStyle?.color || 'rgba(255,255,255,0.9)',
      }, textStyle]}>
        {activityData.activity}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  activityText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.25,
  },
});

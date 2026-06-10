/**
 * EngagementCounter Component
 * Displays view counts, likes, shares, and other engagement metrics
 * Material 3 compliant with smooth animations and real-time updates
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Pressable } from 'react-native';
import { analyticsService, EngagementMetrics } from '../../services/analyticsService';

interface EngagementCounterProps {
  contentType: 'property' | 'job' | 'service' | 'story' | 'profile';
  contentId: string;
  userId?: string;
  showAllMetrics?: boolean;
  style?: any;
  onInteraction?: (action: string) => void;
  size?: 'small' | 'medium' | 'large';
  layout?: 'horizontal' | 'vertical';
  color?: string;
}

const EngagementCounter: React.FC<EngagementCounterProps> = ({
  contentType,
  contentId,
  userId,
  showAllMetrics = false,
  style,
  onInteraction,
  size = 'medium',
  layout = 'horizontal',
  color = '#6B7280'
}) => {
  const [metrics, setMetrics] = useState<EngagementMetrics | null>(null);
  const [userInteracted, setUserInteracted] = useState({
    liked: false,
    saved: false,
    shared: false
  });
  const [animatedValues] = useState({
    like: new Animated.Value(1),
    save: new Animated.Value(1),
    share: new Animated.Value(1)
  });

  // Size configurations
  const sizeConfig = {
    small: {
      iconSize: 16,
      textSize: 11,
      spacing: 8,
      padding: 4
    },
    medium: {
      iconSize: 20,
      textSize: 13,
      spacing: 12,
      padding: 6
    },
    large: {
      iconSize: 24,
      textSize: 15,
      spacing: 16,
      padding: 8
    }
  };

  const config = sizeConfig[size];

  // Load initial engagement metrics
  useEffect(() => {
    loadEngagementMetrics();
  }, [contentType, contentId]);

  const loadEngagementMetrics = async () => {
    try {
      const data = await analyticsService.getEngagementMetrics(contentType, contentId);
      setMetrics(data);
    } catch (error) {
      
    }
  };

  // Format number for display
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Handle user interaction
  const handleInteraction = async (action: 'like' | 'save' | 'share' | 'contact') => {
    if (!userId) return;

    // Animate the interaction
    const animValue = animatedValues[action as keyof typeof animatedValues];
    if (animValue) {
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Track the activity
    await analyticsService.trackActivity({
      userId,
      action,
      contentType,
      contentId,
      metadata: { source: 'engagement_counter' }
    });

    // Update local state
    if (action === 'like' || action === 'save' || action === 'share') {
      setUserInteracted(prev => ({ ...prev, [action + 'd']: !prev[action + 'd' as keyof typeof prev] }));
    }

    // Reload metrics to get updated counts
    loadEngagementMetrics();
    
    // Notify parent component
    onInteraction?.(action);
  };

  // Track view when component mounts
  useEffect(() => {
    if (userId && contentId) {
      analyticsService.trackActivity({
        userId,
        action: 'view',
        contentType,
        contentId,
        metadata: { source: 'engagement_counter' }
      });
    }
  }, [userId, contentId]);

  if (!metrics) {
    return (
      <View style={[{ padding: config.padding }, style]}>
        <View style={{ backgroundColor: '#e5e7eb', height: 16, width: 80, borderRadius: 4 }} />
      </View>
    );
  }

  const MetricItem = ({ 
    icon, 
    count, 
    label, 
    action, 
    interactive = false,
    isActive = false 
  }: {
    icon: string;
    count: number;
    label?: string;
    action?: string;
    interactive?: boolean;
    isActive?: boolean;
  }) => {
    const animValue = action ? animatedValues[action as keyof typeof animatedValues] : new Animated.Value(1);

    const ItemContent = () => (
      <View 
        style={[
          {
            flexDirection: layout === 'horizontal' ? 'row' : 'column',
            alignItems: 'center',
            padding: config.padding,
            borderRadius: 8,
            backgroundColor: isActive ? `${color}20` : 'transparent'
          }
        ]}
      >
        <Animated.View style={{ transform: [{ scale: animValue }] }}>
          <Text 
            style={{ 
              fontSize: config.iconSize,
              marginRight: layout === 'horizontal' ? config.spacing / 2 : 0,
              marginBottom: layout === 'vertical' ? config.spacing / 2 : 0,
              color: isActive ? color : '#6B7280'
            }}
          >
            {icon}
          </Text>
        </Animated.View>
        
        <Text 
          style={[
            {
              fontSize: config.textSize,
              fontWeight: '500',
              color: isActive ? color : '#374151',
              letterSpacing: 0.25
            }
          ]}
        >
          {formatNumber(count)}
        </Text>
        
        {label && layout === 'vertical' && (
          <Text 
            style={{
              fontSize: config.textSize - 2,
              color: '#9CA3AF',
              marginTop: 2
            }}
          >
            {label}
          </Text>
        )}
      </View>
    );

    if (interactive && userId) {
      return (
        <Pressable
          onPress={() => handleInteraction(action as any)}
          style={({ pressed }) => [
            { 
              opacity: pressed ? 0.7 : 1,
              borderRadius: 8,
              backgroundColor: pressed ? `${color}10` : 'transparent'
            }
          ]}
        >
          <ItemContent />
        </Pressable>
      );
    }

    return <ItemContent />;
  };

  return (
    <View 
      style={[
        {
          flexDirection: layout === 'horizontal' ? 'row' : 'column',
          alignItems: layout === 'horizontal' ? 'center' : 'flex-start',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 12,
          padding: config.padding,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2
        },
        style
      ]}
    >
      {/* Views - Always shown */}
      <MetricItem
        icon="👁️"
        count={metrics.views}
        label={layout === 'vertical' ? 'Views' : undefined}
      />

      {showAllMetrics && (
        <>
          {/* Likes */}
          <MetricItem
            icon={userInteracted.liked ? "❤️" : "🤍"}
            count={metrics.likes}
            label={layout === 'vertical' ? 'Likes' : undefined}
            action="like"
            interactive={true}
            isActive={userInteracted.liked}
          />

          {/* Saves/Favorites */}
          <MetricItem
            icon={userInteracted.saved ? "🔖" : "📌"}
            count={metrics.favorites}
            label={layout === 'vertical' ? 'Saved' : undefined}
            action="save"
            interactive={true}
            isActive={userInteracted.saved}
          />

          {/* Shares */}
          <MetricItem
            icon="📤"
            count={metrics.shares}
            label={layout === 'vertical' ? 'Shares' : undefined}
            action="share"
            interactive={true}
          />

          {/* Contacts (for property, job, service) */}
          {(contentType === 'property' || contentType === 'job' || contentType === 'service') && (
            <MetricItem
              icon="💬"
              count={metrics.contacts}
              label={layout === 'vertical' ? 'Contacts' : undefined}
              action="contact"
              interactive={true}
            />
          )}
        </>
      )}
    </View>
  );
};

export default EngagementCounter;

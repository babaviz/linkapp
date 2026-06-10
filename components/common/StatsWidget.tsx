import React from 'react';
import { View, Text, Animated } from 'react-native';
import { 
  getDynamicDimensions, 
  spacing,
  fontSize,
} from '../../utils/responsive';

export interface StatItem {
  value: string | number;
  label: string;
  icon?: string;
  color?: string;
}

export interface StatsWidgetProps {
  stats: StatItem[];
  title?: string;
  layout?: 'horizontal' | 'grid';
  theme?: 'dark' | 'light' | 'transparent';
  animated?: boolean;
  compactMode?: boolean;
}

const StatsWidget: React.FC<StatsWidgetProps> = ({
  stats,
  title = 'Live Statistics',
  layout = 'horizontal',
  theme = 'transparent',
  animated = true,
  compactMode = false,
}) => {
  const { isTablet } = getDynamicDimensions();

  // Animation values
  const animatedValues = React.useRef(
    stats.map(() => new Animated.Value(0))
  ).current;

  React.useEffect(() => {
    if (animated) {
      const animations = animatedValues.map((anim, index) =>
        Animated.spring(anim, {
          toValue: 1,
          delay: index * 100,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        })
      );

      Animated.stagger(100, animations).start();
    } else {
      animatedValues.forEach(anim => anim.setValue(1));
    }
  }, [animated, animatedValues]);

  // Theme styles
  const getThemeStyles = () => {
    switch (theme) {
      case 'dark':
        return {
          container: 'bg-gray-900 bg-opacity-90',
          titleColor: 'white',
          valueColor: 'white',
          labelColor: '#D1D5DB',
          statBg: 'bg-gray-800 bg-opacity-60',
        };
      case 'light':
        return {
          container: 'bg-white bg-opacity-95',
          titleColor: '#111827',
          valueColor: '#111827',
          labelColor: '#6B7280',
          statBg: 'bg-gray-100 bg-opacity-80',
        };
      default: // transparent
        return {
          container: 'bg-white bg-opacity-15 backdrop-blur-sm',
          titleColor: 'white',
          valueColor: 'white',
          labelColor: 'rgba(255,255,255,0.9)',
          statBg: 'bg-white bg-opacity-20',
        };
    }
  };

  const themeStyles = getThemeStyles();

  // Layout calculations
  const isGrid = layout === 'grid' && stats.length > 3;
  const itemsPerRow = isGrid ? (isTablet ? 3 : 2) : stats.length;
  const itemWidth = isGrid ? '45%' : `${100 / itemsPerRow}%` as `${number}%`;

  const renderStatItem = (stat: StatItem, index: number) => {
    const animatedValue = animatedValues[index] || new Animated.Value(1);

    return (
      <Animated.View
        key={index}
        style={{
          flex: isGrid ? 0 : 1,
          width: isGrid ? (itemWidth as any) : undefined,
          transform: [
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
          opacity: animatedValue,
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: isGrid ? spacing.md : 0 }}>
          {/* Icon and Value Container */}
          <View 
            style={{  
              borderRadius: 100,
              alignItems: 'center',
              justifyContent: 'center',
              width: compactMode ? (isTablet ? 48 : 40) : (isTablet ? 56 : 48), 
              height: compactMode ? (isTablet ? 48 : 40) : (isTablet ? 56 : 48), 
              marginBottom: spacing.xs 
            }}
          >
            {stat.icon ? (
              <Text style={{ 
                fontSize: compactMode ? fontSize.base : fontSize.lg,
                marginBottom: 2
              }}>
                {stat.icon}
              </Text>
            ) : null}
            <Text style={{ 
              color: themeStyles.valueColor, 
              fontWeight: 'bold', 
              fontSize: compactMode ? fontSize.sm : (isTablet ? fontSize.xl : fontSize.lg)
            }}>
              {stat.value}
            </Text>
          </View>
          
          {/* Label */}
          <Text style={{ 
            color: themeStyles.labelColor, 
            fontSize: compactMode ? fontSize.xs : fontSize.xs, 
            fontWeight: '500', 
            textAlign: 'center',
            opacity: 0.9 
          }}>
            {stat.label}
          </Text>
        </View>
      </Animated.View>
    );
  };

  if (compactMode) {
    // Compact horizontal layout without title
    return (
      <View 
        style={{
          borderRadius: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          padding: spacing.sm,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        {stats.map((stat, index) => renderStatItem(stat, index))}
      </View>
    );
  }

  return (
    <View 
      style={{
        borderRadius: 16,
        padding: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 12,
      }}
    >
      {/* Title */}
      {title && (
        <Text style={{ 
          color: themeStyles.titleColor, 
          fontWeight: 'bold', 
          fontSize: fontSize.sm, 
          marginBottom: spacing.sm, 
          opacity: 0.9 
        }}>
          {title}
        </Text>
      )}

      {/* Stats Container */}
      <View style={{ flexDirection: 'row', flexWrap: isGrid ? 'wrap' : 'nowrap', justifyContent: 'space-between' }}>
        {stats.map((stat, index) => renderStatItem(stat, index))}
      </View>
    </View>
  );
};

// Pre-configured stat sets for common use cases
export const JobStatsPreset: StatItem[] = [
  { value: '5K+', label: 'Active Jobs', icon: '💼' },
  { value: '9', label: 'Categories', icon: '📋' },
  { value: '25K+', label: 'Applicants', icon: '👥' },
];

export const PropertyStatsPreset: StatItem[] = [
  { value: '2.5K+', label: 'Properties', icon: '🏠' },
  { value: '12', label: 'Counties', icon: '📍' },
  { value: '850+', label: 'Agents', icon: '🤝' },
];

export const ServiceStatsPreset: StatItem[] = [
  { value: '150+', label: 'Services', icon: '🛠️' },
  { value: '1.2K+', label: 'Providers', icon: '👨‍🔧' },
  { value: '4.8', label: 'Avg Rating', icon: '⭐' },
];

export const DateMiStatsPreset: StatItem[] = [
  { value: '500+', label: 'Active Users', icon: '💕' },
  { value: '250', label: 'Matches', icon: '✨' },
  { value: '15', label: 'Events', icon: '🎉' },
];

export default StatsWidget;


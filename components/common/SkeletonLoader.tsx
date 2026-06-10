/**
 * Material 3 Skeleton Loader Component
 * Smooth shimmer animations for loading states
 */

import React, { useRef, useEffect } from 'react';
import { View, Animated, ViewStyle, DimensionValue } from 'react-native';
import { Material3Animations } from '../../utils/material3Animations';
import { LinearGradient } from 'expo-linear-gradient';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  shimmerColors?: string[];
  animationSpeed?: number;
}

interface SkeletonCardProps {
  style?: ViewStyle;
  showAvatar?: boolean;
  showImage?: boolean;
  lines?: number;
  imageHeight?: number;
}

interface SkeletonListProps {
  itemCount?: number;
  itemHeight?: number;
  showAvatar?: boolean;
  spacing?: number;
  style?: ViewStyle;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  shimmerColors = ['#E0E0E0', '#F5F5F5', '#E0E0E0'],
  animationSpeed = 1500,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: animationSpeed,
        useNativeDriver: true,
      })
    );
    
    shimmerAnimation.start();
    
    return () => shimmerAnimation.stop();
  }, [animationSpeed]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  return (
    <View
      style={[
        {
          width: width as DimensionValue,
          height: height as DimensionValue,
          borderRadius,
          backgroundColor: shimmerColors[0],
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          flex: 1,
          transform: [{ translateX }],
        }}
      >
        <LinearGradient
          colors={shimmerColors as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            flex: 1,
            width: 300,
          }}
        />
      </Animated.View>
    </View>
  );
};

// Pre-built skeleton components
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  style,
  showAvatar = false,
  showImage = true,
  lines = 3,
  imageHeight = 200,
}) => {
  return (
    <View
      style={[
        {
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        },
        style,
      ]}
    >
      {/* Header with avatar */}
      {showAvatar && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <SkeletonLoader
            width={40}
            height={40}
            borderRadius={20}
            style={{ marginRight: 12 }}
          />
          <View style={{ flex: 1 }}>
            <SkeletonLoader width="60%" height={14} style={{ marginBottom: 4 }} />
            <SkeletonLoader width="40%" height={12} />
          </View>
        </View>
      )}

      {/* Image */}
      {showImage && (
        <SkeletonLoader
          width="100%"
          height={imageHeight}
          borderRadius={8}
          style={{ marginBottom: 12 }}
        />
      )}

      {/* Text lines */}
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonLoader
          key={index}
          width={index === lines - 1 ? '70%' : '100%'}
          height={14}
          style={{ marginBottom: 8 }}
        />
      ))}

      {/* Action buttons */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <SkeletonLoader width={80} height={32} borderRadius={16} />
        <SkeletonLoader width={80} height={32} borderRadius={16} />
      </View>
    </View>
  );
};

export const SkeletonList: React.FC<SkeletonListProps> = ({
  itemCount = 5,
  itemHeight = 80,
  showAvatar = true,
  spacing = 16,
  style,
}) => {
  return (
    <View style={style}>
      {Array.from({ length: itemCount }).map((_, index) => (
        <View
          key={index}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: spacing / 2,
            paddingHorizontal: 16,
          }}
        >
          {showAvatar && (
            <SkeletonLoader
              width={50}
              height={50}
              borderRadius={25}
              style={{ marginRight: 12 }}
            />
          )}
          
          <View style={{ flex: 1 }}>
            <SkeletonLoader
              width="80%"
              height={16}
              style={{ marginBottom: 8 }}
            />
            <SkeletonLoader
              width="60%"
              height={12}
              style={{ marginBottom: 4 }}
            />
            <SkeletonLoader
              width="40%"
              height={12}
            />
          </View>
          
          <SkeletonLoader
            width={24}
            height={24}
            borderRadius={4}
          />
        </View>
      ))}
    </View>
  );
};

export const SkeletonProperty: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  return (
    <View
      style={[
        {
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          overflow: 'hidden',
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        },
        style,
      ]}
    >
      {/* Property Image */}
      <SkeletonLoader
        width="100%"
        height={200}
        borderRadius={0}
      />
      
      <View style={{ padding: 16 }}>
        {/* Title */}
        <SkeletonLoader
          width="85%"
          height={18}
          style={{ marginBottom: 8 }}
        />
        
        {/* Price */}
        <SkeletonLoader
          width="40%"
          height={20}
          style={{ marginBottom: 8 }}
        />
        
        {/* Location */}
        <SkeletonLoader
          width="60%"
          height={14}
          style={{ marginBottom: 12 }}
        />
        
        {/* Features */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <SkeletonLoader width={60} height={12} />
          <SkeletonLoader width={60} height={12} />
          <SkeletonLoader width={60} height={12} />
        </View>
        
        {/* Action buttons */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <SkeletonLoader width="45%" height={36} borderRadius={18} />
          <SkeletonLoader width="45%" height={36} borderRadius={18} />
        </View>
      </View>
    </View>
  );
};

export const SkeletonGrid: React.FC<{
  columns?: number;
  itemCount?: number;
  itemHeight?: number;
  spacing?: number;
  style?: ViewStyle;
}> = ({
  columns = 2,
  itemCount = 6,
  itemHeight = 120,
  spacing = 12,
  style,
}) => {
  const rows = Math.ceil(itemCount / columns);
  
  return (
    <View style={[{ padding: spacing }, style]}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <View
          key={rowIndex}
          style={{
            flexDirection: 'row',
            marginBottom: spacing,
            justifyContent: 'space-between',
          }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => {
            const itemIndex = rowIndex * columns + colIndex;
            if (itemIndex >= itemCount) return null;
            
            return (
              <SkeletonLoader
                key={colIndex}
                width={`${(100 - (columns - 1) * 2) / columns}%`}
                height={itemHeight}
                borderRadius={8}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
};

export default SkeletonLoader;

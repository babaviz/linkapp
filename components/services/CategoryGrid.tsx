/**
 * CategoryGrid Component for Services Module
 * Material 3 compliant responsive category grid (3x3 scrollable)
 */

import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getDynamicDimensions, spacing } from '../../utils/responsive';

export interface ServiceCategory {
  key: string;
  icon: string;
  label: string;
  subtitleSeeker: string;
  subtitleOwner: string;
  gradient: [string, string];
  lightColor: string;
  count?: number;
}

interface CategoryGridProps {
  categories: ServiceCategory[];
  role: 'seeker' | 'owner';
  onCategoryPress: (category: ServiceCategory) => void;
  style?: any;
}

const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  role,
  onCategoryPress,
  style
}) => {
  const { width: screenWidth, isTablet } = getDynamicDimensions();

  // Responsive grid layout - CENTERED
  const getResponsiveGridConfig = () => {
    if (isTablet) {
      const cols = 4;
      const horizontalPadding = 32;
      const gridSpacing = 12;
      const availableWidth = screenWidth - (horizontalPadding * 2);
      const cardWidth = (availableWidth - (gridSpacing * (cols - 1))) / cols;
      return { cols, horizontalPadding, gridSpacing, cardWidth, cardHeight: cardWidth * 1.3 };
    } else if (screenWidth < 360) {
      const cols = 2;
      const horizontalPadding = 20;
      const gridSpacing = 8;
      const availableWidth = screenWidth - (horizontalPadding * 2);
      const cardWidth = (availableWidth - gridSpacing) / cols;
      return { cols, horizontalPadding, gridSpacing, cardWidth, cardHeight: cardWidth * 1.5 };
    } else {
      const cols = 3;
      const horizontalPadding = 24;
      const gridSpacing = 8;
      const availableWidth = screenWidth - (horizontalPadding * 2);
      const cardWidth = (availableWidth - (gridSpacing * 2)) / cols;
      return { cols, horizontalPadding, gridSpacing, cardWidth, cardHeight: cardWidth * 1.4 };
    }
  };

  const { cols, horizontalPadding, gridSpacing, cardWidth, cardHeight } = getResponsiveGridConfig();

  const renderCategoryCard = (category: ServiceCategory, index: number) => {
    const row = Math.floor(index / cols);
    const col = index % cols;

    return (
      <Animated.View
        key={category.key}
        style={{
          position: 'absolute',
          width: cardWidth,
          height: cardHeight,
          left: col * (cardWidth + gridSpacing),
          top: row * (cardHeight + gridSpacing),
          opacity: 1,
        }}
      >
        <TouchableOpacity 
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 24,
            elevation: 12,
            overflow: 'hidden'
          }}
          onPress={() => onCategoryPress(category)}
          activeOpacity={0.85}
        >
          {/* Card with gradient background and subtle pattern */}
          <LinearGradient
            colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.3)',
            }}
          >
            {/* Decorative pattern overlay */}
            <View style={{
              position: 'absolute',
              top: -10,
              right: -10,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: `${category.gradient[0]}15`,
              opacity: 0.6
            }} />
            <View style={{
              position: 'absolute',
              bottom: -5,
              left: -5,
              width: 25,
              height: 25,
              borderRadius: 12.5,
              backgroundColor: `${category.gradient[1]}10`,
              opacity: 0.4
            }} />

            {/* Header Section with gradient background */}
            <View style={{ 
              height: '65%',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              padding: isTablet ? 8 : 4,
              position: 'relative'
            }}>
              {/* Solid background for header */}
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  backgroundColor: category.gradient[0],
                }}
              />
              
              {/* Icon Container with enhanced styling */}
              <View style={{
                width: isTablet ? 52 : screenWidth < 360 ? 36 : 44,
                height: isTablet ? 52 : screenWidth < 360 ? 36 : 44,
                backgroundColor: '#FFFFFF',
                borderRadius: isTablet ? 26 : screenWidth < 360 ? 18 : 22,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: isTablet ? 6 : 4,
                shadowColor: category.gradient[0],
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.25,
                shadowRadius: 6,
                elevation: 6,
                borderWidth: 2,
                borderColor: `${category.gradient[0]}20`
              }}>
                <Text style={{ fontSize: isTablet ? 24 : screenWidth < 360 ? 18 : 20 }}>
                  {category.icon}
                </Text>
              </View>
              
              {/* Category Label with better typography */}
              <Text style={{ 
                color: '#FFFFFF', 
                fontWeight: '800', 
                fontSize: isTablet ? 15 : screenWidth < 360 ? 10 : 12,
                textAlign: 'center',
                letterSpacing: -0.2,
                textShadowColor: 'rgba(0,0,0,0.3)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
                marginBottom: isTablet ? 2 : 1
              }}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              >
                {category.label}
              </Text>
            </View>

            {/* Content Section with enhanced design */}
            <View style={{ 
              height: '35%',
              paddingHorizontal: isTablet ? 6 : screenWidth < 360 ? 2 : 4,
              paddingVertical: isTablet ? 4 : 2,
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              {/* Service Count Badge */}
              <View style={{
                backgroundColor: category.lightColor,
                paddingHorizontal: isTablet ? 8 : 6,
                paddingVertical: isTablet ? 3 : 2,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: `${category.gradient[0]}30`,
                shadowColor: category.gradient[0],
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2
              }}>
                <View style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: category.gradient[0],
                  marginRight: 4
                }} />
                <Text style={{ 
                  color: category.gradient[0], 
                  fontSize: isTablet ? 11 : screenWidth < 360 ? 8 : 9,
                  fontWeight: '700',
                  letterSpacing: -0.1
                }}>
                  {typeof category.count === 'number'
                    ? (category.count === 0
                        ? 'No services'
                        : category.count === 1
                          ? '1 service'
                          : `${category.count} services`)
                    : 'No services'}
                </Text>
              </View>
              
              {/* Subtitle */}
              <Text style={{ 
                color: '#6B7280', 
                fontSize: isTablet ? 11 : screenWidth < 360 ? 8 : 9,
                textAlign: 'center',
                lineHeight: isTablet ? 14 : 12,
                fontWeight: '600',
                marginTop: 2
              }}
              numberOfLines={1}
              >
                {role === 'seeker' ? category.subtitleSeeker : category.subtitleOwner}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const totalItems = categories.length;
  const rows = Math.ceil(totalItems / cols);
  const containerHeight = rows * (cardHeight + gridSpacing) - gridSpacing;

  return (
    <ScrollView 
      style={[{ flex: 1, marginHorizontal: 0 }, style]} 
      contentContainerStyle={{ 
        paddingBottom: 120,
        flexGrow: 1, 
        paddingHorizontal: horizontalPadding,
        paddingTop: 16,
        alignItems: 'center'
      }}
      showsVerticalScrollIndicator={false}
      decelerationRate="fast"
      bounces={true}
      scrollEventThrottle={16}
    >
      <View style={{ 
        position: 'relative', 
        minHeight: containerHeight, 
        width: screenWidth - (horizontalPadding * 2),
        paddingTop: 0, 
        paddingBottom: 0 
      }}>
        {categories.map((category, index) => renderCategoryCard(category, index))}
      </View>
    </ScrollView>
  );
};

export default CategoryGrid;

import React, { useRef, useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text, Animated, ActivityIndicator } from 'react-native';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';
import { categoryManagementService, Category } from '../../services/categoryManagementService';

interface CategoryData {
  icon: string;
  label: string;
  subtitle: string;
  color: string;
  light_color: string;
  count: string;
}

interface CategoryGridProps {
  onCategoryPress: (category: string) => void;
  style?: any;
}

const CATEGORY_DISPLAY_DATA: { [key: string]: CategoryData } = {
  'houses': { 
    icon: '🏠', 
    label: 'Houses', 
    subtitle: 'Family homes & villas',
    color: '#3B82F6', 
    light_color: '#DBEAFE',
    count: '45+'
  },
  'apartments': { 
    icon: '🏢', 
    label: 'Apartments', 
    subtitle: 'Modern complexes',
    color: '#10B981', 
    light_color: '#D1FAE5',
    count: '67+'
  },
  'one_bedroom': { 
    icon: '🛏️', 
    label: '1 Bedroom', 
    subtitle: 'Perfect for singles',
    color: '#F59E0B', 
    light_color: '#FEF3C7',
    count: '52+'
  },
  'two_bedroom': { 
    icon: '🛏️🛏️', 
    label: '2 Bedroom', 
    subtitle: 'Ideal for couples',
    color: '#8B5CF6', 
    light_color: '#EDE9FE',
    count: '38+'
  },
  'three_bedroom': { 
    icon: '🏠', 
    label: '3 Bedroom', 
    subtitle: 'Family friendly',
    color: '#EF4444', 
    light_color: '#FEE2E2',
    count: '29+'
  },
  'bedsitters': { 
    icon: '🛌', 
    label: 'Bedsitters', 
    subtitle: 'Studio living',
    color: '#06B6D4', 
    light_color: '#CFFAFE',
    count: '89+'
  },
  'commercial': { 
    icon: '🏪', 
    label: 'Commercial', 
    subtitle: 'Shops & offices',
    color: '#F97316', 
    light_color: '#FED7AA',
    count: '23+'
  },
  'industrial': { 
    icon: '🏭', 
    label: 'Industrial', 
    subtitle: 'Warehouses & parks',
    color: '#84CC16', 
    light_color: '#ECFCCB',
    count: '7+'
  },
  'offices': { 
    icon: '🏢', 
    label: 'Offices', 
    subtitle: 'Business centers',
    color: '#6366F1', 
    light_color: '#E0E7FF',
    count: '31+'
  },
  'land_plots': { 
    icon: '🏞️', 
    label: 'Land/Plots', 
    subtitle: 'Plots & acreage',
    color: '#DC2626', 
    light_color: '#FEE2E2',
    count: '12+'
  }
} as const;

export default function PropertyCategoryGrid({ onCategoryPress, style }: CategoryGridProps) {
  const { width: screenWidth, deviceType, isTablet } = getDynamicDimensions();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create animations for categories - initialize to 1 to avoid blank state
  const categoryAnimations = useRef(
    Array(20).fill(0).map(() => new Animated.Value(1))
  ).current;
  
  // Track if animations have been initialized to prevent re-running
  const animationsInitialized = useRef(false);
  
  // Fetch categories from the database
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const fetchedCategories = await categoryManagementService.getCategoriesByModule('property');
      setCategories(fetchedCategories);
    } catch (error) {
      if (__DEV__) console.error('Error fetching categories:', error);
      // Fallback to empty array if there's an error
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // Simple fade-in animation - only run once
    if (!animationsInitialized.current) {
      animationsInitialized.current = true;
      
      // Reset to 0 and animate to 1 for smooth entrance
      categoryAnimations.forEach(anim => anim.setValue(0));
      
      Animated.stagger(50, 
        categoryAnimations.map(anim => 
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          })
        )
      ).start();
    }
  }, []); // Remove cleanup to prevent re-initialization

  // Get responsive grid configuration for 3x3 grid
  const getGridConfig = () => {
    const cols = 3; // Fixed 3 columns as per material3-guidelines
    
    if (isTablet) {
      const horizontalPadding = 32;
      const gridSpacing = 16;
      const availableWidth = screenWidth - (horizontalPadding * 2);
      const cardWidth = (availableWidth - (gridSpacing * (cols - 1))) / cols;
      return { cols, horizontalPadding, gridSpacing, cardWidth, cardHeight: cardWidth * 1.3 };
    } else if (screenWidth < 360) {
      const horizontalPadding = 16;
      const gridSpacing = 8;
      const availableWidth = screenWidth - (horizontalPadding * 2);
      const cardWidth = (availableWidth - (gridSpacing * (cols - 1))) / cols;
      return { cols, horizontalPadding, gridSpacing, cardWidth, cardHeight: cardWidth * 1.4 };
    } else {
      const horizontalPadding = 20;
      const gridSpacing = 12;
      const availableWidth = screenWidth - (horizontalPadding * 2);
      const cardWidth = (availableWidth - (gridSpacing * (cols - 1))) / cols;
      return { cols, horizontalPadding, gridSpacing, cardWidth, cardHeight: cardWidth * 1.4 };
    }
  };

  const { cols, horizontalPadding, gridSpacing, cardWidth, cardHeight } = getGridConfig();
  
  // Calculate grid dimensions based on fetched categories
  const categoryKeys = categories.map(cat => cat.key);
  const rows = Math.ceil(categoryKeys.length / cols);
  const gridHeight = rows * cardHeight + (rows - 1) * gridSpacing;

  const renderCategoryCard = (category: Category, index: number) => {
    const row = Math.floor(index / cols);
    const col = index % cols;

    return (
      <Animated.View
        key={index}
        style={{
          position: 'absolute',
          width: cardWidth,
          height: cardHeight,
          left: col * (cardWidth + gridSpacing),
          top: row * (cardHeight + gridSpacing),
          transform: [{
            translateY: categoryAnimations[index] ? categoryAnimations[index].interpolate({
              inputRange: [0, 1],
              outputRange: [30, 0],
            }) : 0,
          }, {
            scale: categoryAnimations[index] ? categoryAnimations[index].interpolate({
              inputRange: [0, 1],
              outputRange: [0.9, 1],
            }) : 1,
          }],
          opacity: categoryAnimations[index] || new Animated.Value(1),
        }}
      >
        <TouchableOpacity 
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 10,
            borderWidth: 1,
            borderColor: '#F1F5F9',
          }}
        onPress={() => onCategoryPress(category.key)}
          activeOpacity={0.9}
        >
          {/* Header Section with Icon Background */}
          <View style={{ 
            height: '70%',
            backgroundColor: category.color,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0
          }}>
            {/* Icon Container */}
            <View style={{
              width: isTablet ? 48 : screenWidth < 360 ? 32 : 40,
              height: isTablet ? 48 : screenWidth < 360 ? 32 : 40,
              backgroundColor: '#FFFFFF',
              borderRadius: isTablet ? 24 : screenWidth < 360 ? 16 : 20,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: isTablet ? 6 : 4,
              shadowColor: category.color,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3
            }}>
              <Text style={{ 
                fontSize: isTablet ? 24 : screenWidth < 360 ? 16 : 20 
              }}>
                {category.icon}
              </Text>
            </View>
            
            {/* Category Label */}
          <Text style={{ 
            color: '#FFFFFF', 
            fontWeight: '700', 
            fontSize: isTablet ? 14 : screenWidth < 360 ? 10 : 12,
            textAlign: 'center',
            letterSpacing: -0.1,
            marginBottom: isTablet ? 4 : 2,
            textShadowColor: 'rgba(0,0,0,0.3)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2
          }}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          >
            {category.label || category.name}
          </Text>
          </View>

          {/* Content Section */}
          <View style={{ 
            height: '30%',
            paddingHorizontal: isTablet ? 6 : screenWidth < 360 ? 2 : 4,
            paddingVertical: isTablet ? 4 : 2,
            justifyContent: 'center'
          }}>
            {/* Subtitle */}
            <Text style={{ 
              color: '#6B7280', 
              fontSize: isTablet ? 12 : screenWidth < 360 ? 9 : 10,
              textAlign: 'center',
              lineHeight: isTablet ? 16 : screenWidth < 360 ? 12 : 14,
              fontWeight: '500',
              marginBottom: 2
            }}
            numberOfLines={1}
            >
              {category.description || `${category.name} properties`}
            </Text>
            
            {/* Property Count */}
            <View style={{ 
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <View style={{
                backgroundColor: category.light_color,
                paddingHorizontal: 4,
                paddingVertical: 1,
                borderRadius: 4,
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <Text style={{ 
                  color: category.color, 
                  fontSize: isTablet ? 10 : screenWidth < 360 ? 8 : 9,
                  fontWeight: 'bold'
                }}>
                  {category.count || '0'}+
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={[{ flex: 1 }, style]}>
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{ marginTop: 16, color: '#6B7280', fontSize: 14 }}>Loading categories...</Text>
        </View>
      ) : (
        <ScrollView 
          style={{ flex: 1 }} 
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
            minHeight: gridHeight, 
            width: screenWidth - (horizontalPadding * 2),
            paddingTop: 0, 
            paddingBottom: 0 
          }}>
            {categories.map((category, index) => renderCategoryCard(category, index))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

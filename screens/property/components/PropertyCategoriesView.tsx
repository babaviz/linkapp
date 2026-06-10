import React, { useRef, useEffect, memo } from 'react';
import { View, ScrollView, TouchableOpacity, Text, Animated, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDynamicDimensions } from '../../../utils/responsive';
import { getCrossPlatformShadow } from '../../../utils/crossPlatformShadows';
import { colors } from '../../../theme';
import { usePropertyCategoryCounts } from '../../../hooks/useCategoryCounts';

interface PropertyCategoriesViewProps {
  onCategoryPress: (category: string) => void;
  isDarkMode?: boolean;
  userType?: 'tenant' | 'property_owner';
}

const PropertyCategoriesView: React.FC<PropertyCategoriesViewProps> = ({ onCategoryPress, isDarkMode = false, userType = 'tenant' }) => {
  const { width: screenWidth, isTablet } = getDynamicDimensions();
  const insets = useSafeAreaInsets();
  const { formatCount, isLoading } = usePropertyCategoryCounts();
  
  // Create stable animations reference - increased for all categories
  const categoryAnimations = useRef(
    Array(25).fill(0).map(() => new Animated.Value(0))
  ).current;
  
  const animationsInitialized = useRef(false);

  useEffect(() => {
    // Only run animations once
    if (!animationsInitialized.current) {
      animationsInitialized.current = true;
      
      Animated.stagger(100, 
        categoryAnimations.map(anim => 
          Animated.spring(anim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          })
        )
      ).start();
    }
    
    return () => {
      animationsInitialized.current = false;
    };
  }, [categoryAnimations]);

  // Responsive grid system for property categories
  const getResponsiveGridConfig = () => {
    if (isTablet) {
      const cols = 4;
      const horizontalPadding = 24;
      const gridSpacing = 10;
      const availableWidth = screenWidth - (horizontalPadding * 2);
      const cardWidth = (availableWidth - (gridSpacing * (cols - 1))) / cols;
      return { cols, horizontalPadding, gridSpacing, cardWidth, cardHeight: cardWidth * 1.2 };
    } else if (screenWidth < 360) {
      const cols = 2;
      const horizontalPadding = 16;
      const gridSpacing = 8;
      const availableWidth = screenWidth - (horizontalPadding * 2);
      const cardWidth = (availableWidth - gridSpacing) / cols;
      return { cols, horizontalPadding, gridSpacing, cardWidth, cardHeight: cardWidth * 1.4 };
    } else {
      const cols = 3;
      const horizontalPadding = 20;
      const gridSpacing = 8;
      const availableWidth = screenWidth - (horizontalPadding * 2);
      const cardWidth = (availableWidth - (gridSpacing * 2)) / cols;
      return { cols, horizontalPadding, gridSpacing, cardWidth, cardHeight: cardWidth * 1.35 };
    }
  };

  const { cols, horizontalPadding, gridSpacing, cardWidth, cardHeight } = getResponsiveGridConfig();

  const getCategoryTypeKey = (displayName: string): string => {
    const mapping: Record<string, string> = {
      'Houses': 'houses',
      'Apartments': 'apartments',
      'One Bedroom': 'one_bedroom',
      'Two Bedroom': 'two_bedroom',
      'Three Bedroom': 'three_bedroom',
      'Bedsitters': 'bedsitters',
      'Commercial': 'commercial',
      'Industrial Parks': 'industrial',
      'Office Spaces': 'offices',
      'Land': 'land_plots',
      'Container House': 'container_house',
      'Cabin': 'cabin',
      'Farm House': 'farm_house',
      'Cottage': 'cottage',
      'Condo': 'condo',
      'Studio': 'studio',
      'Bungalow': 'bungalow',
      'Villa': 'villa',
      'Town House': 'town_house',
      '5 Bedroom': 'five_bedroom',
      'Mansionate': 'mansionate',
      'Duplex House': 'duplex_house',
      'Apartments New': 'apartments'
    };
    return mapping[displayName] || displayName.toLowerCase().replace(/\s+/g, '_');
  };

  const renderPropertyCard = (category: string, index: number) => {
    const categoryData = {
      'Houses': { 
        icon: '🏠', 
        label: 'Houses', 
        subtitle: userType === 'tenant' ? 'Family homes & villas' : 'List family homes',
        color: '#3B82F6', 
        lightColor: '#DBEAFE',
        count: userType === 'tenant' ? (isLoading ? '...' : formatCount(getCategoryTypeKey('Houses'))) : 'Post listing'
      },
      'Apartments': { 
        icon: '🏢', 
        label: 'Apartments', 
        subtitle: userType === 'tenant' ? 'Modern complexes' : 'List apartments',
        color: '#10B981', 
        lightColor: '#D1FAE5',
        count: userType === 'tenant' ? (isLoading ? '...' : formatCount(getCategoryTypeKey('Apartments'))) : 'Post listing'
      },
      'One Bedroom': { 
        icon: '🛍️', 
        label: '1 Bedroom', 
        subtitle: userType === 'tenant' ? 'Perfect for singles' : 'List 1BR units',
        color: '#F59E0B', 
        lightColor: '#FEF3C7',
        count: userType === 'tenant' ? (isLoading ? '...' : formatCount(getCategoryTypeKey('One Bedroom'))) : 'Post listing'
      },
      'Two Bedroom': { 
        icon: '🛍️🛍️', 
        label: '2 Bedroom', 
        subtitle: userType === 'tenant' ? 'Ideal for couples' : 'List 2BR units',
        color: '#8B5CF6', 
        lightColor: '#EDE9FE',
        count: userType === 'tenant' ? (isLoading ? '...' : formatCount(getCategoryTypeKey('Two Bedroom'))) : 'Post listing'
      },
      'Three Bedroom': { 
        icon: '🏠', 
        label: '3 Bedroom', 
        subtitle: userType === 'tenant' ? 'Family friendly' : 'List 3BR units',
        color: '#EF4444', 
        lightColor: '#FEE2E2',
        count: userType === 'tenant' ? (isLoading ? '...' : formatCount(getCategoryTypeKey('Three Bedroom'))) : 'Post listing'
      },
      'Bedsitters': { 
        icon: '🛌', 
        label: 'Bedsitters', 
        subtitle: userType === 'tenant' ? 'Studio living' : 'List bedsitters',
        color: '#06B6D4', 
        lightColor: '#CFFAFE',
        count: userType === 'tenant' ? (isLoading ? '...' : formatCount(getCategoryTypeKey('Bedsitters'))) : 'Post listing'
      },
      'Commercial': { 
        icon: '🏪', 
        label: 'Commercial', 
        subtitle: userType === 'tenant' ? 'Shops & offices' : 'List commercial',
        color: '#F97316', 
        lightColor: '#FED7AA',
        count: userType === 'tenant' ? (isLoading ? '...' : formatCount(getCategoryTypeKey('Commercial'))) : 'Post listing'
      },
      'Industrial Parks': { 
        icon: '🏭', 
        label: 'Industrial', 
        subtitle: userType === 'tenant' ? 'Warehouses & parks' : 'List industrial',
        color: '#84CC16', 
        lightColor: '#ECFCCB',
        count: userType === 'tenant' ? (isLoading ? '...' : formatCount(getCategoryTypeKey('Industrial Parks'))) : 'Post listing'
      },
      'Office Spaces': { 
        icon: '🏢', 
        label: 'Offices', 
        subtitle: userType === 'tenant' ? 'Business centers' : 'List offices',
        color: '#6366F1', 
        lightColor: '#E0E7FF',
        count: userType === 'tenant' ? (isLoading ? '...' : formatCount(getCategoryTypeKey('Office Spaces'))) : 'Post listing'
      },
      'Land': { 
        icon: '🏞️', 
        label: 'Land/Plots', 
        subtitle: userType === 'tenant' ? 'Plots & acreage' : 'List land',
        color: '#DC2626', 
        lightColor: '#FEE2E2',
        count: userType === 'tenant' ? (isLoading ? '...' : formatCount(getCategoryTypeKey('Land'))) : 'Post listing'
      },
      // New property categories
      'Container House': {
        icon: '📦',
        label: 'Container',
        subtitle: 'Eco-friendly homes',
        color: '#4A5568',
        lightColor: '#E2E8F0',
        count: isLoading ? '...' : formatCount(getCategoryTypeKey('Container House'))
      },
      'Cabin': {
        icon: '🏕️',
        label: 'Cabin',
        subtitle: 'Nature retreats',
        color: '#8B4513',
        lightColor: '#F5DEB3',
        count: isLoading ? '...' : formatCount(getCategoryTypeKey('Cabin'))
      },
      'Farm House': {
        icon: '🌾',
        label: 'Farm House',
        subtitle: 'Rural properties',
        color: '#2F855A',
        lightColor: '#C6F6D5',
        count: isLoading ? '...' : formatCount(getCategoryTypeKey('Farm House'))
      },
      'Cottage': {
        icon: '🏘️',
        label: 'Cottage',
        subtitle: 'Charming homes',
        color: '#B794F4',
        lightColor: '#F3E8FF',
        count: isLoading ? '...' : formatCount(getCategoryTypeKey('Cottage'))
      },
      'Condo': {
        icon: '🏙️',
        label: 'Condo',
        subtitle: 'Modern condos',
        color: '#2B6CB0',
        lightColor: '#BEE3F8',
        count: isLoading ? '...' : formatCount(getCategoryTypeKey('Condo'))
      },
      'Studio': {
        icon: '🏨',
        label: 'Studio',
        subtitle: 'Compact living',
        color: '#ED8936',
        lightColor: '#FEEBC8',
        count: isLoading ? '...' : formatCount(getCategoryTypeKey('Studio'))
      },
      'Bungalow': {
        icon: '🏚️',
        label: 'Bungalow',
        subtitle: 'Single-story',
        color: '#975A16',
        lightColor: '#FBD38D',
        count: isLoading ? '...' : formatCount(getCategoryTypeKey('Bungalow'))
      },
      'Villa': {
        icon: '🏰',
        label: 'Villa',
        subtitle: 'Luxury estates',
        color: '#742A2A',
        lightColor: '#FEB2B2',
        count: isLoading ? '...' : formatCount(getCategoryTypeKey('Villa'))
      },
      'Town House': {
        icon: '🏘️',
        label: 'Town House',
        subtitle: 'Urban homes',
        color: '#553C9A',
        lightColor: '#E9D8FD',
        count: isLoading ? '...' : formatCount(getCategoryTypeKey('Town House'))
      },
      '5 Bedroom': {
        icon: '🏡',
        label: '5 Bedroom',
        subtitle: 'Large families',
        color: '#065F46',
        lightColor: '#A7F3D0',
        count: isLoading ? '...' : formatCount(getCategoryTypeKey('5 Bedroom'))
      },
      'Mansionate': {
        icon: '🏛️',
        label: 'Mansionate',
        subtitle: 'Split-level',
        color: '#1E3A8A',
        lightColor: '#BFDBFE',
        count: isLoading ? '...' : formatCount(getCategoryTypeKey('Mansionate'))
      },
      'Duplex House': {
        icon: '🏬',
        label: 'Duplex',
        subtitle: 'Two-level units',
        color: '#991B1B',
        lightColor: '#FCA5A5',
        count: isLoading ? '...' : formatCount(getCategoryTypeKey('Duplex House'))
      },
      'Apartments New': {
        icon: '🏢',
        label: 'Apartments',
        subtitle: 'All sizes',
        color: '#0F766E',
        lightColor: '#99F6E4',
        count: isLoading ? '...' : formatCount(getCategoryTypeKey('Apartments New'))
      }
    } as const;

    const currentCategory = categoryData[category as keyof typeof categoryData] || {
      icon: '🏠',
      label: category,
      subtitle: 'Property listings',
      color: '#6B7280',
      lightColor: '#F3F4F6',
      count: '1+'
    };

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
            backgroundColor: isDarkMode ? colors.secondary[700] : '#FFFFFF',
            borderRadius: 20,
            ...getCrossPlatformShadow({
              width: 0,
              height: 6,
              radius: 20,
              opacity: 0.1,
              color: '#000',
              elevation: 10
            }),
            borderWidth: 1,
            borderColor: isDarkMode ? colors.secondary[600] : '#F1F5F9',
          }}
          onPress={() => onCategoryPress(category)}
          activeOpacity={0.9}
        >
          <View style={{ 
            height: '70%',
            backgroundColor: currentCategory.color,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0
          }}>
            <View style={{
              width: isTablet ? 48 : screenWidth < 360 ? 32 : 40,
              height: isTablet ? 48 : screenWidth < 360 ? 32 : 40,
              backgroundColor: '#FFFFFF',
              borderRadius: isTablet ? 24 : screenWidth < 360 ? 16 : 20,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: isTablet ? 4 : 2,
              ...getCrossPlatformShadow({
                width: 0,
                height: 1,
                radius: 2,
                opacity: 0.1,
                color: currentCategory.color,
                elevation: 2
              })
            }}>
              <Text style={{ fontSize: isTablet ? 22 : screenWidth < 360 ? 16 : 18 }}>
                {currentCategory.icon}
              </Text>
            </View>
            
            <Text style={{ 
              color: '#FFFFFF', 
              fontWeight: '700', 
              fontSize: isTablet ? 14 : screenWidth < 360 ? 9 : 11,
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
              {currentCategory.label}
            </Text>
          </View>

          <View style={{ 
            height: '30%',
            paddingHorizontal: isTablet ? 4 : screenWidth < 360 ? 1 : 2,
            paddingVertical: isTablet ? 2 : 1,
            justifyContent: 'center'
          }}>
            <Text style={{ 
              color: isDarkMode ? colors.text.tertiary : '#6B7280', 
              fontSize: 14,
              textAlign: 'center',
              lineHeight: 18,
              fontWeight: '500'
            }}
            numberOfLines={1}
            >
              {currentCategory.subtitle}
            </Text>
            
            <View style={{ 
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 0
            }}>
              <View style={{
                backgroundColor: currentCategory.lightColor,
                paddingHorizontal: 2,
                paddingVertical: 0,
                borderRadius: 2,
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <Text style={{ 
                  color: currentCategory.color, 
                  fontSize: 12,
                  fontWeight: 'bold'
                }}>
                  {currentCategory.count}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const allCategories = [
    'Houses', 'Apartments', 'One Bedroom', 'Two Bedroom', 'Three Bedroom', 
    'Bedsitters', 'Commercial', 'Industrial Parks', 'Office Spaces', 
    'Land',
    // New property categories
    'Container House', 'Cabin', 'Farm House', 'Cottage', 'Condo',
    'Studio', 'Bungalow', 'Villa', 'Town House', '5 Bedroom',
    'Mansionate', 'Duplex House', 'Apartments New'
  ];
  
  const rows = Math.ceil(allCategories.length / cols);
  const finalGridHeight = rows * cardHeight + (rows - 1) * gridSpacing;

  return (
    <ScrollView 
      style={{ flex: 1, marginHorizontal: 0 }} 
      contentContainerStyle={{ 
        paddingBottom: 65 + insets.bottom,
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
        minHeight: finalGridHeight, 
        width: screenWidth - (horizontalPadding * 2),
        paddingTop: 0, 
        paddingBottom: 0 
      }}>
        {allCategories.map((category, index) => renderPropertyCard(category, index))}
      </View>
    </ScrollView>
  );
};

PropertyCategoriesView.displayName = 'PropertyCategoriesView';

export default React.memo(PropertyCategoriesView);

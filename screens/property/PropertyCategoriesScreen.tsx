import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { PropertyStackParamList } from '../../navigation/PropertyStackNavigator';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';
import { colors, shadows, borderRadius } from '../../theme';

type PropertyCategoriesRouteProp = RouteProp<PropertyStackParamList, 'PropertyCategories'>;
type PropertyCategoriesNavigationProp = StackNavigationProp<PropertyStackParamList, 'PropertyCategories'>;

export default function PropertyCategoriesScreen() {
  const navigation = useNavigation<PropertyCategoriesNavigationProp>();
  const route = useRoute<PropertyCategoriesRouteProp>();
  const { category } = route.params || {};
  const { width: screenWidth, isTablet } = getDynamicDimensions();
  const [selectedFilter, setSelectedFilter] = useState('All');

  const propertyCategories = useMemo(() => {
    const baseCategories = [
      {
        id: 'apartments',
        name: 'Apartments & Condos',
        iconName: 'apartment',
        count: 342,
        description: 'Modern apartments, luxury condos, studio units',
        averagePrice: 'KSh 45,000/month',
        priceRange: 'KSh 15,000 - 150,000',
        gradient: ['#E53E3E', '#E53E3E'],
        features: ['24/7 Security', 'Parking', 'Utilities']
      },
      {
        id: 'houses',
        name: 'Houses & Villas',
        iconName: 'home',
        count: 267,
        description: 'Family homes, luxury villas, townhouses',
        averagePrice: 'KSh 85,000/month',
        priceRange: 'KSh 30,000 - 300,000',
        gradient: ['#38A169', '#38A169'],
        features: ['Private Compound', 'Garden', 'Garage']
      },
      {
        id: 'commercial',
        name: 'Commercial Spaces',
        iconName: 'store',
        count: 128,
        description: 'Office spaces, retail shops, warehouses',
        averagePrice: 'KSh 120/sqft',
        priceRange: 'KSh 50 - 500/sqft',
        gradient: ['#3182CE', '#3182CE'],
        features: ['Prime Location', 'High Traffic', 'Flexible Terms']
      },
      {
        id: 'land',
        name: 'Land & Plots',
        iconName: 'landscape',
        count: 189,
        description: 'Residential plots, agricultural land, commercial land',
        averagePrice: 'KSh 2.5M/acre',
        priceRange: 'KSh 500K - 50M',
        gradient: ['#D69E2E', '#D69E2E'],
        features: ['Title Deed Ready', 'Utilities Available', 'Accessible']
      },
      {
        id: 'student_housing',
        name: 'Student Housing',
        iconName: 'school',
        count: 95,
        description: 'Hostels, shared accommodations, campus housing',
        averagePrice: 'KSh 8,000/month',
        priceRange: 'KSh 3,000 - 25,000',
        gradient: ['#805AD5', '#805AD5'],
        features: ['Near Campus', 'Study Areas', 'Affordable']
      },
      {
        id: 'vacation_rentals',
        name: 'Vacation Rentals',
        iconName: 'beach-access',
        count: 73,
        description: 'Holiday homes, beach houses, mountain retreats',
        averagePrice: 'KSh 12,000/night',
        priceRange: 'KSh 2,500 - 50,000',
        gradient: ['#319795', '#319795'],
        features: ['Scenic Views', 'Fully Furnished', 'Recreation']
      },
      {
        id: 'shared_spaces',
        name: 'Shared Living',
        iconName: 'handshake',
        count: 156,
        description: 'Shared apartments, co-living spaces, roommate housing',
        averagePrice: 'KSh 18,000/month',
        priceRange: 'KSh 8,000 - 40,000',
        gradient: ['#F56500', '#F56500'],
        features: ['Community Living', 'Shared Amenities', 'Social']
      },
      {
        id: 'luxury_properties',
        name: 'Luxury Properties',
        iconName: 'diamond',
        count: 42,
        description: 'Premium estates, luxury apartments, exclusive properties',
        averagePrice: 'KSh 250,000/month',
        priceRange: 'KSh 100,000 - 1M+',
        gradient: ['#D53F8C', '#D53F8C'],
        features: ['Premium Location', 'Luxury Amenities', 'Concierge']
      },
      // New property categories
      {
        id: 'container_house',
        name: 'Container House',
        iconName: 'widgets',
        count: 28,
        description: 'Modern container homes, eco-friendly living',
        averagePrice: 'KSh 35,000/month',
        priceRange: 'KSh 15,000 - 60,000',
        gradient: ['#4A5568', '#4A5568'],
        features: ['Eco-friendly', 'Modern Design', 'Quick Setup']
      },
      {
        id: 'cabin',
        name: 'Cabin',
        iconName: 'cabin',
        count: 15,
        description: 'Cozy cabins, mountain retreats, nature escapes',
        averagePrice: 'KSh 40,000/month',
        priceRange: 'KSh 20,000 - 80,000',
        gradient: ['#8B4513', '#8B4513'],
        features: ['Nature Views', 'Peaceful', 'Wood Interior']
      },
      {
        id: 'farm_house',
        name: 'Farm House',
        iconName: 'agriculture',
        count: 32,
        description: 'Rural farmhouses, country homes with land',
        averagePrice: 'KSh 55,000/month',
        priceRange: 'KSh 25,000 - 100,000',
        gradient: ['#2F855A', '#2F855A'],
        features: ['Large Land', 'Farm Ready', 'Rural Setting']
      },
      {
        id: 'cottage',
        name: 'Cottage',
        iconName: 'house-siding',
        count: 18,
        description: 'Charming cottages, quaint homes, traditional style',
        averagePrice: 'KSh 38,000/month',
        priceRange: 'KSh 18,000 - 70,000',
        gradient: ['#B794F4', '#B794F4'],
        features: ['Cozy', 'Traditional', 'Garden Space']
      },
      {
        id: 'condo',
        name: 'Condo',
        iconName: 'domain',
        count: 87,
        description: 'Modern condominiums, shared amenities, urban living',
        averagePrice: 'KSh 65,000/month',
        priceRange: 'KSh 30,000 - 120,000',
        gradient: ['#2B6CB0', '#2B6CB0'],
        features: ['Shared Amenities', 'Urban Location', 'Security']
      },
      {
        id: 'studio',
        name: 'Studio',
        iconName: 'meeting-room',
        count: 125,
        description: 'Compact studios, efficient living spaces',
        averagePrice: 'KSh 22,000/month',
        priceRange: 'KSh 10,000 - 45,000',
        gradient: ['#ED8936', '#ED8936'],
        features: ['Compact', 'Affordable', 'Low Maintenance']
      },
      {
        id: 'bungalow',
        name: 'Bungalow',
        iconName: 'bungalow',
        count: 45,
        description: 'Single-story homes, accessible living, spacious',
        averagePrice: 'KSh 48,000/month',
        priceRange: 'KSh 22,000 - 90,000',
        gradient: ['#975A16', '#975A16'],
        features: ['Single Story', 'Accessible', 'Spacious']
      },
      {
        id: 'villa',
        name: 'Villa',
        iconName: 'villa',
        count: 38,
        description: 'Luxury villas, private estates, premium living',
        averagePrice: 'KSh 150,000/month',
        priceRange: 'KSh 80,000 - 500,000',
        gradient: ['#742A2A', '#742A2A'],
        features: ['Private Pool', 'Large Compound', 'Premium']
      },
      {
        id: 'town_house',
        name: 'Town House',
        iconName: 'location-city',
        count: 64,
        description: 'Multi-level townhouses, urban family homes',
        averagePrice: 'KSh 72,000/month',
        priceRange: 'KSh 35,000 - 130,000',
        gradient: ['#553C9A', '#553C9A'],
        features: ['Multi-level', 'Private Entrance', 'Urban']
      },
      {
        id: 'five_bedroom',
        name: '5 Bedroom',
        iconName: 'king-bed',
        count: 29,
        description: 'Spacious 5-bedroom homes, large families',
        averagePrice: 'KSh 95,000/month',
        priceRange: 'KSh 50,000 - 200,000',
        gradient: ['#065F46', '#065F46'],
        features: ['5 Bedrooms', 'Large Space', 'Family Size']
      },
      {
        id: 'mansionate',
        name: 'Mansionate',
        iconName: 'roofing',
        count: 52,
        description: 'Maisonette homes, split-level design, modern',
        averagePrice: 'KSh 82,000/month',
        priceRange: 'KSh 40,000 - 150,000',
        gradient: ['#1E3A8A', '#1E3A8A'],
        features: ['Split Level', 'Modern Design', 'Spacious']
      },
      {
        id: 'duplex_house',
        name: 'Duplex House',
        iconName: 'content-copy',
        count: 41,
        description: 'Duplex units, two-level homes, modern layouts',
        averagePrice: 'KSh 68,000/month',
        priceRange: 'KSh 32,000 - 110,000',
        gradient: ['#991B1B', '#991B1B'],
        features: ['Two Levels', 'Separate Units', 'Investment']
      },
      {
        id: 'apartments_new',
        name: 'Apartments',
        iconName: 'apartment',
        count: 298,
        description: 'Modern apartment complexes, various sizes',
        averagePrice: 'KSh 42,000/month',
        priceRange: 'KSh 12,000 - 140,000',
        gradient: ['#0F766E', '#0F766E'],
        features: ['Variety', 'All Sizes', 'Amenities']
      }
    ];

    if (!category) return baseCategories;
    
    // Filter by category if specified
    return baseCategories.filter(cat => cat.id === category);
  }, [category]);

  const filterOptions = ['All', 'Most Popular', 'Price: Low to High', 'Price: High to Low', 'Recently Listed'];
  
  const filteredCategories = useMemo(() => {
    let filtered = [...propertyCategories];
    
    switch (selectedFilter) {
      case 'Most Popular':
        filtered.sort((a, b) => b.count - a.count);
        break;
      case 'Price: Low to High':
        filtered.sort((a, b) => {
          const aPrice = parseInt(a.averagePrice.replace(/[^0-9]/g, ''));
          const bPrice = parseInt(b.averagePrice.replace(/[^0-9]/g, ''));
          return aPrice - bPrice;
        });
        break;
      case 'Price: High to Low':
        filtered.sort((a, b) => {
          const aPrice = parseInt(a.averagePrice.replace(/[^0-9]/g, ''));
          const bPrice = parseInt(b.averagePrice.replace(/[^0-9]/g, ''));
          return bPrice - aPrice;
        });
        break;
      case 'Recently Listed':
        filtered = filtered.reverse();
        break;
    }
    
    return filtered;
  }, [propertyCategories, selectedFilter]);

  const getCategoryTitle = () => {
    const categoryTitles: { [key: string]: string } = {
      'apartments': 'Apartments & Condos',
      'houses': 'Houses & Villas',
      'commercial': 'Commercial Properties',
      'land': 'Land & Development',
      'student_housing': 'Student Accommodations',
      'vacation_rentals': 'Vacation & Short-term Rentals',
      'shared_spaces': 'Shared Living Spaces',
      'luxury_properties': 'Luxury Properties',
      // New property categories
      'container_house': 'Container Houses',
      'cabin': 'Cabins',
      'farm_house': 'Farm Houses',
      'cottage': 'Cottages',
      'condo': 'Condominiums',
      'studio': 'Studio Apartments',
      'bungalow': 'Bungalows',
      'villa': 'Villas',
      'town_house': 'Town Houses',
      'five_bedroom': '5 Bedroom Properties',
      'mansionate': 'Mansionates',
      'duplex_house': 'Duplex Houses',
      'apartments_new': 'Apartments'
    };
    
    return category ? categoryTitles[category] || 'Property Categories' : 'Property Categories';
  };

  const renderCategoryItem = ({ item, index }: { item: any, index: number }) => {
    return (
      <View>
        <TouchableOpacity
          style={{
            marginBottom: spacing.lg,
            borderRadius: 24,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 12,
          }}
          onPress={() => navigation.navigate('PropertySearchResults', { 
            searchQuery: { propertyType: item.id }
          })}
          activeOpacity={0.9}
        >
<View
            style={{
              padding: spacing.xl,
              minHeight: isTablet ? 160 : 140,
              backgroundColor: item.gradient[0],
            }}
          >
            {/* Header Section */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md }}>
              <View style={{
                width: isTablet ? 72 : 64,
                height: isTablet ? 72 : 64,
                borderRadius: isTablet ? 36 : 32,
                backgroundColor: 'rgba(255,255,255,0.25)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.lg,
                borderWidth: 3,
                borderColor: 'rgba(255,255,255,0.3)',
                shadowColor: 'rgba(0,0,0,0.3)',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 1,
                shadowRadius: 8,
                elevation: 6
              }}>
                <MaterialIcons name={item.iconName as any} size={isTablet ? 36 : 32} color="white" />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  fontSize: isTablet ? 22 : 20, 
                  fontWeight: '800', 
                  color: '#FFFFFF',
                  marginBottom: 6,
                  textShadowColor: 'rgba(0,0,0,0.4)',
                  textShadowOffset: { width: 1, height: 2 },
                  textShadowRadius: 4
                }}>
                  {item.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                  <View style={{
                    backgroundColor: 'rgba(255,255,255,0.3)',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 16,
                    marginRight: spacing.sm
                  }}>
                    <Text style={{ 
                      color: '#FFFFFF', 
                      fontSize: 13, 
                      fontWeight: '800'
                    }}>
                      {item.count} properties
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}>
                    <MaterialIcons name="trending-up" size={10} color="white" style={{marginRight: 3}} />
                    <Text style={{ 
                      color: '#FFFFFF', 
                      fontSize: 11, 
                      fontWeight: '700'
                    }}>
                      ACTIVE
                    </Text>
                  </View>
                </View>
              </View>
              
              <Text style={{ 
                color: 'rgba(255,255,255,0.9)', 
                fontSize: 24, 
                fontWeight: 'bold',
                textShadowColor: 'rgba(0,0,0,0.4)',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 3
              }}>
                <MaterialIcons name="arrow-forward" size={24} color="rgba(255,255,255,0.9)" />
              </Text>
            </View>

            {/* Description */}
            <Text style={{ 
              fontSize: isTablet ? 15 : 14, 
              color: 'rgba(255,255,255,0.95)',
              lineHeight: 20,
              marginBottom: spacing.md,
              textShadowColor: 'rgba(0,0,0,0.2)',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 2
            }}>
              {item.description}
            </Text>

            {/* Price Information */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.md
            }}>
              <View>
                <Text style={{ 
                  color: 'rgba(255,255,255,0.8)', 
                  fontSize: 12, 
                  fontWeight: '600',
                  marginBottom: 2
                }}>
                  Average Price
                </Text>
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontSize: isTablet ? 18 : 16, 
                  fontWeight: '800',
                  textShadowColor: 'rgba(0,0,0,0.3)',
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 3
                }}>
                  {item.averagePrice}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ 
                  color: 'rgba(255,255,255,0.8)', 
                  fontSize: 12, 
                  fontWeight: '600',
                  marginBottom: 2
                }}>
                  Price Range
                </Text>
                <Text style={{ 
                  color: 'rgba(255,255,255,0.9)', 
                  fontSize: 13, 
                  fontWeight: '700'
                }}>
                  {item.priceRange}
                </Text>
              </View>
            </View>

            {/* Features */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={{ marginBottom: spacing.sm }}
            >
              {item.features.map((feature: string, idx: number) => (
                <View 
                  key={idx}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 12,
                    marginRight: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.3)'
                  }}
                >
                  <Text style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: '#FFFFFF'
                  }}>
                    {feature}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Action Button */}
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.25)',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 16,
              alignSelf: 'flex-start',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.4)'
            }}>
              <Text style={{ 
                color: '#FFFFFF', 
                fontSize: 12, 
                fontWeight: '800' 
              }}>
                EXPLORE PROPERTIES
              </Text>
            </View>
        </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1 }}>
          {/* Enhanced Header - Property Hub Style */}
          <View style={{ 
            paddingHorizontal: spacing.lg, 
            paddingTop: spacing.xl,
            paddingBottom: spacing.lg
          }}>
            {/* Title Row with Better Spacing */}
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginBottom: spacing.lg,
              paddingBottom: spacing.xs
            }}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.secondary[100],
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing.lg,
                  borderWidth: 1,
                  borderColor: colors.border.light,
                  ...shadows.base
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons name="arrow-back" size={20} color={colors.text.primary} />
              </TouchableOpacity>
              
              <View style={{ flex: 1, paddingRight: spacing.md }}>
                <Text style={{ 
                  color: colors.text.primary, 
                  fontSize: isTablet ? 30 : screenWidth < 360 ? 22 : 26, 
                  fontWeight: '800',
                  letterSpacing: -0.5,
                  marginBottom: spacing.xs
                }}>
                  {getCategoryTitle()}
                </Text>
                <Text style={{
                  color: colors.text.secondary,
                  fontSize: isTablet ? 16 : screenWidth < 360 ? 13 : 15,
                  fontWeight: '500',
                  letterSpacing: 0.3
                }}>
                  {filteredCategories.reduce((sum, cat) => sum + cat.count, 0)} properties available
                </Text>
              </View>
            </View>

            {/* Property Hub Style Search Bar */}
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginBottom: spacing.lg,
              paddingHorizontal: spacing.xs
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.background,
                  borderRadius: 28,
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.md,
                  marginRight: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.border.light,
                  ...shadows.base
                }}
                activeOpacity={0.9}
                onPress={() => {}}
              >
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: colors.secondary[200],
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing.sm
                }}>
                  <MaterialIcons name="search" size={12} color={colors.text.secondary} />
                </View>
                <Text style={{
                  flex: 1,
                  fontSize: isTablet ? 16 : 15,
                  color: colors.text.tertiary,
                  fontWeight: '400',
                  fontStyle: 'italic',
                  letterSpacing: 0.2
                }}>
                  Search properties, locations, features...
                </Text>
              </TouchableOpacity>
              
              {/* Map/Location Button - Design System Style */}
              <TouchableOpacity
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: colors.border.light,
                  ...shadows.base
                }}
                activeOpacity={0.8}
              >
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: colors.error[500],
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MaterialIcons name="location-on" size={12} color={colors.text.inverse} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Filter Pills */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: spacing.sm }}
            >
              {filterOptions.map((filter, index) => (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setSelectedFilter(filter)}
                  style={{
                    backgroundColor: selectedFilter === filter 
                      ? colors.primary[100] 
                      : colors.secondary[100],
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    marginRight: spacing.sm,
                    borderWidth: 1,
                    borderColor: selectedFilter === filter 
                      ? colors.primary[300] 
                      : colors.border.light,
                    ...shadows.sm
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{
                    color: selectedFilter === filter ? colors.primary[700] : colors.text.secondary,
                    fontSize: 12,
                    fontWeight: selectedFilter === filter ? '700' : '500'
                  }}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Categories List */}
          <View style={{ flex: 1 }}>
            <FlatList
              data={filteredCategories}
              keyExtractor={(item) => item.id}
              renderItem={renderCategoryItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ 
                paddingHorizontal: spacing.lg,
                paddingBottom: 120 
              }}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

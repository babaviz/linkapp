/**
 * PropertyCompareScreen
 * Side-by-side comparison of multiple properties with detailed analysis
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { PropertyStackParamList } from '../../navigation/PropertyStackNavigator';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { Property } from '../../types/property';
import { formatPrice, getPropertyTypeLabel, getPropertySummary } from '../../utils/propertyHelpers';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';

const { width: screenWidth } = Dimensions.get('window');

interface ComparisonRow {
  label: string;
  getValue: (property: Property) => string | number | undefined;
  isPrice?: boolean;
  isHighlightBest?: boolean;
}

type PropertyCompareNavigationProp = StackNavigationProp<PropertyStackParamList, 'PropertyCompare'>;

export default function PropertyCompareScreen() {
  const navigation = useNavigation<PropertyCompareNavigationProp>();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const { width: screenWidth, isTablet } = getDynamicDimensions();

  // Get properties from route params if available
  const { properties: routeProperties } = (route.params as { properties?: Property[] }) || {};
  const { searchResults } = useAppSelector(state => state.property);
  
  // State for properties being compared (max 3)
  const [compareProperties, setCompareProperties] = useState<Property[]>(
    routeProperties?.slice(0, 3) || searchResults.slice(0, 3) // Take from route or default to first 3
  );

  const handleRemoveProperty = (propertyId: string) => {
    if (compareProperties.length <= 2) {
      Alert.alert(
        'Minimum Properties',
        'You need at least 2 properties to compare.',
        [{ text: 'OK' }]
      );
      return;
    }

    setCompareProperties(prev => prev.filter(p => p.id !== propertyId));
  };

  const handleAddProperty = () => {
    if (compareProperties.length >= 3) {
      Alert.alert(
        'Maximum Properties',
        'You can compare up to 3 properties at a time.',
        [{ text: 'OK' }]
      );
      return;
    }

    // In real app, this would navigate to property selection
    Alert.alert(
      'Add Property',
      'This would open a property selection screen.',
      [{ text: 'OK' }]
    );
  };

  const handleViewProperty = (property: Property) => {
    navigation.navigate('PropertyDetails', { 
      propertyId: property.id,
      property 
    });
  };

  // Comparison data structure
  const comparisonRows: ComparisonRow[] = [
    {
      label: 'Price',
      getValue: (property) => property.price,
      isPrice: true,
      isHighlightBest: true
    },
    {
      label: 'Property Type',
      getValue: (property) => getPropertyTypeLabel(property.property_type)
    },
    {
      label: 'Bedrooms',
      getValue: (property) => property.bedrooms || 'N/A'
    },
    {
      label: 'Bathrooms',
      getValue: (property) => property.bathrooms || 'N/A'
    },
    {
      label: 'Area (m²)',
      getValue: (property) => property.area_sqm || 'N/A',
      isHighlightBest: true
    },
    {
      label: 'Status',
      getValue: (property) => property.status
    },
    {
      label: 'Location',
      getValue: (property) => `${property.location.town}, ${property.location.county}`
    },
    {
      label: 'Posted Date',
      getValue: (property) => new Date(property.created_at).toLocaleDateString()
    }
  ];

  const getBestValue = (row: ComparisonRow): string | null => {
    if (!row.isHighlightBest) return null;

    const values = compareProperties.map(p => row.getValue(p));
    
    if (row.label === 'Price') {
      // For price, lowest is best
      const prices = values.filter(v => typeof v === 'number') as number[];
      return Math.min(...prices).toString();
    } else if (row.label === 'Area (m²)') {
      // For area, highest is best
      const areas = values.filter(v => typeof v === 'number') as number[];
      return Math.max(...areas).toString();
    }
    
    return null;
  };

  const isValueBest = (property: Property, row: ComparisonRow): boolean => {
    const bestValue = getBestValue(row);
    if (!bestValue) return false;
    
    const currentValue = row.getValue(property);
    return currentValue?.toString() === bestValue;
  };

  const cardWidth = (screenWidth - (isTablet ? 80 : 60)) / Math.max(compareProperties.length, 2);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View style={{ 
        paddingHorizontal: isTablet ? 24 : 16,
        paddingVertical: isTablet ? 16 : 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginRight: 16 }}
            >
              <MaterialIcons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={{ 
              fontSize: isTablet ? 24 : 20, 
              fontWeight: '700',
              color: '#111827'
            }}>
              Compare Properties
            </Text>
          </View>
          
          {compareProperties.length < 3 && (
            <TouchableOpacity
              onPress={handleAddProperty}
              style={{ 
                backgroundColor: '#10B981',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
                + Add
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={{ 
          fontSize: 14, 
          color: '#6B7280',
          marginTop: 4
        }}>
          Comparing {compareProperties.length} properties
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Property Cards Header */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{ backgroundColor: '#F9FAFB' }}
        >
          <View style={{ 
            flexDirection: 'row',
            paddingVertical: 16,
            paddingHorizontal: isTablet ? 24 : 16
          }}>
            {compareProperties.map((property, index) => (
              <View 
                key={property.id}
                style={{
                  width: cardWidth,
                  marginRight: index === compareProperties.length - 1 ? 0 : 16,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3
                }}
              >
                {/* Property Image */}
                <View style={{ position: 'relative', height: 120 }}>
                  <Image
                    source={{ uri: property.images[0] || 'https://via.placeholder.com/300x200' }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => handleRemoveProperty(property.id)}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      backgroundColor: '#EF4444',
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <MaterialIcons name="close" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Property Info */}
                <View style={{ padding: 12 }}>
                  <Text style={{ 
                    fontSize: 14, 
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: 4
                  }} numberOfLines={2}>
                    {property.title}
                  </Text>
                  
                  <Text style={{ 
                    fontSize: 16, 
                    fontWeight: '700',
                    color: '#10B981',
                    marginBottom: 4
                  }}>
                    {formatPrice(property.price)}
                  </Text>
                  
                  <Text style={{ 
                    fontSize: 12, 
                    color: '#6B7280'
                  }} numberOfLines={1}>
                    📍 {property.location.town}
                  </Text>

                  <TouchableOpacity
                    onPress={() => handleViewProperty(property)}
                    style={{
                      backgroundColor: '#F3F4F6',
                      paddingVertical: 8,
                      borderRadius: 6,
                      alignItems: 'center',
                      marginTop: 8
                    }}
                  >
                    <Text style={{ 
                      color: '#374151', 
                      fontSize: 12, 
                      fontWeight: '500' 
                    }}>
                      View Details
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Comparison Table */}
        <View style={{ paddingHorizontal: isTablet ? 24 : 16, paddingVertical: 16 }}>
          <Text style={{ 
            fontSize: 18, 
            fontWeight: '600',
            color: '#111827',
            marginBottom: 16
          }}>
            Detailed Comparison
          </Text>

          {comparisonRows.map((row, rowIndex) => (
            <View 
              key={rowIndex}
              style={{
                backgroundColor: rowIndex % 2 === 0 ? '#F9FAFB' : '#FFFFFF',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                marginBottom: 4
              }}
            >
              <Text style={{ 
                fontSize: 14, 
                fontWeight: '600',
                color: '#374151',
                marginBottom: 8
              }}>
                {row.label}
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row' }}>
                  {compareProperties.map((property, propIndex) => {
                    const value = row.getValue(property);
                    const displayValue = row.isPrice ? formatPrice(value as number) : value?.toString() || 'N/A';
                    const isBest = isValueBest(property, row);

                    return (
                      <View 
                        key={property.id}
                        style={{
                          width: cardWidth,
                          marginRight: propIndex === compareProperties.length - 1 ? 0 : 16,
                          backgroundColor: isBest ? '#D1FAE5' : '#FFFFFF',
                          padding: 12,
                          borderRadius: 8,
                          borderWidth: isBest ? 2 : 1,
                          borderColor: isBest ? '#10B981' : '#E5E7EB'
                        }}
                      >
                        <Text style={{ 
                          fontSize: 14, 
                          fontWeight: isBest ? '600' : '500',
                          color: isBest ? '#065F46' : '#374151',
                          textAlign: 'center'
                        }}>
                          {displayValue}
                          {isBest && ' ⭐'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          ))}
        </View>

        {/* Amenities Comparison */}
        <View style={{ paddingHorizontal: isTablet ? 24 : 16, paddingBottom: 24 }}>
          <Text style={{ 
            fontSize: 18, 
            fontWeight: '600',
            color: '#111827',
            marginBottom: 16
          }}>
            Amenities Comparison
          </Text>

          {/* Get all unique amenities */}
          {(() => {
            const allAmenities = Array.from(new Set(
              compareProperties.flatMap(p => p.amenities)
            )).sort();

            return allAmenities.map((amenity, index) => (
              <View 
                key={index}
                style={{
                  backgroundColor: index % 2 === 0 ? '#F9FAFB' : '#FFFFFF',
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  marginBottom: 4
                }}
              >
                <Text style={{ 
                  fontSize: 14, 
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: 8
                }}>
                  {amenity}
                </Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row' }}>
                    {compareProperties.map((property, propIndex) => {
                      const hasAmenity = property.amenities.includes(amenity);

                      return (
                        <View 
                          key={property.id}
                          style={{
                            width: cardWidth,
                            marginRight: propIndex === compareProperties.length - 1 ? 0 : 16,
                            backgroundColor: hasAmenity ? '#D1FAE5' : '#FEE2E2',
                            padding: 12,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: hasAmenity ? '#10B981' : '#EF4444'
                          }}
                        >
                          <Text style={{ 
                            fontSize: 16, 
                            fontWeight: '600',
                            color: hasAmenity ? '#065F46' : '#991B1B',
                            textAlign: 'center'
                          }}>
                            {hasAmenity ? '✅' : '❌'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            ));
          })()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

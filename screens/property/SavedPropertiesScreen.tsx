/**
 * SavedPropertiesScreen
 * User's bookmarked/saved properties with management features
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { PropertyStackParamList } from '../../navigation/PropertyStackNavigator';
import { navigateToMainTab } from '../../navigation/mainTabNavigation';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { Property } from '../../types/property';
import { formatPrice, getPropertyTypeLabel, getPropertySummary } from '../../utils/propertyHelpers';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';
import { toggleFavoriteProperty, loadFavoriteProperties } from '../../redux/slices/propertySlice';

type SavedPropertiesNavigationProp = StackNavigationProp<PropertyStackParamList, 'SavedProperties'>;

export default function SavedPropertiesScreen() {
  const navigation = useNavigation<SavedPropertiesNavigationProp>();
  const dispatch = useAppDispatch();
  const { width: screenWidth, isTablet } = getDynamicDimensions();

  const { favoriteProperties } = useAppSelector(state => state.property);
  const savedProperties = favoriteProperties;
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'location'>('date');
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Filter properties based on search
  const filteredProperties = savedProperties.filter(property =>
    property.title.toLowerCase().includes(searchText.toLowerCase()) ||
    property.location.address.toLowerCase().includes(searchText.toLowerCase()) ||
    property.location.town.toLowerCase().includes(searchText.toLowerCase())
  );

  // Sort properties
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.price - b.price;
      case 'location':
        return a.location.town.localeCompare(b.location.town);
      case 'date':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const handleRefresh = () => {
    setRefreshing(true);
    dispatch(loadFavoriteProperties())
      .finally(() => {
        setRefreshing(false);
      });
  };

  const handleRemoveProperty = (propertyId: string) => {
    Alert.alert(
      'Remove Property',
      'Are you sure you want to remove this property from your saved list?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            dispatch(toggleFavoriteProperty(propertyId));
          }
        }
      ]
    );
  };

  const handleViewProperty = (property: Property) => {
    navigation.navigate('PropertyDetails', { 
      propertyId: property.id,
      property 
    });
  };

  const handleCompareSelected = () => {
    const selectedIds = selectedProperties;
    if (selectedIds.length < 2) {
      Alert.alert(
        'Select Properties',
        'Please select at least 2 properties to compare.',
        [{ text: 'OK' }]
      );
      return;
    }

    const propertiesToCompare = savedProperties.filter(p => selectedIds.includes(p.id));
    
    // Navigate to compare screen with selected properties
    navigation.navigate('PropertyCompare', { 
      properties: propertiesToCompare 
    });
  };

  // Selection state for comparison
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  const toggleSelection = (propertyId: string) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const EmptyState = () => (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center',
      paddingHorizontal: 40
    }}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>🏠</Text>
      <Text style={{ 
        fontSize: 20, 
        fontWeight: '600',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 8
      }}>
        No Saved Properties
      </Text>
      <Text style={{ 
        fontSize: 16, 
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24
      }}>
        Start exploring properties and save your favorites to see them here.
      </Text>
      <TouchableOpacity
        onPress={() => navigateToMainTab(navigation as any, 'PropertyHub')}
        style={{
          backgroundColor: '#10B981',
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 8
        }}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
          Browse Properties
        </Text>
      </TouchableOpacity>
    </View>
  );

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
            <View>
              <Text style={{ 
                fontSize: isTablet ? 24 : 20, 
                fontWeight: '700',
                color: '#111827'
              }}>
                Saved Properties
              </Text>
              <Text style={{ 
                fontSize: 14, 
                color: '#6B7280'
              }}>
                {savedProperties.length} properties saved
              </Text>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row' }}>
            {savedProperties.length > 0 && (
              <TouchableOpacity
                onPress={() => setSelectionMode(!selectionMode)}
                style={{ 
                  backgroundColor: selectionMode ? '#EF4444' : '#10B981',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  marginRight: 8
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
                  {selectionMode ? 'Cancel' : 'Select'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search and Sort */}
        {savedProperties.length > 0 && (
          <View style={{ marginTop: 16 }}>
            {/* Search Bar */}
            <View style={{ 
              flexDirection: 'row',
              backgroundColor: '#F9FAFB',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              marginBottom: 12
            }}>
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search saved properties..."
                placeholderTextColor="#9CA3AF"
                style={{ 
                  flex: 1, 
                  fontSize: 16,
                  color: '#111827'
                }}
              />
              <MaterialIcons name="search" size={18} color="#10B981" />
            </View>

            {/* Sort Options */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ 
                fontSize: 14, 
                color: '#6B7280',
                marginRight: 12
              }}>
                Sort by:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row' }}>
                  {[
                    { key: 'date', label: 'Date Saved' },
                    { key: 'price', label: 'Price' },
                    { key: 'location', label: 'Location' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      onPress={() => setSortBy(option.key as any)}
                      style={{
                        backgroundColor: sortBy === option.key ? '#10B981' : '#F3F4F6',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        marginRight: 8
                      }}
                    >
                      <Text style={{
                        color: sortBy === option.key ? '#FFFFFF' : '#374151',
                        fontWeight: '500',
                        fontSize: 12
                      }}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </View>

      {/* Selection Actions */}
      {selectionMode && selectedProperties.length > 0 && (
        <View style={{
          backgroundColor: '#F3F4F6',
          paddingHorizontal: isTablet ? 24 : 16,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Text style={{ fontSize: 14, color: '#374151' }}>
            {selectedProperties.length} selected
          </Text>
          <View style={{ flexDirection: 'row' }}>
            {selectedProperties.length >= 2 && (
              <TouchableOpacity
                onPress={handleCompareSelected}
                style={{
                  backgroundColor: '#10B981',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                  marginRight: 8
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                  Compare
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => {
                selectedProperties.forEach(id => handleRemoveProperty(id));
                setSelectedProperties([]);
              }}
              style={{
                backgroundColor: '#EF4444',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                Remove
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Properties List */}
      {savedProperties.length === 0 ? (
        <EmptyState />
      ) : (
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            paddingHorizontal: isTablet ? 24 : 16,
            paddingVertical: 16
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {sortedProperties.map((property, index) => (
            <TouchableOpacity
              key={property.id}
              onPress={() => {
                if (selectionMode) {
                  toggleSelection(property.id);
                } else {
                  handleViewProperty(property);
                }
              }}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
                borderWidth: selectionMode && selectedProperties.includes(property.id) ? 2 : 1,
                borderColor: selectionMode && selectedProperties.includes(property.id) ? '#10B981' : '#E5E7EB'
              }}
            >
              <View style={{ flexDirection: 'row' }}>
                {/* Property Image */}
                <View style={{ position: 'relative' }}>
                  <Image
                    source={{ uri: property.images[0] || 'https://via.placeholder.com/120x100' }}
                    style={{ 
                      width: 120, 
                      height: 100, 
                      borderTopLeftRadius: 12,
                      borderBottomLeftRadius: 12
                    }}
                    resizeMode="cover"
                  />
                  
                  {selectionMode && (
                    <View style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: selectedProperties.includes(property.id) ? '#10B981' : '#FFFFFF',
                      borderWidth: 2,
                      borderColor: '#10B981',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      {selectedProperties.includes(property.id) && (
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>✓</Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Property Details */}
                <View style={{ flex: 1, padding: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ 
                        fontSize: 16, 
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: 4
                      }} numberOfLines={1}>
                        {property.title}
                      </Text>
                      
                      <Text style={{ 
                        fontSize: 18, 
                        fontWeight: '700',
                        color: '#10B981',
                        marginBottom: 4
                      }}>
                        {formatPrice(property.price)}
                      </Text>
                      
                      <Text style={{ 
                        fontSize: 14, 
                        color: '#6B7280',
                        marginBottom: 4
                      }} numberOfLines={1}>
                        📍 {property.location.address}
                      </Text>
                      
                      <Text style={{ 
                        fontSize: 12, 
                        color: '#9CA3AF'
                      }}>
                        {getPropertySummary(property)}
                      </Text>
                    </View>

                    {!selectionMode && (
                      <TouchableOpacity
                        onPress={() => handleRemoveProperty(property.id)}
                        style={{
                          padding: 8,
                          marginLeft: 8
                        }}
                      >
                        <Text style={{ fontSize: 16, color: '#EF4444' }}>❤️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {/* Show message if no results after search */}
          {sortedProperties.length === 0 && searchText && (
            <View style={{ 
              flex: 1, 
              justifyContent: 'center', 
              alignItems: 'center',
              paddingVertical: 40
            }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>🔍</Text>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '600',
                color: '#111827',
                textAlign: 'center',
                marginBottom: 8
              }}>
                No properties found
              </Text>
              <Text style={{ 
                fontSize: 14, 
                color: '#6B7280',
                textAlign: 'center'
              }}>
                Try adjusting your search terms
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

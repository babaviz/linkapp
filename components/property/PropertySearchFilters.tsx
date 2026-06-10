/**
 * PropertySearchFilters Component
 * Material 3 compliant search filters for properties
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PropertyFilter,
  PropertyType,
  KENYAN_COUNTIES,
  COMMON_AMENITIES
} from '../../types/property';

interface PropertySearchFiltersProps {
  visible: boolean;
  filters: PropertyFilter;
  onClose: () => void;
  onApplyFilters: (filters: PropertyFilter) => void;
  onClearFilters: () => void;
}

const PROPERTY_TYPES: { key: PropertyType; label: string; icon: string }[] = [
  { key: 'house', label: 'Houses', icon: '🏠' },
  { key: 'apartment', label: 'Apartments', icon: '🏢' },
  { key: 'one_bedroom', label: '1 Bedroom', icon: '🛌' },
  { key: 'two_bedroom', label: '2 Bedroom', icon: '🏡' },
  { key: 'three_bedroom', label: '3 Bedroom', icon: '🏢' },
  { key: 'bedsitter', label: 'Bedsitters', icon: '🚪' },
  { key: 'commercial', label: 'Commercial', icon: '🏪' },
  { key: 'industrial', label: 'Industrial', icon: '🏭' },
  { key: 'office_space', label: 'Office Space', icon: '🏢' },
  { key: 'land', label: 'Land/Plots', icon: '🌍' }
];

const PropertySearchFilters: React.FC<PropertySearchFiltersProps> = ({
  visible,
  filters,
  onClose,
  onApplyFilters,
  onClearFilters
}) => {
  const [localFilters, setLocalFilters] = useState<PropertyFilter>(filters);
  const [activeTab, setActiveTab] = useState<'type' | 'price' | 'location' | 'features'>('type');

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleClear = () => {
    setLocalFilters({});
    onClearFilters();
  };

  const updateFilter = (key: keyof PropertyFilter, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const toggleAmenity = (amenity: string) => {
    const currentAmenities = localFilters.amenities || [];
    const newAmenities = currentAmenities.includes(amenity)
      ? currentAmenities.filter(a => a !== amenity)
      : [...currentAmenities, amenity];
    
    updateFilter('amenities', newAmenities.length > 0 ? newAmenities : undefined);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Filter Properties</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.doneButton}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.tabsContainer}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            {[
              { key: 'type', label: 'Property Type', icon: '🏠' },
              { key: 'price', label: 'Price Range', icon: '💰' },
              { key: 'location', label: 'Location', icon: '📍' },
              { key: 'features', label: 'Features', icon: '✨' }
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key as any)}
                style={[
                  styles.tab,
                  activeTab === tab.key ? styles.tabActive : styles.tabInactive
                ]}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === tab.key ? styles.tabTextActive : styles.tabTextInactive
                ]}>
                  {tab.icon} {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Filter Content */}
        <ScrollView style={styles.content}>
          {/* Property Type Tab */}
          {activeTab === 'type' && (
            <View>
              <Text style={styles.sectionTitle}>
                Select Property Type
              </Text>
              <View style={styles.typeGrid}>
                {PROPERTY_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    onPress={() => updateFilter('property_type', 
                      localFilters.property_type === type.key ? undefined : type.key
                    )}
                    style={[
                      styles.typeButton,
                      localFilters.property_type === type.key ? styles.typeButtonActive : styles.typeButtonInactive
                    ]}
                  >
                    <View style={styles.typeButtonContent}>
                      <Text style={styles.typeIcon}>{type.icon}</Text>
                      <Text style={[
                        styles.typeLabel,
                        localFilters.property_type === type.key ? styles.typeLabelActive : styles.typeLabelInactive
                      ]}>
                        {type.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Price Range Tab */}
          {activeTab === 'price' && (
            <View>
              <Text style={styles.sectionTitle}>
                Price Range (KSH)
              </Text>
              
              <View style={styles.priceContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Minimum Price</Text>
                  <TextInput
                    value={localFilters.min_price?.toString() || ''}
                    onChangeText={(text) => updateFilter('min_price', text ? parseInt(text.replace(/[^0-9]/g, '')) : undefined)}
                    placeholder="e.g., 10000"
                    keyboardType="numeric"
                    style={styles.textInput}
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Maximum Price</Text>
                  <TextInput
                    value={localFilters.max_price?.toString() || ''}
                    onChangeText={(text) => updateFilter('max_price', text ? parseInt(text.replace(/[^0-9]/g, '')) : undefined)}
                    placeholder="e.g., 100000"
                    keyboardType="numeric"
                    style={styles.textInput}
                  />
                </View>

                {/* Quick Price Ranges */}
                <View style={styles.quickSelectContainer}>
                  <Text style={styles.inputLabel}>Quick Select</Text>
                  <View style={styles.quickSelectGrid}>
                    {[
                      { label: 'Under 20K', min: 0, max: 20000 },
                      { label: '20K - 50K', min: 20000, max: 50000 },
                      { label: '50K - 100K', min: 50000, max: 100000 },
                      { label: '100K+', min: 100000, max: undefined }
                    ].map((range, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {
                          updateFilter('min_price', range.min);
                          updateFilter('max_price', range.max);
                        }}
                        style={styles.quickSelectButton}
                      >
                        <Text style={styles.quickSelectText}>{range.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Location Tab */}
          {activeTab === 'location' && (
            <View>
              <Text style={styles.sectionTitle}>
                Select County
              </Text>
              
              <FlatList
                data={KENYAN_COUNTIES}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => updateFilter('location', 
                      localFilters.location?.county === item 
                        ? undefined 
                        : { ...localFilters.location, county: item }
                    )}
                    style={[
                      styles.locationButton,
                      localFilters.location?.county === item ? styles.locationButtonActive : styles.locationButtonInactive
                    ]}
                  >
                    <Text style={[
                      styles.locationText,
                      localFilters.location?.county === item ? styles.locationTextActive : styles.locationTextInactive
                    ]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
                scrollEnabled={false}
              />
            </View>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && (
            <View>
              <Text style={styles.sectionTitle}>
                Property Features
              </Text>
              
              {/* Bedrooms/Bathrooms */}
              <View style={styles.featureSection}>
                <Text style={styles.featureLabel}>Bedrooms</Text>
                <View style={styles.numberGrid}>
                  {[1, 2, 3, 4, 5].map(num => (
                    <TouchableOpacity
                      key={num}
                      onPress={() => updateFilter('bedrooms', 
                        localFilters.bedrooms === num ? undefined : num
                      )}
                      style={[
                        styles.numberButton,
                        localFilters.bedrooms === num ? styles.numberButtonActive : styles.numberButtonInactive
                      ]}
                    >
                      <Text style={[
                        styles.numberText,
                        localFilters.bedrooms === num ? styles.numberTextActive : styles.numberTextInactive
                      ]}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.featureSection}>
                <Text style={styles.featureLabel}>Bathrooms</Text>
                <View style={styles.numberGrid}>
                  {[1, 2, 3, 4].map(num => (
                    <TouchableOpacity
                      key={num}
                      onPress={() => updateFilter('bathrooms', 
                        localFilters.bathrooms === num ? undefined : num
                      )}
                      style={[
                        styles.numberButton,
                        localFilters.bathrooms === num ? styles.numberButtonActive : styles.numberButtonInactive
                      ]}
                    >
                      <Text style={[
                        styles.numberText,
                        localFilters.bathrooms === num ? styles.numberTextActive : styles.numberTextInactive
                      ]}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Amenities */}
              <View>
                <Text style={styles.featureLabel}>Amenities</Text>
                <View style={styles.amenitiesGrid}>
                  {COMMON_AMENITIES.map((amenity) => (
                    <TouchableOpacity
                      key={amenity}
                      onPress={() => toggleAmenity(amenity)}
                      style={[
                        styles.amenityButton,
                        localFilters.amenities?.includes(amenity) ? styles.amenityButtonActive : styles.amenityButtonInactive
                      ]}
                    >
                      <Text style={[
                        styles.amenityText,
                        localFilters.amenities?.includes(amenity) ? styles.amenityTextActive : styles.amenityTextInactive
                      ]}>
                        {amenity}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <View style={styles.actionButtonRow}>
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleApply}
              style={styles.applyButton}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  doneButton: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0D9488',
  },
  tabsContainer: {
    marginTop: 16,
  },
  tab: {
    marginRight: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#5EEAD4',
  },
  tabInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
  },
  tabText: {
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#0F766E',
  },
  tabTextInactive: {
    color: '#4B5563',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  typeButton: {
    marginRight: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeButtonActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#5EEAD4',
  },
  typeButtonInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
  },
  typeButtonContent: {
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  typeLabelActive: {
    color: '#0F766E',
  },
  typeLabelInactive: {
    color: '#4B5563',
  },
  priceContainer: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    fontSize: 16,
  },
  quickSelectContainer: {
    marginTop: 16,
  },
  quickSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickSelectButton: {
    marginRight: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  quickSelectText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  locationButton: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  locationButtonActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#5EEAD4',
  },
  locationButtonInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  locationTextActive: {
    color: '#0F766E',
  },
  locationTextInactive: {
    color: '#374151',
  },
  featureSection: {
    marginBottom: 24,
  },
  featureLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  numberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  numberButton: {
    width: 48,
    height: 48,
    marginRight: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberButtonActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#5EEAD4',
  },
  numberButtonInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
  },
  numberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  numberTextActive: {
    color: '#0F766E',
  },
  numberTextInactive: {
    color: '#374151',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityButton: {
    marginRight: 8,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  amenityButtonActive: {
    backgroundColor: '#CCFBF1',
    borderColor: '#5EEAD4',
  },
  amenityButtonInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
  },
  amenityText: {
    fontSize: 14,
    fontWeight: '500',
  },
  amenityTextActive: {
    color: '#0F766E',
  },
  amenityTextInactive: {
    color: '#4B5563',
  },
  actionContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#0D9488',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default PropertySearchFilters;

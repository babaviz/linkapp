/**
 * UniversalFilters Component
 * Material 3 compliant unified filtering for all modules
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ModuleType,
  UniversalSearchFilters,
  PropertySearchFilters,
  JobSearchFilters,
  ServiceSearchFilters,
  DateMiSearchFilters
} from '../../types/search';
import { KENYAN_COUNTIES } from '../../types/property';
import { universalSearchService } from '../../services/universalSearchService';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';
import LocationPicker from './LocationPicker';

interface UniversalFiltersProps {
  visible: boolean;
  module: ModuleType;
  filters: UniversalSearchFilters;
  onClose: () => void;
  onApplyFilters: (filters: UniversalSearchFilters) => void;
  onClearFilters: () => void;
}

const getModuleColor = (module: ModuleType): [string, string] => {
  switch (module) {
    case 'property': return ['#0D9488', '#0F766E'];
    case 'jobs': return ['#7C3AED', '#5B21B6'];
    case 'services': return ['#DC2626', '#B91C1C'];
    case 'datemi': return ['#DB2777', '#BE185D'];
    default: return ['#6B7280', '#4B5563'];
  }
};

const UniversalFilters: React.FC<UniversalFiltersProps> = ({
  visible,
  module,
  filters,
  onClose,
  onApplyFilters,
  onClearFilters
}) => {
  const { width, isTablet } = getDynamicDimensions();
  const insets = useSafeAreaInsets();
  const [localFilters, setLocalFilters] = useState<UniversalSearchFilters>(filters);
  const [activeTab, setActiveTab] = useState<string>('location');
  const moduleColors = getModuleColor(module);

  const updateFilter = (key: string, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateNestedFilter = (parentKey: string, childKey: string, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [parentKey]: {
        ...(prev as any)[parentKey],
        [childKey]: value
      }
    }));
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleClear = () => {
    setLocalFilters({} as UniversalSearchFilters);
    onClearFilters();
  };

  const getTabsForModule = (module: ModuleType) => {
    const commonTabs = [
      { key: 'location', label: 'Location', icon: '📍' },
      { key: 'price', label: 'Price', icon: '💰' },
      { key: 'date', label: 'Date', icon: '📅' }
    ];

    switch (module) {
      case 'property':
        return [
          ...commonTabs,
          { key: 'type', label: 'Property Type', icon: '🏠' },
          { key: 'features', label: 'Features', icon: '✨' }
        ];
      case 'jobs':
        return [
          ...commonTabs,
          { key: 'type', label: 'Job Type', icon: '💼' },
          { key: 'skills', label: 'Skills', icon: '🎨' }
        ];
      case 'services':
        return [
          ...commonTabs,
          { key: 'type', label: 'Service Type', icon: '🔧' },
          { key: 'rating', label: 'Rating', icon: '⭐' }
        ];
      case 'datemi':
        return [
          { key: 'age', label: 'Age Range', icon: '🎂' },
          { key: 'interests', label: 'Interests', icon: '🎆' },
          { key: 'relationship', label: 'Looking For', icon: '💕' }
        ];
      default:
        return commonTabs;
    }
  };

  const renderLocationTab = () => (
    <View>
      <Text style={styles.sectionTitle}>
        Filter by Location
      </Text>
      
      {/* Map-based Location Picker */}
      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Search Near Location</Text>
        <LocationPicker
          value={localFilters.location?.coordinates ? {
            latitude: localFilters.location.coordinates.latitude,
            longitude: localFilters.location.coordinates.longitude,
            address: `${localFilters.location.town || ''} ${localFilters.location.county || ''}`.trim()
          } : null}
          onLocationSelect={(location) => {
            updateNestedFilter('location', 'coordinates', {
              latitude: location.latitude,
              longitude: location.longitude,
              radius: localFilters.location?.coordinates?.radius || 25
            });
            // Try to extract town/county from address
            const addressParts = location.address.split(',');
            if (addressParts.length > 1) {
              const town = addressParts[0].trim();
              updateNestedFilter('location', 'town', town);
            }
          }}
          placeholder="Select location to search around"
        />
        
        {localFilters.location?.coordinates && (
          <TouchableOpacity
            onPress={() => {
              updateNestedFilter('location', 'coordinates', undefined);
              updateNestedFilter('location', 'town', '');
            }}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>🗑️ Clear Location</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Radius */}
      {localFilters.location?.coordinates && (
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Search Radius</Text>
          <View style={styles.optionsRow}>
            {[5, 10, 25, 50, 100].map(radius => (
              <TouchableOpacity
                key={radius}
                onPress={() => updateNestedFilter('location', 'coordinates', {
                  ...localFilters.location?.coordinates,
                  radius: radius
                })}
                style={[
                  styles.optionButton,
                  localFilters.location?.coordinates?.radius === radius
                    ? styles.selectedOptionButton
                    : styles.unselectedOptionButton
                ]}
              >
                <Text style={[
                  styles.optionButtonText,
                  localFilters.location?.coordinates?.radius === radius
                    ? styles.selectedOptionText
                    : styles.unselectedOptionText
                ]}>
                  {radius} km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Alternative: Text-based Location */}
      <View style={styles.divider}>
        <Text style={styles.subsectionTitle}>Or Filter by Region</Text>
        
        <View style={styles.fieldContainer}>
        <Text style={styles.inputLabel}>County</Text>
        <View style={styles.listContainer}>
          <FlatList
            data={KENYAN_COUNTIES}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => updateNestedFilter('location', 'county', 
                  localFilters.location?.county === item ? undefined : item
                )}
                style={[
                  styles.listItem,
                  localFilters.location?.county === item ? styles.selectedListItem : styles.unselectedListItem
                ]}
              >
                <Text style={[
                  styles.listItemText,
                  localFilters.location?.county === item ? styles.selectedOptionText : styles.unselectedOptionText
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            style={{ maxHeight: 200 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.inputLabel}>Town/City</Text>
        <TextInput
          value={localFilters.location?.town || ''}
          onChangeText={(text) => updateNestedFilter('location', 'town', text)}
          placeholder="Enter town or city name"
          style={styles.textInput}
        />
      </View>
      </View>
    </View>
  );

  const renderPriceTab = () => (
    <View>
      <Text style={styles.sectionTitle}>
        Price Range
      </Text>
      
      <View style={styles.rowContainer}>
        <View style={styles.rowItem}>
          <Text style={styles.inputLabel}>Minimum Price</Text>
          <TextInput
            value={localFilters.priceRange?.min?.toString() || ''}
            onChangeText={(text) => updateNestedFilter('priceRange', 'min', 
              text ? parseInt(text.replace(/[^0-9]/g, '')) : undefined
            )}
            placeholder="Min price"
            keyboardType="numeric"
            style={styles.textInput}
          />
        </View>
        
        <View style={styles.rowItem}>
          <Text style={styles.inputLabel}>Maximum Price</Text>
          <TextInput
            value={localFilters.priceRange?.max?.toString() || ''}
            onChangeText={(text) => updateNestedFilter('priceRange', 'max', 
              text ? parseInt(text.replace(/[^0-9]/g, '')) : undefined
            )}
            placeholder="Max price"
            keyboardType="numeric"
            style={styles.textInput}
          />
        </View>
      </View>

      {/* Quick Price Ranges */}
      <View style={styles.fieldContainer}>
        <Text style={styles.subsectionTitle}>Quick Select</Text>
        <View style={styles.optionsRow}>
          {getQuickPriceRanges(module).map((range, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                updateNestedFilter('priceRange', 'min', range.min);
                updateNestedFilter('priceRange', 'max', range.max);
              }}
              style={styles.optionButton}
            >
              <Text style={styles.optionButtonText}>{range.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderDateTab = () => (
    <View>
      <Text style={styles.sectionTitle}>
        Date Range
      </Text>
      
      <View style={styles.fieldContainer}>
        <Text style={styles.subsectionTitle}>Quick Select</Text>
        <View style={styles.optionsRow}>
          {[
            { label: 'Today', days: 0 },
            { label: 'This Week', days: 7 },
            { label: 'This Month', days: 30 },
            { label: 'Last 3 Months', days: 90 }
          ].map((period, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                const to = new Date().toISOString();
                const from = new Date(Date.now() - period.days * 24 * 60 * 60 * 1000).toISOString();
                updateFilter('dateRange', { from, to });
              }}
              style={styles.optionButton}
            >
              <Text style={styles.optionButtonText}>{period.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderModuleSpecificTab = () => {
    switch (module) {
      case 'property':
        return renderPropertySpecificFilters();
      case 'jobs':
        return renderJobSpecificFilters();
      case 'services':
        return renderServiceSpecificFilters();
      case 'datemi':
        return renderDateMiSpecificFilters();
      default:
        return <View />;
    }
  };

  const renderPropertySpecificFilters = () => {
    const propertyFilters = localFilters as PropertySearchFilters;
    
    if (activeTab === 'type') {
      return (
        <View>
          <Text style={styles.sectionTitle}>
            Property Type
          </Text>
          <View style={styles.optionsRow}>
            {['house', 'apartment', 'commercial', 'land', 'bedsitter'].map(type => (
              <TouchableOpacity
                key={type}
                onPress={() => updateFilter('property_type', 
                  propertyFilters.property_type === type ? undefined : type
                )}
                style={[
                  styles.optionButton,
                  propertyFilters.property_type === type
                    ? styles.selectedOptionButton
                    : styles.unselectedOptionButton
                ]}
              >
                <Text style={[
                  styles.optionButtonText,
                  propertyFilters.property_type === type
                    ? styles.selectedOptionText
                    : styles.unselectedOptionText
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }
    
    if (activeTab === 'features') {
      return (
        <View>
          <Text style={styles.sectionTitle}>
            Property Features
          </Text>
          
          <View style={styles.inputSection}>
            <Text style={styles.subsectionTitle}>Bedrooms</Text>
            <View style={styles.optionsRow}>
              {[1, 2, 3, 4, 5].map(num => (
                <TouchableOpacity
                  key={num}
                  onPress={() => updateFilter('bedrooms', 
                    propertyFilters.bedrooms === num ? undefined : num
                  )}
                  style={[
                    styles.squareButton,
                    propertyFilters.bedrooms === num
                      ? styles.selectedOptionButton
                      : styles.unselectedOptionButton
                  ]}
                >
                  <Text style={[
                    styles.boldText,
                    propertyFilters.bedrooms === num ? styles.selectedOptionText : styles.unselectedOptionText
                  ]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.subsectionTitle}>Bathrooms</Text>
            <View style={styles.optionsRow}>
              {[1, 2, 3, 4].map(num => (
                <TouchableOpacity
                  key={num}
                  onPress={() => updateFilter('bathrooms', 
                    propertyFilters.bathrooms === num ? undefined : num
                  )}
                  style={[
                    styles.squareButton,
                    propertyFilters.bathrooms === num
                      ? styles.selectedOptionButton
                      : styles.unselectedOptionButton
                  ]}
                >
                  <Text style={[
                    styles.boldText,
                    propertyFilters.bathrooms === num ? styles.selectedOptionText : styles.unselectedOptionText
                  ]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      );
    }
    
    return <View />;
  };

  const renderJobSpecificFilters = () => {
    // Implementation for job-specific filters
    return (
      <View>
        <Text style={styles.sectionTitle}>
          Job Filters
        </Text>
        <Text style={styles.placeholderText}>Job-specific filters coming soon...</Text>
      </View>
    );
  };

  const renderServiceSpecificFilters = () => {
    // Implementation for service-specific filters
    return (
      <View>
        <Text style={styles.sectionTitle}>
          Service Filters
        </Text>
        <Text style={styles.placeholderText}>Service-specific filters coming soon...</Text>
      </View>
    );
  };

  const renderDateMiSpecificFilters = () => {
    // Implementation for dating-specific filters
    return (
      <View>
        <Text style={styles.sectionTitle}>
          Dating Preferences
        </Text>
        <Text style={styles.placeholderText}>Dating-specific filters coming soon...</Text>
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'location':
        return renderLocationTab();
      case 'price':
        return renderPriceTab();
      case 'date':
        return renderDateTab();
      default:
        return renderModuleSpecificTab();
    }
  };

  const getQuickPriceRanges = (module: ModuleType) => {
    switch (module) {
      case 'property':
        return [
          { label: 'Under 20K', min: 0, max: 20000 },
          { label: '20K - 50K', min: 20000, max: 50000 },
          { label: '50K - 100K', min: 50000, max: 100000 },
          { label: '100K+', min: 100000, max: undefined }
        ];
      case 'jobs':
        return [
          { label: 'Under 50K', min: 0, max: 50000 },
          { label: '50K - 100K', min: 50000, max: 100000 },
          { label: '100K - 200K', min: 100000, max: 200000 },
          { label: '200K+', min: 200000, max: undefined }
        ];
      default:
        return [
          { label: 'Under 1K', min: 0, max: 1000 },
          { label: '1K - 5K', min: 1000, max: 5000 },
          { label: '5K - 10K', min: 5000, max: 10000 },
          { label: '10K+', min: 10000, max: undefined }
        ];
    }
  };

  const tabs = getTabsForModule(module);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={moduleColors}
          style={styles.headerGradient}
        >
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Filters</Text>
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
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tabButton,
                  activeTab === tab.key
                    ? styles.activeTabButton
                    : styles.inactiveTabButton
                ]}
              >
                <Text style={[
                  styles.tabButtonText,
                  activeTab === tab.key ? styles.activeTabText : styles.inactiveTabText
                ]}>
                  {tab.icon} {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </LinearGradient>

        {/* Filter Content */}
        <ScrollView style={styles.contentContainer}>
          {renderTabContent()}
        </ScrollView>

        {/* Action Buttons */}
        <View style={[styles.actionContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearAllButton}
            >
              <Text style={styles.clearAllButtonText}>Clear All</Text>
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
    backgroundColor: '#F9FAFB' // bg-gray-50
  },
  headerGradient: {
    paddingHorizontal: 24,
    paddingVertical: 16
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold'
  },
  doneButton: {
    color: 'white', 
    fontWeight: '600',
    fontSize: 18
  },
  tabsContainer: {
    marginTop: 16
  },
  tabButton: {
    marginRight: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999, // rounded-full
  },
  activeTabButton: {
    backgroundColor: 'white'
  },
  inactiveTabButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)' // bg-white bg-opacity-20
  },
  tabButtonText: {
    fontWeight: '500',
  },
  activeTabText: {
    color: '#0F766E' // text-teal-700
  },
  inactiveTabText: {
    color: 'white'
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827', // text-gray-900
    marginBottom: 16
  },
  inputSection: {
    marginBottom: 24
  },
  fieldContainer: {
    marginBottom: 16
  },
  inputLabel: {
    color: '#374151', // text-gray-700
    fontWeight: '500',
    marginBottom: 8
  },
  subsectionTitle: {
    color: '#374151', // text-gray-700
    fontWeight: '500',
    marginBottom: 12
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB', // border-gray-300
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  clearButton: {
    marginTop: 8,
    backgroundColor: '#FEF2F2', // bg-red-50
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  clearButtonText: {
    color: '#B91C1C', // text-red-700
    fontWeight: '500'
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  optionButton: {
    marginRight: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB', // border-gray-300
    borderRadius: 8
  },
  optionButtonText: {
    color: '#374151', // text-gray-700
    fontWeight: '500'
  },
  squareButton: {
    width: 48,
    height: 48,
    marginRight: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  selectedOptionButton: {
    backgroundColor: '#E6FFFA', // bg-teal-100
    borderColor: '#5EEAD4' // border-teal-300
  },
  unselectedOptionButton: {
    backgroundColor: 'white',
    borderColor: '#D1D5DB' // border-gray-300
  },
  selectedOptionText: {
    color: '#0F766E' // text-teal-700
  },
  unselectedOptionText: {
    color: '#374151' // text-gray-700
  },
  boldText: {
    fontWeight: '600'
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB', // border-gray-200
    paddingTop: 16
  },
  listContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB', // border-gray-300
    borderRadius: 8
  },
  listItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6' // border-gray-100
  },
  selectedListItem: {
    backgroundColor: '#E6FFFA' // bg-teal-50
  },
  unselectedListItem: {
    backgroundColor: 'white'
  },
  listItemText: {
    fontWeight: '500'
  },
  rowContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16
  },
  rowItem: {
    flex: 1
  },
  placeholderText: {
    color: '#6B7280' // text-gray-500
  },
  actionContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB' // border-gray-200
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12
  },
  clearAllButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB', // border-gray-300
    backgroundColor: 'white'
  },
  clearAllButtonText: {
    color: '#374151', // text-gray-700
    fontWeight: '600',
    textAlign: 'center'
  },
  applyButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#0D9488' // bg-teal-600
  },
  applyButtonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center'
  }
});

export default UniversalFilters;

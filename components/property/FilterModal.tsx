import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { BaseModal } from '../common/BaseModal';
import { ModalHeader, ModalFooter } from '../../utils/modalHelpers';
import { PropertyFilter, PropertyType } from '../../types/property';
import { colors } from '../../theme';
import { getCrossPlatformShadow } from '../../utils/crossPlatformShadows';
import { useAppSelector } from '../../redux/hooks';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: PropertyFilter) => void;
  initialFilters?: PropertyFilter;
}

const PROPERTY_TYPES: { id: PropertyType; label: string }[] = [
  { id: 'apartment' as PropertyType, label: 'Apartment' },
  { id: 'house' as PropertyType, label: 'House' },
  { id: 'studio' as PropertyType, label: 'Studio' },
  { id: 'condo' as PropertyType, label: 'Condo' },
  { id: 'townhouse' as PropertyType, label: 'Townhouse' },
  { id: 'villa' as PropertyType, label: 'Villa' },
  { id: 'bungalow' as PropertyType, label: 'Bungalow' },
  // New property types
  { id: 'container_house' as PropertyType, label: 'Container House' },
  { id: 'cabin' as PropertyType, label: 'Cabin' },
  { id: 'farm_house' as PropertyType, label: 'Farm House' },
  { id: 'cottage' as PropertyType, label: 'Cottage' },
  { id: 'town_house' as PropertyType, label: 'Town House' },
  { id: 'five_bedroom' as PropertyType, label: '5 Bedroom' },
  { id: 'mansionate' as PropertyType, label: 'Mansionate' },
  { id: 'duplex_house' as PropertyType, label: 'Duplex House' },
  // Commercial and special types
  { id: 'commercial' as PropertyType, label: 'Commercial' },
  { id: 'land' as PropertyType, label: 'Land/Plot' },
  { id: 'penthouse' as PropertyType, label: 'Penthouse' },
  { id: 'student_housing' as PropertyType, label: 'Student Housing' },
];

const AMENITIES = [
  'WiFi',
  'Parking',
  'Air Conditioning',
  'Kitchen',
  'Laundry',
  'Gym',
  'Pool',
  'Security',
  'Pet Friendly',
  'Balcony',
  'Garden',
  'Elevator',
];

const BEDROOMS = ['Studio', '1', '2', '3', '4', '5+'];
const BATHROOMS = ['1', '2', '3', '4+'];

const FilterSection: React.FC<{
  title: string;
  children: React.ReactNode;
  isDarkMode: boolean;
}> = ({ title, children, isDarkMode }) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: isDarkMode ? colors.text.inverse : colors.text.primary }]}>
      {title}
    </Text>
    {children}
  </View>
);

const CheckboxItem: React.FC<{
  label: string;
  value: boolean;
  onToggle: () => void;
  isDarkMode: boolean;
}> = React.memo(({ label, value, onToggle, isDarkMode }) => (
  <TouchableOpacity
    style={styles.checkboxContainer}
    onPress={onToggle}
    accessibilityRole="checkbox"
    accessibilityState={{ checked: value }}
    accessibilityLabel={`${label} filter`}
  >
    <View style={[
      styles.checkbox,
      value && styles.checkboxChecked,
      { borderColor: isDarkMode ? colors.border.dark : colors.border.light },
    ]}>
      {value && <MaterialIcons name="check" size={16} color={colors.text.inverse} />}
    </View>
    <Text style={[styles.checkboxLabel, { color: isDarkMode ? colors.text.inverse : colors.text.primary }]}>
      {label}
    </Text>
  </TouchableOpacity>
));

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  onApplyFilters,
  initialFilters = {},
}) => {
  const { theme } = useAppSelector(state => state.user);
  const isDarkMode = theme === 'dark';
  
  // Filter state
  const [filters, setFilters] = useState<PropertyFilter>(initialFilters);
  const [priceRange, setPriceRange] = useState({
    min: initialFilters.min_price || 0,
    max: initialFilters.max_price || 5000,
  });
  const [areaRange, setAreaRange] = useState({
    min: 0,
    max: 5000,
  });
  const [selectedTypes, setSelectedTypes] = useState<PropertyType[]>(
    initialFilters.property_type ? [initialFilters.property_type] : []
  );
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    initialFilters.amenities || []
  );
  const [selectedBedrooms, setSelectedBedrooms] = useState<string | null>(
    initialFilters.bedrooms?.toString() || null
  );
  const [selectedBathrooms, setSelectedBathrooms] = useState<string | null>(
    initialFilters.bathrooms?.toString() || null
  );
  const [location, setLocation] = useState(
    typeof initialFilters.location === 'object' && initialFilters.location?.county
      ? initialFilters.location.county
      : ''
  );
  
  const handleApply = useCallback(() => {
    const appliedFilters: PropertyFilter = {};
    
    if (priceRange.min > 0) appliedFilters.min_price = priceRange.min;
    if (priceRange.max < 5000) appliedFilters.max_price = priceRange.max;
    // Area filters removed - not in PropertyFilters interface
    if (selectedTypes.length === 1) appliedFilters.property_type = selectedTypes[0];
    if (selectedAmenities.length > 0) appliedFilters.amenities = selectedAmenities;
    if (selectedBedrooms) appliedFilters.bedrooms = parseInt(selectedBedrooms) || 0;
    if (selectedBathrooms) appliedFilters.bathrooms = parseInt(selectedBathrooms) || 1;
    if (location.trim()) {
      appliedFilters.location = {
        county: location.trim()
      };
    }
    
    onApplyFilters(appliedFilters);
  }, [
    priceRange,
    areaRange,
    selectedTypes,
    selectedAmenities,
    selectedBedrooms,
    selectedBathrooms,
    location,
    onApplyFilters,
  ]);
  
  const handleReset = useCallback(() => {
    setPriceRange({ min: 0, max: 5000 });
    setAreaRange({ min: 0, max: 5000 });
    setSelectedTypes([]);
    setSelectedAmenities([]);
    setSelectedBedrooms(null);
    setSelectedBathrooms(null);
    setLocation('');
  }, []);
  
  const togglePropertyType = useCallback((type: PropertyType) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  }, []);
  
  const toggleAmenity = useCallback((amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  }, []);
  
  const modalStyle = {
    backgroundColor: isDarkMode ? colors.secondary[800] : colors.background,
  };
  
  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      size="large"
      dismissOnBackdrop={true}
      dismissOnBackButton={true}
      animationType="slideUp"
      title="Filter Properties"
      footerContent={
        <ModalFooter
          primaryAction={{
            label: 'Apply Filters',
            onPress: handleApply
          }}
          secondaryAction={{
            label: 'Reset',
            onPress: handleReset
          }}
          isDarkMode={isDarkMode}
        />
      }
    >
      <View style={[styles.modalContainer, modalStyle]}>
          
          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Location */}
            <FilterSection title="Location" isDarkMode={isDarkMode}>
              <TextInput
                style={[
                  styles.locationInput,
                  { 
                    backgroundColor: isDarkMode ? colors.secondary[700] : colors.surface,
                    color: isDarkMode ? colors.text.inverse : colors.text.primary,
                  },
                ]}
                placeholder="Enter location..."
                placeholderTextColor={colors.textSecondary}
                value={location}
                onChangeText={setLocation}
                accessibilityLabel="Location filter input"
              />
            </FilterSection>
            
            {/* Property Type */}
            <FilterSection title="Property Type" isDarkMode={isDarkMode}>
              <View style={styles.typeGrid}>
                {PROPERTY_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeButton,
                      selectedTypes.includes(type.id) && styles.typeButtonSelected,
                      { 
                        backgroundColor: selectedTypes.includes(type.id) 
                          ? colors.primary 
                          : isDarkMode ? colors.secondary[700] : colors.surface,
                        borderColor: isDarkMode ? colors.border.dark : colors.border.light,
                      },
                    ]}
                    onPress={() => togglePropertyType(type.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedTypes.includes(type.id) }}
                    accessibilityLabel={`${type.label} property type`}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        selectedTypes.includes(type.id) && styles.typeButtonTextSelected,
                        { color: selectedTypes.includes(type.id) 
                          ? colors.white 
                          : isDarkMode ? colors.text.inverse : colors.text.primary 
                        },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </FilterSection>
            
            {/* Price Range */}
            <FilterSection title={`Price Range: $${priceRange.min} - $${priceRange.max}`} isDarkMode={isDarkMode}>
              <View style={styles.sliderContainer}>
                <Text style={[styles.sliderLabel, { color: isDarkMode ? colors.text.tertiary : colors.text.secondary }]}>
                  Min: ${priceRange.min}
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={5000}
                  step={50}
                  value={priceRange.min}
                  onValueChange={value => setPriceRange(prev => ({ ...prev, min: value }))}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={isDarkMode ? colors.border.dark : colors.border.light}
                  thumbTintColor={colors.primary}
                  accessibilityLabel="Minimum price slider"
                />
              </View>
              
              <View style={styles.sliderContainer}>
                <Text style={[styles.sliderLabel, { color: isDarkMode ? colors.text.tertiary : colors.text.secondary }]}>
                  Max: ${priceRange.max}
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={5000}
                  step={50}
                  value={priceRange.max}
                  onValueChange={value => setPriceRange(prev => ({ ...prev, max: value }))}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={isDarkMode ? colors.border.dark : colors.border.light}
                  thumbTintColor={colors.primary}
                  accessibilityLabel="Maximum price slider"
                />
              </View>
            </FilterSection>
            
            {/* Bedrooms */}
            <FilterSection title="Bedrooms" isDarkMode={isDarkMode}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.buttonRow}>
                  {BEDROOMS.map(bedroom => (
                    <TouchableOpacity
                      key={bedroom}
                      style={[
                        styles.selectionButton,
                        selectedBedrooms === bedroom && styles.selectionButtonActive,
                        { 
                          backgroundColor: selectedBedrooms === bedroom 
                            ? colors.primary 
                            : isDarkMode ? colors.secondary[700] : colors.surface,
                          borderColor: isDarkMode ? colors.border.dark : colors.border.light,
                        },
                      ]}
                      onPress={() => setSelectedBedrooms(selectedBedrooms === bedroom ? null : bedroom)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: selectedBedrooms === bedroom }}
                      accessibilityLabel={`${bedroom} bedrooms`}
                    >
                      <Text
                        style={[
                          styles.selectionButtonText,
                          selectedBedrooms === bedroom && styles.selectionButtonTextActive,
                          { color: selectedBedrooms === bedroom 
                            ? colors.white 
                            : isDarkMode ? colors.text.inverse : colors.text.primary 
                          },
                        ]}
                      >
                        {bedroom}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </FilterSection>
            
            {/* Bathrooms */}
            <FilterSection title="Bathrooms" isDarkMode={isDarkMode}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.buttonRow}>
                  {BATHROOMS.map(bathroom => (
                    <TouchableOpacity
                      key={bathroom}
                      style={[
                        styles.selectionButton,
                        selectedBathrooms === bathroom && styles.selectionButtonActive,
                        { 
                          backgroundColor: selectedBathrooms === bathroom 
                            ? colors.primary 
                            : isDarkMode ? colors.secondary[700] : colors.surface,
                          borderColor: isDarkMode ? colors.border.dark : colors.border.light,
                        },
                      ]}
                      onPress={() => setSelectedBathrooms(selectedBathrooms === bathroom ? null : bathroom)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: selectedBathrooms === bathroom }}
                      accessibilityLabel={`${bathroom} bathrooms`}
                    >
                      <Text
                        style={[
                          styles.selectionButtonText,
                          selectedBathrooms === bathroom && styles.selectionButtonTextActive,
                          { color: selectedBathrooms === bathroom 
                            ? colors.white 
                            : isDarkMode ? colors.text.inverse : colors.text.primary 
                          },
                        ]}
                      >
                        {bathroom}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </FilterSection>
            
            {/* Amenities */}
            <FilterSection title="Amenities" isDarkMode={isDarkMode}>
              <View style={styles.amenitiesGrid}>
                {AMENITIES.map(amenity => (
                  <CheckboxItem
                    key={amenity}
                    label={amenity}
                    value={selectedAmenities.includes(amenity)}
                    onToggle={() => toggleAmenity(amenity)}
                    isDarkMode={isDarkMode}
                  />
                ))}
              </View>
            </FilterSection>
            
            {/* Area Range */}
            <FilterSection title={`Area (sqft): ${areaRange.min} - ${areaRange.max}`} isDarkMode={isDarkMode}>
              <View style={styles.sliderContainer}>
                <Text style={[styles.sliderLabel, { color: isDarkMode ? colors.text.tertiary : colors.text.secondary }]}>
                  Min: {areaRange.min} sqft
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={5000}
                  step={100}
                  value={areaRange.min}
                  onValueChange={value => setAreaRange(prev => ({ ...prev, min: value }))}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={isDarkMode ? colors.border.dark : colors.border.light}
                  thumbTintColor={colors.primary}
                  accessibilityLabel="Minimum area slider"
                />
              </View>
              
              <View style={styles.sliderContainer}>
                <Text style={[styles.sliderLabel, { color: isDarkMode ? colors.text.tertiary : colors.text.secondary }]}>
                  Max: {areaRange.max} sqft
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={5000}
                  step={100}
                  value={areaRange.max}
                  onValueChange={value => setAreaRange(prev => ({ ...prev, max: value }))}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={isDarkMode ? colors.border.dark : colors.border.light}
                  thumbTintColor={colors.primary}
                  accessibilityLabel="Maximum area slider"
                />
              </View>
            </FilterSection>
          </ScrollView>
      </View>
    </BaseModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlayTouch: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  locationInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    margin: 4,
  },
  typeButtonSelected: {
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  typeButtonTextSelected: {
    fontWeight: '600',
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  slider: {
    height: 40,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  selectionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  selectionButtonActive: {
    borderColor: colors.primary,
  },
  selectionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectionButtonTextActive: {
    fontWeight: '600',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetButton: {
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    marginLeft: 8,
    backgroundColor: colors.primary,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});

export default React.memo(FilterModal);

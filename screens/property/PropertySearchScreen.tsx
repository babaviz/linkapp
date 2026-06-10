import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PropertyStackParamList } from '../../navigation/PropertyStackNavigator';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { fetchProperties } from '../../redux/slices/propertySlice';
import { PropertyType, PropertyFilter } from '../../types/property';
import { PropertySearchFilters } from '../../components/property';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';
import SearchBar from '../../components/common/SearchBar';
import { useColorScheme } from 'react-native';

type PropertySearchNavigationProp = StackNavigationProp<PropertyStackParamList, 'PropertySearch'>;

export default function PropertySearchScreen() {
  const navigation = useNavigation<PropertySearchNavigationProp>();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector(state => state.property);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const { isTablet, width } = getDynamicDimensions();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<PropertyType | ''>('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [location, setLocation] = useState('');
  const [bedrooms, setBedrooms] = useState<string>('');
  const [bathrooms, setBathrooms] = useState<string>('');

  // Theme colors
  const colors = {
    background: isDark ? '#0F172A' : '#F8FAFC',
    surface: isDark ? '#1E293B' : '#FFFFFF',
    surfaceSecondary: isDark ? '#334155' : '#F1F5F9',
    border: isDark ? '#475569' : '#E2E8F0',
    borderFocused: isDark ? '#60A5FA' : '#3B82F6',
    text: isDark ? '#F1F5F9' : '#0F172A',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    textTertiary: isDark ? '#64748B' : '#94A3B8',
    primary: isDark ? '#60A5FA' : '#3B82F6',
    primaryDark: isDark ? '#3B82F6' : '#1E40AF',
    success: isDark ? '#10B981' : '#059669',
    shadow: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(15, 23, 42, 0.08)',
  };

  const propertyTypes: PropertyType[] = [
    'houses', 'apartments', 'one_bedroom', 'two_bedroom', 'three_bedroom',
    'bedsitters', 'commercial', 'industrial', 'offices', 'land_plots'
  ];

  const bedroomOptions = ['1', '2', '3', '4', '5+'];
  const bathroomOptions = ['1', '2', '3', '4+'];

  const handleSearch = async () => {
    // Validate inputs
    if (!searchQuery.trim() && !location.trim() && !selectedType && !priceRange.min && !priceRange.max) {
      Alert.alert('Search Required', 'Please enter search criteria to find properties.');
      return;
    }

    const filters: any = {
      searchText: searchQuery.trim() || location.trim(),
      propertyType: selectedType || undefined,
      minPrice: priceRange.min ? parseInt(priceRange.min) : undefined,
      maxPrice: priceRange.max ? parseInt(priceRange.max) : undefined,
      bedrooms: bedrooms ? (bedrooms === '5+' ? 5 : parseInt(bedrooms)) : undefined,
      bathrooms: bathrooms ? (bathrooms === '4+' ? 4 : parseInt(bathrooms)) : undefined
    };

    try {
      const searchQuery = {
        search_text: filters.searchText,
        filters: {
          property_type: filters.propertyType,
          min_price: filters.minPrice,
          max_price: filters.maxPrice,
          bedrooms: filters.bedrooms,
          bathrooms: filters.bathrooms
        },
        sort_by: 'date_newest' as const,
        page: 1,
        limit: 20
      };
      await dispatch(fetchProperties(searchQuery)).unwrap();
      navigation.navigate('PropertySearchResults', { searchQuery: filters });
    } catch (error) {
      
      Alert.alert('Search Error', 'Failed to search properties. Please try again.');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType('');
    setPriceRange({ min: '', max: '' });
    setLocation('');
    setBedrooms('');
    setBathrooms('');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            accessibilityHint="Navigate to previous screen"
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Find Property</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Use filters to find your perfect property
            </Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.content}>
          {/* Search Query */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}
              accessibilityRole="text">
              Search
            </Text>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Property features, amenities, descriptions..."
              accessibilityLabel="Property search input"
              accessibilityHint="Enter keywords to search for properties"
              testID="property-search-input"
              variant="filled"
              size="medium"
              containerStyle={{ backgroundColor: colors.surface }}
            />
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}
              accessibilityRole="text">
              Location
            </Text>
            <SearchBar
              value={location}
              onChangeText={setLocation}
              placeholder="City, neighborhood, area..."
              leftIcon="location-on"
              accessibilityLabel="Location search input"
              accessibilityHint="Enter location to search for properties"
              testID="location-search-input"
              variant="filled"
              size="medium"
              containerStyle={{ backgroundColor: colors.surface }}
            />
          </View>

          {/* Property Type */}
          <View style={styles.section}
            accessibilityRole="radiogroup"
            accessibilityLabel="Property type selection">
            <Text style={[styles.sectionLabel, { color: colors.text }]}
              accessibilityRole="text">
              Property Type
            </Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={{ paddingHorizontal: spacing.xs }}
              accessible={false}
            >
              <View style={styles.buttonRow}>
                {propertyTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setSelectedType(selectedType === type ? '' : type)}
                    style={[
                      styles.filterButton,
                      selectedType === type 
                        ? [styles.filterButtonSelected, { backgroundColor: colors.primary, borderColor: colors.primary }]
                        : [styles.filterButtonDefault, { backgroundColor: colors.surface, borderColor: colors.border }]
                    ]}
                    accessibilityRole="radio"
                    accessibilityLabel={`${type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} property type`}
                    accessibilityState={{ selected: selectedType === type }}
                    accessibilityHint="Tap to select this property type"
                  >
                    <Text style={[
                      styles.filterButtonText,
                      selectedType === type 
                        ? { color: '#FFFFFF' }
                        : { color: colors.text }
                    ]}>
                      {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Price Range */}
          <View style={styles.section}
            accessible={true}
            accessibilityLabel="Price range selection">
            <Text style={[styles.sectionLabel, { color: colors.text }]}
              accessibilityRole="text">
              Price Range (KSH)
            </Text>
            <View style={styles.priceRangeContainer}>
              <View style={styles.priceInputContainer}>
                <SearchBar
                  value={priceRange.min}
                  onChangeText={(text) => setPriceRange(prev => ({ ...prev, min: text.replace(/[^0-9]/g, '') }))}
                  placeholder="Min price"
                  leftIcon="money"
                  accessibilityLabel="Minimum price input"
                  accessibilityHint="Enter the minimum price for properties"
                  testID="min-price-input"
                  variant="outlined"
                  size="medium"
                  showSearchIcon={false}
                  containerStyle={{ backgroundColor: colors.surface, borderColor: colors.border }}
                />
              </View>
              <View style={styles.priceRangeSeparator}>
                <Text style={[styles.priceRangeText, { color: colors.textSecondary }]}>to</Text>
              </View>
              <View style={styles.priceInputContainer}>
                <SearchBar
                  value={priceRange.max}
                  onChangeText={(text) => setPriceRange(prev => ({ ...prev, max: text.replace(/[^0-9]/g, '') }))}
                  placeholder="Max price"
                  leftIcon="money"
                  accessibilityLabel="Maximum price input"
                  accessibilityHint="Enter the maximum price for properties"
                  testID="max-price-input"
                  variant="outlined"
                  size="medium"
                  showSearchIcon={false}
                  containerStyle={{ backgroundColor: colors.surface, borderColor: colors.border }}
                />
              </View>
            </View>
          </View>

          {/* Bedrooms */}
          <View style={styles.section}
            accessibilityRole="radiogroup"
            accessibilityLabel="Bedroom count selection">
            <Text style={[styles.sectionLabel, { color: colors.text }]}
              accessibilityRole="text">
              Bedrooms
            </Text>
            <View style={styles.buttonRow}>
              {bedroomOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  onPress={() => setBedrooms(bedrooms === option ? '' : option)}
                  style={[
                    styles.filterButton,
                    bedrooms === option 
                      ? [styles.filterButtonSelected, { backgroundColor: colors.primary, borderColor: colors.primary }]
                      : [styles.filterButtonDefault, { backgroundColor: colors.surface, borderColor: colors.border }]
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={`${option} bedrooms`}
                  accessibilityState={{ selected: bedrooms === option }}
                  accessibilityHint="Tap to select number of bedrooms"
                >
                  <Text style={[
                    styles.filterButtonText,
                    bedrooms === option 
                      ? { color: '#FFFFFF' }
                      : { color: colors.text }
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bathrooms */}
          <View style={styles.section}
            accessibilityRole="radiogroup"
            accessibilityLabel="Bathroom count selection">
            <Text style={[styles.sectionLabel, { color: colors.text }]}
              accessibilityRole="text">
              Bathrooms
            </Text>
            <View style={styles.buttonRow}>
              {bathroomOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  onPress={() => setBathrooms(bathrooms === option ? '' : option)}
                  style={[
                    styles.filterButton,
                    bathrooms === option 
                      ? [styles.filterButtonSelected, { backgroundColor: colors.primary, borderColor: colors.primary }]
                      : [styles.filterButtonDefault, { backgroundColor: colors.surface, borderColor: colors.border }]
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={`${option} bathrooms`}
                  accessibilityState={{ selected: bathrooms === option }}
                  accessibilityHint="Tap to select number of bathrooms"
                >
                  <Text style={[
                    styles.filterButtonText,
                    bathrooms === option 
                      ? { color: '#FFFFFF' }
                      : { color: colors.text }
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actionContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.actionButtonRow}>
          <TouchableOpacity
            onPress={clearFilters}
            style={[styles.clearButton, { backgroundColor: colors.surfaceSecondary, marginRight: spacing.sm }]}
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
            accessibilityHint="Tap to reset all search filters"
          >
            <MaterialIcons name="clear-all" size={20} color={colors.textSecondary} style={{ marginRight: spacing.xs }} />
            <Text style={[styles.clearButtonText, { color: colors.text }]}>Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSearch}
            disabled={isLoading}
            style={[
              styles.searchButton,
              isLoading 
                ? [styles.searchButtonDisabled, { backgroundColor: colors.textTertiary }]
                : [styles.searchButtonEnabled, { backgroundColor: colors.primary }]
            ]}
            accessibilityRole="button"
            accessibilityLabel={isLoading ? 'Searching properties' : 'Search properties'}
            accessibilityHint="Tap to search for properties with current filters"
            accessibilityState={{ disabled: isLoading }}
          >
            {!isLoading && (
              <MaterialIcons name="search" size={20} color="#FFFFFF" style={{ marginRight: spacing.xs }} />
            )}
            <Text style={[styles.searchButtonText, { color: '#FFFFFF' }]}>
              {isLoading ? 'Searching...' : 'Search Properties'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  filterButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: spacing.xs,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtonDefault: {
    // Dynamic colors applied inline
  },
  filterButtonSelected: {
    // Dynamic colors applied inline
  },
  filterButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInputContainer: {
    flex: 1,
  },
  priceRangeSeparator: {
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceRangeText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  actionContainer: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  actionButtonRow: {
    flexDirection: 'row',
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  clearButtonText: {
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  searchButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  searchButtonEnabled: {
    // Dynamic colors applied inline
  },
  searchButtonDisabled: {
    // Dynamic colors applied inline
  },
  searchButtonText: {
    fontSize: fontSize.base,
    fontWeight: '700',
  },
});

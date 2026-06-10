import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Using View as placeholder for slider until proper dependency is added

interface SearchFilters {
  ageRange: { min: number; max: number };
  location: string;
  interests: string[];
  verified: boolean;
  isOnline: boolean;
}

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onFiltersChange?: (filters: SearchFilters) => void;
  placeholder?: string;
  showFilters?: boolean;
}

const LOCATIONS = [
  'Nairobi',
  'Westlands',
  'Kilimani',
  'Karen',
  'Lavington',
  'Parklands',
  'Kileleshwa',
  'Runda',
  'Muthaiga',
  'Gigiri',
];

const INTERESTS = [
  'Travel', 'Music', 'Fitness', 'Cooking', 'Movies', 'Reading',
  'Photography', 'Dancing', 'Sports', 'Art', 'Technology', 'Fashion',
  'Gaming', 'Yoga', 'Hiking', 'Wine', 'Coffee', 'Beach', 'Nature',
];

export default function SearchBar({
  value,
  onChangeText,
  onFiltersChange,
  placeholder = "Search profiles...",
  showFilters = true,
}: SearchBarProps) {
  const insets = useSafeAreaInsets();
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    ageRange: { min: 18, max: 50 },
    location: '',
    interests: [],
    verified: false,
    isOnline: false,
  });

  const handleFilterChange = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  }, [onFiltersChange]);

  const toggleInterest = (interest: string) => {
    const newInterests = filters.interests.includes(interest)
      ? filters.interests.filter(i => i !== interest)
      : [...filters.interests, interest];
    
    handleFilterChange({
      ...filters,
      interests: newInterests,
    });
  };

  const clearFilters = () => {
    const defaultFilters: SearchFilters = {
      ageRange: { min: 18, max: 50 },
      location: '',
      interests: [],
      verified: false,
      isOnline: false,
    };
    handleFilterChange(defaultFilters);
  };

  const activeFilterCount = () => {
    let count = 0;
    if (filters.ageRange.min !== 18 || filters.ageRange.max !== 50) count++;
    if (filters.location) count++;
    if (filters.interests.length > 0) count++;
    if (filters.verified) count++;
    if (filters.isOnline) count++;
    return count;
  };

  return (
    <>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="rgba(255,255,255,0.6)"
            style={styles.searchInput}
          />
          {value.length > 0 && (
            <TouchableOpacity
              onPress={() => onChangeText('')}
              style={styles.clearButton}
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
          {showFilters && (
            <TouchableOpacity
              onPress={() => setShowFilterModal(true)}
              style={styles.filterButton}
            >
              <Text style={styles.filterIcon}>⚙️</Text>
              {activeFilterCount() > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount()}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingTop: insets.top + 20 }]}>
            <LinearGradient
              colors={['#6B46C1', '#553C9A']}
              style={StyleSheet.absoluteFillObject}
            />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Filters</Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.filtersList}
              contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Age Range */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Age Range</Text>
                <View style={styles.ageRangeContainer}>
                  <Text style={styles.ageRangeText}>
                    {filters.ageRange.min} - {filters.ageRange.max} years
                  </Text>
                  <View style={styles.sliderContainer}>
                    <Text style={styles.sliderLabel}>Min: {filters.ageRange.min}</Text>
                    <View style={styles.slider}>
                      <Text style={{ color: '#FFFFFF', textAlign: 'center' }}>
                        Min Age: {filters.ageRange.min}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.sliderContainer}>
                    <Text style={styles.sliderLabel}>Max: {filters.ageRange.max}</Text>
                    <View style={styles.slider}>
                      <Text style={{ color: '#FFFFFF', textAlign: 'center' }}>
                        Max Age: {filters.ageRange.max}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Location */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Location</Text>
                <View style={styles.locationGrid}>
                  {LOCATIONS.map((loc) => (
                    <TouchableOpacity
                      key={loc}
                      onPress={() =>
                        handleFilterChange({
                          ...filters,
                          location: filters.location === loc ? '' : loc,
                        })
                      }
                      style={[
                        styles.locationChip,
                        filters.location === loc && styles.locationChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.locationChipText,
                          filters.location === loc && styles.locationChipTextActive,
                        ]}
                      >
                        {loc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Interests */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  Interests ({filters.interests.length} selected)
                </Text>
                <View style={styles.interestsGrid}>
                  {INTERESTS.map((interest) => (
                    <TouchableOpacity
                      key={interest}
                      onPress={() => toggleInterest(interest)}
                      style={[
                        styles.interestChip,
                        filters.interests.includes(interest) && styles.interestChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.interestChipText,
                          filters.interests.includes(interest) && styles.interestChipTextActive,
                        ]}
                      >
                        {interest}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Toggles */}
              <View style={styles.filterSection}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Verified Profiles Only</Text>
                  <Switch
                    value={filters.verified}
                    onValueChange={(val) =>
                      handleFilterChange({ ...filters, verified: val })
                    }
                    trackColor={{ false: 'rgba(255,255,255,0.3)', true: '#10B981' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Active recently</Text>
                  <Switch
                    value={filters.isOnline}
                    onValueChange={(val) =>
                      handleFilterChange({ ...filters, isOnline: val })
                    }
                    trackColor={{ false: 'rgba(255,255,255,0.3)', true: '#10B981' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={clearFilters}
                  style={[styles.actionButton, styles.clearFiltersButton]}
                >
                  <Text style={styles.clearFiltersButtonText}>Clear All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowFilterModal(false)}
                  style={[styles.actionButton, styles.applyButton]}
                >
                  <Text style={styles.applyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
    opacity: 0.8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  filterButton: {
    padding: 4,
    marginLeft: 8,
    position: 'relative',
  },
  filterIcon: {
    fontSize: 20,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  filtersList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginTop: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  ageRangeContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
  },
  ageRangeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  sliderContainer: {
    marginVertical: 8,
  },
  sliderLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  locationChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  locationChipActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  locationChipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  locationChipTextActive: {
    color: '#6B46C1',
    fontWeight: '600',
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  interestChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  interestChipActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  interestChipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  interestChipTextActive: {
    color: '#6B46C1',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  toggleLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearFiltersButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginRight: 8,
  },
  clearFiltersButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#FFFFFF',
    marginLeft: 8,
  },
  applyButtonText: {
    color: '#6B46C1',
    fontSize: 16,
    fontWeight: '600',
  },
});

/**
 * UniversalSearchScreen
 * Demonstrates the unified search functionality across all modules
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  performUniversalSearch,
  loadMoreSearchResults,
  setActiveModule,
  clearSearchResults
} from '../../redux/slices/searchSlice';
import {
  UniversalSearch,
  UniversalFilters,
  SearchResults
} from '../../components/common';
import {
  ModuleType,
  UniversalSearchQuery,
  SearchResult,
  UniversalSearchFilters
} from '../../types/search';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';

// Import stack param lists for proper navigation typing
type MainTabParamList = {
  Property: undefined;
  Jobs: undefined;
  Services: undefined;
  DateMi: undefined;
  Profile: undefined;
};

type PropertyStackParamList = {
  PropertyDetails: { propertyId: string; property?: any };
};

type JobsStackParamList = {
  JobDetails: { jobId: string };
};

type ServicesStackParamList = {
  ServiceDetails: { serviceId: string };
};


type UniversalSearchNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  CompositeNavigationProp<
    StackNavigationProp<PropertyStackParamList>,
    CompositeNavigationProp<
      StackNavigationProp<JobsStackParamList>,
      CompositeNavigationProp<
        StackNavigationProp<ServicesStackParamList>,
        StackNavigationProp<ServicesStackParamList>
      >
    >
  >
>;

const modules: { key: ModuleType; label: string; icon: string; colors: [string, string] }[] = [
  { key: 'property', label: 'Property', icon: 'home', colors: ['#0D9488', '#0F766E'] },
  { key: 'jobs', label: 'Jobs', icon: 'work', colors: ['#7C3AED', '#5B21B6'] },
  { key: 'services', label: 'Services', icon: 'build', colors: ['#DC2626', '#B91C1C'] },
  { key: 'datemi', label: 'DateMi', icon: 'favorite', colors: ['#DB2777', '#BE185D'] }
];

// Helper component to render MaterialIcons
const ModuleIcon = ({ iconName, size = 20, color = '#fff' }: { iconName: string; size?: number; color?: string }) => {
  return <MaterialIcons name={iconName as any} size={size} color={color} />;
};

export default function UniversalSearchScreen() {
  const navigation = useNavigation<UniversalSearchNavigationProp>();
  const dispatch = useAppDispatch();
  
  const {
    activeModule,
    searchResults,
    isSearching,
    isLoadingMore,
    error
  } = useAppSelector(state => state.search);
  
  const { width, isTablet } = getDynamicDimensions();
  
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<UniversalSearchFilters>({});
  
  useEffect(() => {
    // Clear search results when component mounts
    dispatch(clearSearchResults());
  }, []);
  
  const handleModuleSelect = (module: ModuleType) => {
    dispatch(setActiveModule(module));
    dispatch(clearSearchResults());
    setCurrentFilters({});
  };
  
  const handleSearch = async (query: UniversalSearchQuery) => {
    try {
      await dispatch(performUniversalSearch({
        ...query,
        filters: { ...query.filters, ...currentFilters }
      })).unwrap();
      setShowSearch(false);
    } catch (error: any) {
      Alert.alert('Search Error', error.message || 'Failed to perform search');
    }
  };
  
  const handleResultPress = (result: SearchResult) => {
    Alert.alert(
      'Result Selected',
      `Selected: ${result.title}\nModule: ${result.module}\nID: ${result.id}`,
      [
        { text: 'OK' },
        {
          text: 'View Details',
          onPress: () => {
            // Navigate to appropriate detail screen based on module
            if (activeModule === 'property') {
              navigation.navigate('PropertyDetails', { propertyId: result.id });
            } else if (activeModule === 'jobs') {
              navigation.navigate('JobDetails', { jobId: result.id });
            } else if (activeModule === 'services') {
              navigation.navigate('ServiceDetails', { serviceId: result.id });
            }
          }
        }
      ]
    );
  };
  
  const handleRefresh = () => {
    if (searchResults) {
      // Re-run the last search
      const lastQuery = {
        searchText: '', // You'd store this in state
        module: activeModule,
        filters: currentFilters,
        page: 1,
        limit: 20
      };
      dispatch(performUniversalSearch(lastQuery));
    }
  };
  
  const handleLoadMore = () => {
    if (searchResults?.pagination.hasMore && !isLoadingMore) {
      dispatch(loadMoreSearchResults());
    }
  };
  
  const handleApplyFilters = (filters: UniversalSearchFilters) => {
    setCurrentFilters(filters);
    setShowFilters(false);
    
    // If there are search results, re-run search with new filters
    if (searchResults) {
      const searchQuery = {
        searchText: '', // You'd get this from current search state
        module: activeModule,
        filters,
        page: 1,
        limit: 20
      };
      dispatch(performUniversalSearch(searchQuery));
    }
  };
  
  const handleClearFilters = () => {
    setCurrentFilters({});
  };
  
  const activeModuleData = modules.find(m => m.key === activeModule) || modules[0];
  
  return (
    <SafeAreaView style={styles.style1}>
      {/* Header */}
      <LinearGradient
        colors={activeModuleData.colors}
        style={styles.style2}
      >
        <View style={styles.style3}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.style5}>Universal Search</Text>
          <View style={styles.style6} />
        </View>
        
        <Text style={styles.style7}>
          Search across all modules with advanced filtering
        </Text>
      </LinearGradient>

      {/* Module Selection */}
      <View style={styles.style8}>
        <Text style={styles.style9}>Select Module</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 4 }}
        >
          {modules.map((module) => (
            <TouchableOpacity
              key={module.key}
              onPress={() => handleModuleSelect(module.key)}
              style={[
                styles.moduleButton,
                {
                  borderColor: activeModule === module.key ? module.colors[0] : '#E5E7EB',
                  backgroundColor: activeModule === module.key ? `${module.colors[0]}20` : '#FFFFFF'
                }
              ]}
            >
              <ModuleIcon iconName={module.icon} size={20} color={activeModule === module.key ? module.colors[0] : '#6B7280'} />
              <Text style={[
                styles.moduleText,
                {
                  color: activeModule === module.key ? module.colors[0] : '#374151'
                }
              ]}>
                {module.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search Actions */}
      <View style={styles.style8}>
        <View style={styles.style11}>
          <TouchableOpacity
            onPress={() => setShowSearch(true)}
            style={[styles.style12, { backgroundColor: activeModuleData.colors[0] }]}
          >
            <MaterialIcons name="search" size={20} color="#FFFFFF" />
            <Text style={styles.style14}>
              Search {activeModuleData.label}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setShowFilters(true)}
            style={styles.style15}
          >
            <MaterialIcons name="tune" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        {/* Active Filters Indicator */}
        {Object.keys(currentFilters).length > 0 && (
          <View style={styles.style17}>
            <Text style={styles.style18}>Active filters:</Text>
            <View style={styles.style19}>
              <Text style={styles.style20}>
                {Object.keys(currentFilters).length} applied
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClearFilters}
              style={styles.style21}
            >
              <Text style={styles.style22}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Search Results or Empty State */}
      <View style={styles.style23}>
        {searchResults ? (
          <SearchResults
            searchResponse={searchResults}
            module={activeModule}
            onResultPress={handleResultPress}
            onRefresh={handleRefresh}
            onLoadMore={handleLoadMore}
            isLoading={isSearching}
            isRefreshing={false}
          />
        ) : (
          <View style={styles.style24}>
            <ModuleIcon iconName={activeModuleData.icon} size={48} color={activeModuleData.colors[0]} />
            <Text style={styles.style26}>
              Search {activeModuleData.label}
            </Text>
            <Text style={styles.style27}>
              Use the search button above to find exactly what you're looking for across our platform.
            </Text>
            
            <TouchableOpacity
              onPress={() => setShowSearch(true)}
              style={[styles.style28, { backgroundColor: activeModuleData.colors[0] }]}
            >
              <Text style={styles.style14}>Start Searching</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Error Display */}
      {error && (
        <View style={styles.style29}>
          <Text style={styles.style30}>{error}</Text>
        </View>
      )}
      
      {/* Demo Info */}
      <View style={styles.style31}>
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
          <MaterialIcons name="construction" size={16} color="#F59E0B" style={{marginRight: 8}} />
          <Text style={styles.style32}>
            Demo Mode: Search functionality includes sample data for all modules
          </Text>
        </View>
      </View>

      {/* Search Modal */}
      {showSearch && (
        <UniversalSearch
          module={activeModule}
          onSearch={handleSearch}
          onClose={() => setShowSearch(false)}
          placeholder={`Search ${activeModuleData.label.toLowerCase()}...`}
          autoFocus={true}
        />
      )}

      {/* Filters Modal */}
      <UniversalFilters
        visible={showFilters}
        module={activeModule}
        filters={currentFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  style1: {
  'flex': 1,
  'backgroundColor': '#F9FAFB'
},
  style2: {
  'paddingHorizontal': 24,
  'paddingVertical': 24
},
  style3: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'marginBottom': 16
},
  style4: {
  'color': '#FFFFFF',
  'fontSize': 18
},
  style5: {
  'color': '#FFFFFF',
  'fontSize': 20,
  'fontWeight': '700'
},
  style6: {
  'width': 24
},
  style7: {
  'color': '#FFFFFF',
  'textAlign': 'center',
  'fontSize': 14
},
  style8: {
  'backgroundColor': '#FFFFFF',
  'paddingHorizontal': 16,
  'paddingVertical': 16,
  'borderBottomWidth': 1,
  'borderColor': '#E5E7EB'
},
  style9: {
  'color': '#374151',
  'fontWeight': '600',
  'marginBottom': 12
},
  style10: {
  'fontSize': 24,
  'marginBottom': 4
},
  style11: {
  'flexDirection': 'row'
},
  style12: {
  'flex': 1,
  'paddingVertical': 16,
  'borderRadius': 8,
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'center'
},
  style13: {
  'color': '#FFFFFF',
  'marginRight': 8
},
  style14: {
  'color': '#FFFFFF',
  'fontWeight': '600'
},
  style15: {
  'paddingHorizontal': 16,
  'paddingVertical': 16,
  'borderRadius': 8,
  'borderWidth': 1,
  'borderColor': '#D1D5DB',
  'backgroundColor': '#FFFFFF',
  'alignItems': 'center',
  'justifyContent': 'center'
},
  style16: {
  'color': '#374151',
  'fontSize': 18
},
  style17: {
  'marginTop': 12,
  'flexDirection': 'row',
  'alignItems': 'center'
},
  style18: {
  'color': '#4B5563',
  'fontSize': 14,
  'marginRight': 8
},
  style19: {
  'backgroundColor': '#DBEAFE',
  'paddingHorizontal': 8,
  'paddingVertical': 4,
  'borderRadius': 9999
},
  style20: {
  'fontSize': 12,
  'fontWeight': '500'
},
  style21: {
  'marginLeft': 8,
  'paddingHorizontal': 8,
  'paddingVertical': 4
},
  style22: {
  'color': '#2563EB',
  'fontSize': 12
},
  style23: {
  'flex': 1
},
  style24: {
  'flex': 1,
  'alignItems': 'center',
  'justifyContent': 'center'
},
  style25: {
  'marginBottom': 24
},
  style26: {
  'color': '#374151',
  'fontWeight': '600',
  'fontSize': 20,
  'marginBottom': 8,
  'textAlign': 'center'
},
  style27: {
  'color': '#6B7280',
  'textAlign': 'center',
  'marginBottom': 24
},
  style28: {
  'paddingHorizontal': 24,
  'paddingVertical': 12,
  'borderRadius': 8
},
  style29: {
  'backgroundColor': '#FEF2F2',
  'borderTopWidth': 1,
  'borderColor': '#FECACA',
  'paddingHorizontal': 16,
  'paddingVertical': 12
},
  style30: {
  'fontSize': 14
},
  style31: {
  'backgroundColor': '#EFF6FF',
  'borderTopWidth': 1,
  'borderColor': '#BFDBFE',
  'paddingHorizontal': 16,
  'paddingVertical': 12
},
  style32: {
  'fontSize': 12,
  'textAlign': 'center'
},
  moduleButton: {
    marginRight: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 96,
    alignItems: 'center'
  },
  moduleText: {
    fontWeight: '600',
    fontSize: 14,
    marginTop: 4
  }
});

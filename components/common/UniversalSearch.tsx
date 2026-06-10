/**
 * UniversalSearch Component
 * Material 3 compliant unified search for all modules
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Animated,
  Keyboard,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import SkeletonLoader from './SkeletonLoader';
import {
  ModuleType,
  UniversalSearchQuery,
  SearchSuggestion
} from '../../types/search';
import { universalSearchService } from '../../services/universalSearchService';
import { useSearchDebounce } from '../../hooks/useDebounce';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';

interface UniversalSearchProps {
  module: ModuleType;
  onSearch: (query: UniversalSearchQuery) => void;
  onClose?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  showRecentSearches?: boolean;
  initialQuery?: string;
  style?: any;
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

const getModuleIcon = (module: ModuleType): string => {
  switch (module) {
    case 'property': return '🏠';
    case 'jobs': return '💼';
    case 'services': return '🔧';
    case 'datemi': return '💕';
    default: return '🔍';
  }
};

const UniversalSearch: React.FC<UniversalSearchProps> = ({
  module,
  onSearch,
  onClose,
  placeholder,
  autoFocus = false,
  showRecentSearches = true,
  initialQuery = '',
  style
}) => {
  const { width, height, isTablet } = getDynamicDimensions();
  const [searchText, setSearchText] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isSubmittingSearch, setIsSubmittingSearch] = useState(false);
  
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const isMountedRef = useRef(true);
  const suggestionsRequestId = useRef(0);
  
  const { debouncedSearchTerm: debouncedSearchText } = useSearchDebounce(searchText, 300);
  const moduleColors = getModuleColor(module);
  const moduleIcon = getModuleIcon(module);

  useEffect(() => {
    isMountedRef.current = true;
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      })
    ]).start();

    if (autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (debouncedSearchText.length > 0) {
      fetchSuggestions(debouncedSearchText);
    } else {
      // Cancel any in-flight suggestion request and reset state quickly
      suggestionsRequestId.current += 1;
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoadingSuggestions(false);
    }
  }, [debouncedSearchText]);

  const fetchSuggestions = async (query: string) => {
    const requestId = (suggestionsRequestId.current += 1);
    try {
      setIsLoadingSuggestions(true);
      const suggestionResults = await universalSearchService.getSearchSuggestions(
        query,
        module,
        8
      );

      if (!isMountedRef.current || suggestionsRequestId.current !== requestId) return;
      setSuggestions(suggestionResults);
      setShowSuggestions(true);
    } catch (error) {
      if (!isMountedRef.current || suggestionsRequestId.current !== requestId) return;
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      if (!isMountedRef.current || suggestionsRequestId.current !== requestId) return;
      setIsLoadingSuggestions(false);
    }
  };

  const handleSearch = async (query?: string) => {
    const finalQuery = query || searchText;
    if (!finalQuery.trim()) return;
    
    const searchQuery: UniversalSearchQuery = {
      searchText: finalQuery.trim(),
      module,
      modules: [module],
      filters: {},
      page: 1,
      limit: 20
    };
    
    // Provide immediate feedback and prevent double-submits
    if (isSubmittingSearch) return;
    setIsSubmittingSearch(true);

    try {
      await Promise.resolve(onSearch(searchQuery));
      if (!isMountedRef.current) return;
      setShowSuggestions(false);
      Keyboard.dismiss();
    } finally {
      if (!isMountedRef.current) return;
      setIsSubmittingSearch(false);
    }
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    setSearchText(suggestion.text);
    void handleSearch(suggestion.text);
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      onClose?.();
    });
  };

  const renderSuggestion = ({ item }: { item: SearchSuggestion }) => {
    const getSuggestionIcon = () => {
      switch (item.type) {
        case 'recent': return '🕒';
        case 'trending': return '🔥';
        case 'autocomplete': return '🔍';
        default: return '💡';
      }
    };

    return (
      <TouchableOpacity
        onPress={() => handleSuggestionPress(item)}
        style={styles.suggestionItem}
        activeOpacity={0.7}
      >
        <View style={styles.suggestionIcon}>
          <Text style={styles.suggestionIconText}>{getSuggestionIcon()}</Text>
        </View>
        
        <View style={styles.suggestionContent}>
          <Text style={styles.suggestionText}>
            {item.text}
          </Text>
          {item.type === 'recent' && (
            <Text style={styles.suggestionSubtext}>
              Recent search
            </Text>
          )}
          {item.count && (
            <Text style={styles.suggestionSubtext}>
              {item.count.toLocaleString()} results
            </Text>
          )}
        </View>
        
        <TouchableOpacity
          onPress={() => {
            setSearchText(item.text);
          }}
          style={styles.suggestionAction}
        >
          <Text style={styles.suggestionActionText}>↖</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={true}
      animationType="none"
      transparent={true}
      statusBarTranslucent
    >
      <Animated.View 
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        >
          <SafeAreaView style={styles.container}>
            {/* Search Container */}
            <Animated.View
              style={[
                styles.searchContainer,
                {
                  maxHeight: height * 0.8
                },
                style
              ]}
            >
              {/* Search Header */}
              <LinearGradient
                colors={moduleColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.searchHeader}
              >
                <View style={styles.searchHeaderContent}>
                  <TouchableOpacity
                    onPress={handleClose}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>←</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.searchInputContainer}>
                    <Text style={styles.moduleIconText}>{moduleIcon}</Text>
                    <TextInput
                      ref={inputRef}
                      value={searchText}
                      onChangeText={setSearchText}
                      onSubmitEditing={() => void handleSearch()}
                      placeholder={placeholder || `Search ${module}...`}
                      placeholderTextColor="rgba(255,255,255,0.7)"
                      style={styles.searchInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="search"
                      editable={!isSubmittingSearch}
                    />
                    
                    {(isLoadingSuggestions || isSubmittingSearch) && (
                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                        style={{ marginRight: 8 }}
                      />
                    )}
                    
                    {searchText.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setSearchText('')}
                        style={styles.clearButton}
                        disabled={isSubmittingSearch}
                      >
                        <Text style={styles.clearButtonText}>×</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <TouchableOpacity
                    onPress={() => void handleSearch()}
                    disabled={!searchText.trim() || isSubmittingSearch}
                    style={[
                      styles.searchButton,
                      (!searchText.trim() || isSubmittingSearch) && styles.searchButtonDisabled
                    ]}
                  >
                    {isSubmittingSearch ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={[
                        styles.searchButtonText,
                        !searchText.trim() && styles.searchButtonTextDisabled
                      ]}>🔍</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              {/* Search Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <View style={styles.suggestionsHeader}>
                    <Text style={styles.suggestionsHeaderText}>
                      Search Suggestions
                    </Text>
                  </View>
                  
                  <FlatList
                    data={suggestions}
                    keyExtractor={(item, index) => `${item.text}-${index}`}
                    renderItem={renderSuggestion}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  />
                </View>
              )}

              {/* Suggestion loading skeleton (avoid blank states while typing) */}
              {isLoadingSuggestions && suggestions.length === 0 && debouncedSearchText.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <View style={styles.suggestionsHeader}>
                    <SkeletonLoader width="45%" height={14} borderRadius={4} />
                  </View>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <View key={`suggestion-skeleton-${index}`} style={styles.suggestionItem}>
                      <SkeletonLoader
                        width={32}
                        height={32}
                        borderRadius={16}
                        style={{ marginRight: 12 }}
                      />
                      <View style={{ flex: 1 }}>
                        <SkeletonLoader
                          width={index % 2 === 0 ? '72%' : '86%'}
                          height={16}
                          borderRadius={4}
                          style={{ marginBottom: 6 }}
                        />
                        <SkeletonLoader width="40%" height={12} borderRadius={4} />
                      </View>
                      <SkeletonLoader width={20} height={20} borderRadius={10} />
                    </View>
                  ))}
                </View>
              )}

              {/* Empty State */}
              {!showSuggestions && !isLoadingSuggestions && searchText.length === 0 && showRecentSearches && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>{moduleIcon}</Text>
                  <Text style={styles.emptyStateTitle}>
                    Search {module.charAt(0).toUpperCase() + module.slice(1)}
                  </Text>
                  <Text style={styles.emptyStateText}>
                    Find exactly what you're looking for with our powerful search
                  </Text>
                </View>
              )}

              {/* Quick Actions */}
              {!showSuggestions && searchText.length === 0 && (
                <View style={styles.quickActions}>
                  <Text style={styles.quickActionsTitle}>
                    Quick Actions
                  </Text>
                  
                  <View style={styles.quickActionsButtons}>
                    {['Popular', 'Recent', 'Nearby', 'Featured'].map((action, index) => (
                      <TouchableOpacity
                        key={action}
                        onPress={() => setSearchText(action.toLowerCase())}
                        style={styles.quickActionButton}
                      >
                        <Text style={styles.quickActionButtonText}>
                          {action}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Search submit feedback (reduces anxiety during network-bound searches) */}
              {isSubmittingSearch && (
                <View style={styles.submittingOverlay} pointerEvents="none">
                  <View style={styles.submittingPill}>
                    <ActivityIndicator size="small" color={moduleColors[0]} />
                    <Text style={styles.submittingText}>Searching…</Text>
                  </View>
                </View>
              )}
            </Animated.View>
          </SafeAreaView>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  searchHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  moduleIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  searchButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  searchButtonTextDisabled: {
    opacity: 0.5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  suggestionIconText: {
    fontSize: 14,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionText: {
    color: '#111827',
    fontWeight: '500',
    fontSize: 16,
  },
  suggestionSubtext: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
  suggestionAction: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionActionText: {
    color: '#9CA3AF',
    fontSize: 18,
  },
  suggestionsContainer: {
    maxHeight: 320,
  },
  suggestionsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  suggestionsHeaderText: {
    color: '#4B5563',
    fontWeight: '500',
    fontSize: 14,
  },
  loadingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 32,
    alignItems: 'center',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
  },
  submittingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: 'center',
  },
  submittingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  submittingText: {
    marginLeft: 8,
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    paddingHorizontal: 16,
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyStateTitle: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 18,
    marginBottom: 8,
  },
  emptyStateText: {
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  quickActions: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  quickActionsTitle: {
    color: '#4B5563',
    fontWeight: '500',
    fontSize: 14,
    marginBottom: 12,
  },
  quickActionsButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quickActionButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  quickActionButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default UniversalSearch;

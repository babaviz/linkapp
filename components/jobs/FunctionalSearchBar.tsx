import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useSearchDebounce } from '../../hooks/useDebounce';
import { spacing, fontSize } from '../../utils/responsive';

interface FunctionalSearchBarProps {
  onSearch: (searchTerm: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  isLoading?: boolean;
  isTablet?: boolean;
}

export const FunctionalSearchBar = React.memo<FunctionalSearchBarProps>(({
  onSearch,
  onFocus,
  onBlur,
  placeholder = "Search jobs, skills, companies...",
  isLoading = false,
  isTablet = false,
}) => {
  const [searchText, setSearchText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const { debouncedSearchTerm, isSearching } = useSearchDebounce(searchText, 300);
  
  // Animation values
  const focusAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Handle debounced search
  React.useEffect(() => {
    if (debouncedSearchTerm) {
      onSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onSearch]);

  // Handle focus animations
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
    
    Animated.parallel([
      Animated.timing(focusAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.spring(pulseAnim, {
        toValue: 1.02,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focusAnim, pulseAnim, onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
    
    Animated.parallel([
      Animated.timing(focusAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.spring(pulseAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focusAnim, pulseAnim, onBlur]);

  const handleClear = useCallback(() => {
    setSearchText('');
    onSearch('');
  }, [onSearch]);

  const handleSubmit = useCallback(() => {
    if (searchText.trim()) {
      onSearch(searchText.trim());
    }
  }, [searchText, onSearch]);

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderWidth: focusAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 2],
          }),
          borderColor: focusAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['rgba(148, 163, 184, 0.2)', 'rgba(59, 130, 246, 0.5)'],
          }),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
          elevation: 10,
          transform: [{ scale: pulseAnim }],
        }
      ]}
    >
      {/* Search Bar Background */}
      <View style={styles.background} />
      
      <View style={[styles.contentRow, { padding: spacing.lg }]}>
        {/* Search Icon Container */}
        <Animated.View 
          style={[
            styles.iconContainer,
            { 
              width: isTablet ? 52 : 44, 
              height: isTablet ? 52 : 44, 
              marginRight: spacing.md,
              backgroundColor: focusAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(59, 130, 246, 0.1)', 'rgba(59, 130, 246, 0.2)'],
              }),
              shadowColor: '#3b82f6',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 4,
            }
          ]}  
        >
          {isSearching || isLoading ? (
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: focusAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              }}
            >
              <Text style={{ fontSize: isTablet ? fontSize.xl : fontSize.lg }}>⏳</Text>
            </Animated.View>
          ) : (
            <Text style={{ fontSize: isTablet ? fontSize.xl : fontSize.lg }}>🔍</Text>
          )}
        </Animated.View>
        
        {/* Search Input */}
        <View style={styles.inputWrapper}>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSubmitEditing={handleSubmit}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            returnKeyType="search"
            style={{ 
              color: '#1e293b', 
              fontWeight: '600', 
              fontSize: isTablet ? fontSize.lg : fontSize.base,
              paddingVertical: 0,
            }}
          />
          
          {/* Real-time feedback */}
          {(isSearching || isLoading) && (
            <Text style={{ 
              color: '#64748b', 
              fontSize: fontSize.xs,
              fontWeight: '500',
              marginTop: 2,
            }}>
              {isSearching ? 'Searching...' : 'Loading results...'}
            </Text>
          )}
          
          {searchText && !isSearching && !isLoading && (
            <Text style={{ 
              color: '#10b981', 
              fontSize: fontSize.xs,
              fontWeight: '500',
              marginTop: 2,
            }}>
              Press enter to search "{searchText}"
            </Text>
          )}
        </View>
        
        {/* Clear Button */}
        {searchText.length > 0 && (
          <TouchableOpacity 
            onPress={handleClear}
            style={{ marginLeft: spacing.sm, padding: spacing.xs }}
            activeOpacity={0.6}
          >
            <Text style={{ color: '#9ca3af', fontSize: fontSize.base }}>✕</Text>
          </TouchableOpacity>
        )}
        
        {/* Search Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!searchText.trim() || isLoading}
          style={{
            marginLeft: spacing.sm,
            opacity: searchText.trim() && !isLoading ? 1 : 0.6,
          }}
        >
          <Animated.View 
            style={[
              styles.searchButton,
              { 
                paddingHorizontal: spacing.lg, 
                paddingVertical: spacing.sm,
                backgroundColor: focusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['rgba(16, 185, 129, 0.8)', 'rgba(16, 185, 129, 1)'],
                }),
                shadowColor: '#10b981',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }
            ]}
          >
            <Text style={{ 
              color: 'white', 
              fontWeight: '700', 
              fontSize: fontSize.sm,
              letterSpacing: 0.5
            }}>
              Search
            </Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    zIndex: 10,
  },
  iconContainer: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
  },
  searchButton: {
    borderRadius: 12,
  },
});

FunctionalSearchBar.displayName = 'FunctionalSearchBar';

export default FunctionalSearchBar;

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../theme/index';
import { colors } from '../../theme';

interface PropertyHeaderProps {
  isDarkMode: boolean;
  currentProfile?: any;
  user?: { fullName?: string; email?: string } | null;
  onBackPress?: () => void;
  onSearchPress: () => void;
  showBackButton?: boolean;
  showCategories?: boolean;
  onCategoryPress?: (category: string, index: number) => void;
  selectedCategory?: number;
}

const PropertyHeader: React.FC<PropertyHeaderProps> = ({
  isDarkMode,
  currentProfile,
  user,
  onBackPress,
  onSearchPress,
  showBackButton = false,
  showCategories = false,
  onCategoryPress,
  selectedCategory = 0,
}) => {
  const categories = ['All', 'Residential', 'Commercial', 'Land'];

  return (
    <View style={{ 
      paddingHorizontal: spacing[4], 
      paddingTop: spacing[3], 
      paddingBottom: spacing[3], 
      backgroundColor: isDarkMode ? colors.secondary[800] : colors.background 
    }}>
      {/* User Greeting Row */}
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: spacing[4]
      }}>
        {showBackButton && (
          <TouchableOpacity 
            onPress={onBackPress} 
            style={{ 
              marginRight: spacing[4],
              padding: spacing[2]
            }}
          >
            <MaterialIcons 
              name="arrow-back" 
              size={24} 
              color={isDarkMode ? colors.text.inverse : colors.text.primary} 
            />
          </TouchableOpacity>
        )}
        
        {/* Greeting */}
        <Text style={{ 
          fontSize: 26, 
          fontWeight: '700', 
          color: isDarkMode ? colors.text.inverse : colors.text.primary,
          letterSpacing: -0.5
        }}>
          Hi, {user?.fullName?.split(' ')[0] || currentProfile?.basicProfile?.first_name || 'Guest'}
        </Text>
      </View>

      {/* Search Bar */}
      <TouchableOpacity 
        onPress={onSearchPress} 
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isDarkMode ? colors.secondary[700] : colors.surface,
          borderRadius: borderRadius.lg,
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[3],
          marginBottom: showCategories ? spacing[3] : 0,
          borderWidth: 1,
          borderColor: isDarkMode ? colors.secondary[600] : colors.border.light
        }}
      >
        <MaterialIcons 
          name="search" 
          size={16} 
          color={isDarkMode ? colors.text.tertiary : colors.text.secondary} 
          style={{ marginRight: spacing[2] }}
        />
        <Text style={{ 
          flex: 1,
          fontSize: 16,
          color: isDarkMode ? colors.text.tertiary : colors.text.secondary
        }}>
          Search properties...
        </Text>
      </TouchableOpacity>

      {/* Category Filter */}
      {showCategories && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: spacing[4] }}
        >
          {categories.map((category, idx) => (
            <TouchableOpacity 
              key={idx}
              onPress={() => onCategoryPress?.(category, idx)}
              style={{ 
                backgroundColor: idx === selectedCategory ? colors.primary : (isDarkMode ? colors.secondary[700] : colors.surface),
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[2],
                borderRadius: borderRadius.full,
                marginRight: spacing[2],
                borderWidth: idx === selectedCategory ? 0 : 1,
                borderColor: isDarkMode ? colors.secondary[600] : colors.border.light
              }}
            >
              <Text style={{ 
                fontSize: 14, 
                color: idx === selectedCategory ? colors.white : (isDarkMode ? colors.text.inverse : colors.text.primary),
                fontWeight: '500'
              }}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default PropertyHeader;

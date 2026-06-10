import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export interface DatingCategory {
  key: string;
  icon: string;
  label: string;
  description: string;
  gradient: [string, string];
  premium?: boolean;
}

interface CategorySelectorProps {
  categories: DatingCategory[];
  selectedCategory: string;
  onCategorySelect: (categoryKey: string) => void;
  layout?: 'grid' | 'list';
  size?: 'small' | 'medium' | 'large';
}

export const DATING_CATEGORIES: DatingCategory[] = [
  {
    key: 'casual_dating',
    icon: '🎉',
    label: 'Short Term Fun',
    description: 'Fun connections, no strings attached',
    gradient: ['#F59E0B', '#D97706']
  },
  {
    key: 'serious_relationships',
    icon: '💕',
    label: 'Long Term Partner',
    description: 'Looking for meaningful long-term partnerships',
    gradient: ['#EF4444', '#DC2626']
  }
];

export default function CategorySelector({
  categories = DATING_CATEGORIES,
  selectedCategory,
  onCategorySelect,
  layout = 'grid',
  size = 'medium'
}: CategorySelectorProps) {

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { width: 60, height: 60, borderRadius: 30, fontSize: 24 };
      case 'large':
        return { width: 80, height: 80, borderRadius: 40, fontSize: 32 };
      default:
        return { width: 70, height: 70, borderRadius: 35, fontSize: 28 };
    }
  };

  const sizeStyles = getSizeStyles();

  if (layout === 'list') {
    return (
      <View style={{ gap: 8 }}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.key}
            onPress={() => onCategorySelect(category.key)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 16,
              padding: 16,
              borderWidth: selectedCategory === category.key ? 2 : 1,
              borderColor: selectedCategory === category.key ? '#FFFFFF' : 'rgba(255,255,255,0.2)'
            }}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <LinearGradient
                colors={selectedCategory === category.key ? category.gradient : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16
                }}
              >
                <Text style={{ fontSize: 24 }}>{category.icon}</Text>
              </LinearGradient>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 16,
                    fontWeight: 'bold',
                    marginRight: 8
                  }}>
                    {category.label}
                  </Text>
                  {category.premium && (
                    <View style={{
                      backgroundColor: '#F59E0B',
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4
                    }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>
                        PREMIUM
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 13,
                  lineHeight: 18
                }}>
                  {category.description}
                </Text>
              </View>
              
              {selectedCategory === category.key && (
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: '#10B981',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>✓</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // Grid layout (default)
  return (
    <View style={{ 
      flexDirection: 'row', 
      flexWrap: 'wrap',
      justifyContent: 'space-around',
      gap: 10
    }}>
      {categories.map((category) => (
        <TouchableOpacity
          key={category.key}
          onPress={() => onCategorySelect(category.key)}
          style={{ alignItems: 'center', position: 'relative', minWidth: 80 }}
          activeOpacity={0.8}
        >
          <View style={{ alignItems: 'center' }}>
            <LinearGradient
              colors={selectedCategory === category.key ? category.gradient : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={{
                width: sizeStyles.width,
                height: sizeStyles.height,
                borderRadius: sizeStyles.borderRadius,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 6,
                borderWidth: selectedCategory === category.key ? 3 : 2,
                borderColor: selectedCategory === category.key ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                position: 'relative'
              }}
            >
              <Text style={{ fontSize: sizeStyles.fontSize }}>{category.icon}</Text>
              
              {/* Premium Badge */}
              {category.premium && (
                <View style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  backgroundColor: '#F59E0B',
                  borderRadius: 10,
                  width: 20,
                  height: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: '#FFFFFF'
                }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }}>★</Text>
                </View>
              )}

            </LinearGradient>
            
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: size === 'small' ? 10 : size === 'large' ? 13 : 11, 
              fontWeight: '500',
              textAlign: 'center',
              lineHeight: 14,
              maxWidth: 80
            }}>
              {category.label.replace(' ', '\n')}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

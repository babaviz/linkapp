import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PropertyStackParamList } from '../../navigation/PropertyStackNavigator';
import { colors, shadows } from '../../theme';

type PropertyNavigationProp = StackNavigationProp<PropertyStackParamList>;

interface PropertyNavigationMenuProps {
  visible: boolean;
  onClose: () => void;
  userType: 'tenant' | 'property_owner';
  currentScreen?: string;
  onSearch?: () => void;
  onNearMeSearch?: () => void;
  searchText?: string;
}

export default function PropertyNavigationMenu({ 
  visible, 
  onClose, 
  userType, 
  currentScreen,
  onSearch,
  onNearMeSearch,
  searchText
}: PropertyNavigationMenuProps) {
  const navigation = useNavigation<PropertyNavigationProp>();

  const handleNavigation = (screen: keyof PropertyStackParamList | 'DateMiConversations', params?: any) => {
    onClose();
    if (currentScreen !== screen) {
      // Special handling for DateMiConversations which is in RootStackParamList
      if (screen === 'DateMiConversations') {
        (navigation as any).navigate('DateMiConversations');
      } else {
        navigation.navigate(screen as any, params);
      }
    }
  };

  const tenantMenuItems = [
    { 
      key: 'PropertyHub',
      icon: '🏠', 
      label: 'Property Hub',
      description: 'Browse all properties',
      color: '#10B981'
    },
    { 
      key: 'PropertySearch', 
      icon: '🔍', 
      label: 'Advanced Search',
      description: 'Filter properties by criteria',
      color: '#3B82F6'
    },
    { 
      key: 'PropertyMapView', 
      icon: '🗺️', 
      label: 'Basic Map',
      description: 'Simple map view',
      color: '#8B5CF6'
    },
    { 
      key: 'PropertyMap', 
      icon: '🌍', 
      label: 'Enhanced Map',
      description: 'Advanced map with clustering & search',
      color: '#6366F1'
    },
    { 
      key: 'SavedProperties', 
      icon: '❤️', 
      label: 'Saved Properties',
      description: 'Your favorite listings',
      color: '#EF4444'
    },
    { 
      key: 'PropertyCompare', 
      icon: '⚖️', 
      label: 'Compare Properties',
      description: 'Side-by-side comparison',
      color: '#F59E0B'
    },
    { 
      key: 'DateMiConversations', 
      icon: '💬', 
      label: 'My Chats',
      description: 'All your conversations',
      color: '#047857'
    },
  ];

  const ownerMenuItems = [
    { 
      key: 'PropertyHub',
      icon: '🏠', 
      label: 'Property Hub',
      description: 'Main property dashboard',
      color: '#10B981'
    },
    { 
      key: 'MyProperties', 
      icon: '🏢', 
      label: 'My Properties',
      description: 'Manage your listings',
      color: '#F97316'
    },
    { 
      key: 'PostProperty', 
      icon: '➕', 
      label: 'Post Property',
      description: 'Add new listing',
      color: '#3B82F6'
    },
    { 
      key: 'Inquiries', 
      icon: '💬', 
      label: 'Inquiries',
      description: 'Tenant messages',
      color: '#8B5CF6'
    },
    { 
      key: 'PropertyAnalytics', 
      icon: '📊', 
      label: 'Analytics',
      description: 'Property performance',
      color: '#EF4444'
    },
    { 
      key: 'DateMiConversations', 
      icon: '💬', 
      label: 'My Chats',
      description: 'All your conversations',
      color: '#047857'
    },
  ];

  const menuItems = userType === 'tenant' ? tenantMenuItems : ownerMenuItems;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 30
        }}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={{
            borderRadius: 28,
            width: '100%',
            maxWidth: 400,
            padding: 28,
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border.light,
            ...shadows.lg
          }}
        >
          <Text style={{
            fontSize: 24,
            fontWeight: '700',
            color: colors.text.primary,
            textAlign: 'center',
            marginBottom: 32,
            letterSpacing: 0.5
          }}>
            Property Hub
          </Text>

          {/* Search & Location Buttons - Integrated into menu */}
          {userType === 'tenant' && (
            <>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onSearch?.();
                }}
                style={{
                  backgroundColor: colors.secondary[50],
                  borderRadius: 20,
                  padding: 22,
                  marginBottom: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.border.light,
                  ...shadows.base
                }}
                activeOpacity={0.8}
              >
                <View style={{
                  width: 32,
                  height: 32,
                  backgroundColor: colors.primary[100],
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16
                }}>
                  <Text style={{ fontSize: 18 }}>🔍</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    color: colors.text.primary,
                    fontWeight: '600',
                    marginBottom: 2
                  }}>
                    Search Properties
                  </Text>
                  <Text style={{
                    fontSize: 13,
                    color: colors.text.secondary,
                    fontWeight: '400'
                  }}>
                    Find by location, price, or type
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onNearMeSearch?.();
                }}
                style={{
                  backgroundColor: colors.secondary[50],
                  borderRadius: 20,
                  padding: 22,
                  marginBottom: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.border.light,
                  ...shadows.base
                }}
                activeOpacity={0.8}
              >
                <View style={{
                  width: 32,
                  height: 32,
                  backgroundColor: colors.primary[100],
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16
                }}>
                  <Text style={{ fontSize: 18 }}>📍</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    color: colors.text.primary,
                    fontWeight: '600',
                    marginBottom: 2
                  }}>
                    Near Me
                  </Text>
                  <Text style={{
                    fontSize: 13,
                    color: colors.text.secondary,
                    fontWeight: '400'
                  }}>
                    Properties in your area
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          )}

          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => handleNavigation(item.key as any)}
              style={{
                backgroundColor: colors.secondary[50],
                borderRadius: 18,
                padding: 20,
                marginBottom: index < menuItems.length - 1 ? 14 : 0,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.border.light,
                ...shadows.sm
              }}
              activeOpacity={0.8}
            >
              <View style={{
                width: 28,
                height: 28,
                backgroundColor: colors.primary[100],
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16
              }}>
                <Text style={{ fontSize: 16 }}>{item.icon || ''}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  color: colors.text.primary,
                  fontWeight: '600',
                  letterSpacing: 0.3
                }}>
                  {item.label || ''}
                </Text>
                {item.description && (
                  <Text style={{
                    fontSize: 12,
                    color: colors.text.secondary,
                    marginTop: 2
                  }}>
                    {item.description}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

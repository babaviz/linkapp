import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PropertyStackParamList } from '../../navigation/PropertyStackNavigator';

type PropertyScreenNavigationProp = StackNavigationProp<PropertyStackParamList, 'PropertyHub'>;

interface PropertyOwnerActionsProps {
  visible: boolean;
  onClose: () => void;
  category?: string;
}

export default function PropertyOwnerActions({ 
  visible, 
  onClose,
  category 
}: PropertyOwnerActionsProps) {
  const navigation = useNavigation<PropertyScreenNavigationProp>();

  const handleAddProperty = () => {
    onClose();
    navigation.navigate('PostProperty');
  };

  const handleManageListings = () => {
    onClose();
    navigation.navigate('MyProperties');
  };

  const handleViewInquiries = () => {
    onClose();
    navigation.navigate('PropertyInquiries');
  };

  const handleViewAnalytics = () => {
    onClose();
    // Navigate to analytics dashboard - you can pass category filter if needed
    navigation.navigate('MyProperties');
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20
        }}
        onPress={onClose}
        activeOpacity={1}
      >
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 400,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 10
        }}>
          {/* Header */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 20 
          }}>
            <Text style={{ 
              fontSize: 20, 
              fontWeight: '700', 
              color: '#111827'
            }}>
              Property Owner Actions
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {category && (
            <View style={{
              backgroundColor: '#F3F4F6',
              padding: 12,
              borderRadius: 8,
              marginBottom: 16
            }}>
              <Text style={{ 
                color: '#374151', 
                fontSize: 14,
                fontWeight: '500'
              }}>
                Category: {category}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View>
            {/* Add Property */}
            <TouchableOpacity
              onPress={handleAddProperty}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#ECFDF5',
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 12,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#A7F3D0'
              }}
              activeOpacity={0.8}
            >
              <View style={{
                width: 40,
                height: 40,
                backgroundColor: '#10B981',
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <MaterialIcons name="add-home" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  fontSize: 16, 
                  fontWeight: '600', 
                  color: '#047857',
                  marginBottom: 2
                }}>
                  Add Property
                </Text>
                <Text style={{ 
                  fontSize: 12, 
                  color: '#6B7280'
                }}>
                  List a new property in {category || 'this category'}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#047857" />
            </TouchableOpacity>

            {/* Manage Listings */}
            <TouchableOpacity
              onPress={handleManageListings}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#EEF2FF',
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 12,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#C7D2FE'
              }}
              activeOpacity={0.8}
            >
              <View style={{
                width: 40,
                height: 40,
                backgroundColor: '#6366F1',
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <MaterialIcons name="list-alt" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  fontSize: 16, 
                  fontWeight: '600', 
                  color: '#4F46E5',
                  marginBottom: 2
                }}>
                  Manage Listings
                </Text>
                <Text style={{ 
                  fontSize: 12, 
                  color: '#6B7280'
                }}>
                  View and edit your properties
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#4F46E5" />
            </TouchableOpacity>

            {/* View Inquiries */}
            <TouchableOpacity
              onPress={handleViewInquiries}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FEF3C7',
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 12,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#FDE68A'
              }}
              activeOpacity={0.8}
            >
              <View style={{
                width: 40,
                height: 40,
                backgroundColor: '#F59E0B',
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <MaterialIcons name="message" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  fontSize: 16, 
                  fontWeight: '600', 
                  color: '#D97706',
                  marginBottom: 2
                }}>
                  View Inquiries
                </Text>
                <Text style={{ 
                  fontSize: 12, 
                  color: '#6B7280'
                }}>
                  Respond to tenant messages
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#D97706" />
            </TouchableOpacity>

            {/* Listing Stats */}
            <TouchableOpacity
              onPress={handleViewAnalytics}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F3E8FF',
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#DDD6FE'
              }}
              activeOpacity={0.8}
            >
              <View style={{
                width: 40,
                height: 40,
                backgroundColor: '#9333EA',
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <MaterialIcons name="analytics" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  fontSize: 16, 
                  fontWeight: '600', 
                  color: '#7C3AED',
                  marginBottom: 2
                }}>
                  Listing Stats
                </Text>
                <Text style={{ 
                  fontSize: 12, 
                  color: '#6B7280'
                }}>
                  View performance analytics
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#7C3AED" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

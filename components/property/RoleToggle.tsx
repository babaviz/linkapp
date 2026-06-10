import React, { useEffect } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { updateRoleSpecificProfile, initializeUserProfile } from '../../redux/slices/userSlice';

interface PropertyRoleToggleProps {
  currentRole: 'tenant' | 'property_owner';
  onRoleChange: (role: 'tenant' | 'property_owner') => void;
  style?: any;
  isTablet?: boolean;
  screenWidth?: number;
}

export default function PropertyRoleToggle({
  currentRole,
  onRoleChange,
  style,
  isTablet = false,
  screenWidth = 375
}: PropertyRoleToggleProps) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentProfile, isLoading } = useAppSelector((state) => state.user);
  
  // Initialize profile if it doesn't exist but user is authenticated
  useEffect(() => {
    if (user && !currentProfile && !isLoading) {
      
      dispatch(initializeUserProfile(user));
    }
  }, [user, currentProfile, isLoading, dispatch]);

  const handleRoleChange = async (newRole: 'tenant' | 'property_owner') => {
    // Prevent role change if profile is still loading
    if (isLoading) {
      
      return;
    }
    
    // Check if user is authenticated
    if (!user) {
      
      return;
    }
    
    try {
      // Update the user's property profile with new role
      await dispatch(updateRoleSpecificProfile({
        module: 'property',
        role: newRole,
        preferences: {
          propertyTypes: [],
          priceRange: { min: 0, max: 1000000 },
          locationPreferences: [],
          amenityPreferences: [],
        }
      })).unwrap();
      
      // Notify parent component
      onRoleChange(newRole);

    } catch (error) {
      
      // Optionally show user-friendly error message
      // You can add Alert.alert or Toast notification here if needed
    }
  };

  return (
    <View style={[{
      alignItems: 'center',
      marginVertical: isTablet ? 16 : 8,
    }, style]}>
      <View style={{ 
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: isTablet ? 24 : 20,
        padding: isTablet ? 3 : 2,
        flexDirection: 'row',
        width: isTablet ? '60%' : screenWidth < 360 ? '90%' : '80%',
        maxWidth: isTablet ? 400 : 280,
        height: isTablet ? 52 : screenWidth < 360 ? 40 : 44
      }}>
        {/* Tenant Button */}
        <TouchableOpacity
          onPress={() => handleRoleChange('tenant')}
          style={{ 
            flex: 1,
            height: 40,
            backgroundColor: currentRole === 'tenant' ? '#FFFFFF' : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: currentRole === 'tenant' ? 18 : 0,
            marginHorizontal: currentRole === 'tenant' ? 0 : 1,
            shadowColor: currentRole === 'tenant' ? '#10B981' : 'transparent',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: currentRole === 'tenant' ? 0.3 : 0,
            shadowRadius: currentRole === 'tenant' ? 4 : 0,
            elevation: currentRole === 'tenant' ? 3 : 0
          }}
          activeOpacity={0.8}
        >
          <Text style={{ 
            color: currentRole === 'tenant' ? '#068F8F' : 'rgba(255,255,255,0.8)', 
            fontSize: isTablet ? 16 : screenWidth < 360 ? 12 : 14, 
            fontWeight: '600',
            textAlign: 'center'
          }}>
            Tenant
          </Text>
        </TouchableOpacity>

        {/* Property Owner Button */}
        <TouchableOpacity
          onPress={() => handleRoleChange('property_owner')}
          style={{ 
            flex: 1,
            height: 40,
            backgroundColor: currentRole === 'property_owner' ? '#FFFFFF' : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: currentRole === 'property_owner' ? 18 : 0,
            marginHorizontal: currentRole === 'property_owner' ? 0 : 1,
            shadowColor: currentRole === 'property_owner' ? '#10B981' : 'transparent',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: currentRole === 'property_owner' ? 0.3 : 0,
            shadowRadius: currentRole === 'property_owner' ? 4 : 0,
            elevation: currentRole === 'property_owner' ? 3 : 0
          }}
          activeOpacity={0.8}
        >
          <Text style={{ 
            color: currentRole === 'property_owner' ? '#068F8F' : 'rgba(255,255,255,0.8)', 
            fontSize: isTablet ? 16 : screenWidth < 360 ? 12 : 14, 
            fontWeight: '600',
            textAlign: 'center'
          }}>
            Property Owner
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

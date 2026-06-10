/**
 * RoleToggle Component for Services Module
 * Material 3 compliant role switcher between Service Seeker and Service Owner
 * Integrated with Redux user profile management
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { getDynamicDimensions } from '../../utils/responsive';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { updateRoleSpecificProfile, initializeUserProfile } from '../../redux/slices/userSlice';

export type ServiceRole = 'seeker' | 'owner';
type CanonicalServicesRole = 'service_seeker' | 'service_provider';

interface RoleToggleProps {
  role: ServiceRole;
  onRoleChange: (role: ServiceRole) => void;
  seekerLabel?: string;
  ownerLabel?: string;
  style?: any;
  disabled?: boolean;
  isTablet?: boolean;
  screenWidth?: number;
}

const RoleToggle: React.FC<RoleToggleProps> = ({
  role,
  onRoleChange,
  seekerLabel = 'Service Seeker',
  ownerLabel = 'Service Owner',
  style,
  disabled = false,
  isTablet: propIsTablet,
  screenWidth: propScreenWidth
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentProfile, isLoading } = useAppSelector((state) => state.user);
  const dimensions = getDynamicDimensions();
  const { width: screenWidth, isTablet } = {
    width: propScreenWidth || dimensions.width,
    isTablet: propIsTablet !== undefined ? propIsTablet : dimensions.isTablet
  };

  // Initialize profile if it doesn't exist but user is authenticated
  useEffect(() => {
    if (user && !currentProfile && !isLoading) {
      dispatch(initializeUserProfile(user));
    }
  }, [user, currentProfile, isLoading, dispatch]);

  const toCanonicalRole = (uiRole: ServiceRole): CanonicalServicesRole => (
    uiRole === 'owner' ? 'service_provider' : 'service_seeker'
  );

  const handleRoleChange = async (newRole: ServiceRole) => {
    // Prevent role change if profile is still loading
    if (isLoading) {
      return;
    }
    
    // Check if user is authenticated
    if (!user) {
      return;
    }
    
    try {
      // Update the user's services profile with new role
      await dispatch(updateRoleSpecificProfile({
        module: 'services',
        role: toCanonicalRole(newRole),
        preferences: {
          serviceCategories: [],
          priceRange: { min: 0, max: 100000 },
          locationPreferences: [],
        }
      })).unwrap();
      
      // Notify parent component
      onRoleChange(newRole);

    } catch (error) {
      // Error handled by Redux
    }
  };

  return (
    <View style={[{
      alignItems: 'center',
      marginVertical: isTablet ? 16 : 12
    }, style]}>
      <View style={{ 
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: isTablet ? 24 : 20,
        padding: isTablet ? 3 : 2,
        flexDirection: 'row',
        width: isTablet ? '60%' : screenWidth < 360 ? '92%' : '86%',
        maxWidth: isTablet ? 420 : 320,
        height: isTablet ? 52 : screenWidth < 360 ? 40 : 44
      }}>
        {/* Service Seeker Button */}
        <TouchableOpacity
          onPress={() => handleRoleChange('seeker')}
          style={{ 
            flex: 1,
            height: 40,
            backgroundColor: role === 'seeker' ? '#FFFFFF' : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: role === 'seeker' ? 18 : 0,
            marginHorizontal: role === 'seeker' ? 0 : 1,
            shadowColor: role === 'seeker' ? '#6366F1' : 'transparent',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: role === 'seeker' ? 0.3 : 0,
            shadowRadius: role === 'seeker' ? 4 : 0,
            elevation: role === 'seeker' ? 3 : 0,
            opacity: disabled || isLoading ? 0.6 : 1
          }}
          activeOpacity={disabled || isLoading ? 1 : 0.8}
          disabled={disabled || isLoading}
        >
          <Text style={{ 
            color: role === 'seeker' ? '#6366F1' : 'rgba(255,255,255,0.8)', 
            fontSize: isTablet ? 16 : screenWidth < 360 ? 12 : 14, 
            fontWeight: '600',
            textAlign: 'center'
          }}>
            {seekerLabel}
          </Text>
        </TouchableOpacity>
        
        {/* Service Owner Button */}
        <TouchableOpacity
          onPress={() => handleRoleChange('owner')}
          style={{ 
            flex: 1,
            height: 40,
            backgroundColor: role === 'owner' ? '#FFFFFF' : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: role === 'owner' ? 18 : 0,
            marginHorizontal: role === 'owner' ? 0 : 1,
            shadowColor: role === 'owner' ? '#6366F1' : 'transparent',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: role === 'owner' ? 0.3 : 0,
            shadowRadius: role === 'owner' ? 4 : 0,
            elevation: role === 'owner' ? 3 : 0,
            opacity: disabled || isLoading ? 0.6 : 1
          }}
          activeOpacity={disabled || isLoading ? 1 : 0.8}
          disabled={disabled || isLoading}
        >
          <Text style={{ 
            color: role === 'owner' ? '#6366F1' : 'rgba(255,255,255,0.8)', 
            fontSize: isTablet ? 16 : screenWidth < 360 ? 12 : 14, 
            fontWeight: '600',
            textAlign: 'center'
          }}>
            {ownerLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default RoleToggle;

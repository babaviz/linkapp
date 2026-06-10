import React, { useEffect } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { updateRoleSpecificProfile, initializeUserProfile } from '../../redux/slices/userSlice';

interface JobsRoleToggleProps {
  currentRole: 'job_seeker' | 'employer';
  onRoleChange: (role: 'job_seeker' | 'employer') => void;
  style?: any;
  isTablet?: boolean;
  screenWidth?: number;
}

export default function JobsRoleToggle({
  currentRole,
  onRoleChange,
  style,
  isTablet = false,
  screenWidth = 375
}: JobsRoleToggleProps) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { currentProfile, isLoading } = useAppSelector((state) => state.user);
  
  // Initialize profile if it doesn't exist but user is authenticated
  useEffect(() => {
    if (user && !currentProfile && !isLoading) {
      
      dispatch(initializeUserProfile(user));
    }
  }, [user, currentProfile, isLoading, dispatch]);

  const handleRoleChange = async (newRole: 'job_seeker' | 'employer') => {
    // Prevent role change if profile is still loading
    if (isLoading) {
      
      return;
    }
    
    // Check if user is authenticated
    if (!user) {
      
      return;
    }
    
    try {
      // Update the user's jobs profile with new role
      await dispatch(updateRoleSpecificProfile({
        module: 'jobs',
        role: newRole,
        preferences: {
          skillCategories: [],
          salaryRange: { min: 0, max: 200000 },
          locationPreferences: [],
          workType: 'any',
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
        {/* Job Seeker Button */}
        <TouchableOpacity
          onPress={() => handleRoleChange('job_seeker')}
          style={{ 
            flex: 1,
            height: 40,
            backgroundColor: currentRole === 'job_seeker' ? '#FFFFFF' : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: currentRole === 'job_seeker' ? 18 : 0,
            marginHorizontal: currentRole === 'job_seeker' ? 0 : 1,
            shadowColor: currentRole === 'job_seeker' ? '#059669' : 'transparent',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: currentRole === 'job_seeker' ? 0.3 : 0,
            shadowRadius: currentRole === 'job_seeker' ? 4 : 0,
            elevation: currentRole === 'job_seeker' ? 3 : 0
          }}
          activeOpacity={0.8}
        >
          <Text style={{ 
            color: currentRole === 'job_seeker' ? '#059669' : 'rgba(255,255,255,0.8)', 
            fontSize: isTablet ? 16 : screenWidth < 360 ? 12 : 14, 
            fontWeight: '600',
            textAlign: 'center'
          }}>
            Job Seeker
          </Text>
        </TouchableOpacity>

        {/* Employer Button */}
        <TouchableOpacity
          onPress={() => handleRoleChange('employer')}
          style={{ 
            flex: 1,
            height: 40,
            backgroundColor: currentRole === 'employer' ? '#FFFFFF' : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: currentRole === 'employer' ? 18 : 0,
            marginHorizontal: currentRole === 'employer' ? 0 : 1,
            shadowColor: currentRole === 'employer' ? '#059669' : 'transparent',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: currentRole === 'employer' ? 0.3 : 0,
            shadowRadius: currentRole === 'employer' ? 4 : 0,
            elevation: currentRole === 'employer' ? 3 : 0
          }}
          activeOpacity={0.8}
        >
          <Text style={{ 
            color: currentRole === 'employer' ? '#059669' : 'rgba(255,255,255,0.8)', 
            fontSize: isTablet ? 16 : screenWidth < 360 ? 12 : 14, 
            fontWeight: '600',
            textAlign: 'center'
          }}>
            Employer
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

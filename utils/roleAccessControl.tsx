/**
 * Role-Based Access Control Utility
 * Provides middleware and helpers for enforcing role permissions across the app
 */

import React from 'react';
import { Alert } from 'react-native';
import { NavigationProp } from '@react-navigation/native';
import { store } from '../redux/store';
import { EnhancedUserProfile } from '../types/user';

// Define role permissions for each module
export const ROLE_PERMISSIONS = {
  property: {
    tenant: {
      canView: ['PropertyHome', 'PropertyDetails', 'PropertySearch', 'PropertyMapView', 
               'PropertyMap', 'SavedProperties', 'PropertyCompare', 'PropertyCategories'],
      canCreate: [],
      canEdit: [],
      canDelete: []
    },
    property_owner: {
      canView: ['PropertyHome', 'PropertyDetails', 'PropertySearch', 'PropertyMapView',
               'PropertyMap', 'SavedProperties', 'PropertyCompare', 'PropertyCategories',
               'MyProperties', 'PropertyAnalytics', 'PropertyInquiries', 'PostProperty'],
      canCreate: ['PostProperty'],
      canEdit: ['EditProperty', 'MyProperties'],
      canDelete: ['MyProperties']
    }
  },
  jobs: {
    job_seeker: {
      canView: ['JobsHome', 'JobDetails', 'JobApplications', 'MyApplications', 
               'SkillsProfile', 'CategoryJobs'],
      canCreate: ['JobApplication'],
      canEdit: ['SkillsProfile'],
      canDelete: []
    },
    employer: {
      canView: ['JobsHome', 'JobDetails', 'JobApplications', 'MyApplications',
               'MyPostings', 'PostJob', 'CategoryJobs'],
      canCreate: ['PostJob'],
      canEdit: ['EditJob', 'MyPostings'],
      canDelete: ['MyPostings']
    }
  },
  services: {
    service_seeker: {
      canView: ['ServicesHome', 'ServiceDetails', 'ServiceCategories', 
               'SavedServices', 'MyServiceRequests'],
      canCreate: ['ServiceRequest'],
      canEdit: [],
      canDelete: []
    },
    service_provider: {
      canView: ['ServicesHome', 'ServiceDetails', 'ServiceCategories',
               'MyServices', 'ServiceInquiries', 'PostService', 'ServiceAnalytics'],
      canCreate: ['PostService'],
      canEdit: ['MyServices'],
      canDelete: ['MyServices']
    }
  }
};

// Helper to get current user profile and role
export const getCurrentUserRole = (module: 'property' | 'jobs' | 'services') => {
  const state = store.getState();
  const currentProfile = state.user.currentProfile;
  
  if (!currentProfile) {
    return null;
  }
  
  switch (module) {
    case 'property':
      return currentProfile.propertyProfile?.role || null;
    case 'jobs':
      return currentProfile.jobsProfile?.role || null;
    case 'services':
      return currentProfile.servicesProfile?.role || null;
    default:
      return null;
  }
};

// Check if user has permission to access a screen
export const hasPermission = (
  module: 'property' | 'jobs' | 'services',
  screen: string,
  action: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' = 'canView'
): boolean => {
  const role = getCurrentUserRole(module);
  
  if (!role) {
    
    return false;
  }
  
  const permissions = ROLE_PERMISSIONS[module]?.[role as any]?.[action] || [];
  const hasAccess = permissions.includes(screen);
  
  if (!hasAccess) {
    
  }
  
  return hasAccess;
};

// Navigation guard for role-based access
export const navigationGuard = (
  navigation: NavigationProp<any>,
  module: 'property' | 'jobs' | 'services',
  targetScreen: string,
  params?: any
) => {
  if (!hasPermission(module, targetScreen)) {
    const role = getCurrentUserRole(module);
    
    Alert.alert(
      'Access Restricted',
      `This feature is not available for ${role?.replace('_', ' ')}s. Please switch to the appropriate role to access this feature.`,
      [{ text: 'OK' }]
    );
    
    return false;
  }
  
  navigation.navigate(targetScreen, params);
  return true;
};

// HOC for protecting screens with role-based access
export const withRoleAccess = (
  WrappedComponent: React.ComponentType<any>,
  module: 'property' | 'jobs' | 'services',
  requiredRole?: string,
  fallbackComponent?: React.ComponentType<any>
) => {
  return (props: any) => {
    const role = getCurrentUserRole(module);
    
    // If specific role is required and doesn't match
    if (requiredRole && role !== requiredRole) {
      if (fallbackComponent) {
        const FallbackComponent = fallbackComponent;
        return <FallbackComponent {...props} />;
      }
      
      // Return null or show message
      return null;
    }
    
    return <WrappedComponent {...props} />;
  };
};

// Check if user can perform action on owned resource
export const canModifyResource = (
  resourceOwnerId: string,
  action: 'edit' | 'delete'
): boolean => {
  const state = store.getState();
  const currentUserId = state.auth.user?.id;
  
  if (!currentUserId) {
    
    return false;
  }
  
  const canModify = resourceOwnerId === currentUserId;
  
  if (!canModify) {
    
  }
  
  return canModify;
};

// Get role-specific data filter
export const getRoleDataFilter = (
  module: 'property' | 'jobs' | 'services',
  userId: string
) => {
  const role = getCurrentUserRole(module);
  
  switch (module) {
    case 'property':
      if (role === 'property_owner') {
        // Owners see their own properties
        return { owner_id: userId };
      }
      // Tenants see all available properties
      return { status: 'available' };
      
    case 'jobs':
      if (role === 'employer') {
        // Employers see their own job postings
        return { employer_id: userId };
      }
      // Job seekers see all active jobs
      return { status: 'active' };
      
    case 'services':
      if (role === 'service_provider') {
        // Providers see their own services
        return { owner_id: userId };
      }
      // Seekers see all available services
      return { status: 'active' };
      
    default:
      return {};
  }
};

// Validate role switch request
export const canSwitchToRole = (
  module: 'property' | 'jobs' | 'services',
  targetRole: string
): { allowed: boolean; reason?: string } => {
  const state = store.getState();
  const currentProfile = state.user.currentProfile;
  
  if (!currentProfile) {
    return { 
      allowed: false, 
      reason: 'User profile not initialized' 
    };
  }
  
  // Check if user has completed necessary verification for certain roles
  if (module === 'property' && targetRole === 'property_owner') {
    if (currentProfile.kycStatus !== 'verified') {
      return { 
        allowed: false, 
        reason: 'KYC verification required to become a property owner' 
      };
    }
  }
  
  if (module === 'jobs' && targetRole === 'employer') {
    // Could add business verification check here
  }
  
  if (module === 'services' && targetRole === 'service_provider') {
    // Could add service provider verification check here
  }
  
  return { allowed: true };
};

// Export utility functions for use in screens
export default {
  getCurrentUserRole,
  hasPermission,
  navigationGuard,
  withRoleAccess,
  canModifyResource,
  getRoleDataFilter,
  canSwitchToRole
};

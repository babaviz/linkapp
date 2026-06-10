"use strict";
/**
 * Role-Based Access Control Utility
 * Provides middleware and helpers for enforcing role permissions across the app
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.canSwitchToRole = exports.getRoleDataFilter = exports.canModifyResource = exports.withRoleAccess = exports.navigationGuard = exports.hasPermission = exports.getCurrentUserRole = exports.ROLE_PERMISSIONS = void 0;
const react_native_1 = require("react-native");
const store_1 = require("../redux/store");
// Define role permissions for each module
exports.ROLE_PERMISSIONS = {
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
const getCurrentUserRole = (module) => {
    const state = store_1.store.getState();
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
exports.getCurrentUserRole = getCurrentUserRole;
// Check if user has permission to access a screen
const hasPermission = (module, screen, action = 'canView') => {
    const role = (0, exports.getCurrentUserRole)(module);
    if (!role) {
        
        return false;
    }
    const permissions = exports.ROLE_PERMISSIONS[module]?.[role]?.[action] || [];
    const hasAccess = permissions.includes(screen);
    if (!hasAccess) {
        
    }
    return hasAccess;
};
exports.hasPermission = hasPermission;
// Navigation guard for role-based access
const navigationGuard = (navigation, module, targetScreen, params) => {
    if (!(0, exports.hasPermission)(module, targetScreen)) {
        const role = (0, exports.getCurrentUserRole)(module);
        react_native_1.Alert.alert('Access Restricted', `This feature is not available for ${role?.replace('_', ' ')}s. Please switch to the appropriate role to access this feature.`, [{ text: 'OK' }]);
        return false;
    }
    navigation.navigate(targetScreen, params);
    return true;
};
exports.navigationGuard = navigationGuard;
// HOC for protecting screens with role-based access
const withRoleAccess = (WrappedComponent, module, requiredRole, fallbackComponent) => {
    return (props) => {
        const role = (0, exports.getCurrentUserRole)(module);
        // If specific role is required and doesn't match
        if (requiredRole && role !== requiredRole) {
            if (fallbackComponent) {
                const FallbackComponent = fallbackComponent;
                return { ...props } /  > ;
            }
            // Return null or show message
            return null;
        }
        return { ...props } /  > ;
    };
};
exports.withRoleAccess = withRoleAccess;
// Check if user can perform action on owned resource
const canModifyResource = (resourceOwnerId, action) => {
    const state = store_1.store.getState();
    const currentUserId = state.auth.user?.id;
    if (!currentUserId) {
        
        return false;
    }
    const canModify = resourceOwnerId === currentUserId;
    if (!canModify) {
        
    }
    return canModify;
};
exports.canModifyResource = canModifyResource;
// Get role-specific data filter
const getRoleDataFilter = (module, userId) => {
    const role = (0, exports.getCurrentUserRole)(module);
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
                return { provider_id: userId };
            }
            // Seekers see all available services
            return { status: 'available' };
        default:
            return {};
    }
};
exports.getRoleDataFilter = getRoleDataFilter;
// Validate role switch request
const canSwitchToRole = (module, targetRole) => {
    const state = store_1.store.getState();
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
exports.canSwitchToRole = canSwitchToRole;
// Export utility functions for use in screens
exports.default = {
    getCurrentUserRole: exports.getCurrentUserRole,
    hasPermission: exports.hasPermission,
    navigationGuard: exports.navigationGuard,
    withRoleAccess: exports.withRoleAccess,
    canModifyResource: exports.canModifyResource,
    getRoleDataFilter: exports.getRoleDataFilter,
    canSwitchToRole: exports.canSwitchToRole
};

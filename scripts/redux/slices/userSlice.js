"use strict";
let _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleSavedItem = exports.addToViewHistory = exports.updateLastActivity = exports.setCurrentRole = exports.setCurrentModule = exports.clearError = exports.updateUserSettings = exports.switchModuleRole = exports.updateRoleSpecificProfile = exports.initializeUserProfile = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const initialState = {
    currentProfile: null,
    profileSwitchContext: {
        currentModule: 'property',
        currentRole: undefined,
        availableRoles: {
            property: ['tenant', 'property_owner'],
            jobs: ['job_seeker', 'employer'],
            services: ['service_seeker', 'service_provider'],
            stories: ['community_member'],
            datemi: ['dating_profile']
        }
    },
    modulePreferences: null,
    isLoading: false,
    error: null,
    isUpdatingProfile: false,
    lastProfileUpdate: null,
};
// Async thunks for profile management
exports.initializeUserProfile = (0, toolkit_1.createAsyncThunk)('user/initializeProfile', async (baseProfile, { rejectWithValue }) => {
    try {
        // Transform base profile to enhanced profile structure
        const enhancedProfile = {
            ...baseProfile,
            settings: {
                notifications: {
                    email: true,
                    push: true,
                    sms: false,
                    categories: {
                        properties: true,
                        jobs: true,
                        services: true,
                        stories: true,
                        datemi: false, // Default off until age verification
                    },
                },
                privacy: {
                    profileVisibility: 'public',
                    showLocation: true,
                    showOnlineStatus: true,
                    allowDirectMessages: true,
                },
                language: 'en',
                theme: 'system',
            },
            activeModules: ['property'], // Start with property module
        };
        return enhancedProfile;
    }
    catch (error) {
        return rejectWithValue(error.message || 'Failed to initialize user profile');
    }
});
exports.updateRoleSpecificProfile = (0, toolkit_1.createAsyncThunk)('user/updateRoleSpecificProfile', async (updateData, { getState, dispatch, rejectWithValue }) => {
    try {
        const state = getState();
        let currentProfile = state.user.currentProfile;
        // If no current profile but auth user exists, try to initialize it first
        if (!currentProfile && state.auth?.user) {
            
            try {
                const initResult = await dispatch((0, exports.initializeUserProfile)(state.auth.user));
                if (initResult.type === 'user/initializeProfile/fulfilled') {
                    currentProfile = initResult.payload;
                }
                else {
                    throw new Error('Failed to initialize user profile');
                }
            }
            catch (initError) {
                
                throw new Error('Unable to initialize user profile. Please try logging out and back in.');
            }
        }
        if (!currentProfile) {
            throw new Error('No current profile found. Please ensure you are logged in and try again.');
        }
        // Create a mutable copy of the current profile
        // Using JSON.parse/stringify for deep clone to avoid immutability issues
        const updatedProfile = JSON.parse(JSON.stringify(currentProfile));
        switch (updateData.module) {
            case 'property':
                updatedProfile.propertyProfile = {
                    ...updatedProfile.propertyProfile,
                    userId: currentProfile.id,
                    role: updateData.role,
                    preferences: updateData.preferences || updatedProfile.propertyProfile?.preferences || {
                        propertyTypes: [],
                        priceRange: { min: 0, max: 1000000 },
                        locationPreferences: [],
                        amenityPreferences: [],
                    },
                    savedProperties: updatedProfile.propertyProfile?.savedProperties || [],
                    viewHistory: updatedProfile.propertyProfile?.viewHistory || [],
                    lastActive: new Date().toISOString(),
                };
                break;
            case 'jobs':
                updatedProfile.jobsProfile = {
                    ...updatedProfile.jobsProfile,
                    userId: currentProfile.id,
                    role: updateData.role,
                    preferences: updateData.preferences || updatedProfile.jobsProfile?.preferences || {
                        skillCategories: [],
                        salaryRange: { min: 0, max: 200000 },
                        locationPreferences: [],
                        workType: 'any',
                    },
                    savedJobs: updatedProfile.jobsProfile?.savedJobs || [],
                    applications: updatedProfile.jobsProfile?.applications || [],
                    viewHistory: updatedProfile.jobsProfile?.viewHistory || [],
                    lastActive: new Date().toISOString(),
                };
                break;
            case 'services':
                updatedProfile.servicesProfile = {
                    ...updatedProfile.servicesProfile,
                    userId: currentProfile.id,
                    role: updateData.role,
                    preferences: updateData.preferences || updatedProfile.servicesProfile?.preferences || {
                        serviceCategories: [],
                        locationPreferences: [],
                        budgetRange: { min: 0, max: 50000 },
                    },
                    savedServices: updatedProfile.servicesProfile?.savedServices || [],
                    bookingHistory: updatedProfile.servicesProfile?.bookingHistory || [],
                    reviewsGiven: updatedProfile.servicesProfile?.reviewsGiven || [],
                    lastActive: new Date().toISOString(),
                };
                break;
            case 'stories':
                updatedProfile.communityProfile = {
                    ...updatedProfile.communityProfile,
                    userId: currentProfile.id,
                    displayName: currentProfile.fullName || 'Community Member',
                    bio: updatedProfile.communityProfile?.bio || '',
                    interests: updateData.preferences?.interests || updatedProfile.communityProfile?.interests || [],
                    followersCount: updatedProfile.communityProfile?.followersCount || 0,
                    followingCount: updatedProfile.communityProfile?.followingCount || 0,
                    storiesCount: updatedProfile.communityProfile?.storiesCount || 0,
                    likesReceived: updatedProfile.communityProfile?.likesReceived || 0,
                    contentPreferences: updateData.preferences?.contentPreferences || updatedProfile.communityProfile?.contentPreferences || {
                        contentTypes: ['photo', 'video', 'event', 'update'],
                        discoverySetting: 'public',
                    },
                    lastActive: new Date().toISOString(),
                };
                break;
            case 'datemi':
                // Only allow Date Mi profile creation if age verified
                if (currentProfile.kycStatus !== 'verified') {
                    throw new Error('Age verification required for Date Mi profile');
                }
                updatedProfile.datemiProfile = {
                    ...updatedProfile.datemiProfile,
                    userId: currentProfile.id,
                    displayName: updateData.preferences?.displayName || currentProfile.fullName || 'Dating Profile',
                    birthDate: updateData.preferences?.birthDate || '',
                    gender: updateData.preferences?.gender || 'prefer_not_to_say',
                    lookingFor: updateData.preferences?.lookingFor || 'any',
                    bio: updatedProfile.datemiProfile?.bio || '',
                    interests: updateData.preferences?.interests || updatedProfile.datemiProfile?.interests || [],
                    location: updateData.preferences?.location || {
                        city: 'Nairobi',
                        country: 'Kenya',
                    },
                    preferences: updateData.preferences?.datingPreferences || updatedProfile.datemiProfile?.preferences || {
                        ageRange: { min: 18, max: 50 },
                        maxDistance: 50,
                        genderPreference: 'any',
                        lookingForTypes: ['casual', 'serious'],
                    },
                    subscriptionTier: 'free',
                    verified: false,
                    ageVerificationStatus: 'pending',
                    lastActive: new Date().toISOString(),
                    profileImages: updatedProfile.datemiProfile?.profileImages || [],
                };
                break;
        }
        // Update active modules
        if (!updatedProfile.activeModules.includes(updateData.module)) {
            updatedProfile.activeModules.push(updateData.module);
        }
        return updatedProfile;
    }
    catch (error) {
        
        const errorMessage = error.message || 'Failed to update role-specific profile';
        return rejectWithValue(errorMessage);
    }
});
exports.switchModuleRole = (0, toolkit_1.createAsyncThunk)('user/switchModuleRole', async ({ module, role }, { getState, rejectWithValue }) => {
    try {
        const state = getState();
        const currentProfile = state.user.currentProfile;
        if (!currentProfile) {
            throw new Error('No current profile found');
        }
        // Update the profile context
        const newContext = {
            ...state.user.profileSwitchContext,
            currentModule: module,
            currentRole: role,
        };
        return { context: newContext, profile: currentProfile };
    }
    catch (error) {
        return rejectWithValue(error.message || 'Failed to switch module role');
    }
});
exports.updateUserSettings = (0, toolkit_1.createAsyncThunk)('user/updateSettings', async (settings, { getState, rejectWithValue }) => {
    try {
        const state = getState();
        const currentProfile = state.user.currentProfile;
        if (!currentProfile) {
            throw new Error('No current profile found');
        }
        const updatedProfile = {
            ...currentProfile,
            settings: {
                ...currentProfile.settings,
                ...settings,
            },
            updatedAt: new Date().toISOString(),
        };
        return updatedProfile;
    }
    catch (error) {
        return rejectWithValue(error.message || 'Failed to update user settings');
    }
});
const userSlice = (0, toolkit_1.createSlice)({
    name: 'user',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        setCurrentModule: (state, action) => {
            state.profileSwitchContext.currentModule = action.payload;
        },
        setCurrentRole: (state, action) => {
            state.profileSwitchContext.currentRole = action.payload;
        },
        updateLastActivity: (state, action) => {
            if (state.currentProfile) {
                state.currentProfile.lastLoginAt = action.payload;
            }
        },
        addToViewHistory: (state, action) => {
            if (!state.currentProfile)
                return;
            const { module, itemId } = action.payload;
            const timestamp = new Date().toISOString();
            switch (module) {
                case 'property':
                    if (state.currentProfile.propertyProfile) {
                        state.currentProfile.propertyProfile.viewHistory.unshift(itemId);
                        state.currentProfile.propertyProfile.viewHistory =
                            state.currentProfile.propertyProfile.viewHistory.slice(0, 100); // Keep last 100
                        state.currentProfile.propertyProfile.lastActive = timestamp;
                    }
                    break;
                case 'jobs':
                    if (state.currentProfile.jobsProfile) {
                        state.currentProfile.jobsProfile.viewHistory.unshift(itemId);
                        state.currentProfile.jobsProfile.viewHistory =
                            state.currentProfile.jobsProfile.viewHistory.slice(0, 100);
                        state.currentProfile.jobsProfile.lastActive = timestamp;
                    }
                    break;
            }
        },
        toggleSavedItem: (state, action) => {
            if (!state.currentProfile)
                return;
            const { module, itemId } = action.payload;
            switch (module) {
                case 'property':
                    if (state.currentProfile.propertyProfile) {
                        const saved = state.currentProfile.propertyProfile.savedProperties;
                        const index = saved.indexOf(itemId);
                        if (index > -1) {
                            saved.splice(index, 1);
                        }
                        else {
                            saved.push(itemId);
                        }
                    }
                    break;
                case 'jobs':
                    if (state.currentProfile.jobsProfile) {
                        const saved = state.currentProfile.jobsProfile.savedJobs;
                        const index = saved.indexOf(itemId);
                        if (index > -1) {
                            saved.splice(index, 1);
                        }
                        else {
                            saved.push(itemId);
                        }
                    }
                    break;
                case 'services':
                    if (state.currentProfile.servicesProfile) {
                        const saved = state.currentProfile.servicesProfile.savedServices;
                        const index = saved.indexOf(itemId);
                        if (index > -1) {
                            saved.splice(index, 1);
                        }
                        else {
                            saved.push(itemId);
                        }
                    }
                    break;
            }
        },
    },
    extraReducers: (builder) => {
        builder
            // Initialize Profile
            .addCase(exports.initializeUserProfile.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.initializeUserProfile.fulfilled, (state, action) => {
            state.isLoading = false;
            state.currentProfile = action.payload;
            state.error = null;
        })
            .addCase(exports.initializeUserProfile.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        })
            // Update Role-Specific Profile
            .addCase(exports.updateRoleSpecificProfile.pending, (state) => {
            state.isUpdatingProfile = true;
            state.error = null;
        })
            .addCase(exports.updateRoleSpecificProfile.fulfilled, (state, action) => {
            state.isUpdatingProfile = false;
            state.currentProfile = action.payload;
            state.lastProfileUpdate = new Date().toISOString();
            state.error = null;
        })
            .addCase(exports.updateRoleSpecificProfile.rejected, (state, action) => {
            state.isUpdatingProfile = false;
            state.error = action.payload;
        })
            // Switch Module Role
            .addCase(exports.switchModuleRole.fulfilled, (state, action) => {
            state.profileSwitchContext = action.payload.context;
            state.currentProfile = action.payload.profile;
        })
            .addCase(exports.switchModuleRole.rejected, (state, action) => {
            state.error = action.payload;
        })
            // Update Settings
            .addCase(exports.updateUserSettings.pending, (state) => {
            state.isUpdatingProfile = true;
            state.error = null;
        })
            .addCase(exports.updateUserSettings.fulfilled, (state, action) => {
            state.isUpdatingProfile = false;
            state.currentProfile = action.payload;
            state.lastProfileUpdate = new Date().toISOString();
            state.error = null;
        })
            .addCase(exports.updateUserSettings.rejected, (state, action) => {
            state.isUpdatingProfile = false;
            state.error = action.payload;
        });
    },
});
_a = userSlice.actions, exports.clearError = _a.clearError, exports.setCurrentModule = _a.setCurrentModule, exports.setCurrentRole = _a.setCurrentRole, exports.updateLastActivity = _a.updateLastActivity, exports.addToViewHistory = _a.addToViewHistory, exports.toggleSavedItem = _a.toggleSavedItem;
exports.default = userSlice.reducer;

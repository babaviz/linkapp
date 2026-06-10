import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  EnhancedUserProfile,
  ProfileSwitchContext,
  RoleSpecificProfileUpdate,
  ModulePreferences,
  PropertyUserProfile,
  JobsUserProfile,
  ServicesUserProfile,
  // CommunityUserProfile, // TODO: Define this type if needed
  DateMiUserProfile
} from '../../types/user';

interface UserState {
  currentProfile: EnhancedUserProfile | null;
  profileSwitchContext: ProfileSwitchContext;
  modulePreferences: ModulePreferences | null;
  isLoading: boolean;
  error: string | null;
  
  // Profile management
  isUpdatingProfile: boolean;
  lastProfileUpdate: string | null;
  
  // UI preferences
  theme?: 'light' | 'dark' | 'system';
}

const initialState: UserState = {
  currentProfile: null,
  profileSwitchContext: {
    currentModule: 'property',
    currentRole: undefined,
    availableRoles: {
      property: ['tenant', 'property_owner'],
      jobs: ['job_seeker', 'employer'],
      services: ['service_seeker', 'service_provider'],
      datemi: ['dating_profile']
    }
  },
  modulePreferences: null,
  isLoading: false,
  error: null,
  isUpdatingProfile: false,
  lastProfileUpdate: null,
  theme: 'system',
};

// Async thunks for profile management
export const initializeUserProfile = createAsyncThunk(
  'user/initializeProfile',
  async (baseProfile: any, { rejectWithValue }) => {
    try {
      // Transform base profile to enhanced profile structure
      const enhancedProfile: EnhancedUserProfile = {
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
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to initialize user profile');
    }
  }
);

export const updateRoleSpecificProfile = createAsyncThunk(
  'user/updateRoleSpecificProfile',
  async (updateData: RoleSpecificProfileUpdate, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as { user: UserState; auth: any };
      let currentProfile = state.user.currentProfile;
      
      // If no current profile but auth user exists, try to initialize it first
      if (!currentProfile && state.auth?.user) {
        try {
          const initResult = await dispatch(initializeUserProfile(state.auth.user));
          if (initResult.type === 'user/initializeProfile/fulfilled') {
            currentProfile = (initResult as any).payload;
          } else {
            throw new Error('Failed to initialize user profile');
          }
        } catch (initError) {
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
            role: updateData.role as 'tenant' | 'property_owner',
            preferences: updateData.preferences || updatedProfile.propertyProfile?.preferences || {
              propertyTypes: [],
              priceRange: { min: 0, max: 1000000 },
              locationPreferences: [],
              amenityPreferences: [],
            },
            savedProperties: updatedProfile.propertyProfile?.savedProperties || [],
            viewHistory: updatedProfile.propertyProfile?.viewHistory || [],
            lastActive: new Date().toISOString(),
          } as PropertyUserProfile;
          break;
          
        case 'jobs':
          updatedProfile.jobsProfile = {
            ...updatedProfile.jobsProfile,
            userId: currentProfile.id,
            role: updateData.role as 'job_seeker' | 'employer',
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
          } as JobsUserProfile;
          break;
          
        case 'services':
          updatedProfile.servicesProfile = {
            ...updatedProfile.servicesProfile,
            userId: currentProfile.id,
            role: updateData.role as 'service_seeker' | 'service_provider',
            preferences: updateData.preferences || updatedProfile.servicesProfile?.preferences || {
              serviceCategories: [],
              locationPreferences: [],
              budgetRange: { min: 0, max: 50000 },
            },
            savedServices: updatedProfile.servicesProfile?.savedServices || [],
            bookingHistory: updatedProfile.servicesProfile?.bookingHistory || [],
            reviewsGiven: updatedProfile.servicesProfile?.reviewsGiven || [],
            lastActive: new Date().toISOString(),
          } as ServicesUserProfile;
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
          } as DateMiUserProfile;
          break;
      }

      // Update active modules
      if (!updatedProfile.activeModules.includes(updateData.module)) {
        updatedProfile.activeModules.push(updateData.module);
      }

      return updatedProfile;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update role-specific profile';
      return rejectWithValue(errorMessage);
    }
  }
);

export const switchModuleRole = createAsyncThunk(
  'user/switchModuleRole',
  async (
    { module, role }: { module: string; role: string },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { user: UserState };
      const currentProfile = state.user.currentProfile;
      
      if (!currentProfile) {
        throw new Error('No current profile found');
      }

      // Update the profile context
      const newContext: ProfileSwitchContext = {
        ...state.user.profileSwitchContext,
        currentModule: module as any,
        currentRole: role,
      };

      return { context: newContext, profile: currentProfile };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to switch module role');
    }
  }
);

export const updateUserSettings = createAsyncThunk(
  'user/updateSettings',
  async (
    settings: Partial<EnhancedUserProfile['settings']>,
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { user: UserState };
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
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update user settings');
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearUserState: (state) => {
      // Clear user-specific state on logout while preserving app-level UI preferences.
      const preservedTheme = state.theme;
      return {
        ...initialState,
        theme: preservedTheme ?? initialState.theme,
      };
    },
    setCurrentModule: (state, action: PayloadAction<string>) => {
      state.profileSwitchContext.currentModule = action.payload as any;
    },
    setCurrentRole: (state, action: PayloadAction<string>) => {
      state.profileSwitchContext.currentRole = action.payload;
    },
    updateLastActivity: (state, action: PayloadAction<string>) => {
      if (state.currentProfile) {
        state.currentProfile.lastLoginAt = action.payload;
      }
    },
    addToViewHistory: (state, action: PayloadAction<{ module: string; itemId: string }>) => {
      if (!state.currentProfile) return;
      
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
    toggleSavedItem: (state, action: PayloadAction<{ module: string; itemId: string }>) => {
      if (!state.currentProfile) return;
      
      const { module, itemId } = action.payload;
      
      switch (module) {
        case 'property':
          if (state.currentProfile.propertyProfile) {
            const saved = state.currentProfile.propertyProfile.savedProperties;
            const index = saved.indexOf(itemId);
            if (index > -1) {
              saved.splice(index, 1);
            } else {
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
            } else {
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
            } else {
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
      .addCase(initializeUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentProfile = action.payload;
        state.error = null;
      })
      .addCase(initializeUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update Role-Specific Profile
      .addCase(updateRoleSpecificProfile.pending, (state) => {
        state.isUpdatingProfile = true;
        state.error = null;
      })
      .addCase(updateRoleSpecificProfile.fulfilled, (state, action) => {
        state.isUpdatingProfile = false;
        state.currentProfile = action.payload;
        state.lastProfileUpdate = new Date().toISOString();
        state.error = null;
      })
      .addCase(updateRoleSpecificProfile.rejected, (state, action) => {
        state.isUpdatingProfile = false;
        state.error = action.payload as string;
      })
      
      // Switch Module Role
      .addCase(switchModuleRole.fulfilled, (state, action) => {
        state.profileSwitchContext = action.payload.context;
        state.currentProfile = action.payload.profile;
      })
      .addCase(switchModuleRole.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Update Settings
      .addCase(updateUserSettings.pending, (state) => {
        state.isUpdatingProfile = true;
        state.error = null;
      })
      .addCase(updateUserSettings.fulfilled, (state, action) => {
        state.isUpdatingProfile = false;
        state.currentProfile = action.payload;
        state.lastProfileUpdate = new Date().toISOString();
        state.error = null;
      })
      .addCase(updateUserSettings.rejected, (state, action) => {
        state.isUpdatingProfile = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  clearUserState,
  setCurrentModule,
  setCurrentRole,
  updateLastActivity,
  addToViewHistory,
  toggleSavedItem,
} = userSlice.actions;

export default userSlice.reducer;

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_STORAGE_KEY = '@linkapp_onboarding_completed';
const USER_INTENT_STORAGE_KEY = '@linkapp_user_intent';
const SHOW_TOOLTIPS_STORAGE_KEY = '@linkapp_show_tooltips';
const TOOLTIPS_SHOWN_STORAGE_KEY = '@linkapp_tooltips_shown';

export type UserIntent = 
  | 'find_property'
  | 'list_property'
  | 'find_job'
  | 'post_job'
  | 'find_service'
  | 'offer_service'
  | 'dating'
  | 'explore_all';

export type OnboardingStep = 
  | 'welcome'
  | 'role_selection'
  | 'module_tour'
  | 'interest_selection'
  | 'quick_tips'
  | 'completed';

interface OnboardingState {
  isOnboardingCompleted: boolean;
  isLoading: boolean;
  currentStep: OnboardingStep;
  userIntents: UserIntent[];
  selectedModules: string[];
  showTooltips: boolean;
  tooltipsShown: string[];
  error: string | null;
}

const initialState: OnboardingState = {
  isOnboardingCompleted: false,
  isLoading: true,
  currentStep: 'welcome',
  userIntents: [],
  selectedModules: [],
  showTooltips: false,
  tooltipsShown: [],
  error: null,
};

export const loadOnboardingStatus = createAsyncThunk(
  'onboarding/loadStatus',
  async () => {
    try {
      const [completed, intents, showTooltips, tooltipsShown] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_STORAGE_KEY),
        AsyncStorage.getItem(USER_INTENT_STORAGE_KEY),
        AsyncStorage.getItem(SHOW_TOOLTIPS_STORAGE_KEY),
        AsyncStorage.getItem(TOOLTIPS_SHOWN_STORAGE_KEY),
      ]);
      
      return {
        isCompleted: completed === 'true',
        userIntents: intents ? JSON.parse(intents) : [],
        showTooltips: showTooltips !== null ? showTooltips === 'true' : false,
        tooltipsShown: tooltipsShown ? JSON.parse(tooltipsShown) : [],
      };
    } catch (error) {
      console.error('[Onboarding] Failed to load status:', error);
      return {
        isCompleted: false,
        userIntents: [],
        showTooltips: false,
        tooltipsShown: [],
      };
    }
  }
);

export const completeOnboarding = createAsyncThunk(
  'onboarding/complete',
  async ({ userIntents }: { userIntents: UserIntent[] }) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true'),
        AsyncStorage.setItem(USER_INTENT_STORAGE_KEY, JSON.stringify(userIntents)),
        // Enable tooltips for new users so they see the single tab tip after onboarding
        AsyncStorage.setItem(SHOW_TOOLTIPS_STORAGE_KEY, 'true'),
      ]);
      
      return { userIntents };
    } catch (error) {
      console.error('[Onboarding] Failed to save completion:', error);
      throw error;
    }
  }
);

export const skipOnboarding = createAsyncThunk(
  'onboarding/skip',
  async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true'),
        // Enable tooltips for new users so they see the single tab tip after onboarding
        AsyncStorage.setItem(SHOW_TOOLTIPS_STORAGE_KEY, 'true'),
      ]);
      return true;
    } catch (error) {
      console.error('[Onboarding] Failed to save skip:', error);
      throw error;
    }
  }
);

export const resetOnboarding = createAsyncThunk(
  'onboarding/reset',
  async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY),
        AsyncStorage.removeItem(USER_INTENT_STORAGE_KEY),
        AsyncStorage.removeItem(SHOW_TOOLTIPS_STORAGE_KEY),
        AsyncStorage.removeItem(TOOLTIPS_SHOWN_STORAGE_KEY),
      ]);
      return true;
    } catch (error) {
      console.error('[Onboarding] Failed to reset:', error);
      throw error;
    }
  }
);

export const setShowTooltipsAsync = createAsyncThunk(
  'onboarding/setShowTooltips',
  async (showTooltips: boolean) => {
    try {
      await AsyncStorage.setItem(SHOW_TOOLTIPS_STORAGE_KEY, String(showTooltips));
      return showTooltips;
    } catch (error) {
      console.error('[Onboarding] Failed to save tooltip preference:', error);
      return showTooltips;
    }
  }
);

export const markTooltipShownAsync = createAsyncThunk(
  'onboarding/markTooltipShown',
  async (id: string) => {
    try {
      const existing = await AsyncStorage.getItem(TOOLTIPS_SHOWN_STORAGE_KEY);
      const current: unknown = existing ? JSON.parse(existing) : [];
      const currentIds = Array.isArray(current) ? (current as string[]) : [];

      const nextIds = currentIds.includes(id) ? currentIds : [...currentIds, id];
      await AsyncStorage.setItem(TOOLTIPS_SHOWN_STORAGE_KEY, JSON.stringify(nextIds));
      return nextIds;
    } catch (error) {
      console.error('[Onboarding] Failed to persist tooltip shown state:', error);
      return [id];
    }
  }
);

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    setCurrentStep: (state, action: PayloadAction<OnboardingStep>) => {
      state.currentStep = action.payload;
    },
    addUserIntent: (state, action: PayloadAction<UserIntent>) => {
      if (!state.userIntents.includes(action.payload)) {
        state.userIntents.push(action.payload);
      }
    },
    removeUserIntent: (state, action: PayloadAction<UserIntent>) => {
      state.userIntents = state.userIntents.filter(intent => intent !== action.payload);
    },
    setUserIntents: (state, action: PayloadAction<UserIntent[]>) => {
      state.userIntents = action.payload;
    },
    addSelectedModule: (state, action: PayloadAction<string>) => {
      if (!state.selectedModules.includes(action.payload)) {
        state.selectedModules.push(action.payload);
      }
    },
    setShowTooltips: (state, action: PayloadAction<boolean>) => {
      state.showTooltips = action.payload;
    },
    markTooltipShown: (state, action: PayloadAction<string>) => {
      if (!state.tooltipsShown.includes(action.payload)) {
        state.tooltipsShown.push(action.payload);
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadOnboardingStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadOnboardingStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isOnboardingCompleted = action.payload.isCompleted;
        state.userIntents = action.payload.userIntents;
        state.showTooltips = action.payload.showTooltips;
        state.tooltipsShown = action.payload.tooltipsShown;
      })
      .addCase(loadOnboardingStatus.rejected, (state) => {
        state.isLoading = false;
        state.isOnboardingCompleted = false;
      })
      
      .addCase(completeOnboarding.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(completeOnboarding.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isOnboardingCompleted = true;
        state.currentStep = 'completed';
        state.userIntents = action.payload.userIntents;
        state.showTooltips = true;
      })
      .addCase(completeOnboarding.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to complete onboarding';
      })
      
      .addCase(skipOnboarding.fulfilled, (state) => {
        state.isOnboardingCompleted = true;
        state.currentStep = 'completed';
        state.showTooltips = true;
      })

      .addCase(setShowTooltipsAsync.fulfilled, (state, action) => {
        state.showTooltips = action.payload;
      })

      .addCase(markTooltipShownAsync.fulfilled, (state, action) => {
        state.tooltipsShown = action.payload;
      })
      
      .addCase(resetOnboarding.fulfilled, (state) => {
        state.isOnboardingCompleted = false;
        state.currentStep = 'welcome';
        state.userIntents = [];
        state.selectedModules = [];
        state.showTooltips = true;
        state.tooltipsShown = [];
      });
  },
});

export const {
  setCurrentStep,
  addUserIntent,
  removeUserIntent,
  setUserIntents,
  addSelectedModule,
  setShowTooltips,
  markTooltipShown,
  clearError,
} = onboardingSlice.actions;

export default onboardingSlice.reducer;

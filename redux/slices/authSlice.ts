import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  authService,
  SessionUserBasicResult,
  UserProfile,
  SignInData,
  SignUpData,
  CompleteProfileFromOtpData,
  normalizeAuthEmail,
} from '../../services/authService';
import { normalizeUserLocation } from '../../utils/locationHelpers';
import logger from '../../utils/logger';
import { clearUserScopedData, getUserIdSafe } from '../../services/logoutCleanupService';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  /** True while the signIn thunk is in-flight. Used by RootNavigator to
   *  guard against spurious SIGNED_OUT events during login. Set synchronously
   *  by the reducer (not via useEffect) to avoid timing gaps. */
  isSigningIn: boolean;
  /** True after OTP verification (Supabase signInWithOtp) before profile is complete.
   *  Keeps user in Auth stack on SignUp to collect name, password, etc. */
  otpProfileCompletePending: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start as true to show loading screen until auth check completes
  error: null,
  isSigningIn: false,
  otpProfileCompletePending: false,
};

/**
 * Fast boot-time auth restore: uses locally cached session (no network profile fetch).
 * This prevents blocking the app on slow networks before showing Login/Home.
 */
export const restoreSessionUser = createAsyncThunk('auth/restoreSessionUser', async () => {
  const startTime = Date.now();
  const overallTimeoutMs = 8000;
  const retryDelayMs = 250;
  let lastStatus: SessionUserBasicResult['status'] | 'timeout' | undefined;
  let lastErrorMessage: string | undefined;

  const runAttempt = async (timeoutMs: number) => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<{ status: 'timeout' }>((resolve) => {
      timeoutId = setTimeout(() => resolve({ status: 'timeout' }), timeoutMs);
    });

    const result = await Promise.race([authService.getSessionUserBasicResult(), timeoutPromise]).finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
    });

    return result;
  };

  // Attempt 1 (short): avoids hanging boot on rare storage stalls.
  const attempt1 = await runAttempt(2500);
  if (attempt1.status === 'ok') {
    logger.debug('[Auth] restoreSessionUser restored session (attempt 1)', {
      durationMs: Date.now() - startTime,
      userId: attempt1.user.id,
    });
    return attempt1.user;
  }
  if (attempt1.status === 'no_session' || attempt1.status === 'not_configured') {
    logger.debug('[Auth] restoreSessionUser no session (attempt 1)', {
      durationMs: Date.now() - startTime,
      status: attempt1.status,
    });
    return null;
  }

  // If we timed out or hit a transient error on a cold start, retry once.
  lastStatus = attempt1.status;
  lastErrorMessage = attempt1.status === 'error' ? attempt1.message : undefined;

  const elapsedAfterAttempt1 = Date.now() - startTime;
  const remainingMs = overallTimeoutMs - elapsedAfterAttempt1;
  if (remainingMs <= 0) {
    logger.debug('[Auth] restoreSessionUser gave up (no time remaining)', {
      durationMs: elapsedAfterAttempt1,
      lastStatus,
      lastErrorMessage,
    });
    return null;
  }

  // Small delay allows Supabase/AsyncStorage to finish initializing on some cold starts.
  await new Promise((resolve) => setTimeout(resolve, Math.min(retryDelayMs, remainingMs)));

  const elapsedBeforeAttempt2 = Date.now() - startTime;
  const attempt2TimeoutMs = Math.max(0, overallTimeoutMs - elapsedBeforeAttempt2);
  const attempt2 = await runAttempt(attempt2TimeoutMs);

  lastStatus = attempt2.status;
  lastErrorMessage = attempt2.status === 'error' ? attempt2.message : undefined;

  if (attempt2.status === 'ok') {
    logger.debug('[Auth] restoreSessionUser restored session (attempt 2)', {
      durationMs: Date.now() - startTime,
      userId: attempt2.user.id,
    });
    return attempt2.user;
  }

  logger.debug('[Auth] restoreSessionUser completed without session', {
    durationMs: Date.now() - startTime,
    status: attempt2.status,
    errorMessage: lastErrorMessage,
  });

  return null;
});

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Async thunks
export const completeProfileFromOtp = createAsyncThunk(
  'auth/completeProfileFromOtp',
  async (data: CompleteProfileFromOtpData, { rejectWithValue }) => {
    try {
      const result = await authService.completeProfileFromOtp(data);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to complete profile';
      return rejectWithValue(msg);
    }
  }
);

export const signUp = createAsyncThunk(
  'auth/signUp',
  async (signUpData: SignUpData, { rejectWithValue }) => {
    try {
      const { data, error } = await withTimeout(
        authService.signUp(signUpData),
        25000,
        'Sign up timed out. Please check your connection and try again.'
      );
      if (error) throw error;
      return data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      return rejectWithValue(errorMessage);
    }
  }
);

export const signIn = createAsyncThunk(
  'auth/signIn',
  async (signInData: SignInData, { rejectWithValue }) => {
    try {
      const timeoutMs = 25000;
      const graceMs = 4000;
      const intendedEmail = normalizeAuthEmail(signInData.email);
      const signInPromise = authService.signIn(signInData);
      const timeoutPromise = new Promise<'timeout'>((resolve) => {
        setTimeout(() => resolve('timeout'), timeoutMs);
      });

      const racedResult = await Promise.race([signInPromise, timeoutPromise]);

      if (racedResult === 'timeout') {
        // Avoid unhandled rejections if the sign-in promise resolves later.
        signInPromise.catch(() => {});

        // If a session is already established, allow login to proceed without error.
        const sessionUser = await authService.getSessionUserBasic();
        if (sessionUser && normalizeAuthEmail(sessionUser.email) === intendedEmail) {
          return sessionUser;
        }

        // Short grace period to allow slow network sign-in to finalize.
        await delay(graceMs);
        const sessionUserAfter = await authService.getSessionUserBasic();
        if (sessionUserAfter && normalizeAuthEmail(sessionUserAfter.email) === intendedEmail) {
          return sessionUserAfter;
        }

        throw new Error('Sign in timed out. Please check your connection and try again.');
      }

      const { data, error } = racedResult;

      if (error) {
        const errorMessage = typeof error === 'object' && error !== null && 'message' in error 
          ? (error as { message: string }).message 
          : 'Sign in failed';
        throw new Error(errorMessage);
      }
      
      if (!data?.user) {
        throw new Error('Login failed. Please try again.');
      }
      
      // SIMPLIFIED APPROACH: Just return basic user profile from auth data
      // The SIGNED_IN event will trigger getCurrentUser() to fetch full profile
      // This prevents the signIn thunk from hanging
      const registeredLocation = normalizeUserLocation(data.user.user_metadata);
      const basicUser = {
        id: data.user.id,
        email: data.user.email || signInData.email,
        fullName: data.user.user_metadata?.full_name || 'User',
        phoneNumber: data.user.user_metadata?.phone || '',
        profileImageUrl: null,
        location: registeredLocation,
        kycStatus: 'pending' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      return basicUser;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      return rejectWithValue(errorMessage);
    }
  }
);

export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth?: { user?: UserProfile | null } };
      const userId = getUserIdSafe(state.auth?.user);

      // Clear all user-scoped local storage/caches before signing out so the next
      // login (especially on shared devices) can't inherit stale state.
      await clearUserScopedData({ reason: 'logout', userId, mode: 'full' });
      
      const { error } = await authService.signOut();
      if (error) {
        // If server-side revocation fails but the local session is already cleared,
        // allow logout to succeed so the user can sign in again.
        const stillHasSession = !!(await authService.getSessionUserBasic());
        if (stillHasSession) {
          throw error;
        }
      }
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      return rejectWithValue(errorMessage);
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async () => {
    try {
      const traceId = `auth_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const timeoutsMs = [18000, 10000];
      const baseBackoffMs = 800;

      for (let attemptIndex = 0; attemptIndex < timeoutsMs.length; attemptIndex += 1) {
        const attempt = attemptIndex + 1;
        const timeoutMs = timeoutsMs[attemptIndex];
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        let didTimeout = false;
        const startTime = Date.now();

        const timeoutPromise = new Promise<null>((resolve) => {
          timeoutId = setTimeout(() => {
            didTimeout = true;
            if (__DEV__) {
              console.log(
                `[getCurrentUser][${traceId}] Timeout reached (${timeoutMs}ms) on attempt ${attempt}`
              );
            }
            resolve(null);
          }, timeoutMs);
        });

        const authCheck = authService.getCurrentUser({ traceId }).finally(() => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
        });

        const user = await Promise.race([authCheck, timeoutPromise]);

        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (__DEV__) {
          console.log(
            `[getCurrentUser][${traceId}] Attempt ${attempt} finished in ${Date.now() - startTime}ms:`,
            user ? 'User found' : 'No user'
          );
        }

        if (user) {
          return user;
        }

        // Only retry when we timed out (avoid retrying for missing sessions).
        if (!didTimeout) {
          return null;
        }

        if (attemptIndex < timeoutsMs.length - 1) {
          const delayMs = baseBackoffMs * Math.pow(2, attemptIndex);
          if (__DEV__) {
            console.log(`[getCurrentUser][${traceId}] Retrying after ${delayMs}ms`);
          }
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      return null;
    } catch (error) {
      if (__DEV__) {
        console.error('[getCurrentUser] Error:', error);
      }
      return null;
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (updates: Partial<UserProfile>, { rejectWithValue }) => {
    try {
      const { data, error } = await authService.updateProfile(updates);
      if (error) throw error;
      
      // Transform snake_case from database to camelCase for app
      if (data && 'profile_image_url' in data) {
        return {
          ...updates,
          profileImageUrl: (data as any).profile_image_url,
          fullName: (data as any).full_name || updates.fullName,
          phoneNumber: (data as any).phone || updates.phoneNumber,
        };
      }
      
      return updates;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      return rejectWithValue(errorMessage);
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (email: string, { rejectWithValue }) => {
    try {
      const { data, error } = await withTimeout(
        authService.resetPassword(email),
        20000,
        'Password reset timed out. Please check your connection and try again.'
      );
      if (error) throw error;
      return data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      return rejectWithValue(errorMessage);
    }
  }
);

// REMOVED: Demo mode login for production security
// Demo authentication bypasses security measures and should not be used in production

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<UserProfile | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.isLoading = false;
    },
    setOtpProfileCompletePending: (state, action: PayloadAction<boolean>) => {
      state.otpProfileCompletePending = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Restore Session User (fast boot-time restore)
      .addCase(restoreSessionUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(restoreSessionUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
      })
      .addCase(restoreSessionUser.rejected, (state) => {
        state.isLoading = false;
        state.error = null;
        state.user = null;
        state.isAuthenticated = false;
      })

      // Sign Up
      .addCase(signUp.pending, (state) => {
        state.isLoading = true;
        state.isSigningIn = true; // Guard against SIGNED_OUT events during signup flow
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state) => {
        state.isLoading = false;
        state.isSigningIn = false;
        state.error = null;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.isLoading = false;
        state.isSigningIn = false;
        state.error = action.payload as string;
      })
      .addCase(completeProfileFromOtp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(completeProfileFromOtp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
        state.otpProfileCompletePending = false;
      })
      .addCase(completeProfileFromOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Sign In
      .addCase(signIn.pending, (state) => {
        state.isLoading = true;
        state.isSigningIn = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSigningIn = false;
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
        state.error = null;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.isLoading = false;
        state.isSigningIn = false;
        state.error = action.payload as string;
        // CRITICAL FIX: Do NOT wipe user/isAuthenticated if a valid user was
        // already set by a concurrent SIGNED_IN auth event (via getCurrentUser).
        // The Supabase session may have been established in the background even
        // though the signIn thunk timed out.  On app restart the persisted
        // session would log the user in — this fix makes the UI match immediately.
        if (!state.user) {
          state.isAuthenticated = false;
        }
      })
      
      // Sign Out
      .addCase(signOut.pending, (state) => {
        // Don't set isLoading to true - sign out should be instant without spinners
        state.isLoading = false;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Get Current User
      .addCase(getCurrentUser.pending, (state) => {
        // Only set loading if we don't already have a user
        // This prevents infinite loading when fetching user after successful sign-in
        if (!state.user) {
          state.isLoading = true;
        }
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;

        if (action.payload) {
          // Successful fetch - always trust the latest profile
          state.user = action.payload;
          state.isAuthenticated = true;
        } else if (!state.user) {
          // Only clear auth state if we *don't* already have a user.
          // This prevents temporary network/profile issues from logging out an active user.
          state.user = null;
          state.isAuthenticated = false;
        }
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.isLoading = false;
        state.error = null;
        // DON'T clear user/auth state if we already have a user
        // This prevents clearing the session if background profile fetch fails
        if (!state.user) {
          state.isAuthenticated = false;
          state.user = null;
        }
      })
      
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.user && action.payload) {
          state.user = { ...state.user, ...action.payload };
        }
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Reset Password
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setUser, setOtpProfileCompletePending } = authSlice.actions;
export default authSlice.reducer;

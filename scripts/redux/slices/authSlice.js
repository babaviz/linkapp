"use strict";
let _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUser = exports.clearError = exports.loginAsDemo = exports.resetPassword = exports.updateProfile = exports.getCurrentUser = exports.signOut = exports.signIn = exports.signUp = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const authService_1 = require("../../services/authService");
const initialState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
};
// Async thunks
exports.signUp = (0, toolkit_1.createAsyncThunk)('auth/signUp', async (signUpData, { rejectWithValue }) => {
    try {
        const { data, error } = await authService_1.authService.signUp(signUpData);
        if (error)
            throw error;
        return data;
    }
    catch (error) {
        return rejectWithValue(error.message || 'Sign up failed');
    }
});
exports.signIn = (0, toolkit_1.createAsyncThunk)('auth/signIn', async (signInData, { rejectWithValue }) => {
    try {
        
        const { data, error } = await authService_1.authService.signIn(signInData);
        
        if (error)
            throw error;
        // For demo mode, return demo user directly
        if (signInData.email === 'demo@test.com' && data?.user?.id === 'demo-user-123') {
            
            return {
                id: 'demo-user-123',
                email: 'demo@test.com',
                fullName: 'Demo User',
                phoneNumber: '+254700000000',
                profileImageUrl: null,
                location: {
                    county: 'Nairobi',
                    town: 'Nairobi',
                },
                kycStatus: 'pending',
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
        }
        // Get user profile after successful sign in for real users
        const user = await authService_1.authService.getCurrentUser();
        
        return user;
    }
    catch (error) {
        
        return rejectWithValue(error.message || 'Sign in failed');
    }
});
exports.signOut = (0, toolkit_1.createAsyncThunk)('auth/signOut', async (_, { rejectWithValue }) => {
    try {
        const { error } = await authService_1.authService.signOut();
        if (error)
            throw error;
        return true;
    }
    catch (error) {
        return rejectWithValue(error.message || 'Sign out failed');
    }
});
exports.getCurrentUser = (0, toolkit_1.createAsyncThunk)('auth/getCurrentUser', async (_, { rejectWithValue }) => {
    try {
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                
                resolve(null);
            }, 3000);
        });
        // Race between the actual auth check and timeout
        const user = await Promise.race([
            authService_1.authService.getCurrentUser(),
            timeoutPromise
        ]);
        
        // Return user if found, otherwise null (will show auth screens)
        return user;
    }
    catch (error) {
        
        // Return null to show auth screens instead of auto-creating demo user
        return null;
    }
});
exports.updateProfile = (0, toolkit_1.createAsyncThunk)('auth/updateProfile', async (updates, { rejectWithValue }) => {
    try {
        const { data, error } = await authService_1.authService.updateProfile(updates);
        if (error)
            throw error;
        return data;
    }
    catch (error) {
        return rejectWithValue(error.message || 'Profile update failed');
    }
});
exports.resetPassword = (0, toolkit_1.createAsyncThunk)('auth/resetPassword', async (email, { rejectWithValue }) => {
    try {
        const { data, error } = await authService_1.authService.resetPassword(email);
        if (error)
            throw error;
        return data;
    }
    catch (error) {
        return rejectWithValue(error.message || 'Password reset failed');
    }
});
// Demo mode login - explicitly triggered by user
exports.loginAsDemo = (0, toolkit_1.createAsyncThunk)('auth/loginAsDemo', async () => {
    
    const demoUser = {
        id: 'demo-user-123',
        email: 'demo@mynyumbapp.com',
        fullName: 'Demo User',
        phoneNumber: '+254700000000',
        location: {
            county: 'Nairobi',
            town: 'Nairobi',
        },
        profileImageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        kycStatus: 'pending',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    return demoUser;
});
const authSlice = (0, toolkit_1.createSlice)({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        setUser: (state, action) => {
            state.user = action.payload;
            state.isAuthenticated = !!action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // Sign Up
            .addCase(exports.signUp.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.signUp.fulfilled, (state) => {
            state.isLoading = false;
            state.error = null;
        })
            .addCase(exports.signUp.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        })
            // Sign In
            .addCase(exports.signIn.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.signIn.fulfilled, (state, action) => {
            
            state.isLoading = false;
            state.user = action.payload;
            state.isAuthenticated = !!action.payload;
            state.error = null;
            
        })
            .addCase(exports.signIn.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
            state.isAuthenticated = false;
            state.user = null;
        })
            // Sign Out
            .addCase(exports.signOut.pending, (state) => {
            state.isLoading = true;
        })
            .addCase(exports.signOut.fulfilled, (state) => {
            state.isLoading = false;
            state.user = null;
            state.isAuthenticated = false;
            state.error = null;
        })
            .addCase(exports.signOut.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        })
            // Get Current User
            .addCase(exports.getCurrentUser.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.getCurrentUser.fulfilled, (state, action) => {
            state.isLoading = false;
            state.user = action.payload;
            state.isAuthenticated = !!action.payload;
            state.error = null;
        })
            .addCase(exports.getCurrentUser.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
            state.isAuthenticated = false;
            state.user = null;
        })
            // Update Profile
            .addCase(exports.updateProfile.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.updateProfile.fulfilled, (state, action) => {
            state.isLoading = false;
            if (state.user && action.payload) {
                state.user = { ...state.user, ...action.payload };
            }
        })
            .addCase(exports.updateProfile.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        })
            // Reset Password
            .addCase(exports.resetPassword.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.resetPassword.fulfilled, (state) => {
            state.isLoading = false;
            state.error = null;
        })
            .addCase(exports.resetPassword.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload;
        })
            // Demo Mode Login
            .addCase(exports.loginAsDemo.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        })
            .addCase(exports.loginAsDemo.fulfilled, (state, action) => {
            state.isLoading = false;
            state.user = action.payload;
            state.isAuthenticated = true;
            state.error = null;
            
        })
            .addCase(exports.loginAsDemo.rejected, (state, action) => {
            state.isLoading = false;
            state.error = 'Failed to activate demo mode';
        });
    },
});
_a = authSlice.actions, exports.clearError = _a.clearError, exports.setUser = _a.setUser;
exports.default = authSlice.reducer;

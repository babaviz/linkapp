"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const supabaseClient_1 = require("./supabaseClient");
const rateLimiter_1 = require("../utils/rateLimiter");
class AuthService {
    // Sign up new user
    async signUp({ email, password, fullName, phone }) {
        try {
            
            ());
            // Check rate limit
            const identifier = (0, rateLimiter_1.getUserIdentifier)(email);
            const rateLimitCheck = rateLimiter_1.signupRateLimiter.checkLimit(identifier);
            if (!rateLimitCheck.allowed) {
                const message = (0, rateLimiter_1.formatRetryMessage)(rateLimitCheck.retryAfter || 0);
                throw new Error(`Too many signup attempts. ${message}`);
            }
            // Check if Supabase is properly configured
            if (!(0, supabaseClient_1.isSupabaseConfigured)()) {
                
                throw new Error('Unable to connect to authentication service. Please check your internet connection and try again.');
            }
            // Create auth user with metadata (following official Supabase pattern)
            const { data, error } = await supabaseClient_1.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        phone: phone,
                    },
                    // Set redirect URL for email verification
                    emailRedirectTo: 'mynyumbapp://auth/callback',
                },
            });
            if (error) {
                
                // Provide more user-friendly error messages
                if (error.message.includes('fetch failed') || error.message.includes('network')) {
                    throw new Error('Network connection failed. Please check your internet connection and try again.');
                }
                if (error.message.includes('User already registered')) {
                    throw new Error('An account with this email already exists. Please try signing in instead.');
                }
                throw error;
            }
            
            // Reset rate limit on successful signup
            rateLimiter_1.signupRateLimiter.reset(identifier);
            // Only create user profile if we have a user and session
            // Note: If email confirmation is required, data.user will exist but data.session will be null
            if (data.user) {
                // For email confirmation flow, we might not have a session yet
                if (!data.session) {
                    
                    return { data, error: null };
                }
                // Create user profile in our custom users table
                const { error: profileError } = await supabaseClient_1.supabase
                    .from('users')
                    .insert({
                    id: data.user.id,
                    email,
                    full_name: fullName,
                    phone,
                    kyc_status: 'pending',
                    creator_verification_status: 'unverified',
                });
                if (profileError) {
                    
                    // Provide user-friendly error for profile creation
                    if (profileError.message.includes('fetch failed') || profileError.message.includes('network')) {
                        throw new Error('Network connection failed while creating your profile. Please check your internet connection and try again.');
                    }
                    // If user already exists in our table, that's okay
                    if (!profileError.message.includes('duplicate key value')) {
                        throw profileError;
                    }
                }
                
            }
            return { data, error: null };
        }
        catch (error) {
            
            // Handle network-related errors with user-friendly messages
            if (error.message.includes('fetch failed') ||
                error.message.includes('ENOTFOUND') ||
                error.message.includes('network') ||
                error.cause?.code === 'ENOTFOUND') {
                return {
                    data: null,
                    error: { message: 'Network connection failed. Please check your internet connection and try again.' }
                };
            }
            return { data: null, error };
        }
    }
    // Sign in existing user
    async signIn({ email, password }) {
        try {
            
            ());
            // Check rate limit
            const identifier = (0, rateLimiter_1.getUserIdentifier)(email);
            const rateLimitCheck = rateLimiter_1.loginRateLimiter.checkLimit(identifier);
            if (!rateLimitCheck.allowed) {
                const message = (0, rateLimiter_1.formatRetryMessage)(rateLimitCheck.retryAfter || 0);
                
                throw new Error(`Too many login attempts. ${message}`);
            }
            // Demo mode bypass for testing - always check for demo credentials first
            if (email === 'demo@test.com' && password === 'demo123') {
                
                return {
                    data: {
                        user: {
                            id: 'demo-user-123',
                            email: 'demo@test.com',
                            user_metadata: {
                                full_name: 'Demo User'
                            }
                        },
                        session: {
                            access_token: 'demo-token',
                            refresh_token: 'demo-refresh-token'
                        }
                    },
                    error: null
                };
            }
            // Only try Supabase auth if configured
            if (!(0, supabaseClient_1.isSupabaseConfigured)()) {
                
                return {
                    data: null,
                    error: { message: 'Invalid login credentials' }
                };
            }
            const { data, error } = await supabaseClient_1.supabase.auth.signInWithPassword({
                email,
                password,
            });
            
            // Reset rate limit on successful login
            if (!error && data) {
                rateLimiter_1.loginRateLimiter.reset(identifier);
            }
            return { data, error };
        }
        catch (error) {
            
            return { data: null, error };
        }
    }
    // Sign out current user
    async signOut() {
        try {
            const { error } = await supabaseClient_1.supabase.auth.signOut();
            return { error };
        }
        catch (error) {
            return { error };
        }
    }
    // Get current user profile
    async getCurrentUser() {
        try {
            const { data: authUser } = await supabaseClient_1.supabase.auth.getUser();
            // Check if this is our demo user
            if (authUser.user && authUser.user.id === 'demo-user-123') {
                
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
            // If Supabase is not configured and no demo user, return null
            if (!(0, supabaseClient_1.isSupabaseConfigured)()) {
                
                return null;
            }
            if (!authUser.user)
                return null;
            const { data: profile, error } = await supabaseClient_1.supabase
                .from('users')
                .select('*')
                .eq('id', authUser.user.id)
                .single();
            if (error || !profile)
                return null;
            return {
                id: profile.id,
                email: profile.email,
                fullName: profile.full_name || '',
                phoneNumber: profile.phone || '',
                profileImageUrl: profile.profile_image_url || null,
                location: {
                    county: profile.location_preferences?.county || 'Nairobi',
                    town: profile.location_preferences?.town || 'Nairobi',
                },
                kycStatus: (profile.kyc_status || 'pending'),
                isActive: profile.is_active || true,
                createdAt: profile.created_at || new Date().toISOString(),
                updatedAt: profile.updated_at || new Date().toISOString(),
            };
        }
        catch (error) {
            
            return null;
        }
    }
    // Update user profile
    async updateProfile(updates) {
        try {
            const { data: authUser } = await supabaseClient_1.supabase.auth.getUser();
            if (!authUser.user)
                throw new Error('No authenticated user');
            const updateData = {};
            if (updates.fullName !== undefined)
                updateData.full_name = updates.fullName;
            if (updates.phoneNumber !== undefined)
                updateData.phone = updates.phoneNumber;
            if (updates.profileImageUrl !== undefined)
                updateData.profile_image_url = updates.profileImageUrl;
            const { data, error } = await supabaseClient_1.supabase
                .from('users')
                .update(updateData)
                .eq('id', authUser.user.id)
                .select()
                .single();
            return { data, error };
        }
        catch (error) {
            return { data: null, error };
        }
    }
    // Reset password
    async resetPassword(email) {
        try {
            // Check rate limit
            const identifier = (0, rateLimiter_1.getUserIdentifier)(email);
            const rateLimitCheck = rateLimiter_1.passwordResetRateLimiter.checkLimit(identifier);
            if (!rateLimitCheck.allowed) {
                const message = (0, rateLimiter_1.formatRetryMessage)(rateLimitCheck.retryAfter || 0);
                throw new Error(`Too many password reset attempts. ${message}`);
            }
            const { data, error } = await supabaseClient_1.supabase.auth.resetPasswordForEmail(email);
            // Reset rate limit on success
            if (!error) {
                rateLimiter_1.passwordResetRateLimiter.reset(identifier);
            }
            return { data, error };
        }
        catch (error) {
            return { data: null, error };
        }
    }
    // Phone verification for Date Mi (18+ requirement)
    async initiatePhoneVerification(phone) {
        // Implementation will depend on SMS service provider
        // This is a placeholder for the verification logic
        try {
            // Send SMS verification code
            // Integration with SMS service (e.g., Twilio, AWS SNS)
            return { success: true, error: null };
        }
        catch (error) {
            return { success: false, error };
        }
    }
    // Age verification for Date Mi feature
    async submitAgeVerification(documentData) {
        try {
            const { data: authUser } = await supabaseClient_1.supabase.auth.getUser();
            if (!authUser.user)
                throw new Error('No authenticated user');
            // Store age verification data (secure handling required)
            const verificationData = {
                user_id: authUser.user.id,
                document_type: documentData.documentType,
                document_number: documentData.documentNumber, // Should be encrypted
                date_of_birth: documentData.dateOfBirth,
                document_image_url: documentData.documentImageUrl,
                verification_status: 'pending',
            };
            const { data, error } = await supabaseClient_1.supabase
                .from('age_verifications')
                .insert(verificationData);
            return { data, error };
        }
        catch (error) {
            return { data: null, error };
        }
    }
    // Listen to auth state changes
    onAuthStateChange(callback) {
        return supabaseClient_1.supabase.auth.onAuthStateChange(callback);
    }
    // Test Supabase connection
    async testConnection() {
        try {
            if (!(0, supabaseClient_1.isSupabaseConfigured)()) {
                return {
                    success: false,
                    message: 'Supabase not configured. Please add your credentials to .env file.'
                };
            }
            // Test database connection by querying users table
            const { count, error } = await supabaseClient_1.supabase
                .from('users')
                .select('*', { count: 'exact', head: true });
            if (error) {
                return {
                    success: false,
                    message: `Database connection failed: ${error.message}`
                };
            }
            return {
                success: true,
                message: `Supabase connected successfully! Database has ${count || 0} users.`
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Connection test failed: ${error.message}`
            };
        }
    }
}
exports.authService = new AuthService();

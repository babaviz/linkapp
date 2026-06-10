import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import userSlice from './slices/userSlice';
import propertySlice from './slices/propertySlice';
import messageSlice from './slices/messageSlice';
import chatSlice from './slices/chatSlice';
import callSlice from './slices/callSlice';
import jobSlice from './slices/jobSlice';
import serviceSlice from './slices/serviceSlice';
import datemiSlice from './slices/datemiSlice';
import searchSlice from './slices/searchSlice';
import paymentSlice from './slices/paymentSlice';
import moderationSlice from './slices/moderationSlice';
import locationSlice from './slices/locationSlice';
import notificationSlice from './slices/notificationSlice';
import subscriptionSlice from './slices/subscriptionSlice';
import onboardingSlice from './slices/onboardingSlice';
import { propertyApi } from './api/propertyApi';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    user: userSlice,
    property: propertySlice,
    message: messageSlice,
    chat: chatSlice,
    call: callSlice,
    jobs: jobSlice,
    services: serviceSlice,
    datemi: datemiSlice,
    search: searchSlice,
    payment: paymentSlice,
    moderation: moderationSlice,
    location: locationSlice,
    notifications: notificationSlice,
    subscription: subscriptionSlice,
    onboarding: onboardingSlice,
    // RTK Query API reducers
    [propertyApi.reducerPath]: propertyApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
        ],
        ignoredPaths: [
        ],
        // Custom function to detect non-serializable values
        isSerializable: (value: any) => {
          // Allow Date objects as they can be serialized
          if (value instanceof Date) return true;
          // Check for functions, Maps, Sets, etc.
          if (typeof value === 'function') return false;
          if (value instanceof Map) return false;
          if (value instanceof Set) return false;
          if (value && typeof value === 'object' && value.constructor !== Object && value.constructor !== Array) {
            // Allow plain objects and arrays, reject others
            return false;
          }
          return true;
        },
      },
    })
    // Add RTK Query middleware
    .concat(propertyApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

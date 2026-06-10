// Ambient declarations to use EXPO_PUBLIC_* env vars in RN TypeScript
// These are replaced at build time by Expo for variables starting with EXPO_PUBLIC_
declare var process: {
  env: {
    EXPO_PUBLIC_NOTIFICATIONS_DISABLED?: string;
    EXPO_PUBLIC_NOTIFICATIONS_MODE?: 'disabled' | 'firebase' | 'expo' | 'minimal';
    // Firebase public config (available at build-time)
    EXPO_PUBLIC_FIREBASE_API_KEY?: string;
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
    EXPO_PUBLIC_FIREBASE_PROJECT_ID?: string;
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?: string;
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?: string;
    EXPO_PUBLIC_FIREBASE_APP_ID?: string;
    EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID?: string;
    [key: string]: string | undefined;
  };
};

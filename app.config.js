require('dotenv').config();

// Determine environment for config/build behavior
const appEnvRaw = process.env.EXPO_PUBLIC_APP_ENV;
const isProduction = appEnvRaw === 'production' || process.env.NODE_ENV === 'production' || process.env.EAS_BUILD_PROFILE === 'production';
const appEnv = appEnvRaw || (isProduction ? 'production' : 'development');

// Expo Updates: disable in local development to avoid the "loads, then reloads again"
// behavior caused by update checks/downloads + restart.
const enableUpdates = isProduction || ['staging', 'preview', 'testing'].includes(appEnv);
const updatesChannel = isProduction ? 'production' : appEnv;

module.exports = {
  expo: {
    name: "LinkApp",
    slug: "link_app",
    owner: "softeria-tech-limited",
    version: "1.0.2",
    newArchEnabled: true,
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#2E3A8C"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    // iOS configuration - currently disabled but ready for when iOS is enabled
    ios: {
      supportsTablet: true,
      bundleIdentifier: "co.linkapp.android",
      googleServicesFile: "./GoogleService-Info.plist",
      infoPlist: {
        UIBackgroundModes: ["remote-notification", "fetch", "processing", "voip"],
        NSCameraUsageDescription: "This app uses the camera for video calls and to let you upload property and profile images.",
        NSMicrophoneUsageDescription: "This app needs microphone access for video calls and voice messages.",
        NSLocationWhenInUseUsageDescription: "This app uses your location to show nearby properties and services.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "This app uses your location to show nearby properties and services, even when the app is in the background.",
        NSPhotoLibraryUsageDescription: "This app accesses your photos to let you upload property and profile images.",
        NSPhotoLibraryAddUsageDescription: "This app needs access to save photos you take or select.",
        NSContactsUsageDescription: "This app accesses your contacts to help you connect with friends and share referrals.",
        NSUserTrackingUsageDescription: "This app uses tracking to provide personalized content and improve your experience."
      },
      buildNumber: "1",
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryFileTimestamp",
            NSPrivacyAccessedAPITypeReasons: ["C617.1"]
          },
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategorySystemBootTime",
            NSPrivacyAccessedAPITypeReasons: ["35F9.1"]
          }
        ]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      package: "co.linkapp.android",
      versionCode: 13,
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "CAMERA",
        "RECORD_AUDIO",
        "MODIFY_AUDIO_SETTINGS",
        "ACCESS_NETWORK_STATE",
        "CHANGE_NETWORK_STATE",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "READ_MEDIA_IMAGES",
        "READ_MEDIA_VIDEO",
        "RECEIVE_BOOT_COMPLETED",
        "WAKE_LOCK",
        "POST_NOTIFICATIONS",
        "INTERNET",
        "VIBRATE",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION",
        "FOREGROUND_SERVICE_MICROPHONE",
        "FOREGROUND_SERVICE_CAMERA",
        "BLUETOOTH_CONNECT",
        "USE_FULL_SCREEN_INTENT"
      ],
      googleServicesFile: "./google-services.json",
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      },
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "link-app.co",
              pathPrefix: "/"
            },
            {
              scheme: "linkapp"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    scheme: "linkapp",
    // Privacy Policy and Terms URLs (required for app store submissions)
    privacy: "public",
    privacyPolicyUrl: "https://link-app.co/privacy",
    termsOfServiceUrl: "https://link-app.co/terms",
    // Deep linking configuration
    linking: {
      scheme: "linkapp",
      prefixes: [
        "linkapp://",
        "https://link-app.co",
        "https://linkapp.com"
      ],
      config: {
        screens: {
          // Auth screens - handle deep links for authentication flows
          Login: "auth/login",
          SignUp: "auth/signup",
          ForgotPassword: "auth/forgot-password",
          EmailVerification: "auth/callback",
          ResetPassword: "auth/reset-password",
          
          // Main app screens
          MainTabs: {
            screens: {
              PropertyHub: "properties",
              JobsMain: "jobs",
              ServicesMain: "services",
              DateMiMain: "datemi",
              ProfileMain: "profile"
            }
          },
          PropertyDetails: {
            path: "property/:propertyId",
            parse: {
              propertyId: (propertyId) => propertyId
            }
          },
          JobDetails: {
            path: "job/:jobId",
            parse: {
              jobId: (jobId) => jobId
            }
          },
          ServiceDetails: {
            path: "service/:serviceId",
            parse: {
              serviceId: (serviceId) => serviceId
            }
          },
          ProfileView: {
            path: "profile/:profileId",
            parse: {
              profileId: (profileId) => profileId
            }
          },
          Chat: {
            path: "chat/:chatId?",
            parse: {
              chatId: (chatId) => chatId || undefined
            }
          },
          Search: {
            path: "search/:type?",
            parse: {
              type: (type) => type || undefined
            }
          },
          Filter: {
            path: "filter/:category?",
            parse: {
              category: (category) => category || undefined
            }
          },
          Settings: "settings",
          Notifications: "notifications",
          EditProfile: "profile/edit",
          PaymentScreen: "payment",
          BookService: "book/:serviceId",
          MapView: "map"
        }
      }
    },
    plugins: [
      "@react-native-firebase/app",
      "@react-native-firebase/crashlytics",
      "expo-dev-client",
      "expo-font",
      "expo-secure-store",
      "expo-video",
      [
        "@stream-io/video-react-native-sdk",
        {
          // Enables the native Noise Cancellation module (Krisp) integration.
          // Requires `@stream-io/noise-cancellation-react-native`.
          addNoiseCancellation: true,
          ringingPushNotifications: {
            disableVideoIos: false,
            includesCallsInRecentsIos: false,
            showWhenLockedAndroid: true
          },
          // NOTE: enabling this requires @notifee/react-native
          androidKeepCallAlive: false
        }
      ],
      [
        "@config-plugins/react-native-webrtc",
        {
          cameraPermission: "$(PRODUCT_NAME) requires camera access in order to capture and transmit video",
          microphonePermission: "$(PRODUCT_NAME) requires microphone access in order to capture and transmit audio"
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png"
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow LinkApp to use your location to show nearby properties and services.",
          isAndroidBackgroundLocationEnabled: true
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Allow LinkApp to access your photos to upload property and profile images.",
          cameraPermission: "Allow LinkApp to access your camera to take property and profile images.",
          // Android 13+ permissions
          mediaLibraryPermission: "Allow LinkApp to access your media library to upload property and profile images."
        }
      ],
      [
        "expo-build-properties",
        {
          "android": {
            "minSdkVersion": 24,
            "compileSdkVersion": 35,
            "targetSdkVersion": 35,
            "buildToolsVersion": "35.0.0",
            "namespace": "co.linkapp.android",
            "newArchEnabled": true,
            "useLegacyPackaging": false,
            "buildArchs": ["armeabi-v7a", "arm64-v8a", "x86", "x86_64"],
            "extraMavenRepos": [
              "https://central.sonatype.com/repository/maven-snapshots/",
              "https://oss.sonatype.org/content/repositories/snapshots/",
              "https://jitpack.io",
              "https://maven.getstream.io/releases",
              "https://maven.google.com"
            ],
            "packagingOptions": {
              "pickFirsts": [
                "**/libc++_shared.so",
                "**/libjsc.so",
                "**/libfbjni.so"
              ]
            }
          },
          "ios": {
            "deploymentTarget": "15.1",
            "newArchEnabled": true
          }
        }
      ],
      "./plugins/withFirebaseNotificationsFix",
      "./plugins/withRemoveUseProguard",
      ["@react-native-google-signin/google-signin", {
        "iosUrlScheme": "com.googleusercontent.apps.324566167513-olp8063e9gn29i4lumui05dkdpfltqqu"
      }]
    ],
    extra: {
      eas: {
        projectId: "8700afe0-1c60-4cee-ae6e-2af5d3bf3241"
      },
      // Make environment variables available to the app
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_APP_ENV: appEnv,
      EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
      EXPO_PUBLIC_PAYMENT_API_KEY: process.env.EXPO_PUBLIC_PAYMENT_API_KEY,
      EXPO_PUBLIC_STREAM_CHAT_API_KEY: process.env.EXPO_PUBLIC_STREAM_CHAT_API_KEY,
      EXPO_PUBLIC_STREAM_VIDEO_API_KEY: process.env.EXPO_PUBLIC_STREAM_VIDEO_API_KEY,
      // Paystack Configuration
      EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY: process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY,
      EXPO_PUBLIC_PAYSTACK_SECRET_KEY: process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY,
      EXPO_PUBLIC_APP_URL: process.env.EXPO_PUBLIC_APP_URL || 'https://link-app.co',
      // Notifications mode for builds: 'firebase' | 'expo' | 'minimal' | 'disabled'
      EXPO_PUBLIC_NOTIFICATIONS_MODE: process.env.EXPO_PUBLIC_NOTIFICATIONS_MODE || (isProduction ? 'firebase' : 'disabled'),
      EXPO_PUBLIC_NOTIFICATIONS_DISABLED: process.env.EXPO_PUBLIC_NOTIFICATIONS_DISABLED || (isProduction ? '0' : '1'),
      // Firebase config (read from native google-services files at runtime, but exposed for tooling/backends)
      EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
      // Google OAuth Web Client ID for native Google Sign-In
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    },
    updates: {
      enabled: enableUpdates,
      fallbackToCacheTimeout: 0,
      url: "https://u.expo.dev/402581b8-56d4-4633-a9e0-d2055d70b2c1",
      requestHeaders: {
        // Ensure dev/staging builds don't accidentally track the production channel
        "expo-channel-name": updatesChannel
      }
    },
    runtimeVersion: "1.0.2",
    // Enhanced performance settings for managed workflow
    jsEngine: "hermes",
    // App store metadata
    description: "LinkApp connects communities through properties, services, jobs, and meaningful relationships. Find your next home, discover local services, explore job opportunities, and connect with others in your area.",
    keywords: ["property", "real estate", "jobs", "services", "dating", "community", "housing", "rental", "buy", "sell"],
    // Support information
    supportUrl: "https://link-app.co/support",
    githubUrl: undefined
  }
};

/// <reference types="jest" />
/* eslint-env jest */
import { beforeEach, jest } from '@jest/globals';
import type React from 'react';

// Ensure Expo-specific env vars are defined for jest-expo
process.env.EXPO_OS = process.env.EXPO_OS || 'ios';
process.env.EXPO_BROWSER = process.env.EXPO_BROWSER || 'jest';

// Mock react-native BEFORE any other setup (especially RNGH)
jest.mock('react-native', () => {
  const React = require('react');
  const StatusBar = (props: any) => React.createElement('StatusBar', props, null);
  StatusBar.setBarStyle = jest.fn();
  StatusBar.setHidden = jest.fn();
  StatusBar.setBackgroundColor = jest.fn();
  StatusBar.setTranslucent = jest.fn();
  StatusBar.currentHeight = 0;
  return {
    Platform: {
      OS: 'ios',
      select: jest.fn((obj: { ios?: unknown; android?: unknown; default?: unknown }) => obj.ios ?? obj.default),
    },
    InteractionManager: {
      runAfterInteractions: jest.fn((callback: () => void) => {
        callback();
        return { cancel: jest.fn() };
      }),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    PixelRatio: {
      get: jest.fn(() => 2),
      getFontScale: jest.fn(() => 1),
      getPixelSizeForLayoutSize: jest.fn((size: number) => size * 2),
      roundToNearestPixel: jest.fn((size: number) => Math.round(size)),
    },
    StyleSheet: {
      create: jest.fn((styles: Record<string, unknown>) => styles),
      flatten: jest.fn((style: unknown) => style),
    },
    UIManager: {
      getViewManagerConfig: jest.fn(() => ({})),
    },
    NativeModules: {
      PlatformConstants: { getConstants: jest.fn(() => ({})) },
    },
    I18nManager: {
      getConstants: jest.fn(() => ({ isRTL: false })),
    },
    AppState: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
      currentState: 'active',
    },
    Keyboard: {
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      removeListener: jest.fn(),
    },
    Easing: {
      bezier: jest.fn(() => ((t: number) => t)),
      linear: (t: number) => t,
      ease: (t: number) => t,
      quad: (t: number) => t * t,
      cubic: (t: number) => t * t * t,
      poly: jest.fn((n: number) => (t: number) => Math.pow(t, n)),
      sin: (t: number) => 1 - Math.cos((t * Math.PI) / 2),
      circle: (t: number) => 1 - Math.sqrt(1 - t * t),
      exp: (t: number) => Math.pow(2, 10 * (t - 1)),
      elastic: jest.fn((_bounciness?: number) => (t: number) => t),
      back: jest.fn((_s?: number) => (t: number) => t),
      bounce: (t: number) => t,
      in: jest.fn((easing: (t: number) => number) => easing),
      out: jest.fn((easing: (t: number) => number) => easing),
      inOut: jest.fn((easing: (t: number) => number) => easing),
    },
    View: 'View',
    Text: 'Text',
    TextInput: 'TextInput',
    ScrollView: 'ScrollView',
    FlatList: ({ data, renderItem, keyExtractor, ListEmptyComponent, ...props }: any) => {
      const items = Array.isArray(data) ? data : [];
      const rendered =
        items.length > 0 && typeof renderItem === 'function'
          ? items.map((item, index) => {
              const element = renderItem({
                item,
                index,
                separators: {
                  highlight: () => {},
                  unhighlight: () => {},
                  updateProps: () => {},
                },
              });
              const key =
                typeof keyExtractor === 'function'
                  ? keyExtractor(item, index)
                  : item?.id
                    ? String(item.id)
                    : String(index);
              return React.createElement(React.Fragment, { key }, element);
            })
          : ListEmptyComponent
            ? typeof ListEmptyComponent === 'function'
              ? React.createElement(ListEmptyComponent)
              : ListEmptyComponent
            : null;

      return React.createElement('View', props, rendered);
    },
    TouchableOpacity: 'TouchableOpacity',
    TouchableWithoutFeedback: 'TouchableWithoutFeedback',
    Pressable: 'Pressable',
    KeyboardAvoidingView: 'KeyboardAvoidingView',
    ActivityIndicator: 'ActivityIndicator',
    Switch: (props: any) => React.createElement('Switch', { accessibilityRole: 'switch', ...props }, null),
    RefreshControl: 'RefreshControl',
    StatusBar,
    Modal: 'Modal',
    Image: 'Image',
    AppRegistry: {
      registerComponent: jest.fn(),
      registerRunnable: jest.fn(),
      getAppKeys: jest.fn(() => []),
    },
    Animated: {
      View: 'Animated.View',
      Text: 'Animated.Text',
      Value: jest.fn(() => ({
        setValue: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        interpolate: jest.fn(() => 0),
      })),
      timing: jest.fn(() => ({ start: jest.fn() })),
      spring: jest.fn(() => ({ start: jest.fn() })),
      loop: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
      parallel: jest.fn((_animations: unknown[]) => ({
        start: jest.fn((callback?: () => void) => callback && callback()),
      })),
      sequence: jest.fn((_animations: unknown[]) => ({
        start: jest.fn((callback?: () => void) => callback && callback()),
      })),
      createAnimatedComponent: jest.fn((Component: unknown) => Component),
    },
    BackHandler: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
    },
    Alert: {
      alert: jest.fn(),
    },
    Linking: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
      removeAllListeners: jest.fn(),
      openURL: jest.fn(async () => true),
      canOpenURL: jest.fn(async () => true),
      getInitialURL: jest.fn(async () => null),
    },
    useColorScheme: jest.fn(() => 'light'),
    NativeEventEmitter: class {
      addListener() { return { remove: jest.fn() }; }
      removeAllListeners() {}
      removeListener() {}
      emit() {}
    },
  };
});

// Reanimated test setup - lightweight custom mock to avoid native/worklets dependencies
jest.mock('react-native-reanimated', () => {
  const NOOP = () => {};
  const makePreset = () => {
    const preset: any = {
      duration: jest.fn(() => preset),
      delay: jest.fn(() => preset),
      springify: jest.fn(() => preset),
      damping: jest.fn(() => preset),
      stiffness: jest.fn(() => preset),
      mass: jest.fn(() => preset),
    };
    return preset;
  };

  const FadeIn = makePreset();
  const FadeOut = makePreset();
  const FadeInUp = makePreset();
  const FadeInDown = makePreset();
  const SlideInRight = makePreset();
  const SlideOutLeft = makePreset();
  const Layout = { springify: jest.fn(() => makePreset()) };
  const Extrapolate = {
    CLAMP: 'clamp',
    EXTEND: 'extend',
    IDENTITY: 'identity',
  };

  return {
    __esModule: true,
    default: {
      addWhitelistedNativeProps: NOOP,
      addWhitelistedUIProps: NOOP,
      createAnimatedComponent: (Component: unknown) => Component,
      View: 'Animated.View',
      Text: 'Animated.Text',
      ScrollView: 'Animated.ScrollView',
      Image: 'Animated.Image',
      Value: function () {},
      call: NOOP,
    },
    Easing: {
      linear: (t: number) => t,
      bezier: () => (t: number) => t,
      cubic: (t: number) => t * t * t,
      in: jest.fn((easing: (t: number) => number) => easing),
      out: jest.fn((easing: (t: number) => number) => easing),
      inOut: jest.fn((easing: (t: number) => number) => easing),
    },
    Extrapolate,
    interpolate: jest.fn(
      (_value: any, _inputRange: number[], outputRange: number[], _extrapolate?: any) =>
        Array.isArray(outputRange) ? outputRange[0] : 0
    ),
    cancelAnimation: jest.fn(),
    useSharedValue: jest.fn((initial: unknown) => ({ value: initial })),
    useAnimatedStyle: jest.fn((updater: () => unknown) => updater()),
    useAnimatedScrollHandler: jest.fn(() => NOOP),
    useDerivedValue: jest.fn((updater: () => unknown) => updater()),
    withTiming: jest.fn((toValue: unknown, _config?: unknown, cb?: (finished: boolean) => void) => {
      cb && cb(true);
      return toValue;
    }),
    withSpring: jest.fn((toValue: unknown, _config?: unknown, cb?: (finished: boolean) => void) => {
      cb && cb(true);
      return toValue;
    }),
    withSequence: jest.fn((...args: unknown[]) => (args.length ? args[args.length - 1] : undefined)),
    withDelay: jest.fn((_delayMs: number, animation: unknown) => animation),
    withRepeat: jest.fn((animation: unknown, _count?: number, _reverse?: boolean) => animation),
    runOnJS: (fn: unknown) => fn,
    FadeIn,
    FadeOut,
    FadeInUp,
    FadeInDown,
    SlideInRight,
    SlideOutLeft,
    Layout,
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaProvider: ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) =>
      React.createElement('SafeAreaProvider', props, children),
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) =>
      React.createElement('SafeAreaView', props, children),
    useSafeAreaInsets: () => ({ top: 44, right: 0, bottom: 34, left: 0 }),
  };
});

// Mock react-navigation (preserve actual module)
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native') as Record<string, unknown>;
  const useNavigation = jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
  }));
  const useRoute = jest.fn(() => ({ params: {} }));
  const useFocusEffect = jest.fn();
  return { ...actual, useNavigation, useRoute, useFocusEffect };
});

// Mock stack navigator to avoid native/gesture dependencies in tests
jest.mock('@react-navigation/stack', () => {
  const React = require('react');
  const createStackNavigator = () => {
    const Navigator = ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children);
    const Screen = ({
      component: Component,
      children,
      ...rest
    }: {
      component?: React.ComponentType<any>;
      children?: React.ReactNode;
      [key: string]: any;
    }) => {
      if (Component) return React.createElement(Component, rest);
      return React.createElement(React.Fragment, null, children ?? null);
    };
    const Group = ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children);
    return { Navigator, Screen, Group };
  };
  return { createStackNavigator };
});

// Mock Redux
jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux') as any;

  const safeMockState = {
    auth: { user: null, isAuthenticated: false, isLoading: false, error: null, subscription: { tier: 'free' } },
    user: { currentProfile: null, isUpdatingProfile: false, profileSwitchContext: null, isLoading: false, error: null },
    property: { properties: [], isLoading: false, error: null },
    message: { messages: [], isLoading: false, error: null },
    chat: { channels: [], isConnected: true, isLoading: false, error: null },
    call: { call: null, callingState: 'IDLE', isInCall: false, error: null },
    jobs: { searchResults: [], isLoading: false, error: null, jobs: [] },
    services: { services: [], isLoading: false, error: null },
    datemi: { profiles: [], myProfile: null, matches: [], isLoading: false, subscription: { current: null, history: [] } },
    search: { query: '', results: [], isLoading: false, error: null },
    payment: { history: [], isLoading: false, error: null },
    moderation: { flags: [], isLoading: false, error: null },
    location: { currentLocation: null, isLoading: false, error: null },
    notifications: { items: [], unreadCount: 0, isLoading: false, error: null },
    subscription: { currentSubscription: null, history: [], isLoading: false, error: null },
    onboarding: { step: null, completed: false, showTooltips: false, tooltipsShown: [], isOnboardingCompleted: false, isLoading: false },
  };

  const useSelector = (selector: any, equalityFn?: any) => {
    try {
      return actual.useSelector(selector, equalityFn);
    } catch {
      return typeof selector === 'function' ? selector(safeMockState) : undefined;
    }
  };

  const useDispatch = () => {
    try {
      return actual.useDispatch();
    } catch {
      return jest.fn();
    }
  };

  const useStore = () => {
    try {
      return actual.useStore();
    } catch {
      return {
        getState: jest.fn(() => safeMockState),
        dispatch: jest.fn(),
        subscribe: jest.fn(),
        replaceReducer: jest.fn(),
      };
    }
  };

  return { ...actual, useSelector, useDispatch, useStore };
});

// Mock Expo modules
jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

// Mock NetInfo (native module) used by networkStatus utilities
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(async () => ({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      details: {},
    })),
    addEventListener: jest.fn(() => jest.fn()),
  },
  useNetInfo: jest.fn(() => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    details: {},
  })),
}));

jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
  isLoading: jest.fn(() => false),
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      name: 'LinkApp',
      version: '1.0.0',
    },
    manifest: {},
    appOwnership: 'standalone',
  },
  expoConfig: {
    name: 'LinkApp',
    version: '1.0.0',
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  const storage = {
    getItem: jest.fn(async (key: string) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null)),
    setItem: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete store[key];
    }),
    clear: jest.fn(async () => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
    getAllKeys: jest.fn(async () => Object.keys(store)),
    multiGet: jest.fn(async (keys: string[]) => keys.map((k) => [k, store[k] ?? null])),
    multiSet: jest.fn(async (pairs: Array<[string, string]>) => {
      pairs.forEach(([k, v]) => {
        store[k] = v;
      });
    }),
    multiRemove: jest.fn(async (keys: string[]) => {
      keys.forEach((k) => {
        delete store[k];
      });
    }),
  };
  return { __esModule: true, default: storage };
});

jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
  Ionicons: 'Ionicons',
  FontAwesome: 'FontAwesome',
  Feather: 'Feather',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// Mock expo-blur
jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => {}),
  deleteItemAsync: jest.fn(async () => {}),
  isAvailableAsync: jest.fn(async () => true),
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async () => {}),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'EXPO_PUSH_TOKEN' })),
  setNotificationHandler: jest.fn(),
  setBadgeCountAsync: jest.fn(async () => {}),
  getBadgeCountAsync: jest.fn(async () => 0),
}));

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    Sound: jest.fn(() => ({
      loadAsync: jest.fn(async () => ({ status: { isLoaded: true } })),
      playAsync: jest.fn(async () => {}),
      stopAsync: jest.fn(async () => {}),
      unloadAsync: jest.fn(async () => {}),
      setIsLoopingAsync: jest.fn(async () => {}),
      setVolumeAsync: jest.fn(async () => {}),
    })),
    setAudioModeAsync: jest.fn(async () => {}),
    requestPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  },
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: [] })),
  launchCameraAsync: jest.fn(async () => ({ canceled: false, assets: [] })),
  MediaTypeOptions: {
    All: 'All',
    Images: 'Images',
    Videos: 'Videos',
  },
}));

// Mock expo-image-manipulator (native module)
jest.mock('expo-image-manipulator', () => ({
  __esModule: true,
  manipulateAsync: jest.fn(async (uri: string) => ({
    uri,
    width: 100,
    height: 100,
  })),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
    WEBP: 'webp',
  },
}));

// Mock expo-screen-capture
jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn(async () => {}),
  allowScreenCaptureAsync: jest.fn(async () => {}),
  isAvailableAsync: jest.fn(async () => true),
}));

// Minimal mock for expo to avoid native AppRegistry side-effects
jest.mock('expo', () => ({}));

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  getCurrentPositionAsync: jest.fn(async () => ({ coords: { latitude: 0, longitude: 0 } })),
  watchPositionAsync: jest.fn(async () => ({ remove: jest.fn() })),
  setGoogleApiKey: jest.fn(),
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
}));

// Mock react-native-maps
jest.mock('react-native-maps', () => ({
  __esModule: true,
  default: 'MapView',
  Marker: 'Marker',
  PROVIDER_GOOGLE: 'google',
}));

// Mock react-native-webview
jest.mock('react-native-webview', () => ({
  WebView: 'WebView',
}));

// Mock react-native-paystack-webview
jest.mock('react-native-paystack-webview', () => ({
  __esModule: true,
  default: 'Paystack',
}));

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)),
  digest: jest.fn(async () => 'mock-digest'),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
}));

// Mock Stream Chat
jest.mock('stream-chat', () => ({
  StreamChat: jest.fn(() => ({
    connectUser: jest.fn(async () => ({})),
    disconnectUser: jest.fn(async () => {}),
    on: jest.fn(),
    off: jest.fn(),
  })),
}));

// Mock Stream Chat React Native
jest.mock('stream-chat-react-native', () => {
  const React = require('react');
  return {
    Chat: ({ children }: { children: React.ReactNode }) => children,
    Channel: ({ children }: { children: React.ReactNode }) => children,
    ChannelList: 'ChannelList',
    MessageList: 'MessageList',
    MessageInput: 'MessageInput',
    OverlayProvider: ({ children }: { children: React.ReactNode }) => children,
    AttachmentPickerContext: React.createContext(undefined),
    useAttachmentPickerContext: jest.fn(() => ({})),
  };
});

// Mock Stream Chat Expo
jest.mock('stream-chat-expo', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    useStreamChatTheme: jest.fn(() => ({})),
    ChannelList: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'channel-list' }, children),
    useChannelPreviewDisplayName: jest.fn(() => 'Chat'),
    useLatestMessagePreview: jest.fn(() => ({ previews: [] })),
    AttachmentPickerContext: React.createContext(undefined),
    Chat: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children),
    OverlayProvider: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children),
    Channel: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children),
    MessageList: (props: any) =>
      React.createElement(View, {
        testID: props?.additionalFlatListProps?.testID ?? 'message-list',
      }),
    MessageInput: () => React.createElement(View, { testID: 'message-input' }),
    Thread: () => React.createElement(View, { testID: 'thread' }),
    TypingIndicator: () => null,
    useMessageInputContext: () => ({
      sendMessage: jest.fn(),
      editMessage: jest.fn(),
      clearQuotedMessageState: jest.fn(),
      quotedMessage: null,
      editing: null,
    }),
    useAttachmentPickerContext: () => ({
      closePicker: jest.fn(),
      setSelectedFiles: jest.fn(),
      setSelectedImages: jest.fn(),
      setSelectedPicker: jest.fn(),
    }),
  };
});

// Mock Stream Video SDK
jest.mock('@stream-io/video-react-native-sdk', () => ({
  StreamVideo: jest.fn(() => ({
    call: jest.fn(() => ({
      join: jest.fn(async () => {}),
      leave: jest.fn(async () => {}),
    })),
  })),
  StreamVideoClient: jest.fn(),
  StreamCall: ({ children }: { children: React.ReactNode }) => children,
  CallContent: 'CallContent',
}));

// Mock @stream-io/react-native-webrtc
jest.mock('@stream-io/react-native-webrtc', () => ({
  RTCPeerConnection: jest.fn(),
  RTCSessionDescription: jest.fn(),
  mediaDevices: {
    getUserMedia: jest.fn(async () => ({})),
    enumerateDevices: jest.fn(async () => []),
  },
}));

// Mock event-target-shim (required by Stream WebRTC)
jest.mock('event-target-shim', () => ({
  EventTarget: class EventTarget {
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return true; }
  },
}), { virtual: true });

// Mock expo-device
jest.mock('expo-device', () => ({
  DeviceType: {
    PHONE: 1,
    TABLET: 2,
    DESKTOP: 3,
    TV: 4,
  },
  getDeviceTypeAsync: jest.fn(async () => 1),
}));

// Mock @react-native-firebase modules
jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    messaging: jest.fn(() => ({})),
    analytics: jest.fn(() => ({})),
  })),
}));

jest.mock('@react-native-firebase/analytics', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    logEvent: jest.fn(async () => {}),
    setUserId: jest.fn(async () => {}),
    setUserProperty: jest.fn(async () => {}),
  })),
}));

jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    requestPermission: jest.fn(async () => 1),
    getToken: jest.fn(async () => 'mock-fcm-token'),
    onMessage: jest.fn(() => jest.fn()),
    setBackgroundMessageHandler: jest.fn(),
  })),
}));

jest.mock('@react-native-firebase/crashlytics', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    log: jest.fn(),
    recordError: jest.fn(),
  })),
}));

jest.mock('@react-native-firebase/perf', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    newTrace: jest.fn(() => ({
      start: jest.fn(async () => {}),
      stop: jest.fn(async () => {}),
      putMetric: jest.fn(),
      putAttribute: jest.fn(),
    })),
    startTrace: jest.fn(async () => ({
      stop: jest.fn(async () => {}),
    })),
  })),
}));

// Mock react-native-url-polyfill
jest.mock('react-native-url-polyfill', () => ({
  setupURLPolyfill: jest.fn(),
}));

jest.mock('react-native-url-polyfill/auto', () => ({}));

// Mock specific RN internals often required by libs
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Global test utilities
declare global {
  function setDeviceDimensions(width: number, height: number): void;
}

global.setDeviceDimensions = (width: number, height: number) => {
  const { Dimensions } = require('react-native');
  Dimensions.get.mockReturnValue({ width, height });
};

beforeEach(async () => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    if (AsyncStorage?.clear) {
      await AsyncStorage.clear();
    }
  } catch {
    /* noop */
  }
});

jest.setTimeout(10000);

// Mock utils/responsive
jest.mock('./utils/responsive', () => {
  const actual = jest.requireActual('./utils/responsive') as Record<string, unknown>;
  return {
    ...actual,
    useResponsiveLayout: jest.fn(() => ({
      isPhone: true,
      isTablet: false,
      isDesktop: false,
      containerPadding: { paddingHorizontal: 16 },
      width: 375,
      height: 812,
      deviceType: 'phone' as const,
    })),
    getResponsiveValue: jest.fn((phone: unknown) => phone),
    getDynamicDimensions: jest.fn(() => ({
      width: 375,
      height: 812,
      deviceType: 'phone' as const,
      isTablet: false,
      isDesktop: false,
    })),
    getDeviceType: jest.fn(() => 'phone' as const),
    getGridColumns: jest.fn(() => 1),
    getCardWidth: jest.fn(() => 343),
    getContainerPadding: jest.fn(() => ({ paddingHorizontal: 16, paddingVertical: 16 })),
    BREAKPOINTS: {
      phone: 0,
      tablet: 768,
      desktop: 1024,
      largeDesktop: 1440,
    },
  };
});

// Mock components/datemi/SmartFilters
jest.mock('./components/datemi/SmartFilters', () => ({
  SmartFilters: ({ children }: { children: React.ReactNode }) => children || null,
}));

// Mock components/datemi/UpgradePrompt
jest.mock('./components/datemi/UpgradePrompt', () => ({
  UpgradePrompt: () => null,
}));

// Mock react-native-gesture-handler before stack navigator
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    FlatList: View,
    gestureHandlerRootHOC: (fn: unknown) => fn,
    createNativeWrapper: (fn: unknown) => fn,
    Directions: {},
    default: {},
  };
});

// Initialize RNGH and Reanimated test setup AFTER all mocks are defined
try {
  require('react-native-reanimated').setUpTests();
} catch {
  /* noop */
}

try {
  require('react-native-gesture-handler/jestSetup');
} catch {
  /* noop */
}

/**
 * MainTabs - Bottom Tab Navigator
 * Contains only top-level sections with tab bar visible
 * All nested screens are handled by the Root Stack Navigator
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, Platform, Animated, Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { markTooltipShownAsync, setShowTooltipsAsync } from '../redux/slices/onboardingSlice';
import Badge from '../components/common/Badge';

// Import main screens only (top-level modules)
import PropertyScreen from '../screens/property/PropertyScreen';
import JobsScreen from '../screens/jobs/JobsScreen';
import ServicesStackNavigator from './ServicesStackNavigator';
import DateMiScreenLazy from '../screens/datemi/DateMiScreenLazy';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Tab Parameter List - only top-level screens
export type TabParamList = {
  PropertyHub: undefined;
  JobsMain: undefined;
  ServicesMain: undefined;
  DateMiMain: undefined;
  ProfileMain: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

// Simple responsive helper for screen size detection
const getScreenSize = () => {
  const { width, height } = Dimensions.get('window');
  const screenWidth = Math.max(width, height);
  
  if (screenWidth < 375) return 'small'; // iPhone SE, small phones
  if (screenWidth >= 768) return 'tablet'; // Tablets
  return 'normal'; // Standard phones
};

// Enhanced Tab Icons Component with improved alignment and design
const TabIcon = ({ focused, iconName, label, serviceColor, badgeCount }: { 
  focused: boolean; 
  iconName: MaterialIconName;
  label: string;
  serviceColor?: string;
  badgeCount?: number;
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const activeColor = serviceColor || '#10B981';
  const screenSize = getScreenSize();

  // Optimized sizes for better alignment with reduced padding
  const iconSize = screenSize === 'small' ? 18 : screenSize === 'tablet' ? 22 : 20;
  const fontSize = screenSize === 'small' ? 9 : screenSize === 'tablet' ? 11 : 10;
  const containerHeight = screenSize === 'small' ? 48 : screenSize === 'tablet' ? 58 : 52;
  const indicatorSize = screenSize === 'small' ? 40 : screenSize === 'tablet' ? 48 : 44;
  const topBarWidth = screenSize === 'small' ? 26 : screenSize === 'tablet' ? 34 : 30;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.08 : 1,
        tension: 300,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: focused ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, scaleAnim, opacityAnim]);

  return (
    <View 
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        height: containerHeight,
        paddingVertical: 3,
        paddingHorizontal: 0,
        position: 'relative',
        flex: 1,
        width: '100%',
      }}
      accessible={true}
      accessibilityLabel={`${label} tab${focused ? ', selected' : ''}`}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
    >
      {/* Top indicator bar - fixed width */}
      <Animated.View style={{
        position: 'absolute',
        top: 0,
        width: topBarWidth,
        height: 3,
        backgroundColor: activeColor,
        borderRadius: 2,
        opacity: focused ? 1 : 0,
        transform: [{ 
          scaleX: focused ? 1 : 0.3,
        }],
      }} />
      
      {/* Active indicator background - solid pill */}
      <Animated.View style={{
        position: 'absolute',
        width: indicatorSize * 1.1,
        height: indicatorSize * 0.85,
        backgroundColor: focused ? `${activeColor}20` : 'transparent',
        borderRadius: 24,
        opacity: focused ? 1 : 0,
        transform: [{ scale: scaleAnim }],
        borderWidth: focused ? 1.5 : 0,
        borderColor: `${activeColor}30`,
      }} />
      
      {/* Icon and label container - ensures proper alignment */}
      <Animated.View style={{
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: scaleAnim }],
        flex: 1,
        gap: 1,
      }}>
        {/* Icon container with fixed dimensions */}
        <View style={{
          alignItems: 'center',
          justifyContent: 'center',
          height: iconSize + 4,
          width: iconSize + 4,
          backgroundColor: focused ? `${activeColor}10` : 'transparent',
          borderRadius: (iconSize + 4) / 2,
          position: 'relative',
        }}>
          <MaterialIcons 
            name={iconName}
            size={focused ? iconSize + 2 : iconSize}
            color={focused ? activeColor : '#9CA3AF'}
            style={{
              textAlign: 'center',
              textAlignVertical: 'center',
            }}
          />
          {typeof badgeCount === 'number' && badgeCount > 0 && (
            <Badge count={badgeCount} position="top-right" size="small" />
          )}
        </View>

        {/* Tab label with consistent positioning */}
        <Text style={{
          fontSize: focused ? fontSize + 1 : fontSize,
          fontWeight: focused ? '700' : '500',
          color: focused ? activeColor : '#9CA3AF',
          textAlign: 'center',
          letterSpacing: focused ? -0.2 : 0,
          lineHeight: fontSize + 3,
          maxWidth: screenSize === 'tablet' ? 60 : 52,
        }} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </View>
  );
};

// Main tab definitions - core sections for clean navigation
const MAIN_TABS = {
  PropertyHub: {
    iconName: 'home',
    label: 'Home',
    serviceColor: '#3B82F6', // Blue for property
    accessibilityLabel: 'Property hub - home screen with property listings',
  },
  JobsMain: {
    iconName: 'work',
    label: 'Jobs',
    serviceColor: '#047857', // Green gradient for jobs (matches screen gradient)
    accessibilityLabel: 'Jobs and skills marketplace',
  },
  ServicesMain: {
    iconName: 'storefront',
    label: 'Services',
    serviceColor: '#6366F1', // Blue/Purple gradient for services (matches screen gradient)
    accessibilityLabel: 'Services and tools marketplace',
  },
  DateMiMain: {
    iconName: 'favorite',
    label: 'Date Mi',
    serviceColor: '#EF4444', // Red/Pink for dating
    accessibilityLabel: 'Date Mi - dating and social connections',
  },
  ProfileMain: {
    iconName: 'person',
    label: 'Profile',
    serviceColor: '#6B7280', // Gray for profile
    accessibilityLabel: 'User profile and account settings',
  },
} as const satisfies Record<keyof TabParamList, {
  iconName: MaterialIconName;
  label: string;
  serviceColor: string;
  accessibilityLabel: string;
}>;

// Single tab tip ID for new-user coachmark
const TAB_TIP_ID = 'tab_tip_tabs';
const TAB_TIP_AUTO_DISMISS_MS = 12000;

// Optimized Tab Navigator with improved positioning and smooth transitions
export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { showTooltips, tooltipsShown, isOnboardingCompleted, isLoading: isOnboardingLoading } =
    useAppSelector((state) => state.onboarding);
  const dateMiBadgeCount = useAppSelector((state) => state.datemi.notifications.totalBadgeCount);

  // Avoid `any` casts for navigator components.
  const ServicesMainComponent = React.useMemo(
    () => ServicesStackNavigator as unknown as React.ComponentType<object>,
    []
  );

  // --- Single lightweight tab tip (non-modal, new users only) ---
  const shouldShowTabTip =
    !isOnboardingLoading &&
    isOnboardingCompleted &&
    showTooltips &&
    !tooltipsShown.includes(TAB_TIP_ID);

  const [tipVisible, setTipVisible] = React.useState(false);
  const tipOpacity = React.useRef(new Animated.Value(0)).current;
  const tipSlide = React.useRef(new Animated.Value(20)).current;

  const dismissTip = React.useCallback(() => {
    Animated.timing(tipOpacity, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setTipVisible(false);
      dispatch(markTooltipShownAsync(TAB_TIP_ID));
      dispatch(setShowTooltipsAsync(false));
    });
  }, [dispatch, tipOpacity]);

  React.useEffect(() => {
    if (!shouldShowTabTip) return;

    // Delay so the home screen is fully settled before the banner appears
    const showTimer = setTimeout(() => {
      setTipVisible(true);
      Animated.parallel([
        Animated.timing(tipOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(tipSlide, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1200);

    return () => clearTimeout(showTimer);
  }, [shouldShowTabTip, tipOpacity, tipSlide]);

  // Auto-dismiss after TAB_TIP_AUTO_DISMISS_MS
  React.useEffect(() => {
    if (!tipVisible) return;

    const autoDismiss = setTimeout(() => {
      dismissTip();
    }, TAB_TIP_AUTO_DISMISS_MS);

    return () => clearTimeout(autoDismiss);
  }, [tipVisible, dismissTip]);

  // Responsive adjustments for different screen sizes with safe area consideration
  const screenSize = getScreenSize();
  const getTabBarHeight = () => {
    // Optimized height with ultra-minimal vertical padding
    const baseHeight = screenSize === 'small' ? 46 : screenSize === 'tablet' ? 56 : 50;
    // Ensure adequate height for tab bar content without relying on bottom insets for height
    return baseHeight + 1;
  };
  
  const marginHorizontal = React.useMemo(() => {
    if (screenSize === 'small') return 4;
    if (screenSize === 'tablet') return 10;
    return 6; // normal
  }, [screenSize]);

  const bottomMargin = React.useMemo(() => {
    // Float immediately above system navigation using safe area insets
    // Small additional margin for visual breathing room
    const floatingMargin = 8;
    return Math.max(insets.bottom, 0) + floatingMargin;
  }, [insets.bottom]);
  
  const tabBarHeight = getTabBarHeight();
  
  // Memoize tab bar style to prevent re-renders
  const tabBarStyle = React.useMemo(
    () => ({
      height: tabBarHeight,
      paddingBottom: 0,
      paddingTop: 1,
      paddingHorizontal: 24,
      marginHorizontal,
      backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.98)',
      borderRadius: 24,
      borderTopWidth: 0,
      borderWidth: 2,
      borderColor: 'transparent',
      // Enhanced shadow for floating appearance
      elevation: 20,
      shadowOpacity: 0.25,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 30,
      position: 'absolute' as const,
      bottom: 0,
      left: marginHorizontal,
      right: marginHorizontal,
      marginBottom: bottomMargin,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-evenly' as const,
    }),
    [tabBarHeight, bottomMargin, marginHorizontal]
  );

  // Position the tip banner just above the floating tab bar
  const tipBottomOffset = bottomMargin + tabBarHeight + 12;

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        backBehavior="none"
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarHideOnKeyboard: true,
          // Performance optimizations
          lazy: true, // Lazy load tabs
          unmountOnBlur: false, // Keep tabs mounted for faster switching
          tabBarStyle,
          tabBarBackground: () => (
            <View style={{ flex: 1 }}>
              {/* Gradient border wrapper */}
              <LinearGradient
                colors={['#3B82F6', '#06B6D4', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: 'absolute',
                  top: -2,
                  left: -2,
                  right: -2,
                  bottom: -2,
                  borderRadius: 26,
                }}
              >
                {/* Inner content with background */}
                {Platform.OS === 'ios' ? (
                  <BlurView
                    intensity={95}
                    tint="light"
                    style={{
                      flex: 1,
                      margin: 2,
                      borderRadius: 24,
                      overflow: 'hidden',
                    }}
                  />
                ) : (
                  <View style={{
                    flex: 1,
                    margin: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    borderRadius: 24,
                  }} />
                )}
              </LinearGradient>
            </View>
          ),
          tabBarItemStyle: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 0,
            paddingVertical: 2,
            marginHorizontal: 0,
            borderRadius: 20,
            height: '100%',
            minWidth: 0,
            width: 'auto',
            flexGrow: 1,
            flexBasis: 0,
          },
          tabBarActiveTintColor: '#10B981',
          tabBarInactiveTintColor: '#9CA3AF',
        }}
      >
        {/* Main sections only - clean top-level navigation */}
        <Tab.Screen
          name="PropertyHub"
          component={PropertyScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon 
                focused={focused} 
                iconName={MAIN_TABS.PropertyHub.iconName}
                label={MAIN_TABS.PropertyHub.label}
                serviceColor={MAIN_TABS.PropertyHub.serviceColor}
              />
            ),
            tabBarAccessibilityLabel: MAIN_TABS.PropertyHub.accessibilityLabel,
          }}
        />
        <Tab.Screen
          name="JobsMain"
          component={JobsScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                iconName={MAIN_TABS.JobsMain.iconName}
                label={MAIN_TABS.JobsMain.label}
                serviceColor={MAIN_TABS.JobsMain.serviceColor}
              />
            ),
            tabBarAccessibilityLabel: MAIN_TABS.JobsMain.accessibilityLabel,
          }}
        />
        <Tab.Screen
          name="ServicesMain"
          component={ServicesMainComponent}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                iconName={MAIN_TABS.ServicesMain.iconName}
                label={MAIN_TABS.ServicesMain.label}
                serviceColor={MAIN_TABS.ServicesMain.serviceColor}
              />
            ),
            tabBarAccessibilityLabel: MAIN_TABS.ServicesMain.accessibilityLabel,
          }}
        />
        <Tab.Screen
          name="DateMiMain"
          component={DateMiScreenLazy}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                iconName={MAIN_TABS.DateMiMain.iconName}
                label={MAIN_TABS.DateMiMain.label}
                serviceColor={MAIN_TABS.DateMiMain.serviceColor}
                badgeCount={dateMiBadgeCount}
              />
            ),
            tabBarAccessibilityLabel: MAIN_TABS.DateMiMain.accessibilityLabel,
          }}
        />
        <Tab.Screen
          name="ProfileMain"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                focused={focused}
                iconName={MAIN_TABS.ProfileMain.iconName}
                label={MAIN_TABS.ProfileMain.label}
                serviceColor={MAIN_TABS.ProfileMain.serviceColor}
              />
            ),
            tabBarAccessibilityLabel: MAIN_TABS.ProfileMain.accessibilityLabel,
          }}
        />
      </Tab.Navigator>

      {/* Single lightweight coachmark tip for new users */}
      {tipVisible && (
        <Animated.View
          style={[
            tipStyles.container,
            {
              bottom: tipBottomOffset,
              opacity: tipOpacity,
              transform: [{ translateY: tipSlide }],
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={tipStyles.banner}>
            <View style={tipStyles.accentBar} />
            <View style={tipStyles.iconWrapper}>
              <MaterialIcons name="touch-app" size={22} color="#3B82F6" />
            </View>
            <View style={tipStyles.textWrapper}>
              <Text style={tipStyles.title}>Navigate the app</Text>
              <Text style={tipStyles.text}>
                Tap the tabs below to explore Properties, Jobs, Services, and more
              </Text>
            </View>
            <TouchableOpacity
              onPress={dismissTip}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={tipStyles.closeButton}
              accessibilityLabel="Dismiss tip"
              accessibilityRole="button"
            >
              <MaterialIcons name="close" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const tipStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 100,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    elevation: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 10,
    width: '100%',
  },
  accentBar: {
    width: 4,
    borderRadius: 4,
    alignSelf: 'stretch',
    backgroundColor: '#3B82F6',
    flexShrink: 0,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textWrapper: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
    lineHeight: 18,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
    lineHeight: 17,
  },
  closeButton: {
    padding: 4,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
});

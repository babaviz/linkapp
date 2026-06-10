import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, Platform, Animated, Keyboard, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { screenTransitions } from './navigationConfig';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Badge from '../components/common/Badge';
import { useNotificationBadges } from '../hooks/useNotificationBadges';

// Import screen components - main sections only
import PropertyStackNavigator from './PropertyStackNavigator';
import JobsStackNavigator from './JobsStackNavigator';
import ServicesStackNavigator from './ServicesStackNavigator';
import DateMiStackNavigator from './DateMiStackNavigator';
import ProfileStackNavigator from './ProfileStackNavigator';

const Tab = createBottomTabNavigator();

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
  iconName: string;
  label: string;
  serviceColor?: string;
  badgeCount?: number;
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const activeColor = serviceColor || '#10B981';
  const screenSize = getScreenSize();

  // Optimized sizes for better alignment
  const iconSize = screenSize === 'small' ? 19 : screenSize === 'tablet' ? 24 : 21;
  const fontSize = screenSize === 'small' ? 10 : screenSize === 'tablet' ? 12 : 11;
  const containerHeight = screenSize === 'small' ? 54 : screenSize === 'tablet' ? 66 : 58;
  const indicatorSize = screenSize === 'small' ? 44 : screenSize === 'tablet' ? 52 : 48;
  const topBarWidth = screenSize === 'small' ? 28 : screenSize === 'tablet' ? 36 : 32;

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
        paddingVertical: 6,
        paddingHorizontal: 2,
        position: 'relative',
        flex: 1,
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
        gap: screenSize === 'small' ? 2 : 3,
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
            name={iconName as any}
            size={focused ? iconSize + 2 : iconSize}
            color={focused ? activeColor : '#9CA3AF'}
            style={{
              textAlign: 'center',
              textAlignVertical: 'center',
            }}
          />
          {/* Badge for notifications */}
          {badgeCount && badgeCount > 0 ? (
            <Badge 
              count={badgeCount}
              position="top-right"
              size="small"
              color={serviceColor || '#EF4444'}
              style={{
                top: -6,
                right: -6,
                minWidth: 16,
                height: 16,
              }}
            />
          ) : null}
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
  Property: {
    name: 'Property',
    component: PropertyStackNavigator,
    iconName: 'home',
    label: 'Home',
    serviceColor: '#3B82F6', // Blue for property
    accessibilityLabel: 'Property listings and rentals',
  },
  Jobs: {
    name: 'Jobs',
    component: JobsStackNavigator,
    iconName: 'work',
    label: 'Jobs',
    serviceColor: '#047857', // Green gradient for jobs (matches screen gradient)
    accessibilityLabel: 'Job opportunities and skills marketplace',
  },
  Services: {
    name: 'Services',
    component: ServicesStackNavigator,
    iconName: 'storefront',
    label: 'Services',
    serviceColor: '#6366F1', // Blue/Purple gradient for services (matches screen gradient)
    accessibilityLabel: 'Services and tools marketplace',
  },
  DateMi: {
    name: 'DateMi',
    component: DateMiStackNavigator,
    iconName: 'favorite',
    label: 'Date Mi',
    serviceColor: '#EF4444', // Red/Pink for dating
    accessibilityLabel: 'Dating and social connections',
  },
  Profile: {
    name: 'Profile',
    component: ProfileStackNavigator,
    iconName: 'person',
    label: 'Profile',
    serviceColor: '#6B7280', // Gray for profile
    accessibilityLabel: 'User profile and settings',
  },
};


// Optimized Tab Navigator with improved positioning and smooth transitions
export default function MainTabNavigator() {
  const [isKeyboardVisible, setKeyboardVisible] = React.useState(false);
  const insets = useSafeAreaInsets();
  
  // Get notification badge counts
  const { dateMiBadgeCount, profileBadgeCount } = useNotificationBadges();
  
  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  // Responsive adjustments for different screen sizes with safe area consideration
  const screenSize = getScreenSize();
  const getTabBarHeight = () => {
    // Optimized height to accommodate 5 tabs with proper spacing
    const baseHeight = screenSize === 'small' ? 60 : screenSize === 'tablet' ? 74 : 68;
    // Ensure adequate height for tab bar content without relying on bottom insets for height
    return baseHeight + 16;
  };
  
  const getMarginHorizontal = () => {
    if (screenSize === 'small') return 8;
    if (screenSize === 'tablet') return 20;
    return 12; // normal
  };
  const getBottomMargin = () => {
    // Float immediately above system navigation using safe area insets
    // Small additional margin for visual breathing room
    const floatingMargin = 8;
    return Math.max(insets.bottom, 0) + floatingMargin;
  };
  
  const tabBarHeight = getTabBarHeight();
  const bottomMargin = getBottomMargin();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: tabBarHeight,
          paddingBottom: 12,
          paddingTop: 8,
          paddingHorizontal: 8,
          marginHorizontal: getMarginHorizontal(),
          backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.98)',
          borderRadius: 30,
          borderTopWidth: 0,
          borderWidth: 2,
          borderColor: 'transparent',
          // Enhanced shadow for floating appearance
          elevation: 20,
          shadowOpacity: 0.25,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 10 },
          shadowRadius: 30,
          position: 'absolute',
          bottom: 0,
          left: getMarginHorizontal(),
          right: getMarginHorizontal(),
          marginBottom: bottomMargin,
        },
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
                borderRadius: 32,
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
                    borderRadius: 30,
                    overflow: 'hidden',
                  }}
                />
              ) : (
                <View style={{
                  flex: 1,
                  margin: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  borderRadius: 30,
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
          paddingVertical: 4,
          marginHorizontal: 0,
          borderRadius: 20,
          height: '100%',
          minWidth: 0,
        },
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#9CA3AF',
      }}
      >
      {/* Main sections only - clean top-level navigation */}
      <Tab.Screen
        name="Property"
        component={PropertyStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              focused={focused} 
              iconName={MAIN_TABS.Property.iconName}
              label={MAIN_TABS.Property.label}
              serviceColor={MAIN_TABS.Property.serviceColor}
            />
          ),
          tabBarAccessibilityLabel: MAIN_TABS.Property.accessibilityLabel,
        }}
      />
      <Tab.Screen
        name="Jobs"
        component={JobsStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              focused={focused} 
              iconName={MAIN_TABS.Jobs.iconName}
              label={MAIN_TABS.Jobs.label}
              serviceColor={MAIN_TABS.Jobs.serviceColor}
            />
          ),
          tabBarAccessibilityLabel: MAIN_TABS.Jobs.accessibilityLabel,
        }}
      />
      <Tab.Screen
        name="Services"
        component={ServicesStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              focused={focused} 
              iconName={MAIN_TABS.Services.iconName}
              label={MAIN_TABS.Services.label}
              serviceColor={MAIN_TABS.Services.serviceColor}
            />
          ),
          tabBarAccessibilityLabel: MAIN_TABS.Services.accessibilityLabel,
        }}
      />
      <Tab.Screen
        name="DateMi"
        component={DateMiStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              focused={focused} 
              iconName={MAIN_TABS.DateMi.iconName}
              label={MAIN_TABS.DateMi.label}
              serviceColor={MAIN_TABS.DateMi.serviceColor}
              badgeCount={dateMiBadgeCount}
            />
          ),
          tabBarAccessibilityLabel: MAIN_TABS.DateMi.accessibilityLabel,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              focused={focused} 
              iconName={MAIN_TABS.Profile.iconName}
              label={MAIN_TABS.Profile.label}
              serviceColor={MAIN_TABS.Profile.serviceColor}
              badgeCount={profileBadgeCount}
            />
          ),
          tabBarAccessibilityLabel: MAIN_TABS.Profile.accessibilityLabel,
        }}
      />
    </Tab.Navigator>
  );
}

import React from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { 
  getDynamicDimensions, 
  spacing,
  fontSize,
} from '../../utils/responsive';

export interface ActionButton {
  title: string;
  subtitle: string;
  icon: string;
  gradient: string[];
  onPress: () => void;
  badge?: string;
}

export interface SearchSectionProps {
  title?: string;
  subtitle?: string;
  searchComponent?: React.ReactNode;
  actionButtons?: ActionButton[];
  layout?: 'compact' | 'expanded';
  showLiveIndicator?: boolean;
  liveText?: string;
  theme?: 'light' | 'glass';
}

const SearchSection: React.FC<SearchSectionProps> = ({
  title = 'Find Your Perfect Match ✨',
  subtitle = 'Discover opportunities that suit your needs',
  searchComponent,
  actionButtons = [],
  layout = 'compact',
  showLiveIndicator = true,
  liveText = 'Loading activity...',
  theme = 'glass',
}) => {
  const { isTablet } = getDynamicDimensions();
  
  // Animation setup
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    // Initial scale animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();

    // Continuous pulse animation for live indicator
    if (showLiveIndicator) {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start(() => pulse());
      };
      pulse();
    }
  }, [scaleAnim, pulseAnim, showLiveIndicator]);

  // Theme styles
  const getThemeStyles = () => {
    switch (theme) {
      case 'light':
        return {
          container: 'bg-white',
          titleColor: '#0f172a',
          subtitleColor: '#64748b',
          decorativeColor: 'rgba(59, 130, 246, 0.15)',
        };
      default: // glass
        return {
          container: 'bg-white bg-opacity-95 backdrop-blur-sm',
          titleColor: '#0f172a',
          subtitleColor: '#64748b',
          decorativeColor: 'rgba(59, 130, 246, 0.15)',
        };
    }
  };

  const themeStyles = getThemeStyles();
  const isCompact = layout === 'compact';

  const renderActionButton = (button: ActionButton, index: number) => {
    return (
      <TouchableOpacity 
        key={index}
        style={[
          styles.actionButton,
          { marginHorizontal: index > 0 ? spacing.xs : 0 }
        ]}
        onPress={button.onPress}
        activeOpacity={0.95}
      >
        {/* Gradient Background */}
        <View 
          style={[
            styles.gradientBackground,
            { backgroundColor: button.gradient[0] }
          ]}
        />
        
        {/* Decorative Elements */}
        <View style={styles.decorativeElements}>
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
        </View>
        
        <View 
          style={[
            styles.actionButtonContent,
            { padding: isCompact ? spacing.md : spacing.lg }
          ]}
        >
          {/* Icon Container */}
          <View 
            style={[
              styles.iconContainer,
              { 
                width: isCompact ? (isTablet ? 48 : 40) : (isTablet ? 56 : 48), 
                height: isCompact ? (isTablet ? 48 : 40) : (isTablet ? 56 : 48), 
                marginBottom: spacing.sm 
              }
            ]}
          >
            <Text style={{ fontSize: isCompact ? fontSize.lg : fontSize.xl }}>
              {button.icon}
            </Text>
          </View>
          
          <Text style={{ 
            color: 'white', 
            fontWeight: '800', 
            fontSize: isCompact ? fontSize.sm : (isTablet ? fontSize.lg : fontSize.base),
            marginBottom: spacing.xs,
            letterSpacing: 0.5,
            textAlign: 'center'
          }}>
            {button.title}
          </Text>
          
          <Text style={{ 
            color: 'rgba(255, 255, 255, 0.8)', 
            fontSize: fontSize.xs, 
            fontWeight: '500',
            textAlign: 'center',
            marginBottom: spacing.xs
          }}>
            {button.subtitle}
          </Text>
          
          {/* Badge */}
          {button.badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                • {button.badge}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Animated.View 
      style={[
        styles.mainContainer,
        theme === 'light' ? styles.lightTheme : styles.glassTheme,
        {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: isCompact ? 12 : 20 },
          shadowOpacity: 0.15,
          shadowRadius: isCompact ? 16 : 25,
          elevation: isCompact ? 12 : 20,
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      {/* Decorative Background Elements */}
      <View style={styles.decorativeBackground}>
        <Animated.View 
          style={[
            styles.decorativeBubble1,
            {
              backgroundColor: themeStyles.decorativeColor,
              transform: [{ translateY: scaleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 3],
              })}],
            }
          ]}
        />
        <Animated.View 
          style={[
            styles.decorativeBubble2,
            {
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              transform: [{ translateY: scaleAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -2],
              })}],
            }
          ]}
        />
      </View>

      <View 
        style={[
          styles.contentContainer,
          { padding: isCompact ? spacing.lg : spacing.xl }
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { marginBottom: spacing.md }]}>
          <View style={styles.headerTextContainer}>
            <Text style={{ 
              fontSize: isCompact ? fontSize.lg : (isTablet ? fontSize['2xl'] : fontSize.xl), 
              fontWeight: '800', 
              color: themeStyles.titleColor,
              marginBottom: spacing.xs
            }}>
              {title}
            </Text>
            
            <Text style={{ 
              fontSize: fontSize.sm, 
              color: themeStyles.subtitleColor,
              fontWeight: '500'
            }}>
              {subtitle}
            </Text>
            
            {/* Live Status Indicator */}
            {showLiveIndicator && (
              <View style={[styles.liveIndicator, { marginTop: spacing.xs }]}>
                <Animated.View 
                  style={[
                    styles.liveIndicatorDot,
                    { 
                      marginRight: spacing.xs,
                      transform: [{ scale: pulseAnim }],
                    }
                  ]}
                />
                <Text style={{ 
                  fontSize: fontSize.xs, 
                  color: '#10b981', 
                  fontWeight: '600' 
                }}>
                  • {liveText}
                </Text>
              </View>
            )}
          </View>
          
          {/* Floating Status Indicator */}
          <Animated.View 
            style={[
              styles.floatingIndicator,
              { 
                width: isCompact ? (isTablet ? 48 : 40) : (isTablet ? 56 : 48), 
                height: isCompact ? (isTablet ? 48 : 40) : (isTablet ? 56 : 48),
                shadowColor: '#10b981',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }
            ]}
          >
            <Text style={{ fontSize: isCompact ? fontSize.base : fontSize.lg }}>🚀</Text>
          </Animated.View>
        </View>
      
        {/* Search Component */}
        {searchComponent && (
          <View style={{ marginBottom: actionButtons.length > 0 ? spacing.lg : 0 }}>
            {searchComponent}
          </View>
        )}

        {/* Action Buttons */}
        {actionButtons.length > 0 && (
          <View style={[styles.actionButtonsContainer, { gap: spacing.sm }]}>
            {actionButtons.map((button, index) => renderActionButton(button, index))}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  lightTheme: {
    backgroundColor: '#FFFFFF',
  },
  glassTheme: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  decorativeBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorativeBubble1: {
    position: 'absolute',
    top: -32,
    right: -32,
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  decorativeBubble2: {
    position: 'absolute',
    bottom: -24,
    left: -24,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  contentContainer: {
    position: 'relative',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextContainer: {
    flex: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  floatingIndicator: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 16,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -16,
    right: -16,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -8,
    left: -8,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionButtonContent: {
    position: 'relative',
    zIndex: 10,
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});

// Pre-configured action button sets
export const JobActionButtons: ActionButton[] = [
  {
    title: 'Find Jobs',
    subtitle: 'Browse 5K+ opportunities',
    icon: '🎯',
    gradient: ['#10B981', '#059669'],
    badge: 'LIVE',
    onPress: () => {},
  },
  {
    title: 'Post Job',
    subtitle: 'Hire top talent fast',
    icon: '📝',
    gradient: ['#7C3AED', '#5B21B6'],
    badge: 'NEW',
    onPress: () => {},
  },
];

export const PropertyActionButtons: ActionButton[] = [
  {
    title: 'Find Property',
    subtitle: 'Discover your home',
    icon: '🏠',
    gradient: ['#3B82F6', '#1D4ED8'],
    badge: 'LIVE',
    onPress: () => {},
  },
  {
    title: 'List Property',
    subtitle: 'Sell or rent fast',
    icon: '📋',
    gradient: ['#F59E0B', '#D97706'],
    badge: 'FREE',
    onPress: () => {},
  },
];

export default SearchSection;


import React from 'react';
import { View, Text, ImageBackground, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  getDynamicDimensions, 
  getResponsiveMargin, 
  getResponsivePadding, 
  spacing,
  fontSize,
} from '../../utils/responsive';

export interface HeroBannerProps {
  title: string;
  subtitle: string;
  emoji?: string;
  countryFlag?: string;
  backgroundType?: 'gradient' | 'kenyan-landscape' | 'professionals' | 'tech-pattern';
  primaryColor?: string;
  secondaryColor?: string;
  children?: React.ReactNode;
  statusBarStyle?: 'light-content' | 'dark-content';
  height?: 'compact' | 'medium' | 'tall';
  showDecorations?: boolean;
}

const HeroBanner: React.FC<HeroBannerProps> = ({
  title,
  subtitle,
  emoji = '🚀',
  countryFlag = '🇰🇪',
  backgroundType = 'gradient',
  primaryColor = '#059669',
  secondaryColor = '#10B981',
  children,
  statusBarStyle = 'light-content',
  height = 'medium',
  showDecorations = true,
}) => {
  const { width: screenWidth, height: screenHeight, deviceType, isTablet } = getDynamicDimensions();

  // Height calculations based on prop
  const getHeroBannerHeight = () => {
    const baseHeight = screenHeight * 0.35; // 35% of screen height
    switch (height) {
      case 'compact':
        return Math.min(baseHeight * 0.7, isTablet ? 200 : 160);
      case 'tall':
        return Math.min(baseHeight * 1.3, isTablet ? 400 : 320);
      default: // medium
        return Math.min(baseHeight, isTablet ? 300 : 240);
    }
  };

  const bannerHeight = getHeroBannerHeight();

  // Background gradients and patterns
  const getBackgroundGradient = () => {
    switch (backgroundType) {
      case 'kenyan-landscape':
        return [
          '#059669', // Forest green
          '#10B981', // Emerald
          '#34D399', // Light emerald
          '#F59E0B', // Sunset orange
        ];
      case 'professionals':
        return [
          '#1E40AF', // Professional blue
          '#3B82F6', // Blue
          '#059669', // Green accent
          '#8B5CF6', // Purple accent
        ];
      case 'tech-pattern':
        return [
          '#4C1D95', // Deep purple
          '#7C3AED', // Purple
          '#059669', // Tech green
          '#06B6D4', // Cyan
        ];
      default: // gradient
        return [primaryColor, secondaryColor];
    }
  };

  const gradientColors = getBackgroundGradient() as [any, any, ...any[]];

  // Kenyan-inspired decorative elements
  const renderDecorations = () => {
    if (!showDecorations) return null;

    const decorations = [];
    
    switch (backgroundType) {
      case 'kenyan-landscape':
        decorations.push(
          // Acacia tree silhouettes
          <View key="acacia1" style={{
            position: 'absolute',
            top: 32,
            right: 48,
            opacity: 0.1
          }}>
            <Text style={{ fontSize: isTablet ? 40 : 32, color: 'white' }}>🌳</Text>
          </View>,
          <View key="acacia2" style={{
            position: 'absolute',
            top: 64,
            left: 32,
            opacity: 0.1
          }}>
            <Text style={{ fontSize: isTablet ? 32 : 24, color: 'white' }}>🌲</Text>
          </View>,
          // Mount Kenya silhouette
          <View key="mountain" style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            opacity: 0.05
          }}>
            <Text style={{ fontSize: isTablet ? 60 : 48, color: 'white' }}>⛰️</Text>
          </View>
        );
        break;
      
      case 'professionals':
        decorations.push(
          // Professional icons
          <View key="briefcase" style={{
            position: 'absolute',
            top: 24,
            right: 32,
            opacity: 0.1
          }}>
            <Text style={{ fontSize: isTablet ? 36 : 28, color: 'white' }}>💼</Text>
          </View>,
          <View key="handshake" style={{
            position: 'absolute',
            top: 80,
            left: 48,
            opacity: 0.1
          }}>
            <Text style={{ fontSize: isTablet ? 32 : 24, color: 'white' }}>🤝</Text>
          </View>,
          <View key="graduation" style={{
            position: 'absolute',
            bottom: 32,
            left: 24,
            opacity: 0.1
          }}>
            <Text style={{ fontSize: isTablet ? 28 : 20, color: 'white' }}>🎓</Text>
          </View>
        );
        break;
      
      case 'tech-pattern':
        decorations.push(
          // Tech icons
          <View key="laptop" style={{
            position: 'absolute',
            top: 16,
            right: 24,
            opacity: 0.1
          }}>
            <Text style={{ fontSize: isTablet ? 32 : 24, color: 'white' }}>💻</Text>
          </View>,
          <View key="mobile" style={{
            position: 'absolute',
            top: 64,
            left: 16,
            opacity: 0.1
          }}>
            <Text style={{ fontSize: isTablet ? 28 : 20, color: 'white' }}>📱</Text>
          </View>,
          <View key="code" style={{
            position: 'absolute',
            bottom: 24,
            right: 48,
            opacity: 0.1
          }}>
            <Text style={{ fontSize: isTablet ? 24 : 18, color: 'white' }}>⚡</Text>
          </View>
        );
        break;
      
      default:
        decorations.push(
          // Abstract geometric shapes
          <View key="circle1" style={{
            position: 'absolute',
            top: -32,
            right: -32,
            width: 96,
            height: 96,
            backgroundColor: 'white',
            opacity: 0.05,
            borderRadius: 48
          }} />,
          <View key="circle2" style={{
            position: 'absolute',
            top: 48,
            left: -16,
            width: 64,
            height: 64,
            backgroundColor: 'white',
            opacity: 0.1,
            borderRadius: 32
          }} />,
          <View key="circle3" style={{
            position: 'absolute',
            bottom: -16,
            right: 64,
            width: 80,
            height: 80,
            backgroundColor: 'white',
            opacity: 0.05,
            borderRadius: 40
          }} />
        );
    }

    return decorations;
  };

  return (
    <>
      <StatusBar barStyle={statusBarStyle} backgroundColor={primaryColor} />
      <View style={{
        position: 'relative',
        overflow: 'hidden',
        height: bannerHeight
      }}>
        {/* Background Gradient */}
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
        />

        {/* Kenyan Pattern Overlay (subtle) - Simplified for mobile */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.05
        }}>
          <View style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(255,255,255,0.05)'
          }} />
        </View>

        {/* Decorative Elements */}
        {renderDecorations()}

        {/* Content Container */}
        <View 
          style={{ 
            position: 'relative',
            zIndex: 10,
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
          }}
        >
          {/* Header Row */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: spacing.sm
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: isTablet ? fontSize['3xl'] : fontSize['2xl'], 
                fontWeight: '900', 
                color: 'white', 
                marginBottom: spacing.xs,
                textShadowColor: 'rgba(0,0,0,0.3)',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 2,
              }}>
                {emoji} {title}
              </Text>
              <Text style={{ 
                color: 'rgba(255,255,255,0.9)', 
                fontSize: isTablet ? fontSize.lg : fontSize.base, 
                fontWeight: '500',
                textShadowColor: 'rgba(0,0,0,0.2)',
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 1,
              }}>
                {subtitle}
              </Text>
            </View>
            
            {/* Country Flag */}
            <View 
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                padding: spacing.sm,
                width: isTablet ? 64 : 56,
                height: isTablet ? 64 : 56,
              }}
            >
              <Text style={{ 
                color: 'white', 
                fontSize: isTablet ? fontSize['2xl'] : fontSize.xl 
              }}>
                {countryFlag}
              </Text>
            </View>
          </View>

          {/* Children Content */}
          {children && (
            <View style={{ marginTop: spacing.sm }}>
              {children}
            </View>
          )}
        </View>
      </View>
    </>
  );
};

export default HeroBanner;


import React from 'react';
import { View, ScrollView, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '../../utils/responsive';

interface ResponsiveScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  centered?: boolean;
  maxWidth?: boolean;
  safeArea?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

/**
 * ResponsiveScreenWrapper
 * Wraps screen content with responsive padding and optional centering
 * Use this as a quick way to make any screen responsive
 */
export const ResponsiveScreenWrapper: React.FC<ResponsiveScreenWrapperProps> = ({
  children,
  scrollable = true,
  centered = true,
  maxWidth = true,
  safeArea = true,
  style,
  contentContainerStyle,
}) => {
  const layout = useResponsiveLayout();
  
  const containerStyle: ViewStyle = {
    flex: 1,
  };
  
  const innerContainerStyle: ViewStyle = {
    ...layout.containerPadding,
    ...(maxWidth && layout.contentMaxWidth && {
      maxWidth: layout.contentMaxWidth,
    }),
    ...(centered && layout.isDesktop && {
      alignSelf: 'center',
      width: '100%',
    }),
  };
  
  const Wrapper = safeArea ? SafeAreaView : View;
  
  if (scrollable) {
    return (
      <Wrapper style={[containerStyle, style]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[innerContainerStyle, contentContainerStyle]}
        >
          {children}
        </ScrollView>
      </Wrapper>
    );
  }
  
  return (
    <Wrapper style={[containerStyle, style]}>
      <View style={[innerContainerStyle, contentContainerStyle]}>
        {children}
      </View>
    </Wrapper>
  );
};

export default ResponsiveScreenWrapper;

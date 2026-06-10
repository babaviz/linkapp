import React from 'react';
import { View, ViewStyle, StyleSheet, ScrollView } from 'react-native';
import { useResponsiveLayout } from '../../utils/responsive';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  centered?: boolean;
  maxWidth?: boolean;
  scrollable?: boolean;
  contentInsetAdjustmentBehavior?: 'automatic' | 'scrollableAxes' | 'never' | 'always';
}

/**
 * ResponsiveContainer
 * Provides consistent padding and max-width for tablet and desktop layouts
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  style,
  centered = true,
  maxWidth = true,
  scrollable = false,
  contentInsetAdjustmentBehavior = 'automatic',
}) => {
  const layout = useResponsiveLayout();
  
  const containerStyle: ViewStyle = {
    flex: 1,
    ...layout.containerPadding,
    ...(maxWidth && layout.contentMaxWidth && {
      maxWidth: layout.contentMaxWidth,
    }),
    ...(centered && layout.isDesktop && {
      alignSelf: 'center',
      width: '100%',
    }),
  };
  
  if (scrollable) {
    return (
      <ScrollView
        style={[styles.scrollContainer, style]}
        contentContainerStyle={containerStyle}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
      >
        {children}
      </ScrollView>
    );
  }
  
  return (
    <View style={[containerStyle, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
});

export default ResponsiveContainer;

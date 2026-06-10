/**
 * StandardScreenTitle Component
 * Consistent screen title typography matching Jobs & Skills page styling
 */

import React from 'react';
import { Text, TextStyle } from 'react-native';
import { getDynamicDimensions } from '../../utils/responsive';

interface StandardScreenTitleProps {
  children: React.ReactNode;
  color?: string;
  style?: TextStyle;
  testID?: string;
  numberOfLines?: number;
}

const StandardScreenTitle: React.FC<StandardScreenTitleProps> = ({
  children,
  color = '#1F2937', // Default dark color, can be overridden for different backgrounds
  style,
  testID,
  numberOfLines,
  ...props
}) => {
  const { width: screenWidth, isTablet } = getDynamicDimensions();

  // Consistent font sizing matching Jobs & Skills page
  const standardTitleStyle: TextStyle = {
    fontSize: isTablet ? 36 : screenWidth < 360 ? 24 : 30,
    fontWeight: '800',
    color: color,
    letterSpacing: -0.5,
    lineHeight: isTablet ? 42 : screenWidth < 360 ? 28 : 36, // Better line height for readability
  };

  return (
    <Text
      style={[standardTitleStyle, style]}
      allowFontScaling={true}
      maxFontSizeMultiplier={1.5} // Support accessibility font scaling
      accessibilityRole="header"
      testID={testID}
      numberOfLines={numberOfLines}
      {...props}
    >
      {children}
    </Text>
  );
};

export default StandardScreenTitle;

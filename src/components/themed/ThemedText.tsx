/**
 * Themed Text Component
 * Example of using typography system
 */

import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTypography, useColors, createTextStyle } from '../../theme';
import { TextStyleVariant, FontWeight } from '../../theme/typography';
import { ModuleName } from '../../theme/colors';

interface ThemedTextProps extends TextProps {
  variant?: TextStyleVariant;
  weight?: FontWeight;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  moduleOverride?: ModuleName;
  children: React.ReactNode;
}

export const ThemedText: React.FC<ThemedTextProps> = ({
  variant = 'body1',
  weight,
  color,
  align,
  moduleOverride,
  style,
  children,
  ...props
}) => {
  // Get theme values
  const typography = useTypography();
  const colors = useColors(moduleOverride);
  
  // Create text style
  const textStyle = createTextStyle({
    size: variant,
    weight,
    color: color || colors.text.primary,
    align,
  });
  
  return (
    <Text style={[textStyle, style]} {...props}>
      {children}
    </Text>
  );
};

// Pre-configured text components for common use cases
export const Heading1: React.FC<Omit<ThemedTextProps, 'variant'>> = (props) => (
  <ThemedText variant="h1" {...props} />
);

export const Heading2: React.FC<Omit<ThemedTextProps, 'variant'>> = (props) => (
  <ThemedText variant="h2" {...props} />
);

export const Heading3: React.FC<Omit<ThemedTextProps, 'variant'>> = (props) => (
  <ThemedText variant="h3" {...props} />
);

export const Heading4: React.FC<Omit<ThemedTextProps, 'variant'>> = (props) => (
  <ThemedText variant="h4" {...props} />
);

export const Heading5: React.FC<Omit<ThemedTextProps, 'variant'>> = (props) => (
  <ThemedText variant="h5" {...props} />
);

export const Heading6: React.FC<Omit<ThemedTextProps, 'variant'>> = (props) => (
  <ThemedText variant="h6" {...props} />
);

export const Body1: React.FC<Omit<ThemedTextProps, 'variant'>> = (props) => (
  <ThemedText variant="body1" {...props} />
);

export const Body2: React.FC<Omit<ThemedTextProps, 'variant'>> = (props) => (
  <ThemedText variant="body2" {...props} />
);

export const Subtitle1: React.FC<Omit<ThemedTextProps, 'variant'>> = (props) => (
  <ThemedText variant="subtitle1" {...props} />
);

export const Subtitle2: React.FC<Omit<ThemedTextProps, 'variant'>> = (props) => (
  <ThemedText variant="subtitle2" {...props} />
);

export const Caption: React.FC<Omit<ThemedTextProps, 'variant'>> = (props) => (
  <ThemedText variant="caption" {...props} />
);

export const Overline: React.FC<Omit<ThemedTextProps, 'variant'>> = (props) => (
  <ThemedText variant="overline" {...props} />
);

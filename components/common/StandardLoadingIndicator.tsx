import React from 'react';
import { ActivityIndicator, ActivityIndicatorProps, StyleSheet } from 'react-native';
import { colors } from '../../theme';

interface StandardLoadingIndicatorProps extends Omit<ActivityIndicatorProps, 'color'> {
  variant?: 'primary' | 'secondary' | 'white' | 'dark';
  size?: 'small' | 'large';
}

export const StandardLoadingIndicator: React.FC<StandardLoadingIndicatorProps> = ({
  variant = 'primary',
  size = 'large',
  style,
  ...rest
}) => {
  const getColor = () => {
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.text.secondary;
      case 'white':
        return '#FFFFFF';
      case 'dark':
        return colors.text.primary;
      default:
        return colors.primary;
    }
  };

  return (
    <ActivityIndicator
      size={size}
      color={getColor()}
      style={[styles.indicator, style]}
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  indicator: {
    marginVertical: 8,
  },
});

export default StandardLoadingIndicator;

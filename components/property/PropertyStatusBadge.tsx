/**
 * PropertyStatusBadge Component
 * Displays property status with appropriate colors and styling
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PropertyStatus } from '../../types/property';
import { getPropertyStatusInfo } from '../../utils/propertyHelpers';

interface PropertyStatusBadgeProps {
  status: PropertyStatus;
  size?: 'small' | 'medium' | 'large';
  variant?: 'filled' | 'outlined';
}

const PropertyStatusBadge: React.FC<PropertyStatusBadgeProps> = ({
  status,
  size = 'medium',
  variant = 'filled'
}) => {
  const statusInfo = getPropertyStatusInfo(status);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: { paddingHorizontal: 8, paddingVertical: 4 },
          text: { fontSize: 12 }
        };
      case 'large':
        return {
          container: { paddingHorizontal: 16, paddingVertical: 8 },
          text: { fontSize: 16 }
        };
      default: // medium
        return {
          container: { paddingHorizontal: 12, paddingVertical: 4 },
          text: { fontSize: 14 }
        };
    }
  };

  const sizeStyles = getSizeStyles();

  if (variant === 'outlined') {
    return (
      <View 
        style={[
          styles.container,
          sizeStyles.container,
          {
            borderColor: statusInfo.color,
            backgroundColor: 'transparent',
            borderWidth: 2
          }
        ]}
      >
        <Text 
          style={[
            styles.text,
            sizeStyles.text,
            { color: statusInfo.color }
          ]}
        >
          {statusInfo.label}
        </Text>
      </View>
    );
  }

  // Filled variant (default)
  return (
    <View 
      style={[
        styles.container,
        sizeStyles.container,
        { backgroundColor: statusInfo.color }
      ]}
    >
      <Text style={[
        styles.text,
        styles.whiteText,
        sizeStyles.text
      ]}>
        {statusInfo.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  whiteText: {
    color: '#FFFFFF',
  },
});

export default PropertyStatusBadge;

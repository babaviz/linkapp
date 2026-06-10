/**
 * PriceDisplay Component  
 * Displays property prices with consistent formatting and styling
 */

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { formatPrice } from '../../utils/propertyHelpers';

interface PriceDisplayProps {
  price: number;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  color?: string;
  showCurrency?: boolean;
  period?: string; // e.g., "/month", "/year"
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  size = 'medium',
  color,
  showCurrency = true,
  period,
  align = 'left',
  bold = true
}) => {
  const getSizeStyle = () => {
    switch (size) {
      case 'small': return { fontSize: 14 };
      case 'large': return { fontSize: 20 };
      case 'xlarge': return { fontSize: 24 };
      default: return { fontSize: 18 }; // medium
    }
  };

  const getAlignStyle = () => {
    switch (align) {
      case 'center': return { textAlign: 'center' as const };
      case 'right': return { textAlign: 'right' as const };
      default: return { textAlign: 'left' as const }; // left
    }
  };

  const priceText = showCurrency ? formatPrice(price) : price.toLocaleString();
  const textColor = color || '#059669';
  const fontWeight = bold ? '700' as const : '500' as const;

  return (
    <View style={styles.container}>
      <Text 
        style={[
          getSizeStyle(),
          {
            color: textColor,
            fontWeight: fontWeight
          },
          getAlignStyle()
        ]}
      >
        {priceText}
      </Text>
      {period && (
        <Text style={[
          getSizeStyle(),
          {
            color: '#6B7280',
            fontWeight: '400',
            marginLeft: 4
          },
          getAlignStyle()
        ]}>
          {period}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
});

export default PriceDisplay;

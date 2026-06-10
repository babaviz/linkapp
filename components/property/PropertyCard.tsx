/**
 * PropertyCard Component
 * Simple, clean property card matching the screenshot design
 */

import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { Property } from '../../types/property';
import { formatPrice } from '../../utils/propertyHelpers';
import { colors, shadows, borderRadius, spacing } from '../../theme';
import { useAppSelector } from '../../redux/hooks';
import { useResponsiveLayout } from '../../utils/responsive';

interface PropertyCardProps {
  property: Property;
  onPress?: (property: Property) => void;
  showStatus?: boolean;
  style?: any;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onPress,
  showStatus = true,
  style,
}) => {
  const { theme } = useAppSelector(state => state.user);
  const isDarkMode = theme === 'dark';
  const layout = useResponsiveLayout();
  
  const imageHeight = layout.isDesktop ? 240 : layout.isTablet ? 220 : 200;
  
  const handlePress = () => {
    onPress?.(property);
  };

  // Get the first image or use a placeholder
  const imageUrl = property.images && property.images.length > 0 
    ? property.images[0] 
    : 'https://via.placeholder.com/300x200/f0f0f0/999999?text=No+Image';

  // Format bedrooms and bathrooms
  const bedroomsText = property.bedrooms ? `${property.bedrooms} Bed` : '';
  const bathroomsText = property.bathrooms ? `${property.bathrooms} Bath` : '';
  const areaText = property.area_sqm ? `${property.area_sqm} sqm` : '';
  
  // Combine property details
  const details = [bedroomsText, bathroomsText, areaText].filter(Boolean).join(' • ');

  return (
    <TouchableOpacity 
      onPress={handlePress}
      style={[
        {
          backgroundColor: isDarkMode ? colors.secondary[700] : colors.white,
          borderRadius: layout.borderRadius(),
          marginHorizontal: layout.isDesktop ? 0 : spacing[4],
          marginBottom: layout.spacing.md,
          overflow: 'hidden',
          ...shadows.base,
          ...(Platform.OS === 'web' && {
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }),
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      {/* Property Image */}
      <View style={{ position: 'relative' }}>
        <Image
          source={{ uri: imageUrl }}
          style={{
            width: '100%',
            height: imageHeight,
            backgroundColor: colors.secondary[100],
          }}
          resizeMode="cover"
        />
        
        {/* Status Badge */}
        {showStatus && (
          <View style={{
            position: 'absolute',
            top: layout.spacing.sm,
            right: layout.spacing.sm,
            backgroundColor: colors.white,
            paddingHorizontal: layout.spacing.xs,
            paddingVertical: 4,
            borderRadius: borderRadius.md,
            ...shadows.sm,
          }}>
            <Text style={{
              fontSize: layout.fontSize.xs,
              fontWeight: '600',
              color: property.status === 'available' ? colors.successVariants[600] : colors.secondary[600],
              textTransform: 'capitalize',
            }}>
              For Sale
            </Text>
          </View>
        )}
      </View>
      
      {/* Property Details */}
      <View style={{ padding: layout.spacing.md }}>
        {/* Price */}
        <Text style={{
          fontSize: layout.fontSize.xl,
          fontWeight: '700',
          color: isDarkMode ? colors.text.inverse : colors.text.primary,
          marginBottom: spacing[1],
        }}>
          {formatPrice(property.price)}
        </Text>
        
        {/* Property Info */}
        {details && (
          <Text style={{
            fontSize: layout.fontSize.sm,
            color: isDarkMode ? colors.text.tertiary : colors.text.secondary,
            marginBottom: spacing[2],
            fontWeight: '500',
          }}>
            {details}
          </Text>
        )}
        
        {/* Address */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: layout.fontSize.sm, marginRight: 4 }}>📍</Text>
          <Text style={{
            fontSize: layout.fontSize.sm,
            color: isDarkMode ? colors.text.tertiary : colors.text.secondary,
            flex: 1,
            fontWeight: '500',
          }} numberOfLines={1}>
            {property.location.address || `${property.location.town}, ${property.location.county}`}
          </Text>
        </View>
        
        {/* Property Title */}
        <Text style={{
          fontSize: layout.fontSize.md,
          fontWeight: '600',
          color: isDarkMode ? colors.text.inverse : colors.text.primary,
          marginTop: spacing[2],
        }} numberOfLines={2}>
          {property.title}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default React.memo(PropertyCard);

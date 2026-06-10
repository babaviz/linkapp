import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
  Platform,
  Share,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { BaseModal } from '../common/BaseModal';
import { Property } from '../../types/property';
import ImageGallery from './ImageGallery';
import PriceDisplay from './PriceDisplay';
import { colors } from '../../theme';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { submitInquiry } from '../../redux/slices/messageSlice';
import { getPropertyTypeLabel, getPropertyStatusInfo } from '../../utils/propertyHelpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PropertyDetailsModalProps {
  visible: boolean;
  property: Property;
  onClose: () => void;
  userRole: 'tenant' | 'owner';
}

interface AmenityItemProps {
  icon: string;
  label: string;
}

const AmenityItem: React.FC<AmenityItemProps> = React.memo(({ icon, label }) => (
  <View style={styles.amenityItem}>
    <Icon name={icon as any} size={20} color={colors.primary} />
    <Text style={styles.amenityText}>{label}</Text>
  </View>
));

const PropertyDetailsModalFixed: React.FC<PropertyDetailsModalProps> = ({
  visible,
  property,
  onClose,
  userRole,
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { isSubmitting } = useAppSelector(state => state.message);
  
  // State
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);
  
  const handleCall = useCallback(() => {
    if (property.contact_phone) {
      Linking.openURL(`tel:${property.contact_phone}`);
    }
  }, [property.contact_phone]);
  
  const handleMessage = useCallback(() => {
    if (property.contact_phone) {
      const message = `Hi, I'm interested in your property: ${property.title}`;
      if (Platform.OS === 'ios') {
        Linking.openURL(`sms:${property.contact_phone}&body=${encodeURIComponent(message)}`);
      } else {
        Linking.openURL(`sms:${property.contact_phone}?body=${encodeURIComponent(message)}`);
      }
    }
  }, [property.contact_phone, property.title]);
  
  const handleShare = useCallback(async () => {
    try {
      const message = `Check out this property: ${property.title}\nPrice: $${property.price}\nLocation: ${property.location.address}`;
      await Share.share({
        message,
        title: property.title,
      });
    } catch (error) {
      
    }
  }, [property]);
  
  const handleInquiry = useCallback(async () => {
    if (!user?.id || userRole !== 'tenant') {
      alert('Please log in as a tenant to send inquiries');
      return;
    }
    
    setIsSubmittingInquiry(true);
    try {
      await dispatch(submitInquiry({
        inquiryData: {
          property_id: property.id,
          inquirer_id: user.id,
          owner_id: property.owner_id,
          message: `I'm interested in your property: ${property.title}. Please provide more details.`,
          contact_phone: user.phone || '',
          contact_email: user.email || ''
        },
        inquirerName: user.fullName || user.email || 'Interested Buyer'
      })).unwrap();
      
      alert('Inquiry sent successfully! The property owner will contact you soon.');
    } catch (error: any) {
      
      alert(error?.message || 'Failed to send inquiry. Please try again.');
    } finally {
      setIsSubmittingInquiry(false);
    }
  }, [user, userRole, property, dispatch]);
  
  const getAmenityIcon = (amenity: string): string => {
    const iconMap: { [key: string]: string } = {
      'WiFi': 'wifi',
      'Parking': 'local-parking',
      'Air Conditioning': 'ac-unit',
      'Kitchen': 'kitchen',
      'Laundry': 'local-laundry-service',
      'Gym': 'fitness-center',
      'Pool': 'pool',
      'Security': 'security',
      'Pet Friendly': 'pets',
      'Balcony': 'balcony',
      'Garden': 'park',
      'Elevator': 'elevator',
    };
    return iconMap[amenity] || 'check-circle';
  };
  
  const statusInfo = getPropertyStatusInfo(property.status);
  
  // Custom header with share button
  const renderHeader = () => (
    <View style={styles.customHeader}>
      <Text style={styles.headerTitle}>{property.title}</Text>
      <TouchableOpacity
        onPress={handleShare}
        style={styles.shareButton}
        accessibilityLabel="Share property"
      >
        <Icon name="share" size={24} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
  
  // Contact actions footer
  const renderFooter = () => {
    if (userRole !== 'tenant') return null;
    
    return (
      <View style={styles.contactActions}>
        <TouchableOpacity
          style={[styles.contactButton, styles.callButton]}
          onPress={handleCall}
          disabled={!property.contact_phone}
        >
          <Icon name="phone" size={20} color={colors.white} />
          <Text style={styles.contactButtonText}>Call</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.contactButton, styles.messageButton]}
          onPress={handleMessage}
          disabled={!property.contact_phone}
        >
          <Icon name="message" size={20} color={colors.white} />
          <Text style={styles.contactButtonText}>Message</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.contactButton, styles.inquiryButton]}
          onPress={handleInquiry}
          disabled={isSubmittingInquiry || !user?.id}
        >
          {(isSubmittingInquiry || isSubmitting) ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Icon name="mail" size={20} color={colors.white} />
              <Text style={styles.contactButtonText}>Inquire</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      size="fullscreen"
      animationType="slideUp"
      headerContent={renderHeader()}
      footerContent={renderFooter()}
      showCloseButton={true}
      dismissOnBackdrop={false}
    >
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Image Gallery */}
        <View style={styles.galleryContainer}>
          <ImageGallery
            images={property.images}
            height={300}
            onImagePress={(index) => {
              setSelectedImageIndex(index);
              setShowFullGallery(true);
            }}
            showIndicators
            
          />
          
          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusText}>{statusInfo.label}</Text>
          </View>
          
          {/* Image Count */}
          <TouchableOpacity
            style={styles.imageCountBadge}
            onPress={() => setShowFullGallery(true)}
          >
            <Icon name="photo-library" size={18} color={colors.white} />
            <Text style={styles.imageCountText}>{property.images.length} Photos</Text>
          </TouchableOpacity>
        </View>
        
        {/* Property Info */}
        <View style={styles.contentSection}>
          <View style={styles.priceSection}>
            <PriceDisplay price={property.price} size="xlarge" />
            <Text style={styles.propertyType}>
              {getPropertyTypeLabel(property.property_type)}
            </Text>
          </View>
          
          <Text style={styles.title}>{property.title}</Text>
          
          <View style={styles.locationRow}>
            <Icon name="location-on" size={20} color={colors.textSecondary} />
            <Text style={styles.locationText}>{property.location.address}</Text>
          </View>
          
          {/* Key Features */}
          <View style={styles.keyFeatures}>
            {property.bedrooms && (
              <View style={styles.featureItem}>
                <Icon name="bed" size={18} color={colors.primary} />
                <Text style={styles.featureText}>
                  {property.bedrooms} Bed{property.bedrooms > 1 ? 's' : ''}
                </Text>
              </View>
            )}
            
            {property.bathrooms && (
              <View style={styles.featureItem}>
                <Icon name="bathtub" size={18} color={colors.primary} />
                <Text style={styles.featureText}>
                  {property.bathrooms} Bath{property.bathrooms > 1 ? 's' : ''}
                </Text>
              </View>
            )}
            
            {property.area_sqm && (
              <View style={styles.featureItem}>
                <Icon name="square-foot" size={18} color={colors.primary} />
                <Text style={styles.featureText}>{property.area_sqm} sqft</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Description */}
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{property.description}</Text>
        </View>
        
        {/* Amenities */}
        {property.amenities && property.amenities.length > 0 && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {property.amenities.map((amenity, index) => (
                <AmenityItem
                  key={index}
                  icon={getAmenityIcon(amenity)}
                  label={amenity}
                />
              ))}
            </View>
          </View>
        )}
        
        {/* Location Map */}
        {property.location.coordinates && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: property.location.coordinates.latitude,
                  longitude: property.location.coordinates.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: property.location.coordinates.latitude,
                    longitude: property.location.coordinates.longitude,
                  }}
                  title={property.title}
                />
              </MapView>
              <TouchableOpacity
                style={styles.mapOverlay}
                onPress={() => {
                  const lat = property.location.coordinates!.latitude;
                  const lng = property.location.coordinates!.longitude;
                  const url = Platform.select({
                    ios: `maps:${lat},${lng}?q=${property.title}`,
                    android: `geo:${lat},${lng}?q=${lat},${lng}(${property.title})`,
                  });
                  if (url) Linking.openURL(url);
                }}
              >
                <Icon name="directions" size={20} color={colors.primary} />
                <Text style={styles.mapOverlayText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Owner Info */}
        {property.agent_info && userRole === 'tenant' && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Posted By</Text>
            <View style={styles.ownerInfo}>
              <View style={styles.ownerAvatar}>
                <Text style={styles.ownerAvatarText}>
                  {property.agent_info.name?.charAt(0).toUpperCase() || 'O'}
                </Text>
              </View>
              <View style={styles.ownerDetails}>
                <Text style={styles.ownerName}>
                  {property.agent_info.name || 'Property Owner'}
                </Text>
                <Text style={styles.ownerType}>
                  {property.agent_info.company ? `Agent - ${property.agent_info.company}` : 'Property Owner'}
                </Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Add padding at bottom to account for footer */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </BaseModal>
  );
};

const styles = StyleSheet.create({
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  shareButton: {
    padding: 8,
  },
  galleryContainer: {
    position: 'relative',
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageCountText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  contentSection: {
    padding: 20,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  propertyType: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginLeft: 6,
    flex: 1,
  },
  keyFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    margin: 6,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text.secondary,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  amenityText: {
    fontSize: 14,
    color: colors.text.primary,
    marginLeft: 8,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 3,
  },
  mapOverlayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 6,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerAvatarText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  ownerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  ownerType: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  contactActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  callButton: {
    backgroundColor: colors.success,
  },
  messageButton: {
    backgroundColor: colors.info,
  },
  inquiryButton: {
    backgroundColor: colors.primary,
  },
  contactButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default React.memo(PropertyDetailsModalFixed);


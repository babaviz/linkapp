import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Linking,
  Platform,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { Property } from '../../types/property';
import ImageGallery from './ImageGallery';
import PriceDisplay from './PriceDisplay';
import { colors } from '../../theme';
import { getCrossPlatformShadow } from '../../utils/crossPlatformShadows';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { submitInquiry } from '../../redux/slices/messageSlice';
import { getPropertyTypeLabel, getPropertyStatusInfo } from '../../utils/propertyHelpers';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PropertyDetailsModalProps {
  visible: boolean;
  property: Property;
  onClose: () => void;
  userRole: 'tenant' | 'owner';
}

interface AmenityItemProps {
  icon: string;
  label: string;
  isDarkMode: boolean;
}

const AmenityItem: React.FC<AmenityItemProps> = React.memo(({ icon, label, isDarkMode }) => (
  <View style={styles.amenityItem}>
    <Icon name={icon as any} size={20} color={colors.primary} />
    <Text style={[styles.amenityText, { color: isDarkMode ? colors.text.inverse : colors.text.primary }]}>
      {label}
    </Text>
  </View>
));

const PropertyDetailsModal: React.FC<PropertyDetailsModalProps> = ({
  visible,
  property,
  onClose,
  userRole,
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { currentProfile } = useAppSelector(state => state.user);
  const { isSubmitting, error } = useAppSelector(state => state.message);
  const isDarkMode = false; // For now, use light mode. TODO: Implement proper theme detection
  
  // State
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);
  
  // Animations
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.timing(contentFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(contentFadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);
  
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
      
      // Show success message
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
  
  const modalStyle = {
    backgroundColor: isDarkMode ? colors.secondary[900] : colors.background,
  };
  
  const statusInfo = getPropertyStatusInfo(property.status);
  
  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
      
      <Animated.View
        style={[
          styles.modalContainer,
          modalStyle,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close property details"
              accessibilityRole="button"
            >
              <Icon name="close" size={24} color={isDarkMode ? colors.text.inverse : colors.text.primary} />
            </TouchableOpacity>
            
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleShare}
                style={styles.headerActionButton}
                accessibilityLabel="Share property"
                accessibilityRole="button"
              >
                <Icon name="share" size={24} color={isDarkMode ? colors.text.inverse : colors.text.primary} />
              </TouchableOpacity>
            </View>
          </View>
          
          <Animated.ScrollView
            style={{ opacity: contentFadeAnim }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
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
                accessibilityLabel={`View all ${property.images.length} images`}
                accessibilityRole="button"
              >
                <Icon name="photo-library" size={18} color={colors.white} />
                <Text style={styles.imageCountText}>{property.images.length} Photos</Text>
              </TouchableOpacity>
            </View>
            
            {/* Property Info */}
            <View style={[styles.contentSection, { backgroundColor: isDarkMode ? colors.secondary[700] : colors.surface }]}>
              <View style={styles.priceSection}>
                <PriceDisplay price={property.price} size="xlarge" />
                <Text style={[styles.propertyType, { color: isDarkMode ? colors.text.tertiary : colors.text.secondary }]}>
                  {getPropertyTypeLabel(property.property_type)}
                </Text>
              </View>
              
              <Text style={[styles.title, { color: isDarkMode ? colors.text.inverse : colors.text.primary }]}>
                {property.title}
              </Text>
              
              <View style={styles.locationRow}>
                <Icon name="location-on" size={20} color={colors.textSecondary} />
                <Text style={[styles.locationText, { color: isDarkMode ? colors.text.tertiary : colors.text.secondary }]}>
                  {property.location.address}
                </Text>
              </View>
              
              {/* Key Features */}
              <View style={styles.keyFeatures}>
                {property.bedrooms && (
                  <View style={[styles.featureItem, { backgroundColor: isDarkMode ? colors.secondary[900] : '#F3F4F6' }]}>
                    <Icon name="bed" size={18} color={colors.primary} />
                    <Text style={[styles.featureText, { color: isDarkMode ? colors.text.inverse : colors.text.primary }]}>
                      {property.bedrooms} Bed{property.bedrooms > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
                
                {property.bathrooms && (
                  <View style={[styles.featureItem, { backgroundColor: isDarkMode ? colors.secondary[900] : '#F3F4F6' }]}>
                    <Icon name="bathtub" size={18} color={colors.primary} />
                    <Text style={[styles.featureText, { color: isDarkMode ? colors.text.inverse : colors.text.primary }]}>
                      {property.bathrooms} Bath{property.bathrooms > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
                
                {property.area_sqm && (
                  <View style={[styles.featureItem, { backgroundColor: isDarkMode ? colors.secondary[900] : '#F3F4F6' }]}>
                    <Icon name="square-foot" size={18} color={colors.primary} />
                    <Text style={[styles.featureText, { color: isDarkMode ? colors.text.inverse : colors.text.primary }]}>
                      {property.area_sqm} sqm
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Description */}
            <View style={[styles.contentSection, { backgroundColor: isDarkMode ? colors.secondary[700] : colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: isDarkMode ? colors.text.inverse : colors.text.primary }]}>
                Description
              </Text>
              <Text style={[styles.description, { color: isDarkMode ? colors.text.tertiary : colors.text.secondary }]}>
                {property.description}
              </Text>
            </View>
            
            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <View style={[styles.contentSection, { backgroundColor: isDarkMode ? colors.secondary[700] : colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: isDarkMode ? colors.text.inverse : colors.text.primary }]}>
                  Amenities
                </Text>
                <View style={styles.amenitiesGrid}>
                  {property.amenities.map((amenity, index) => (
                    <AmenityItem
                      key={index}
                      icon={getAmenityIcon(amenity)}
                      label={amenity}
                      isDarkMode={isDarkMode}
                    />
                  ))}
                </View>
              </View>
            )}
            
            {/* Location Map */}
            {property.location.coordinates && (
              <View style={[styles.contentSection, { backgroundColor: isDarkMode ? colors.secondary[700] : colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: isDarkMode ? colors.text.inverse : colors.text.primary }]}>
                  Location
                </Text>
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
                    accessibilityLabel="Open in maps"
                    accessibilityRole="button"
                  >
                    <Icon name="directions" size={20} color={colors.primary} />
                    <Text style={styles.mapOverlayText}>Get Directions</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Owner Info */}
            {userRole === 'tenant' && (
              <View style={[styles.contentSection, { backgroundColor: isDarkMode ? colors.secondary[700] : colors.surface }]}>
                <Text style={[styles.sectionTitle, { color: isDarkMode ? colors.text.inverse : colors.text.primary }]}>
                  Contact Information
                </Text>
                <View style={styles.ownerInfo}>
                  <View style={styles.ownerAvatar}>
                    <Text style={styles.ownerAvatarText}>O</Text>
                  </View>
                  <View style={styles.ownerDetails}>
                    <Text style={[styles.ownerName, { color: isDarkMode ? colors.text.inverse : colors.text.primary }]}>
                      Property Owner
                    </Text>
                    {property.contact_phone && (
                      <Text style={[styles.ownerType, { color: isDarkMode ? colors.text.tertiary : colors.text.secondary }]}>
                        {property.contact_phone}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            )}
          </Animated.ScrollView>
          
          {/* Contact Actions */}
          {userRole === 'tenant' && (
            <Animated.View 
              style={[
                styles.contactActions,
                getCrossPlatformShadow({ elevation: 8 }),
                { 
                  opacity: contentFadeAnim,
                  backgroundColor: isDarkMode ? colors.secondary[700] : colors.surface,
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.contactButton, styles.callButton]}
                onPress={handleCall}
                disabled={!property.contact_phone}
                accessibilityLabel="Call property owner"
                accessibilityRole="button"
              >
                <Icon name="phone" size={20} color={colors.white} />
                <Text style={styles.contactButtonText}>Call</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.contactButton, styles.messageButton]}
                onPress={handleMessage}
                disabled={!property.contact_phone}
                accessibilityLabel="Message property owner"
                accessibilityRole="button"
              >
                <Icon name="message" size={20} color={colors.white} />
                <Text style={styles.contactButtonText}>Message</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.contactButton, styles.inquiryButton]}
                onPress={handleInquiry}
                disabled={isSubmittingInquiry || !user?.id}
                accessibilityLabel="Send inquiry"
                accessibilityRole="button"
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
            </Animated.View>
          )}
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  scrollContent: {
    paddingBottom: 120,
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
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: {
    fontSize: 16,
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
    borderRadius: 8,
    margin: 6,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
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
    marginBottom: 2,
  },
  ownerType: {
    fontSize: 14,
  },
  contactActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 24,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
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

export default React.memo(PropertyDetailsModal);

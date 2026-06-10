/**
 * PropertyDetailsScreen
 * Mobile-optimized property details view with clean, minimal design
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  Linking,
  Alert,
  Dimensions,
  StyleSheet,
  StatusBar,
  Image,
  Modal,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PropertyStackParamList } from '../../navigation/PropertyStackNavigator';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { colors, shadows } from '../../theme';
import {
  toggleFavoriteProperty,
  updatePropertyStatus,
  deleteProperty,
  getPropertyById
} from '../../redux/slices/propertySlice';
import {
  formatPrice,
  getPropertyStatusInfo
} from '../../utils/propertyHelpers';
import type { PropertyStatus } from '../../types/property';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { RelatedItemsSection } from '../../components/common/RelatedItemsSection';
import { 
  relatedCategoryRecommendationService,
  RelatedItem 
} from '../../services/relatedCategoryRecommendationService';

type PropertyDetailsRouteProp = RouteProp<PropertyStackParamList, 'PropertyDetails'>;
type PropertyDetailsNavigationProp = StackNavigationProp<PropertyStackParamList, 'PropertyDetails'>;

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

// Memoized screen for stable navigation performance
const PropertyDetailsScreen = React.memo(function PropertyDetailsScreen() {
  const route = useRoute<PropertyDetailsRouteProp>();
  const navigation = useNavigation<PropertyDetailsNavigationProp>();
  const dispatch = useAppDispatch();

  const { propertyId, property: routeProperty } = route.params;
  
  // Redux state
  const { currentProperty, isLoading, isSubmitting, favoriteProperties } = useAppSelector(state => state.property);
  const { user } = useAppSelector(state => state.auth);

  // Local state
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [relatedProperties, setRelatedProperties] = useState<RelatedItem[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);

  // Use property from route params or Redux state (prefer currentProperty when it matches, for fresh data after status updates)
  const property = (currentProperty?.id === propertyId ? currentProperty : null) ?? routeProperty ?? currentProperty;

  // Ownership and listing status
  const isOwner = Boolean(user?.id && property?.owner_id && user.id === property.owner_id);
  const isListingActive = property?.status === 'available';
  const statusInfo = property ? getPropertyStatusInfo(property.status) : { label: 'Available', color: '#10B981' };

  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    if (property && favoriteProperties) {
      setIsFavorite(favoriteProperties.some(fav => fav.id === property.id));
    }
  }, [property, favoriteProperties]);

  useEffect(() => {
    if (property) {
      loadRelatedProperties();
    }
  }, [property]);

  useFocusEffect(
    useCallback(() => {
      if (propertyId && !routeProperty && (!currentProperty || currentProperty.id !== propertyId)) {
        dispatch(getPropertyById(propertyId));
      }
    }, [propertyId, routeProperty, currentProperty?.id, dispatch])
  );

  const loadRelatedProperties = async () => {
    if (!property) return;
    
    setIsLoadingRelated(true);
    try {
      const related = await relatedCategoryRecommendationService.getRelatedProperties(
        property,
        user?.id,
        { limit: 6, includePopular: true }
      );
      setRelatedProperties(related);
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading related properties:', error);
      }
    } finally {
      setIsLoadingRelated(false);
    }
  };

  const handleRelatedPropertyPress = (item: RelatedItem) => {
    if (user?.id) {
      relatedCategoryRecommendationService.recordRecommendationClick(user.id, item);
    }
    navigation.push('PropertyDetails', { propertyId: item.id, property: undefined });
  };

  // Use the back navigation hook
  const { handleBack } = useBackNavigation({
    fallbackScreen: 'PropertyHub'
  });
  
  const handleShare = async () => {
    if (!property) return;
    try {
      await Share.share({
        title: property.title,
        message: `🏠 ${property.title}\n💰 ${formatPrice(property.price)}\n📍 ${property.location.address}\n\nShared via LinkApp`
      });
    } catch (error) {
      
    }
  };
  
  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    if (property) {
      dispatch(toggleFavoriteProperty(property.id));
    }
  };
  
  const handleCall = () => {
    if (!property?.contact_phone) {
      Alert.alert('Contact Info', 'Phone number not available.');
      return;
    }
    Alert.alert('Call Owner', `Call ${property.contact_phone}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Linking.openURL(`tel:${property.contact_phone}`) }
    ]);
  };
  
  const handleMessage = () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to message the owner.');
      return;
    }
    if (isOwner) {
      Alert.alert('Your Listing', 'View inquiries from potential tenants in the Inquiries screen.', [
        { text: 'View Inquiries', onPress: () => navigation.navigate('PropertyInquiries') },
        { text: 'Cancel', style: 'cancel' }
      ]);
      return;
    }
    if (!property) {
      Alert.alert(
        'Property Unavailable',
        'This property’s details aren’t available right now. Please go back and try again.'
      );
      return;
    }
    
    // Check if this is a demo property
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(property.id) || !uuidPattern.test(property.owner_id)) {
      Alert.alert(
        'Demo Property',
        'This is a demo property listing. Messaging is only available for real property listings.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    navigation.navigate('PropertyChat', {
      property: property,
    });
  };
  
  const handleViewOnMap = () => {
    if (property?.location?.coordinates) {
      const { latitude, longitude } = property.location.coordinates;
      const url = `https://maps.google.com/?q=${latitude},${longitude}`;
      Linking.openURL(url);
    }
  };
  
  const handleScheduleViewing = () => {
    Alert.alert(
      'Schedule Viewing',
      'Would you like to schedule a viewing for this property?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: () => Alert.alert('Success', 'Viewing request sent to owner!') }
      ]
    );
  };

  const handleEditListing = () => {
    if (property) navigation.navigate('EditProperty', { property });
  };

  const handleUpdateStatus = (newStatus: PropertyStatus) => {
    if (!property?.id) return;
    setShowStatusModal(false);
    dispatch(updatePropertyStatus({ propertyId: property.id, status: newStatus })).unwrap()
      .catch(() => Alert.alert('Error', 'Failed to update listing status.'));
  };

  const handleDeleteListing = () => {
    if (!property?.id) return;
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this property listing? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch(deleteProperty(property.id)).unwrap()
              .then(() => {
                Alert.alert('Deleted', 'Property listing has been removed.');
                handleBack();
              })
              .catch(() => Alert.alert('Error', 'Failed to delete listing.'));
          }
        }
      ]
    );
  };

  const handleSendInquiry = () => {
    if (!user) {
      Alert.alert('Login Required', 'Please log in to send inquiries.');
      return;
    }
    if (isOwner) {
      Alert.alert('Your Listing', 'View inquiries from potential tenants in the Inquiries screen.', [
        { text: 'View Inquiries', onPress: () => navigation.navigate('PropertyInquiries') },
        { text: 'Cancel', style: 'cancel' }
      ]);
      return;
    }
    if (!property) {
      Alert.alert(
        'Property Unavailable',
        'This property\'s details aren\'t available right now. Please go back and try again.'
      );
      return;
    }
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(property.id) || !uuidPattern.test(property.owner_id)) {
      Alert.alert(
        'Demo Property',
        'This is a demo property listing. Inquiries can only be sent for real property listings.',
        [{ text: 'OK' }]
      );
      return;
    }
    navigation.navigate('PropertyContact', { property });
  };

  // Loading or no property state
  if (isLoading || !property) {
    return (
      <SafeAreaView>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Fixed Header Overlay */}
      <View style={styles.headerOverlay}>
        <SafeAreaView>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
              <Icon name="arrow-back" size={24} color={colors.white} />
            </TouchableOpacity>
            
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleToggleFavorite} style={styles.headerButton}>
                <Icon 
                  name={isFavorite ? 'favorite' : 'favorite-border'} 
                  size={22} 
                  color={isFavorite ? '#ef4444' : colors.white} 
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
                <Icon name="share" size={22} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleViewOnMap} style={styles.headerButton}>
                <Icon name="map" size={22} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Property Image */}
        <View style={styles.imageContainer}>
          {property.images && property.images.length > 0 ? (
            <Image
              source={{ uri: property.images[selectedImageIndex] }}
              style={styles.propertyImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.propertyImage, { backgroundColor: colors.secondary[200], alignItems: 'center', justifyContent: 'center' }]}>
              <Icon name="home" size={64} color={colors.text.secondary} />
            </View>
          )}
          
          {/* Price Badge */}
          <View style={styles.priceBadge}>
            <Text style={styles.priceBadgeText}>{formatPrice(property.price)}</Text>
            <Text style={styles.priceSubtext}>/month</Text>
          </View>
          
          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusBadgeText}>{statusInfo.label}</Text>
          </View>
          
          {/* Image Count */}
          {property.images && property.images.length > 1 && (
            <View style={styles.imageCount}>
              <Icon name="photo-library" size={16} color={colors.white} style={{ marginRight: 4 }} />
              <Text style={styles.imageCountText}>{property.images.length}</Text>
            </View>
          )}
          
          {/* Image indicators */}
          {property.images && property.images.length > 1 && (
            <View style={styles.imageIndicators}>
              {property.images.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedImageIndex(index)}
                  style={[
                    styles.indicator,
                    { backgroundColor: index === selectedImageIndex ? colors.white : 'rgba(255,255,255,0.5)' }
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Property Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{property.title}</Text>
          <Text style={styles.location}>{property.location.address}</Text>
          
          {/* Property Type & Area */}
          <View style={styles.propertyMeta}>
            <Text style={styles.propertyType}>{property.property_type?.replace('_', ' ').toUpperCase()}</Text>
            {(property.area_sqm || property.square_meters) && (
              <Text style={styles.propertyArea}>• {property.area_sqm || property.square_meters} m²</Text>
            )}
          </View>
          
          {/* Features */}
          <View style={styles.features}>
            {property.bedrooms && (
              <View style={styles.feature}>
                <Icon name="hotel" size={16} color={colors.text.secondary} />
                <Text style={styles.featureText}>{property.bedrooms} bed{property.bedrooms > 1 ? 's' : ''}</Text>
              </View>
            )}
            {property.bathrooms && (
              <View style={styles.feature}>
                <Icon name="bathtub" size={16} color={colors.text.secondary} />
                <Text style={styles.featureText}>{property.bathrooms} bath{property.bathrooms > 1 ? 's' : ''}</Text>
              </View>
            )}
            {property.status && (
              <View style={styles.feature}>
                <Icon name="check-circle" size={16} color={colors.success[600] || '#10B981'} />
                <Text style={styles.featureText}>{property.status.charAt(0).toUpperCase() + property.status.slice(1)}</Text>
              </View>
            )}
          </View>
          
          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>
              {property.description || 'Beautiful property in a great location. Perfect for those looking for comfort and convenience.'}
            </Text>
          </View>
          
          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <View style={styles.amenitiesContainer}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenitiesList}>
                {property.amenities.map((amenity, index) => (
                  <View key={index} style={styles.amenityItem}>
                    <Text style={styles.amenityText}>• {amenity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Inactive listing banner for non-owners */}
          {!isOwner && !isListingActive && (
            <View style={styles.inactiveBanner}>
              <Icon name="info-outline" size={20} color={colors.warning[600] || '#F59E0B'} />
              <Text style={styles.inactiveBannerText}>
                This listing is no longer available for inquiries.
              </Text>
            </View>
          )}

          {/* Related Properties */}
          <RelatedItemsSection
            items={relatedProperties}
            title="Similar Properties"
            isLoading={isLoadingRelated}
            onItemPress={handleRelatedPropertyPress}
            emptyMessage="No similar properties found"
          />
          
          {/* Bottom spacing */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Action Buttons - Owner vs Non-Owner */}
      <SafeAreaView>
        <View style={styles.actionButtonsContainer}>
          <View style={styles.actionButtons}>
            {isOwner ? (
              <>
                <TouchableOpacity
                  style={[styles.ownerActionButton, { marginBottom: 8 }]}
                  onPress={handleEditListing}
                  activeOpacity={0.8}
                >
                  <Icon name="edit" size={20} color={colors.white} style={{ marginRight: 8 }} />
                  <Text style={styles.ownerActionButtonText}>Edit Listing</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ownerActionButton, { marginBottom: 8 }]}
                  onPress={() => setShowStatusModal(true)}
                  disabled={isSubmitting}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.white} style={{ marginRight: 8 }} />
                  ) : (
                    <Icon name="update" size={20} color={colors.white} style={{ marginRight: 8 }} />
                  )}
                  <Text style={styles.ownerActionButtonText}>Update Availability</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ownerActionButton, { marginBottom: 8 }]}
                  onPress={() => navigation.navigate('PropertyInquiries')}
                  activeOpacity={0.8}
                >
                  <Icon name="message" size={20} color={colors.white} style={{ marginRight: 8 }} />
                  <Text style={styles.ownerActionButtonText}>View Inquiries</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDeleteListing}
                  activeOpacity={0.8}
                >
                  <Icon name="delete-outline" size={20} color={colors.white} style={{ marginRight: 8 }} />
                  <Text style={styles.ownerActionButtonText}>Delete Listing</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
          {/* Primary Actions Row */}
          {isListingActive && (
          <>
          <View style={styles.primaryActions}>
            <TouchableOpacity
              style={[styles.callButton, { marginRight: 8 }]}
              onPress={handleCall}
              activeOpacity={0.8}
            >
              <Icon name="phone" size={18} color={colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.callButtonText}>Call</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.scheduleButton}
              onPress={handleScheduleViewing}
              activeOpacity={0.8}
            >
              <Icon name="schedule" size={18} color={colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.scheduleButtonText}>Schedule</Text>
            </TouchableOpacity>
          </View>
          
          {/* Message Action */}
          <TouchableOpacity
            style={[styles.messageActionButton, { marginTop: 8 }]}
            onPress={handleMessage}
            activeOpacity={0.8}
          >
            <Icon name="chat" size={20} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.messageActionButtonText}>Message Owner</Text>
          </TouchableOpacity>
          
          {/* Secondary Action */}
          <TouchableOpacity
            style={[styles.inquireButton, { marginTop: 8 }]}
            onPress={handleSendInquiry}
            activeOpacity={0.8}
          >
            <Text style={styles.inquireButtonText}>Send Inquiry</Text>
            <Icon name="send" size={16} color={colors.primary[600]} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
          </>
          )}
              </>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Update Status Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusModal(false)}
        >
          <View style={styles.statusModalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.statusModalTitle}>Update Listing Status</Text>
            {(['available', 'sold', 'rented', 'pending'] as PropertyStatus[]).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusOption,
                  property?.status === status && styles.statusOptionActive
                ]}
                onPress={() => handleUpdateStatus(status)}
              >
                <Text style={styles.statusOptionText}>{getPropertyStatusInfo(status).label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.statusOption, { marginTop: 12 }]}
              onPress={() => setShowStatusModal(false)}
            >
              <Text style={styles.statusOptionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  scrollView: {
    flex: 1,
  },
  
  imageContainer: {
    position: 'relative',
  },
  
  propertyImage: {
    width: screenWidth,
    height: screenHeight * 0.4,
    backgroundColor: colors.secondary[100],
  },
  
  priceBadge: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  
  priceBadgeText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  
  priceSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
  },
  
  statusBadge: {
    position: 'absolute',
    top: 70,
    left: 16,
    backgroundColor: colors.success[600] || '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  
  imageCount: {
    position: 'absolute',
    top: 70,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  imageCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
  },
  
  infoContainer: {
    padding: 20,
  },
  
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  
  location: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  
  propertyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  propertyType: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary[600],
    backgroundColor: colors.primary[100] || 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  
  propertyArea: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  
  features: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  
  featureText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 6,
  },
  
  descriptionContainer: {
    marginBottom: 24,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  
  description: {
    fontSize: 16,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  
  amenitiesContainer: {
    marginBottom: 24,
  },
  
  amenitiesList: {
    marginTop: 8,
  },
  
  amenityItem: {
    marginBottom: 6,
  },
  
  amenityText: {
    fontSize: 14,
    color: colors.text.secondary,
  },

  inactiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning[100] || '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  inactiveBannerText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.secondary,
  },
  ownerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: colors.primary[600],
    borderRadius: 8,
  },
  ownerActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: colors.errorVariants?.[600] || colors.error || '#EF4444',
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusModalContent: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  statusModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  statusOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.secondary[100],
  },
  statusOptionActive: {
    backgroundColor: colors.primary[100] || 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: colors.primary[600],
  },
  statusOptionText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  
  actionButtonsContainer: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    ...shadows.lg,
  },
  
  actionButtons: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  
  primaryActions: {
    flexDirection: 'row',
  },
  
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: colors.success[600] || '#10B981',
    borderRadius: 8,
  },
  
  callButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: colors.primary[600],
    borderRadius: 8,
  },
  
  messageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  
  scheduleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: colors.warning[600] || '#F59E0B',
    borderRadius: 8,
  },
  
  scheduleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  
  inquireButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: colors.secondary[100],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary[200] || colors.border.light,
  },
  
  inquireButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[600],
  },
  
  messageActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: colors.primary[600],
    borderRadius: 8,
  },
  
  messageActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});

export default PropertyDetailsScreen;

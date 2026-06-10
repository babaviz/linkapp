import * as React from 'react';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, Modal, Linking, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { ServicesStackParamList } from '../../navigation/ServicesStackNavigator';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';
import { useServiceOperations } from '../../hooks/useServiceOperations';
import { useAppSelector } from '../../redux/hooks';
import { RelatedItemsSection } from '../../components/common/RelatedItemsSection';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { 
  relatedCategoryRecommendationService,
  RelatedItem 
} from '../../services/relatedCategoryRecommendationService';
import { serviceInquiryService } from '../../services/serviceInquiryService';

type ServiceDetailsRouteProp = RouteProp<ServicesStackParamList, 'ServiceDetails'>;
type ServiceDetailsNavigationProp = StackNavigationProp<ServicesStackParamList, 'ServiceDetails'>;

// Memoized screen for stable navigation performance
const ServiceDetailsScreen = React.memo(function ServiceDetailsScreen() {
  const navigation = useNavigation<ServiceDetailsNavigationProp>();
  const route = useRoute<ServiceDetailsRouteProp>();
  const { handleBack } = useBackNavigation({ fallbackScreen: 'ServicesHome' });
  const { serviceId } = route.params || {};
  const currentUserId = useAppSelector((state) => state.auth.user?.id);
  const { width: screenWidth, isTablet } = getDynamicDimensions();
  const insets = useSafeAreaInsets();
  const [showContactModal, setShowContactModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSaved, setIsSaved] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [contactMethod, setContactMethod] = useState<'phone' | 'email' | 'whatsapp' | 'in_app'>('phone');
  const [relatedServices, setRelatedServices] = useState<RelatedItem[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const [isUpdatingListingStatus, setIsUpdatingListingStatus] = useState(false);

  // Optimized entrance animation
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const loadRelatedServices = async (currentServiceData: any) => {
    if (!currentServiceData) return;
    
    setIsLoadingRelated(true);
    try {
      const serviceForRecommendation = {
        id: currentServiceData.id,
        ownerId: '',
        serviceName: currentServiceData.name,
        category: currentServiceData.category,
        subcategory: '',
        description: currentServiceData.description || '',
        location: currentServiceData.location,
        pricingInfo: {
          type: 'fixed' as const,
          amount: parseFloat(currentServiceData.price.replace(/[^0-9.]/g, '')) || 0,
          currency: 'KSH' as const
        },
        imageUrls: [],
        contactDetails: {
          phone: currentServiceData.phone,
          email: currentServiceData.email,
          preferredContactMethod: 'phone' as const
        },
        createdAt: new Date().toISOString(),
        status: 'active' as const
      };

      const related = await relatedCategoryRecommendationService.getRelatedServices(
        serviceForRecommendation,
        undefined,
        { limit: 6, includePopular: true }
      );
      setRelatedServices(related);
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading related services:', error);
      }
    } finally {
      setIsLoadingRelated(false);
    }
  };

  const handleRelatedServicePress = (item: RelatedItem) => {
    relatedCategoryRecommendationService.recordRecommendationClick('', item);
    navigation.push('ServiceDetails', { serviceId: item.id });
  };



  const { getServiceDetails, updateService } = useServiceOperations();
  const [dynamicService, setDynamicService] = useState<any | null>(null);
  const [isResolving, setIsResolving] = useState<boolean>(true);

  const categoryLabels: Record<string, string> = {
    education_training: 'Education & Training',
    healthcare_medical: 'Healthcare & Medical',
    beauty_wellness: 'Beauty & Wellness',
    construction: 'Construction & Building',
    automotive: 'Automotive Services',
    home_garden: 'Home & Garden',
    business_services: 'Business Services',
    entertainment: 'Entertainment & Events',
  };

  const getCategoryEmoji = (key: string) => {
    if (!key) return '🛠️';
    const k = key.toLowerCase();
    if (k.includes('health')) return '🏥';
    if (k.includes('edu')) return '🎓';
    if (k.includes('beauty') || k.includes('wellness')) return '💆‍♀️';
    if (k.includes('auto')) return '🔧';
    if (k.includes('home') || k.includes('garden')) return '🌿';
    if (k.includes('business')) return '💼';
    if (k.includes('construct')) return '🏗️';
    if (k.includes('entertain')) return '🎉';
    return '🛠️';
  };

  const normalizeService = useCallback((svc: any) => {
    const priceAmount = svc?.pricingInfo?.amount ?? svc?.pricingInfo?.hourlyRate ?? 0;
    const price = priceAmount ? `KSh ${Number(priceAmount).toLocaleString()}` : 'KSh —';
    let priceUnit = '';
    switch (svc?.pricingInfo?.type) {
      case 'hourly':
        priceUnit = 'per hour';
        break;
      case 'package':
        priceUnit = 'per package';
        break;
      case 'fixed':
        priceUnit = 'per service';
        break;
      default:
        priceUnit = '';
    }
    const hours = svc?.contactDetails?.availability ? {
      Monday: `${svc.contactDetails.availability.hours?.start || '8:00 AM'} - ${svc.contactDetails.availability.hours?.end || '6:00 PM'}`,
      Tuesday: `${svc.contactDetails.availability.hours?.start || '8:00 AM'} - ${svc.contactDetails.availability.hours?.end || '6:00 PM'}`,
      Wednesday: `${svc.contactDetails.availability.hours?.start || '8:00 AM'} - ${svc.contactDetails.availability.hours?.end || '6:00 PM'}`,
      Thursday: `${svc.contactDetails.availability.hours?.start || '8:00 AM'} - ${svc.contactDetails.availability.hours?.end || '6:00 PM'}`,
      Friday: `${svc.contactDetails.availability.hours?.start || '8:00 AM'} - ${svc.contactDetails.availability.hours?.end || '6:00 PM'}`,
      Saturday: '9:00 AM - 2:00 PM',
      Sunday: 'Closed',
    } : {
      Monday: '8:00 AM - 6:00 PM',
      Tuesday: '8:00 AM - 6:00 PM',
      Wednesday: '8:00 AM - 6:00 PM',
      Thursday: '8:00 AM - 6:00 PM',
      Friday: '8:00 AM - 6:00 PM',
      Saturday: '9:00 AM - 2:00 PM',
      Sunday: 'Closed',
    };

    const packages = svc?.pricingInfo?.packages || [];
    const mappedServices = packages.length
      ? packages.map((p: any) => `${p.name} - KSh ${Number(p.price).toLocaleString()}`)
      : [priceAmount ? `Standard Service - ${price}` : 'Contact for pricing'];

    const tags = svc?.tags || [];

    return {
      id: svc.id,
      name: svc.serviceName,
      category: categoryLabels[svc.category] || svc.category,
      description: svc.description,
      longDescription: svc.description,
      rating: svc.rating ?? 4.5,
      reviews: svc.reviews ?? svc.reviewCount ?? 0,
      price,
      priceUnit,
      location: svc.location,
      address: svc.location,
      distance: '',
      phone: svc.contactDetails?.phone,
      email: svc.contactDetails?.email,
      website: svc.contactDetails?.website,
      image: getCategoryEmoji(svc.category),
      images: [],
      verified: Boolean(svc.verified),
      availability: svc.status === 'active' ? 'Open now' : 'Currently unavailable',
      hours,
      specialties: tags,
      services: mappedServices,
      features: tags,
      status: svc.status,
      providerId: svc.ownerId,
      providerName: svc.businessName || svc.serviceName,
    };
  }, []);

  const serviceDataDynamicNormalized = useMemo(() => {
    return dynamicService ? normalizeService(dynamicService) : null;
  }, [dynamicService, normalizeService]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (serviceId) {
          if (!cancelled) setIsResolving(true);
          const svc = await getServiceDetails(serviceId);
          if (!cancelled) {
            setDynamicService(svc);
            setIsResolving(false);
          }
        } else {
          if (!cancelled) {
            setDynamicService(null);
            setIsResolving(false);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [serviceId, getServiceDetails])
  );

  const serviceData = serviceDataDynamicNormalized;
  const serviceOwnerId = useMemo(() => {
    const dynamicOwnerId =
      typeof dynamicService?.ownerId === 'string' ? dynamicService.ownerId.trim() : '';
    const fallbackOwnerId =
      typeof serviceData?.providerId === 'string' ? serviceData.providerId.trim() : '';
    return dynamicOwnerId || fallbackOwnerId;
  }, [dynamicService?.ownerId, serviceData?.providerId]);
  const isOwner = Boolean(currentUserId && serviceOwnerId && currentUserId === serviceOwnerId);
  const serviceStatus = dynamicService?.status || serviceData?.status || 'active';
  const isListingActive = serviceStatus === 'active';
  const blockedUserIds = useMemo(
    () =>
      Array.isArray((dynamicService as any)?.blockedUserIds)
        ? ((dynamicService as any).blockedUserIds as string[])
        : [],
    [dynamicService]
  );
  const blockedByUserIds = useMemo(
    () =>
      Array.isArray((dynamicService as any)?.blockedByUserIds)
        ? ((dynamicService as any).blockedByUserIds as string[])
        : [],
    [dynamicService]
  );
  const isBlockedForCurrentUser = Boolean(
    currentUserId &&
      (blockedUserIds.includes(currentUserId) ||
        blockedByUserIds.includes(currentUserId) ||
        (dynamicService as any)?.isBlockedForViewer === true)
  );
  const canViewContactActions = !isOwner && isListingActive && !isBlockedForCurrentUser;
  const canBookService = !isOwner && isListingActive && !isBlockedForCurrentUser;
  const canChatWithProvider = Boolean(
    currentUserId &&
      serviceOwnerId &&
      currentUserId !== serviceOwnerId &&
      isListingActive &&
      !isBlockedForCurrentUser
  );

  useEffect(() => {
    if (serviceData && serviceId) {
      loadRelatedServices(serviceData);
    }
  }, [serviceData, serviceId]);

  const handleContact = (method: 'phone' | 'email' | 'website') => {
    if (!canViewContactActions) {
      Alert.alert('Unavailable', 'Contact options are not available for this listing right now.');
      return;
    }

    switch (method) {
      case 'phone':
        if (!serviceData.phone) {
          Alert.alert('Unavailable', 'Phone contact is not available for this service.');
          return;
        }
        Linking.openURL(`tel:${serviceData.phone}`);
        break;
      case 'email':
        if (!serviceData.email) {
          Alert.alert('Unavailable', 'Email contact is not available for this service.');
          return;
        }
        Linking.openURL(`mailto:${serviceData.email}`);
        break;
      case 'website':
        if (!serviceData.website) {
          Alert.alert('Unavailable', 'Website is not available for this service.');
          return;
        }
        Linking.openURL(`https://${serviceData.website}`);
        break;
    }
    setShowContactModal(false);
  };

  const handleBooking = (service?: string) => {
    if (!canBookService) {
      Alert.alert('Unavailable', 'Bookings are currently unavailable for this listing.');
      return;
    }
    setSelectedService(service || '');
    setShowBookingModal(true);
  };

  const handleSaveService = () => {
    setIsSaved(!isSaved);
  };

  const handleChatWithProvider = () => {
    if (!serviceData) {
      return;
    }

    if (!currentUserId) {
      Alert.alert('Sign In Required', 'Please sign in to start a chat.');
      return;
    }

    if (!canChatWithProvider || !serviceOwnerId) {
      const reason = !isListingActive
        ? 'This listing is not active right now.'
        : isBlockedForCurrentUser
          ? 'You cannot message this provider at the moment.'
          : 'Chat recipient is unavailable for this listing.';
      Alert.alert('Chat Unavailable', reason);
      return;
    }

    navigation.navigate('ServiceChat', {
      service: {
        id: serviceData.id,
        title: serviceData.name,
        category: serviceData.category,
        provider_id: serviceOwnerId,
        provider_name: serviceData.providerName || serviceData.name
      },
      recipientId: serviceOwnerId,
      recipientName: serviceData.providerName || serviceData.name
    });
  };

  const handleToggleListingStatus = async () => {
    if (!isOwner || !serviceId || !dynamicService) {
      Alert.alert('Unavailable', 'Listing status can only be managed from your own live listing.');
      return;
    }

    const nextStatus = dynamicService.status === 'active' ? 'inactive' : 'active';
    setIsUpdatingListingStatus(true);
    try {
      const updated = await updateService(serviceId, { status: nextStatus });
      if (updated) {
        setDynamicService(updated);
        Alert.alert(
          'Listing Updated',
          nextStatus === 'active'
            ? 'Your service is now active and visible to seekers.'
            : 'Your service is now paused and hidden from seekers.'
        );
      } else {
        Alert.alert('Update Failed', 'Unable to update listing status. Please try again.');
      }
    } catch (_error) {
      Alert.alert('Update Failed', 'Unable to update listing status. Please try again.');
    } finally {
      setIsUpdatingListingStatus(false);
    }
  };

  const confirmBooking = async () => {
    if (!currentUserId) {
      Alert.alert('Sign In Required', 'Please sign in to send a booking request.');
      return;
    }
    if (!serviceId || !serviceOwnerId) {
      Alert.alert('Error', 'Service information is missing. Please try again.');
      return;
    }
    if (currentUserId === serviceOwnerId) {
      Alert.alert('Not Allowed', 'You cannot send an inquiry to your own service.');
      return;
    }

    setShowBookingModal(false);

    const message = [
      selectedService ? `Service requested: ${selectedService}` : '',
      bookingNotes ? bookingNotes.trim() : '',
    ]
      .filter(Boolean)
      .join('\n') || 'I would like to book this service.';

    try {
      await serviceInquiryService.submitInquiry({
        service_id: serviceId,
        inquirer_id: currentUserId,
        owner_id: serviceOwnerId,
        message,
      });
      Alert.alert(
        'Request Sent',
        'Your booking request has been sent. The service provider will contact you shortly.',
        [{ text: 'View Inquiries', onPress: () => navigation.navigate('ServiceInquiries') }, { text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert('Request Failed', err?.message || 'Could not send the booking request. Please try again.');
    }
  };

  const tabs = useMemo(() => {
    const baseTabs = [
      { id: 'overview', label: 'Overview', icon: 'ℹ️' },
      { id: 'services', label: 'Services', icon: '📋' },
      { id: 'reviews', label: 'Reviews', icon: '⭐' },
    ];
    if (!isOwner) {
      baseTabs.push({ id: 'contact', label: 'Contact', icon: '📞' });
    }
    return baseTabs;
  }, [isOwner]);

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab('overview');
    }
  }, [activeTab, tabs]);

  // Show loading state while resolving dynamic service
  if ((!serviceData || !serviceData.name) && isResolving) {
    return (
      <LinearGradient
        colors={['#6366F1', '#4F46E5', '#4338CA']}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.lg,
              paddingBottom: Math.max(insets.bottom + spacing.lg, spacing.lg),
            }}
          >
            <SkeletonLoader
              width="100%"
              height={240}
              borderRadius={24}
              style={{ marginBottom: spacing.lg }}
              shimmerColors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.18)']}
            />
            <SkeletonLoader
              width="72%"
              height={24}
              borderRadius={10}
              style={{ marginBottom: 10 }}
              shimmerColors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.18)']}
            />
            <SkeletonLoader
              width="46%"
              height={16}
              borderRadius={8}
              style={{ marginBottom: spacing.lg }}
              shimmerColors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.18)']}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: spacing.lg }}>
              <SkeletonLoader
                width={90}
                height={32}
                borderRadius={16}
                shimmerColors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.18)']}
              />
              <SkeletonLoader
                width={110}
                height={32}
                borderRadius={16}
                shimmerColors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.18)']}
              />
              <SkeletonLoader
                width={80}
                height={32}
                borderRadius={16}
                shimmerColors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.18)']}
              />
            </View>

            <SkeletonLoader
              width="100%"
              height={120}
              borderRadius={16}
              style={{ marginBottom: spacing.md }}
              shimmerColors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.18)']}
            />
            <SkeletonLoader
              width="100%"
              height={56}
              borderRadius={16}
              shimmerColors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.18)']}
            />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Show error state if no service data is available and not resolving
  if (!serviceData || !serviceData.name) {
    return (
      <LinearGradient
        colors={['#6366F1', '#4F46E5', '#4338CA']}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg }}>
            <TouchableOpacity
              onPress={handleBack}
              style={{
                position: 'absolute',
                top: spacing.lg,
                left: spacing.lg,
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            
            <Text style={{ fontSize: 60, marginBottom: spacing.lg }}>🚫</Text>
            <Text style={{ 
              fontSize: isTablet ? 24 : 20, 
              fontWeight: '800', 
              color: '#FFFFFF',
              textAlign: 'center',
              marginBottom: spacing.md
            }}>
              Service Not Found
            </Text>
            <Text style={{ 
              fontSize: 16, 
              color: 'rgba(255,255,255,0.8)',
              textAlign: 'center',
              marginBottom: spacing.sm
            }}>
              The service you're looking for is not available or may have been removed.
            </Text>
            {serviceId && (
              <Text style={{ 
                fontSize: 12, 
                color: 'rgba(255,255,255,0.6)',
                textAlign: 'center',
                marginBottom: spacing.lg,
                fontFamily: 'monospace'
              }}>
                Service ID: {serviceId}
              </Text>
            )}
            <TouchableOpacity
              onPress={handleBack}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.3)'
              }}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="arrow-back" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontSize: 16, 
                  fontWeight: '600' 
                }}>
                  Go Back
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#6366F1', '#4F46E5', '#4338CA']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            paddingHorizontal: spacing.lg, 
            paddingTop: spacing.md,
            paddingBottom: spacing.md 
          }}>
            <TouchableOpacity
              onPress={handleBack}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.md
              }}
            >
              <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: isTablet ? 24 : 20, 
              fontWeight: '800',
              flex: 1
            }}>
              Service Details
            </Text>

            {isOwner && (
              <TouchableOpacity
                onPress={() => navigation.navigate('EditService', { serviceId })}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing.sm,
                }}
                activeOpacity={0.8}
              >
                <MaterialIcons name="edit" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            
            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSaveService}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.sm
              }}
            >
              <MaterialIcons 
                name={isSaved ? "favorite" : "favorite-border"} 
                size={20} 
                color={isSaved ? "#FF6B8A" : "#FFFFFF"} 
              />
            </TouchableOpacity>
            
            {/* Share Button */}
            <TouchableOpacity
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MaterialIcons name="share" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Tab Navigation */}
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 4 }}
            >
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={{
                    backgroundColor: activeTab === tab.id 
                      ? 'rgba(255,255,255,0.3)' 
                      : 'rgba(255,255,255,0.1)',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    marginRight: spacing.sm,
                    borderWidth: 1,
                    borderColor: activeTab === tab.id 
                      ? 'rgba(255,255,255,0.4)' 
                      : 'rgba(255,255,255,0.2)',
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 12, marginRight: 4 }}>{tab.icon}</Text>
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: activeTab === tab.id ? '700' : '500'
                  }}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Content */}
          <Animated.ScrollView 
            style={[{ flex: 1 }, { opacity: fadeAnim }]} 
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 }}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'overview' && (
              <View>
                {/* Hero Section */}
                <View style={{
                  backgroundColor: 'rgba(255,255,255,0.98)',
                  borderRadius: 24,
                  padding: spacing.lg,
                  marginBottom: spacing.lg,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.15,
                  shadowRadius: 16,
                  elevation: 12
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md }}>
                    <View style={{
                      width: isTablet ? 80 : 72,
                      height: isTablet ? 80 : 72,
                      borderRadius: isTablet ? 40 : 36,
                      backgroundColor: '#6366F1',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: spacing.md,
                      shadowColor: '#6366F1',
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.3,
                      shadowRadius: 12,
                      elevation: 8
                    }}>
                      <Text style={{ fontSize: isTablet ? 36 : 32 }}>{serviceData.image}</Text>
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ 
                          fontSize: isTablet ? 22 : 20, 
                          fontWeight: '800', 
                          color: '#111827',
                          flex: 1,
                          marginRight: spacing.sm
                        }}>
                          {serviceData.name}
                        </Text>
                        {serviceData.verified && (
                          <View style={{
                            backgroundColor: '#10B981',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 12,
                            flexDirection: 'row',
                            alignItems: 'center'
                          }}>
                            <Text style={{ fontSize: 10, marginRight: 3 }}>✓</Text>
                            <Text style={{ 
                              color: '#FFFFFF', 
                              fontSize: 11, 
                              fontWeight: '700'
                            }}>
                              VERIFIED
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      <Text style={{ 
                        fontSize: 14, 
                        color: '#6366F1',
                        fontWeight: '600',
                        marginBottom: 6
                      }}>
                        {serviceData.category}
                      </Text>
                      
                      {/* Rating and Price */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 14, marginRight: 3 }}>⭐</Text>
                          <Text style={{ 
                            color: '#F59E0B', 
                            fontSize: 14, 
                            fontWeight: '700', 
                            marginRight: 6 
                          }}>
                            {serviceData.rating}
                          </Text>
                          <Text style={{ 
                            color: '#9CA3AF', 
                            fontSize: 12,
                            fontWeight: '500'
                          }}>
                            ({serviceData.reviews} reviews)
                          </Text>
                        </View>
                        
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ 
                            color: '#6366F1', 
                            fontSize: isTablet ? 18 : 16, 
                            fontWeight: '800' 
                          }}>
                            {serviceData.price}
                          </Text>
                          <Text style={{ 
                            color: '#9CA3AF', 
                            fontSize: 11,
                            fontWeight: '500'
                          }}>
                            {serviceData.priceUnit}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Location and Availability */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 14, marginRight: 6 }}>📍</Text>
                      <Text style={{ fontSize: 12, color: '#6B7280', flex: 1 }}>
                        {serviceData.location} • {serviceData.distance}
                      </Text>
                    </View>
                    
                    <View style={{
                      backgroundColor: serviceData.availability.includes('Open') || serviceData.availability.includes('Available') ? '#DCFCE7' : '#FEF3C7',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: serviceData.availability.includes('Open') || serviceData.availability.includes('Available') ? '#BBF7D0' : '#FDE68A'
                    }}>
                      <Text style={{
                        fontSize: 11,
                        fontWeight: '600',
                        color: serviceData.availability.includes('Open') || serviceData.availability.includes('Available') ? '#166534' : '#92400E'
                      }}>
                        {serviceData.availability}
                      </Text>
                    </View>
                  </View>

                  {/* Description */}
                  <Text style={{ 
                    fontSize: 14, 
                    color: '#6B7280',
                    lineHeight: 20,
                    marginBottom: spacing.md
                  }}>
                    {serviceData.longDescription}
                  </Text>

                  {/* Features */}
                  <View style={{ marginBottom: spacing.md }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: spacing.sm }}>
                      Key Features
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {serviceData.features.map((feature: string, idx: number) => (
                        <View 
                          key={idx}
                          style={{
                            backgroundColor: '#EEF2FF',
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 12,
                            marginRight: 8,
                            marginBottom: 6,
                            borderWidth: 1,
                            borderColor: '#C7D2FE'
                          }}
                        >
                          <Text style={{
                            fontSize: 11,
                            fontWeight: '600',
                            color: '#4F46E5'
                          }}>
                            ✓ {feature}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {/* Listing State */}
                  {!isListingActive && (
                    <View
                      style={{
                        backgroundColor: '#FEF2F2',
                        borderColor: '#FCA5A5',
                        borderWidth: 1,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        marginBottom: spacing.md,
                      }}
                    >
                      <Text style={{ color: '#B91C1C', fontSize: 13, fontWeight: '600' }}>
                        This listing is currently inactive.
                        {isOwner ? ' Reactivate it to receive new inquiries.' : ' Contact and chat are disabled.'}
                      </Text>
                    </View>
                  )}

                  {isBlockedForCurrentUser && !isOwner && (
                    <View
                      style={{
                        backgroundColor: '#FEF3C7',
                        borderColor: '#F59E0B',
                        borderWidth: 1,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        marginBottom: spacing.md,
                      }}
                    >
                      <Text style={{ color: '#92400E', fontSize: 13, fontWeight: '600' }}>
                        You cannot contact this provider right now.
                      </Text>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View>
                    {isOwner ? (
                      <>
                        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: 12 }}>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              backgroundColor: '#6366F1',
                              paddingVertical: 14,
                              borderRadius: 14,
                              alignItems: 'center',
                            }}
                            onPress={() => navigation.navigate('EditService', { serviceId })}
                            activeOpacity={0.8}
                          >
                            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                              ✏️ Edit Listing
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={{
                              flex: 1,
                              backgroundColor: '#4F46E5',
                              paddingVertical: 14,
                              borderRadius: 14,
                              alignItems: 'center',
                            }}
                            onPress={() => navigation.navigate('ServiceAnalytics', { serviceId })}
                            activeOpacity={0.8}
                          >
                            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                              📈 View Analytics
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          style={{
                            backgroundColor: isListingActive ? '#EF4444' : '#10B981',
                            paddingVertical: 13,
                            borderRadius: 12,
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'center',
                          }}
                          onPress={handleToggleListingStatus}
                          activeOpacity={0.8}
                          disabled={isUpdatingListingStatus}
                        >
                          {isUpdatingListingStatus ? (
                            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                          ) : null}
                          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                            {isListingActive ? '⏸️ Pause Listing' : '▶️ Reactivate Listing'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: 12 }}>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              backgroundColor: canBookService ? '#10B981' : '#9CA3AF',
                              paddingVertical: 16,
                              borderRadius: 16,
                              alignItems: 'center',
                            }}
                            onPress={() => handleBooking()}
                            activeOpacity={0.8}
                            disabled={!canBookService}
                          >
                            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                              📅 Book Now
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={{
                              flex: 1,
                              backgroundColor: canChatWithProvider ? '#F59E0B' : '#9CA3AF',
                              paddingVertical: 16,
                              borderRadius: 16,
                              alignItems: 'center',
                            }}
                            onPress={() => handleChatWithProvider()}
                            activeOpacity={0.8}
                            disabled={!canChatWithProvider}
                          >
                            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                              💬 Chat
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          style={{
                            backgroundColor: canViewContactActions ? '#6366F1' : '#9CA3AF',
                            paddingVertical: 12,
                            borderRadius: 12,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: canViewContactActions ? '#5B5EF1' : '#9CA3AF'
                          }}
                          onPress={() => setShowContactModal(true)}
                          activeOpacity={0.8}
                          disabled={!canViewContactActions}
                        >
                          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                            📞 More Contact Options
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>

                {/* Specialties */}
                <View style={{
                  backgroundColor: 'rgba(255,255,255,0.98)',
                  borderRadius: 20,
                  padding: spacing.lg,
                  marginBottom: spacing.lg,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 6
                }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: spacing.md }}>
                    Specialties
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {serviceData.specialties.map((specialty: string, idx: number) => (
                      <View 
                        key={idx}
                        style={{
                          backgroundColor: '#F0FDF4',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 14,
                          marginRight: 8,
                          marginBottom: 8,
                          borderWidth: 1,
                          borderColor: '#BBF7D0'
                        }}
                      >
                        <Text style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: '#166534'
                        }}>
                          {specialty}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Operating Hours */}
                <View style={{
                  backgroundColor: 'rgba(255,255,255,0.98)',
                  borderRadius: 20,
                  padding: spacing.lg,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 6
                }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: spacing.md }}>
                    📅 Operating Hours
                  </Text>
                  {Object.entries(serviceData.hours).map(([day, hours]) => (
                    <View key={day} style={{ 
                      flexDirection: 'row', 
                      justifyContent: 'space-between', 
                      paddingVertical: 6,
                      borderBottomWidth: 0.5,
                      borderBottomColor: '#E5E7EB'
                    }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>
                        {day}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#6B7280' }}>
                        {String(hours)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {activeTab === 'services' && (
              <View style={{
                backgroundColor: 'rgba(255,255,255,0.98)',
                borderRadius: 20,
                padding: spacing.lg,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 6
              }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: spacing.lg }}>
                  📋 Services & Pricing
                </Text>
                {serviceData.services.map((service: string, idx: number) => (
                  <View key={idx} style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: '#F9FAFB',
                    borderRadius: 12,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: '#E5E7EB'
                  }}>
                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                      <Text style={{ fontSize: 14, color: '#374151', fontWeight: '600' }}>
                        {service.split(' - ')[0]}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#6366F1' }}>
                        {service.split(' - ')[1]}
                      </Text>
                    </View>
                    {!isOwner && (
                      <TouchableOpacity
                        style={{
                          backgroundColor: canBookService ? '#10B981' : '#9CA3AF',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8
                        }}
                        onPress={() => handleBooking(service)}
                        activeOpacity={0.8}
                        disabled={!canBookService}
                      >
                        <Text style={{ 
                          color: '#FFFFFF', 
                          fontSize: 11, 
                          fontWeight: '600' 
                        }}>
                          📅 Book
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'reviews' && (
              <View>
                <View style={{
                  backgroundColor: 'rgba(255,255,255,0.98)',
                  borderRadius: 20,
                  padding: spacing.lg,
                  marginBottom: spacing.lg,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 6
                }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: spacing.md }}>
                    ⭐ Customer Reviews
                  </Text>
                  
                  {/* Rating Summary */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
                    <Text style={{ fontSize: 36, fontWeight: '800', color: '#F59E0B', marginRight: spacing.sm }}>
                      {serviceData.rating}
                    </Text>
                    <View>
                      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                        {[1,2,3,4,5].map(star => (
                          <Text key={star} style={{ fontSize: 16, color: star <= Math.floor(serviceData.rating) ? '#F59E0B' : '#E5E7EB' }}>
                            ⭐
                          </Text>
                        ))}
                      </View>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>
                        Based on {serviceData.reviews} reviews
                      </Text>
                    </View>
                  </View>

                  {/* Individual Reviews */}
                  {(((serviceData as any).reviews_sample as any[]) || []).map((review: any) => (
                    <View key={review.id} style={{
                      backgroundColor: '#F9FAFB',
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: spacing.md,
                      borderWidth: 1,
                      borderColor: '#E5E7EB'
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: '#6366F1',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: spacing.sm
                        }}>
                          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                            {review.name.charAt(0)}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                            {review.name}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                            {[1,2,3,4,5].map(star => (
                              <Text key={star} style={{ fontSize: 12, color: star <= review.rating ? '#F59E0B' : '#E5E7EB' }}>
                                ⭐
                              </Text>
                            ))}
                            <Text style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 6 }}>
                              {review.date}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 18, marginBottom: 8 }}>
                        {review.comment}
                      </Text>
                      <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 11, color: '#9CA3AF' }}>👍 {review.helpful} people found this helpful</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {activeTab === 'contact' && !isOwner && (
              <View style={{
                backgroundColor: 'rgba(255,255,255,0.98)',
                borderRadius: 20,
                padding: spacing.lg,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 6
              }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: spacing.lg }}>
                  📞 Contact Information
                </Text>
                
                {!canViewContactActions ? (
                  <View
                    style={{
                      backgroundColor: '#F9FAFB',
                      borderRadius: 12,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      marginBottom: spacing.lg,
                    }}
                  >
                    <Text style={{ fontSize: 14, color: '#6B7280' }}>
                      Contact details are unavailable for this listing right now.
                    </Text>
                  </View>
                ) : (
                  <View style={{ marginBottom: spacing.lg }}>
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F0FDF4',
                        padding: 16,
                        borderRadius: 12,
                        marginBottom: spacing.sm,
                        borderWidth: 1,
                        borderColor: '#BBF7D0'
                      }}
                      onPress={() => handleContact('phone')}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 20, marginRight: 12 }}>📞</Text>
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#166534' }}>Phone</Text>
                        <Text style={{ fontSize: 13, color: '#6B7280' }}>{serviceData.phone || 'Not available'}</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#EFF6FF',
                        padding: 16,
                        borderRadius: 12,
                        marginBottom: spacing.sm,
                        borderWidth: 1,
                        borderColor: '#BFDBFE'
                      }}
                      onPress={() => handleContact('email')}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 20, marginRight: 12 }}>✉️</Text>
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1D4ED8' }}>Email</Text>
                        <Text style={{ fontSize: 13, color: '#6B7280' }}>{serviceData.email || 'Not available'}</Text>
                      </View>
                    </TouchableOpacity>

                    {serviceData.website && (
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#FEF3C7',
                          padding: 16,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: '#FDE68A'
                        }}
                        onPress={() => handleContact('website')}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 20, marginRight: 12 }}>🌐</Text>
                        <View>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#92400E' }}>Website</Text>
                          <Text style={{ fontSize: 13, color: '#6B7280' }}>{serviceData.website}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Address */}
                <View style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#E5E7EB'
                }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
                    📍 Address
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6B7280', lineHeight: 20 }}>
                    {serviceData.address}
                  </Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#6366F1',
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      marginTop: 12,
                      alignItems: 'center'
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                      🗺️ Get Directions
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Related Services */}
            <View style={{ paddingTop: spacing.lg }}>
              <RelatedItemsSection
                items={relatedServices}
                title="Similar Services"
                isLoading={isLoadingRelated}
                onItemPress={handleRelatedServicePress}
                emptyMessage="No similar services found"
              />
            </View>

            <View style={{ height: 120 }} />
          </Animated.ScrollView>

          {/* Contact Modal */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={showContactModal && !isOwner}
            onRequestClose={() => setShowContactModal(false)}
          >
            <TouchableOpacity 
              style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                justifyContent: 'center',
                paddingHorizontal: 20
              }}
              onPress={() => setShowContactModal(false)}
              activeOpacity={1}
            >
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                padding: 24,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 16
              }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 16, textAlign: 'center' }}>
                  Contact {serviceData.name}
                </Text>
                
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#10B981',
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 12
                  }}
                  onPress={() => handleContact('phone')}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>📞</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Call Now</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#3B82F6',
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 12
                  }}
                  onPress={() => handleContact('email')}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>✉️</Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Send Email</Text>
                </TouchableOpacity>

                {serviceData.website && (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#6366F1',
                      padding: 16,
                      borderRadius: 12,
                      marginBottom: 16
                    }}
                    onPress={() => handleContact('website')}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 20, marginRight: 12 }}>🌐</Text>
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Visit Website</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => setShowContactModal(false)}
                  style={{
                    padding: 12,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: '#6B7280', fontSize: 14, fontWeight: '500' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Booking Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={showBookingModal}
            onRequestClose={() => setShowBookingModal(false)}
          >
            <TouchableOpacity 
              style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                justifyContent: 'flex-end'
              }}
              onPress={() => setShowBookingModal(false)}
              activeOpacity={1}
            >
              <View style={{
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                paddingBottom: Math.max(insets.bottom + 24, 40),
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 16
              }}>
                <View style={{
                  width: 40,
                  height: 4,
                  backgroundColor: '#E5E7EB',
                  borderRadius: 2,
                  alignSelf: 'center',
                  marginBottom: 20
                }} />
                
                <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' }}>
                  📅 Book Service
                </Text>
                
                <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 20 }}>
                  {serviceData.name}
                </Text>
                
                {selectedService && (
                  <View style={{
                    backgroundColor: '#EEF2FF',
                    padding: 12,
                    borderRadius: 12,
                    marginBottom: 20,
                    borderWidth: 1,
                    borderColor: '#C7D2FE'
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#4F46E5', textAlign: 'center' }}>
                      Selected: {selectedService.split(' - ')[0]}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6366F1', textAlign: 'center', marginTop: 2 }}>
                      Price: {selectedService.split(' - ')[1]}
                    </Text>
                  </View>
                )}
                
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 }}>
                    📋 Booking Details
                  </Text>
                  <Text style={{ fontSize: 14, color: '#6B7280', lineHeight: 20 }}>
                    • We'll contact you within 2 hours to confirm your booking{'\n'}
                    • Service provider will reach out to discuss scheduling{'\n'}
                    • Payment is handled directly with the service provider{'\n'}
                    • You can cancel or modify your booking by contacting them directly
                  </Text>
                </View>
                
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => setShowBookingModal(false)}
                    style={{
                      flex: 1,
                      padding: 16,
                      borderRadius: 12,
                      alignItems: 'center',
                      borderWidth: 2,
                      borderColor: '#E5E7EB'
                    }}
                  >
                    <Text style={{ color: '#6B7280', fontSize: 16, fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: '#10B981',
                      padding: 16,
                      borderRadius: 12,
                      alignItems: 'center',
                      shadowColor: '#10B981',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 6
                    }}
                    onPress={confirmBooking}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                      ✅ Confirm Booking
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
});

export default ServiceDetailsScreen;
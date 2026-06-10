import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Animated, Modal, FlatList, InteractionManager } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { setCurrentModule, initializeUserProfile } from '../../redux/slices/userSlice';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ServicesStackParamList } from '../../navigation/ServicesStackNavigator';
import { TOOLS_MATERIALS } from '../../config/constants';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';
import { RoleToggle, CategoryGrid } from '../../components/services';
import ServiceOwnerActions from '../../components/services/ServiceOwnerActions';
import UniversalSearch from '../../components/common/UniversalSearch';
import { 
  ContentLoadingScreen, 
  InteractiveComponent, 
  AccessibleText,
  StandardScreenTitle 
} from '../../components/common';
import { useUniversalSearch } from '../../hooks/useUniversalSearch';
import { UniversalSearchQuery } from '../../types/search';
import { useActivityIndicators } from '../../hooks/useActivityIndicators';
import { useDynamicSubtitle } from '../../hooks/useUserCountry';
import { useServiceCategoryCounts } from '../../hooks/useCategoryCounts';
import locationService from '../../services/locationService';

type ServiceRole = 'seeker' | 'owner';

type ServicesScreenNavigationProp = StackNavigationProp<ServicesStackParamList, 'ServicesHome'>;

export default function ServicesScreen() {
  const navigation = useNavigation<ServicesScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { width: screenWidth, isTablet } = getDynamicDimensions();
  const { user } = useAppSelector((state) => state.auth);
  const { currentProfile, isLoading: isLoadingProfile } = useAppSelector((state) => state.user);
  const normalizeRole = (r?: string): ServiceRole => (r === 'service_provider' || r === 'owner') ? 'owner' : 'seeker';
  const [role, setRole] = useState<ServiceRole>(
    normalizeRole(currentProfile?.servicesProfile?.role)
  );
  const [searchText, setSearchText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showOwnerActions, setShowOwnerActions] = useState(false);
  const [selectedOwnerCategory, setSelectedOwnerCategory] = useState<{
    key: string;
    label: string;
    subcategory?: string;
  } | null>(null);
  
  // Universal search integration
  const {
    searchResults: universalSearchResults,
    isSearching: isUniversalSearching,
    showSearch,
    toggleSearch,
    performSearch: performUniversalSearch,
    clearResults: clearUniversalResults
  } = useUniversalSearch({ 
    module: 'services', 
    defaultFilters: {} 
  });
  const toolsCategories = useMemo(() => Object.values(TOOLS_MATERIALS), []);
  const insets = useSafeAreaInsets();

  const { activityData } = useActivityIndicators({
    module: 'services',
    userRole: role === 'owner' ? 'service_provider' : 'service_seeker',
    refreshInterval: 30000,
    enabled: true
  });

  const { getCount, isLoading: isLoadingCounts, refreshCounts, formatCount } = useServiceCategoryCounts();

  useFocusEffect(
    useCallback(() => {
      void refreshCounts();
      return undefined;
    }, [refreshCounts])
  );

  const seekerSubtitle = useDynamicSubtitle(
    'Find trusted service providers and materials across {country}',
    'Find trusted service providers and materials'
  );
  const ownerSubtitle = 'Connect with customers who need your services';
  const seekerIndicator = activityData?.activity || 'Loading...';
  const ownerIndicator = activityData?.activity || 'Loading...';
  const seekerPlaceholder = 'Search services, tools, materials...';
  const ownerPlaceholder = 'Describe the service you provide...';
  const [detectedLocationLabel, setDetectedLocationLabel] = useState<string | null>(null);

  // Resolve a human-friendly location label from GPS coordinates (no DB updates).
  useEffect(() => {
    let isActive = true;

    InteractionManager.runAfterInteractions(() => {
      (async () => {
        try {
          const current = await locationService.getCurrentLocation();
          if (!current.success || !current.location) return;

          const place = await locationService.getCountyAndTownFromCoordinates(current.location);

          const county = (place.county || '').trim();
          const town = (place.town || '').trim();

          let label: string | null = null;

          if (county) {
            // Avoid overly-generic town labels like "CBD" in the header.
            const townLower = town.toLowerCase();
            const countyLower = county.toLowerCase();

            if (town && townLower !== 'cbd' && townLower !== countyLower) {
              label = `${town}, ${county}`;
            } else {
              label = county;
            }
          } else if (town) {
            label = town;
          }

          if (isActive) {
            setDetectedLocationLabel(label);
          }
        } catch {
          // Silent fallback - keep existing subtitle
        }
      })();
    });

    return () => {
      isActive = false;
    };
  }, []);

  interface Subcategory {
    id: string;
    name: string;
    icon: string;
    description: string;
    serviceCount: number;
    gradient: string[];
  }

  interface Category {
    key: string;
    icon: string;
    label: string;
    subtitleSeeker: string;
    subtitleOwner: string;
    gradient: string[];
    lightColor: string;
    subcategories?: Subcategory[];
  }

  const categoryData = useMemo<Category[]>(() => ([
    {
      key: 'education_training',
      icon: '🎓',
      label: 'Education',
      subtitleSeeker: '11 subcategories available',
      subtitleOwner: 'Post in this category',
      gradient: ['#3182CE', '#3182CE'],
      lightColor: '#DBEAFE',
      subcategories: [
        { id: 'colleges', name: 'Colleges', icon: '🏛️', description: 'Higher education', serviceCount: isLoadingCounts ? 0 : getCount('education_training'), gradient: ['#3182CE', '#2C5AA0'] },
        { id: 'private_universities', name: 'Private Universities', icon: '🎓', description: 'Private institutions', serviceCount: isLoadingCounts ? 0 : getCount('education_training'), gradient: ['#805AD5', '#6B46C1'] },
        { id: 'public_universities', name: 'Public Universities', icon: '🏛️', description: 'Public institutions', serviceCount: isLoadingCounts ? 0 : getCount('education_training'), gradient: ['#2C5AA0', '#2C5AA0'] },
        { id: 'daycares', name: 'Daycares', icon: '👶', description: 'Childcare services', serviceCount: isLoadingCounts ? 0 : getCount('education_training'), gradient: ['#F59E0B', '#D97706'] },
        { id: 'primary_schools', name: 'Primary Schools', icon: '🏫', description: 'Elementary education', serviceCount: isLoadingCounts ? 0 : getCount('education_training'), gradient: ['#10B981', '#059669'] },
        { id: 'secondary_schools', name: 'Secondary Schools', icon: '🎓', description: 'High schools', serviceCount: isLoadingCounts ? 0 : getCount('education_training'), gradient: ['#3B82F6', '#2563EB'] },
        { id: 'vet', name: 'Vocational Education', icon: '🛠️', description: 'VET programs', serviceCount: isLoadingCounts ? 0 : getCount('education_training'), gradient: ['#EF4444', '#DC2626'] },
        { id: 'consulting', name: 'Educational Consulting', icon: '💼', description: 'Expert guidance', serviceCount: isLoadingCounts ? 0 : getCount('education_training'), gradient: ['#8B5CF6', '#7C3AED'] },
        { id: 'tutoring', name: 'Tutoring Services', icon: '📚', description: 'Private tutors', serviceCount: isLoadingCounts ? 0 : getCount('education_training'), gradient: ['#EC4899', '#DB2777'] },
        { id: 'edtech', name: 'EdTech Solutions', icon: '💻', description: 'Learning tech', serviceCount: isLoadingCounts ? 0 : getCount('education_training'), gradient: ['#06B6D4', '#0891B2'] },
        { id: 'corporate_edu', name: 'Corporate Education', icon: '📈', description: 'Business training', serviceCount: isLoadingCounts ? 0 : getCount('education_training'), gradient: ['#F97316', '#EA580C'] },
      ]
    },
    {
      key: 'healthcare_medical',
      icon: '🏥',
      label: 'Health & Medical',
      subtitleSeeker: '8 subcategories available',
      subtitleOwner: 'Post in this category',
      gradient: ['#E53E3E', '#E53E3E'],
      lightColor: '#FEE2E2',
      subcategories: [
        { id: 'hospitals', name: 'Hospitals', icon: '🏥', description: '24/7 care', serviceCount: isLoadingCounts ? 0 : getCount('healthcare_medical'), gradient: ['#E53E3E', '#C53030'] },
        { id: 'clinics', name: 'Clinics', icon: '🩺', description: 'Medical services', serviceCount: isLoadingCounts ? 0 : getCount('healthcare_medical'), gradient: ['#10B981', '#059669'] },
        { id: 'pharmacies', name: 'Pharmacies', icon: '💊', description: 'Medications', serviceCount: isLoadingCounts ? 0 : getCount('healthcare_medical'), gradient: ['#3B82F6', '#2563EB'] },
        { id: 'dentists', name: 'Dentists', icon: '🦷', description: 'Dental care', serviceCount: isLoadingCounts ? 0 : getCount('healthcare_medical'), gradient: ['#06B6D4', '#0891B2'] },
        { id: 'optometrists', name: 'Optometrists', icon: '👓', description: 'Eye care', serviceCount: isLoadingCounts ? 0 : getCount('healthcare_medical'), gradient: ['#8B5CF6', '#7C3AED'] },
        { id: 'physiotherapy', name: 'Physiotherapy', icon: '🦵', description: 'Rehabilitation', serviceCount: isLoadingCounts ? 0 : getCount('healthcare_medical'), gradient: ['#EC4899', '#DB2777'] },
        { id: 'labs', name: 'Medical Labs', icon: '🔬', description: 'Testing services', serviceCount: isLoadingCounts ? 0 : getCount('healthcare_medical'), gradient: ['#F59E0B', '#D97706'] },
        { id: 'mental_health', name: 'Mental Health', icon: '🧠', description: 'Counseling', serviceCount: isLoadingCounts ? 0 : getCount('healthcare_medical'), gradient: ['#6366F1', '#4F46E5'] },
      ]
    },
    {
      key: 'beauty_wellness',
      icon: '💇',
      label: 'Beauty & Wellness',
      subtitleSeeker: '6 subcategories available',
      subtitleOwner: 'Post in this category',
      gradient: ['#805AD5', '#805AD5'],
      lightColor: '#EDE9FE',
      subcategories: [
        { id: 'salons', name: 'Hair Salons', icon: '💇', description: 'Hair styling', serviceCount: isLoadingCounts ? 0 : getCount('beauty_wellness'), gradient: ['#EC4899', '#DB2777'] },
        { id: 'barbers', name: 'Barber Shops', icon: '✂️', description: 'Men\'s grooming', serviceCount: isLoadingCounts ? 0 : getCount('beauty_wellness'), gradient: ['#3B82F6', '#2563EB'] },
        { id: 'spas', name: 'Spas', icon: '🛀', description: 'Relaxation', serviceCount: isLoadingCounts ? 0 : getCount('beauty_wellness'), gradient: ['#8B5CF6', '#7C3AED'] },
        { id: 'nails', name: 'Nail Studios', icon: '💅', description: 'Manicure & pedicure', serviceCount: isLoadingCounts ? 0 : getCount('beauty_wellness'), gradient: ['#F59E0B', '#D97706'] },
        { id: 'massage', name: 'Massage Therapy', icon: '💆', description: 'Body treatments', serviceCount: isLoadingCounts ? 0 : getCount('beauty_wellness'), gradient: ['#10B981', '#059669'] },
        { id: 'skincare', name: 'Skincare Clinics', icon: '✨', description: 'Facial treatments', serviceCount: isLoadingCounts ? 0 : getCount('beauty_wellness'), gradient: ['#06B6D4', '#0891B2'] },
      ]
    },
    {
      key: 'construction',
      icon: '🏭',
      label: 'Construction & building',
      subtitleSeeker: '8 subcategories available',
      subtitleOwner: 'Post in this category',
      gradient: ['#F97316', '#F97316'],
      lightColor: '#FFEDD5',
      subcategories: [
        { id: 'contractors', name: 'General Contractors', icon: '👷', description: 'Building services', serviceCount: isLoadingCounts ? 0 : getCount('construction'), gradient: ['#F97316', '#EA580C'] },
        { id: 'architects', name: 'Architects', icon: '📏', description: 'Design services', serviceCount: isLoadingCounts ? 0 : getCount('construction'), gradient: ['#3B82F6', '#2563EB'] },
        { id: 'masons', name: 'Masons', icon: '🧱', description: 'Masonry work', serviceCount: isLoadingCounts ? 0 : getCount('construction'), gradient: ['#78350F', '#78350F'] },
        { id: 'carpenters', name: 'Carpenters', icon: '🪚', description: 'Woodwork', serviceCount: isLoadingCounts ? 0 : getCount('construction'), gradient: ['#92400E', '#92400E'] },
        { id: 'plumbers', name: 'Plumbers', icon: '🔧', description: 'Plumbing services', serviceCount: isLoadingCounts ? 0 : getCount('construction'), gradient: ['#0891B2', '#0891B2'] },
        { id: 'electricians', name: 'Electricians', icon: '⚡', description: 'Electrical work', serviceCount: isLoadingCounts ? 0 : getCount('construction'), gradient: ['#EAB308', '#CA8A04'] },
        { id: 'painters', name: 'Painters', icon: '🎨', description: 'Painting services', serviceCount: isLoadingCounts ? 0 : getCount('construction'), gradient: ['#8B5CF6', '#7C3AED'] },
        { id: 'roofers', name: 'Roofers', icon: '🏘️', description: 'Roofing services', serviceCount: isLoadingCounts ? 0 : getCount('construction'), gradient: ['#DC2626', '#B91C1C'] },
      ]
    },
    {
      key: 'automotive',
      icon: '🚗',
      label: 'Automotive Services',
      subtitleSeeker: '5 subcategories available',
      subtitleOwner: 'Post in this category',
      gradient: ['#D69E2E', '#D69E2E'],
      lightColor: '#FEF3C7',
      subcategories: [
        { id: 'mechanics', name: 'Auto Mechanics', icon: '🔧', description: 'Car repairs', serviceCount: isLoadingCounts ? 0 : getCount('automotive'), gradient: ['#EF4444', '#DC2626'] },
        { id: 'car_wash', name: 'Car Wash', icon: '💦', description: 'Vehicle cleaning', serviceCount: isLoadingCounts ? 0 : getCount('automotive'), gradient: ['#06B6D4', '#0891B2'] },
        { id: 'body_shops', name: 'Body Shops', icon: '🔨', description: 'Bodywork', serviceCount: isLoadingCounts ? 0 : getCount('automotive'), gradient: ['#F97316', '#EA580C'] },
        { id: 'tires', name: 'Tire Services', icon: '⛓️', description: 'Tire sales & repair', serviceCount: isLoadingCounts ? 0 : getCount('automotive'), gradient: ['#475569', '#334155'] },
        { id: 'detailing', name: 'Auto Detailing', icon: '✨', description: 'Deep cleaning', serviceCount: isLoadingCounts ? 0 : getCount('automotive'), gradient: ['#8B5CF6', '#7C3AED'] },
      ]
    },
    {
      key: 'home_garden',
      icon: '🏡',
      label: 'Home & Garden',
      subtitleSeeker: '5 subcategories available',
      subtitleOwner: 'Post in this category',
      gradient: ['#38A169', '#38A169'],
      lightColor: '#D1FAE5',
      subcategories: [
        { id: 'cleaning', name: 'Cleaning Services', icon: '🧹', description: 'Home cleaning', serviceCount: isLoadingCounts ? 0 : getCount('home_garden'), gradient: ['#10B981', '#059669'] },
        { id: 'landscaping', name: 'Landscaping', icon: '🌿', description: 'Garden design', serviceCount: isLoadingCounts ? 0 : getCount('home_garden'), gradient: ['#22C55E', '#16A34A'] },
        { id: 'pest_control', name: 'Pest Control', icon: '🐜', description: 'Extermination', serviceCount: isLoadingCounts ? 0 : getCount('home_garden'), gradient: ['#DC2626', '#B91C1C'] },
        { id: 'security', name: 'Security Services', icon: '🔒', description: 'Home security', serviceCount: isLoadingCounts ? 0 : getCount('home_garden'), gradient: ['#475569', '#334155'] },
        { id: 'movers', name: 'Movers & Packers', icon: '🚚', description: 'Relocation', serviceCount: isLoadingCounts ? 0 : getCount('home_garden'), gradient: ['#F59E0B', '#D97706'] },
      ]
    },
    {
      key: 'business_services',
      icon: '💼',
      label: 'Business Services',
      subtitleSeeker: '5 subcategories available',
      subtitleOwner: 'Post in this category',
      gradient: ['#319795', '#319795'],
      lightColor: '#CFFAFE',
      subcategories: [
        { id: 'accounting', name: 'Accounting', icon: '📊', description: 'Financial services', serviceCount: isLoadingCounts ? 0 : getCount('business_services'), gradient: ['#10B981', '#059669'] },
        { id: 'legal', name: 'Legal Services', icon: '⚖️', description: 'Law firms', serviceCount: isLoadingCounts ? 0 : getCount('business_services'), gradient: ['#1F2937', '#111827'] },
        { id: 'marketing', name: 'Marketing', icon: '📢', description: 'Advertising', serviceCount: isLoadingCounts ? 0 : getCount('business_services'), gradient: ['#EC4899', '#DB2777'] },
        { id: 'consulting', name: 'Business Consulting', icon: '🧑‍💼', description: 'Strategy advice', serviceCount: isLoadingCounts ? 0 : getCount('business_services'), gradient: ['#3B82F6', '#2563EB'] },
        { id: 'it_services', name: 'IT Services', icon: '💻', description: 'Tech support', serviceCount: isLoadingCounts ? 0 : getCount('business_services'), gradient: ['#8B5CF6', '#7C3AED'] },
      ]
    },
    {
      key: 'entertainment',
      icon: '🎉',
      label: 'Entertainment & Events',
      subtitleSeeker: '5 subcategories available',
      subtitleOwner: 'Post in this category',
      gradient: ['#EC4899', '#EC4899'],
      lightColor: '#FCE7F3',
      subcategories: [
        { id: 'djs', name: 'DJs & MCs', icon: '🎧', description: 'Event entertainment', serviceCount: isLoadingCounts ? 0 : getCount('entertainment'), gradient: ['#EC4899', '#DB2777'] },
        { id: 'photographers', name: 'Photographers', icon: '📸', description: 'Photo services', serviceCount: isLoadingCounts ? 0 : getCount('entertainment'), gradient: ['#3B82F6', '#2563EB'] },
        { id: 'videographers', name: 'Videographers', icon: '🎥', description: 'Video production', serviceCount: isLoadingCounts ? 0 : getCount('entertainment'), gradient: ['#EF4444', '#DC2626'] },
        { id: 'event_planners', name: 'Event Planners', icon: '🎈', description: 'Event coordination', serviceCount: isLoadingCounts ? 0 : getCount('entertainment'), gradient: ['#F59E0B', '#D97706'] },
        { id: 'catering', name: 'Catering Services', icon: '🍴', description: 'Food services', serviceCount: isLoadingCounts ? 0 : getCount('entertainment'), gradient: ['#10B981', '#059669'] },
      ]
    },
  ]), [getCount, isLoadingCounts]);

  // Responsive card dimensions for horizontal scroll
  const cardWidth = isTablet ? 180 : 150;
  const cardHeight = isTablet ? 160 : 140;

  const handleSearch = () => {
    if (role === 'seeker') {
      navigation.navigate('ServiceCategories', { category: 'search', role: role });
    } else {
      navigation.navigate('PostService');
    }
  };
  
  // Handle universal search
  const handleUniversalSearch = useCallback(async (query: UniversalSearchQuery) => {
    const success = await performUniversalSearch(query);
    if (success) {
      setSearchText(query.searchText || '');
      // Navigate to service categories with search results
      navigation.navigate('ServiceCategories', { category: 'search', role: role });
    }
  }, [performUniversalSearch]);
  
  // Enhanced search button handler
  const handleSearchButtonPress = useCallback(() => {
    toggleSearch(true);
  }, [toggleSearch]);
  
  // Handle category press with preloading
  const handleCategoryPress = useCallback((category: { key: string; label?: string }) => {
    // If service owner, show owner actions modal
    if (role === 'owner') {
      setSelectedOwnerCategory({
        key: category.key,
        label: category.label || category.key,
      });
      setShowOwnerActions(true);
      return;
    }
    
    // For service seekers, navigate immediately - screen will handle data loading
    requestAnimationFrame(() => {
      navigation.navigate('ServiceCategories', { category: category.key, role: role });
    });
  }, [navigation, role]);
  
  // Initialize user profile and module
  useEffect(() => {
    // Initialize user profile if needed
    if (user && !currentProfile && !isLoadingProfile) {
      dispatch(initializeUserProfile(user));
    }
    
    // Set current module for profile context
    dispatch(setCurrentModule('services'));
  }, [user, currentProfile, isLoadingProfile, dispatch]);
  
  // Sync role state with profile
  useEffect(() => {
    if (currentProfile?.servicesProfile?.role) {
      setRole(normalizeRole(currentProfile.servicesProfile.role));
    }
  }, [currentProfile]);

  // Handle role change and update user profile
  const handleRoleChange = useCallback((newRole: ServiceRole) => {
    // Role persistence is handled inside `components/services/RoleToggle.tsx`.
    setRole(newRole);
  }, []);

  // Animations for subtle entrance
  const headerFade = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(headerFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [headerFade]);

  return (
    <LinearGradient
      colors={['#6366F1', '#4F46E5', '#4338CA']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <Animated.View style={{ opacity: headerFade }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <StandardScreenTitle
                  color="#FFFFFF"
                  style={{ marginBottom: isTablet ? 12 : 8 }}
                  testID="services-screen-title"
                >
                  Services & Marketplace
                </StandardScreenTitle>
              </View>
              {/* 3-dot menu button */}
              <TouchableOpacity
                onPress={() => setShowMenu(true)}
                style={{
                  width: 44,
                  height: 44,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: 22,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  marginTop: 4
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 24, color: '#FFFFFF', fontWeight: 'bold', letterSpacing: 2 }}>
                  ⋯
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={{ 
              fontSize: isTablet ? 18 : screenWidth < 360 ? 14 : 16, 
              color: 'rgba(255,255,255,0.9)',
              fontWeight: '400',
              lineHeight: isTablet ? 28 : screenWidth < 360 ? 20 : 24
            }}>
              {role === 'seeker'
                ? (detectedLocationLabel
                    ? `Find trusted service providers and materials in ${detectedLocationLabel}`
                    : seekerSubtitle)
                : ownerSubtitle}
            </Text>
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: spacing.xs }} />
                <Text style={{ fontSize: fontSize.xs, color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>
                  {role === 'seeker' ? seekerIndicator : ownerIndicator}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Role Toggle */}
          <RoleToggle
            role={role}
            onRoleChange={handleRoleChange}
            style={{ marginTop: isTablet ? 16 : 12, marginBottom: isTablet ? 16 : 12 }}
          />

        </View>
        {/* Scrollable Cards Section */}
        <Animated.ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ paddingBottom: 110 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
        {/* Service Categories - Horizontal Scrollable Sections */}
        {categoryData.map((cat, catIndex) => (
          <View key={cat.key} style={{ marginBottom: spacing.lg }}>
            {/* Category Header */}
            <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ServiceCategories', { category: cat.key, role })}
              >
                <Text style={{ fontSize: isTablet ? 20 : 18, fontWeight: '800', color: '#FFFFFF' }}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
                {role === 'seeker' ? cat.subtitleSeeker : cat.subtitleOwner}
              </Text>
            </View>

            {/* Horizontal Scrollable Cards */}
            <FlatList<Subcategory>
              horizontal
              showsHorizontalScrollIndicator={false}
              data={cat.subcategories || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item: subcat }) => (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={{ width: cardWidth, height: cardHeight, marginRight: spacing.md }}
                  onPress={() => {
                    // If service owner, show owner actions modal
                    if (role === 'owner') {
                      setSelectedOwnerCategory({
                        key: cat.key,
                        label: cat.label || cat.key,
                        subcategory: subcat.id,
                      });
                      setShowOwnerActions(true);
                      return;
                    }
                    
                    // For service seekers, navigate to service listings for this subcategory
                    navigation.navigate('ServiceCategories', { 
                      category: cat.key,
                      subcategory: subcat.id,
                      role: role 
                    });
                  }}
                >
                  <View style={{ 
                    flex: 1,
                    borderRadius: 20,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.2,
                    shadowRadius: 24,
                    elevation: 12,
                    overflow: 'hidden'
                  }}>
                    <LinearGradient
                      colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
                      style={{
                        flex: 1,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.3)'
                      }}
                    >
                      {/* Decorative elements */}
                      <View style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: `${cat.gradient[0]}12`,
                        opacity: 0.7
                      }} />
                      <View style={{
                        position: 'absolute',
                        bottom: -4,
                        left: -4,
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: `${cat.gradient[0]}08`,
                        opacity: 0.5
                      }} />

                      {/* Header Section */}
                      <View style={{ 
                        height: '65%',
                        borderTopLeftRadius: 20,
                        borderTopRightRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 8,
                        position: 'relative'
                      }}>
                        <View
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            borderTopLeftRadius: 20,
                          borderTopRightRadius: 20,
                          backgroundColor: subcat.gradient[0]
                          }}
                        />
                        
                        {/* Icon Container */}
                        <View style={{
                          width: 48,
                          height: 48,
                          backgroundColor: '#FFFFFF',
                          borderRadius: 24,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 8,
                          shadowColor: subcat.gradient[0],
                          shadowOffset: { width: 0, height: 3 },
                          shadowOpacity: 0.2,
                          shadowRadius: 6,
                          elevation: 6,
                          borderWidth: 2,
                          borderColor: `${subcat.gradient[0]}25`
                        }}>
                          <Text style={{ fontSize: 22 }}>
                            {subcat.icon}
                          </Text>
                        </View>
                        
                        {/* Label */}
                        <Text style={{ 
                          color: '#FFFFFF', 
                          fontWeight: '800', 
                          fontSize: 12,
                          textAlign: 'center',
                          letterSpacing: -0.2,
                          textShadowColor: 'rgba(0,0,0,0.3)',
                          textShadowOffset: { width: 0, height: 1 },
                          textShadowRadius: 1,
                          paddingHorizontal: 8
                        }}
                        numberOfLines={2}
                        >
                          {subcat.name}
                        </Text>
                      </View>

                      {/* Content Section */}
                      <View style={{ 
                        height: '35%',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        {/* Service Count Badge */}
                        <View style={{
                          backgroundColor: `${subcat.gradient[0]}15`,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 10,
                          flexDirection: 'row',
                          alignItems: 'center',
                          borderWidth: 1,
                          borderColor: `${subcat.gradient[0]}25`,
                          marginBottom: 4
                        }}>
                          <View style={{
                            width: 3,
                            height: 3,
                            borderRadius: 1.5,
                            backgroundColor: subcat.gradient[0],
                            marginRight: 4
                          }} />
                          <Text style={{ 
                            color: subcat.gradient[0], 
                            fontSize: 9,
                            fontWeight: '700',
                            letterSpacing: -0.1
                          }}>
                            {isLoadingCounts ? '...' : formatCount(cat.key)}
                          </Text>
                        </View>
                        
                        {/* Description */}
                        <Text style={{ 
                          color: '#6B7280', 
                          fontSize: 9,
                          textAlign: 'center',
                          lineHeight: 12,
                          fontWeight: '600'
                        }}
                        numberOfLines={1}
                        >
                          {subcat.description}
                        </Text>
                      </View>
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ 
                paddingHorizontal: spacing.lg,
                paddingRight: spacing.lg + spacing.md 
              }}
            />
          </View>
        ))}
        {/* Tools & Materials - Horizontal section of 6 cards */}
        <View style={{ paddingTop: spacing.lg }}>
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}>
            <Text style={{ fontSize: isTablet ? 20 : 18, fontWeight: '800', color: '#FFFFFF' }}>
              Tools & Materials
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
              {role === 'seeker' ? 'Find tools and materials' : 'List tools and materials'}
            </Text>
          </View>
          {(() => {
            const toolsList = [
              { key: 'tools', icon: '🛠️', label: 'Construction Tools', gradient: ['#F56500', '#F56500'] },
              { key: 'materials', icon: '🧱', label: 'Building Materials', gradient: ['#718096', '#718096'] },
              { key: 'rental', icon: '🏗️', label: 'Equipment Rental', gradient: ['#3182CE', '#3182CE'] },
              { key: 'movers', icon: '🚚', label: 'Transport & Movers', gradient: ['#38A169', '#38A169'] },
              { key: 'paint', icon: '🎨', label: 'Paint & Finishes', gradient: ['#805AD5', '#805AD5'] },
              { key: 'tiles', icon: '🧱', label: 'Tiles & Granite', gradient: ['#319795', '#319795'] },
            ];
            const cardW = isTablet ? 200 : 160;
            const cardH = isTablet ? 140 : 120;
            return (
              <Animated.ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ 
                  paddingHorizontal: spacing.lg,
                  paddingRight: spacing.lg + spacing.md 
                }}
              >
                {toolsList.slice(0, 6).map((item, idx) => (
                  <TouchableOpacity
                    key={item.key}
                    activeOpacity={0.9}
                    style={{ width: cardW, height: cardH, marginRight: spacing.md }}
                    onPress={() => handleCategoryPress({ key: item.key, label: item.label })}
                  >
                    <View style={{ 
                      flex: 1, 
                      borderRadius: 20,
                      shadowColor: '#000', 
                      shadowOffset: { width: 0, height: 8 }, 
                      shadowOpacity: 0.2, 
                      shadowRadius: 24, 
                      elevation: 12,
                      overflow: 'hidden'
                    }}>
                      <LinearGradient
                        colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
                        style={{
                          flex: 1,
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.3)',
                        }}
                      >
                        {/* Decorative elements */}
                        <View style={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          backgroundColor: item.gradient ? `${item.gradient[0]}12` : '#F3F4F6',
                          opacity: 0.7
                        }} />
                        <View style={{
                          position: 'absolute',
                          bottom: -4,
                          left: -4,
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: item.gradient ? `${item.gradient[1]}08` : '#E5E7EB',
                          opacity: 0.5
                        }} />

                        {/* Header Section with gradient background */}
                        <View style={{ 
                          height: '60%',
                          borderTopLeftRadius: 20,
                          borderTopRightRadius: 20,
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 8,
                          position: 'relative'
                        }}>
                          <View
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              borderTopLeftRadius: 20,
                              borderTopRightRadius: 20,
                              backgroundColor: item.gradient ? item.gradient[0] : '#6B7280',
                            }}
                          />
                          
                          {/* Icon Container with enhanced styling */}
                          <View style={{
                            width: 42,
                            height: 42,
                            backgroundColor: '#FFFFFF',
                            borderRadius: 21,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 6,
                            shadowColor: item.gradient ? item.gradient[0] : '#000',
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.2,
                            shadowRadius: 6,
                            elevation: 6,
                            borderWidth: 2,
                            borderColor: item.gradient ? `${item.gradient[0]}25` : '#E5E7EB'
                          }}>
                            <Text style={{ fontSize: 20 }}>
                              {item.icon}
                            </Text>
                          </View>
                          
                          {/* Tool Label with better styling */}
                          <Text style={{ 
                            color: '#FFFFFF', 
                            fontWeight: '800', 
                            fontSize: 11,
                            textAlign: 'center',
                            letterSpacing: -0.2,
                            textShadowColor: 'rgba(0,0,0,0.3)',
                            textShadowOffset: { width: 0, height: 1 },
                            textShadowRadius: 1
                          }}
                          numberOfLines={1}
                          adjustsFontSizeToFit={true}
                          >
                            {item.label}
                          </Text>
                        </View>

                        {/* Content Section with enhanced design */}
                        <View style={{ 
                          height: '40%',
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          justifyContent: 'center',
                          alignItems: 'center'
                        }}>
                          {/* Status Badge */}
                          <View style={{
                            backgroundColor: item.gradient ? `${item.gradient[0]}15` : '#F3F4F6',
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: item.gradient ? `${item.gradient[0]}25` : '#E5E7EB',
                            shadowColor: item.gradient ? item.gradient[0] : '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.08,
                            shadowRadius: 2,
                            elevation: 1,
                            marginBottom: 4
                          }}>
                            <View style={{
                              width: 3,
                              height: 3,
                              borderRadius: 1.5,
                              backgroundColor: item.gradient ? item.gradient[0] : '#6B7280',
                              marginRight: 4
                            }} />
                            <Text style={{ 
                              color: item.gradient ? item.gradient[0] : '#6B7280', 
                              fontSize: 9,
                              fontWeight: '700',
                              letterSpacing: -0.1
                            }}>
                              Available
                            </Text>
                          </View>
                          
                          {/* Subtitle */}
                          <Text style={{ 
                            color: '#6B7280', 
                            fontSize: 10,
                            textAlign: 'center',
                            lineHeight: 12,
                            fontWeight: '600'
                          }}
                          numberOfLines={1}
                          >
                            {role === 'seeker' ? 'Browse options' : 'List here'}
                          </Text>
                        </View>
                      </LinearGradient>
                    </View>
                  </TouchableOpacity>
                ))}
              </Animated.ScrollView>
            );
          })()}
        </View>

        </Animated.ScrollView>
      </View>

      {/* WhatsApp-style Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showMenu}
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity 
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-start',
            paddingTop: 100
          }}
          onPress={() => setShowMenu(false)}
          activeOpacity={1}
        >
          <View style={{
            margin: 16,
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 10
          }}>
            {/* Search Section */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: '700', 
                color: '#111827', 
                marginBottom: 12 
              }}>
                {role === 'seeker' ? 'Find Services' : 'Service Management'}
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F9FAFB',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                paddingHorizontal: 16,
                paddingVertical: 12
              }}>
                <Text style={{ color: '#9CA3AF', marginRight: 8, fontSize: 16 }}>
                  {role === 'seeker' ? '🔍' : '➕'}
                </Text>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => {
                    if (role === 'seeker') {
                      setShowMenu(false);
                      toggleSearch(true);
                    }
                  }}
                >
                  <Text style={{
                    fontSize: 16,
                    color: searchText ? '#111827' : '#9CA3AF',
                    paddingVertical: 4
                  }}>
                    {searchText || (role === 'seeker' ? seekerPlaceholder : ownerPlaceholder)}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (role === 'seeker') {
                    setShowMenu(false);
                    toggleSearch(true);
                  } else {
                    handleSearch();
                    setShowMenu(false);
                  }
                }}
                style={{
                  backgroundColor: role === 'seeker' ? '#6366F1' : '#4F46E5',
                  paddingVertical: 12,
                  borderRadius: 12,
                  marginTop: 8,
                  alignItems: 'center'
                }}
                activeOpacity={0.8}
              >
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontSize: 16, 
                  fontWeight: '600' 
                }}>
                  {role === 'seeker' ? 'Advanced Search' : 'List Service'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Action Buttons for Service Seekers */}
            {role === 'seeker' && (
              <View>
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('ServiceCategories', { role: role });
                    setShowMenu(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#EEF2FF',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#C7D2FE'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>📍</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#4F46E5' 
                  }}>
                    Find services near me
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('SavedServices');
                    setShowMenu(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F9FAFB',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>❤️</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#374151' 
                  }}>
                    Saved Services
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('ServiceCategories', { role: role });
                    setShowMenu(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F9FAFB',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>📋</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#374151' 
                  }}>
                    Browse Categories
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('MyServiceRequests');
                    setShowMenu(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F9FAFB',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#E5E7EB'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>📝</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#374151' 
                  }}>
                    My Service Requests
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    (navigation as any).navigate('DateMiConversations');
                    setShowMenu(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#EEF2FF',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#C7D2FE'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>💬</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#4F46E5' 
                  }}>
                    My Chats
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Action Buttons for Service Owners */}
            {role === 'owner' && (
              <View>
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('PostService');
                    setShowMenu(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#EEF2FF',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#C7D2FE'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>✏️</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#4F46E5' 
                  }}>
                    List a Service
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('MyServices');
                    setShowMenu(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#EEF2FF',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#C7D2FE'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>🏪</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#4F46E5' 
                  }}>
                    My Services
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('ServiceInquiries');
                    setShowMenu(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#EEF2FF',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#C7D2FE'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>💬</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#4F46E5' 
                  }}>
                    Customer Inquiries
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('ServiceAnalytics', { serviceId: 'sample-service' });
                    setShowMenu(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#FFF7ED',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#FDBA74'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>📊</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#4F46E5' 
                  }}>
                    Analytics & Insights
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    (navigation as any).navigate('DateMiConversations');
                    setShowMenu(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#EEF2FF',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#C7D2FE'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>💬</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#4F46E5' 
                  }}>
                    My Chats
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Universal Search Modal */}
      {showSearch && (
        <UniversalSearch
          module="services"
          onSearch={handleUniversalSearch}
          onClose={() => toggleSearch(false)}
          placeholder="Search services, tools, materials..."
          autoFocus={true}
          initialQuery={searchText}
        />
      )}
      
      {/* Service Owner Actions Modal */}
      <ServiceOwnerActions
        visible={showOwnerActions}
        onClose={() => {
          setShowOwnerActions(false);
          setSelectedOwnerCategory(null);
        }}
        categoryKey={selectedOwnerCategory?.key}
        categoryLabel={selectedOwnerCategory?.label}
        subcategory={selectedOwnerCategory?.subcategory}
      />

      </SafeAreaView>
    </LinearGradient>
  );
}

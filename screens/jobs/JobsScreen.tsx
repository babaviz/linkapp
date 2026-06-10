import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, RefreshControl, TextInput, Modal, StatusBar, StyleSheet, InteractionManager, Animated as RNAnimated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { updateRoleSpecificProfile, setCurrentModule, initializeUserProfile } from '../../redux/slices/userSlice';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { JobsStackParamList } from '../../navigation/JobsStackNavigator';
import { fetchJobs, syncJobAcrossLists, removeJobFromAllLists } from '../../redux/slices/jobSlice';
import { SKILL_CATEGORIES } from '../../config/constants';
import { KenyanSkillCategory, JobType, ExperienceLevel } from '../../types/job';
import useRealTimeJobs from '../../hooks/useRealTimeJobs';
import { jobService } from '../../services/jobService';
import { categoryCountService } from '../../services/categoryCountService';
import { 
  getDynamicDimensions, 
  getDeviceType, 
  getResponsiveMargin, 
  getResponsivePadding, 
  getCardWidth,
  getIconSize,
  spacing,
  fontSize,
  wp,
  hp
} from '../../utils/responsive';
import { FunctionalSearchBar } from '../../components/jobs/FunctionalSearchBar';
import { OptimizedJobCard } from '../../components/jobs/OptimizedJobCard';
import { JobCardSkeleton } from '../../components/jobs/JobCardSkeleton';
import EmployerActions from '../../components/jobs/EmployerActions';
import { useSearchDebounce } from '../../hooks/useDebounce';
import { useJobInteractions } from '../../hooks/useJobInteractions';
import { useInfiniteScroll, useInfiniteScrollFlatList } from '../../hooks/useInfiniteScroll';
import { useReanimatedOptimized, useListItemAnimation } from '../../hooks/useReanimatedAnimations';
import { getOptimizedFlatListProps, defaultKeyExtractor, runAfterInteractions, getOptimizedScrollViewProps } from '../../utils/flatListOptimizations';
import { 
  HeroBanner, 
  StatsWidget, 
  SearchSection, 
  JobActionButtons,
  InteractiveComponent,
  AccessibleText,
  AccessibleButton
} from '../../components/common';
import locationService from '../../services/locationService';
import { formatLocationDisplay } from '../../utils/locationHelpers';
import { useViewModeBackNavigation } from '../../hooks/useBackNavigation';
import { useActivityIndicators } from '../../hooks/useActivityIndicators';
import { useDynamicSubtitle } from '../../hooks/useUserCountry';
import { useJobCategoryCounts } from '../../hooks/useCategoryCounts';
import { getJobCategoryCanonicalKey } from '../../utils/jobCategoryMapping';

const JobsScreen = React.memo(() => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<StackNavigationProp<JobsStackParamList, 'JobsMain'>>();
  const { searchResults, isLoading, error } = useAppSelector(state => state.jobs);
  const { user } = useAppSelector(state => state.auth);
  const { currentProfile, profileSwitchContext, isLoading: isLoadingProfile } = useAppSelector(state => state.user);
  
  // Get responsive dimensions
  const { width: screenWidth, height: screenHeight, deviceType, isTablet } = useMemo(
    () => getDynamicDimensions(),
    []
  );
  const responsiveMargin = useMemo(() => getResponsiveMargin(), []);
  const responsivePadding = useMemo(() => getResponsivePadding(), []);
  
  // Optimized animations with Reanimated
  const {
    fadeAnimatedStyle,
    scaleAnimatedStyle,
    translateAnimatedStyle,
    fadeIn,
    slideIn,
    cancelAll,
    reset,
    presets
  } = useReanimatedOptimized();
  
  // Memoized job interactions
  const {
    handleApply,
    handleSave,
    handleViewDetails,
    isSaved,
    isApplied,
  } = useJobInteractions();
  
  // State management
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'categories' | 'jobs'>('categories');
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedJobType, setSelectedJobType] = useState<JobType | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<ExperienceLevel | null>(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [salaryRange, setSalaryRange] = useState<{min: number, max: number}>({min: 0, max: 100000});
  const [userType, setUserType] = useState<'job_seeker' | 'employer'>(
    currentProfile?.jobsProfile?.role || 'job_seeker'
  );

  const { activityData } = useActivityIndicators({
    module: 'jobs',
    userRole: userType,
    refreshInterval: 30000,
    enabled: true
  });
  const { formatCount, isLoading: isLoadingCounts, refreshCounts } = useJobCategoryCounts();
  
  const jobSubtitle = useDynamicSubtitle(
    'Connect talent with opportunities across {country}',
    'Connect talent with opportunities'
  );
  
  const [detectedLocationLabel, setDetectedLocationLabel] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showEmployerActions, setShowEmployerActions] = useState(false);
  const [selectedEmployerCategory, setSelectedEmployerCategory] = useState<string>('');
  
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

  // Initialize category animations array (max 30 categories)
  const [categoryAnimations] = useState(() => 
    Array.from({ length: 30 }, () => new RNAnimated.Value(1))
  );
  
  // Debounced search with optimal delay
  const { debouncedSearchTerm, isSearching } = useSearchDebounce(searchText, 500);

  // Infinite scroll for jobs
  const infiniteScroll = useInfiniteScroll({
    fetchData: useCallback(async (page: number) => {
      try {
        const result = await dispatch(fetchJobs({
          searchText: debouncedSearchTerm,
          filters: getActiveFilters(),
          sort_by: 'date_newest',
          page,
          limit: 20
        })).unwrap();
        
        return {
          data: result.jobs || [],
          hasMore: result.pagination?.hasMore || false,
          totalResults: result.pagination?.totalResults || 0,
        };
      } catch (error) {
        throw new Error('Failed to fetch jobs');
      }
    }, [dispatch, debouncedSearchTerm, selectedJobType, selectedExperience, selectedLocation, salaryRange, selectedCategory]),
  });

  const flatListProps = useInfiniteScrollFlatList(infiniteScroll);

  // Helper function to get active filters
  const getActiveFilters = useCallback(() => {
    const filters: any = {};
    if (selectedCategory) filters.category = selectedCategory;
    if (selectedJobType) filters.job_type = selectedJobType;
    if (selectedExperience) filters.experience_level = selectedExperience;
    if (selectedLocation) filters.location = { county: selectedLocation };
    if (salaryRange.min > 0 || salaryRange.max < 100000) {
      filters.salary_range = { min: salaryRange.min, max: salaryRange.max };
    }
    return filters;
  }, [selectedCategory, selectedJobType, selectedExperience, selectedLocation, salaryRange]);

  // Handle search
  const handleSearch = useCallback((searchTerm: string) => {
    setSearchText(searchTerm);
    if (searchTerm.trim() || Object.keys(getActiveFilters()).length > 0) {
      setViewMode('jobs');
    }
  }, [getActiveFilters]);

  // Effect for handling debounced search
  useEffect(() => {
    if (debouncedSearchTerm || Object.keys(getActiveFilters()).length > 0) {
      infiniteScroll.refresh();
    }
  }, [debouncedSearchTerm, getActiveFilters]);

  useEffect(() => {
    // Defer heavy operations until after interactions
    InteractionManager.runAfterInteractions(() => {
      // Initialize user profile if needed
      if (user && !currentProfile && !isLoadingProfile) {
        dispatch(initializeUserProfile(user));
      }
      
      // Set current module for profile context
      dispatch(setCurrentModule('jobs'));
      
      // Load initial data
      loadJobs();
      
      // Optimized entrance animations with Reanimated
      fadeIn(300);
      slideIn(100, 300);
    });

    // Cleanup animations on unmount
    return () => {
      cancelAll();
    };
  }, [user, currentProfile, isLoadingProfile, dispatch, fadeIn, slideIn, cancelAll]);

  useFocusEffect(
    useCallback(() => {
      categoryCountService.clearCache();
      void refreshCounts();
    }, [refreshCounts])
  );

  // Realtime: subscribe to job changes and refresh list on updates
  useRealTimeJobs({
    subscriptionId: 'jobs-global',
    onJobChange: async (payload) => {
      try {
        if (payload.eventType === 'DELETE') {
          dispatch(removeJobFromAllLists((payload.job as any).id) as any);
          await infiniteScroll.refresh();
          categoryCountService.clearCache();
          await refreshCounts();
          return;
        }
        const latest = await jobService.getJobById((payload.job as any).id);
        if (latest) {
          dispatch(syncJobAcrossLists(latest) as any);
          await infiniteScroll.refresh();
          categoryCountService.clearCache();
          await refreshCounts();
        }
      } catch (_) {
        // ignore
      }
    },
  });

  const loadJobs = useCallback(async () => {
    try {
      await dispatch(fetchJobs({
        filters: selectedCategory ? { category: selectedCategory } : {},
        sort_by: 'date_newest',
        page: 1,
        limit: 20
      })).unwrap();
    } catch (error) {
      // Error handled by Redux
    }
  }, [dispatch, selectedCategory]);

  const handleRefresh = useCallback(async () => {
    await infiniteScroll.refresh();
  }, [infiniteScroll]);

  const handleCategoryPress = useCallback((category: string) => {
    // If employer, show employer actions modal
    if (userType === 'employer') {
      setSelectedEmployerCategory(category);
      setShowEmployerActions(true);
      return;
    }
    
    // For job seekers, navigate to job listings using canonical category keys.
    const skillCategory = getJobCategoryCanonicalKey(category);
    
    // Preload data immediately before navigation for instant display
    dispatch(fetchJobs({
      filters: { category: skillCategory },
      page: 1,
      limit: 50
    }));
    
    // Navigate immediately - screen will have data ready or show loading state
    requestAnimationFrame(() => {
      navigation.navigate('CategoryJobs', { skill: skillCategory, role: userType });
    });
  }, [userType, navigation, dispatch]);

  const loadJobsWithFilters = async (additionalFilters = {}) => {
    try {
      const filters: any = { ...additionalFilters };
      
      if (selectedJobType) filters.job_type = selectedJobType;
      if (selectedExperience) filters.experience_level = selectedExperience;
      if (selectedLocation) filters.location = { county: selectedLocation };
      if (salaryRange.min > 0 || salaryRange.max < 100000) {
        filters.salary_range = { min: salaryRange.min, max: salaryRange.max };
      }

      await dispatch(fetchJobs({
        searchText: searchText,
        filters,
        sort_by: 'date_newest',
        page: 1,
        limit: 20
      })).unwrap();
    } catch (error) {
      
    }
  };

  const handleLegacySearch = async () => {
    setViewMode('jobs');
    await loadJobsWithFilters();
  };

  const clearFilters = async () => {
    setSelectedJobType(null);
    setSelectedExperience(null);
    setSelectedLocation('');
    setSalaryRange({min: 0, max: 100000});
    setSearchText('');
    setSelectedCategory(null);
    await loadJobs();
  };

  const handleViewAllJobs = async () => {
    setSelectedCategory(null);
    setViewMode('jobs');
    await loadJobsWithFilters();
  };
  
  // Use the back navigation hook with view mode support
  const { handleBack } = useViewModeBackNavigation(
    viewMode,
    'categories',
    setViewMode as any,
    {
      fallbackScreen: 'JobsMain'
    }
  );
  
  // Handle role change and update user profile
  const handleRoleChange = async (newRole: 'job_seeker' | 'employer') => {
    // Prevent role change if profile is loading or user not authenticated
    if (isLoadingProfile || !user) {
      
      return;
    }
    
    try {
      setUserType(newRole);
      
      // Update the user's jobs profile
      await dispatch(updateRoleSpecificProfile({
        module: 'jobs',
        role: newRole,
        preferences: {
          skillCategories: [],
          salaryRange: { min: 0, max: 200000 },
          locationPreferences: [],
          workType: 'any',
        }
      })).unwrap();

    } catch (error) {
      
      // Revert the UI state if the update failed
      setUserType(userType);
    }
  };

  // Find jobs near me (uses current GPS location and reverse geocodes to county/town)
  const handleNearMeSearch = async () => {
    try {
      const current = await locationService.getCurrentLocation();
      if (!current.success || !current.location) {
        locationService.showLocationPermissionDialog();
        return;
      }

      const place = await locationService.getCountyAndTownFromCoordinates(current.location);
      setSelectedLocation(place.county);
      setViewMode('jobs');
      await loadJobsWithFilters({ location: { county: place.county } });
    } catch (e) {
      
    }
  };

  // Optimized job card renderer
  const renderJobCard = useCallback(({ item: job, index }: { item: any, index: number }) => {
    return (
      <OptimizedJobCard
        job={job}
        index={index}
        isTablet={isTablet}
        onApply={handleApply}
        onSave={handleSave}
        onViewDetails={handleViewDetails}
        isSaved={isSaved(job.id)}
        isApplied={isApplied(job.id)}
      />
    );
  }, [isTablet, handleApply, handleSave, handleViewDetails, isSaved, isApplied]);

  // Loading skeleton renderer
  const renderLoadingSkeleton = useCallback(() => {
    return Array.from({ length: 3 }, (_, index) => (
      <JobCardSkeleton key={`skeleton-${index}`} isTablet={isTablet} />
    ));
  }, [isTablet]);

  // Legacy job card renderer (keeping the original implementation structure)
  const renderLegacyJobCard = ({ item: job, index }: { item: any, index: number }) => {
    const cardMargin = isTablet ? spacing.lg : spacing.md;
    const cardPadding = isTablet ? spacing.xl : spacing.lg;
    
    return (
      <View>
        <TouchableOpacity 
          style={[
            styles.jobCard,
            {
              marginHorizontal: cardMargin,
              marginBottom: spacing.md,
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 4,
              },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 8,
            }
          ]}
          activeOpacity={0.95}
        >
          {/* Premium Job Indicator */}
          {job.is_featured && (
            <View style={styles.premiumBadgeContainer}>
              <View style={[styles.premiumBadge, { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }]}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <MaterialIcons name="star" size={12} color="white" style={{marginRight: 4}} />
                  <Text style={{ color: 'white', fontSize: fontSize.xs, fontWeight: 'bold' }}>PREMIUM</Text>
                </View>
              </View>
            </View>
          )}

          {/* Job Header */}
          <View style={{ padding: cardPadding, paddingBottom: spacing.sm }}>
            <View style={[styles.flexRowBetween, { marginBottom: spacing.sm }]}>
              <View style={[styles.flex1, { marginRight: spacing.sm }]}>
                <Text 
                  style={{ 
                    fontSize: isTablet ? fontSize.xl : fontSize.lg,
                    fontWeight: 'bold',
                    color: '#111827',
                    lineHeight: isTablet ? 28 : 24
                  }} 
                  numberOfLines={2}
                >
                  {job.title}
                </Text>
                <View style={[styles.flexRowCenter, { marginTop: spacing.xs }]}>
                  <View 
                    style={[
                      styles.companyDot,
                      { 
                        width: isTablet ? 10 : 8, 
                        height: isTablet ? 10 : 8, 
                        marginRight: spacing.xs 
                      }
                    ]} 
                  />
                  <Text style={{ fontSize: fontSize.sm, color: '#059669', fontWeight: '600' }}>
                    {job.employer.company || job.employer.name}
                  </Text>
                  {job.employer.verified && (
                    <View style={[styles.verifiedBadge, { marginLeft: spacing.xs, paddingHorizontal: spacing.xs, paddingVertical: 2 }]}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <MaterialIcons name="verified" size={12} color="#15803d" style={{marginRight: 2}} />
                        <Text style={{ color: '#15803d', fontSize: fontSize.xs, fontWeight: '500' }}>Verified</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Job Meta Tags */}
            <View style={[styles.flexRowWrap, { marginBottom: spacing.sm }]}>
              <View 
                style={[
                  styles.locationTag,
                  { 
                    paddingHorizontal: spacing.sm, 
                    paddingVertical: spacing.xs, 
                    marginRight: spacing.xs, 
                    marginBottom: spacing.xs 
                  }
                ]}
              >
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <MaterialIcons name="location-on" size={12} color="#1d4ed8" style={{marginRight: 4}} />
                  <Text style={{ color: '#1d4ed8', fontSize: fontSize.xs, fontWeight: '500' }}>
                    {formatLocationDisplay(job.location)}
                  </Text>
                </View>
              </View>
              <View 
                style={[
                  styles.jobTypeTag,
                  { 
                    paddingHorizontal: spacing.sm, 
                    paddingVertical: spacing.xs, 
                    marginRight: spacing.xs, 
                    marginBottom: spacing.xs 
                  }
                ]}
              >
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <MaterialIcons name="work" size={12} color="#7c3aed" style={{marginRight: 4}} />
                  <Text style={{ color: '#7c3aed', fontSize: fontSize.xs, fontWeight: '500', textTransform: 'capitalize' }}>
                    {job.job_type.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              <View 
                style={[
                  styles.experienceTag,
                  { 
                    paddingHorizontal: spacing.sm, 
                    paddingVertical: spacing.xs, 
                    marginBottom: spacing.xs 
                  }
                ]}
              >
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <MaterialIcons name="emoji-events" size={12} color="#047857" style={{marginRight: 4}} />
                  <Text style={{ color: '#047857', fontSize: fontSize.xs, fontWeight: '500', textTransform: 'capitalize' }}>
                    {job.experience_level.replace('_', ' ')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Salary Highlight */}
            <View 
              style={[styles.salaryContainer, { padding: spacing.sm, marginBottom: spacing.sm }]}
            >
              <View style={[styles.flexRowBetween, { alignItems: 'center' }]}>
                <View style={styles.flexRowCenter}>
                  <Text style={{ 
                    fontSize: isTablet ? fontSize['2xl'] : fontSize.xl, 
                    fontWeight: 'bold', 
                    color: '#047857' 
                  }}>
                    KSH {job.salary.min.toLocaleString()}
                  </Text>
                  {job.salary.max !== job.salary.min && (
                    <Text style={{ 
                      fontSize: isTablet ? fontSize['2xl'] : fontSize.xl, 
                      fontWeight: 'bold', 
                      color: '#047857' 
                    }}> - {job.salary.max.toLocaleString()}</Text>
                  )}
                </View>
                <View 
                  style={[styles.salaryPeriodBadge, { paddingHorizontal: spacing.xs, paddingVertical: spacing.xs }]}
                >
                  <Text style={{ color: '#15803d', fontSize: fontSize.xs, fontWeight: 'bold' }}>
                    /{job.salary.period}
                  </Text>
                </View>
              </View>
            </View>

            {/* Description */}
            <Text 
              style={{ 
                fontSize: fontSize.sm, 
                color: '#4b5563', 
                lineHeight: isTablet ? 24 : 20, 
                marginBottom: spacing.sm 
              }} 
              numberOfLines={2}
            >
              {job.description}
            </Text>

            {/* Skills Preview */}
            {job.requirements && job.requirements.length > 0 && (
              <View style={{ marginBottom: spacing.sm }}>
                <Text style={{ 
                  fontSize: fontSize.xs, 
                  fontWeight: '600', 
                  color: '#374151', 
                  marginBottom: spacing.xs 
                }}>
                  Required Skills:
                </Text>
                <View style={styles.flexRowWrap}>
                  {job.requirements.slice(0, 3).map((req: any, index: number) => (
                    <View 
                      key={index} 
                      style={[
                        styles.skillTag,
                        { 
                          paddingHorizontal: spacing.xs, 
                          paddingVertical: spacing.xs, 
                          marginRight: spacing.xs, 
                          marginBottom: spacing.xs 
                        }
                      ]}
                    >
                      <Text style={{ fontSize: fontSize.xs, color: '#374151', fontWeight: '500' }}>
                        {req.skill}
                      </Text>
                    </View>
                  ))}
                  {job.requirements.length > 3 && (
                    <View 
                      style={[
                        styles.moreSkillsTag,
                        { 
                          paddingHorizontal: spacing.xs, 
                          paddingVertical: spacing.xs, 
                          marginBottom: spacing.xs 
                        }
                      ]}
                    >
                      <Text style={{ color: '#059669', fontSize: fontSize.xs, fontWeight: '500' }}>
                        +{job.requirements.length - 3} more
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Footer */}
          <View 
            style={[styles.style1, { paddingHorizontal: cardPadding, paddingVertical: spacing.md }]}
          >
            <View style={styles.style2}>
              <View style={[styles.style3, { gap: spacing.md }]}>
                <View style={styles.style3}>
                  <View 
                    style={[
                      styles.style4,
                      { 
                        width: isTablet ? getIconSize('md') : getIconSize('sm'), 
                        height: isTablet ? getIconSize('md') : getIconSize('sm'), 
                        marginRight: spacing.xs 
                      }
                    ]}
                  >
                    <MaterialIcons name="group" size={12} color="#2563eb" />
                  </View>
                  <Text style={{ fontSize: fontSize.sm, color: '#4b5563', fontWeight: '500' }}>
                    {job.applications_count} applicants
                  </Text>
                </View>
                
                {job.deadline && (
                  <View style={styles.style3}>
                    <View 
                      style={[
                        styles.style5,
                        { 
                          width: isTablet ? getIconSize('md') : getIconSize('sm'), 
                          height: isTablet ? getIconSize('md') : getIconSize('sm'), 
                          marginRight: spacing.xs 
                        }
                      ]}
                    >
                      <MaterialIcons name="schedule" size={12} color="#ea580c" />
                    </View>
                    <Text style={{ fontSize: fontSize.sm, color: '#ea580c', fontWeight: '600' }}>
                      {Math.ceil((new Date(job.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left
                    </Text>
                  </View>
                )}
              </View>
              
              <TouchableOpacity 
                style={[
                  styles.style6,
                  {
                    paddingHorizontal: isTablet ? spacing.xl : spacing.lg,
                    paddingVertical: spacing.sm,
                    shadowColor: '#047857',
                    shadowOffset: {
                      width: 0,
                      height: 2,
                    },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 6,
                  }
                ]}
                activeOpacity={0.8}
              >
                <Text style={{ color: 'white', fontSize: fontSize.sm, fontWeight: 'bold' }}>
                  Apply Now
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const FilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilters(false)}
    >
      <SafeAreaView style={styles.style7}>
        <View 
          style={[styles.style8, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}
        >
          <View style={styles.style2}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={{ color: '#059669', fontWeight: '600', fontSize: fontSize.base }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: isTablet ? fontSize.xl : fontSize.lg, fontWeight: 'bold', color: '#111827' }}>
              Filters
            </Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={{ color: '#dc2626', fontWeight: '600', fontSize: fontSize.base }}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={[styles.style9, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}
        >
          {/* Job Type Filter */}
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={{ 
              fontSize: fontSize.base, 
              fontWeight: '600', 
              color: '#111827', 
              marginBottom: spacing.sm 
            }}>
              Job Type
            </Text>
            <View style={styles.style10}>
              {(['full_time', 'part_time', 'contract', 'freelance'] as JobType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setSelectedJobType(selectedJobType === type ? null : type)}
                  style={[
                    {
                      borderRadius: 999,
                      borderWidth: 1,
                      backgroundColor: selectedJobType === type ? '#DC2626' : 'white',
                      borderColor: selectedJobType === type ? '#DC2626' : '#D1D5DB'
                    },
                    {
                      marginRight: spacing.sm,
                      marginBottom: spacing.xs,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                    }
                  ]}
                >
                  <Text style={{
                    fontSize: fontSize.sm,
                    fontWeight: '500',
                    textTransform: 'capitalize',
                    color: selectedJobType === type ? 'white' : '#374151'
                  }}>
                    {type.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Experience Level */}
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={{ 
              fontSize: fontSize.base, 
              fontWeight: '600', 
              color: '#111827', 
              marginBottom: spacing.sm 
            }}>
              Experience Level
            </Text>
            <View style={styles.style10}>
              {(['entry_level', 'intermediate', 'senior', 'expert'] as ExperienceLevel[]).map((level) => (
                <TouchableOpacity
                  key={level}
                  onPress={() => setSelectedExperience(selectedExperience === level ? null : level)}
                  style={[
                    {
                      borderRadius: 999,
                      borderWidth: 1,
                      backgroundColor: selectedExperience === level ? '#DC2626' : 'white',
                      borderColor: selectedExperience === level ? '#DC2626' : '#D1D5DB'
                    },
                    {
                      marginRight: spacing.sm,
                      marginBottom: spacing.xs,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                    }
                  ]}
                >
                  <Text style={{
                    fontSize: fontSize.sm,
                    fontWeight: '500',
                    textTransform: 'capitalize',
                    color: selectedExperience === level ? 'white' : '#374151'
                  }}>
                    {level.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location Filter */}
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={{ 
              fontSize: fontSize.base, 
              fontWeight: '600', 
              color: '#111827', 
              marginBottom: spacing.sm 
            }}>
              Location
            </Text>
            <TextInput
              value={selectedLocation}
              onChangeText={setSelectedLocation}
              placeholder="Enter county (e.g. Nairobi, Kiambu)"
              style={[
                styles.style11,
                {
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  fontSize: fontSize.base,
                  color: '#111827'
                }
              ]}
            />
          </View>

          {/* Apply Filters Button */}
          <TouchableOpacity
            onPress={() => {
              setShowFilters(false);
              handleLegacySearch();
            }}
            style={[
              styles.style12,
              {
                paddingVertical: spacing.md,
                marginBottom: spacing.md
              }
            ]}
          >
            <Text style={{ 
              color: 'white', 
              textAlign: 'center', 
              fontWeight: '600', 
              fontSize: fontSize.base 
            }}>
              Apply Filters
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  if (viewMode === 'jobs') {
    return (
      <LinearGradient
        colors={['#065F46', '#047857', '#064E3B']}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <FilterModal />
        
        {/* Fixed Header with Search */}
        <View style={{ backgroundColor: 'transparent' }}>
          <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
            <View style={[styles.style3, { marginBottom: spacing.sm }]}>
              <TouchableOpacity 
                onPress={() => setViewMode('categories')}
                style={[styles.style13, { marginRight: spacing.sm, padding: spacing.xs }]}
              >
                <MaterialIcons name="arrow-back" size={isTablet ? 24 : 20} color="white" />
              </TouchableOpacity>
              <View style={styles.style9}>
                <Text style={{ fontSize: isTablet ? fontSize.xl : fontSize.lg, fontWeight: 'bold', color: 'white' }}>
                  {selectedCategory || 'All Jobs'}
                </Text>
                <Text style={{ color: '#a7f3d0', fontSize: fontSize.xs }}>
                  {searchResults.length} opportunities available
                </Text>
              </View>
            </View>

            {/* Search Bar */}
            <View style={[styles.style3, { gap: spacing.sm, marginBottom: spacing.xs }]}>
              <View style={[styles.style14, { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }]}>
                <MaterialIcons name="search" size={fontSize.base} color="#9ca3af" style={{ marginRight: spacing.xs }} />
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Search jobs, skills, companies..."
                  style={{ flex: 1, color: '#111827', fontSize: fontSize.sm }}
                  onSubmitEditing={() => handleLegacySearch()}
                  returnKeyType="search"
                />
                  {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchText('')}>
                      <MaterialIcons name="close" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  )}
              </View>
              <TouchableOpacity
                onPress={() => setShowFilters(true)}
                style={[styles.style15, { padding: spacing.xs }]}
              >
                <MaterialIcons name="tune" size={16} color="white" />
              </TouchableOpacity>
            </View>

            {/* Active Filters */}
            {(selectedJobType || selectedExperience || selectedLocation) && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                bounces={false}
                contentContainerStyle={{ paddingHorizontal: 4 }}
                style={{ marginBottom: spacing.xs }}
              >
                <View style={styles.style16}>
                  {selectedJobType && (
                    <View 
                      style={[
                        styles.style17,
                        { 
                          paddingHorizontal: spacing.xs, 
                          paddingVertical: spacing.xs, 
                          marginRight: spacing.xs 
                        }
                      ]}
                    >
                      <Text style={{ color: 'white', fontSize: fontSize.xs, textTransform: 'capitalize' }}>
                        {selectedJobType.replace('_', ' ')}
                      </Text>
                      <TouchableOpacity onPress={() => setSelectedJobType(null)} style={{ marginLeft: spacing.xs }}>
                        <MaterialIcons name="close" size={12} color="white" />
                      </TouchableOpacity>
                    </View>
                  )}
                  {selectedExperience && (
                    <View 
                      style={[
                        styles.style17,
                        { 
                          paddingHorizontal: spacing.xs, 
                          paddingVertical: spacing.xs, 
                          marginRight: spacing.xs 
                        }
                      ]}
                    >
                      <Text style={{ color: 'white', fontSize: fontSize.xs, textTransform: 'capitalize' }}>
                        {selectedExperience.replace('_', ' ')}
                      </Text>
                      <TouchableOpacity onPress={() => setSelectedExperience(null)} style={{ marginLeft: spacing.xs }}>
                        <MaterialIcons name="close" size={12} color="white" />
                      </TouchableOpacity>
                    </View>
                  )}
                  {selectedLocation && (
                    <View 
                      style={[
                        styles.style17,
                        { 
                          paddingHorizontal: spacing.xs, 
                          paddingVertical: spacing.xs, 
                          marginRight: spacing.xs 
                        }
                      ]}
                    >
                      <Text style={{ color: 'white', fontSize: fontSize.xs }}>{selectedLocation}</Text>
                      <TouchableOpacity onPress={() => setSelectedLocation('')} style={{ marginLeft: spacing.xs }}>
                        <MaterialIcons name="close" size={12} color="white" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>

        {/* Optimized Jobs List with Infinite Scroll */}
        {infiniteScroll.isLoading && infiniteScroll.data.length === 0 ? (
          <View style={styles.style9}>
            <ScrollView>
              {renderLoadingSkeleton()}
            </ScrollView>
          </View>
        ) : infiniteScroll.error ? (
          <View style={styles.style18}>
            <View style={styles.style19}>
              <MaterialIcons name="warning" size={48} color="#F59E0B" />
              <Text style={styles.style21}>Couldn’t load jobs</Text>
              <Text style={styles.style22}>{infiniteScroll.error}</Text>
              <TouchableOpacity 
                onPress={infiniteScroll.refresh}
                style={styles.style23}
              >
                <Text style={styles.style24}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : infiniteScroll.data.length === 0 ? (
          <View style={styles.style18}>
            <View style={styles.style19}>
              <MaterialIcons name="work" size={48} color="#6B7280" />
              <Text style={styles.style25}>No Jobs Found</Text>
              <Text style={styles.style22}>
                No job opportunities match your current filters. Try adjusting your search criteria.
              </Text>
              <View style={styles.style26}>
                <TouchableOpacity 
                  onPress={clearFilters}
                  style={styles.style27}
                >
                  <Text style={styles.style28}>Clear Filters</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleViewAllJobs}
                  style={styles.style29}
                >
                  <Text style={styles.style24}>View All</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.style9}>
            <FlatList
              data={infiniteScroll.data}
              renderItem={renderJobCard}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={infiniteScroll.isLoading}
                  onRefresh={infiniteScroll.refresh}
                  colors={['#047857']}
                  tintColor="#047857"
                />
              }
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 90 }}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              // Infinite scroll props
              {...flatListProps}
              ListFooterComponent={() => (
                infiniteScroll.isLoadingMore ? (
                  <View style={{ paddingVertical: spacing.lg }}>
                    <JobCardSkeleton isTablet={isTablet} />
                  </View>
                ) : infiniteScroll.hasMore ? (
                    <View style={[styles.style30, { paddingVertical: spacing.lg }]}>
                    <Text style={{ color: '#64748b', fontSize: fontSize.sm }}>
                      Scroll to load more jobs
                    </Text>
                  </View>
                ) : infiniteScroll.data.length > 10 ? (
                  <View style={[styles.style30, { paddingVertical: spacing.lg }]}>
                    <Text style={{ color: '#64748b', fontSize: fontSize.sm }}>
                      You've reached the end!
                    </Text>
                  </View>
                ) : null
              )}
            />
          </View>
        )}
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Create action buttons with proper navigation
  const actionButtons = [
    {
      ...JobActionButtons[0],
      onPress: handleViewAllJobs,
    },
    {
      ...JobActionButtons[1],
      onPress: () => navigation.navigate('PostJob'),
    },
  ];

  return (
    <LinearGradient
      colors={['#065F46', '#047857', '#064E3B']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <Animated.View 
          style={[
            { flex: 1 },
            fadeAnimatedStyle
          ]}
        >
        {/* Clean Header Section */}
        <View style={{ 
          paddingHorizontal: isTablet ? 32 : screenWidth < 360 ? 12 : 16, 
          paddingTop: isTablet ? 32 : screenWidth < 360 ? 16 : 20, 
          paddingBottom: isTablet ? 16 : 8 
        }}>
          {/* Header with Title and 3-dot menu */}
          <View style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  fontSize: isTablet ? 36 : screenWidth < 360 ? 24 : 30, 
                  fontWeight: '800',
                  color: '#FFFFFF',
                  letterSpacing: -0.5,
                  marginBottom: isTablet ? 12 : 8
                }}>
                  Jobs & Skills
                </Text>
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
              {detectedLocationLabel ? `Connect talent with opportunities in ${detectedLocationLabel}` : jobSubtitle}
            </Text>
            
            {/* Subtle Live Indicator */}
            <View style={{ marginTop: 16 }}>
              <View style={styles.style3}>
                <View style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: 4, 
                  backgroundColor: '#047857',
                  marginRight: spacing.xs
                }} />
                <Text style={{ 
                  fontSize: fontSize.xs, 
                  color: 'rgba(255,255,255,0.8)',
                  fontWeight: '500'
                }}>
                  {activityData?.activity || (userType === 'job_seeker' ? "Loading..." : "Loading...")}
                </Text>
              </View>
            </View>
          </View>

          {/* Enhanced Pill-Style Role Switcher */}
          <View style={{ marginBottom: isTablet ? 16 : 8, alignItems: 'center' }}>
            <View style={{ 
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: isTablet ? 24 : 20,
              padding: isTablet ? 3 : 2,
              flexDirection: 'row',
              width: isTablet ? '60%' : screenWidth < 360 ? '90%' : '80%',
              maxWidth: isTablet ? 400 : 280,
              height: isTablet ? 52 : screenWidth < 360 ? 40 : 44
            }}>
              <TouchableOpacity
                onPress={() => handleRoleChange('job_seeker')}
                style={{ 
                  flex: 1,
                  height: 40,
                  backgroundColor: userType === 'job_seeker' ? '#FFFFFF' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: userType === 'job_seeker' ? 18 : 0,
                  marginHorizontal: userType === 'job_seeker' ? 0 : 1,
                  shadowColor: userType === 'job_seeker' ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: userType === 'job_seeker' ? 0.3 : 0,
                  shadowRadius: userType === 'job_seeker' ? 4 : 0,
                  elevation: userType === 'job_seeker' ? 3 : 0
                }}
                activeOpacity={0.8}
              >
                <Text style={{ 
                  color: userType === 'job_seeker' ? '#047857' : 'rgba(255,255,255,0.8)', 
                  fontSize: isTablet ? 16 : screenWidth < 360 ? 12 : 14, 
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  Job Seeker
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleRoleChange('employer')}
                style={{ 
                  flex: 1,
                  height: 40,
                  backgroundColor: userType === 'employer' ? '#FFFFFF' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: userType === 'employer' ? 18 : 0,
                  marginHorizontal: userType === 'employer' ? 0 : 1,
                  shadowColor: userType === 'employer' ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: userType === 'employer' ? 0.3 : 0,
                  shadowRadius: userType === 'employer' ? 4 : 0,
                  elevation: userType === 'employer' ? 3 : 0
                }}
                activeOpacity={0.8}
              >
                <Text style={{ 
                  color: userType === 'employer' ? '#047857' : 'rgba(255,255,255,0.8)', 
                  fontSize: isTablet ? 16 : screenWidth < 360 ? 12 : 14, 
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  Employer
                </Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>

        {/* Premium Job Categories Grid - Fluid Container */}
        <View style={{ 
          flex: 1, 
          paddingHorizontal: 0, 
          paddingTop: 0, 
          paddingBottom: 0 
        }}>
          {(() => {
            // Categories will be defined in responsive grid data function
            
            // Responsive grid system for all screen sizes - CENTERED
            const getResponsiveGridConfig = () => {
              if (isTablet) {
                // Tablet: 4 columns with larger cards
                const cols = 4;
                const horizontalPadding = 32; // Increased for better centering
                const gridSpacing = 12;
                const availableWidth = screenWidth - (horizontalPadding * 2);
                const cardWidth = (availableWidth - (gridSpacing * (cols - 1))) / cols;
                return { cols, horizontalPadding, gridSpacing, cardWidth, cardHeight: cardWidth * 1.3 };
              } else if (screenWidth < 360) {
                // Small phones: 2 columns with compact cards
                const cols = 2;
                const horizontalPadding = 20; // Increased for better centering
                const gridSpacing = 8;
                const availableWidth = screenWidth - (horizontalPadding * 2);
                const cardWidth = (availableWidth - gridSpacing) / cols;
                return { cols, horizontalPadding, gridSpacing, cardWidth, cardHeight: cardWidth * 1.5 };
              } else {
                // Standard phones: 3 columns with edge-to-edge design
                const cols = 3;
                const horizontalPadding = 24; // Increased for better centering
                const gridSpacing = 8;
                const availableWidth = screenWidth - (horizontalPadding * 2);
                const cardWidth = (availableWidth - (gridSpacing * 2)) / cols;
                return { cols, horizontalPadding, gridSpacing, cardWidth, cardHeight: cardWidth * 1.4 };
              }
            };
            
            const { cols, horizontalPadding, gridSpacing, cardWidth, cardHeight } = getResponsiveGridConfig();
            
            const renderCategoryCard = (category: string, index: number) => {
              // Premium category data with refined colors and content
              // Helper function to render category icons
              const getCategoryIcon = (iconName: string, size: number = 18) => {
                const iconMap: {[key: string]: string} = {
                  'plumbing': 'plumbing',
                  'masonry': 'square-foot',
                  'electrician': 'electrical-services',
                  'sewage': 'water-drop',
                  'biogas': 'bolt',
                  'painter': 'format-paint',
                  'welder': 'local-fire-department',
                  'carpenter': 'handyman',
                  'tech': 'computer',
                  'construction': 'construction',
                  'automotive': 'directions-car',
                  'healthcare': 'local-hospital',
                  'home': 'home',
                  'account-balance': 'account-balance',
                  'architecture': 'apartment',
                  'build': 'build',
                  'business-center': 'business-center',
                  'trending-up': 'trending-up',
                  'engineering': 'factory',
                  'science': 'science',
                  'palette': 'palette',
                  'gavel': 'gavel',
                  'security': 'security',
                  'restaurant': 'restaurant',
                  'local-shipping': 'local-shipping',
                  'pets': 'pets',
                  'eco': 'eco',
                  'terrain': 'terrain',
                  'water': 'water',
                  'school': 'school'
                };
                const materialIconName = iconMap[iconName] || 'work';
                return <MaterialIcons name={materialIconName as any} size={size} color="inherit" />;
              };

              const categoryData = {
                // Existing categories
                'Plumbing': { 
                  iconName: 'plumbing', 
                  label: 'Plumbing', 
                  subtitle: 'Water & sanitation',
                  color: '#3B82F6', // Blue
                  gradient: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                  lightColor: '#DBEAFE',
                  jobCount: isLoadingCounts ? '...' : formatCount('Plumbing')
                },
                'Masonry': { 
                  iconName: 'masonry', 
                  label: 'Masonry', 
                  subtitle: 'Building & construction',
                  color: '#10B981', // Emerald Green
                  gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  lightColor: '#D1FAE5',
                  jobCount: isLoadingCounts ? '...' : formatCount('Masonry')
                },
                'Electrician': { 
                  iconName: 'electrician', 
                  label: 'Electrician', 
                  subtitle: 'Electrical & solar',
                  color: '#F59E0B', // Amber
                  gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  lightColor: '#FEF3C7',
                  jobCount: isLoadingCounts ? '...' : formatCount('Electrician')
                },
                'Sewage Technician': { 
                  iconName: 'sewage', 
                  label: 'Sewage Tech', 
                  subtitle: 'Waste management',
                  color: '#8B5CF6', // Purple
                  gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                  lightColor: '#EDE9FE',
                  jobCount: isLoadingCounts ? '...' : formatCount('Sewage Technician')
                },
                'Biogas Technician': { 
                  iconName: 'biogas', 
                  label: 'Biogas Tech', 
                  subtitle: 'Renewable energy',
                  color: '#06B6D4', // Cyan
                  gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
                  lightColor: '#CFFAFE',
                  jobCount: isLoadingCounts ? '...' : formatCount('Biogas Technician')
                },
                'Painters': { 
                  iconName: 'painter', 
                  label: 'Painters', 
                  subtitle: 'Interior & exterior',
                  color: '#EF4444', // Red
                  gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                  lightColor: '#FEE2E2',
                  jobCount: isLoadingCounts ? '...' : formatCount('Painters')
                },
                'Welders and Fabricators': { 
                  iconName: 'welder', 
                  label: 'Welders', 
                  subtitle: 'Metal & fabrication',
                  color: '#F97316', // Orange
                  gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                  lightColor: '#FED7AA',
                  jobCount: isLoadingCounts ? '...' : formatCount('Welders and Fabricators')
                },
                'Wood Workings': { 
                  iconName: 'carpenter', 
                  label: 'Carpentry', 
                  subtitle: 'Furniture & woodwork',
                  color: '#84CC16', // Lime Green
                  gradient: 'linear-gradient(135deg, #84CC16 0%, #65A30D 100%)',
                  lightColor: '#ECFCCB',
                  jobCount: isLoadingCounts ? '...' : formatCount('Wood Workings')
                },
                'IT & Technology': { 
                  iconName: 'tech', 
                  label: 'Tech', 
                  subtitle: 'Digital & IT services',
                  color: '#6366F1', // Indigo
                  gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  lightColor: '#E0E7FF',
                  jobCount: isLoadingCounts ? '...' : formatCount('IT & Technology')
                },
                'Construction': { 
                  iconName: 'construction', 
                  label: 'Construction', 
                  subtitle: 'Building & infrastructure',
                  color: '#92400E', // Brown
                  gradient: 'linear-gradient(135deg, #92400E 0%, #78350F 100%)',
                  lightColor: '#FDE68A',
                  jobCount: isLoadingCounts ? '...' : formatCount('Construction')
                },
                'Automotive': { 
                  iconName: 'automotive', 
                  label: 'Automotive', 
                  subtitle: 'Vehicle repair & maintenance',
                  color: '#DC2626', // Dark Red
                  gradient: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                  lightColor: '#FEE2E2',
                  jobCount: isLoadingCounts ? '...' : formatCount('Automotive')
                },
                'Healthcare': { 
                  iconName: 'healthcare', 
                  label: 'Healthcare', 
                  subtitle: 'Medical & care services',
                  color: '#047857', // Dark Green
                  gradient: 'linear-gradient(135deg, #047857 0%, #064E3B 100%)',
                  lightColor: '#A7F3D0',
                  jobCount: isLoadingCounts ? '...' : formatCount('Healthcare')
                },
                
                // New additional categories
                'House Managers': {
                  iconName: 'home',
                  label: 'House Mgmt',
                  subtitle: 'Property & household management',
                  color: '#7C3AED', // Violet
                  gradient: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                  lightColor: '#DDD6FE',
                  jobCount: isLoadingCounts ? '...' : formatCount('House Managers')
                },
                'Finance & Accounting': {
                  iconName: 'account-balance',
                  label: 'Finance',
                  subtitle: 'Financial services & accounting',
                  color: '#059669', // Emerald
                  gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  lightColor: '#D1FAE5',
                  jobCount: isLoadingCounts ? '...' : formatCount('Finance & Accounting')
                },
                'Architecture & Construction': {
                  iconName: 'architecture',
                  label: 'Architecture',
                  subtitle: 'Design & planning',
                  color: '#1E40AF', // Navy Blue
                  gradient: 'linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%)',
                  lightColor: '#DBEAFE',
                  jobCount: isLoadingCounts ? '...' : formatCount('Architecture & Construction')
                },
                'Mechanics': {
                  iconName: 'build',
                  label: 'Mechanics',
                  subtitle: 'Mechanical repair & maintenance',
                  color: '#B45309', // Dark Orange
                  gradient: 'linear-gradient(135deg, #B45309 0%, #92400E 100%)',
                  lightColor: '#FED7AA',
                  jobCount: isLoadingCounts ? '...' : formatCount('Mechanics')
                },
                'Business Management & Administration': {
                  iconName: 'business-center',
                  label: 'Business Mgmt',
                  subtitle: 'Management & administration',
                  color: '#4B5563', // Gray
                  gradient: 'linear-gradient(135deg, #4B5563 0%, #374151 100%)',
                  lightColor: '#E5E7EB',
                  jobCount: isLoadingCounts ? '...' : formatCount('Business Management & Administration')
                },
                'Sales & Marketing': {
                  iconName: 'trending-up',
                  label: 'Sales & Marketing',
                  subtitle: 'Sales & marketing services',
                  color: '#EC4899', // Pink
                  gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
                  lightColor: '#FCE7F3',
                  jobCount: isLoadingCounts ? '...' : formatCount('Sales & Marketing')
                },
                'Engineering & Manufacturing': {
                  iconName: 'engineering',
                  label: 'Engineering',
                  subtitle: 'Engineering & production',
                  color: '#0891B2', // Teal
                  gradient: 'linear-gradient(135deg, #0891B2 0%, #0E7490 100%)',
                  lightColor: '#CFFAFE',
                  jobCount: isLoadingCounts ? '...' : formatCount('Engineering & Manufacturing')
                },
                'Science & Research': {
                  iconName: 'science',
                  label: 'Science',
                  subtitle: 'Research & development',
                  color: '#4F46E5', // Deep Indigo
                  gradient: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                  lightColor: '#E0E7FF',
                  jobCount: isLoadingCounts ? '...' : formatCount('Science & Research')
                },
                'Art Design & Media': {
                  iconName: 'palette',
                  label: 'Art & Design',
                  subtitle: 'Creative & media services',
                  color: '#A855F7', // Light Purple
                  gradient: 'linear-gradient(135deg, #A855F7 0%, #9333EA 100%)',
                  lightColor: '#F3E8FF',
                  jobCount: isLoadingCounts ? '...' : formatCount('Art Design & Media')
                },
                'Law': {
                  iconName: 'gavel',
                  label: 'Law',
                  subtitle: 'Legal services & compliance',
                  color: '#1F2937', // Dark Gray
                  gradient: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
                  lightColor: '#F3F4F6',
                  jobCount: isLoadingCounts ? '...' : formatCount('Law')
                },
                'Public Safety': {
                  iconName: 'security',
                  label: 'Public Safety',
                  subtitle: 'Safety & security services',
                  color: '#991B1B', // Maroon
                  gradient: 'linear-gradient(135deg, #991B1B 0%, #7F1D1D 100%)',
                  lightColor: '#FEE2E2',
                  jobCount: isLoadingCounts ? '...' : formatCount('Public Safety')
                },
                'Hospitality & Food Services': {
                  iconName: 'restaurant',
                  label: 'Hospitality',
                  subtitle: 'Hotels & food services',
                  color: '#EA580C', // Bright Orange
                  gradient: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
                  lightColor: '#FED7AA',
                  jobCount: isLoadingCounts ? '...' : formatCount('Hospitality & Food Services')
                },
                'Transportation & Logistics': {
                  iconName: 'local-shipping',
                  label: 'Transport',
                  subtitle: 'Logistics & delivery',
                  color: '#0D9488', // Teal Green
                  gradient: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                  lightColor: '#CCFBF1',
                  jobCount: isLoadingCounts ? '...' : formatCount('Transportation & Logistics')
                },
                'Animals': {
                  iconName: 'pets',
                  label: 'Animals',
                  subtitle: 'Animal care & veterinary',
                  color: '#65A30D', // Olive Green
                  gradient: 'linear-gradient(135deg, #65A30D 0%, #4D7C0F 100%)',
                  lightColor: '#ECFCCB',
                  jobCount: isLoadingCounts ? '...' : formatCount('Animals')
                },
                'Food, Plants & Trees': {
                  iconName: 'eco',
                  label: 'Agriculture',
                  subtitle: 'Farming & forestry',
                  color: '#16A34A', // Green
                  gradient: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                  lightColor: '#BBF7D0',
                  jobCount: isLoadingCounts ? '...' : formatCount('Food, Plants & Trees')
                },
                'Natural Resources': {
                  iconName: 'terrain',
                  label: 'Natural Resources',
                  subtitle: 'Mining & extraction',
                  color: '#78716C', // Stone
                  gradient: 'linear-gradient(135deg, #78716C 0%, #57534E 100%)',
                  lightColor: '#E7E5E4',
                  jobCount: isLoadingCounts ? '...' : formatCount('Natural Resources')
                },
                'Marine & Fisheries': {
                  iconName: 'water',
                  label: 'Marine',
                  subtitle: 'Fishing & marine services',
                  color: '#0284C7', // Sky Blue
                  gradient: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                  lightColor: '#E0F2FE',
                  jobCount: isLoadingCounts ? '...' : formatCount('Marine & Fisheries')
                },
                'Quaternary Sector': {
                  iconName: 'school',
                  label: 'Quaternary',
                  subtitle: 'Knowledge & information',
                  color: '#BE185D', // Rose
                  gradient: 'linear-gradient(135deg, #BE185D 0%, #9F1239 100%)',
                  lightColor: '#FECDD3',
                  jobCount: isLoadingCounts ? '...' : formatCount('Quaternary Sector')
                }
              } as const;

              const currentCategory = categoryData[category as keyof typeof categoryData] || {
                iconName: 'tech',
                label: category,
                subtitle: 'Explore opportunities',
                color: '#6B7280',
                lightColor: '#F3F4F6',
                jobCount: isLoadingCounts ? '...' : formatCount(category)
              };

              // Calculate position in responsive grid
              const row = Math.floor(index / cols);
              const col = index % cols;

              return (
                <RNAnimated.View
                  key={index}
                  style={{
                    position: 'absolute',
                    width: cardWidth,
                    height: cardHeight,
                    left: col * (cardWidth + gridSpacing),
                    top: row * (cardHeight + gridSpacing),
                    transform: [{
                      translateY: categoryAnimations[index] ? categoryAnimations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0],
                      }) : 0,
                    }, {
                      scale: categoryAnimations[index] ? categoryAnimations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }) : 1,
                    }],
                    opacity: categoryAnimations[index] || 1,
                  }}>
                  <TouchableOpacity 
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#FFFFFF',
                      borderRadius: 20,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.1,
                      shadowRadius: 20,
                      elevation: 10,
                      borderWidth: 1,
                      borderColor: '#F1F5F9',
                    }}
                    onPress={() => handleCategoryPress(category)}
                    activeOpacity={0.85}
                  >
                    {/* Header Section with Icon Background */}
                    <View style={{ 
                      height: '70%',
                      backgroundColor: currentCategory.color,
                      borderTopLeftRadius: 20,
                      borderTopRightRadius: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0
                    }}>
                      {/* Icon Container - Enhanced Size */}
                      <View style={{
                        width: isTablet ? 48 : screenWidth < 360 ? 32 : 40,
                        height: isTablet ? 48 : screenWidth < 360 ? 32 : 40,
                        backgroundColor: '#FFFFFF',
                        borderRadius: isTablet ? 24 : screenWidth < 360 ? 16 : 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: isTablet ? 4 : 2,
                        shadowColor: currentCategory.color,
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                        elevation: 2
                      }}>
                        <View>
                          {getCategoryIcon(currentCategory.iconName, isTablet ? 22 : screenWidth < 360 ? 16 : 18)}
                        </View>
                      </View>
                      
                      {/* Category Label - Enhanced Size */}
                      <Text style={{ 
                        color: '#FFFFFF', 
                        fontWeight: '700', 
                        fontSize: isTablet ? 14 : screenWidth < 360 ? 9 : 11,
                        textAlign: 'center',
                        letterSpacing: -0.1,
                        marginBottom: isTablet ? 4 : 2
                      }}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      >
                        {currentCategory.label}
                      </Text>
                    </View>

                    {/* Content Section */}
                    <View style={{ 
                      height: '30%',
                      paddingHorizontal: isTablet ? 4 : screenWidth < 360 ? 1 : 2,
                      paddingVertical: isTablet ? 2 : 1,
                      justifyContent: 'center'
                    }}>
                      {/* Subtitle */}
                      <Text style={{ 
                        color: '#6B7280', 
                        fontSize: 14,
                        textAlign: 'center',
                        lineHeight: 18,
                        fontWeight: '500'
                      }}
                      numberOfLines={1}
                      >
                        {currentCategory.subtitle}
                      </Text>
                      
                      {/* Job Count with modern design */}
                      <View style={{ 
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 0
                      }}>
                        <View style={{
                          backgroundColor: currentCategory.lightColor,
                          paddingHorizontal: 2,
                          paddingVertical: 0,
                          borderRadius: 2,
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}>
                          <Text style={{ 
                            color: currentCategory.color, 
                            fontSize: 12,
                            fontWeight: 'bold'
                          }}>
                            {currentCategory.jobCount}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </RNAnimated.View>
              );
                };

            // Responsive grid data - all categories
            const getGridData = () => {
              const allCategories = [
                'Plumbing', 'Masonry', 'Electrician', 'Sewage Technician',
                'Biogas Technician', 'Painters', 'Welders and Fabricators', 'Wood Workings',
                'IT & Technology', 'Construction', 'Automotive', 'Healthcare',
                'House Managers', 'Finance & Accounting', 'Architecture & Construction',
                'Mechanics', 'Business Management & Administration', 'Sales & Marketing',
                'Engineering & Manufacturing', 'Science & Research', 'Art Design & Media',
                'Law', 'Public Safety', 'Hospitality & Food Services',
                'Transportation & Logistics', 'Animals', 'Food, Plants & Trees',
                'Natural Resources', 'Marine & Fisheries', 'Quaternary Sector'
              ];
              
              if (isTablet) {
                // Show all categories on tablets
                return allCategories;
              } else if (screenWidth < 360) {
                // Show a subset on very small screens (first 12 categories)
                return allCategories.slice(0, 12);
              } else {
                // Show all categories on standard phones with scrolling
                return allCategories;
              }
            };
            
            const responsiveGrid = getGridData();
            const rows = Math.ceil(responsiveGrid.length / cols);
            const finalGridHeight = rows * cardHeight + (rows - 1) * gridSpacing;

            return (
              <ScrollView 
                style={{ flex: 1, marginHorizontal: 0 }} 
                contentContainerStyle={{ 
                  paddingBottom: 110, // Dynamic padding for floating tab navigation
                  flexGrow: 1, 
                  paddingHorizontal: horizontalPadding,
                  paddingTop: 16,
                  alignItems: 'center'
                }}
                showsVerticalScrollIndicator={false}
                decelerationRate="fast"
                bounces={true}
                scrollEventThrottle={16}
              >
                <View style={{ 
                  position: 'relative', 
                  minHeight: finalGridHeight, 
                  width: screenWidth - (horizontalPadding * 2),
                  paddingTop: 0, 
                  paddingBottom: 0 
                }}>
                {responsiveGrid.map((category, index) => renderCategoryCard(category, index))}
                </View>
              </ScrollView>
            );
          })()}
        </View>
      </Animated.View>

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
                {userType === 'job_seeker' ? 'Search Jobs' : 'Employer Tools'}
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
                  {userType === 'job_seeker' ? '🔍' : '💼'}
                </Text>
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder={userType === 'job_seeker' ? "Search jobs, skills, companies..." : "Describe the position you're hiring for..."}
                  placeholderTextColor="#9CA3AF"
                  style={{ 
                    flex: 1, 
                    fontSize: 16,
                    color: '#111827'
                  }}
                  onSubmitEditing={() => {
                    if (userType === 'job_seeker') {
                      handleLegacySearch();
                    } else {
                      navigation.navigate('PostJob');
                    }
                    setShowMenu(false);
                  }}
                  returnKeyType={userType === 'job_seeker' ? "search" : "done"}
                />
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (userType === 'job_seeker') {
                    handleLegacySearch();
                  } else {
                    navigation.navigate('PostJob');
                  }
                  setShowMenu(false);
                }}
                style={{
                  backgroundColor: userType === 'job_seeker' ? '#047857' : '#065F46',
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
                  {userType === 'job_seeker' ? 'Search Jobs' : 'Post Job'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Action Buttons for Job Seekers */}
            {userType === 'job_seeker' && (
              <View>
                <TouchableOpacity
                  onPress={() => {
                    handleNearMeSearch();
                    setShowMenu(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#ECFDF5',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#A7F3D0'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>📍</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#047857' 
                  }}>
                    Find jobs near me
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('MyApplications');
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
                    Saved Jobs
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setShowFilters(true);
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
                  <Text style={{ fontSize: 20, marginRight: 12 }}>⚙️</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#374151' 
                  }}>
                    Advanced Filters
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('SkillsProfile');
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
                  <Text style={{ fontSize: 20, marginRight: 12 }}>👤</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#374151' 
                  }}>
                    My Profile
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
                    backgroundColor: '#ECFDF5',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#A7F3D0'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>💬</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#047857' 
                  }}>
                    My Chats
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Action Buttons for Employers */}
            {userType === 'employer' && (
              <View>
                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('PostJob');
                    setShowMenu(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#ECFDF5',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#A7F3D0'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>✏️</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#047857' 
                  }}>
                    Post a Job
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('MyPostings');
                    setShowMenu(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#ECFDF5',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#A7F3D0'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>📋</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#047857' 
                  }}>
                    My Job Postings
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('JobApplications', { jobId: 'employer-view' });
                    setShowMenu(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#ECFDF5',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: '#A7F3D0'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>📄</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#047857' 
                  }}>
                    Applications Received
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    navigation.navigate('CompanyProfile');
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
                  <Text style={{ fontSize: 20, marginRight: 12 }}>🏢</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#047857' 
                  }}>
                    Company Profile
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
                    backgroundColor: '#ECFDF5',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#A7F3D0'
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, marginRight: 12 }}>💬</Text>
                  <Text style={{ 
                    flex: 1,
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: '#047857' 
                  }}>
                    My Chats
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Employer Actions Modal */}
      <EmployerActions
        visible={showEmployerActions}
        onClose={() => {
          setShowEmployerActions(false);
          setSelectedEmployerCategory('');
        }}
        category={selectedEmployerCategory}
      />

      </SafeAreaView>
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  // Job Card Styles
  jobCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  premiumBadgeContainer: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10,
  },
  premiumBadge: {
    backgroundColor: '#EAB308',
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  flexRowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  flexRowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flexRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  flex1: {
    flex: 1,
  },
  companyDot: {
    backgroundColor: '#059669',
    borderRadius: 999,
  },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
  },
  // Tag Styles
  locationTag: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 999,
  },
  jobTypeTag: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 999,
  },
  experienceTag: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 999,
  },
  salaryContainer: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
  },
  salaryPeriodBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 999,
  },
  skillTag: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  moreSkillsTag: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
  },
  jobCardFooter: {
    backgroundColor: '#F9FAFB',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  applicantsBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
  },
  deadlineBadge: {
    backgroundColor: '#FFEDD5',
    borderRadius: 999,
  },
  applyButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
  },
  // Modal and Filter Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalScrollView: {
    flex: 1,
  },
  filterButton: {
    borderRadius: 999,
    borderWidth: 1,
  },
  filterButtonActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  filterButtonInactive: {
    backgroundColor: 'white',
    borderColor: '#D1D5DB',
  },
  searchInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
  },
  applyFiltersButton: {
    backgroundColor: '#059669',
    borderRadius: 8,
  },
  // Search and Header Styles
  searchContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterToggleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  activeFilterChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Additional Styles
  style1: {
  'backgroundColor': '#F9FAFB',
  'borderBottomLeftRadius': 16,
  'borderBottomRightRadius': 16
},
  style2: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between'
},
  style3: {
  'flexDirection': 'row',
  'alignItems': 'center'
},
  style4: {
  'backgroundColor': '#DBEAFE',
  'borderRadius': 9999,
  'alignItems': 'center',
  'justifyContent': 'center'
},
  style5: {
  'borderRadius': 9999,
  'alignItems': 'center',
  'justifyContent': 'center'
},
  style6: {
  'borderRadius': 12
},
  style7: {
  'flex': 1,
  'backgroundColor': '#F9FAFB'
},
  style8: {
  'backgroundColor': '#FFFFFF',
  'borderBottomWidth': 1,
  'borderColor': '#E5E7EB'
},
  style9: {
  'flex': 1
},
  style10: {
  'flexDirection': 'row'
},
  style11: {
  'backgroundColor': '#FFFFFF',
  'borderWidth': 1,
  'borderColor': '#D1D5DB',
  'borderRadius': 8
},
  style12: {
  'borderRadius': 8
},
  style13: {
  'borderRadius': 9999
},
  style14: {
  'flex': 1,
  'backgroundColor': '#FFFFFF',
  'borderRadius': 8,
  'flexDirection': 'row',
  'alignItems': 'center'
},
  style15: {
  'backgroundColor': '#FFFFFF',
  'borderRadius': 8
},
  style16: {
  'flexDirection': 'row'
},
  style17: {
  'backgroundColor': '#FFFFFF',
  'borderRadius': 9999,
  'flexDirection': 'row',
  'alignItems': 'center'
},
  style18: {
  'flex': 1,
  'justifyContent': 'center',
  'alignItems': 'center',
  'paddingHorizontal': 24
},
  style19: {
  'backgroundColor': '#FFFFFF',
  'padding': 32,
  'borderRadius': 16
},
  style20: {
  'textAlign': 'center',
  'marginBottom': 16
},
  style21: {
  'color': '#DC2626',
  'fontSize': 18,
  'marginBottom': 8,
  'textAlign': 'center',
  'fontWeight': '600'
},
  style22: {
  'color': '#4B5563',
  'textAlign': 'center',
  'marginBottom': 24
},
  style23: {
  'paddingHorizontal': 24,
  'paddingVertical': 12,
  'borderRadius': 8
},
  style24: {
  'color': '#FFFFFF',
  'fontWeight': '600',
  'textAlign': 'center'
},
  style25: {
  'fontSize': 20,
  'fontWeight': '700',
  'color': '#1F2937',
  'marginBottom': 8,
  'textAlign': 'center'
},
  style26: {
  'flexDirection': 'row'
},
  style27: {
  'backgroundColor': '#F3F4F6',
  'paddingHorizontal': 16,
  'paddingVertical': 12,
  'borderRadius': 8,
  'flex': 1
},
  style28: {
  'color': '#374151',
  'fontWeight': '600',
  'textAlign': 'center'
},
  style29: {
  'paddingHorizontal': 16,
  'paddingVertical': 12,
  'borderRadius': 8,
  'flex': 1
},
  style30: {
  'alignItems': 'center'
},
});

JobsScreen.displayName = 'JobsScreen';

export default JobsScreen;

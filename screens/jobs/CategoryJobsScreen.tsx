import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { JobsStackParamList } from '../../navigation/JobsStackNavigator';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { fetchJobs } from '../../redux/slices/jobSlice';
import { JobPosting } from '../../types/job';

type CategoryJobsRouteProp = RouteProp<JobsStackParamList, 'CategoryJobs'>;
type CategoryJobsNavigationProp = StackNavigationProp<JobsStackParamList, 'CategoryJobs'>;

interface JobItem {
  id: string;
  title: string;
  company: string;
  category: string;
  description: string;
  salary: string;
  location: string;
  distance: string;
  type: string;
  experience: string;
  posted: string;
  applicants: number;
  skills: string[];
  urgent: boolean;
  verified: boolean;
  logo: string;
}

interface JobItemCardProps {
  item: JobItem;
  index: number;
  isApplied: boolean;
  isSaved: boolean;
  isTablet: boolean;
  spacing: any;
  onCardPress: (jobId: string) => void;
  onApplyJob: (jobId: string) => void;
  onToggleSaved: (jobId: string) => void;
}

const JobItemCard: React.FC<JobItemCardProps> = React.memo(({
  item,
  index,
  isApplied,
  isSaved,
  isTablet,
  spacing,
  onCardPress,
  onApplyJob,
  onToggleSaved
}) => {
  // Removed animations for instant, smooth rendering
  return (
    <View>
      <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.98)',
          borderRadius: 20,
          padding: spacing.lg,
          marginBottom: spacing.md,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)'
        }}
      >
        {/* Header Section */}
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md }}
          onPress={() => onCardPress(item.id)}
          activeOpacity={0.7}
        >
          <View style={{
            width: isTablet ? 64 : 56,
            height: isTablet ? 64 : 56,
            borderRadius: isTablet ? 32 : 28,
            backgroundColor: '#047857',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing.md,
            shadowColor: '#047857',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6
          }}>
            <Text style={{ fontSize: isTablet ? 28 : 24 }}>{item.logo}</Text>
          </View>
          
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Text style={{ 
                fontSize: isTablet ? 18 : 16, 
                fontWeight: '800', 
                color: '#111827',
                flex: 1,
                marginRight: spacing.sm
              }}>
                {item.title}
              </Text>
              {item.urgent && (
                <View style={{
                  backgroundColor: '#EF4444',
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <MaterialIcons name="local-fire-department" size={8} color="#FFFFFF" style={{ marginRight: 2 }} />
                  <Text style={{ 
                    color: '#FFFFFF', 
                    fontSize: 10, 
                    fontWeight: '700'
                  }}>
                    URGENT
                  </Text>
                </View>
              )}
            </View>
            
            <Text style={{ 
              fontSize: isTablet ? 16 : 14, 
              color: '#047857',
              fontWeight: '700',
              marginTop: 2
            }}>
              {item.company}
            </Text>
            
            <Text style={{ 
              fontSize: isTablet ? 14 : 12, 
              color: '#6B7280',
              marginTop: 2,
              marginBottom: spacing.sm
            }}>
              {item.description}
            </Text>
            
            {/* Salary and Type Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ 
                color: '#047857', 
                fontSize: isTablet ? 16 : 14, 
                fontWeight: '800' 
              }}>
                {item.salary}
              </Text>
              
              <View style={{
                backgroundColor: '#D1FAE5',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#A7F3D0'
              }}>
                <Text style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: '#065F46'
                }}>
                  {item.type}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Details Section */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="location-on" size={12} color="#6B7280" style={{ marginRight: 4 }} />
            <Text style={{ fontSize: 12, color: '#6B7280', marginRight: spacing.md }}>
              {item.location} • {item.distance}
            </Text>
            <Text style={{ fontSize: 12, marginRight: 4 }}>⏱️</Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>
              {item.posted}
            </Text>
          </View>
          
          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
            {item.applicants} applicants
          </Text>
        </View>

        {/* Skills */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={{ marginBottom: spacing.sm }}
        >
          {item.skills.map((skill: string, idx: number) => {
            return (
              <View 
                key={`skill-${idx}-${skill}`}
                style={{
                  backgroundColor: '#ECFDF5',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  marginRight: 6,
                  borderWidth: 1,
                  borderColor: '#D1FAE5'
                }}
              >
                <Text style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: '#047857'
                }}>
                  {skill}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: isApplied ? '#6B7280' : '#047857',
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
              marginRight: spacing.xs,
              shadowColor: '#047857',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 4
            }}
            onPress={(event) => {
              event.stopPropagation();
              onApplyJob(item.id);
            }}
            activeOpacity={0.8}
            disabled={isApplied}
          >
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: 12, 
              fontWeight: '700' 
            }}>
              {isApplied ? '✓ Applied' : '📝 Apply Now'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              alignItems: 'center',
              borderWidth: 2,
              borderColor: isSaved ? '#F87171' : '#E5E7EB',
              backgroundColor: isSaved ? '#FEE2E2' : '#F9FAFB'
            }}
            onPress={(event) => {
              event.stopPropagation();
              onToggleSaved(item.id);
            }}
            activeOpacity={0.8}
          >
            <Text style={{ 
              fontSize: 12,
              color: isSaved ? '#DC2626' : '#6B7280'
            }}>
              {isSaved ? '💖' : '🤍'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  return prevProps.item.id === nextProps.item.id && 
         prevProps.isSaved === nextProps.isSaved &&
         prevProps.isApplied === nextProps.isApplied &&
         prevProps.index === nextProps.index;
});

// Memoize entire screen to prevent unnecessary re-renders during navigation
const CategoryJobsScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<CategoryJobsNavigationProp>();
  const route = useRoute<CategoryJobsRouteProp>();
  const { skill, role = 'job_seeker' } = route.params || {};
  const { width: screenWidth, isTablet } = getDynamicDimensions();
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);
  
  // Get jobs from Redux
  const { searchResults, isLoading } = useAppSelector(state => state.jobs);
  
  // Optimized data fetching: render screen instantly, fetch data in background
  useEffect(() => {
    if (!skill) return;
    
    // Immediate dispatch without InteractionManager delay for instant content
    // Redux handles async operations, screen renders immediately with loading state
    const promise = dispatch(fetchJobs({
      filters: { category: skill },
      page: 1,
      limit: 50
    }));
    
    return () => {
      // Cleanup if user navigates away during fetch
      promise.abort?.();
    };
  }, [dispatch, skill]);
  
  // Use the back navigation hook
  const { handleBack } = useBackNavigation({
    fallbackScreen: 'JobsMain'
  });

  // Memoized job transformation with stable reference
  const jobsData = useMemo((): JobItem[] => {
    if (!searchResults || searchResults.length === 0) {
      return [];
    }
    return searchResults.map((job: JobPosting) => ({
      id: job.id,
      title: job.title,
      company: job.employer?.company || job.employer?.name || 'Company',
      category: job.category || 'General',
      description: job.description || '',
      salary: job.salary ? `KSh ${job.salary.min?.toLocaleString()}-${job.salary.max?.toLocaleString()}/${job.salary.period || 'month'}` : 'Negotiable',
      location: job.location?.town || job.location?.county || 'Kenya',
      distance: '0 km',
      type: job.job_type || 'full_time',
      experience: job.experience_level || 'entry',
      posted: job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recently',
      applicants: job.applicationsCount || 0,
      skills: job.requirements?.map(r => r.skill || '') || [],
      urgent: job.featured || false,
      verified: job.employer?.verified || false,
      logo: '💼'
    }));
  }, [searchResults]);


  const filterOptions = ['All', 'Most Recent', 'Highest Salary', 'Nearest', 'Urgent Only'];
  
  const filteredJobs = useMemo(() => {
    let filtered = [...jobsData];
    
    switch (selectedFilter) {
      case 'Most Recent':
        filtered.sort((a, b) => {
          const aPosted = a.posted.includes('day') ? parseInt(a.posted) : 
                        a.posted.includes('week') ? parseInt(a.posted) * 7 : 0;
          const bPosted = b.posted.includes('day') ? parseInt(b.posted) : 
                        b.posted.includes('week') ? parseInt(b.posted) * 7 : 0;
          return aPosted - bPosted;
        });
        break;
      case 'Highest Salary':
        filtered.sort((a, b) => {
          const aSalary = parseInt(a.salary.replace(/[^0-9]/g, ''));
          const bSalary = parseInt(b.salary.replace(/[^0-9]/g, ''));
          return bSalary - aSalary;
        });
        break;
      case 'Nearest':
        filtered.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
        break;
      case 'Urgent Only':
        filtered = filtered.filter(job => job.urgent);
        break;
    }
    
    return filtered;
  }, [jobsData, selectedFilter]);

  const getCategoryTitle = React.useCallback(() => {
    const categoryTitles: { [key: string]: string } = {
      // Existing categories
      'masonry': 'Masonry Jobs',
      'plumbing': 'Plumbing Jobs',
      'plumber': 'Plumber Jobs', // legacy support
      'electrician': 'Electrician Jobs',
      'sewage_technician': 'Sewage Technician Jobs',
      'sewage technician': 'Sewage Technician Jobs',
      'biogas_technician': 'Biogas Technician Jobs',
      'biogas technician': 'Biogas Technician Jobs',
      'painters': 'Painter Jobs',
      'welders_fabricators': 'Welder & Fabricator Jobs',
      'welders_and_fabricators': 'Welder & Fabricator Jobs',
      'welders and fabricators': 'Welder & Fabricator Jobs',
      'carpentry': 'Carpentry Jobs',
      'wood workings': 'Wood Working Jobs',
      'wood_workings': 'Wood Working Jobs',
      'it_and_technology': 'IT & Technology Jobs',
      'it_technology': 'IT & Technology Jobs',
      'it & technology': 'IT & Technology Jobs',
      'construction': 'Construction Jobs',
      'automotive': 'Automotive Jobs',
      'healthcare': 'Healthcare Jobs',
      'technology': 'Technology Jobs',
      
      // New additional categories
      'house_managers': 'House Manager Jobs',
      'house managers': 'House Manager Jobs',
      'finance_accounting': 'Finance & Accounting Jobs',
      'finance_and_accounting': 'Finance & Accounting Jobs',
      'finance & accounting': 'Finance & Accounting Jobs',
      'architecture_construction': 'Architecture & Construction Jobs',
      'architecture_and_construction': 'Architecture & Construction Jobs',
      'architecture & construction': 'Architecture & Construction Jobs',
      'mechanics': 'Mechanic Jobs',
      'business_management': 'Business Management Jobs',
      'business_management_and_administration': 'Business Management Jobs',
      'business management & administration': 'Business Management Jobs',
      'sales_marketing': 'Sales & Marketing Jobs',
      'sales_and_marketing': 'Sales & Marketing Jobs',
      'sales & marketing': 'Sales & Marketing Jobs',
      'engineering_manufacturing': 'Engineering & Manufacturing Jobs',
      'engineering_and_manufacturing': 'Engineering & Manufacturing Jobs',
      'engineering & manufacturing': 'Engineering & Manufacturing Jobs',
      'science_research': 'Science & Research Jobs',
      'science_and_research': 'Science & Research Jobs',
      'science & research': 'Science & Research Jobs',
      'art_design_media': 'Art, Design & Media Jobs',
      'art_design_and_media': 'Art, Design & Media Jobs',
      'art design & media': 'Art, Design & Media Jobs',
      'law': 'Law Jobs',
      'public_safety': 'Public Safety Jobs',
      'public safety': 'Public Safety Jobs',
      'hospitality_food': 'Hospitality & Food Service Jobs',
      'hospitality_and_food_services': 'Hospitality & Food Service Jobs',
      'hospitality & food services': 'Hospitality & Food Service Jobs',
      'transportation_logistics': 'Transportation & Logistics Jobs',
      'transportation_and_logistics': 'Transportation & Logistics Jobs',
      'transportation & logistics': 'Transportation & Logistics Jobs',
      'animals': 'Animal Care Jobs',
      'food_plants_trees': 'Agriculture & Forestry Jobs',
      'food_plants_and_trees': 'Agriculture & Forestry Jobs',
      'food, plants & trees': 'Agriculture & Forestry Jobs',
      'natural_resources': 'Natural Resources Jobs',
      'natural resources': 'Natural Resources Jobs',
      'marine_fisheries': 'Marine & Fisheries Jobs',
      'marine_and_fisheries': 'Marine & Fisheries Jobs',
      'marine & fisheries': 'Marine & Fisheries Jobs',
      'quaternary_sector': 'Quaternary Sector Jobs',
      'quaternary sector': 'Quaternary Sector Jobs'
    };
    
    return skill ? categoryTitles[skill.toLowerCase()] || `${skill.charAt(0).toUpperCase() + skill.slice(1)} Jobs` : 'All Jobs';
  }, [skill]);

  const getCategoryIcon = React.useCallback(() => {
    const iconMap: { [key: string]: string } = {
      // Existing categories
      'masonry': 'square-foot',
      'plumbing': 'plumbing',
      'plumber': 'plumbing',
      'electrician': 'electrical-services',
      'sewage_technician': 'water-drop',
      'sewage technician': 'water-drop',
      'biogas_technician': 'bolt',
      'biogas technician': 'bolt',
      'painters': 'format-paint',
      'welders_fabricators': 'local-fire-department',
      'welders_and_fabricators': 'local-fire-department',
      'welders and fabricators': 'local-fire-department',
      'carpentry': 'handyman',
      'wood workings': 'handyman',
      'wood_workings': 'handyman',
      'it_and_technology': 'computer',
      'it_technology': 'computer',
      'it & technology': 'computer',
      'construction': 'construction',
      'automotive': 'directions-car',
      'healthcare': 'local-hospital',
      'technology': 'computer',
      
      // New additional categories
      'house_managers': 'home',
      'house managers': 'home',
      'finance_accounting': 'account-balance',
      'finance_and_accounting': 'account-balance',
      'finance & accounting': 'account-balance',
      'architecture_construction': 'apartment',
      'architecture_and_construction': 'apartment',
      'architecture & construction': 'apartment',
      'mechanics': 'build',
      'business_management': 'business-center',
      'business_management_and_administration': 'business-center',
      'business management & administration': 'business-center',
      'sales_marketing': 'trending-up',
      'sales_and_marketing': 'trending-up',
      'sales & marketing': 'trending-up',
      'engineering_manufacturing': 'factory',
      'engineering_and_manufacturing': 'factory',
      'engineering & manufacturing': 'factory',
      'science_research': 'science',
      'science_and_research': 'science',
      'science & research': 'science',
      'art_design_media': 'palette',
      'art_design_and_media': 'palette',
      'art design & media': 'palette',
      'law': 'gavel',
      'public_safety': 'security',
      'public safety': 'security',
      'hospitality_food': 'restaurant',
      'hospitality_and_food_services': 'restaurant',
      'hospitality & food services': 'restaurant',
      'transportation_logistics': 'local-shipping',
      'transportation_and_logistics': 'local-shipping',
      'transportation & logistics': 'local-shipping',
      'animals': 'pets',
      'food_plants_trees': 'eco',
      'food_plants_and_trees': 'eco',
      'food, plants & trees': 'eco',
      'natural_resources': 'terrain',
      'natural resources': 'terrain',
      'marine_fisheries': 'water',
      'marine_and_fisheries': 'water',
      'marine & fisheries': 'water',
      'quaternary_sector': 'school',
      'quaternary sector': 'school'
    };
    
    const iconName = skill ? iconMap[skill.toLowerCase()] || 'work' : 'work';
    return <MaterialIcons name={iconName as any} size={24} color="#FFFFFF" />;
  }, [skill]);

  const handleToggleSaved = React.useCallback((jobId: string) => {
    setSavedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  }, []);

  const handleApplyJob = React.useCallback((jobId: string) => {
    setAppliedJobs(prev => 
      prev.includes(jobId) 
        ? prev
        : [...prev, jobId]
    );
    try {
      navigation.navigate('MyApplications');
    } catch (error) {
      
    }
  }, [navigation]);

  const handleCardPress = React.useCallback((jobId: string) => {
    try {
      navigation.navigate('JobDetails', { jobId });
    } catch (error) {
      
    }
  }, [navigation]);

  const renderJobItem = React.useCallback(({ item, index }: { item: JobItem, index: number }) => {
    const isSaved = savedJobs.includes(item.id);
    const isApplied = appliedJobs.includes(item.id);
    
    return (
      <JobItemCard
        item={item}
        index={index}
        isSaved={isSaved}
        isApplied={isApplied}
        isTablet={isTablet}
        spacing={spacing}
        onCardPress={handleCardPress}
        onApplyJob={handleApplyJob}
        onToggleSaved={handleToggleSaved}
      />
    );
  }, [savedJobs, appliedJobs, isTablet, spacing, handleCardPress, handleApplyJob, handleToggleSaved]);

  return (
    <LinearGradient
      colors={['#047857', '#065F46', '#064E3B']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ 
            paddingHorizontal: spacing.lg, 
            paddingTop: spacing.md,
            paddingBottom: spacing.md 
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
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
                <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <View style={{ marginRight: spacing.xs }}>
                    {getCategoryIcon()}
                  </View>
                  <Text style={{ 
                    color: '#FFFFFF', 
                    fontSize: isTablet ? 24 : 20, 
                    fontWeight: '800'
                  }}>
                    {getCategoryTitle()}
                  </Text>
                </View>
                <Text style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: 14,
                  marginTop: 2
                }}>
                  {role === 'employer' 
                    ? `Manage your job postings in this category`
                    : `${filteredJobs.length} jobs found`
                  }
                </Text>
              </View>
            </View>

            {/* Post Job Button for Employers */}
            {role === 'employer' && (
              <TouchableOpacity
                onPress={() => navigation.navigate('PostJob')}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                  borderRadius: 16,
                  marginBottom: spacing.md,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.3)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                activeOpacity={0.8}
              >
                <MaterialIcons name="edit" size={20} color="#FFFFFF" style={{ marginRight: spacing.sm }} />
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontSize: 16, 
                  fontWeight: '700' 
                }}>
                  Post Job in this Category
                </Text>
              </TouchableOpacity>
            )}

            {/* Filter Pills - Only show for job seekers */}
            {role === 'job_seeker' && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: spacing.sm }}
              >
                {filterOptions.map((filter, index) => {
                return (
                  <TouchableOpacity
                    key={`filter-${filter}-${index}`}
                    onPress={() => setSelectedFilter(filter)}
                    style={{
                      backgroundColor: selectedFilter === filter 
                        ? 'rgba(255,255,255,0.3)' 
                        : 'rgba(255,255,255,0.1)',
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      marginRight: spacing.sm,
                      borderWidth: 1,
                      borderColor: selectedFilter === filter 
                        ? 'rgba(255,255,255,0.4)' 
                        : 'rgba(255,255,255,0.2)'
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: selectedFilter === filter ? '700' : '500'
                    }}>
                      {filter}
                    </Text>
                  </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Jobs List - Different content based on role */}
          <View style={{ flex: 1 }}>
            {role === 'employer' ? (
              <View style={{ 
                flex: 1, 
                justifyContent: 'center', 
                alignItems: 'center', 
                paddingHorizontal: spacing.lg 
              }}>
                <Text style={{ fontSize: 60, marginBottom: spacing.md }}>💼</Text>
                <Text style={{ 
                  fontSize: fontSize.lg, 
                  fontWeight: 'bold', 
                  color: '#FFFFFF',
                  textAlign: 'center',
                  marginBottom: spacing.sm
                }}>
                  Job Management
                </Text>
                <Text style={{ 
                  fontSize: fontSize.base, 
                  color: 'rgba(255,255,255,0.8)',
                  textAlign: 'center',
                  marginBottom: spacing.lg
                }}>
                  Manage your job postings in {getCategoryTitle().replace(' Jobs', '')} category.
                </Text>

                {/* Management Options */}
                <View style={{ width: '100%', maxWidth: 320 }}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('PostJob')}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.lg,
                      borderRadius: 16,
                      marginBottom: spacing.md,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.3)',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 20, marginRight: spacing.sm }}>✏️</Text>
                    <Text style={{ 
                      color: '#FFFFFF', 
                      fontSize: 16, 
                      fontWeight: '700' 
                    }}>
                      Post New Job
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('MyPostings')}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.lg,
                      borderRadius: 16,
                      marginBottom: spacing.md,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.2)',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 20, marginRight: spacing.sm }}>📋</Text>
                    <Text style={{ 
                      color: '#FFFFFF', 
                      fontSize: 16, 
                      fontWeight: '600' 
                    }}>
                      My Job Postings
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('JobApplications', { jobId: 'employer-view' })}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.lg,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.2)',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 20, marginRight: spacing.sm }}>👥</Text>
                    <Text style={{ 
                      color: '#FFFFFF', 
                      fontSize: 16, 
                      fontWeight: '600' 
                    }}>
                      Job Applications
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : isLoading ? (
              <View style={{ 
                flex: 1, 
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.md 
              }}>
                <Text style={{ 
                  fontSize: fontSize.base, 
                  color: 'rgba(255,255,255,0.8)',
                  textAlign: 'center',
                  marginBottom: spacing.lg
                }}>
                  Loading jobs...
                </Text>
              </View>
            ) : filteredJobs.length === 0 ? (
              <View style={{ 
                flex: 1, 
                justifyContent: 'center', 
                alignItems: 'center', 
                paddingHorizontal: spacing.lg 
              }}>
                <Text style={{ fontSize: 60, marginBottom: spacing.md }}>{getCategoryIcon()}</Text>
                <Text style={{ 
                  fontSize: fontSize.lg, 
                  fontWeight: 'bold', 
                  color: '#FFFFFF',
                  textAlign: 'center',
                  marginBottom: spacing.sm
                }}>
                  No Jobs Found
                </Text>
                <Text style={{ 
                  fontSize: fontSize.base, 
                  color: 'rgba(255,255,255,0.8)',
                  textAlign: 'center',
                  marginBottom: spacing.lg
                }}>
                  No job opportunities match your current filter. Try adjusting your criteria.
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedFilter('All')}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.sm,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.3)'
                  }}
                >
                  <Text style={{ 
                    color: '#FFFFFF', 
                    fontSize: fontSize.base, 
                    fontWeight: '600' 
                  }}>
                    Show All Jobs
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={filteredJobs}
                keyExtractor={(item) => `job-${item.id}`}
                renderItem={renderJobItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ 
                  paddingHorizontal: spacing.lg,
                  paddingBottom: 120 
                }}
                style={{ flex: 1 }}
                // Aggressive performance optimizations for instant rendering
                removeClippedSubviews={true}
                maxToRenderPerBatch={3}
                initialNumToRender={3}
                windowSize={5}
                updateCellsBatchingPeriod={100}
                getItemLayout={(data, index) => ({
                  length: 220,
                  offset: 220 * index,
                  index,
                })}
                // Prevent blank flashes during navigation
                maintainVisibleContentPosition={{
                  minIndexForVisible: 0,
                }}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default React.memo(CategoryJobsScreen);

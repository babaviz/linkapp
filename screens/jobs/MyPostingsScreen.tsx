import React, { useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  FlatList, 
  RefreshControl, 
  Alert, 
  StatusBar, 
  StyleSheet,
  Animated,
  Pressable
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { fetchUserJobs, updateJob, removeJobFromAllLists } from '../../redux/slices/jobSlice';
import { JobPosting } from '../../types/job';
import { Material3Card } from '../../components/common';
import { 
  getDynamicDimensions, 
  getResponsiveMargin, 
  getResponsivePadding, 
  spacing,
  fontSize,
  getCrossPlatformShadow
} from '../../utils/responsive';
import { getUserFacingError } from '../../utils/userFacingError';
import { jobService } from '../../services/jobService';
import { categoryCountService } from '../../services/categoryCountService';

type MyPostingsNavigationProp = StackNavigationProp<any>;

// Loading Skeleton Component
const JobCardSkeleton: React.FC = () => (
  <View style={[styles.jobCard, { backgroundColor: '#F9FAFB' }]}>
    <View style={styles.skeletonHeader}>
      <View style={[styles.skeletonBox, { width: '70%', height: 20 }]} />
      <View style={[styles.skeletonBox, { width: 80, height: 24, borderRadius: 12 }]} />
    </View>
    <View style={styles.skeletonMeta}>
      <View style={[styles.skeletonBox, { width: '40%', height: 16 }]} />
      <View style={[styles.skeletonBox, { width: '30%', height: 16 }]} />
    </View>
    <View style={[styles.skeletonBox, { width: '50%', height: 18, marginVertical: spacing.sm }]} />
    <View style={styles.skeletonActions}>
      <View style={[styles.skeletonBox, { width: '30%', height: 36 }]} />
      <View style={[styles.skeletonBox, { width: '25%', height: 36 }]} />
      <View style={[styles.skeletonBox, { width: '20%', height: 36 }]} />
    </View>
  </View>
);

// Floating Action Button Component
interface FloatingActionButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityRole?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps & { bottomInset: number }> = ({ 
  onPress, 
  accessibilityLabel,
  accessibilityRole,
  bottomInset
}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };
  
  return (
    <Animated.View 
      style={[
        styles.fab, 
        { 
          bottom: Math.max(bottomInset, 16) + 16,
          transform: [{ scale: scaleValue }] 
        }
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.fabButton}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole as any}
        accessibilityHint="Navigate to create a new job posting"
      >
        <Icon name="add" size={28} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
};

export default function MyPostingsScreen() {
  const navigation = useNavigation<MyPostingsNavigationProp>();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { user } = useAppSelector(state => state.auth);
  const { userJobs, isLoading } = useAppSelector(state => state.jobs);
  
  const { width: screenWidth, isTablet } = getDynamicDimensions();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'paused' | 'closed'>('all');
  const [error, setError] = useState<string | null>(null);

  // Load jobs when screen is focused
  useFocusEffect(
    useCallback(() => {
      setError(null);
      if (!user?.id) return;

      dispatch(fetchUserJobs(user.id))
        .unwrap()
        .catch((err) => {
          const friendly = getUserFacingError(err, {
            action: 'load your job postings',
            displayStyle: 'inline',
          });
          setError(friendly.message);
        });
    }, [dispatch, user?.id])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      if (user?.id) {
        await dispatch(fetchUserJobs(user.id)).unwrap();
      }
    } catch (err) {
      const friendly = getUserFacingError(err, {
        action: 'refresh your job postings',
        displayStyle: 'inline',
      });
      setError(friendly.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Use Redux jobs or empty array
  const jobPostings = userJobs || [];

  const handleStatusChange = (jobId: string, newStatus: JobPosting['status']) => {
    Alert.alert(
      'Change Job Status',
      `Are you sure you want to mark this job as ${newStatus}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await dispatch(updateJob({ 
                id: jobId, 
                updates: { status: newStatus, updatedAt: new Date().toISOString() } 
              })).unwrap();
              categoryCountService.clearCache();
              Alert.alert('Success', `Job status updated to ${newStatus}`);
            } catch (error) {
              const friendly = getUserFacingError(error, {
                action: 'update this job status',
                displayStyle: 'alert',
              });
              Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
            }
          },
        },
      ]
    );
  };

  const handleDeleteJob = (jobId: string) => {
    Alert.alert(
      'Delete Job Posting',
      'Are you sure you want to delete this job posting? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await jobService.deleteJob(jobId);
              dispatch(removeJobFromAllLists(jobId) as any);
              categoryCountService.clearCache();
              Alert.alert('Success', 'Job deleted successfully');
            } catch (error) {
              const friendly = getUserFacingError(error, {
                action: 'delete this job',
                displayStyle: 'alert',
              });
              Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: JobPosting['status']) => {
    switch (status) {
      case 'active': return { bg: '#D1FAE5', text: '#047857', border: '#34D399' };
      case 'paused': return { bg: '#FEF3C7', text: '#D97706', border: '#FBBF24' };
      case 'closed': return { bg: '#FEE2E2', text: '#DC2626', border: '#F87171' };
      default: return { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' };
    }
  };

  const filteredJobPostings = jobPostings.filter(job => 
    selectedStatus === 'all' || job.status === selectedStatus
  );

  const statusCounts = {
    all: jobPostings.length,
    active: jobPostings.filter(j => j.status === 'active').length,
    paused: jobPostings.filter(j => j.status === 'paused').length,
    closed: jobPostings.filter(j => j.status === 'closed').length,
  };

  const handleViewApplications = (jobId: string) => {
    navigation.navigate('JobApplications', { jobId });
  };

  const handleEditJob = (jobId: string) => {
    navigation.navigate('EditJob', { jobId });
  };

  const showJobActionMenu = (job: JobPosting) => {
    const actions = [];
    
    if (job.status === 'active') {
      actions.push({ text: 'Pause Job', onPress: () => handleStatusChange(job.id, 'paused') });
    } else if (job.status === 'paused') {
      actions.push({ text: 'Activate Job', onPress: () => handleStatusChange(job.id, 'active') });
    }
    
    if (job.status !== 'closed') {
      actions.push({ text: 'Close Job', onPress: () => handleStatusChange(job.id, 'closed') });
    }
    
    actions.push({ text: 'Delete Job', onPress: () => handleDeleteJob(job.id), style: 'destructive' });
    actions.push({ text: 'Cancel', style: 'cancel' });
    
    Alert.alert(
      job.title,
      'What would you like to do with this job posting?',
      actions.map(action => ({
        text: action.text,
        style: action.style as any,
        onPress: action.onPress
      }))
    );
  };

  const renderJobCard = ({ item: job }: { item: JobPosting }) => {
    const statusStyle = getStatusColor(job.status);
    
    return (
      <Material3Card 
        variant="elevated" 
        style={{ ...styles.jobCard as any, ...(isTablet ? { maxWidth: 600, alignSelf: 'center', width: '100%' } : {}) }}
        onPress={() => handleViewApplications(job.id)}
        accessibilityRole="button"
        accessibilityLabel={`Job posting for ${job.title} at ${job.employer.company || job.employer.name}. Status: ${job.status}. ${job.applicationsCount || 0} applications.`}
        accessibilityHint="Tap to view applications for this job"
      >
        {/* Header with title and status */}
        <View style={styles.jobHeader}>
          <View style={styles.jobTitleContainer}>
            <Text style={styles.jobTitle} numberOfLines={2}>
              {job.title}
            </Text>
            <View style={styles.companyInfo}>
              <Icon name="business" size={14} color="#6B7280" style={{ marginRight: 4 }} />
              <Text style={styles.companyName}>
                {job.employer.company || job.employer.name}
              </Text>
              {job.employer.verified && (
                <Icon name="verified" size={16} color="#10B981" style={{ marginLeft: 4 }} />
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {job.status}
            </Text>
          </View>
        </View>

        {/* Job meta info */}
        <View style={styles.jobMeta}>
          <View style={styles.metaItem}>
            <Icon name="location-on" size={16} color="#6B7280" />
            <Text style={styles.metaText}>
              {job.location.town}, {job.location.county}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="work" size={16} color="#6B7280" />
            <Text style={styles.metaText}>
              {job.job_type.replace('_', ' ')}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="star" size={16} color="#6B7280" />
            <Text style={styles.metaText}>
              {job.experience_level.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* Salary range */}
        <View style={styles.salaryContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={styles.salaryText}>
              KSH {job.salary.min.toLocaleString()}
              {job.salary.max !== job.salary.min && ` - ${job.salary.max.toLocaleString()}`}
            </Text>
            <Text style={styles.salaryPeriod}>/{job.salary.period}</Text>
          </View>
        </View>

        {/* Job stats */}
        <View style={styles.jobStats}>
          <View style={styles.statItem}>
            <Icon name="people" size={18} color="#3B82F6" />
            <Text style={styles.statText}>
              {job.applicationsCount || 0} applications
            </Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="schedule" size={18} color="#6B7280" />
            <Text style={styles.statText}>
              {new Date(job.createdAt || '').toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={() => handleViewApplications(job.id)}
            style={[styles.actionButton, styles.primaryAction]}
            accessibilityRole="button"
            accessibilityLabel={`View ${job.applicationsCount || 0} applications for ${job.title}`}
          >
            <Icon name="inbox" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Applications</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => handleEditJob(job.id)}
            style={[styles.actionButton, styles.secondaryAction]}
            accessibilityRole="button"
            accessibilityLabel={`Edit job posting: ${job.title}`}
          >
            <Icon name="edit" size={18} color="#374151" />
            <Text style={styles.secondaryActionText}>Edit</Text>
          </TouchableOpacity>
          
          <View style={styles.moreActionsContainer}>
            <TouchableOpacity
              onPress={() => showJobActionMenu(job)}
              style={[styles.actionButton, styles.tertiaryAction]}
              accessibilityRole="button"
              accessibilityLabel="More actions for this job"
              accessibilityHint="Shows menu with pause, activate, close, or delete options"
            >
              <Icon name="more-vert" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
      </Material3Card>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header skeleton */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={[styles.skeletonBox, { width: 40, height: 40, borderRadius: 20 }]} />
              <View style={[styles.skeletonBox, { width: 160, height: 24 }]} />
              <View style={[styles.skeletonBox, { width: 80, height: 32, borderRadius: 16 }]} />
            </View>
          </View>
          
          {/* Loading job cards */}
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: spacing.lg }}
            showsVerticalScrollIndicator={false}
          >
            {[1, 2, 3].map((i) => (
              <JobCardSkeleton key={i} />
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Icon name="arrow-back" size={24} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>My Job Postings</Text>
              <View style={{ width: 40 }} />
            </View>
          </View>
          
          <View style={styles.errorContainer}>
            <Icon name="error-outline" size={64} color="#EF4444" />
            <Text style={styles.errorTitle}>Couldn’t load your job postings</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Modern Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>My Job Postings</Text>
              <Text style={styles.headerSubtitle}>
                {jobPostings.length} jobs • {jobPostings.reduce((sum, job) => sum + (job.applicationsCount || 0), 0)} applications
              </Text>
            </View>
            {/* Spacer for center alignment */}
            <View style={{ width: 40 }} />
          </View>
          
          {/* Status Filter Tabs */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
          >
            {(['all', 'active', 'paused', 'closed'] as const).map((status) => {
              const isSelected = selectedStatus === status;
              const count = statusCounts[status];
              
              return (
                <TouchableOpacity
                  key={status}
                  onPress={() => setSelectedStatus(status)}
                  style={[
                    styles.filterTab,
                    isSelected ? styles.filterTabActive : styles.filterTabInactive
                  ]}
                >
                  <Text style={[
                    styles.filterTabText,
                    isSelected ? styles.filterTabTextActive : styles.filterTabTextInactive
                  ]}>
                    {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Job Postings List */}
        <FlatList
          data={filteredJobPostings}
          renderItem={renderJobCard}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#059669']}
              tintColor="#059669"
              title="Pull to refresh"
              titleColor="#6B7280"
            />
          }
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: Math.max(insets.bottom, 16) + 80 }
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Icon name="work-outline" size={80} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>
                {selectedStatus === 'all' ? 'No Job Postings Yet' : `No ${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Jobs`}
              </Text>
              <Text style={styles.emptyMessage}>
                {selectedStatus === 'all' 
                  ? 'Create your first job posting to start finding the perfect candidates for your business!'
                  : `You don't have any ${selectedStatus} job postings at the moment.`
                }
              </Text>
              {selectedStatus === 'all' && (
                <TouchableOpacity onPress={() => navigation.navigate('PostJob')} style={styles.emptyActionButton}>
                  <Icon name="add" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.emptyActionText}>Post Your First Job</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />

        {/* Floating Action Button */}
        <FloatingActionButton 
          onPress={() => navigation.navigate('PostJob')} 
          accessibilityLabel="Create new job posting"
          accessibilityRole="button"
          bottomInset={insets.bottom}
        />
      </SafeAreaView>
    </View>
  );
}
const styles = StyleSheet.create({
  // Base container
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header styles
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: '#64748B',
    fontWeight: '500',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Filter tabs
  filterContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 24,
    marginRight: spacing.sm,
  },
  filterTabActive: {
    backgroundColor: '#059669',
  },
  filterTabInactive: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  filterTabTextInactive: {
    color: '#475569',
  },
  
  // List container
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  
  // Job Card Styles
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...getCrossPlatformShadow({
      height: 2,
      radius: 8,
      opacity: 0.1,
      elevation: 3,
    }),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  
  // Job Header
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  jobTitleContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  jobTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: spacing.xs,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  companyName: {
    fontSize: fontSize.sm,
    color: '#475569',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  
  // Job Meta Info
  jobMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    marginRight: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: '#475569',
    fontWeight: '500',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  
  // Salary
  salaryContainer: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  salaryText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: '#059669',
  },
  salaryPeriod: {
    fontSize: fontSize.sm,
    color: '#047857',
  },
  
  // Job Stats
  jobStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    fontSize: fontSize.xs,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 6,
  },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    justifyContent: 'center',
  },
  primaryAction: {
    backgroundColor: '#059669',
    flex: 1,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginLeft: 6,
  },
  secondaryAction: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flex: 1,
  },
  secondaryActionText: {
    color: '#475569',
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginLeft: 6,
  },
  tertiaryAction: {
    backgroundColor: '#F8FAFC',
    width: 44,
  },
  moreActionsContainer: {
    alignItems: 'flex-end',
  },
  
  // Loading Skeleton
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  skeletonMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  skeletonActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skeletonBox: {
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    opacity: 0.6,
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: fontSize.base,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  emptyActionButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    ...getCrossPlatformShadow({
      height: 4,
      radius: 8,
      opacity: 0.15,
      elevation: 4,
    }),
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  
  // Error State
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: fontSize.base,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  
  // Floating Action Button
  fab: {
    position: 'absolute',
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    ...getCrossPlatformShadow({
      height: 8,
      radius: 16,
      opacity: 0.25,
      elevation: 8,
    }),
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

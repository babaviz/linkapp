import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { JobsStackParamList } from '../../navigation/JobsStackNavigator';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  getJobById,
  removeJobFromAllLists,
  updateJob,
} from '../../redux/slices/jobSlice';
import { RelatedItemsSection } from '../../components/common/RelatedItemsSection';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { relatedCategoryRecommendationService, RelatedItem } from '../../services/relatedCategoryRecommendationService';
import { jobService } from '../../services/jobService';

type JobDetailsRouteProp = RouteProp<JobsStackParamList, 'JobDetails'>;
type JobDetailsNavigationProp = StackNavigationProp<JobsStackParamList, 'JobDetails'>;

const JobDetailsScreen = React.memo(function JobDetailsScreen() {
  const navigation = useNavigation<JobDetailsNavigationProp>();
  const route = useRoute<JobDetailsRouteProp>();
  const { jobId } = route.params;
  const { handleBack } = useBackNavigation({ fallbackScreen: 'JobsMain' });
  const dispatch = useAppDispatch();

  const { currentJob, isLoading: isLoadingJob } = useAppSelector((state) => state.jobs);
  const { user } = useAppSelector((state) => state.auth);
  const { currentProfile } = useAppSelector((state) => state.user);
  const currentUserId = user?.id || currentProfile?.id || '';

  const [isSaved, setIsSaved] = useState(false);
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [isLoadingApplicationState, setIsLoadingApplicationState] = useState(false);
  const [relatedJobs, setRelatedJobs] = useState<RelatedItem[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    const promise = dispatch(getJobById(jobId));
    return () => {
      promise.abort?.();
    };
  }, [dispatch, jobId]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
      headerTitle: '',
      header: () => null,
    });
  }, [navigation]);

  const listing = useMemo(() => {
    if (!currentJob || currentJob.id !== jobId) {
      return null;
    }
    return currentJob;
  }, [currentJob, jobId]);

  const listingOwnerId = useMemo(() => {
    const id = typeof listing?.employerId === 'string' ? listing.employerId.trim() : '';
    return id;
  }, [listing?.employerId]);

  const isOwner = Boolean(currentUserId && listingOwnerId && currentUserId === listingOwnerId);
  const listingStatus = listing?.status || 'active';
  const isListingActive = listingStatus === 'active';
  const isListingClosed = listingStatus === 'closed';

  const isExpired = useMemo(() => {
    const deadline = listing?.applicationDeadline;
    if (!deadline) return false;
    const ts = new Date(deadline).getTime();
    if (!Number.isFinite(ts)) return false;
    return ts < Date.now();
  }, [listing?.applicationDeadline]);

  const blockedUserIds = useMemo(
    () =>
      Array.isArray((listing as any)?.blockedUserIds)
        ? ((listing as any).blockedUserIds as string[])
        : [],
    [listing]
  );
  const blockedByUserIds = useMemo(
    () =>
      Array.isArray((listing as any)?.blockedByUserIds)
        ? ((listing as any).blockedByUserIds as string[])
        : [],
    [listing]
  );
  const isBlockedForCurrentUser = Boolean(
    currentUserId &&
      (blockedUserIds.includes(currentUserId) ||
        blockedByUserIds.includes(currentUserId) ||
        (listing as any)?.isBlockedForViewer === true)
  );

  const canApply = Boolean(
    !isOwner &&
      currentUserId &&
      isListingActive &&
      !isExpired &&
      !isBlockedForCurrentUser &&
      !hasApplied
  );
  const canChatWithEmployer = Boolean(
    !isOwner &&
      currentUserId &&
      listingOwnerId &&
      currentUserId !== listingOwnerId &&
      isListingActive &&
      !isBlockedForCurrentUser
  );

  const jobView = useMemo(() => {
    if (!listing) return null;
    const company = listing.employer?.company || listing.employer?.name || 'Company';
    const salary = listing.salary
      ? `KSh ${listing.salary.min?.toLocaleString()}${
          listing.salary.max && listing.salary.max !== listing.salary.min
            ? ` - ${listing.salary.max.toLocaleString()}`
            : ''
        }`
      : 'Negotiable';

    return {
      id: listing.id,
      title: listing.title || 'Job Posting',
      company,
      category: listing.category || 'General',
      description: listing.description || '',
      salary,
      salaryUnit: listing.salary?.period || 'month',
      jobType: listing.job_type || 'full_time',
      experienceLevel: listing.experience_level || 'entry',
      location: listing.location?.town || listing.location?.county || 'Kenya',
      remote: listing.location?.remote ? 'Remote' : listing.location?.onsite ? 'Onsite' : 'Hybrid',
      verified: listing.employer?.verified || false,
      postedDate: listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : 'Recently',
      applicationDeadline: listing.applicationDeadline
        ? `Deadline: ${new Date(listing.applicationDeadline).toLocaleDateString()}`
        : '',
      skills: listing.requirements?.map((r) => r.skill || '').filter(Boolean) || [],
    };
  }, [listing]);

  useEffect(() => {
    const loadRelatedJobs = async () => {
      if (!listing) return;
      setIsLoadingRelated(true);
      try {
        const related = await relatedCategoryRecommendationService.getRelatedJobs(
          listing,
          currentProfile?.id,
          { limit: 6, includePopular: true }
        );
        setRelatedJobs(related);
      } catch (_error) {
        setRelatedJobs([]);
      } finally {
        setIsLoadingRelated(false);
      }
    };

    loadRelatedJobs();
  }, [listing, currentProfile?.id]);

  useEffect(() => {
    const resolveApplicationState = async () => {
      if (!listing || !currentUserId || isOwner) return;
      setIsLoadingApplicationState(true);
      try {
        const result = await jobService.hasUserAppliedToJob(listing.id, currentUserId);
        setHasApplied(result.hasApplied);
      } catch {
        setHasApplied(false);
      } finally {
        setIsLoadingApplicationState(false);
      }
    };

    resolveApplicationState();
  }, [listing, currentUserId, isOwner]);

  const handleRelatedJobPress = (item: RelatedItem) => {
    if (currentProfile?.id) {
      relatedCategoryRecommendationService.recordRecommendationClick(currentProfile.id, item);
    }
    navigation.push('JobDetails', { jobId: item.id });
  };

  const handleApplyNow = async () => {
    if (!listing) return;
    if (!currentUserId) {
      Alert.alert('Sign In Required', 'Please sign in to apply for jobs.');
      return;
    }
    if (isOwner) {
      Alert.alert('Unavailable', 'You cannot apply to your own job listing.');
      return;
    }
    if (!isListingActive || isListingClosed) {
      Alert.alert('Applications Closed', 'This job listing is no longer accepting applications.');
      return;
    }
    if (isExpired) {
      Alert.alert('Expired Listing', 'The application deadline for this listing has passed.');
      return;
    }
    if (isBlockedForCurrentUser) {
      Alert.alert('Unavailable', 'You cannot apply to this listing at the moment.');
      return;
    }

    setIsSubmittingApplication(true);
    try {
      await jobService.applyToJob(listing.id, {
        applicantId: currentUserId,
        applicantName: user?.fullName || 'Applicant',
        applicantEmail: user?.email || '',
        applicantPhone: user?.phoneNumber || '',
        coverLetter: '',
      });
      setHasApplied(true);
      Alert.alert('Application Submitted', 'Your application has been sent successfully.');
    } catch (error: any) {
      const message = typeof error?.message === 'string' ? error.message : 'Could not submit application.';
      Alert.alert('Application Failed', message);
    } finally {
      setIsSubmittingApplication(false);
    }
  };

  const handleChatWithEmployer = () => {
    if (!listing || !jobView) return;
    if (!currentUserId) {
      Alert.alert('Sign In Required', 'Please sign in to start a chat.');
      return;
    }
    if (!listingOwnerId) {
      Alert.alert('Chat Unavailable', 'Employer information is not available for this job.');
      return;
    }
    if (currentUserId === listingOwnerId || isOwner) {
      Alert.alert('Unavailable', 'You cannot start a chat with yourself.');
      return;
    }
    if (!canChatWithEmployer) {
      const reason = !isListingActive
        ? 'This job listing is not active right now.'
        : isBlockedForCurrentUser
          ? 'You cannot message this employer at the moment.'
          : 'Chat is unavailable for this listing.';
      Alert.alert('Chat Unavailable', reason);
      return;
    }

    navigation.navigate('JobChat', {
      job: {
        id: listing.id,
        title: listing.title || 'Job Posting',
        company: jobView.company,
        employer_id: listingOwnerId,
        employer_name: listing.employer?.name,
      },
      recipientId: listingOwnerId,
      recipientName: listing.employer?.name || jobView.company,
    });
  };

  const handleEditJob = () => {
    if (!listing) return;
    navigation.navigate('EditJob', { jobId: listing.id });
  };

  const handleViewApplications = () => {
    if (!listing) return;
    navigation.navigate('JobApplications', { jobId: listing.id });
  };

  const handleToggleStatus = async () => {
    if (!listing || !isOwner) return;
    const nextStatus = listing.status === 'active' ? 'closed' : 'active';

    try {
      await dispatch(updateJob({ id: listing.id, updates: { status: nextStatus } })).unwrap();
      Alert.alert(
        'Listing Updated',
        nextStatus === 'active'
          ? 'Your job listing is now active and visible to seekers.'
          : 'Your job listing is now closed and hidden from seekers.'
      );
    } catch {
      Alert.alert('Update Failed', 'Unable to update job status. Please try again.');
    }
  };

  const handleDeleteJob = () => {
    if (!listing || !isOwner) return;
    Alert.alert('Delete Job', 'This action cannot be undone. Delete this job listing?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await jobService.deleteJob(listing.id);
            dispatch(removeJobFromAllLists(listing.id) as any);
            Alert.alert('Deleted', 'The job listing has been deleted.');
            handleBack();
          } catch {
            Alert.alert('Delete Failed', 'Unable to delete this job listing. Please try again.');
          }
        },
      },
    ]);
  };

  if (isLoadingJob && !jobView) {
    return (
      <View style={{ flex: 1, backgroundColor: '#047857' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ fontSize: 18, color: '#FFFFFF', fontWeight: '700' }}>Loading job details...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!jobView) {
    return (
      <View style={{ flex: 1, backgroundColor: '#047857' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <TouchableOpacity
              onPress={handleBack}
              style={{
                position: 'absolute',
                top: 20,
                left: 20,
                backgroundColor: 'rgba(255,255,255,0.2)',
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' }}>
              Job Not Found
            </Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 8 }}>
              The job you are looking for is no longer available.
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{ paddingBottom: 130 }}
          >
            <View style={{ backgroundColor: '#047857', paddingBottom: 24 }}>
              <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
                <TouchableOpacity
                  onPress={handleBack}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                  }}
                >
                  <Icon name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800' }}>{jobView.title}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: 16, marginTop: 4 }}>{jobView.company}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13, marginTop: 2 }}>{jobView.category}</Text>

                <View style={{ flexDirection: 'row', marginTop: 12, flexWrap: 'wrap' }}>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginRight: 8, marginBottom: 8 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 12 }}>{jobView.jobType}</Text>
                  </View>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginRight: 8, marginBottom: 8 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 12 }}>{jobView.experienceLevel}</Text>
                  </View>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginBottom: 8 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 12 }}>{jobView.remote}</Text>
                  </View>
                </View>

                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>Posted {jobView.postedDate}</Text>
                {jobView.applicationDeadline ? (
                  <Text style={{ color: '#FECACA', fontSize: 13, marginTop: 4 }}>{jobView.applicationDeadline}</Text>
                ) : null}
              </View>
            </View>

            <View style={{ padding: 20 }}>
              {(isOwner || !isListingActive || isExpired || isBlockedForCurrentUser) && (
                <View
                  style={{
                    backgroundColor: '#FFF7ED',
                    borderColor: '#FED7AA',
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ color: '#9A3412', fontSize: 13 }}>
                    {isOwner
                      ? 'Owner view: seeker actions are hidden for your own listing.'
                      : isBlockedForCurrentUser
                        ? 'You cannot interact with this listing at the moment.'
                        : isExpired
                          ? 'This listing has passed its application deadline.'
                          : 'This listing is currently closed.'}
                  </Text>
                </View>
              )}

              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 15,
                  padding: 20,
                  marginBottom: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Text style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Salary Range</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#047857' }}>{jobView.salary}</Text>
                <Text style={{ fontSize: 12, color: '#666' }}>/ {jobView.salaryUnit}</Text>
              </View>

              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 15,
                  padding: 20,
                  marginBottom: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 12 }}>Job Description</Text>
                <Text style={{ fontSize: 14, color: '#333', lineHeight: 22 }}>{jobView.description}</Text>
              </View>

              {jobView.skills.length > 0 && (
                <View
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 15,
                    padding: 20,
                    marginBottom: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 12 }}>Required Skills</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {jobView.skills.map((skill, index) => (
                      <View
                        key={`${skill}-${index}`}
                        style={{
                          backgroundColor: '#ECFDF5',
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 14,
                          marginRight: 8,
                          marginBottom: 8,
                          borderWidth: 1,
                          borderColor: '#A7F3D0',
                        }}
                      >
                        <Text style={{ fontSize: 12, color: '#047857', fontWeight: '600' }}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <RelatedItemsSection
                items={relatedJobs}
                title="Similar Jobs"
                isLoading={isLoadingRelated}
                onItemPress={handleRelatedJobPress}
                emptyMessage="No similar jobs found"
              />
            </View>
          </ScrollView>

          {isOwner ? (
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 16,
                borderTopWidth: 1,
                borderTopColor: '#E5E7EB',
              }}
            >
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <TouchableOpacity
                  onPress={handleEditJob}
                  style={{ flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 20, alignItems: 'center', marginRight: 8 }}
                >
                  <Text style={{ color: '#047857', fontSize: 14, fontWeight: '700' }}>Edit Job</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleViewApplications}
                  style={{ flex: 1, backgroundColor: '#047857', paddingVertical: 12, borderRadius: 20, alignItems: 'center' }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>View Applicants</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  onPress={handleToggleStatus}
                  style={{ flex: 1, backgroundColor: '#EFF6FF', paddingVertical: 10, borderRadius: 16, alignItems: 'center', marginRight: 8 }}
                >
                  <Text style={{ color: '#1D4ED8', fontSize: 13, fontWeight: '700' }}>
                    {isListingActive ? 'Close Job' : 'Reopen Job'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeleteJob}
                  style={{ flex: 1, backgroundColor: '#FEE2E2', paddingVertical: 10, borderRadius: 16, alignItems: 'center' }}
                >
                  <Text style={{ color: '#B91C1C', fontSize: 13, fontWeight: '700' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderTopWidth: 1,
                borderTopColor: '#E5E7EB',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => setIsSaved((prev) => !prev)}
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 23,
                    backgroundColor: isSaved ? '#FEE2E2' : '#F3F4F6',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                  }}
                >
                  <Icon name={isSaved ? 'favorite' : 'favorite-border'} size={22} color={isSaved ? '#EF4444' : '#6B7280'} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleChatWithEmployer}
                  disabled={!canChatWithEmployer}
                  style={{
                    backgroundColor: canChatWithEmployer ? '#E0E7FF' : '#F3F4F6',
                    paddingHorizontal: 14,
                    height: 46,
                    borderRadius: 23,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 8,
                  }}
                >
                  <Icon name="chat-bubble-outline" size={18} color={canChatWithEmployer ? '#3730A3' : '#9CA3AF'} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleApplyNow}
                  disabled={!canApply || isSubmittingApplication || isLoadingApplicationState}
                  style={{
                    flex: 1,
                    backgroundColor: canApply ? '#047857' : '#9CA3AF',
                    paddingVertical: 12,
                    borderRadius: 23,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                    {isSubmittingApplication
                      ? 'Submitting...'
                      : hasApplied
                        ? 'Applied'
                        : isExpired
                          ? 'Expired'
                          : isListingClosed
                            ? 'Closed'
                            : 'Apply'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
});

export default JobDetailsScreen;

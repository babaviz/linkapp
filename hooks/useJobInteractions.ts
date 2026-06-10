import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { getUserFacingError } from '../utils/userFacingError';
import { useAppSelector } from '../redux/hooks';
import { jobService } from '../services/jobService';

interface JobInteractionState {
  savedJobs: Set<string>;
  appliedJobs: Set<string>;
  isLoading: boolean;
}

interface UseJobInteractionsReturn {
  savedJobs: Set<string>;
  appliedJobs: Set<string>;
  isLoading: boolean;
  handleApply: (jobId: string) => Promise<void>;
  handleSave: (jobId: string) => Promise<void>;
  handleViewDetails: (jobId: string) => Promise<void>;
  isSaved: (jobId: string) => boolean;
  isApplied: (jobId: string) => boolean;
}

export function useJobInteractions(): UseJobInteractionsReturn {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { user } = useAppSelector(state => state.auth);
  const [state, setState] = useState<JobInteractionState>({
    savedJobs: new Set(),
    appliedJobs: new Set(),
    isLoading: false,
  });

  const handleApply = useCallback(async (jobId: string) => {
    if (state.appliedJobs.has(jobId)) {
      Alert.alert('Already Applied', 'You have already applied to this job.');
      return;
    }
    if (!user?.id) {
      const friendly = getUserFacingError(new Error('Not authenticated'), {
        action: 'submit your application',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const job = await jobService.getJobById(jobId);
      if (job?.employerId && job.employerId === user.id) {
        Alert.alert('Unavailable', 'You cannot apply to your own job listing.');
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }
      if (job?.status && job.status !== 'active') {
        Alert.alert('Applications Closed', 'This job listing is no longer accepting applications.');
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      await jobService.applyToJob(jobId, {
        applicantId: user.id,
        applicantName: user.fullName || 'Applicant',
        applicantEmail: user.email || '',
        applicantPhone: user.phoneNumber || '',
        coverLetter: '',
      });
      
      setState(prev => ({
        ...prev,
        appliedJobs: new Set([...prev.appliedJobs, jobId]),
        isLoading: false,
      }));

      Alert.alert(
        'Application Submitted!', 
        'Your application has been submitted successfully. The employer will review it and get back to you.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      const friendly = getUserFacingError(error, {
        action: 'submit your application',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  }, [state.appliedJobs, user]);

  const handleSave = useCallback(async (jobId: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setState(prev => {
        const newSavedJobs = new Set(prev.savedJobs);
        if (newSavedJobs.has(jobId)) {
          newSavedJobs.delete(jobId);
        } else {
          newSavedJobs.add(jobId);
        }
        
        return {
          ...prev,
          savedJobs: newSavedJobs,
          isLoading: false,
        };
      });

      const action = state.savedJobs.has(jobId) ? 'removed from' : 'saved to';
      Alert.alert(
        'Success', 
        `Job ${action} your saved jobs.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      const friendly = getUserFacingError(error, {
        action: 'save this job',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  }, [state.savedJobs]);

  const handleViewDetails = useCallback(async (jobId: string) => {
    try {
      navigation.navigate('JobDetails', { jobId });
    } catch (error) {
      const friendly = getUserFacingError(error, {
        action: 'open job details',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  }, [navigation]);

  const isSaved = useCallback((jobId: string) => {
    return state.savedJobs.has(jobId);
  }, [state.savedJobs]);

  const isApplied = useCallback((jobId: string) => {
    return state.appliedJobs.has(jobId);
  }, [state.appliedJobs]);

  return {
    savedJobs: state.savedJobs,
    appliedJobs: state.appliedJobs,
    isLoading: state.isLoading,
    handleApply,
    handleSave,
    handleViewDetails,
    isSaved,
    isApplied,
  };
}

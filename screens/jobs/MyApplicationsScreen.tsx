/**
 * MyApplicationsScreen - Job Applications Management
 * Task 14: Job seeker's application management
 * Material 3 compliant design for tracking job applications
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, RefreshControl, StatusBar , StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { JobApplication, JobPosting } from '../../types/job';
import { JobsNavigationProp } from '../../types/navigation';
import { jobService } from '../../services/jobService';
import { useAppSelector } from '../../redux/hooks';
import { 
  spacing,
  fontSize
} from '../../utils/responsive';
import { navigateToMainTab } from '../../navigation/mainTabNavigation';

export default function MyApplicationsScreen() {
  const navigation = useNavigation<JobsNavigationProp>();
  const { user } = useAppSelector(state => state.auth);
  
  const [applications, setApplications] = useState<(JobApplication & { job: JobPosting })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'reviewing' | 'accepted' | 'rejected'>('all');


  const loadMyApplications = useCallback(async () => {
    if (!user?.id) {
      setError('Please log in to view your applications.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await jobService.getMyApplications(user.id);
      setApplications(response || []);
    } catch {
      setError('Failed to load your applications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadMyApplications();
  }, [loadMyApplications]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMyApplications();
    setRefreshing(false);
  };

  const getStatusColor = (status: JobApplication['status']) => {
    switch (status) {
      case 'pending': return { bg: '#FEF3C7', text: '#D97706', border: '#FBBF24' };
      case 'reviewing': return { bg: '#DBEAFE', text: '#2563EB', border: '#60A5FA' };
      case 'shortlisted': return { bg: '#E0E7FF', text: '#6366F1', border: '#A5B4FC' };
      case 'interviewed': return { bg: '#FCE7F3', text: '#DB2777', border: '#F9A8D4' };
      case 'accepted': return { bg: '#D1FAE5', text: '#059669', border: '#34D399' };
      case 'rejected': return { bg: '#FEE2E2', text: '#DC2626', border: '#F87171' };
      default: return { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' };
    }
  };

  const filteredApplications = applications.filter(app => 
    selectedStatus === 'all' || app.status === selectedStatus
  );

  const statusCounts = {
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    reviewing: applications.filter(a => a.status === 'reviewing').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const handleViewJob = (jobId: string) => {
    navigation.navigate('JobDetails', { jobId });
  };

  const renderApplicationCard = ({ item: application }: { item: typeof applications[0] }) => {
    const statusStyle = getStatusColor(application.status);
    const salary = application.job.salary;
    const salaryDisplay = salary
      ? `KSH ${salary.min.toLocaleString()} - ${salary.max.toLocaleString()}/${salary.period}`
      : 'Salary not specified';
    
    return (
      <TouchableOpacity 
        style={[styles.style1, { padding: spacing.lg }]}
        onPress={() => handleViewJob(application.jobId)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.style2}>
          <View style={styles.style3}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827', marginBottom: 4 }}>
              {application.job.title}
            </Text>
            <View style={styles.style4}>
              <View 
                style={[styles.style5, { width: 8, height: 8, marginRight: spacing.xs, backgroundColor: '#10B981' }]} 
              />
              <Text style={{ fontSize: fontSize.sm, color: '#059669', fontWeight: '600' }}>
                {application.job.employer.company || application.job.employer.name}
              </Text>
              {application.job.employer.verified && (
                <View style={[styles.style6, { paddingHorizontal: spacing.xs, paddingVertical: 2 }]}>
                  <MaterialIcons name="check" size={fontSize.xs} color="#15803d" />
                </View>
              )}
            </View>
          </View>
          <View 
            style={[
              styles.style7,
              { 
                backgroundColor: statusStyle.bg,
                borderColor: statusStyle.border,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs
              }
            ]}
          >
            <Text style={{ 
              color: statusStyle.text,
              fontSize: fontSize.xs,
              fontWeight: '600',
              textTransform: 'capitalize'
            }}>
              {application.status}
            </Text>
          </View>
        </View>

        {/* Job Details */}
        <View style={[styles.style8, { gap: spacing.xs }]}>
          <View style={[styles.style9, { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }]}>
            <Text style={{ color: '#1d4ed8', fontSize: fontSize.xs, fontWeight: '500' }}>
              {application.job.location.town}, {application.job.location.county}
            </Text>
          </View>
          <View style={[styles.style10, { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }]}>
            <Text style={{ color: '#7c3aed', fontSize: fontSize.xs, fontWeight: '500', textTransform: 'capitalize' }}>
              {application.job.job_type.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* Salary */}
        <View style={[styles.style11, { padding: spacing.sm }]}>
          <Text style={{ fontSize: fontSize.sm, fontWeight: 'bold', color: '#059669' }}>
            {salaryDisplay}
          </Text>
        </View>

        {/* Application Info */}
        <View style={styles.style12}>
          <View style={styles.style13}>
            <Text style={{ fontSize: fontSize.sm, color: '#6B7280' }}>Applied:</Text>
            <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: '#111827' }}>
              {new Date(application.appliedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.style17}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.style18}>
          <Text style={{ fontSize: fontSize.lg, color: '#6B7280' }}>Loading your applications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.style17}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.style18}>
          <Text style={{ fontSize: fontSize.lg, color: '#DC2626', textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity
            onPress={loadMyApplications}
            style={{
              backgroundColor: '#10B981',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
              marginTop: 16
            }}
          >
            <Text style={{ color: 'white', fontSize: fontSize.base, fontWeight: '600' }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.style17}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      {/* Header */}
      <View style={[styles.style19, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
        <View style={styles.style20}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.style21}
          >
            <MaterialIcons name="arrow-back" size={fontSize.lg} color="#1F2937" />
          </TouchableOpacity>
          <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827' }}>
            My Applications
          </Text>
          <View style={{ width: 40 }} />
        </View>
        
        {/* Stats */}
        <View style={[styles.style22, { padding: spacing.sm }]}>
          <Text style={{ fontSize: fontSize.sm, color: '#6B7280', textAlign: 'center' }}>
            {applications.length} job applications submitted
          </Text>
        </View>
      </View>

      {/* Status Filter */}
      <View style={[styles.style19, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          <View style={[styles.style23, { gap: spacing.sm }]}>
            {(['all', 'pending', 'reviewing', 'accepted', 'rejected'] as const).map((status) => {
              const isSelected = selectedStatus === status;
              const count = statusCounts[status];
              
              return (
                <TouchableOpacity
                  key={status}
                  onPress={() => setSelectedStatus(status)}
                  style={[
                    styles.statusFilterButton,
                    {
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      backgroundColor: isSelected ? '#10B981' : '#FFFFFF',
                      borderColor: isSelected ? '#10B981' : '#D1D5DB'
                    }
                  ]}
                >
                  <Text style={{
                    fontSize: fontSize.sm,
                    fontWeight: '500',
                    textTransform: 'capitalize',
                    color: isSelected ? 'white' : '#374151'
                  }}>
                    {status} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Applications List */}
      <FlatList
        data={filteredApplications}
        renderItem={renderApplicationCard}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#10B981']}
            tintColor="#10B981"
          />
        }
        contentContainerStyle={{ 
          padding: spacing.lg,
          paddingBottom: spacing.xl 
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.style24}>
            <Text style={{ fontSize: fontSize.xl, marginBottom: spacing.md }}>📄</Text>
            <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827', marginBottom: spacing.sm }}>
              No Applications
            </Text>
            <Text style={{ fontSize: fontSize.base, color: '#6B7280', textAlign: 'center', marginBottom: spacing.lg }}>
              {selectedStatus === 'all' 
                ? 'You haven\'t applied to any jobs yet. Start browsing and apply to jobs that interest you!'
                : `No ${selectedStatus} applications found.`
              }
            </Text>
            <TouchableOpacity
              onPress={() => navigateToMainTab(navigation, 'JobsMain')}
              style={styles.style25}
            >
              <Text style={{ color: 'white', fontSize: fontSize.base, fontWeight: '600' }}>
                Browse Jobs
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  style1: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 16,
  },
  style2: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  style3: {
    flex: 1,
  },
  style4: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  style5: {
    borderRadius: 9999,
  },
  style6: {
    backgroundColor: '#DCFCE7',
    borderRadius: 9999,
    marginLeft: 8,
  },
  style7: {
    borderRadius: 9999,
    borderWidth: 1,
  },
  style8: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  style9: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 9999,
  },
  style10: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#DDD8FE',
    borderRadius: 9999,
  },
  style11: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    marginBottom: 12,
  },
  style12: {
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
    paddingTop: 12,
  },
  style13: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  style17: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  style18: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  style19: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  style20: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  style21: {
    borderRadius: 9999,
    backgroundColor: '#F3F4F6',
    padding: 8,
  },
  style22: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  style23: {
    flexDirection: 'row',
  },
  style24: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  style25: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#10B981',
  },
  statusFilterButton: {
    borderRadius: 9999,
    borderWidth: 1,
  },
});

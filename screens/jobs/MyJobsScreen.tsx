/**
 * MyJobsScreen - Job Management Dashboard
 * Task 14: Job management section for employers
 * Material 3 compliant design with job posting management
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  Modal
, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { JobPosting, JobStatus } from '../../types/job';
import { Material3Card } from '../../components/common';
import { getUserFacingError } from '../../utils/userFacingError';

type MyJobsScreenNavigationProp = StackNavigationProp<any, 'MyJobs'>;

interface JobStatsCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  subtitle?: string;
}

const JobStatsCard: React.FC<JobStatsCardProps> = ({ 
  title, 
  value, 
  icon, 
  color, 
  subtitle 
}) => (
  <Material3Card elevation={2} style={styles.statsCard}>
    <View style={styles.style2}>
      <Text style={styles.style3}>{icon}</Text>
      <View style={styles.style4}>
        <Text style={[styles.statsValue, { color }]}>{value}</Text>
        <Text style={styles.style5}>{title}</Text>
        {subtitle && (
          <Text style={styles.style6}>{subtitle}</Text>
        )}
      </View>
    </View>
  </Material3Card>
);

interface JobManagementItemProps {
  job: JobPosting;
  onEdit: () => void;
  onStatusChange: () => void;
  onDelete: () => void;
  onViewApplications: () => void;
}

const JobManagementItem: React.FC<JobManagementItemProps> = ({
  job,
  onEdit,
  onStatusChange,
  onDelete,
  onViewApplications
}) => {
  const getStatusTextStyle = (status?: JobStatus) => {
    switch (status) {
      case 'active': return { color: '#16A34A' };
      case 'closed': return { color: '#6B7280' };
      case 'paused': return { color: '#D97706' };
      case 'draft': return { color: '#9CA3AF' };
      default: return { color: '#6B7280' };
    }
  };

  const getStatusBgStyle = (status?: JobStatus) => {
    switch (status) {
      case 'active': return { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' };
      case 'closed': return { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' };
      case 'paused': return { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' };
      case 'draft': return { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' };
      default: return { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' };
    }
  };

  const formatSalary = (salary: any) => {
    if (!salary || !salary.min) return 'Salary TBD';
    const { min, max, currency = 'KSH', period } = salary;
    const range = max && max !== min ? `${min.toLocaleString()} - ${max.toLocaleString()}` : min.toLocaleString();
    return `${currency} ${range}/${period}`;
  };

  return (
    <Material3Card elevation={2} style={styles.style7}>
      {/* Job Header */}
      <View style={styles.style8}>
        <View style={styles.style9}>
          <Text style={styles.style10}>
            {job.title}
          </Text>
          <Text style={styles.style11}>
            {formatSalary(job.salary)}
          </Text>
          <Text style={styles.style12}>
            {job.location.town}, {job.location.county}
          </Text>
        </View>
        <View style={[styles.statusBadge, getStatusBgStyle(job.status)]}>
          <Text style={[styles.statusText, getStatusTextStyle(job.status)]}>
            {job.status || 'draft'}
          </Text>
        </View>
      </View>

      {/* Job Stats */}
      <View style={styles.style13}>
        <View style={styles.style14}>
          <Text style={styles.style15}>📅</Text>
          <Text style={styles.style16}>
            Posted {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recently'}
          </Text>
        </View>
        <View style={styles.style14}>
          <Text style={styles.style15}>📋</Text>
          <Text style={styles.style16}>
            {job.applicationsCount || 0} applications
          </Text>
        </View>
        <View style={styles.style17}>
          <Text style={styles.style15}>💼</Text>
          <Text style={styles.style18}>
            {job.job_type || 'Full Time'}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.style19}>
        <TouchableOpacity
          onPress={onViewApplications}
          style={styles.style20}
        >
          <Text style={styles.style21}>📋 Applications</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={onEdit}
          style={styles.style22}
        >
          <Text style={styles.style21}>✏️ Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={onStatusChange}
          style={styles.style23}
        >
          <Text style={styles.style21}>🔄 Status</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={onDelete}
          style={styles.style24}
        >
          <Text style={styles.style21}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </Material3Card>
  );
};

export default function MyJobsScreen() {
  const navigation = useNavigation<MyJobsScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { userJobs = [], isLoading, error } = useAppSelector(state => state.jobs);

  const [refreshing, setRefreshing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);

  // Load data when screen focuses
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadDashboardData();
      }
    }, [user?.id])
  );

  const loadDashboardData = async () => {
    if (!user?.id) return;

    try {
      // TODO: Implement job fetching
      // dispatch(fetchUserJobs(user.id));
      // dispatch(fetchJobApplications(user.id));
    } catch (error) {
      
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleEditJob = (job: JobPosting) => {
    navigation.navigate('EditJob', { job });
  };

  const handleStatusChange = (job: JobPosting) => {
    setSelectedJob(job);
    setShowStatusModal(true);
  };

  const handleDeleteJob = (job: JobPosting) => {
    Alert.alert(
      'Delete Job',
      `Are you sure you want to delete "${job.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Implement job deletion
              Alert.alert('Success', 'Job deleted successfully.');
            } catch (error: any) {
              const friendly = getUserFacingError(error, {
                action: 'delete this job',
                displayStyle: 'alert',
              });
              Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
            }
          }
        }
      ]
    );
  };

  const handleViewApplications = (job: JobPosting) => {
    navigation.navigate('JobApplications', { jobId: job.id });
  };

  const updateJobStatus = async (newStatus: JobStatus) => {
    if (!selectedJob) return;

    try {
      // TODO: Implement status update
      setShowStatusModal(false);
      setSelectedJob(null);
      Alert.alert('Success', `Job status updated to ${newStatus}`);
    } catch (error: any) {
      const friendly = getUserFacingError(error, {
        action: 'update this job status',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  };

  const renderJob = ({ item }: { item: JobPosting }) => (
    <JobManagementItem
      job={item}
      onEdit={() => handleEditJob(item)}
      onStatusChange={() => handleStatusChange(item)}
      onDelete={() => handleDeleteJob(item)}
      onViewApplications={() => handleViewApplications(item)}
    />
  );

  // Calculate dashboard metrics
  const totalJobs = userJobs.length;
  const activeJobs = userJobs.filter(j => j.status === 'active').length;
  const closedJobs = userJobs.filter(j => j.status === 'closed').length;
  const pausedJobs = userJobs.filter(j => j.status === 'paused').length;
  const totalApplications = userJobs.reduce((sum, job) => sum + (job.applicationsCount || 0), 0);

  if (!user) {
    return (
      <SafeAreaView style={styles.style25}>
        <View style={styles.style26}>
          <Text style={styles.style27}>
            Please log in to manage your job postings
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.style25}>
      {/* Header */}
      <View style={styles.style28}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.style29}>
          <Text style={styles.style30}>←</Text>
        </TouchableOpacity>
        <View style={styles.style4}>
          <Text style={styles.style31}>💼 My Jobs</Text>
          <Text style={styles.style32}>Manage your job postings</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.style4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#059669']}
            tintColor="#059669"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats */}
        <View style={styles.style33}>
          <Text style={styles.style34}>Dashboard Overview</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.style35}>
            <JobStatsCard
              title="Total"
              value={totalJobs}
              icon="💼"
              color="#2563EB"
              subtitle="Job postings"
            />
            <JobStatsCard
              title="Active"
              value={activeJobs}
              icon="✅"
              color="#059669"
              subtitle="Currently hiring"
            />
            <JobStatsCard
              title="Closed"
              value={closedJobs}
              icon="🔒"
              color="#6B7280"
              subtitle="Positions closed"
            />
            <JobStatsCard
              title="Paused"
              value={pausedJobs}
              icon="⏸️"
              color="#D97706"
              subtitle="On hold"
            />
            <JobStatsCard
              title="Applications"
              value={totalApplications}
              icon="📋"
              color="#7C3AED"
              subtitle="Total received"
            />
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={styles.style36}>
          <Text style={styles.style34}>Quick Actions</Text>
          
          <View style={styles.style19}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('PostJob')}
              style={styles.style37}
            >
              <Text style={styles.style38}>+ Post New Job</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => navigation.navigate('JobApplications')}
              style={styles.style39}
            >
              <Text style={styles.style38}>📋 All Applications</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Error State */}
        {error && (
          <View style={styles.style40}>
            <Text style={styles.style41}>{error}</Text>
          </View>
        )}

        {/* Jobs List */}
        <View style={styles.style42}>
          <View style={styles.style43}>
            <Text style={styles.style44}>
              Your Job Postings ({userJobs.length})
            </Text>
            {userJobs.length > 0 && (
              <TouchableOpacity onPress={handleRefresh}>
                <Text style={styles.style45}>Refresh</Text>
              </TouchableOpacity>
            )}
          </View>

          {isLoading && userJobs.length === 0 ? (
            <Material3Card elevation={2} style={styles.style46}>
              <Text style={styles.style47}>Loading job postings...</Text>
              <Text style={styles.style48}>Please wait while we fetch your listings</Text>
            </Material3Card>
          ) : userJobs.length === 0 ? (
            <Material3Card elevation={2} style={styles.style46}>
              <Text style={styles.style49}>💼</Text>
              <Text style={styles.style50}>
                No Job Postings Yet
              </Text>
              <Text style={styles.style51}>
                Start hiring by posting your first job opportunity.
              </Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('PostJob')}
                style={styles.style52}
              >
                <Text style={styles.style53}>Post Your First Job</Text>
              </TouchableOpacity>
            </Material3Card>
          ) : (
            <FlatList
              data={userJobs}
              renderItem={renderJob}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Status Change Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.style54}>
          <Material3Card elevation={8} style={styles.style55}>
            <Text style={styles.style56}>
              Update Job Status
            </Text>
            
            {selectedJob && (
              <Text style={styles.style57}>
                {selectedJob.title}
              </Text>
            )}

            <View style={styles.style58}>
              <TouchableOpacity
                onPress={() => updateJobStatus('active')}
                style={styles.style59}
              >
                <Text style={styles.style38}>✅ Mark as Active</Text>
              </TouchableOpacity>
              
              
              <TouchableOpacity
                onPress={() => updateJobStatus('paused')}
                style={styles.style61}
              >
                <Text style={styles.style38}>⏸️ Pause Hiring</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => updateJobStatus('closed')}
                style={styles.style62}
              >
                <Text style={styles.style38}>🔒 Close Job</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  setShowStatusModal(false);
                  setSelectedJob(null);
                }}
                style={styles.style63}
              >
                <Text style={styles.style64}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Material3Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  style1: {
  'padding': 16,
  'marginRight': 12,
  'minWidth': 120
},
  style2: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'marginBottom': 8
},
  style3: {
  'fontSize': 24,
  'marginRight': 8
},
  style4: {
  'flex': 1
},
  style5: {
  'fontSize': 14,
  'fontWeight': '500',
  'color': '#4B5563'
},
  style6: {
  'fontSize': 12,
  'color': '#6B7280',
  'marginTop': 4
},
  style7: {
  'padding': 16,
  'marginBottom': 16
},
  style8: {
  'flexDirection': 'row',
  'alignItems': 'flex-start',
  'justifyContent': 'space-between',
  'marginBottom': 12
},
  style9: {
  'flex': 1,
  'marginRight': 12
},
  style10: {
  'fontSize': 18,
  'fontWeight': '600',
  'color': '#111827',
  'marginBottom': 4
},
  style11: {
  'fontSize': 16,
  'fontWeight': '500',
  'color': '#16A34A'
},
  style12: {
  'fontSize': 14,
  'color': '#4B5563',
  'marginTop': 4
},
  style13: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'marginBottom': 16
},
  style14: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'marginRight': 16
},
  style15: {
  'color': '#6B7280',
  'marginRight': 4
},
  style16: {
  'fontSize': 14,
  'color': '#4B5563'
},
  style17: {
  'flexDirection': 'row',
  'alignItems': 'center'
},
  style18: {
  'fontSize': 14,
  'color': '#4B5563'
},
  style19: {
  'flexDirection': 'row',
  'justifyContent': 'space-between'
},
  style20: {
  'backgroundColor': '#16A34A',
  'paddingHorizontal': 16,
  'paddingVertical': 8,
  'borderRadius': 8,
  'flex': 1,
  'marginRight': 8
},
  style21: {
  'color': '#FFFFFF',
  'fontWeight': '500',
  'textAlign': 'center'
},
  style22: {
  'backgroundColor': '#4B5563',
  'paddingHorizontal': 16,
  'paddingVertical': 8,
  'borderRadius': 8,
  'flex': 1,
  'marginRight': 8
},
  style23: {
  'backgroundColor': '#2563EB',
  'paddingHorizontal': 16,
  'paddingVertical': 8,
  'borderRadius': 8,
  'flex': 1,
  'marginRight': 8
},
  style24: {
  'backgroundColor': '#DC2626',
  'paddingHorizontal': 16,
  'paddingVertical': 8,
  'borderRadius': 8,
  'flex': 1
},
  statsCard: {
    padding: 16,
    marginRight: 12,
    minWidth: 120,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  style25: {
  'flex': 1,
  'backgroundColor': '#F9FAFB'
},
  style26: {
  'flex': 1,
  'justifyContent': 'center',
  'alignItems': 'center',
  'paddingHorizontal': 24
},
  style27: {
  'fontSize': 18,
  'color': '#4B5563',
  'marginBottom': 16,
  'textAlign': 'center'
},
  style28: {
  'backgroundColor': '#16A34A',
  'paddingHorizontal': 24,
  'paddingVertical': 16,
  'flexDirection': 'row',
  'alignItems': 'center'
},
  style29: {
  'marginRight': 16
},
  style30: {
  'color': '#FFFFFF',
  'fontSize': 18
},
  style31: {
  'fontSize': 24,
  'fontWeight': '700',
  'color': '#FFFFFF'
},
  style32: {
  'marginTop': 4
},
  style33: {
  'padding': 24
},
  style34: {
  'fontSize': 18,
  'fontWeight': '600',
  'color': '#1F2937',
  'marginBottom': 16
},
  style35: {
  'marginBottom': 24
},
  style36: {
  'paddingHorizontal': 24,
  'marginBottom': 24
},
  style37: {
  'backgroundColor': '#16A34A',
  'paddingHorizontal': 24,
  'paddingVertical': 16,
  'borderRadius': 8,
  'flex': 1,
  'marginRight': 8
},
  style38: {
  'color': '#FFFFFF',
  'fontWeight': '600',
  'textAlign': 'center'
},
  style39: {
  'backgroundColor': '#2563EB',
  'paddingHorizontal': 24,
  'paddingVertical': 16,
  'borderRadius': 8,
  'flex': 1,
  'marginLeft': 8
},
  style40: {
  'backgroundColor': '#FEF2F2',
  'borderWidth': 1,
  'borderColor': '#FECACA',
  'marginBottom': 16,
  'padding': 12,
  'borderRadius': 8
},
  style41: {
  'color': '#DC2626',
  'textAlign': 'center'
},
  style42: {
  'paddingHorizontal': 24
},
  style43: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'marginBottom': 16
},
  style44: {
  'fontSize': 18,
  'fontWeight': '600',
  'color': '#1F2937'
},
  style45: {
  'color': '#16A34A',
  'fontWeight': '500'
},
  style46: {
  'padding': 32,
  'alignItems': 'center'
},
  style47: {
  'color': '#6B7280',
  'fontSize': 18,
  'marginBottom': 8
},
  style48: {
  'color': '#9CA3AF',
  'fontSize': 14
},
  style49: {
  'marginBottom': 16
},
  style50: {
  'fontSize': 20,
  'fontWeight': '600',
  'color': '#1F2937',
  'marginBottom': 8,
  'textAlign': 'center'
},
  style51: {
  'color': '#4B5563',
  'textAlign': 'center',
  'marginBottom': 24
},
  style52: {
  'backgroundColor': '#16A34A',
  'paddingHorizontal': 24,
  'paddingVertical': 12,
  'borderRadius': 8
},
  style53: {
  'color': '#FFFFFF',
  'fontWeight': '600'
},
  style54: {
  'flex': 1,
  'backgroundColor': '#000000',
  'opacity': 0.5,
  'justifyContent': 'center',
  'alignItems': 'center',
  'paddingHorizontal': 24
},
  style55: {
  'padding': 24,
  'width': '100%',
  'maxWidth': 384
},
  style56: {
  'fontSize': 18,
  'fontWeight': '600',
  'color': '#111827',
  'marginBottom': 16,
  'textAlign': 'center'
},
  style57: {
  'fontSize': 14,
  'color': '#4B5563',
  'marginBottom': 24,
  'textAlign': 'center'
},
  style58: {
  'gap': 12
},
  style59: {
  'backgroundColor': '#16A34A',
  'paddingVertical': 12,
  'borderRadius': 8
},
  style60: {
  'backgroundColor': '#2563EB',
  'paddingVertical': 12,
  'borderRadius': 8
},
  style61: {
  'paddingVertical': 12,
  'borderRadius': 8
},
  style62: {
  'backgroundColor': '#4B5563',
  'paddingVertical': 12,
  'borderRadius': 8
},
  style63: {
  'backgroundColor': '#D1D5DB',
  'paddingVertical': 12,
  'borderRadius': 8,
  'marginTop': 16
},
  style64: {
  'color': '#374151',
  'fontWeight': '600',
  'textAlign': 'center'
},
});

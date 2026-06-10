import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, RefreshControl, StatusBar , StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { JobApplication } from '../../types/job';
import { jobService } from '../../services/jobService';
import { 
  getDynamicDimensions, 
  getResponsiveMargin, 
  getResponsivePadding, 
  spacing,
  fontSize
} from '../../utils/responsive';

type JobApplicationsRouteProp = RouteProp<{ params: { jobId: string } }, 'params'>;
type JobApplicationsNavigationProp = StackNavigationProp<any>;

export default function JobApplicationsScreen() {
  const route = useRoute<JobApplicationsRouteProp>();
  const navigation = useNavigation<JobApplicationsNavigationProp>();
  
  const { jobId } = route.params;
  const { width: screenWidth, isTablet } = getDynamicDimensions();
  
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'reviewing' | 'shortlisted' | 'interviewed' | 'accepted' | 'rejected'>('all');


  useEffect(() => {
    loadApplications();
  }, [jobId]);

  const loadApplications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await jobService.getJobApplications(jobId);
      setApplications(response || []);
    } catch (error) {
      console.error('Failed to load applications:', error);
      setError('Failed to load job applications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  };

  const updateApplicationStatus = async (applicationId: string, status: JobApplication['status']) => {
    try {
      await jobService.updateApplicationStatus(applicationId, status);
      setApplications(prev => 
        prev.map(app => 
          app.id === applicationId ? { ...app, status } : app
        )
      );
    } catch (error) {
      console.error('Failed to update application status:', error);
      alert('Failed to update application status. Please try again.');
    }
  };

  const getStatusColor = (status: JobApplication['status']) => {
    switch (status) {
      case 'pending': return { bg: '#FEF3C7', text: '#D97706', border: '#FBBF24' };
      case 'reviewing': return { bg: '#DBEAFE', text: '#2563EB', border: '#60A5FA' };
      case 'shortlisted': return { bg: '#E0E7FF', text: '#4F46E5', border: '#818CF8' };
      case 'interviewed': return { bg: '#FCE7F3', text: '#BE185D', border: '#F472B6' };
      case 'accepted': return { bg: '#D1FAE5', text: '#047857', border: '#34D399' };
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
    shortlisted: applications.filter(a => a.status === 'shortlisted').length,
    interviewed: applications.filter(a => a.status === 'interviewed').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const renderApplicationCard = ({ item: application }: { item: JobApplication }) => {
    const statusStyle = getStatusColor(application.status);
    
    return (
      <View style={[styles.style1, { padding: spacing.lg }]}>
        {/* Header */}
        <View style={styles.style2}>
          <View style={styles.style3}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827', marginBottom: 4 }}>
              {application.applicantName}
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: '#6B7280' }}>
              Applied {new Date(application.appliedAt).toLocaleDateString()}
            </Text>
          </View>
          <View 
            style={[
              styles.style4,
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

        {/* Skill Match */}
        {(application as any).matching_skills?.length > 0 && (
          <View style={styles.style5}>
            <View style={styles.style6}>
              <Text style={{ fontSize: fontSize.sm, color: '#6B7280', marginRight: spacing.xs }}>
                Skill Match:
              </Text>
              <View 
                style={[
                  styles.style7,
                  { 
                    backgroundColor: (application as any).skill_match_percentage >= 80 ? '#D1FAE5' : 
                                   (application as any).skill_match_percentage >= 60 ? '#FEF3C7' : '#FEE2E2',
                    paddingHorizontal: spacing.xs,
                    paddingVertical: 2
                  }
                ]}
              >
                <Text style={{ 
                  color: (application as any).skill_match_percentage >= 80 ? '#047857' : 
                         (application as any).skill_match_percentage >= 60 ? '#D97706' : '#DC2626',
                  fontSize: fontSize.xs,
                  fontWeight: 'bold'
                }}>
                  {(application as any).skill_match_percentage}%
                </Text>
              </View>
            </View>
            <View style={[styles.style8, { gap: spacing.xs }]}>
              {(application as any).matching_skills.map((skill: string, index: number) => (
                <View 
                  key={index}
                  style={[styles.style9, { paddingHorizontal: spacing.xs, paddingVertical: 2 }]}
                >
                  <Text style={{ color: '#2563EB', fontSize: fontSize.xs, fontWeight: '500' }}>
                    {skill}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Cover Letter */}
        {application.coverLetter && (
          <View style={styles.style10}>
            <Text style={{ fontSize: fontSize.sm, color: '#6B7280', marginBottom: 4 }}>
              Cover Letter:
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: '#374151', lineHeight: 20 }} numberOfLines={3}>
              {application.coverLetter}
            </Text>
          </View>
        )}

        {/* Contact Info */}
        <View style={styles.style11}>
          <Text style={{ fontSize: fontSize.sm, color: '#6B7280', marginRight: spacing.xs }}>
            Phone:
          </Text>
          <TouchableOpacity>
            <Text style={{ fontSize: fontSize.sm, color: '#2563EB', fontWeight: '500' }}>
              {application.applicantPhone}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        {application.status === 'pending' && (
          <View style={[styles.style12, { gap: spacing.sm }]}>
            <TouchableOpacity
              onPress={() => updateApplicationStatus(application.id, 'reviewing')}
              style={[styles.style13, { paddingVertical: spacing.sm }]}
            >
              <Text style={{ color: '#2563EB', fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' }}>
                Mark as Reviewed
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => updateApplicationStatus(application.id, 'accepted')}
              style={[styles.style14, { paddingVertical: spacing.sm }]}
            >
              <Text style={{ color: '#047857', fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' }}>
                Accept
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => updateApplicationStatus(application.id, 'rejected')}
              style={[styles.style15, { paddingVertical: spacing.sm }]}
            >
              <Text style={{ color: '#DC2626', fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' }}>
                Reject
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {application.status === 'reviewing' && (
          <View style={[styles.style12, { gap: spacing.sm }]}>
            <TouchableOpacity
              onPress={() => updateApplicationStatus(application.id, 'accepted')}
              style={[styles.style14, { paddingVertical: spacing.sm }]}
            >
              <Text style={{ color: '#047857', fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' }}>
                Accept
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => updateApplicationStatus(application.id, 'rejected')}
              style={[styles.style15, { paddingVertical: spacing.sm }]}
            >
              <Text style={{ color: '#DC2626', fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' }}>
                Reject
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.style16}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.style17}>
          <Text style={{ fontSize: fontSize.lg, color: '#6B7280' }}>Loading applications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.style16}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.style17}>
          <Text style={{ fontSize: fontSize.lg, color: '#DC2626', textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity
            onPress={loadApplications}
            style={{
              backgroundColor: '#059669',
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
    <SafeAreaView style={styles.style16}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      {/* Header */}
      <View style={[styles.style18, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
        <View style={styles.style19}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.style20}
          >
            <Text style={{ fontSize: fontSize.lg }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827' }}>
            Job Applications
          </Text>
          <View style={{ width: 40 }} />
        </View>
        
        {/* Stats */}
        <View style={[styles.style21, { padding: spacing.sm }]}>
          <Text style={{ fontSize: fontSize.sm, color: '#6B7280', textAlign: 'center' }}>
            {applications.length} total applications
          </Text>
        </View>
      </View>

      {/* Status Filter */}
      <View style={[styles.style18, { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          bounces={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingHorizontal: 4 }}
        >
          <View style={[styles.style12, { gap: spacing.sm }]}>
            {(['all', 'pending', 'reviewing', 'accepted', 'rejected'] as const).map((status) => {
              const isSelected = selectedStatus === status;
              const count = statusCounts[status];
              
              return (
                <TouchableOpacity
                  key={status}
                  onPress={() => setSelectedStatus(status)}
                  style={[
                    styles.filterButton,
                    {
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      backgroundColor: isSelected ? '#059669' : '#FFFFFF',
                      borderColor: isSelected ? '#059669' : '#D1D5DB'
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
            colors={['#047857']}
            tintColor="#047857"
          />
        }
        contentContainerStyle={{ 
          padding: spacing.lg,
          paddingBottom: spacing.xl 
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.style22}>
            <Text style={{ fontSize: fontSize.xl, marginBottom: spacing.md }}>📋</Text>
            <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827', marginBottom: spacing.sm }}>
              No Applications
            </Text>
            <Text style={{ fontSize: fontSize.base, color: '#6B7280', textAlign: 'center' }}>
              {selectedStatus === 'all' 
                ? 'No applications have been received for this job yet.'
                : `No ${selectedStatus} applications found.`
              }
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  style1: {
  'backgroundColor': '#FFFFFF',
  'borderRadius': 12,
  'borderWidth': 1,
  'borderColor': '#F3F4F6',
  'marginBottom': 16
},
  style2: {
  'flexDirection': 'row',
  'alignItems': 'flex-start',
  'justifyContent': 'space-between',
  'marginBottom': 12
},
  style3: {
  'flex': 1
},
  style4: {
  'borderRadius': 9999,
  'borderWidth': 1
},
  style5: {
  'marginBottom': 12
},
  style6: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'marginBottom': 8
},
  style7: {
  'borderRadius': 9999
},
  style8: {
  'flexDirection': 'row'
},
  style9: {
  'backgroundColor': '#EFF6FF',
  'borderWidth': 1,
  'borderColor': '#BFDBFE',
  'borderRadius': 8
},
  style10: {
  'marginBottom': 16
},
  style11: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'marginBottom': 16
},
  style12: {
  'flexDirection': 'row'
},
  style13: {
  'flex': 1,
  'backgroundColor': '#DBEAFE',
  'borderWidth': 1,
  'borderColor': '#BFDBFE',
  'borderRadius': 8
},
  style14: {
  'flex': 1,
  'backgroundColor': '#DCFCE7',
  'borderWidth': 1,
  'borderRadius': 8
},
  style15: {
  'flex': 1,
  'backgroundColor': '#FEE2E2',
  'borderWidth': 1,
  'borderColor': '#FECACA',
  'borderRadius': 8
},
  style16: {
  'flex': 1,
  'backgroundColor': '#F9FAFB'
},
  style17: {
  'flex': 1,
  'justifyContent': 'center',
  'alignItems': 'center'
},
  style18: {
  'backgroundColor': '#FFFFFF',
  'borderBottomWidth': 1,
  'borderColor': '#E5E7EB'
},
  style19: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'marginBottom': 12
},
  style20: {
  'borderRadius': 9999,
  'backgroundColor': '#F3F4F6',
  'padding': 8
},
  style21: {
  'backgroundColor': '#F9FAFB',
  'borderRadius': 8
},
  style22: {
  'flex': 1,
  'justifyContent': 'center',
  'alignItems': 'center'
},
  filterButton: {
    borderRadius: 9999,
    borderWidth: 1
  }
});

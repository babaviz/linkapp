import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Linking, Share, StatusBar , StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { getJobById } from '../../redux/slices/jobSlice';
import { JobPosting } from '../../types/job';
import { 
  getDynamicDimensions, 
  getResponsiveMargin, 
  getResponsivePadding, 
  spacing,
  fontSize
} from '../../utils/responsive';

type JobDetailsRouteProp = RouteProp<{ params: { jobId: string } }, 'params'>;
type JobDetailsNavigationProp = StackNavigationProp<any>;

export default function JobDetailsScreen() {
  const route = useRoute<JobDetailsRouteProp>();
  const navigation = useNavigation<JobDetailsNavigationProp>();
  const dispatch = useAppDispatch();
  
  const { jobId } = route.params;
  const { currentJob, isLoading, error } = useAppSelector(state => state.jobs);
  
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  const { width: screenWidth, isTablet } = getDynamicDimensions();

  useEffect(() => {
    if (jobId) {
      dispatch(getJobById(jobId));
    }
  }, [jobId, dispatch]);

  const handleApply = () => {
    // Note: contact_info and application_method properties are commented out in EditJobScreen
    // This functionality may need to be updated when those properties are properly implemented
    setShowApplicationModal(true);
  };

  const handleShare = async () => {
    if (!currentJob) return;
    
    try {
      await Share.share({
        message: `Check out this job: ${currentJob.title} at ${currentJob.employer.company || currentJob.employer.name}. Salary: KSH ${currentJob.salary.min.toLocaleString()} - ${currentJob.salary.max.toLocaleString()}/${currentJob.salary.period}`,
        title: currentJob.title,
      });
    } catch (error) {
      
    }
  };

  const handleSave = () => {
    // TODO: Implement save job functionality
    
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.style1}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.style2}>
          <Text style={{ fontSize: fontSize.lg, color: '#6B7280' }}>Loading job details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !currentJob) {
    return (
      <SafeAreaView style={styles.style1}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.style3}>
          <Text style={{ fontSize: fontSize.xl, fontWeight: 'bold', color: '#DC2626', marginBottom: spacing.md }}>
            Job Not Found
          </Text>
          <Text style={{ fontSize: fontSize.base, color: '#6B7280', textAlign: 'center', marginBottom: spacing.lg }}>
            {error || 'The job you are looking for could not be found.'}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.style4}
          >
            <Text style={{ color: 'white', fontSize: fontSize.base, fontWeight: '600' }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.style1}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      {/* Header */}
      <View style={[styles.style5, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
        <View style={styles.style6}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.style7}
          >
            <Text style={{ fontSize: fontSize.lg }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827' }}>
            Job Details
          </Text>
          <View style={[styles.style8, { gap: spacing.sm }]}>
            <TouchableOpacity 
              onPress={handleSave}
              style={styles.style7}
            >
              <Text style={{ fontSize: fontSize.base }}>❤️</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleShare}
              style={styles.style7}
            >
              <Text style={{ fontSize: fontSize.base }}>📤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={[styles.style9, { paddingHorizontal: spacing.lg, paddingTop: spacing.lg }]}>
        {/* Premium Badge */}
        {currentJob.featured && (
          <View style={[styles.style10, { padding: spacing.sm }]}>
            <Text style={{ color: 'white', fontSize: fontSize.sm, fontWeight: 'bold', textAlign: 'center' }}>
              ✨ PREMIUM JOB POSTING
            </Text>
          </View>
        )}

        {/* Job Header */}
        <View style={[styles.style11, { padding: spacing.lg }]}>
          <Text style={{ 
            fontSize: isTablet ? fontSize['2xl'] : fontSize.xl, 
            fontWeight: 'bold', 
            color: '#111827', 
            marginBottom: spacing.sm 
          }}>
            {currentJob.title}
          </Text>
          
          <View style={styles.style12}>
            <View 
              style={[styles.style13, { width: 10, height: 10, marginRight: spacing.xs, backgroundColor: '#10B981' }]} 
            />
            <Text style={{ fontSize: fontSize.base, color: '#059669', fontWeight: '600' }}>
              {currentJob.employer.company || currentJob.employer.name}
            </Text>
            {currentJob.employer.verified && (
              <View style={[styles.style14, { paddingHorizontal: spacing.xs, paddingVertical: 2 }]}>
                <Text style={{ color: '#15803d', fontSize: fontSize.xs, fontWeight: '500' }}>✓ Verified</Text>
              </View>
            )}
          </View>

          {/* Job Meta */}
          <View style={[styles.style15, { gap: spacing.xs, marginBottom: spacing.md }]}>
            <View style={[styles.style16, { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }]}>
              <Text style={{ color: '#1d4ed8', fontSize: fontSize.xs, fontWeight: '500' }}>
                📍 {currentJob.location.town}, {currentJob.location.county}
              </Text>
            </View>
            <View style={[styles.style17, { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderColor: '#DDD6FE' }]}>
              <Text style={{ color: '#7c3aed', fontSize: fontSize.xs, fontWeight: '500', textTransform: 'capitalize' }}>
                💼 {currentJob.job_type.replace('_', ' ')}
              </Text>
            </View>
            <View style={[styles.style18, { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }]}>
              <Text style={{ color: '#047857', fontSize: fontSize.xs, fontWeight: '500', textTransform: 'capitalize' }}>
                🎯 {currentJob.experience_level.replace('_', ' ')}
              </Text>
            </View>
          </View>

          {/* Salary */}
          <View style={[styles.style19, { padding: spacing.md, borderColor: '#BBF7D0' }]}>
            <View style={styles.style6}>
              <View>
                <Text style={{ fontSize: fontSize.xs, color: '#065F46', fontWeight: '500', marginBottom: 2 }}>
                  Salary Range
                </Text>
                <View style={styles.style20}>
                  <Text style={{ fontSize: fontSize.xl, fontWeight: 'bold', color: '#059669' }}>
                    KSH {currentJob.salary.min.toLocaleString()}
                  </Text>
                  {currentJob.salary.max !== currentJob.salary.min && (
                    <Text style={{ fontSize: fontSize.xl, fontWeight: 'bold', color: '#059669' }}>
                      - {currentJob.salary.max.toLocaleString()}
                    </Text>
                  )}
                </View>
              </View>
              <View style={[styles.style21, { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }]}>
                <Text style={{ color: '#15803d', fontSize: fontSize.sm, fontWeight: 'bold' }}>
                  /{currentJob.salary.period}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Job Description */}
        <View style={[styles.style11, { padding: spacing.lg }]}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827', marginBottom: spacing.md }}>
            Job Description
          </Text>
          <Text style={{ fontSize: fontSize.base, color: '#4B5563', lineHeight: 24 }}>
            {currentJob.description}
          </Text>
        </View>

        {/* Requirements */}
        {currentJob.requirements && currentJob.requirements.length > 0 && (
          <View style={[styles.style11, { padding: spacing.lg }]}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827', marginBottom: spacing.md }}>
              Required Skills
            </Text>
            <View style={[styles.style15, { gap: spacing.sm, flexWrap: 'wrap' }]}>
              {currentJob.requirements.map((req, index) => (
                <View 
                  key={index}
                  style={{ 
                    paddingHorizontal: spacing.sm, 
                    paddingVertical: spacing.sm,
                    borderRadius: 8,
                    borderWidth: 1,
                    backgroundColor: req.required ? '#FEF2F2' : '#F9FAFB',
                    borderColor: req.required ? '#FECACA' : '#E5E7EB',
                  }}
                >
                  <Text style={{ 
                    color: req.required ? '#DC2626' : '#374151', 
                    fontSize: fontSize.sm, 
                    fontWeight: '500' 
                  }}>
                    {req.skill} {req.required && '*'}
                  </Text>
                  <Text style={{ 
                    color: req.required ? '#DC2626' : '#6B7280', 
                    fontSize: fontSize.xs, 
                    textTransform: 'capitalize' 
                  }}>
                    {req.level}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: fontSize.xs, color: '#6B7280', marginTop: spacing.sm }}>
              * Required skills
            </Text>
          </View>
        )}

        {/* Benefits */}
        {currentJob.benefits && currentJob.benefits.length > 0 && (
          <View style={[styles.style11, { padding: spacing.lg }]}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827', marginBottom: spacing.md }}>
              Benefits
            </Text>
            {currentJob.benefits.map((benefit, index) => (
              <View key={index} style={styles.style22}>
                <Text style={{ color: '#059669', marginRight: spacing.xs }}>✓</Text>
                <Text style={{ fontSize: fontSize.base, color: '#4B5563' }}>
                  {benefit}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Job Stats */}
        <View style={[styles.style11, { padding: spacing.lg }]}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827', marginBottom: spacing.md }}>
            Job Information
          </Text>
          <View style={styles.style23}>
            <Text style={{ fontSize: fontSize.base, color: '#6B7280' }}>Applications</Text>
            <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#111827' }}>
              {currentJob.applicationsCount || 0} applicants
            </Text>
          </View>
          <View style={styles.style23}>
            <Text style={{ fontSize: fontSize.base, color: '#6B7280' }}>Posted</Text>
            <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: '#111827' }}>
              {new Date(currentJob.createdAt || '').toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Application Method */}
        <View style={[styles.style25, { padding: spacing.lg }]}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827', marginBottom: spacing.md }}>
            How to Apply
          </Text>
          <Text style={{ fontSize: fontSize.base, color: '#4B5563', marginBottom: spacing.md }}>
            Click the Apply Now button below to submit your application.
          </Text>
        </View>
      </ScrollView>

      {/* Fixed Apply Button */}
      <View style={[styles.style27, { padding: spacing.lg }]}>
        <TouchableOpacity
          onPress={handleApply}
          style={[
            styles.style28,
            {
              paddingVertical: spacing.md,
              backgroundColor: '#10B981',
              shadowColor: '#10B981',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }
          ]}
        >
          <Text style={{ 
            color: 'white', 
            fontSize: fontSize.lg, 
            fontWeight: 'bold', 
            textAlign: 'center' 
          }}>
            Apply Now
          </Text>
        </TouchableOpacity>
      </View>

      {/* Application Modal */}
      <Modal
        visible={showApplicationModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowApplicationModal(false)}
      >
        <SafeAreaView style={styles.style1}>
          <View style={[styles.style5, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
            <View style={styles.style6}>
              <TouchableOpacity onPress={() => setShowApplicationModal(false)}>
                <Text style={{ color: '#059669', fontWeight: '600', fontSize: fontSize.base }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: fontSize.lg, fontWeight: 'bold', color: '#111827' }}>
                Apply for Job
              </Text>
              <View style={{ width: 60 }} />
            </View>
          </View>
          
          <View style={styles.style3}>
            <Text style={{ fontSize: fontSize.xl, fontWeight: 'bold', color: '#111827', marginBottom: spacing.md }}>
              Application Feature
            </Text>
            <Text style={{ fontSize: fontSize.base, color: '#6B7280', textAlign: 'center', marginBottom: spacing.lg }}>
              In-app application feature coming soon.
            </Text>
            
            <TouchableOpacity
              onPress={() => setShowApplicationModal(false)}
              style={[styles.style29, { width: '100%', backgroundColor: '#10B981' }]}
            >
              <Text style={{ color: 'white', fontSize: fontSize.base, fontWeight: '600', textAlign: 'center' }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  style1: {
  'flex': 1,
  'backgroundColor': '#F9FAFB'
},
  style2: {
  'flex': 1,
  'justifyContent': 'center',
  'alignItems': 'center'
},
  style3: {
  'flex': 1,
  'justifyContent': 'center',
  'alignItems': 'center',
  'paddingHorizontal': 24
},
  style4: {
  'paddingHorizontal': 24,
  'paddingVertical': 12,
  'borderRadius': 8
},
  style5: {
  'backgroundColor': '#FFFFFF',
  'borderBottomWidth': 1,
  'borderColor': '#E5E7EB'
},
  style6: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between'
},
  style7: {
  'borderRadius': 9999,
  'backgroundColor': '#F3F4F6',
  'padding': 8
},
  style8: {
  'flexDirection': 'row'
},
  style9: {
  'flex': 1
},
  style10: {
  'borderRadius': 8,
  'marginBottom': 16
},
  style11: {
  'backgroundColor': '#FFFFFF',
  'borderRadius': 12,
  'borderWidth': 1,
  'borderColor': '#F3F4F6',
  'marginBottom': 16
},
  style12: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'marginBottom': 16
},
  style13: {
  'borderRadius': 9999
},
  style14: {
  'backgroundColor': '#DCFCE7',
  'borderRadius': 9999,
  'marginLeft': 8
},
  style15: {
  'flexDirection': 'row'
},
  style16: {
  'backgroundColor': '#EFF6FF',
  'borderWidth': 1,
  'borderColor': '#BFDBFE',
  'borderRadius': 9999
},
  style17: {
  'backgroundColor': '#FAF5FF',
  'borderWidth': 1,
  'borderRadius': 9999
},
  style18: {
  'borderWidth': 1,
  'borderRadius': 9999
},
  style19: {
  'backgroundColor': '#F0FDF4',
  'borderWidth': 1,
  'borderRadius': 12
},
  style20: {
  'flexDirection': 'row',
  'alignItems': 'center'
},
  style21: {
  'backgroundColor': '#DCFCE7',
  'borderRadius': 9999
},
  style22: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'marginBottom': 8
},
  style23: {
  'flexDirection': 'row',
  'justifyContent': 'space-between',
  'alignItems': 'center',
  'marginBottom': 12
},
  style24: {
  'flexDirection': 'row',
  'justifyContent': 'space-between',
  'alignItems': 'center'
},
  style25: {
  'backgroundColor': '#FFFFFF',
  'borderRadius': 12,
  'borderWidth': 1,
  'borderColor': '#F3F4F6',
  'marginBottom': 24
},
  style26: {
  'backgroundColor': '#EFF6FF',
  'borderRadius': 8
},
  style27: {
  'backgroundColor': '#FFFFFF',
  'borderTopWidth': 1,
  'borderColor': '#E5E7EB'
},
  style28: {
  'borderRadius': 12
},
  style29: {
  'paddingHorizontal': 24,
  'paddingVertical': 12,
  'borderRadius': 8,
  'marginBottom': 12
},
  style30: {
  'backgroundColor': '#16A34A',
  'paddingHorizontal': 24,
  'paddingVertical': 12,
  'borderRadius': 8,
  'marginBottom': 12
},
  style31: {
  'backgroundColor': '#2563EB',
  'paddingHorizontal': 24,
  'paddingVertical': 12,
  'borderRadius': 8
},
});

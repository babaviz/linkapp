import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { getScreenOptions } from './navigationConfig';

// Import all job-related screens
import JobsScreen from '../screens/jobs/JobsScreen';
import JobDetailsScreen from '../screens/jobs/JobDetailsScreen';
import JobApplicationsScreen from '../screens/jobs/JobApplicationsScreen';
import MyApplicationsScreen from '../screens/jobs/MyApplicationsScreen';
import MyPostingsScreen from '../screens/jobs/MyPostingsScreen';
import PostJobScreen from '../screens/jobs/PostJobScreen';
import SkillsProfileScreen from '../screens/jobs/SkillsProfileScreen';
import CompanyProfileScreen from '../screens/jobs/CompanyProfileScreen';
import EditJobScreen from '../screens/jobs/EditJobScreen';
import CategoryJobsScreen from '../screens/jobs/CategoryJobsScreen';
import JobChatScreen from '../screens/jobs/JobChatScreen';

const Stack = createStackNavigator<JobsStackParamList>();

export type JobsStackParamList = {
  JobsMain: undefined;
  JobDetails: { jobId: string };
  JobApplications: { jobId: string };
  MyApplications: undefined;
  MyPostings: undefined;
  SkillsProfile: undefined;
  CompanyProfile: undefined;
  EditJob: { jobId: string };
  CategoryJobs: { skill: string; role?: 'job_seeker' | 'employer' };
  PostJob: undefined;
  JobChat: {
    job: {
      id: string;
      title: string;
      company: string;
      employer_id: string;
      employer_name?: string;
    };
    recipientId: string;
    recipientName: string;
    conversationId?: string;
  };
};

export default function JobsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
      }}
    >
      {/* Main Jobs Screen */}
      <Stack.Screen 
        name="JobsMain" 
        component={JobsScreen}
        options={{
          title: 'Jobs & Skills'
        }}
      />
      
      {/* Job Details */}
      <Stack.Screen 
        name="JobDetails" 
        component={JobDetailsScreen}
        options={{
          headerShown: false,
        }}
      />
      
      {/* Job Applications (for employers) */}
      <Stack.Screen 
        name="JobApplications" 
        component={JobApplicationsScreen}
        options={{
          title: 'Applications',
        }}
      />
      
      {/* My Applications (for job seekers) */}
      <Stack.Screen 
        name="MyApplications" 
        component={MyApplicationsScreen}
        options={{
          title: 'My Applications',
        }}
      />
      
      {/* My Job Postings (for employers) */}
      <Stack.Screen 
        name="MyPostings" 
        component={MyPostingsScreen}
        options={{
          title: 'My Job Postings',
        }}
      />
      
      {/* Skills Profile (Job Seeker My Profile) */}
      <Stack.Screen 
        name="SkillsProfile" 
        component={SkillsProfileScreen}
        options={{
          title: 'My Profile',
        }}
      />

      {/* Company Profile (Employer) */}
      <Stack.Screen 
        name="CompanyProfile" 
        component={CompanyProfileScreen}
        options={{
          title: 'Company Profile',
        }}
      />
      
      {/* Edit Job Posting */}
      <Stack.Screen 
        name="EditJob" 
        component={EditJobScreen}
        options={{
          title: 'Edit Job',
        }}
      />
      
      {/* Category Jobs */}
      <Stack.Screen 
        name="CategoryJobs" 
        component={CategoryJobsScreen}
        options={({ route }) => {
          const skill = (route.params as any)?.skill || 'Category';
          const formattedSkill = skill.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          return {
            title: `${formattedSkill} Jobs`,
            headerShown: false,
            // Optimize for instant transitions
            animationEnabled: true,
            gestureEnabled: true,
          };
        }}
      />
      
      {/* Post Job */}
      <Stack.Screen 
        name="PostJob" 
        component={PostJobScreen}
        options={{
          title: 'Post a Job',
        }}
      />
      
      {/* Job Chat */}
      <Stack.Screen 
        name="JobChat" 
        component={JobChatScreen}
        options={({ route }) => {
          const params = route.params as JobsStackParamList['JobChat'];
          const title = params?.job?.title || 'JobChat';
          const company = params?.job?.company || '';
          return {
            title: `${title.length > 25 ? title.substring(0, 25) + '...' : title}${company ? ' - ' + company : ''}`,
            // Chat screens render their own in-screen header for consistency across entry paths
            headerShown: false,
          };
        }}
      />
    </Stack.Navigator>
  );
}

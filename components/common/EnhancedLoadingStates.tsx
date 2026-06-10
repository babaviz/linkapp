/**
 * Enhanced Module-Specific Loading States
 * Comprehensive loading skeletons for all key modules with performance optimization
 */

import React, { useRef, useEffect } from 'react';
import { View, ScrollView, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../src/theme/colors';
import SkeletonLoader from './SkeletonLoader';
import { UIPolishSystem } from '../../utils/uiPolishSystem';

interface ModuleLoadingProps {
  style?: ViewStyle;
  itemCount?: number;
  showHeader?: boolean;
  animated?: boolean;
}

// PROPERTIES MODULE LOADING
export const PropertiesLoadingScreen: React.FC<ModuleLoadingProps> = ({ 
  style, 
  itemCount = 5, 
  showHeader = true,
  animated = true 
}) => {
  const { animatedValues, startAnimation } = UIPolishSystem.createStaggeredListAnimation(
    Array(itemCount).fill(0), 
    80
  );

  useEffect(() => {
    if (animated) {
      startAnimation();
    }
  }, [animated]);

  return (
    <ScrollView 
      style={[styles.container, style]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {/* Enhanced Search Bar */}
      {showHeader && (
        <Animated.View style={[
          styles.searchContainer,
          animated && { opacity: animatedValues[0] }
        ]}>
          <SkeletonLoader width="100%" height={52} borderRadius={26} />
        </Animated.View>
      )}
      
      {/* Filter Chips */}
      <Animated.View style={[
        styles.filterContainer,
        animated && { opacity: animatedValues[0] }
      ]}>
        {['All', 'For Sale', 'For Rent', 'Commercial'].map((_, index) => (
          <SkeletonLoader 
            key={index}
            width={90} 
            height={36} 
            borderRadius={18} 
            style={styles.filterChip} 
          />
        ))}
      </Animated.View>
      
      {/* Property Cards */}
      <View style={styles.listContainer}>
        {Array.from({ length: itemCount }).map((_, index) => (
          <Animated.View 
            key={index}
            style={[
              styles.propertyCard,
              animated && { 
                opacity: animatedValues[index % animatedValues.length],
                transform: [{
                  translateY: animatedValues[index % animatedValues.length].interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                }]
              }
            ]}
          >
            {/* Property Image */}
            <SkeletonLoader width="100%" height={240} borderRadius={0} />
            
            <View style={styles.propertyContent}>
              {/* Property Title & Price */}
              <View style={styles.propertyHeader}>
                <SkeletonLoader width="70%" height={20} style={{ marginBottom: 6 }} />
                <SkeletonLoader width="40%" height={24} />
              </View>
              
              {/* Location */}
              <SkeletonLoader width="80%" height={16} style={{ marginVertical: 8 }} />
              
              {/* Property Features */}
              <View style={styles.propertyFeatures}>
                <SkeletonLoader width={50} height={14} />
                <SkeletonLoader width={50} height={14} />
                <SkeletonLoader width={50} height={14} />
                <SkeletonLoader width={50} height={14} />
              </View>
              
              {/* Actions */}
              <View style={styles.propertyActions}>
                <SkeletonLoader width="48%" height={42} borderRadius={21} />
                <SkeletonLoader width="48%" height={42} borderRadius={21} />
              </View>
            </View>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
};

// JOBS MODULE LOADING
export const JobsLoadingScreen: React.FC<ModuleLoadingProps> = ({ 
  style, 
  itemCount = 6,
  animated = true 
}) => {
  const { animatedValues, startAnimation } = UIPolishSystem.createStaggeredListAnimation(
    Array(itemCount).fill(0), 
    60
  );

  useEffect(() => {
    if (animated) {
      startAnimation();
    }
  }, [animated]);

  return (
    <ScrollView 
      style={[styles.container, style]}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Header Stats */}
      <Animated.View style={[
        styles.statsContainer,
        animated && { opacity: animatedValues[0] }
      ]}>
        <SkeletonLoader width="30%" height={18} style={{ marginBottom: 4 }} />
        <SkeletonLoader width="50%" height={14} />
      </Animated.View>
      
      {/* Job Cards */}
      <View style={styles.listContainer}>
        {Array.from({ length: itemCount }).map((_, index) => (
          <Animated.View 
            key={index}
            style={[
              styles.jobCard,
              animated && { 
                opacity: animatedValues[index % animatedValues.length],
                transform: [{
                  scale: animatedValues[index % animatedValues.length].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1]
                  })
                }]
              }
            ]}
          >
            {/* Company Logo & Basic Info */}
            <View style={styles.jobHeader}>
              <SkeletonLoader width={56} height={56} borderRadius={12} />
              <View style={styles.jobHeaderText}>
                <SkeletonLoader width="80%" height={18} style={{ marginBottom: 6 }} />
                <SkeletonLoader width="60%" height={14} style={{ marginBottom: 4 }} />
                <SkeletonLoader width="40%" height={12} />
              </View>
              <SkeletonLoader width={28} height={28} borderRadius={14} />
            </View>
            
            {/* Job Description */}
            <View style={styles.jobContent}>
              <SkeletonLoader width="100%" height={14} style={{ marginBottom: 6 }} />
              <SkeletonLoader width="85%" height={14} style={{ marginBottom: 12 }} />
            </View>
            
            {/* Skills/Tags */}
            <View style={styles.jobTags}>
              {[80, 60, 90].map((width, tagIndex) => (
                <SkeletonLoader 
                  key={tagIndex}
                  width={width} 
                  height={28} 
                  borderRadius={14}
                  style={{ marginRight: 8 }}
                />
              ))}
            </View>
            
            {/* Footer */}
            <View style={styles.jobFooter}>
              <SkeletonLoader width="30%" height={16} />
              <SkeletonLoader width={100} height={36} borderRadius={18} />
            </View>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
};

// SERVICES MODULE LOADING
export const ServicesLoadingScreen: React.FC<ModuleLoadingProps> = ({ 
  style,
  itemCount = 8,
  animated = true 
}) => {
  const { animatedValues, startAnimation } = UIPolishSystem.createStaggeredListAnimation(
    Array(itemCount).fill(0), 
    50
  );

  useEffect(() => {
    if (animated) {
      startAnimation();
    }
  }, [animated]);

  return (
    <ScrollView 
      style={[styles.container, style]}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Categories Grid */}
      <Animated.View style={[
        styles.categoriesGrid,
        animated && { opacity: animatedValues[0] }
      ]}>
        {Array.from({ length: 6 }).map((_, index) => (
          <View key={index} style={styles.categoryItem}>
            <SkeletonLoader width={60} height={60} borderRadius={30} style={{ marginBottom: 8 }} />
            <SkeletonLoader width="80%" height={12} />
          </View>
        ))}
      </Animated.View>
      
      {/* Service Cards */}
      <View style={styles.listContainer}>
        {Array.from({ length: itemCount }).map((_, index) => (
          <Animated.View 
            key={index}
            style={[
              styles.serviceCard,
              animated && { 
                opacity: animatedValues[index % animatedValues.length],
                transform: [{
                  translateX: animatedValues[index % animatedValues.length].interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0]
                  })
                }]
              }
            ]}
          >
            {/* Service Provider */}
            <View style={styles.serviceHeader}>
              <SkeletonLoader width={48} height={48} borderRadius={24} />
              <View style={styles.serviceHeaderText}>
                <SkeletonLoader width="70%" height={16} style={{ marginBottom: 4 }} />
                <SkeletonLoader width="50%" height={12} />
              </View>
              <SkeletonLoader width={20} height={20} borderRadius={10} />
            </View>
            
            {/* Service Image */}
            <SkeletonLoader width="100%" height={160} borderRadius={12} style={{ marginVertical: 12 }} />
            
            {/* Service Details */}
            <SkeletonLoader width="90%" height={16} style={{ marginBottom: 6 }} />
            <SkeletonLoader width="60%" height={20} style={{ marginBottom: 8 }} />
            <SkeletonLoader width="40%" height={14} />
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
};

// STORIES MODULE LOADING
export const StoriesLoadingScreen: React.FC<ModuleLoadingProps> = ({ 
  style,
  itemCount = 10,
  animated = true 
}) => {
  const { animatedValues, startAnimation } = UIPolishSystem.createStaggeredListAnimation(
    Array(itemCount).fill(0), 
    40
  );

  useEffect(() => {
    if (animated) {
      startAnimation();
    }
  }, [animated]);

  return (
    <ScrollView 
      style={[styles.container, style]}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Story Highlights */}
      <Animated.View style={[
        styles.storiesHighlights,
        animated && { opacity: animatedValues[0] }
      ]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View key={index} style={styles.storyHighlight}>
              <SkeletonLoader width={80} height={80} borderRadius={40} />
              <SkeletonLoader width={60} height={10} style={{ marginTop: 6 }} />
            </View>
          ))}
        </ScrollView>
      </Animated.View>
      
      {/* Story Posts */}
      <View style={styles.listContainer}>
        {Array.from({ length: itemCount }).map((_, index) => (
          <Animated.View 
            key={index}
            style={[
              styles.storyCard,
              animated && { 
                opacity: animatedValues[index % animatedValues.length],
                transform: [{
                  rotateY: animatedValues[index % animatedValues.length].interpolate({
                    inputRange: [0, 1],
                    outputRange: ['10deg', '0deg']
                  })
                }]
              }
            ]}
          >
            {/* Story Header */}
            <View style={styles.storyHeader}>
              <SkeletonLoader width={40} height={40} borderRadius={20} />
              <View style={styles.storyHeaderText}>
                <SkeletonLoader width="50%" height={14} style={{ marginBottom: 4 }} />
                <SkeletonLoader width="30%" height={10} />
              </View>
              <SkeletonLoader width={24} height={24} borderRadius={12} />
            </View>
            
            {/* Story Content */}
            <SkeletonLoader width="100%" height={300} borderRadius={12} style={{ marginVertical: 12 }} />
            
            {/* Story Actions */}
            <View style={styles.storyActions}>
              <SkeletonLoader width={30} height={30} borderRadius={15} />
              <SkeletonLoader width={30} height={30} borderRadius={15} />
              <SkeletonLoader width={30} height={30} borderRadius={15} />
              <View style={{ flex: 1 }} />
              <SkeletonLoader width={30} height={30} borderRadius={15} />
            </View>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
};

// DATEMI MODULE LOADING
export const DateMiLoadingScreen: React.FC<ModuleLoadingProps> = ({ 
  style,
  itemCount = 4,
  animated = true 
}) => {
  const { animatedValues, startAnimation } = UIPolishSystem.createStaggeredListAnimation(
    Array(itemCount).fill(0), 
    100
  );

  useEffect(() => {
    if (animated) {
      startAnimation();
    }
  }, [animated]);

  return (
    <ScrollView 
      style={[styles.container, style]}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Profile Discovery Cards */}
      <View style={styles.datemiContainer}>
        {Array.from({ length: itemCount }).map((_, index) => (
          <Animated.View 
            key={index}
            style={[
              styles.datemiCard,
              animated && { 
                opacity: animatedValues[index % animatedValues.length],
                transform: [{
                  scale: animatedValues[index % animatedValues.length].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1]
                  })
                }]
              }
            ]}
          >
            {/* Profile Image */}
            <SkeletonLoader width="100%" height={400} borderRadius={20} />
            
            {/* Profile Info Overlay */}
            <View style={styles.datemiOverlay}>
              <SkeletonLoader width="70%" height={24} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="50%" height={16} style={{ marginBottom: 12 }} />
              
              {/* Interests */}
              <View style={styles.datemiInterests}>
                {[60, 80, 70].map((width, tagIndex) => (
                  <SkeletonLoader 
                    key={tagIndex}
                    width={width} 
                    height={24} 
                    borderRadius={12}
                    style={{ marginRight: 6, marginBottom: 6 }}
                    shimmerColors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                  />
                ))}
              </View>
            </View>
            
            {/* Action Buttons */}
            <View style={styles.datemiActions}>
              <SkeletonLoader width={60} height={60} borderRadius={30} />
              <SkeletonLoader width={80} height={60} borderRadius={30} />
              <SkeletonLoader width={60} height={60} borderRadius={30} />
            </View>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
};

// PROFILE MODULE LOADING
export const ProfileLoadingScreen: React.FC<ModuleLoadingProps> = ({ 
  style,
  animated = true 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      UIPolishSystem.createEntranceAnimation(fadeAnim, 'fade');
    }
  }, [animated]);

  return (
    <ScrollView 
      style={[styles.container, style]}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Animated.View style={[
        styles.profileContainer,
        animated && { opacity: fadeAnim }
      ]}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <SkeletonLoader width={120} height={120} borderRadius={60} style={{ marginBottom: 16 }} />
          <SkeletonLoader width="60%" height={22} style={{ marginBottom: 6 }} />
          <SkeletonLoader width="40%" height={16} style={{ marginBottom: 20 }} />
          
          {/* Stats */}
          <View style={styles.profileStats}>
            {['Properties', 'Reviews', 'Following'].map((_, index) => (
              <View key={index} style={styles.statItem}>
                <SkeletonLoader width={40} height={20} style={{ marginBottom: 4 }} />
                <SkeletonLoader width={60} height={12} />
              </View>
            ))}
          </View>
        </View>
        
        {/* Profile Sections */}
        <View style={styles.profileSections}>
          {['About', 'Preferences', 'Activity', 'Settings'].map((_, index) => (
            <View key={index} style={styles.profileSection}>
              <SkeletonLoader width={32} height={32} borderRadius={16} />
              <View style={styles.profileSectionText}>
                <SkeletonLoader width="70%" height={16} style={{ marginBottom: 4 }} />
                <SkeletonLoader width="50%" height={12} />
              </View>
              <SkeletonLoader width={20} height={20} borderRadius={10} />
            </View>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
};

// DASHBOARD MODULE LOADING
export const DashboardLoadingScreen: React.FC<ModuleLoadingProps> = ({ 
  style,
  animated = true 
}) => {
  const { animatedValues, startAnimation } = UIPolishSystem.createStaggeredListAnimation(
    Array(6).fill(0), 
    80
  );

  useEffect(() => {
    if (animated) {
      startAnimation();
    }
  }, [animated]);

  return (
    <ScrollView 
      style={[styles.container, style]}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Welcome Header */}
      <Animated.View style={[
        styles.dashboardHeader,
        animated && { opacity: animatedValues[0] }
      ]}>
        <View style={styles.welcomeSection}>
          <SkeletonLoader width="60%" height={24} style={{ marginBottom: 6 }} />
          <SkeletonLoader width="40%" height={16} />
        </View>
        <SkeletonLoader width={48} height={48} borderRadius={24} />
      </Animated.View>
      
      {/* Quick Stats Cards */}
      <Animated.View style={[
        styles.statsGrid,
        animated && { opacity: animatedValues[1] }
      ]}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={styles.statCard}>
            <SkeletonLoader width={40} height={40} borderRadius={20} style={{ marginBottom: 12 }} />
            <SkeletonLoader width="80%" height={20} style={{ marginBottom: 4 }} />
            <SkeletonLoader width="60%" height={14} />
          </View>
        ))}
      </Animated.View>
      
      {/* Recent Activity */}
      <Animated.View style={[
        styles.recentActivity,
        animated && { opacity: animatedValues[2] }
      ]}>
        <SkeletonLoader width="50%" height={18} style={{ marginBottom: 16 }} />
        {Array.from({ length: 5 }).map((_, index) => (
          <View key={index} style={styles.activityItem}>
            <SkeletonLoader width={36} height={36} borderRadius={18} />
            <View style={styles.activityContent}>
              <SkeletonLoader width="80%" height={14} style={{ marginBottom: 4 }} />
              <SkeletonLoader width="50%" height={12} />
            </View>
            <SkeletonLoader width="20%" height={10} />
          </View>
        ))}
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base.white,
  },
  
  // Property Styles
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterChip: {
    marginRight: 12,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  propertyCard: {
    backgroundColor: colors.base.white,
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  propertyContent: {
    padding: 16,
  },
  propertyHeader: {
    marginBottom: 8,
  },
  propertyFeatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  propertyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  
  // Job Styles
  statsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  jobCard: {
    backgroundColor: colors.base.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  jobContent: {
    marginBottom: 12,
  },
  jobTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  // Service Styles
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 20,
  },
  categoryItem: {
    width: '33.33%',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceCard: {
    backgroundColor: colors.base.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  
  // Story Styles
  storiesHighlights: {
    paddingVertical: 20,
    paddingLeft: 20,
  },
  storyHighlight: {
    alignItems: 'center',
    marginRight: 16,
  },
  storyCard: {
    backgroundColor: colors.base.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  storyHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  storyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  
  // DateMi Styles
  datemiContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  datemiCard: {
    backgroundColor: colors.base.white,
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
  },
  datemiOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
  },
  datemiInterests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  datemiActions: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  
  // Profile Styles
  profileContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  profileSections: {
    gap: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.base.gray[50],
    borderRadius: 12,
  },
  profileSectionText: {
    flex: 1,
    marginLeft: 16,
  },
  
  // Dashboard Styles
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  welcomeSection: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.base.white,
    padding: 16,
    borderRadius: 12,
    margin: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  recentActivity: {
    paddingHorizontal: 20,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
});

export default {
  PropertiesLoadingScreen,
  JobsLoadingScreen,
  ServicesLoadingScreen,
  StoriesLoadingScreen,
  DateMiLoadingScreen,
  ProfileLoadingScreen,
  DashboardLoadingScreen,
};

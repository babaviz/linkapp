/**
 * Enhanced Loading States
 * Comprehensive loading components for different screen types
 */

import React, { useRef, useEffect } from 'react';
import { View, ScrollView, Animated, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { Material3Animations, MotionTokens } from '../../utils/material3Animations';
import SkeletonLoader from './SkeletonLoader';

interface LoadingStateProps {
  style?: ViewStyle;
  message?: string;
  showMessage?: boolean;
}

// Main App Loading Screen (used during initialization)
export const AppLoadingScreen: React.FC<LoadingStateProps> = ({
  style,
  message = "Loading LinkApp...",
  showMessage = true,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start pulse animation for logo
    Material3Animations.pulse(pulseAnim, 1.1).start();
    
    // Fade in the content
    Material3Animations.fadeIn(fadeAnim, MotionTokens.duration.medium4).start();
  }, []);

  return (
    <Animated.View style={[styles.appLoadingContainer, { opacity: fadeAnim }, style]}>
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={styles.logo}>🏠</Text>
        <Text style={styles.appName}>LinkApp</Text>
      </Animated.View>
      
      {showMessage && (
        <View style={styles.messageContainer}>
          <Text style={styles.loadingMessage}>{message}</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <Animated.View style={[styles.progressFill]} />
            </View>
          </View>
        </View>
      )}
    </Animated.View>
  );
};

// Property Listings Loading
export const PropertyListingLoading: React.FC<LoadingStateProps> = ({ style }) => {
  return (
    <ScrollView 
      style={[styles.container, style]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {/* Search Bar Skeleton */}
      <View style={styles.searchContainer}>
        <SkeletonLoader width="100%" height={48} borderRadius={24} />
      </View>
      
      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {[1, 2, 3, 4].map((item) => (
          <SkeletonLoader 
            key={item} 
            width={80} 
            height={36} 
            borderRadius={18} 
            style={styles.filterButton} 
          />
        ))}
      </View>
      
      {/* Property Cards */}
      <View style={styles.listContainer}>
        {[1, 2, 3, 4, 5].map((item) => (
          <View key={item} style={styles.propertyCard}>
            <SkeletonLoader width="100%" height={220} borderRadius={12} />
            <View style={styles.propertyDetails}>
              <SkeletonLoader width="80%" height={20} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="60%" height={24} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="90%" height={16} style={{ marginBottom: 12 }} />
              
              <View style={styles.propertyMeta}>
                <SkeletonLoader width={60} height={14} />
                <SkeletonLoader width={60} height={14} />
                <SkeletonLoader width={60} height={14} />
              </View>
              
              <View style={styles.propertyActions}>
                <SkeletonLoader width="45%" height={40} borderRadius={20} />
                <SkeletonLoader width="45%" height={40} borderRadius={20} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

// Jobs Loading
export const JobsListingLoading: React.FC<LoadingStateProps> = ({ style }) => {
  return (
    <ScrollView 
      style={[styles.container, style]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerContainer}>
        <SkeletonLoader width="70%" height={28} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="50%" height={16} />
      </View>
      
      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <SkeletonLoader width="100%" height={48} borderRadius={24} />
      </View>
      
      <View style={styles.filterContainer}>
        {[1, 2, 3].map((item) => (
          <SkeletonLoader 
            key={item} 
            width={100} 
            height={36} 
            borderRadius={18} 
            style={styles.filterButton} 
          />
        ))}
      </View>
      
      {/* Job Cards */}
      <View style={styles.listContainer}>
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <View key={item} style={styles.jobCard}>
            <View style={styles.jobHeader}>
              <SkeletonLoader width={50} height={50} borderRadius={25} />
              <View style={styles.jobHeaderText}>
                <SkeletonLoader width="80%" height={18} style={{ marginBottom: 6 }} />
                <SkeletonLoader width="60%" height={14} style={{ marginBottom: 4 }} />
                <SkeletonLoader width="40%" height={12} />
              </View>
              <SkeletonLoader width={24} height={24} borderRadius={12} />
            </View>
            
            <View style={styles.jobContent}>
              <SkeletonLoader width="100%" height={14} style={{ marginBottom: 6 }} />
              <SkeletonLoader width="90%" height={14} style={{ marginBottom: 12 }} />
              
              <View style={styles.jobTags}>
                <SkeletonLoader width={60} height={24} borderRadius={12} />
                <SkeletonLoader width={70} height={24} borderRadius={12} />
                <SkeletonLoader width={50} height={24} borderRadius={12} />
              </View>
              
              <View style={styles.jobFooter}>
                <SkeletonLoader width="40%" height={16} />
                <SkeletonLoader width={100} height={32} borderRadius={16} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

// Chat Loading
export const ChatLoadingScreen: React.FC<LoadingStateProps> = ({ style }) => {
  return (
    <View style={[styles.chatContainer, style]}>
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <SkeletonLoader width={40} height={40} borderRadius={20} />
        <View style={styles.chatHeaderInfo}>
          <SkeletonLoader width="60%" height={16} style={{ marginBottom: 4 }} />
          <SkeletonLoader width="30%" height={12} />
        </View>
        <SkeletonLoader width={24} height={24} borderRadius={12} />
      </View>
      
      {/* Chat Messages */}
      <ScrollView style={styles.chatMessages}>
        {/* Incoming messages */}
        {[1, 2, 3, 4, 5].map((item, index) => (
          <View key={item} style={[
            styles.messageRow,
            index % 2 === 0 ? styles.incomingMessage : styles.outgoingMessage
          ]}>
            {index % 2 === 0 && (
              <SkeletonLoader width={32} height={32} borderRadius={16} style={{ marginRight: 8 }} />
            )}
            <View style={[
              styles.messageBubble,
              index % 2 === 0 ? styles.incomingBubble : styles.outgoingBubble
            ]}>
              <SkeletonLoader 
                width={index % 3 === 0 ? "60%" : "80%"} 
                height={14} 
                style={{ marginBottom: 4 }}
                shimmerColors={index % 2 === 0 ? undefined : ['#E3F2FD', '#F3F4F6', '#E3F2FD']}
              />
              {Math.random() > 0.5 && (
                <SkeletonLoader 
                  width="40%" 
                  height={14}
                  shimmerColors={index % 2 === 0 ? undefined : ['#E3F2FD', '#F3F4F6', '#E3F2FD']}
                />
              )}
            </View>
          </View>
        ))}
      </ScrollView>
      
      {/* Chat Input */}
      <View style={styles.chatInputContainer}>
        <SkeletonLoader width={32} height={32} borderRadius={16} />
        <SkeletonLoader width="70%" height={40} borderRadius={20} style={{ marginHorizontal: 12 }} />
        <SkeletonLoader width={32} height={32} borderRadius={16} />
      </View>
    </View>
  );
};

// Map Loading
export const MapLoadingScreen: React.FC<LoadingStateProps> = ({ style }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Material3Animations.shimmer(shimmerAnim).start();
  }, []);

  return (
    <View style={[styles.mapContainer, style]}>
      {/* Map Skeleton */}
      <View style={styles.mapSkeleton}>
        <Animated.View style={[styles.mapShimmer, {
          transform: [{
            translateX: shimmerAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-100, 100],
            }),
          }]
        }]} />
        
        {/* Mock map markers */}
        {[1, 2, 3, 4, 5].map((item, index) => (
          <View 
            key={item} 
            style={[
              styles.mapMarker,
              {
                top: `${20 + index * 15}%`,
                left: `${15 + index * 20}%`,
              }
            ]}
          >
            <SkeletonLoader width={24} height={24} borderRadius={12} />
          </View>
        ))}
      </View>
      
      {/* Map Controls */}
      <View style={styles.mapControls}>
        <SkeletonLoader width={200} height={48} borderRadius={24} style={{ marginBottom: 16 }} />
        <View style={styles.mapButtons}>
          <SkeletonLoader width={48} height={48} borderRadius={24} />
          <SkeletonLoader width={48} height={48} borderRadius={24} />
        </View>
      </View>
      
      {/* Bottom Sheet Preview */}
      <View style={styles.mapBottomSheet}>
        <SkeletonLoader width={60} height={4} borderRadius={2} style={{ alignSelf: 'center', marginBottom: 16 }} />
        <View style={styles.mapPreviewCard}>
          <SkeletonLoader width={80} height={60} borderRadius={8} />
          <View style={styles.mapPreviewContent}>
            <SkeletonLoader width="70%" height={16} style={{ marginBottom: 6 }} />
            <SkeletonLoader width="50%" height={20} style={{ marginBottom: 8 }} />
            <SkeletonLoader width="80%" height={12} />
          </View>
        </View>
      </View>
    </View>
  );
};

// Notifications Loading
export const NotificationsLoadingScreen: React.FC<LoadingStateProps> = ({ style }) => {
  return (
    <ScrollView 
      style={[styles.container, style]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerContainer}>
        <SkeletonLoader width="60%" height={24} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="40%" height={14} />
      </View>
      
      {/* Notification Items */}
      <View style={styles.notificationsList}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((item, index) => (
          <View key={item} style={styles.notificationItem}>
            <SkeletonLoader width={48} height={48} borderRadius={24} />
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <SkeletonLoader width="70%" height={16} style={{ marginBottom: 4 }} />
                <SkeletonLoader width={8} height={8} borderRadius={4} />
              </View>
              <SkeletonLoader width="90%" height={14} style={{ marginBottom: 6 }} />
              <SkeletonLoader width="60%" height={14} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="30%" height={12} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

// Generic Content Loading
export const ContentLoadingScreen: React.FC<LoadingStateProps & {
  itemCount?: number;
  showHeader?: boolean;
  headerTitle?: string;
}> = ({ 
  style, 
  itemCount = 5,
  showHeader = true,
  headerTitle = "Loading..."
}) => {
  return (
    <ScrollView 
      style={[styles.container, style]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {showHeader && (
        <View style={styles.headerContainer}>
          <SkeletonLoader width="60%" height={24} style={{ marginBottom: 8 }} />
          <SkeletonLoader width="40%" height={14} />
        </View>
      )}
      
      <View style={styles.listContainer}>
        {Array.from({ length: itemCount }).map((_, index) => (
          <View key={index} style={styles.contentCard}>
            <SkeletonLoader width="100%" height={160} borderRadius={12} style={{ marginBottom: 12 }} />
            <SkeletonLoader width="85%" height={18} style={{ marginBottom: 8 }} />
            <SkeletonLoader width="65%" height={14} style={{ marginBottom: 8 }} />
            <SkeletonLoader width="90%" height={14} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.base.white,
  },
  
  // App Loading
  appLoadingContainer: {
    flex: 1,
    backgroundColor: colors.base.white,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.modules.property.primary.main,
    marginBottom: 8,
  },
  messageContainer: {
    alignItems: 'center',
    width: '100%',
  },
  loadingMessage: {
    fontSize: 16,
    color: colors.common.text.secondary,
    marginBottom: 24,
  },
  progressContainer: {
    width: '60%',
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.base.gray[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.modules.property.primary.main,
    borderRadius: 2,
  },
  
  // Common layouts
  headerContainer: {
    padding: 20,
    paddingBottom: 16,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterButton: {
    marginRight: 12,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  
  // Property Cards
  propertyCard: {
    backgroundColor: colors.base.white,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  propertyDetails: {
    padding: 16,
  },
  propertyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  propertyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  // Job Cards
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
    marginTop: 8,
  },
  jobTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  // Chat
  chatContainer: {
    flex: 1,
    backgroundColor: colors.base.white,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.common.border.light,
  },
  chatHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatMessages: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  incomingMessage: {
    justifyContent: 'flex-start',
  },
  outgoingMessage: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 18,
  },
  incomingBubble: {
    backgroundColor: colors.base.gray[100],
  },
  outgoingBubble: {
    backgroundColor: colors.modules.property.primary.light,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.common.border.light,
  },
  
  // Map
  mapContainer: {
    flex: 1,
    backgroundColor: colors.base.gray[100],
  },
  mapSkeleton: {
    flex: 1,
    backgroundColor: colors.base.gray[200],
    position: 'relative',
    overflow: 'hidden',
  },
  mapShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  mapMarker: {
    position: 'absolute',
  },
  mapControls: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  mapButtons: {
    position: 'absolute',
    top: 60,
    right: 20,
    flexDirection: 'column',
    gap: 12,
  },
  mapBottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.base.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  mapPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapPreviewContent: {
    flex: 1,
    marginLeft: 12,
  },
  
  // Notifications
  notificationsList: {
    paddingHorizontal: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.common.border.light,
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  // Generic Content
  contentCard: {
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
});

export default {
  AppLoadingScreen,
  PropertyListingLoading,
  JobsListingLoading,
  ChatLoadingScreen,
  MapLoadingScreen,
  NotificationsLoadingScreen,
  ContentLoadingScreen,
};

/**
 * UserDashboardScreen - Simplified User Dashboard
 * Provides a clean, simple overview of user content and quick actions
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppSelector } from '../../redux/hooks';
import { supabase } from '../../services/supabaseClient';
import { DashboardLoadingScreen } from '../../components/common/EnhancedLoadingStates';

export default function UserDashboardScreen() {
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAppSelector((state) => state.auth);
  
  // Real statistics from database
  const [stats, setStats] = useState({
    properties: 0,
    jobs: 0,
    services: 0,
    unreadMessages: 0,
  });
  
  // Mounted ref to prevent state updates on unmounted component
  const isMountedRef = useRef(true);
  
  // Animation values for entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  // Entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Helper function to add timeout to a promise with better error handling
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        // Don't reject, just resolve with null to continue execution
        resolve(null as unknown as T);
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((_error) => {
          clearTimeout(timeoutId);
          // Don't reject, resolve with null to continue execution
          resolve(null as unknown as T);
        });
    });
  };

  // Track if this is the initial load or a refresh
  const isInitialLoad = useRef(true);

  // Fetch real statistics from database with better error handling
  const fetchStatistics = async (_isRefresh = false) => {
    if (!user) return;

    try {
      // Use 15s timeout for initial load, 10s for refreshes
      const timeoutMs = isInitialLoad.current ? 15000 : 10000;
      
      // After first call, mark as not initial load anymore
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
      }
      
      // Use Promise.all to run queries in parallel for better performance
      // But wrap each in its own timeout to prevent one slow query from blocking others
      const [
        propertiesResult,
        jobsResult,
        servicesResult,
        messagesResult
      ] = await Promise.all([
        // Fetch properties count with individual timeout
        withTimeout(
          (async () => {
            try {
              const { count, error } = await supabase
                .from('property_listings')
                .select('*', { count: 'exact', head: true })
                .eq('owner_id', user.id);
              return {
                count: error ? 0 : count || 0,
                error: error ? error.message : null,
              };
            } catch {
              return { count: 0, error: 'Error fetching properties' };
            }
          })(),
          timeoutMs
        ),
        
        // Fetch jobs count with individual timeout
        withTimeout(
          (async () => {
            try {
              const { count, error } = await supabase
                .from('job_postings')
                .select('*', { count: 'exact', head: true })
                .eq('employer_id', user.id);
              return {
                count: error ? 0 : count || 0,
                error: error ? error.message : null,
              };
            } catch {
              return { count: 0, error: 'Error fetching jobs' };
            }
          })(),
          timeoutMs
        ),
        
        // Fetch services count with individual timeout
        withTimeout(
          (async () => {
            try {
              const { count, error } = await supabase
                .from('service_listings')
                .select('*', { count: 'exact', head: true })
                .eq('owner_id', user.id);
              return {
                count: error ? 0 : count || 0,
                error: error ? error.message : null,
              };
            } catch {
              return { count: 0, error: 'Error fetching services' };
            }
          })(),
          timeoutMs
        ),
        
        // Fetch unread messages count with individual timeout
        withTimeout(
          (async () => {
            try {
              const { count, error } = await supabase
                .from('datemi_messages')
                .select('*', { count: 'exact', head: true })
                .eq('recipient_id', user.id)
                .eq('is_read', false);
              return { 
                count: error ? 0 : count || 0,
                error: error ? error.message : null
              };
            } catch (e) {
              return { count: 0, error: 'Error fetching messages' };
            }
          })(),
          timeoutMs
        )
      ]);

      // Process results - all values will be numbers, with 0 as fallback
      const propertiesCount = propertiesResult?.count || 0;
      const jobsCount = jobsResult?.count || 0;
      const servicesCount = servicesResult?.count || 0;
      const unreadMessages = messagesResult?.count || 0;

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setStats({
          properties: propertiesCount,
          jobs: jobsCount,
          services: servicesCount,
          unreadMessages: unreadMessages,
        });
      }
    } catch (_error) {
      // Reset to 0 on error (safe fallback) if component is still mounted
      if (isMountedRef.current) {
        setStats({
          properties: 0,
          jobs: 0,
          services: 0,
          unreadMessages: 0,
        });
      }
    } finally {
      // Always ensure loading is set to false when done, regardless of success/failure
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Load statistics on mount
  useEffect(() => {
    isMountedRef.current = true;
    
    const loadStats = async () => {
      if (!user) {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
        return;
      }
      
      setIsLoading(true);
      
      try {
        await fetchStatistics();
      } finally {
        // Always ensure loading is set to false when done, regardless of success/failure
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };
    
    loadStats();
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMountedRef.current = false;
    };
  }, [user?.id]); // Only re-run if user ID changes

  const handleRefresh = async () => {
    if (!isMountedRef.current) return;
    
    setRefreshing(true);
    try {
      // Pass true to indicate this is a refresh
      await fetchStatistics(true);
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  };

  // Safe navigation helper
  const safeNavigate = (routeName: string) => {
    try {
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate(routeName);
      }
    } catch (_error) {
      Alert.alert('Navigation Error', `Unable to navigate to ${routeName}. Please try again.`);
    }
  };

  // Dashboard statistics with real data
  const dashboardStats = [
    {
      id: 'properties',
      title: 'Properties',
      value: stats.properties.toString(),
      description: stats.properties === 1 ? 'Active property listing' : 'Active property listings',
      icon: '🏠',
      color: '#10B981',
      onPress: () => safeNavigate('MyProperties')
    },
    {
      id: 'jobs',
      title: 'Jobs',
      value: stats.jobs.toString(),
      description: stats.jobs === 1 ? 'Active job listing' : 'Active job listings',
      icon: '💼',
      color: '#3B82F6',
      onPress: () => safeNavigate('MyPostings')
    },
    {
      id: 'services',
      title: 'Services',
      value: stats.services.toString(),
      description: stats.services === 1 ? 'Service offering' : 'Service offerings',
      icon: '🔧',
      color: '#8B5CF6',
      onPress: () => safeNavigate('MyServices')
    },
    {
      id: 'messages',
      title: 'Messages',
      value: stats.unreadMessages.toString(),
      description: stats.unreadMessages === 1 ? 'Unread message' : 'Unread messages',
      icon: '💬',
      color: '#EC4899',
      onPress: () => safeNavigate('Inquiries')
    },
  ];

  // Quick actions
  const quickActions = [
    {
      id: 'add-property',
      title: 'Add Property',
      description: 'List a new property for rent or sale',
      icon: '🏡',
      action: () => safeNavigate('PostProperty'),
    },
    {
      id: 'post-job',
      title: 'Post Job',
      description: 'Create a new job listing',
      icon: '📋',
      action: () => safeNavigate('PostJob'),
    },
    {
      id: 'add-service',
      title: 'Add Service',
      description: 'Offer a new service to the community',
      icon: '🛠️',
      action: () => safeNavigate('PostService'),
    },
  ];

  // Recent activity - only show if user has actual content
  const hasContent = stats.properties > 0 || stats.jobs > 0 || stats.services > 0;
  const notificationsAndEvents = hasContent ? [
    {
      id: 'view-properties',
      type: 'action',
      title: 'Manage Your Properties',
      description: `You have ${stats.properties} active property ${stats.properties === 1 ? 'listing' : 'listings'}`,
      time: '',
      action: () => safeNavigate('MyProperties'),
      icon: '🏠',
      color: '#10B981',
    },
    {
      id: 'view-jobs',
      type: 'action',
      title: 'Manage Your Jobs',
      description: `You have ${stats.jobs} active job ${stats.jobs === 1 ? 'listing' : 'listings'}`,
      time: '',
      action: () => safeNavigate('MyPostings'),
      icon: '💼',
      color: '#3B82F6',
    },
    {
      id: 'view-services',
      type: 'action',
      title: 'Manage Your Services',
      description: `You have ${stats.services} service ${stats.services === 1 ? 'offering' : 'offerings'}`,
      time: '',
      action: () => safeNavigate('MyServices'),
      icon: '🔧',
      color: '#8B5CF6',
    },
  ].filter(item => {
    // Only show items where user has content
    if (item.id === 'view-properties' && stats.properties > 0) return true;
    if (item.id === 'view-jobs' && stats.jobs > 0) return true;
    if (item.id === 'view-services' && stats.services > 0) return true;
    return false;
  }) : [];

  // Community insights
  const communityInsights = [
    {
      id: 'trending',
      title: 'Trending in Your Area',
      description: 'Property prices have increased by 5% this month',
      icon: '📈',
      action: () => Alert.alert('Market Trends', 'Detailed market analysis coming soon!'),
    },
    {
      id: 'popular',
      title: 'Popular Services',
      description: 'Home cleaning and painting are in high demand',
      icon: '⭐',
      action: () => Alert.alert('Popular Services', 'Detailed service trends coming soon!'),
    },
    {
      id: 'jobs',
      title: 'Job Market Update',
      description: 'IT and healthcare positions are most sought after',
      icon: '💼',
      action: () => Alert.alert('Job Market', 'Detailed job market analysis coming soon!'),
    },
  ];

  // Stat card component
  const StatCard = ({ stat }: { stat: any }) => (
    <TouchableOpacity 
      style={styles.statCard} 
      onPress={stat.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.statCardTop}>
        <View style={[styles.iconContainer, { backgroundColor: `${stat.color}20` }]}>
          <Text style={styles.icon}>{stat.icon}</Text>
        </View>
        <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
      </View>
      <Text style={styles.statTitle}>{stat.title}</Text>
      <Text style={styles.statDescription}>{stat.description}</Text>
    </TouchableOpacity>
  );

  // Action card component
  const ActionCard = ({ action }: { action: any }) => (
    <TouchableOpacity 
      style={styles.actionCard} 
      onPress={action.action}
      activeOpacity={0.7}
    >
      <View style={styles.actionLeft}>
        <View style={styles.actionIconContainer}>
          <Text style={styles.actionIcon}>{action.icon}</Text>
        </View>
        <View style={styles.actionContent}>
          <Text style={styles.actionTitle}>{action.title}</Text>
          <Text style={styles.actionDescription}>{action.description}</Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  // Notification card component
  const NotificationCard = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.notificationCard} 
      onPress={item.action}
      activeOpacity={0.7}
    >
      <View style={styles.notificationLeft}>
        <View style={[styles.notificationIconContainer, { backgroundColor: `${item.color}20` }]}>
          <Text style={styles.notificationIcon}>{item.icon}</Text>
        </View>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationDescription}>{item.description}</Text>
          <Text style={styles.notificationTime}>{item.time}</Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  // Insight card component
  const InsightCard = ({ insight }: { insight: any }) => (
    <TouchableOpacity 
      style={styles.insightCard} 
      onPress={insight.action}
      activeOpacity={0.7}
    >
      <View style={styles.insightTop}>
        <Text style={styles.insightIcon}>{insight.icon}</Text>
        <Text style={styles.insightTitle}>{insight.title}</Text>
      </View>
      <Text style={styles.insightDescription}>{insight.description}</Text>
    </TouchableOpacity>
  );

  // Guard against missing user
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateIcon}>⚠️</Text>
          <Text style={styles.emptyStateTitle}>Not Logged In</Text>
          <Text style={styles.emptyStateDescription}>
            Please log in to view your dashboard
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <DashboardLoadingScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
        >
          {/* Welcome Banner */}
          <Animated.View style={[
            styles.welcomeBanner,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 25],
                  extrapolate: 'clamp'
                })
              }]
            }
          ]}>
            <View>
              <Text style={styles.welcomeTitle}>Welcome back!</Text>
              <Text style={styles.welcomeSubtitle}>Here's what's happening with your listings</Text>
            </View>
          </Animated.View>

          {/* Dashboard Stats */}
          <Animated.View style={[
            styles.section,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 20],
                  extrapolate: 'clamp'
                })
              }]
            }
          ]}>
            <Text style={styles.sectionTitle}>📊 Your Statistics</Text>
            <View style={styles.statsGrid}>
              {dashboardStats.map((stat) => (
                <StatCard key={stat.id} stat={stat} />
              ))}
            </View>
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View style={[
            styles.section,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 15],
                  extrapolate: 'clamp'
                })
              }]
            }
          ]}>
            <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
            <View style={styles.actionsList}>
              {quickActions.map((action) => (
                <ActionCard key={action.id} action={action} />
              ))}
            </View>
          </Animated.View>

          {/* Recent Activity - Only show if user has content */}
          {hasContent && notificationsAndEvents.length > 0 && (
            <Animated.View style={[
              styles.section,
              {
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 50],
                    outputRange: [0, 10],
                    extrapolate: 'clamp'
                  })
                }]
              }
            ]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🔔 Manage Your Content</Text>
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => safeNavigate('Notifications')}
                >
                  <Text style={styles.viewAllButtonText}>View All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.notificationsList}>
                {notificationsAndEvents.map((item) => (
                  <NotificationCard key={item.id} item={item} />
                ))}
              </View>
            </Animated.View>
          )}

          {/* Empty state when no content */}
          {!hasContent && (
            <Animated.View style={[
              styles.section,
              {
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 50],
                    outputRange: [0, 10],
                    extrapolate: 'clamp'
                  })
                }]
              }
            ]}>
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateIcon}>📊</Text>
                <Text style={styles.emptyStateTitle}>No Content Yet</Text>
                <Text style={styles.emptyStateDescription}>
                  Start by creating your first property, job, or service listing using the quick actions above!
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Community Insights */}
          <Animated.View style={[
            styles.section,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 5],
                  extrapolate: 'clamp'
                })
              }]
            }
          ]}>
            <Text style={styles.sectionTitle}>🌍 Community Insights</Text>
            <View style={styles.insightsList}>
              {communityInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </View>
          </Animated.View>

        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    backgroundColor: '#f8fafc',
  },
  welcomeBanner: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  viewAllButton: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  viewAllButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  statCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  statDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionsList: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  arrow: {
    fontSize: 20,
    color: '#9CA3AF',
    fontWeight: '300',
  },
  notificationsList: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  notificationIcon: {
    fontSize: 18,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  insightsList: {
    gap: 12,
  },
  insightCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 4,
  },
  insightTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  insightDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

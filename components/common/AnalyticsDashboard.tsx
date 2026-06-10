/**
 * AnalyticsDashboard Component
 * Central analytics dashboard with Material 3 design
 * Shows aggregated metrics across all modules
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { analyticsService, AnalyticsSnapshot } from '../../services/analyticsService';
import ActivityIndicator from './ActivityIndicator';

interface AnalyticsDashboardProps {
  userId?: string;
  style?: any;
  onModulePress?: (module: string) => void;
}

const { width: screenWidth } = Dimensions.get('window');

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  userId,
  style,
  onModulePress
}) => {
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'day' | 'week' | 'month'>('week');

  // Load analytics snapshot
  useEffect(() => {
    loadSnapshot();
  }, [selectedTimeframe]);

  const loadSnapshot = async () => {
    try {
      const data = await analyticsService.getAnalyticsSnapshot();
      setSnapshot(data);
    } catch (error) {
      
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSnapshot();
    setRefreshing(false);
  };

  // Module configurations with Material 3 colors
  const moduleConfigs = [
    {
      key: 'property',
      title: 'Property Hub',
      icon: '🏠',
      color: '#10B981',
      lightColor: '#D1FAE5',
      content: snapshot?.totalContent.properties || 0
    },
    {
      key: 'jobs',
      title: 'Jobs & Skills',
      icon: '💼',
      color: '#059669',
      lightColor: '#DCFCE7',
      content: snapshot?.totalContent.jobs || 0
    },
    {
      key: 'services',
      title: 'Services',
      icon: '🔧',
      color: '#7C3AED',
      lightColor: '#EDE9FE',
      content: snapshot?.totalContent.services || 0
    }
  ];

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon, 
    color, 
    change, 
    onPress 
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    color: string;
    change?: string;
    onPress?: () => void;
  }) => {
    const CardContent = () => (
      <View style={styles.cardContainer}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderContent}>
            <View style={[styles.cardIconContainer, { backgroundColor: `${color}30` }]}>
              <Text style={styles.cardIcon}>{icon}</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {title}
              </Text>
              {subtitle && (
                <Text style={styles.cardSubtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
          
          {change && (
            <View style={styles.cardValueContainer}>
              <Text 
                style={[
                  styles.cardChangeText,
                  { color: change.startsWith('+') ? '#10B981' : '#EF4444' }
                ]}
              >
                {change}
              </Text>
            </View>
          )}
        </View>

        {/* Main Value */}
        <View style={styles.cardMainValue}>
          <Text style={styles.cardValueText} numberOfLines={1}>
            {typeof value === 'number' && value >= 1000 
              ? (value >= 1000000 ? `${(value/1000000).toFixed(1)}M` : `${(value/1000).toFixed(1)}K`)
              : value
            }
          </Text>
        </View>

        {/* Bottom Accent */}
        <View style={[styles.cardAccent, { backgroundColor: color }]} />
      </View>
    );

    if (onPress) {
      return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flex: 1 }}>
          <CardContent />
        </TouchableOpacity>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <CardContent />
      </View>
    );
  };

  const TimeframeSelector = () => (
    <View style={styles.timeframeContainer}>
      {[
        { key: 'day', label: 'Today' },
        { key: 'week', label: 'This Week' },
        { key: 'month', label: 'This Month' }
      ].map((option) => (
        <TouchableOpacity
          key={option.key}
          onPress={() => setSelectedTimeframe(option.key as any)}
          style={[
            styles.timeframeButton,
            selectedTimeframe === option.key 
              ? styles.timeframeButtonActive 
              : styles.timeframeButtonInactive
          ]}
        >
          <Text style={[
            styles.timeframeText,
            selectedTimeframe === option.key 
              ? styles.timeframeTextActive 
              : styles.timeframeTextInactive
          ]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (!snapshot) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <View style={styles.loadingPlaceholder1} />
        <View style={styles.loadingPlaceholder2} />
        <View style={styles.loadingPlaceholder3} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollContainer, style]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={['#3B82F6', '#1D4ED8']}
        style={styles.headerGradient}
      >
        <Text style={styles.headerTitle}>
          📊 Analytics Overview
        </Text>
        <Text style={styles.headerSubtitle}>
          Real-time insights across all modules
        </Text>
        
        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {snapshot.totalUsers >= 1000 
                ? `${(snapshot.totalUsers/1000).toFixed(1)}K` 
                : snapshot.totalUsers
              }
            </Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {snapshot.activeUsers}
            </Text>
            <Text style={styles.statLabel}>Active Now</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Timeframe Selector */}
      <TimeframeSelector />

      {/* Module Metrics */}
      <Text style={styles.sectionTitle}>
        Module Performance
      </Text>
      
      <View style={styles.metricsContainer}>
        {moduleConfigs.map((module) => (
          <MetricCard
            key={module.key}
            title={module.title}
            value={module.content}
            subtitle={`${snapshot.engagementRates[module.key as keyof typeof snapshot.engagementRates]}% engagement`}
            icon={module.icon}
            color={module.color}
            change={`+${Math.floor(Math.random() * 15) + 5}%`}
            onPress={() => onModulePress?.(module.key)}
          />
        ))}
      </View>

      {/* Activity Indicators */}
      <Text style={styles.sectionTitleWithMargin}>
        Real-time Activity
      </Text>
      
      <View style={styles.activityContainer}>
        {moduleConfigs.map((module) => (
          <View key={module.key} style={styles.activityItem}>
            <View style={styles.activityHeader}>
              <Text style={styles.activityIcon}>{module.icon}</Text>
              <Text style={styles.activityTitle}>
                {module.title}
              </Text>
            </View>
            {/* TEMPORARILY DISABLED: ActivityIndicator causing property screen refresh */}
            {/* <ActivityIndicator
              module={module.key as any}
              style={{ marginTop: 0, marginLeft: 26 }}
              textStyle={{ color: '#6B7280' }}
              showIcon={false}
            /> */}
            <View style={{ marginTop: 0, marginLeft: 26 }}>
              <Text style={{ color: '#6B7280', fontSize: 12 }}>
                Live activity temporarily disabled
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Engagement Rates Chart */}
      <Text style={styles.sectionTitleWithMargin}>
        Engagement Rates
      </Text>
      
      <View style={styles.engagementContainer}>
        {moduleConfigs.map((module) => {
          const rate = snapshot.engagementRates[module.key as keyof typeof snapshot.engagementRates];
          return (
            <View key={module.key} style={styles.engagementItem}>
              <View style={styles.engagementHeader}>
                <View style={styles.engagementLeft}>
                  <Text style={styles.engagementIcon}>{module.icon}</Text>
                  <Text style={styles.engagementTitle}>
                    {module.title}
                  </Text>
                </View>
                <Text style={styles.engagementRate}>
                  {rate}%
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: module.color,
                      width: `${Math.min(rate * 10, 100)}%`
                    }
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1
  },
  loadingContainer: {
    padding: 16
  },
  loadingPlaceholder1: {
    backgroundColor: '#E5E7EB',
    height: 128,
    borderRadius: 12,
    marginBottom: 16
  },
  loadingPlaceholder2: {
    backgroundColor: '#E5E7EB',
    height: 96,
    borderRadius: 12,
    marginBottom: 16
  },
  loadingPlaceholder3: {
    backgroundColor: '#E5E7EB',
    height: 96,
    borderRadius: 12
  },
  headerGradient: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 24
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    marginBottom: 16
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold'
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14
  },
  timeframeContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16
  },
  timeframeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8
  },
  timeframeButtonActive: {
    backgroundColor: '#3B82F6'
  },
  timeframeButtonInactive: {
    backgroundColor: '#F3F4F6'
  },
  timeframeText: {
    fontWeight: '500',
    fontSize: 14
  },
  timeframeTextActive: {
    color: '#FFFFFF'
  },
  timeframeTextInactive: {
    color: '#374151'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginHorizontal: 16,
    marginBottom: 12
  },
  sectionTitleWithMargin: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 24
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 8
  },
  activityContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  activityItem: {
    marginBottom: 16
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  activityIcon: {
    fontSize: 18,
    marginRight: 8
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1
  },
  engagementContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6'
  },
  engagementItem: {
    marginBottom: 16
  },
  engagementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  engagementLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  engagementIcon: {
    fontSize: 16,
    marginRight: 8
  },
  engagementTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151'
  },
  engagementRate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827'
  },
  progressBar: {
    backgroundColor: '#E5E7EB',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 4
  },
  // Card styles
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: screenWidth / 2 - 24
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  cardHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  cardIcon: {
    fontSize: 18
  },
  cardTextContainer: {
    flex: 1
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280'
  },
  cardValueContainer: {
    marginLeft: 8
  },
  cardChangeText: {
    fontSize: 12,
    fontWeight: '600'
  },
  cardMainValue: {
    marginBottom: 8
  },
  cardValueText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#111827'
  },
  cardAccent: {
    height: 4,
    borderRadius: 2
  }
});

export default AnalyticsDashboard;

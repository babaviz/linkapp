/**
 * PropertyAnalyticsCard Component
 * Displays analytics data for property owners
 * Material 3 compliant design
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface PropertyAnalyticsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
  };
  color?: string;
  onPress?: () => void;
}

const PropertyAnalyticsCard: React.FC<PropertyAnalyticsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = '#0D9488',
  onPress
}) => {
  const getTrendIcon = () => {
    if (!trend) return '';
    switch (trend.direction) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      default: return '➡️';
    }
  };

  const getTrendColor = () => {
    if (!trend) return '#6B7280';
    switch (trend.direction) {
      case 'up': return '#10B981';
      case 'down': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const CardContent = () => (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <View 
            style={[
              styles.iconContainer,
              { backgroundColor: `${color}20` }
            ]}
          >
            <Text style={styles.iconText}>{icon}</Text>
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.titleText} numberOfLines={1}>
              {title}
            </Text>
          </View>
        </View>
        
        {trend && (
          <View style={styles.trendContainer}>
            <Text style={[
              styles.trendText,
              { color: getTrendColor() }
            ]}>
              {getTrendIcon()} {trend.percentage}%
            </Text>
          </View>
        )}
      </View>

      {/* Main Value */}
      <View style={styles.valueSection}>
        <Text style={styles.valueText} numberOfLines={1}>
          {value}
        </Text>
        {subtitle && (
          <Text style={styles.subtitleText} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Bottom Border */}
      <View style={[
        styles.bottomBorder,
        { backgroundColor: color }
      ]} />
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <CardContent />
      </TouchableOpacity>
    );
  }

  return <CardContent />;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
  },
  titleContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  valueSection: {
    marginBottom: 8,
  },
  valueText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitleText: {
    fontSize: 14,
    color: '#6B7280',
  },
  bottomBorder: {
    height: 4,
    borderRadius: 2,
  },
});

export default PropertyAnalyticsCard;

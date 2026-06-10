/**
 * ProfileCardSkeleton Component
 * Skeleton loader specifically designed for Date Mi profile cards
 */

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import SkeletonLoader from '../common/SkeletonLoader';

const { width: screenWidth } = Dimensions.get('window');
const GRID_SIDE_PADDING = 20;
const GRID_COLUMN_GAP = 8;
const cardWidth = (screenWidth - GRID_SIDE_PADDING * 2 - GRID_COLUMN_GAP) / 2;

interface ProfileCardSkeletonProps {
  style?: object;
}

export const ProfileCardSkeleton: React.FC<ProfileCardSkeletonProps> = ({ style }) => {
  return (
    <View style={[styles.profileCard, style]}>
      <View style={styles.profileImageContainer}>
        {/* Main image skeleton */}
        <SkeletonLoader
          width="100%"
          height="100%"
          borderRadius={16}
          shimmerColors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
          animationSpeed={2000}
        />
        
        {/* Overlay gradient area (name + location) */}
        <View style={styles.overlayArea}>
          <SkeletonLoader
            width="80%"
            height={16}
            borderRadius={8}
            shimmerColors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
            style={{ marginBottom: 6 }}
          />
          <SkeletonLoader
            width="60%"
            height={12}
            borderRadius={6}
            shimmerColors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
          />
        </View>
      </View>
    </View>
  );
};

interface ProfileGridSkeletonProps {
  count?: number;
}

export const ProfileGridSkeleton: React.FC<ProfileGridSkeletonProps> = ({ count = 6 }) => {
  return (
    <View style={styles.profilesGrid}>
      {Array.from({ length: count }).map((_, index) => (
        <ProfileCardSkeleton key={`skeleton-${index}`} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  profileCard: {
    width: cardWidth,
    marginBottom: 6,
  },
  profileImageContainer: {
    position: 'relative',
    aspectRatio: 3/4,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  overlayArea: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  profilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});

export default ProfileCardSkeleton;

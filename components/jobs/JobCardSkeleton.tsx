import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonLoader } from '../common';
import { spacing } from '../../utils/responsive';

interface JobCardSkeletonProps {
  isTablet: boolean;
}

export const JobCardSkeleton = React.memo<JobCardSkeletonProps>(({ isTablet }) => {
  const cardMargin = isTablet ? spacing.lg : spacing.md;
  const cardPadding = isTablet ? spacing.xl : spacing.lg;

  return (
    <View
      style={{
        marginHorizontal: cardMargin,
        marginBottom: spacing.md,
      }}
    >
      {/* Job Card Skeleton */}
      <View 
        style={[
          styles.card,
          {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 8,
            padding: cardPadding,
          }
        ]}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.headerContent}>
            {/* Job Title */}
            <SkeletonLoader 
              width="85%" 
              height={isTablet ? 28 : 24} 
              borderRadius={8}
              style={{ marginBottom: spacing.xs }}
            />
            
            {/* Company */}
            <View style={styles.companyRow}>
              <SkeletonLoader 
                width={isTablet ? 10 : 8} 
                height={isTablet ? 10 : 8} 
                borderRadius={50}
                style={{ marginRight: spacing.xs }}
              />
              <SkeletonLoader width={120} height={16} borderRadius={4} />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <SkeletonLoader width={40} height={40} borderRadius={20} />
            <SkeletonLoader width={40} height={40} borderRadius={20} />
          </View>
        </View>

        {/* Tags */}
        <View style={styles.tagsRow}>
          <SkeletonLoader width={60} height={24} borderRadius={12} style={{ marginRight: spacing.xs, marginBottom: spacing.xs }} />
          <SkeletonLoader width={80} height={24} borderRadius={12} style={{ marginRight: spacing.xs, marginBottom: spacing.xs }} />
          <SkeletonLoader width={70} height={24} borderRadius={12} style={{ marginRight: spacing.xs, marginBottom: spacing.xs }} />
        </View>

        {/* Salary Section */}
        <View style={styles.salarySection}>
          <View style={styles.salaryRow}>
            <SkeletonLoader width={150} height={isTablet ? 28 : 24} borderRadius={4} />
            <SkeletonLoader width={40} height={20} borderRadius={10} />
          </View>
        </View>

        {/* Description */}
        <View style={styles.descriptionSection}>
          <SkeletonLoader width="100%" height={16} borderRadius={4} style={{ marginBottom: 4 }} />
          <SkeletonLoader width="75%" height={16} borderRadius={4} />
        </View>

        {/* Skills Section */}
        <View style={styles.skillsSection}>
          <SkeletonLoader width={100} height={12} borderRadius={4} style={{ marginBottom: spacing.xs }} />
          <View style={styles.skillsRow}>
            <SkeletonLoader width={50} height={24} borderRadius={8} style={{ marginRight: spacing.xs, marginBottom: spacing.xs }} />
            <SkeletonLoader width={65} height={24} borderRadius={8} style={{ marginRight: spacing.xs, marginBottom: spacing.xs }} />
            <SkeletonLoader width={45} height={24} borderRadius={8} style={{ marginRight: spacing.xs, marginBottom: spacing.xs }} />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <View style={styles.footerLeft}>
              <SkeletonLoader 
                width={isTablet ? 32 : 24} 
                height={isTablet ? 32 : 24} 
                borderRadius={50}
                style={{ marginRight: spacing.xs }}
              />
              <SkeletonLoader width={80} height={14} borderRadius={4} />
            </View>
            
            <View style={styles.footerRight}>
              <SkeletonLoader width={60} height={36} borderRadius={18} />
              <SkeletonLoader width={isTablet ? 100 : 80} height={36} borderRadius={18} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerContent: {
    flex: 1,
    marginRight: 12,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  salarySection: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  descriptionSection: {
    marginBottom: 16,
  },
  skillsSection: {
    marginBottom: 16,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  footer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerRight: {
    flexDirection: 'row',
    gap: 12,
  },
});

JobCardSkeleton.displayName = 'JobCardSkeleton';

export default JobCardSkeleton;

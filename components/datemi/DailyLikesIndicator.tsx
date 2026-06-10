import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { MaterialIcons } from '@expo/vector-icons';
import usePremiumAccess from '../../hooks/usePremiumAccess';

interface DailyLikesIndicatorProps {
  onUpgrade?: () => void;
}

export default function DailyLikesIndicator({ onUpgrade }: DailyLikesIndicatorProps) {
  const dailyLikes = useSelector((state: RootState) => state.datemi.dailyLikes);
  const premiumAccess = usePremiumAccess();

  // Calculate remaining likes
  const remaining = useMemo(() => {
    return Math.max(0, dailyLikes.limit - dailyLikes.count);
  }, [dailyLikes.count, dailyLikes.limit]);

  // Check if user has unlimited likes (Pro/Premium tier or reviewer override)
  const hasUnlimitedLikes = premiumAccess.canAccess('unlimitedLikes');

  // Calculate percentage for visual indicator
  const percentage = useMemo(() => {
    if (hasUnlimitedLikes) return 100;
    return (remaining / dailyLikes.limit) * 100;
  }, [remaining, dailyLikes.limit, hasUnlimitedLikes]);

  // Get color based on remaining likes
  const getColor = () => {
    if (hasUnlimitedLikes) return '#FFD700'; // Gold for unlimited
    if (percentage > 60) return '#4ADE80'; // Green
    if (percentage > 30) return '#FBBF24'; // Yellow
    return '#F87171'; // Red
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="favorite" size={16} color={getColor()} />
        <Text style={styles.title}>
          {hasUnlimitedLikes ? 'Unlimited Likes' : 'Daily Likes'}
        </Text>
      </View>

      {!hasUnlimitedLikes && (
        <>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${percentage}%`,
                    backgroundColor: getColor()
                  }
                ]} 
              />
            </View>
            <Text style={styles.countText}>
              {remaining}/{dailyLikes.limit}
            </Text>
          </View>

          {remaining === 0 && (
            <View style={styles.warningContainer}>
              <MaterialIcons name="info" size={14} color="#F87171" />
              <Text style={styles.warningText}>
                No likes remaining today
              </Text>
            </View>
          )}

          {onUpgrade && (
            <TouchableOpacity onPress={onUpgrade} style={styles.upgradeButton}>
              <MaterialIcons name="star" size={14} color="#FFD700" />
              <Text style={styles.upgradeText}>
                Upgrade for unlimited likes
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {hasUnlimitedLikes && (
        <View style={styles.premiumBadge}>
          <MaterialIcons name="verified" size={14} color="#FFD700" />
          <Text style={styles.premiumText}>
            {premiumAccess.currentTier === 'premium' ? 'Premium' : 'Pro'} Member
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 4,
  },
  warningText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '500',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    gap: 4,
  },
  upgradeText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '600',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  premiumText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
});

import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Alert, Share, StyleSheet } from 'react-native';
import { spacing, fontSize, getIconSize } from '../../utils/responsive';
import { formatLocationDisplay } from '../../utils/locationHelpers';
import { useAppSelector } from '../../redux/hooks';
import { formatCurrency } from '../../utils/currencyHelpers';

interface Job {
  id: string;
  title: string;
  employer: {
    company?: string;
    name: string;
    verified?: boolean;
  };
  location: {
    town: string;
    county: string;
  };
  job_type: string;
  experience_level: string;
  salary: {
    min: number;
    max: number;
    period: string;
  };
  description: string;
  requirements?: Array<{ skill: string }>;
  applications_count?: number;
  deadline?: string;
  is_featured?: boolean;
}

interface OptimizedJobCardProps {
  job: Job;
  index: number;
  isTablet: boolean;
  onApply: (jobId: string) => void;
  onSave: (jobId: string) => void;
  onViewDetails: (jobId: string) => void;
  isSaved?: boolean;
  isApplied?: boolean;
}

export const OptimizedJobCard = React.memo<OptimizedJobCardProps>(({
  job,
  index,
  isTablet,
  onApply,
  onSave,
  onViewDetails,
  isSaved = false,
  isApplied = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const cardMargin = isTablet ? spacing.lg : spacing.md;
  const cardPadding = isTablet ? spacing.xl : spacing.lg;
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handleCardPress = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    
    Animated.timing(expandAnim, {
      toValue: newExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, expandAnim]);

  const handleApply = useCallback(async () => {
    if (isApplied) {
      Alert.alert('Already Applied', 'You have already applied to this job.');
      return;
    }
    
    setActionLoading('apply');
    try {
      await onApply(job.id);
    } finally {
      setActionLoading(null);
    }
  }, [job.id, isApplied, onApply]);

  const handleSave = useCallback(async () => {
    setActionLoading('save');
    try {
      await onSave(job.id);
    } finally {
      setActionLoading(null);
    }
  }, [job.id, onSave]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out this job: ${job.title} at ${job.employer.company || job.employer.name}`,
        title: job.title,
      });
    } catch (error) {
      
    }
  }, [job]);

  const handleViewDetails = useCallback(() => {
    onViewDetails(job.id);
  }, [job.id, onViewDetails]);

  const daysLeft = job.deadline ? 
    Math.ceil((new Date(job.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
        marginHorizontal: cardMargin,
        marginBottom: spacing.md,
      }}
    >
      <TouchableOpacity 
        style={[
          styles.cardContainer,
          {
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 4,
            },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 8,
          }
        ]}
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handleCardPress}
      >
        {/* Premium Job Indicator */}
        {job.is_featured && (
          <View style={styles.premiumIndicator}>
            <View style={[
              styles.premiumBadge,
              { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }
            ]}>
              <Text style={{ color: 'white', fontSize: fontSize.xs, fontWeight: 'bold' }}>✨ PREMIUM</Text>
            </View>
          </View>
        )}

        {/* Job Header */}
        <View style={{ padding: cardPadding, paddingBottom: spacing.sm }}>
          <View style={[styles.headerRow, { marginBottom: spacing.sm }]}>
            <View style={[styles.headerLeft, { marginRight: spacing.sm }]}>
              <Text 
                style={{ 
                  fontSize: isTablet ? fontSize.xl : fontSize.lg,
                  fontWeight: 'bold',
                  color: '#111827',
                  lineHeight: isTablet ? 28 : 24
                }} 
                numberOfLines={2}
              >
                {job.title}
              </Text>
              <View style={[styles.companyRow, { marginTop: spacing.xs }]}>
                <View 
                  style={[
                    styles.companyDot,
                    { 
                      width: isTablet ? 10 : 8, 
                      height: isTablet ? 10 : 8, 
                      marginRight: spacing.xs 
                    }
                  ]} 
                />
                <Text style={{ fontSize: fontSize.sm, color: '#059669', fontWeight: '600' }}>
                  {job.employer.company || job.employer.name}
                </Text>
                {job.employer.verified && (
                  <View style={[
                    styles.verifiedBadge,
                    { marginLeft: spacing.xs, paddingHorizontal: spacing.xs, paddingVertical: 2 }
                  ]}>
                    <Text style={{ color: '#15803d', fontSize: fontSize.xs, fontWeight: '500' }}>✓ Verified</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Quick Actions */}
            <View style={[styles.quickActions, { gap: spacing.xs }]}>
              <TouchableOpacity 
                onPress={handleSave}
                disabled={actionLoading === 'save'}
                style={[
                  styles.quickActionButton,
                  { backgroundColor: isSaved ? '#fef3c7' : '#f3f4f6' }
                ]}
              >
                <Text style={{ fontSize: fontSize.sm }}>
                  {actionLoading === 'save' ? '⏳' : isSaved ? '❤️' : '🤍'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleShare}
                style={[styles.quickActionButton, styles.shareButton]}
              >
                <Text style={{ fontSize: fontSize.sm }}>📤</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Job Meta Tags */}
          <View style={[styles.tagsContainer, { marginBottom: spacing.sm }]}>
            <View 
              style={[
                styles.tag,
                styles.locationTag,
                { 
                  paddingHorizontal: spacing.sm, 
                  paddingVertical: spacing.xs, 
                  marginRight: spacing.xs, 
                  marginBottom: spacing.xs 
                }
              ]}
            >
              <Text style={{ color: '#1d4ed8', fontSize: fontSize.xs, fontWeight: '500' }}>
                📍 {formatLocationDisplay(job.location)}
              </Text>
            </View>
            <View 
              style={[
                styles.tag,
                styles.jobTypeTag,
                { 
                  paddingHorizontal: spacing.sm, 
                  paddingVertical: spacing.xs, 
                  marginRight: spacing.xs, 
                  marginBottom: spacing.xs 
                }
              ]}
            >
              <Text style={{ color: '#7c3aed', fontSize: fontSize.xs, fontWeight: '500', textTransform: 'capitalize' }}>
                💼 {job.job_type.replace('_', ' ')}
              </Text>
            </View>
            <View 
              style={[
                styles.tag,
                styles.experienceTag,
                { 
                  paddingHorizontal: spacing.sm, 
                  paddingVertical: spacing.xs, 
                  marginBottom: spacing.xs 
                }
              ]}
            >
              <Text style={{ color: '#047857', fontSize: fontSize.xs, fontWeight: '500', textTransform: 'capitalize' }}>
                🎯 {job.experience_level.replace('_', ' ')}
              </Text>
            </View>
          </View>

          {/* Salary Highlight */}
          <View 
            style={[
              styles.salaryContainer,
              { padding: spacing.sm, marginBottom: spacing.sm }
            ]}
          >
            <View style={styles.salaryRow}>
              <View style={styles.salaryAmount}>
                <Text style={{ 
                  fontSize: isTablet ? fontSize['2xl'] : fontSize.xl, 
                  fontWeight: 'bold', 
                  color: '#059669' 
                }}>
                  {(() => {
                    const user = useAppSelector((state) => state.auth.user);
                    const userCountry = user?.location?.county;
                    return formatCurrency(job.salary.min, userCountry);
                  })()}
                </Text>
                {job.salary.max !== job.salary.min && (
                  <Text style={{ 
                    fontSize: isTablet ? fontSize['2xl'] : fontSize.xl, 
                    fontWeight: 'bold', 
                    color: '#059669' 
                  }}> - {job.salary.max.toLocaleString()}</Text>
                )}
              </View>
              <View 
                style={[
                  styles.salaryPeriodBadge,
                  { paddingHorizontal: spacing.xs, paddingVertical: spacing.xs }
                ]}
              >
                <Text style={{ color: '#15803d', fontSize: fontSize.xs, fontWeight: 'bold' }}>
                  /{job.salary.period}
                </Text>
              </View>
            </View>
          </View>

          {/* Expandable Description */}
          <Text 
            style={{ 
              fontSize: fontSize.sm, 
              color: '#4b5563', 
              lineHeight: isTablet ? 24 : 20, 
              marginBottom: spacing.sm 
            }} 
            numberOfLines={isExpanded ? undefined : 2}
          >
            {job.description}
          </Text>

          {/* Expandable Skills Preview */}
          {job.requirements && job.requirements.length > 0 && (
            <Animated.View 
              style={{ 
                marginBottom: spacing.sm,
                maxHeight: expandAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [60, 200],
                }),
                overflow: 'hidden',
              }}
            >
              <Text style={{ 
                fontSize: fontSize.xs, 
                fontWeight: '600', 
                color: '#374151', 
                marginBottom: spacing.xs 
              }}>
                Required Skills:
              </Text>
              <View style={styles.skillsContainer}>
                {job.requirements.slice(0, isExpanded ? undefined : 3).map((req: any, index: number) => (
                  <View 
                    key={index} 
                    style={[
                      styles.skillTag,
                      { 
                        paddingHorizontal: spacing.xs, 
                        paddingVertical: spacing.xs, 
                        marginRight: spacing.xs, 
                        marginBottom: spacing.xs 
                      }
                    ]}
                  >
                    <Text style={{ fontSize: fontSize.xs, color: '#374151', fontWeight: '500' }}>
                      {req.skill}
                    </Text>
                  </View>
                ))}
                {!isExpanded && job.requirements.length > 3 && (
                  <View 
                    style={[
                      styles.moreSkillsTag,
                      { 
                        paddingHorizontal: spacing.xs, 
                        paddingVertical: spacing.xs, 
                        marginBottom: spacing.xs 
                      }
                    ]}
                  >
                    <Text style={{ color: '#059669', fontSize: fontSize.xs, fontWeight: '500' }}>
                      +{job.requirements.length - 3} more
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}
        </View>

        {/* Footer */}
        <View 
          style={[
            styles.footer,
            { paddingHorizontal: cardPadding, paddingVertical: spacing.md }
          ]}
        >
          <View style={styles.footerContent}>
            <View style={[styles.footerInfo, { gap: spacing.md }]}>
              <View style={styles.infoItem}>
                <View 
                  style={[
                    styles.infoIcon,
                    styles.applicantsIcon,
                    { 
                      width: isTablet ? getIconSize('md') : getIconSize('sm'), 
                      height: isTablet ? getIconSize('md') : getIconSize('sm'), 
                      marginRight: spacing.xs 
                    }
                  ]}
                >
                  <Text style={{ color: '#2563eb', fontSize: fontSize.xs }}>👥</Text>
                </View>
                <Text style={{ fontSize: fontSize.sm, color: '#4b5563', fontWeight: '500' }}>
                  {job.applications_count || 0} applicants
                </Text>
              </View>
              
              {daysLeft && daysLeft > 0 && (
                <View style={styles.infoItem}>
                  <View 
                    style={[
                      styles.infoIcon,
                      styles.deadlineIcon,
                      { 
                        width: isTablet ? getIconSize('md') : getIconSize('sm'), 
                        height: isTablet ? getIconSize('md') : getIconSize('sm'), 
                        marginRight: spacing.xs 
                      }
                    ]}
                  >
                    <Text style={{ color: '#ea580c', fontSize: fontSize.xs }}>⏰</Text>
                  </View>
                  <Text style={{ fontSize: fontSize.sm, color: '#ea580c', fontWeight: '600' }}>
                    {daysLeft} days left
                  </Text>
                </View>
              )}
            </View>
            
            <View style={[styles.footerActions, { gap: spacing.sm }]}>
              <TouchableOpacity 
                onPress={handleViewDetails}
                style={[
                  styles.detailsButton,
                  { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }
                ]}
              >
                <Text style={{ color: '#374151', fontSize: fontSize.sm, fontWeight: '600' }}>
                  Details
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleApply}
                disabled={isApplied || actionLoading === 'apply'}
                style={[
                  styles.applyButton,
                  {
                    paddingHorizontal: isTablet ? spacing.xl : spacing.lg,
                    paddingVertical: spacing.sm,
                    backgroundColor: isApplied ? '#d1d5db' : '#059669',
                    shadowColor: '#10B981',
                    shadowOffset: {
                      width: 0,
                      height: 2,
                    },
                    shadowOpacity: isApplied ? 0 : 0.3,
                    shadowRadius: 4,
                    elevation: isApplied ? 0 : 6,
                  }
                ]}
                activeOpacity={0.8}
              >
                <Text style={{ 
                  color: isApplied ? '#6b7280' : 'white', 
                  fontSize: fontSize.sm, 
                  fontWeight: 'bold' 
                }}>
                  {actionLoading === 'apply' ? 'Applying...' : isApplied ? 'Applied' : 'Apply Now'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

OptimizedJobCard.displayName = 'OptimizedJobCard';

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6' // border-gray-100
  },
  premiumIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10
  },
  premiumBadge: {
    backgroundColor: '#F59E0B', // from-yellow-400 to orange-500 approximation
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  headerLeft: {
    flex: 1
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  companyDot: {
    backgroundColor: '#059669', // bg-secondary-500 approximation
    borderRadius: 9999
  },
  verifiedBadge: {
    backgroundColor: '#DCFCE7', // bg-green-100
    borderRadius: 9999
  },
  quickActions: {
    flexDirection: 'row'
  },
  quickActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  shareButton: {
    backgroundColor: '#F3F4F6' // bg-gray-100
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  tag: {
    borderRadius: 9999
  },
  locationTag: {
    backgroundColor: '#EFF6FF', // bg-blue-50
    borderWidth: 1,
    borderColor: '#BFDBFE' // border-blue-200
  },
  jobTypeTag: {
    backgroundColor: '#FAF5FF', // bg-purple-50
    borderWidth: 1,
    borderColor: '#DDD6FE' // border-purple-200
  },
  experienceTag: {
    backgroundColor: '#ECFDF5', // bg-emerald-50
    borderWidth: 1,
    borderColor: '#A7F3D0' // border-emerald-200
  },
  salaryContainer: {
    backgroundColor: '#ECFDF5', // from-green-50 to-emerald-50 approximation
    borderWidth: 1,
    borderColor: '#BBF7D0', // border-green-200
    borderRadius: 12
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  salaryAmount: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  salaryPeriodBadge: {
    backgroundColor: '#DCFCE7', // bg-green-100
    borderRadius: 9999
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  skillTag: {
    backgroundColor: '#F9FAFB', // bg-gray-50
    borderWidth: 1,
    borderColor: '#E5E7EB', // border-gray-200
    borderRadius: 8
  },
  moreSkillsTag: {
    backgroundColor: '#E6FFFA', // bg-secondary-100
    borderRadius: 8
  },
  footer: {
    backgroundColor: '#F9FAFB', // bg-gray-50
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  infoIcon: {
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center'
  },
  applicantsIcon: {
    backgroundColor: '#DBEAFE' // bg-blue-100
  },
  deadlineIcon: {
    backgroundColor: '#FED7AA' // bg-orange-100
  },
  footerActions: {
    flexDirection: 'row'
  },
  detailsButton: {
    backgroundColor: '#E5E7EB', // bg-gray-200
    borderRadius: 12
  },
  applyButton: {
    borderRadius: 12
  }
});

export default OptimizedJobCard;

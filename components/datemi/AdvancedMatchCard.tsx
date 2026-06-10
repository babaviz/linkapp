/**
 * Advanced Material 3 Match Card Component
 * Enhanced with sophisticated matching algorithms display
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { MatchScore } from '../../services/matchingService';
import { DateMiProfile } from '../../redux/slices/datemiSlice';
import { material3Animations } from '../../utils/material3Animations';

interface AdvancedMatchCardProps {
  profile: DateMiProfile;
  matchScore: MatchScore;
  onLike: (profileId: string) => void;
  onPass: (profileId: string) => void;
  onSuperLike: (profileId: string) => void;
  onViewDetails: (profileId: string) => void;
  style?: any;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

export const AdvancedMatchCard: React.FC<AdvancedMatchCardProps> = ({
  profile,
  matchScore,
  onLike,
  onPass,
  onSuperLike,
  onViewDetails,
  style,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showCompatibilityDetails, setShowCompatibilityDetails] = useState(false);
  const scaleAnim = material3Animations.useScale();
  const slideAnim = material3Animations.useSlide();

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50'; // Green for high compatibility
    if (score >= 60) return '#FF9800'; // Orange for medium compatibility
    return '#757575'; // Gray for low compatibility
  };

  const getConfidenceIndicator = (level: 'low' | 'medium' | 'high') => {
    const indicators = {
      high: { color: '#4CAF50', text: 'High Confidence', icon: 'verified' },
      medium: { color: '#FF9800', text: 'Medium Confidence', icon: 'help' },
      low: { color: '#757575', text: 'Low Confidence', icon: 'info' }
    };
    return indicators[level];
  };

  const getMatchTypeStyle = (type: 'casual' | 'serious' | 'mixed' | 'creator') => {
    const styles = {
      casual: { backgroundColor: '#E91E63', text: 'Casual Match' },
      serious: { backgroundColor: '#3F51B5', text: 'Serious Match' },
      mixed: { backgroundColor: '#9C27B0', text: 'Mixed Interest' },
      creator: { backgroundColor: '#FF5722', text: 'Creator Profile' }
    };
    return styles[type];
  };

  const handleImageTap = (side: 'left' | 'right') => {
    const imageCount = profile.profilePictures.length;
    if (imageCount <= 1) {
      return;
    }

    if (side === 'left') {
      const nextIndex = currentImageIndex === 0 ? imageCount - 1 : currentImageIndex - 1;
      setCurrentImageIndex(nextIndex);
    } else {
      const nextIndex = currentImageIndex === imageCount - 1 ? 0 : currentImageIndex + 1;
      setCurrentImageIndex(nextIndex);
    }
  };

  const renderCompatibilityBar = (label: string, score: number) => (
    <View style={styles.compatibilityItem}>
      <Text style={styles.compatibilityLabel}>{label}</Text>
      <View style={styles.compatibilityBarContainer}>
        <View style={styles.compatibilityBarBackground}>
          <Animated.View 
            style={[
              styles.compatibilityBarFill,
              { 
                width: `${score}%`,
                backgroundColor: getScoreColor(score),
              }
            ]} 
          />
        </View>
        <Text style={styles.compatibilityScore}>{Math.round(score)}%</Text>
      </View>
    </View>
  );

  const renderImageIndicators = () => (
    <View style={styles.imageIndicators}>
      {profile.profilePictures.map((_, index) => (
        <View
          key={index}
          style={[
            styles.indicator,
            {
              backgroundColor: index === currentImageIndex ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
              width: index === currentImageIndex ? 12 : 6,
            },
          ]}
        />
      ))}
    </View>
  );

  const confidenceData = getConfidenceIndicator(matchScore.confidenceLevel);
  const matchTypeData = getMatchTypeStyle(matchScore.matchType);

  return (
    <Animated.View style={[
      styles.container,
      style,
      { transform: [{ scale: scaleAnim }] }
    ]}>
      {/* Main Card */}
      <View style={styles.card}>
        
        {/* Profile Images Section */}
        <View style={styles.imageSection}>
          {/* Image Navigation Areas */}
          <TouchableOpacity
            style={[styles.imageNavigation, styles.leftNavigation]}
            onPress={() => handleImageTap('left')}
            activeOpacity={0.9}
          />
          <TouchableOpacity
            style={[styles.imageNavigation, styles.rightNavigation]}
            onPress={() => handleImageTap('right')}
            activeOpacity={0.9}
          />
          
          {/* Profile Image */}
          <Image
            source={{ uri: profile.profilePictures[currentImageIndex] || '/api/placeholder/400/600' }}
            style={styles.profileImage}
            resizeMode="cover"
          />
          
          {/* Image Indicators */}
          {profile.profilePictures.length > 1 && renderImageIndicators()}
          
          {/* Status Badges Overlay */}
          <View style={styles.statusBadges}>
            {/* Option C: avoid realtime "Online" badge in recommendations */}
            
            {profile.verified && (
              <View style={[styles.badge, styles.verifiedBadge]}>
                <MaterialIcons name="verified" size={12} color="#FFFFFF" />
                <Text style={styles.badgeText}>Verified</Text>
              </View>
            )}
            
            {profile.creatorStatus && (
              <View style={[styles.badge, styles.creatorBadge]}>
                <MaterialIcons name="star" size={12} color="#FFFFFF" />
                <Text style={styles.badgeText}>Creator</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Profile Info Section */}
        <View style={styles.infoSection}>
          
          {/* Header with Name and Age */}
          <View style={styles.headerRow}>
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{profile.displayName}</Text>
              {profile.age && <Text style={styles.age}>, {profile.age}</Text>}
            </View>
            
            <TouchableOpacity
              onPress={() => setShowCompatibilityDetails(!showCompatibilityDetails)}
              style={styles.compatibilityToggle}
            >
              <MaterialIcons 
                name={showCompatibilityDetails ? "expand-less" : "expand-more"} 
                size={24} 
                color="#666666" 
              />
            </TouchableOpacity>
          </View>
          
          {/* Match Score Section */}
          <View style={styles.matchScoreSection}>
            <View style={styles.scoreContainer}>
              <View style={[styles.scoreCircle, { borderColor: getScoreColor(matchScore.score) }]}>
                <Text style={[styles.scoreText, { color: getScoreColor(matchScore.score) }]}>
                  {matchScore.score}%
                </Text>
              </View>
              <View style={styles.scoreInfo}>
                <Text style={styles.scoreLabel}>Compatibility</Text>
                <View style={styles.confidenceRow}>
                  <MaterialIcons 
                    name={confidenceData.icon as any} 
                    size={14} 
                    color={confidenceData.color} 
                  />
                  <Text style={[styles.confidenceText, { color: confidenceData.color }]}>
                    {confidenceData.text}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Match Type Badge */}
            <View style={[styles.matchTypeBadge, { backgroundColor: matchTypeData.backgroundColor }]}>
              <Text style={styles.matchTypeText}>{matchTypeData.text}</Text>
            </View>
          </View>
          
          {/* Bio and Interests */}
          <View style={styles.bioSection}>
            {profile.aboutMe && (
              <Text style={styles.bio} numberOfLines={2}>
                {profile.aboutMe}
              </Text>
            )}
            
            {profile.interests && profile.interests.length > 0 && (
              <View style={styles.interestsContainer}>
                {profile.interests.slice(0, 3).map((interest, index) => (
                  <View key={index} style={styles.interestChip}>
                    <Text style={styles.interestText}>{interest}</Text>
                  </View>
                ))}
                {profile.interests.length > 3 && (
                  <Text style={styles.moreInterests}>+{profile.interests.length - 3} more</Text>
                )}
              </View>
            )}
          </View>
          
          {/* Compatibility Details (Expandable) */}
          {showCompatibilityDetails && (
            <Animated.View style={[styles.compatibilityDetails, { opacity: slideAnim }]}>
              <Text style={styles.compatibilityTitle}>Compatibility Breakdown</Text>
              {renderCompatibilityBar('Interests', matchScore.compatibility.interests)}
              {renderCompatibilityBar('Location', matchScore.compatibility.location)}
              {renderCompatibilityBar('Age', matchScore.compatibility.age)}
              {renderCompatibilityBar('Intention', matchScore.compatibility.intention)}
              {renderCompatibilityBar('Lifestyle', matchScore.compatibility.lifestyle)}
              {renderCompatibilityBar('Activity', matchScore.compatibility.activity)}
              
              {/* Match Reasons */}
              {matchScore.reasons.length > 0 && (
                <View style={styles.reasonsContainer}>
                  <Text style={styles.reasonsTitle}>Why you might connect:</Text>
                  {matchScore.reasons.slice(0, 3).map((reason, index) => (
                    <Text key={index} style={styles.reason}>• {reason}</Text>
                  ))}
                </View>
              )}
            </Animated.View>
          )}
        </View>
      </View>
      
      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          onPress={() => onPass(profile.id)}
          style={[styles.actionButton, styles.passButton]}
          activeOpacity={0.8}
        >
          <MaterialIcons name="close" size={28} color="#FF5252" />
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => onSuperLike(profile.id)}
          style={[styles.actionButton, styles.superLikeButton]}
          activeOpacity={0.8}
        >
          <MaterialIcons name="star" size={24} color="#2196F3" />
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => onLike(profile.id)}
          style={[styles.actionButton, styles.likeButton]}
          activeOpacity={0.8}
        >
          <MaterialIcons name="favorite" size={28} color="#4CAF50" />
        </TouchableOpacity>
      </View>
      
      {/* View Details Button */}
      <TouchableOpacity
        onPress={() => onViewDetails(profile.id)}
        style={styles.viewDetailsButton}
        activeOpacity={0.8}
      >
        <MaterialIcons name="info" size={20} color="#FFFFFF" />
        <Text style={styles.viewDetailsText}>View Full Profile</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    alignSelf: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  imageSection: {
    height: CARD_HEIGHT * 0.65,
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  imageNavigation: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
    zIndex: 2,
  },
  leftNavigation: {
    left: 0,
  },
  rightNavigation: {
    right: 0,
  },
  imageIndicators: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    zIndex: 3,
  },
  indicator: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  statusBadges: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8,
    zIndex: 3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  onlineBadge: {
    backgroundColor: '#4CAF50',
  },
  verifiedBadge: {
    backgroundColor: '#2196F3',
  },
  creatorBadge: {
    backgroundColor: '#FF9800',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  onlineIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  infoSection: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  age: {
    fontSize: 20,
    fontWeight: '400',
    color: '#666666',
  },
  compatibilityToggle: {
    padding: 4,
  },
  matchScoreSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
  },
  scoreInfo: {
    gap: 4,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  matchTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  matchTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  bioSection: {
    marginBottom: 10,
  },
  bio: {
    fontSize: 14,
    color: '#555555',
    lineHeight: 20,
    marginBottom: 8,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  interestChip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  interestText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  moreInterests: {
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
  },
  compatibilityDetails: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  compatibilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  compatibilityItem: {
    marginBottom: 6,
  },
  compatibilityLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 4,
  },
  compatibilityBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compatibilityBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  compatibilityBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  compatibilityScore: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666666',
    minWidth: 30,
    textAlign: 'right',
  },
  reasonsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  reasonsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  reason: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
    marginBottom: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  passButton: {
    backgroundColor: '#FFFFFF',
  },
  superLikeButton: {
    backgroundColor: '#FFFFFF',
  },
  likeButton: {
    backgroundColor: '#FFFFFF',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6650A4',
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
    gap: 8,
  },
  viewDetailsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

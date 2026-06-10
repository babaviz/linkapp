/**
 * Advanced Matching Service for Date Mi
 * Handles sophisticated profile matching algorithms and compatibility scoring
 * Features: ML-based scoring, behavioral patterns, activity correlation
 */

import { DateMiProfile } from '../redux/slices/datemiSlice';
import { analyticsService } from './analyticsService';

export interface MatchScore {
  profileId: string;
  score: number;
  reasons: string[];
  compatibility: {
    interests: number;
    location: number;
    age: number;
    intention: number;
    lifestyle: number;
    activity: number;
    communication: number;
  };
  confidenceLevel: 'low' | 'medium' | 'high';
  matchType: 'casual' | 'serious' | 'mixed' | 'creator';
}

export interface MatchingPreferences {
  ageRange: { min: number; max: number };
  maxDistance: number;
  genderPreference: 'male' | 'female' | 'any';
  intentionPreference: string[];
  verifiedOnly: boolean;
  creatorsOnly: boolean;
  activityLevel: 'low' | 'medium' | 'high' | 'any';
  communicationStyle: string[];
  lifestylePreferences: string[];
  dealBreakers: string[];
  preferredMeetingStyle: 'virtual' | 'in_person' | 'mixed';
}

export interface UserBehaviorData {
  avgResponseTime: number; // in minutes
  activeHours: number[]; // 0-23 hour format
  weeklyActivity: number[]; // 0-6 days, Sunday = 0
  messageLength: 'short' | 'medium' | 'long';
  engagementRate: number; // 0-1
  lastActiveHours: number; // hours since last active
}

export class AdvancedMatchingService {
  private behaviorData = new Map<string, UserBehaviorData>();
  private matchHistory = new Map<string, Set<string>>();
  private interactionPatterns = new Map<string, any>();
  private calculateInterestCompatibility(profile1: DateMiProfile, profile2: DateMiProfile): number {
    if (!profile1.interests || !profile2.interests) return 0;
    
    const commonInterests = profile1.interests.filter(interest => 
      profile2.interests?.includes(interest)
    );
    
    const totalUniqueInterests = new Set([
      ...(profile1.interests || []),
      ...(profile2.interests || [])
    ]).size;
    
    // Enhanced scoring with interest categories and weights
    const interestWeights: Record<string, number> = {
      'travel': 1.2, 'music': 1.1, 'fitness': 1.2, 'cooking': 1.0,
      'movies': 0.9, 'reading': 1.1, 'photography': 1.0, 'dancing': 1.2,
      'sports': 1.1, 'art': 1.0, 'technology': 1.0, 'fashion': 0.9
    };
    
    let weightedScore = 0;
    let totalWeight = 0;
    
    commonInterests.forEach(interest => {
      const weight = interestWeights[interest.toLowerCase()] || 1.0;
      weightedScore += weight;
      totalWeight += weight;
    });
    
    const baseScore = totalUniqueInterests > 0 ? (commonInterests.length / totalUniqueInterests) * 100 : 0;
    const weightedBonus = totalWeight > 0 ? (weightedScore / commonInterests.length) * 10 : 0;
    
    return Math.min(100, baseScore + weightedBonus);
  }

  private calculateLocationCompatibility(profile1: DateMiProfile, profile2: DateMiProfile, preferences?: MatchingPreferences): number {
    if (!profile1.location || !profile2.location) return 50;
    
    const loc1 = profile1.location.toLowerCase();
    const loc2 = profile2.location.toLowerCase();
    
    if (loc1 === loc2) {
      return 100;
    }
    
    const extractLocationParts = (location: string) => {
      const parts = location.split(',').map(p => p.trim().toLowerCase());
      return {
        city: parts[0] || '',
        country: parts[1] || parts[0] || '',
        fullLocation: location.toLowerCase()
      };
    };
    
    const loc1Parts = extractLocationParts(profile1.location);
    const loc2Parts = extractLocationParts(profile2.location);
    
    if (loc1Parts.city === loc2Parts.city && loc1Parts.city) {
      return 95;
    }
    
    if (loc1Parts.country === loc2Parts.country && loc1Parts.country) {
      return 70;
    }
    
    const commonWords = loc1Parts.fullLocation.split(/\s+/).filter(word => 
      word.length > 3 && loc2Parts.fullLocation.includes(word)
    );
    
    if (commonWords.length > 0) {
      return 60;
    }
    
    if (preferences?.maxDistance && preferences.maxDistance < 10) {
      return 20;
    }
    
    return 35;
  }

  private calculateAgeCompatibility(profile1: DateMiProfile, profile2: DateMiProfile, preferences?: MatchingPreferences): number {
    if (!profile1.age || !profile2.age) return 50;
    
    const ageDifference = Math.abs(profile1.age - profile2.age);
    
    // If preferences are provided, check if profile2 falls within preferred age range
    if (preferences) {
      if (profile2.age < preferences.ageRange.min || profile2.age > preferences.ageRange.max) {
        return 0;
      }
    }
    
    // Score based on age difference
    if (ageDifference <= 2) return 100;
    if (ageDifference <= 5) return 80;
    if (ageDifference <= 8) return 60;
    if (ageDifference <= 12) return 40;
    return 20;
  }

  private calculateIntentionCompatibility(profile1: DateMiProfile, profile2: DateMiProfile): number {
    if (!profile1.intention || !profile2.intention) return 50;
    
    const intentionCompatibilityMatrix: Record<string, Record<string, number>> = {
      'short_term_fun': {
        'short_term_fun': 95,
        'long_term_partner': 20,
      },
      'long_term_partner': {
        'long_term_partner': 95,
        'short_term_fun': 15,
      },
    };
    
    return intentionCompatibilityMatrix[profile1.intention]?.[profile2.intention] || 30;
  }

  private calculateLifestyleCompatibility(profile1: DateMiProfile, profile2: DateMiProfile): number {
    // Mock lifestyle data - in real app, this would come from user profiles
    const getLifestyleScore = (profile: DateMiProfile) => {
      const scores = {
        social: profile.interests?.some(i => ['parties', 'socializing', 'networking'].includes(i)) ? 80 : 40,
        active: profile.interests?.some(i => ['fitness', 'sports', 'hiking', 'dancing'].includes(i)) ? 80 : 40,
        cultural: profile.interests?.some(i => ['art', 'music', 'reading', 'museums'].includes(i)) ? 80 : 40,
        homebody: profile.interests?.some(i => ['cooking', 'reading', 'movies', 'gaming'].includes(i)) ? 80 : 40,
        adventurous: profile.interests?.some(i => ['travel', 'hiking', 'photography'].includes(i)) ? 80 : 40
      };
      return scores;
    };
    
    const lifestyle1 = getLifestyleScore(profile1);
    const lifestyle2 = getLifestyleScore(profile2);
    
    let totalCompatibility = 0;
    let aspectCount = 0;
    
    Object.keys(lifestyle1).forEach(aspect => {
      const diff = Math.abs(lifestyle1[aspect as keyof typeof lifestyle1] - lifestyle2[aspect as keyof typeof lifestyle2]);
      totalCompatibility += (100 - diff);
      aspectCount++;
    });
    
    return aspectCount > 0 ? totalCompatibility / aspectCount : 50;
  }

  private calculateActivityCompatibility(profile1: DateMiProfile, profile2: DateMiProfile): number {
    const behavior1 = this.behaviorData.get(profile1.id);
    const behavior2 = this.behaviorData.get(profile2.id);
    
    if (!behavior1 || !behavior2) return 50; // Neutral score if no behavior data
    
    // Response time compatibility (prefer similar response speeds)
    const responseTimeDiff = Math.abs(behavior1.avgResponseTime - behavior2.avgResponseTime);
    const responseTimeScore = Math.max(0, 100 - (responseTimeDiff / 60) * 20); // Penalize large differences
    
    // Active hours overlap
    const commonActiveHours = behavior1.activeHours.filter(hour => 
      behavior2.activeHours.includes(hour)
    ).length;
    const activeHoursScore = (commonActiveHours / Math.max(behavior1.activeHours.length, behavior2.activeHours.length)) * 100;
    
    // Communication style compatibility
    const communicationScore = behavior1.messageLength === behavior2.messageLength ? 80 : 50;
    
    // Engagement rate similarity
    const engagementDiff = Math.abs(behavior1.engagementRate - behavior2.engagementRate);
    const engagementScore = (1 - engagementDiff) * 100;
    
    return (responseTimeScore + activeHoursScore + communicationScore + engagementScore) / 4;
  }

  private calculateCommunicationCompatibility(profile1: DateMiProfile, profile2: DateMiProfile): number {
    const behavior1 = this.behaviorData.get(profile1.id);
    const behavior2 = this.behaviorData.get(profile2.id);
    
    if (!behavior1 || !behavior2) return 50;
    
    // Message length compatibility
    const lengthCompatibility = {
      'short': { 'short': 90, 'medium': 70, 'long': 30 },
      'medium': { 'short': 70, 'medium': 95, 'long': 80 },
      'long': { 'short': 30, 'medium': 80, 'long': 95 }
    };
    
    const lengthScore = lengthCompatibility[behavior1.messageLength]?.[behavior2.messageLength] || 50;
    
    // Response time compatibility - prefer users who respond at similar speeds
    const avgResponseDiff = Math.abs(behavior1.avgResponseTime - behavior2.avgResponseTime);
    const responseScore = Math.max(20, 100 - (avgResponseDiff / 30) * 15);
    
    return (lengthScore + responseScore) / 2;
  }

  public calculateMatchScore(
    userProfile: DateMiProfile, 
    candidateProfile: DateMiProfile, 
    preferences?: MatchingPreferences
  ): MatchScore {
    // Check basic filters first
    if (preferences) {
      if (preferences.verifiedOnly && !candidateProfile.verified) {
        return {
          profileId: candidateProfile.id,
          score: 0,
          reasons: ['Profile not verified'],
          compatibility: { interests: 0, location: 0, age: 0, intention: 0, lifestyle: 0, activity: 0, communication: 0 },
          confidenceLevel: 'low' as const,
          matchType: 'mixed' as const
        };
      }
      
      if (preferences.creatorsOnly && !candidateProfile.creatorStatus) {
        return {
          profileId: candidateProfile.id,
          score: 0,
          reasons: ['Not a creator profile'],
          compatibility: { interests: 0, location: 0, age: 0, intention: 0, lifestyle: 0, activity: 0, communication: 0 },
          confidenceLevel: 'low' as const,
          matchType: 'mixed' as const
        };
      }
    }

    const compatibility = {
      interests: this.calculateInterestCompatibility(userProfile, candidateProfile),
      location: this.calculateLocationCompatibility(userProfile, candidateProfile, preferences),
      age: this.calculateAgeCompatibility(userProfile, candidateProfile, preferences),
      intention: this.calculateIntentionCompatibility(userProfile, candidateProfile),
      lifestyle: this.calculateLifestyleCompatibility(userProfile, candidateProfile),
      activity: this.calculateActivityCompatibility(userProfile, candidateProfile),
      communication: this.calculateCommunicationCompatibility(userProfile, candidateProfile)
    };

    // Dynamic weighted score calculation based on user intention
    const getWeights = (intention: string) => {
      switch (intention) {
        case 'long_term_partner':
          return { interests: 0.25, location: 0.15, age: 0.15, intention: 0.25, lifestyle: 0.15, activity: 0.03, communication: 0.02 };
        case 'short_term_fun':
          return { interests: 0.20, location: 0.25, age: 0.20, intention: 0.20, lifestyle: 0.10, activity: 0.03, communication: 0.02 };
        default:
          return { interests: 0.22, location: 0.18, age: 0.18, intention: 0.22, lifestyle: 0.12, activity: 0.04, communication: 0.04 };
      }
    };
    
    const weights = getWeights(userProfile.intention || 'mixed');

    const totalScore = Math.round(
      compatibility.interests * weights.interests +
      compatibility.location * weights.location +
      compatibility.age * weights.age +
      compatibility.intention * weights.intention +
      compatibility.lifestyle * weights.lifestyle +
      compatibility.activity * weights.activity +
      compatibility.communication * weights.communication
    );
    
    // Determine confidence level and match type
    const confidenceLevel: 'low' | 'medium' | 'high' = 
      totalScore >= 80 ? 'high' :
      totalScore >= 60 ? 'medium' : 'low';
    
    const matchType: 'casual' | 'serious' | 'mixed' | 'creator' = 
      candidateProfile.creatorStatus ? 'creator' :
      compatibility.intention >= 80 && userProfile.intention === 'long_term_partner' ? 'serious' :
      compatibility.intention >= 80 && userProfile.intention === 'short_term_fun' ? 'casual' :
      'mixed';

    // Generate reasons for the match
    const reasons: string[] = [];
    
    if (compatibility.interests > 70) {
      const commonInterests = userProfile.interests?.filter(interest => 
        candidateProfile.interests?.includes(interest)
      );
      reasons.push(`Shared interests: ${commonInterests?.join(', ')}`);
    }
    
    if (compatibility.location > 80) {
      reasons.push('Same location');
    } else if (compatibility.location > 50) {
      reasons.push('Nearby location');
    }
    
    if (compatibility.age > 80) {
      reasons.push('Compatible age range');
    }
    
    if (compatibility.intention > 80) {
      reasons.push('Similar relationship goals');
    }
    
    if (candidateProfile.verified) {
      reasons.push('Verified profile');
    }
    
    if (candidateProfile.creatorStatus) {
      reasons.push('Content creator');
    }
    
    if (candidateProfile.isOnline) {
      reasons.push('Currently online');
    }

    return {
      profileId: candidateProfile.id,
      score: totalScore,
      reasons,
      compatibility,
      confidenceLevel,
      matchType
    };
  }

  public findMatches(
    userProfile: DateMiProfile,
    candidateProfiles: DateMiProfile[],
    preferences?: MatchingPreferences,
    limit: number = 20
  ): MatchScore[] {
    const matches = candidateProfiles
      .filter(profile => {
        // Don't match with self
        if (profile.id === userProfile.id) return false;
        
        // Apply deal breakers
        if (preferences?.dealBreakers?.length) {
          const hasDealbreakerInterest = preferences.dealBreakers.some(dealbreaker => 
            profile.interests?.includes(dealbreaker));
          if (hasDealbreakerInterest) return false;
        }
        
        // Filter by activity level if specified
        if (preferences?.activityLevel && preferences.activityLevel !== 'any') {
          const behavior = this.behaviorData.get(profile.id);
          if (behavior && preferences.activityLevel !== this.getActivityLevel(behavior)) {
            return false;
          }
        }
        
        return true;
      })
      .map(profile => this.calculateMatchScore(userProfile, profile, preferences))
      .filter(match => match.score > 30) // Only show matches above 30%
      .sort((a, b) => {
        // Advanced sorting: prioritize high confidence, high score matches
        const aWeight = b.score + (b.confidenceLevel === 'high' ? 10 : b.confidenceLevel === 'medium' ? 5 : 0);
        const bWeight = a.score + (a.confidenceLevel === 'high' ? 10 : a.confidenceLevel === 'medium' ? 5 : 0);
        return bWeight - aWeight;
      })
      .slice(0, limit);

    // Track match generation for analytics
    analyticsService.trackEvent('matches_generated', {
      userId: userProfile.id,
      matchCount: matches.length,
      avgScore: matches.reduce((sum, m) => sum + m.score, 0) / matches.length || 0,
      highConfidenceCount: matches.filter(m => m.confidenceLevel === 'high').length
    });

    return matches;
  }

  private getActivityLevel(behavior: UserBehaviorData): 'low' | 'medium' | 'high' {
    const totalActivity = behavior.weeklyActivity.reduce((sum, day) => sum + day, 0);
    if (totalActivity > 35) return 'high';
    if (totalActivity > 15) return 'medium';
    return 'low';
  }

  public updateBehaviorData(userId: string, behavior: UserBehaviorData): void {
    this.behaviorData.set(userId, behavior);
  }

  public recordMatchInteraction(userId: string, matchId: string, action: 'like' | 'pass' | 'super_like'): void {
    if (!this.matchHistory.has(userId)) {
      this.matchHistory.set(userId, new Set());
    }
    
    this.matchHistory.get(userId)!.add(matchId);
    
    // Track interaction patterns for learning
    if (!this.interactionPatterns.has(userId)) {
      this.interactionPatterns.set(userId, { likes: [], passes: [], superLikes: [] });
    }
    
    const patterns = this.interactionPatterns.get(userId)!;
    if (action === 'like') patterns.likes.push(matchId);
    else if (action === 'pass') patterns.passes.push(matchId);
    else if (action === 'super_like') patterns.superLikes.push(matchId);
    
    // Track for analytics
    analyticsService.trackEvent('match_interaction', {
      userId,
      matchId,
      action
    });
  }

  public getPersonalizedRecommendations(
    userProfile: DateMiProfile,
    allProfiles: DateMiProfile[],
    limit: number = 10
  ): MatchScore[] {
    const userPatterns = this.interactionPatterns.get(userProfile.id);
    
    if (!userPatterns || (userPatterns.likes.length + userPatterns.superLikes.length) < 5) {
      // Not enough data for personalization, use regular matching
      return this.findMatches(userProfile, allProfiles, undefined, limit);
    }
    
    // Analyze liked profiles to find patterns
    const likedProfiles = allProfiles.filter(p => 
      userPatterns.likes.includes(p.id) || userPatterns.superLikes.includes(p.id)
    );
    
    const preferredTraits = this.extractPreferredTraits(likedProfiles);
    
    // Find profiles similar to liked ones
    const recommendations = allProfiles
      .filter(profile => {
        if (profile.id === userProfile.id) return false;
        if (this.matchHistory.get(userProfile.id)?.has(profile.id)) return false;
        return true;
      })
      .map(profile => {
        const baseScore = this.calculateMatchScore(userProfile, profile);
        const personalizedBonus = this.calculatePersonalizationBonus(profile, preferredTraits);
        
        return {
          ...baseScore,
          score: Math.min(100, baseScore.score + personalizedBonus)
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return recommendations;
  }

  private extractPreferredTraits(likedProfiles: DateMiProfile[]): any {
    const interests = new Map<string, number>();
    const ages: number[] = [];
    let totalVerified = 0;
    let totalCreators = 0;
    
    likedProfiles.forEach(profile => {
      profile.interests?.forEach(interest => {
        interests.set(interest, (interests.get(interest) || 0) + 1);
      });
      
      if (profile.age) ages.push(profile.age);
      if (profile.verified) totalVerified++;
      if (profile.creatorStatus) totalCreators++;
    });
    
    return {
      preferredInterests: Array.from(interests.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([interest]) => interest),
      preferredAgeRange: ages.length > 0 ? {
        min: Math.min(...ages) - 2,
        max: Math.max(...ages) + 2
      } : null,
      prefersVerified: totalVerified / likedProfiles.length > 0.6,
      prefersCreators: totalCreators / likedProfiles.length > 0.4
    };
  }

  private calculatePersonalizationBonus(profile: DateMiProfile, traits: any): number {
    let bonus = 0;
    
    // Interest bonus
    if (traits.preferredInterests && profile.interests) {
      const commonPreferredInterests = traits.preferredInterests.filter((interest: string) => 
        profile.interests?.includes(interest)
      ).length;
      bonus += commonPreferredInterests * 5;
    }
    
    // Age range bonus
    if (traits.preferredAgeRange && profile.age) {
      if (profile.age >= traits.preferredAgeRange.min && profile.age <= traits.preferredAgeRange.max) {
        bonus += 10;
      }
    }
    
    // Verification bonus
    if (traits.prefersVerified && profile.verified) {
      bonus += 8;
    }
    
    // Creator bonus
    if (traits.prefersCreators && profile.creatorStatus) {
      bonus += 7;
    }
    
    return Math.min(25, bonus); // Cap bonus at 25 points
  }

  public findSimilarProfiles(
    referenceProfile: DateMiProfile,
    allProfiles: DateMiProfile[],
    limit: number = 10
  ): DateMiProfile[] {
    const matches = this.findMatches(referenceProfile, allProfiles, undefined, limit);
    
    return matches
      .map(match => allProfiles.find(profile => profile.id === match.profileId))
      .filter((profile): profile is DateMiProfile => profile !== undefined);
  }

  public generateMatchExplanation(matchScore: MatchScore): string {
    if (matchScore.score >= 80) {
      return `Excellent match! ${matchScore.reasons.slice(0, 3).join(', ')}.`;
    } else if (matchScore.score >= 60) {
      return `Good compatibility. ${matchScore.reasons.slice(0, 2).join(' and ')}.`;
    } else if (matchScore.score >= 40) {
      return `Some compatibility. ${matchScore.reasons[0] || 'Basic match criteria met'}.`;
    } else {
      return 'Limited compatibility, but worth exploring!';
    }
  }

  public getDefaultPreferences(): MatchingPreferences {
    return {
      ageRange: { min: 18, max: 35 },
      maxDistance: 50, // km
      genderPreference: 'any',
      intentionPreference: ['short_term_fun', 'long_term_partner', 'digital_services'],
      verifiedOnly: false,
      creatorsOnly: false,
      activityLevel: 'any',
      communicationStyle: ['text', 'voice', 'video'],
      lifestylePreferences: ['social', 'outdoor', 'indoor'],
      dealBreakers: [],
      preferredMeetingStyle: 'mixed'
    };
  }
}

// Singleton instance
export const matchingService = new AdvancedMatchingService();

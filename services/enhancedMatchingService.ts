/**
 * Enhanced Matching Service with Database Integration and Privacy Enforcement
 * Production-ready implementation with proper error handling and performance optimization
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { DateMiProfile } from '../redux/slices/datemiSlice';
import { MatchScore, MatchingPreferences, UserBehaviorData } from './matchingService';

export interface EnhancedMatchingPreferences extends MatchingPreferences {
  excludeViewedProfiles?: boolean;
  excludePassedProfiles?: boolean;
  onlyShowOnline?: boolean;
  minCompatibilityScore?: number;
}

export interface MatchingStats {
  totalProfilesAvailable: number;
  totalMatches: number;
  totalLikesGiven: number;
  totalLikesReceived: number;
  avgCompatibilityScore: number;
  dailyLikesRemaining: number;
}

export class EnhancedMatchingService {
  
  /**
   * Get optimized profile recommendations with database-level filtering
   */
  async getOptimizedRecommendations(
    userId: string,
    preferences?: EnhancedMatchingPreferences,
    limit: number = 20
  ): Promise<MatchScore[]> {
    try {
      if (!isSupabaseConfigured()) {
        if (__DEV__) {
          console.warn('Supabase not configured, using fallback');
        }
        return this.getFallbackRecommendations();
      }

      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      const effectivePrefs = preferences || await this.getUserPreferences(userId);
      
      const candidateProfiles = await this.fetchFilteredProfiles(userId, userProfile, effectivePrefs, limit * 3);
      
      if (candidateProfiles.length === 0) {
        return this.getFallbackRecommendations();
      }

      const scoredMatches = await this.scoreAndRankProfiles(
        userProfile,
        candidateProfiles,
        effectivePrefs
      );

      await this.cacheRecommendations(userId, scoredMatches);

      return scoredMatches.slice(0, limit);
    } catch (error) {
      if (__DEV__) {
        console.error('Error getting optimized recommendations:', error);
      }
      return this.getFallbackRecommendations();
    }
  }

  /**
   * Fetch profiles with database-level filtering for performance
   */
  private async fetchFilteredProfiles(
    userId: string,
    userProfile: DateMiProfile,
    preferences: EnhancedMatchingPreferences,
    limit: number
  ): Promise<DateMiProfile[]> {
    try {
      let query = supabase
        .from('date_mi_profiles_with_tier')
        .select(`
          *,
          users!inner(id, location_preferences)
        `);

      query = query.neq('user_id', userId);

      if (preferences.ageRange) {
        query = query
          .gte('age', preferences.ageRange.min)
          .lte('age', preferences.ageRange.max) as any;
      }

      if (preferences.genderPreference && preferences.genderPreference !== 'any') {
        query = (query as any).contains('gender_preferences', [preferences.genderPreference]);
      }

      if (preferences.intentionPreference && preferences.intentionPreference.length > 0) {
        query = (query as any).in('intention', preferences.intentionPreference);
      }

      if (preferences.verifiedOnly) {
        query = (query as any).eq('verified', true);
      }

      if (preferences.creatorsOnly) {
        query = (query as any).eq('creator_status', true);
      }

      if (preferences.onlyShowOnline) {
        query = (query as any).eq('is_online', true);
      }

      if (preferences.excludePassedProfiles) {
        try {
          const { data: passedProfiles } = await supabase
            .from('datemi_passes' as any)
            .select('passed_profile_id')
            .eq('passer_id', userId);
          
          if (passedProfiles && passedProfiles.length > 0) {
            const passedIds = passedProfiles.map((p: any) => p.passed_profile_id);
            query = query.not('id', 'in', `(${passedIds.join(',')})`);
          }
        } catch (error) {
          if (__DEV__) {
            console.log('datemi_passes table not available, skipping filter');
          }
        }
      }

      if (preferences.excludeViewedProfiles) {
        try {
          const { data: likedProfiles } = await supabase
            .from('datemi_likes')
            .select('profile_id')
            .eq('user_id', userId);
          
          if (likedProfiles && likedProfiles.length > 0) {
            const likedIds = likedProfiles.map((p: any) => p.profile_id);
            query = query.not('id', 'in', `(${likedIds.join(',')})`);
          }
        } catch (error) {
          if (__DEV__) {
            console.log('datemi_likes table not available, skipping filter');
          }
        }
      }

      const privacyFilter = await this.applyPrivacyFilters(userId, userProfile);
      if (privacyFilter) {
        query = query.or(privacyFilter);
      }

      query = query
        .order('is_online', { ascending: false })
        .order('verified', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(limit);

      const { data, error } = await query;

      if (error) {
        if (__DEV__) {
          console.error('Error fetching filtered profiles:', error);
        }
        return [];
      }

      return (data || []).map(this.transformToDateMiProfile);
    } catch (error) {
      if (__DEV__) {
        console.error('Error in fetchFilteredProfiles:', error);
      }
      return [];
    }
  }

  /**
   * Apply privacy filters based on user settings
   */
  private async applyPrivacyFilters(_userId: string, userProfile: DateMiProfile): Promise<string | null> {
    try {
      const privacyConditions: string[] = [];

      if (userProfile.privacySettings?.verifiedProfilesOnly) {
        privacyConditions.push('verified.eq.true');
      }

      if (userProfile.privacySettings?.hideFromNearbySearch) {
        privacyConditions.push(`location.not.eq.${userProfile.location}`);
      }

      return privacyConditions.length > 0 ? privacyConditions.join(',') : null;
    } catch (error) {
      if (__DEV__) {
        console.error('Error applying privacy filters:', error);
      }
      return null;
    }
  }

  /**
   * Score and rank profiles using enhanced algorithm
   */
  private async scoreAndRankProfiles(
    userProfile: DateMiProfile,
    candidates: DateMiProfile[],
    preferences: EnhancedMatchingPreferences
  ): Promise<MatchScore[]> {
    const userBehavior = await this.getUserBehavior(userProfile.userId);
    
    const scoredProfiles = await Promise.all(
      candidates.map(async (candidate) => {
        const candidateBehavior = await this.getUserBehavior(candidate.userId);
        
        const compatibility = {
          interests: this.calculateInterestCompatibility(userProfile, candidate),
          location: this.calculateLocationCompatibility(userProfile, candidate, preferences),
          age: this.calculateAgeCompatibility(userProfile, candidate, preferences),
          intention: this.calculateIntentionCompatibility(userProfile, candidate),
          lifestyle: this.calculateLifestyleCompatibility(userProfile, candidate),
          activity: this.calculateActivityCompatibility(userBehavior, candidateBehavior),
          communication: this.calculateCommunicationCompatibility(userBehavior, candidateBehavior),
        };

        const weights = this.getCompatibilityWeights(userProfile.intention || 'mixed');
        
        const totalScore = Math.round(
          compatibility.interests * weights.interests +
          compatibility.location * weights.location +
          compatibility.age * weights.age +
          compatibility.intention * weights.intention +
          compatibility.lifestyle * weights.lifestyle +
          compatibility.activity * weights.activity +
          compatibility.communication * weights.communication
        );

        if (preferences.minCompatibilityScore && totalScore < preferences.minCompatibilityScore) {
          return null;
        }

        const confidenceLevel: 'low' | 'medium' | 'high' = 
          totalScore >= 80 ? 'high' : totalScore >= 60 ? 'medium' : 'low';
        
        const matchType: 'casual' | 'serious' | 'mixed' | 'creator' = 
          candidate.creatorStatus ? 'creator' :
          compatibility.intention >= 80 && userProfile.intention === 'long_term_partner' ? 'serious' :
          compatibility.intention >= 80 && userProfile.intention === 'short_term_fun' ? 'casual' :
          'mixed';

        const reasons = this.generateMatchReasons(userProfile, candidate, compatibility);

        return {
          profileId: candidate.id,
          score: totalScore,
          reasons,
          compatibility,
          confidenceLevel,
          matchType
        };
      })
    );

    return scoredProfiles
      .filter((match): match is MatchScore => match !== null && match.score > 30)
      .sort((a, b) => {
        const aWeight = a.score + (a.confidenceLevel === 'high' ? 10 : a.confidenceLevel === 'medium' ? 5 : 0);
        const bWeight = b.score + (b.confidenceLevel === 'high' ? 10 : b.confidenceLevel === 'medium' ? 5 : 0);
        return bWeight - aWeight;
      });
  }

  /**
   * Calculate interest compatibility with weighted scoring
   */
  private calculateInterestCompatibility(profile1: DateMiProfile, profile2: DateMiProfile): number {
    if (!profile1.interests || !profile2.interests) return 0;
    
    const commonInterests = profile1.interests.filter(interest => 
      profile2.interests?.includes(interest)
    );
    
    const totalUniqueInterests = new Set([
      ...(profile1.interests || []),
      ...(profile2.interests || [])
    ]).size;
    
    const interestWeights: Record<string, number> = {
      'travel': 1.2, 'music': 1.1, 'fitness': 1.2, 'cooking': 1.0,
      'movies': 0.9, 'reading': 1.1, 'photography': 1.0, 'dancing': 1.2,
      'sports': 1.1, 'art': 1.0, 'technology': 1.0, 'fashion': 0.9
    };
    
    let weightedScore = 0;
    commonInterests.forEach(interest => {
      const weight = interestWeights[interest.toLowerCase()] || 1.0;
      weightedScore += weight;
    });
    
    const baseScore = totalUniqueInterests > 0 ? (commonInterests.length / totalUniqueInterests) * 100 : 0;
    const weightedBonus = commonInterests.length > 0 ? (weightedScore / commonInterests.length) * 10 : 0;
    
    return Math.min(100, baseScore + weightedBonus);
  }

  /**
   * Calculate location compatibility
   */
  private calculateLocationCompatibility(
    profile1: DateMiProfile,
    profile2: DateMiProfile,
    preferences?: MatchingPreferences
  ): number {
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

  /**
   * Calculate age compatibility
   */
  private calculateAgeCompatibility(
    profile1: DateMiProfile,
    profile2: DateMiProfile,
    preferences?: MatchingPreferences
  ): number {
    if (!profile1.age || !profile2.age) return 50;
    
    const ageDifference = Math.abs(profile1.age - profile2.age);
    
    if (preferences) {
      if (profile2.age < preferences.ageRange.min || profile2.age > preferences.ageRange.max) {
        return 0;
      }
    }
    
    if (ageDifference <= 2) return 100;
    if (ageDifference <= 5) return 80;
    if (ageDifference <= 8) return 60;
    if (ageDifference <= 12) return 40;
    return 20;
  }

  /**
   * Calculate intention compatibility
   */
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

  /**
   * Calculate lifestyle compatibility
   */
  private calculateLifestyleCompatibility(profile1: DateMiProfile, profile2: DateMiProfile): number {
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

  /**
   * Calculate activity compatibility
   */
  private calculateActivityCompatibility(
    behavior1: UserBehaviorData | null,
    behavior2: UserBehaviorData | null
  ): number {
    if (!behavior1 || !behavior2) return 50;
    
    const responseTimeDiff = Math.abs(behavior1.avgResponseTime - behavior2.avgResponseTime);
    const responseTimeScore = Math.max(0, 100 - (responseTimeDiff / 60) * 20);
    
    const commonActiveHours = behavior1.activeHours.filter(hour => 
      behavior2.activeHours.includes(hour)
    ).length;
    const activeHoursScore = (commonActiveHours / Math.max(behavior1.activeHours.length, behavior2.activeHours.length)) * 100;
    
    const communicationScore = behavior1.messageLength === behavior2.messageLength ? 80 : 50;
    
    const engagementDiff = Math.abs(behavior1.engagementRate - behavior2.engagementRate);
    const engagementScore = (1 - engagementDiff) * 100;
    
    return (responseTimeScore + activeHoursScore + communicationScore + engagementScore) / 4;
  }

  /**
   * Calculate communication compatibility
   */
  private calculateCommunicationCompatibility(
    behavior1: UserBehaviorData | null,
    behavior2: UserBehaviorData | null
  ): number {
    if (!behavior1 || !behavior2) return 50;
    
    const lengthCompatibility = {
      'short': { 'short': 90, 'medium': 70, 'long': 30 },
      'medium': { 'short': 70, 'medium': 95, 'long': 80 },
      'long': { 'short': 30, 'medium': 80, 'long': 95 }
    };
    
    const lengthScore = lengthCompatibility[behavior1.messageLength]?.[behavior2.messageLength] || 50;
    
    const avgResponseDiff = Math.abs(behavior1.avgResponseTime - behavior2.avgResponseTime);
    const responseScore = Math.max(20, 100 - (avgResponseDiff / 30) * 15);
    
    return (lengthScore + responseScore) / 2;
  }

  /**
   * Get compatibility weights based on user intention
   */
  private getCompatibilityWeights(intention: string) {
    switch (intention) {
      case 'long_term_partner':
        return { interests: 0.25, location: 0.15, age: 0.15, intention: 0.25, lifestyle: 0.15, activity: 0.03, communication: 0.02 };
      case 'short_term_fun':
        return { interests: 0.20, location: 0.25, age: 0.20, intention: 0.20, lifestyle: 0.10, activity: 0.03, communication: 0.02 };
      default:
        return { interests: 0.22, location: 0.18, age: 0.18, intention: 0.22, lifestyle: 0.12, activity: 0.04, communication: 0.04 };
    }
  }

  /**
   * Generate match reasons
   */
  private generateMatchReasons(
    userProfile: DateMiProfile,
    candidateProfile: DateMiProfile,
    compatibility: any
  ): string[] {
    const reasons: string[] = [];
    
    if (compatibility.interests > 70) {
      const commonInterests = userProfile.interests?.filter(interest => 
        candidateProfile.interests?.includes(interest)
      );
      if (commonInterests && commonInterests.length > 0) {
        reasons.push(`Shared interests: ${commonInterests.slice(0, 3).join(', ')}`);
      }
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
    
    return reasons;
  }

  /**
   * Get user profile with subscription tier
   */
  private async getUserProfile(userId: string): Promise<DateMiProfile | null> {
    try {
      const { data, error } = await supabase
        .from('date_mi_profiles_with_tier')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) return null;

      return this.transformToDateMiProfile(data);
    } catch (error) {
      if (__DEV__) {
        console.error('Error getting user profile:', error);
      }
      return null;
    }
  }

  /**
   * Get user preferences
   */
  private async getUserPreferences(userId: string): Promise<MatchingPreferences> {
    try {
      const { data, error } = await supabase
        .from('datemi_matching_preferences' as any)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return this.getDefaultPreferences();
      }

      const prefData = data as any;
      return {
        ageRange: { min: prefData.age_range_min || 18, max: prefData.age_range_max || 35 },
        maxDistance: prefData.max_distance_km || 50,
        genderPreference: prefData.gender_preference?.[0] || 'any',
        intentionPreference: prefData.intention_preference || [],
        verifiedOnly: prefData.verified_only || false,
        creatorsOnly: prefData.creators_only || false,
        activityLevel: prefData.activity_level || 'any',
        communicationStyle: prefData.communication_style || [],
        lifestylePreferences: prefData.lifestyle_preferences || [],
        dealBreakers: prefData.deal_breakers || [],
        preferredMeetingStyle: prefData.preferred_meeting_style || 'mixed',
      };
    } catch (error) {
      if (__DEV__) {
        console.log('datemi_matching_preferences table not available, using defaults');
      }
      return this.getDefaultPreferences();
    }
  }

  /**
   * Get user behavioral data
   */
  private async getUserBehavior(userId: string): Promise<UserBehaviorData | null> {
    try {
      const { data, error } = await supabase
        .from('datemi_user_behavior' as any)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) return null;

      const behaviorData = data as any;
      return {
        avgResponseTime: behaviorData.avg_response_time_minutes || 60,
        activeHours: behaviorData.active_hours || [],
        weeklyActivity: behaviorData.weekly_activity || [],
        messageLength: behaviorData.message_length || 'medium',
        engagementRate: parseFloat(behaviorData.engagement_rate) || 0.75,
        lastActiveHours: behaviorData.last_active_hours || 24,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Cache recommendations
   */
  private async cacheRecommendations(userId: string, matches: MatchScore[]): Promise<void> {
    try {
      await supabase
        .from('datemi_match_cache' as any)
        .upsert({
          user_id: userId,
          recommended_profiles: matches,
          cache_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        });
    } catch (error) {
      if (__DEV__) {
        console.log('datemi_match_cache table not available, skipping cache');
      }
    }
  }

  /**
   * Record like action (adapted to existing schema: user_id, profile_id)
   */
  async recordLike(
    likerId: string,
    likedProfileId: string,
    isSuperLike: boolean = false,
    matchScore: number = 0
  ): Promise<{ isMatch: boolean; matchId?: string }> {
    try {
      const { error: likeError } = await supabase
        .from('datemi_likes')
        .insert({
          user_id: likerId,
          profile_id: likedProfileId,
          is_super_like: isSuperLike,
          match_score: matchScore,
        })
        .select()
        .single();

      if (likeError) {
        if (__DEV__) {
          console.error('Error recording like:', likeError);
        }
        return { isMatch: false };
      }

      const { data: matchData } = await supabase
        .from('datemi_matches' as any)
        .select('id')
        .or(`user1_id.eq.${likerId},user2_id.eq.${likerId}`)
        .or(`user1_id.eq.${likedProfileId},user2_id.eq.${likedProfileId}`)
        .maybeSingle();

      return {
        isMatch: !!matchData,
        matchId: (matchData as any)?.id,
      };
    } catch (error) {
      if (__DEV__) {
        console.log('Error in recordLike, likely table not available');
      }
      return { isMatch: false };
    }
  }

  /**
   * Record pass action
   */
  async recordPass(passerId: string, passedProfileId: string, reason?: string): Promise<void> {
    try {
      await supabase
        .from('datemi_passes' as any)
        .insert({
          passer_id: passerId,
          passed_profile_id: passedProfileId,
          reason: reason || null,
        });
    } catch (error) {
      if (__DEV__) {
        console.log('datemi_passes table not available, skipping pass record');
      }
    }
  }

  /**
   * Get matching statistics
   */
  async getMatchingStats(userId: string): Promise<MatchingStats> {
    try {
      const profilesCount = await supabase.from('date_mi_profiles_with_tier').select('id', { count: 'exact', head: true });
      
      let matchesData = { data: [] as any[], error: null };
      let likesGivenData = { count: 0, error: null };
      let likesReceivedData = { count: 0, error: null };
      
      try {
        const matchResult = await supabase.from('datemi_matches' as any).select('compatibility_score').or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
        matchesData = matchResult as any;
      } catch {}
      
      try {
        likesGivenData = await supabase.from('datemi_likes').select('id', { count: 'exact', head: true }).eq('user_id', userId) as any;
      } catch {}
      
      try {
        likesReceivedData = await supabase.from('datemi_likes').select('id', { count: 'exact', head: true }).eq('profile_id', userId) as any;
      } catch {}

      const avgCompatibility = matchesData.data && matchesData.data.length > 0
        ? matchesData.data.reduce((sum: number, m: any) => sum + (m.compatibility_score || 0), 0) / matchesData.data.length
        : 0;

      const dailyLikesData = await this.getDailyLikesRemaining(userId);

      return {
        totalProfilesAvailable: profilesCount.count || 0,
        totalMatches: matchesData.data?.length || 0,
        totalLikesGiven: likesGivenData.count || 0,
        totalLikesReceived: likesReceivedData.count || 0,
        avgCompatibilityScore: Math.round(avgCompatibility),
        dailyLikesRemaining: dailyLikesData.remaining,
      };
    } catch (error) {
      if (__DEV__) {
        console.error('Error getting matching stats:', error);
      }
      return {
        totalProfilesAvailable: 0,
        totalMatches: 0,
        totalLikesGiven: 0,
        totalLikesReceived: 0,
        avgCompatibilityScore: 0,
        dailyLikesRemaining: 5,
      };
    }
  }

  /**
   * Get daily likes remaining
   */
  private async getDailyLikesRemaining(userId: string): Promise<{ remaining: number; limit: number }> {
    try {
      const { data: profile } = await supabase
        .from('date_mi_profiles_with_tier')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!profile) {
        return { remaining: 50, limit: 50 };
      }

      return { remaining: 50, limit: 50 };
    } catch (error) {
      if (__DEV__) {
        console.error('Error getting daily likes:', error);
      }
      return { remaining: 5, limit: 5 };
    }
  }

  /**
   * Transform database row to DateMiProfile
   */
  private transformToDateMiProfile(row: any): DateMiProfile {
    return {
      id: row.id,
      userId: row.user_id,
      displayName: row.display_name,
      ageVerified: row.age_verified || false,
      age: row.age,
      genderPreferences: row.gender_preferences || [],
      profilePictures: row.profile_pictures || [],
      aboutMe: row.about_me,
      privacySettings: row.privacy_settings || {},
      creatorStatus: row.creator_status || false,
      isOnline: row.is_online || false,
      lastSeen: row.last_seen || row.updated_at || new Date().toISOString(),
      location: row.location,
      interests: row.interests || [],
      intention: row.intention,
      verified: row.verified || false,
      subscriptionTier: 'free',
      subscriptionCountry: row.subscription_country || 'KE',
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(): MatchingPreferences {
    return {
      ageRange: { min: 18, max: 35 },
      maxDistance: 50,
      genderPreference: 'any',
      intentionPreference: ['short_term_fun', 'long_term_partner'],
      verifiedOnly: false,
      creatorsOnly: false,
      activityLevel: 'any',
      communicationStyle: ['text', 'voice', 'video'],
      lifestylePreferences: ['social', 'outdoor', 'indoor'],
      dealBreakers: [],
      preferredMeetingStyle: 'mixed',
    };
  }

  /**
   * Fallback recommendations when database is not available
   */
  private getFallbackRecommendations(): MatchScore[] {
    return [];
  }
}

export const enhancedMatchingService = new EnhancedMatchingService();

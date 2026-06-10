import { supabase } from './supabaseClient';
import { LEGACY_PLAY_STORE_REVIEWER_USER_IDS } from '../utils/playStoreReviewer';
import { formatPostgrestInList } from '../utils/supabaseFilters';

export interface RecommendationItem {
  id: string;
  type: 'property' | 'job' | 'service' | 'profile';
  title: string;
  description: string;
  imageUrl?: string;
  price?: number;
  location?: string;
  createdAt: string;
  relevanceScore: number;
  reason: string;
  metadata?: Record<string, any>;
}

export interface UserPreferences {
  interests: string[];
  priceRange: { min: number; max: number };
  locationPreference: string;
  contentTypes: string[];
  engagement_patterns: Record<string, number>;
}

export interface RecommendationConfig {
  maxResults: number;
  includeTypes: ('property' | 'job' | 'service' | 'profile')[];
  userId: string;
  excludeViewed?: boolean;
}

class RecommendationService {
  // Get personalized recommendations for a user
  async getPersonalizedRecommendations(config: RecommendationConfig): Promise<RecommendationItem[]> {
    try {
      const userPreferences = await this.getUserPreferences(config.userId);
      const userActivity = await this.getUserActivity(config.userId);
      
      const recommendations: RecommendationItem[] = [];
      
      // Get recommendations for each content type
      for (const type of config.includeTypes) {
        const typeRecommendations = await this.getRecommendationsByType(
          type, 
          config.userId, 
          userPreferences, 
          userActivity,
          Math.ceil(config.maxResults / config.includeTypes.length)
        );
        recommendations.push(...typeRecommendations);
      }

      // Sort by relevance score and return top results
      return recommendations
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, config.maxResults);

    } catch (error) {
      
      throw error;
    }
  }

  // Get trending content recommendations
  async getTrendingRecommendations(contentType: string, limit = 10): Promise<RecommendationItem[]> {
    try {
      const query = supabase.from('engagement_metrics')
        .select(`
          content_id,
          content_type,
          views,
          likes,
          shares,
          contacts,
          favorites
        `)
        .eq('content_type', contentType)
        .order('views', { ascending: false })
        .limit(limit);

      const { data: metrics, error } = await query;
      if (error) throw error;

      const recommendations: RecommendationItem[] = [];

      if (metrics) {
        for (const metric of metrics) {
          const content = await this.getContentDetails(metric.content_type, metric.content_id);
          if (content) {
            const engagementScore = (metric.views * 1) + (metric.likes * 3) + 
                                  (metric.shares * 5) + (metric.contacts * 7);
          
          recommendations.push({
            ...content,
            relevanceScore: engagementScore,
            reason: 'Trending content with high engagement'
            });
          }
        }
      }

      return recommendations;
    } catch (error) {
      
      return [];
    }
  }

  // Get user preferences from profile and activity
  private async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      // Get user's Date Mi profile for interests
      const { data: profile } = await supabase
        .from('date_mi_profiles_with_tier')
        .select('*')
        .eq('user_id', userId)
        .single() as any;

      // Get user's general profile
      const { data: user } = await supabase
        .from('users')
        .select('location_preferences')
        .eq('id', userId)
        .single() as any;

      // Analyze user's activity patterns
      const { data: activities } = await supabase
        .from('user_activities')
        .select('action, content_type, metadata')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100) as any;

      const engagement_patterns: Record<string, number> = {};
      const interests: string[] = [];
      const contentTypes: string[] = [];

      // Analyze activity patterns
      activities?.forEach((activity: any) => {
        engagement_patterns[activity.action] = (engagement_patterns[activity.action] || 0) + 1;
        if (!contentTypes.includes(activity.content_type)) {
          contentTypes.push(activity.content_type);
        }
        
        // Extract interests from metadata
        const metadata = activity.metadata as any;
        if (metadata?.category) {
          if (!interests.includes(metadata.category)) {
            interests.push(metadata.category);
          }
        }
      });

      const locationPrefs = user?.location_preferences as any;
      const userLocation = locationPrefs?.county || locationPrefs?.town || 'Kenya';
      return {
        interests,
        priceRange: { min: 0, max: 100000 },
        locationPreference: userLocation,
        contentTypes,
        engagement_patterns
      };
    } catch (error) {
      
      return {
        interests: [],
        priceRange: { min: 0, max: 100000 },
        locationPreference: 'Kenya',
        contentTypes: [],
        engagement_patterns: {}
      };
    }
  }

  // Get user's recent activity
  private async getUserActivity(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      return data || [];
    } catch (error) {
      
      return [];
    }
  }

  // Get recommendations by content type
  private async getRecommendationsByType(
    type: string, 
    userId: string, 
    preferences: UserPreferences, 
    activity: any[],
    limit: number
  ): Promise<RecommendationItem[]> {
    switch (type) {
      case 'property':
        return this.getPropertyRecommendations(userId, preferences, limit);
      case 'job':
        return this.getJobRecommendations(userId, preferences, limit);
      case 'service':
        return this.getServiceRecommendations(userId, preferences, limit);
      case 'profile':
        return this.getProfileRecommendations(userId, preferences, limit);
      default:
        return [];
    }
  }

  // Property recommendations based on user preferences
  private async getPropertyRecommendations(
    userId: string, 
    preferences: UserPreferences, 
    limit: number
  ): Promise<RecommendationItem[]> {
    try {
      let query: any = supabase
        .from('property_listings')
        .select(`
          id, title, description, price, location_coordinates,
          image_urls, property_type, listing_type, bedrooms,
          bathrooms, area_sqm, created_at
        `)
        .eq('status', 'available')
        .gte('price', preferences.priceRange.min)
        .lte('price', preferences.priceRange.max);

      if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
        query = query.not('owner_id', 'in', formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS));
      }

      const { data: properties, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit * 2) as any; // Get more to filter and score

      if (error) throw error;

      return (properties ?? []).map((property: any) => {
        let score = 50; // Base score
        let reason = 'Recent listing';

        // Location preference scoring
        const coords = property.location_coordinates as any;
        if (coords?.address?.includes(preferences.locationPreference)) {
          score += 20;
          reason = `Located in your preferred area (${preferences.locationPreference})`;
        }

        // Interest-based scoring
        if (preferences.interests.some(interest => 
          property.title.toLowerCase().includes(interest.toLowerCase()) ||
          property.description.toLowerCase().includes(interest.toLowerCase())
        )) {
          score += 15;
          reason = 'Matches your interests';
        }

        const imageUrls = property.image_urls as string[] | null;
        return {
          id: property.id,
          type: 'property' as const,
          title: property.title,
          description: property.description,
          imageUrl: imageUrls?.[0],
          price: property.price,
          location: coords?.address,
          createdAt: property.created_at,
          relevanceScore: score,
          reason,
          metadata: {
            propertyType: property.property_type,
            listingType: property.listing_type,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms
          }
        };
      }).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
    } catch (error) {
      
      return [];
    }
  }

  // Job recommendations
  private async getJobRecommendations(
    userId: string, 
    preferences: UserPreferences, 
    limit: number
  ): Promise<RecommendationItem[]> {
    try {
      let query: any = supabase
        .from('job_postings')
        .select('*')
        .eq('status', 'open');

      if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
        query = query.not('employer_id', 'in', formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS));
      }

      const { data: jobs, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit * 2) as any;

      if (error) throw error;

      return (jobs ?? []).map((job: any) => {
        let score = 50;
        let reason = 'Recent job posting';

        // Skills matching
        const requiredSkills = job.required_skills as string[] | null;
        if (requiredSkills?.some((skill: string) => 
          preferences.interests.some(interest => 
            skill.toLowerCase().includes(interest.toLowerCase())
          )
        )) {
          score += 25;
          reason = 'Matches your skills';
        }

        // Location preference
        if (job.location?.includes(preferences.locationPreference)) {
          score += 15;
          reason = `Job in ${preferences.locationPreference}`;
        }

        // Salary range (if provided)
        if (job.salary && job.salary >= preferences.priceRange.min) {
          score += 10;
        }

        return {
          id: job.id,
          type: 'job' as const,
          title: job.job_title,
          description: job.description,
          price: job.salary,
          location: job.location,
          createdAt: job.created_at,
          relevanceScore: score,
          reason,
          metadata: {
            jobType: job.job_type,
            experienceLevel: job.experience_level,
            requiredSkills: (job.required_skills as string[] | null) || []
          }
        };
      }).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
    } catch (error) {
      
      return [];
    }
  }

  // Service recommendations
  private async getServiceRecommendations(
    userId: string, 
    preferences: UserPreferences, 
    limit: number
  ): Promise<RecommendationItem[]> {
    try {
      let query: any = supabase
        .from('service_listings')
        .select('*')
        .eq('status', 'active');

      if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
        query = query.not('owner_id', 'in', formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS));
      }

      const { data: services, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit * 2) as any;

      if (error) throw error;

      return (services ?? []).map((service: any) => {
        let score = 50;
        let reason = 'Popular service';

        // Category matching
        if (preferences.interests.includes(service.category)) {
          score += 20;
          reason = `${service.category} service matching your interests`;
        }

        // Location preference
        if (service.location?.includes(preferences.locationPreference)) {
          score += 15;
        }

        // Price preference
        const pricingInfo = service.pricing_info as any;
        const basePrice = pricingInfo?.base_price;
        if (basePrice && basePrice <= preferences.priceRange.max) {
          score += 10;
        }

        const imageUrls = service.image_urls as string[] | null;
        const tags = service.tags as string[] | null;
        return {
          id: service.id,
          type: 'service' as const,
          title: service.service_name,
          description: service.description,
          imageUrl: imageUrls?.[0],
          price: basePrice,
          location: service.location,
          createdAt: service.created_at,
          relevanceScore: score,
          reason,
          metadata: {
            category: service.category,
            tags: tags || [],
            pricingInfo: pricingInfo
          }
        };
      }).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
    } catch (error) {
      
      return [];
    }
  }


  // Profile recommendations for Date Mi
  private async getProfileRecommendations(
    userId: string, 
    preferences: UserPreferences, 
    limit: number
  ): Promise<RecommendationItem[]> {
    try {
      // Get user's own profile to understand preferences
      const { data: userProfile } = await supabase
        .from('date_mi_profiles_with_tier')
        .select('gender_preferences, privacy_settings')
        .eq('user_id', userId)
        .single();

      const query = supabase
        .from('date_mi_profiles_with_tier')
        .select(`
          id, display_name, about_me, profile_pictures,
          age_verified, creator_status, subscription_tier,
          user_id, created_at
        `)
        .neq('user_id', userId) // Exclude self
        .order('created_at', { ascending: false });

      if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
        query.not('user_id', 'in', formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS));
      }

      // Filter by gender preferences if set
      if (userProfile?.gender_preferences?.length > 0) {
        // This would need a join with users table for gender info
        // For now, we'll use a broader approach
      }

      const { data: profiles, error } = await query.limit(limit * 2) as any;
      if (error) throw error;

      return (profiles ?? []).map((profile: any) => {
        let score = 50;
        let reason = 'Active Date Mi user';

        // Premium users get higher scores
        if (profile.subscription_tier === 'premium') {
          score += 20;
          reason = 'Premium Date Mi member';
        } else if (profile.subscription_tier === 'creator') {
          score += 25;
          reason = 'Verified creator';
        }

        // Age verified users
        if (profile.age_verified) {
          score += 15;
        }

        // Has profile picture
        const profilePictures = profile.profile_pictures as string[] | null;
        if (profilePictures?.length > 0) {
          score += 10;
        }

        // Has complete profile
        if (profile.about_me && profile.about_me.length > 50) {
          score += 10;
          reason = 'Complete profile with detailed bio';
        }

        return {
          id: profile.id,
          type: 'profile' as const,
          title: profile.display_name,
          description: profile.about_me || 'Date Mi user',
          imageUrl: profilePictures?.[0],
          createdAt: profile.created_at,
          relevanceScore: score,
          reason,
          metadata: {
            ageVerified: profile.age_verified,
            creatorStatus: profile.creator_status,
            subscriptionTier: profile.subscription_tier
          }
        };
      }).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
    } catch (error) {
      
      return [];
    }
  }

  // Get content details by type and ID
  private async getContentDetails(type: string, contentId: string): Promise<RecommendationItem | null> {
    try {
      switch (type) {
        case 'property':
          const { data: property } = await supabase
            .from('property_listings')
            .select('*')
            .eq('id', contentId)
            .single() as any;
          
          if (!property) return null;
          if (
            LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0 &&
            LEGACY_PLAY_STORE_REVIEWER_USER_IDS.includes(property.owner_id as string)
          ) {
            return null;
          }
          const imageUrls = property.image_urls as string[] | null;
          const locationCoords = property.location_coordinates as any;
          return {
            id: property.id,
            type: 'property',
            title: property.title,
            description: property.description,
            imageUrl: imageUrls?.[0],
            price: property.price,
            location: locationCoords?.address,
            createdAt: property.created_at,
            relevanceScore: 0,
            reason: '',
            metadata: {
              propertyType: property.property_type,
              listingType: property.listing_type
            }
          };

        case 'job':
          const { data: job } = await supabase
            .from('job_postings')
            .select('*')
            .eq('id', contentId)
            .single() as any;

          if (!job) return null;
          if (
            LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0 &&
            LEGACY_PLAY_STORE_REVIEWER_USER_IDS.includes(job.employer_id as string)
          ) {
            return null;
          }

          return {
            id: job.id,
            type: 'job',
            title: job.job_title,
            description: job.description,
            price: job.salary,
            location: job.location,
            createdAt: job.created_at,
            relevanceScore: 0,
            reason: '',
            metadata: {
              jobType: job.job_type,
              experienceLevel: job.experience_level
            }
          };

        case 'service':
          const { data: service } = await supabase
            .from('service_listings')
            .select('*')
            .eq('id', contentId)
            .single() as any;

          if (!service) return null;
          if (
            LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0 &&
            LEGACY_PLAY_STORE_REVIEWER_USER_IDS.includes(service.owner_id as string)
          ) {
            return null;
          }
          const serviceImageUrls = service.image_urls as string[] | null;
          const pricingInfo = service.pricing_info as any;
          const tags = service.tags as string[] | null;
          return {
            id: service.id,
            type: 'service',
            title: service.service_name,
            description: service.description,
            imageUrl: serviceImageUrls?.[0],
            price: pricingInfo?.base_price,
            location: service.location,
            createdAt: service.created_at,
            relevanceScore: 0,
            reason: '',
            metadata: {
              category: service.category,
              tags: tags || []
            }
          };


        default:
          return null;
      }
    } catch (error) {
      
      return null;
    }
  }

  // Record user interaction for future recommendations
  async recordInteraction(userId: string, item: RecommendationItem, action: string): Promise<void> {
    try {
      await supabase
        .from('user_activities')
        .insert([{
          user_id: userId,
          action,
          content_type: item.type,
          content_id: item.id,
          metadata: {
            recommendation_score: item.relevanceScore,
            recommendation_reason: item.reason,
            ...item.metadata
          },
          timestamp: new Date().toISOString()
        }]);
    } catch (error) {
      
    }
  }

  // Get similar content based on a specific item
  async getSimilarContent(
    item: RecommendationItem, 
    userId: string, 
    limit = 5
  ): Promise<RecommendationItem[]> {
    try {
      const preferences = await this.getUserPreferences(userId);
      
      switch (item.type) {
        case 'property':
          return this.getSimilarProperties(item, preferences, limit);
        case 'job':
          return this.getSimilarJobs(item, preferences, limit);
        case 'service':
          return this.getSimilarServices(item, preferences, limit);
        default:
          return [];
      }
    } catch (error) {
      
      return [];
    }
  }

  // Get similar properties
  private async getSimilarProperties(
    item: RecommendationItem, 
    preferences: UserPreferences, 
    limit: number
  ): Promise<RecommendationItem[]> {
    try {
      const priceRange = item.price ? {
        min: item.price * 0.8,
        max: item.price * 1.2
      } : preferences.priceRange;

      let query: any = supabase
        .from('property_listings')
        .select('*')
        .eq('status', 'available')
        .eq('property_type', item.metadata?.propertyType)
        .gte('price', priceRange.min)
        .lte('price', priceRange.max)
        .neq('id', item.id);

      if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
        query = query.not('owner_id', 'in', formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS));
      }

      const { data: properties, error } = await query.limit(limit) as any;

      if (error) throw error;

      return (properties ?? []).map((property: any) => {
        const imageUrls = property.image_urls as string[] | null;
        const locationCoords = property.location_coordinates as any;
        return {
          id: property.id,
          type: 'property' as const,
          title: property.title,
          description: property.description,
          imageUrl: imageUrls?.[0],
          price: property.price,
          location: locationCoords?.address,
          createdAt: property.created_at,
          relevanceScore: 70,
          reason: `Similar to ${item.title}`,
          metadata: {
            propertyType: property.property_type,
            listingType: property.listing_type
          }
        };
      });
    } catch (error) {
      
      return [];
    }
  }

  // Get similar jobs
  private async getSimilarJobs(
    item: RecommendationItem, 
    preferences: UserPreferences, 
    limit: number
  ): Promise<RecommendationItem[]> {
    try {
      let query: any = supabase
        .from('job_postings')
        .select('*')
        .eq('status', 'open')
        .eq('job_type', item.metadata?.jobType)
        .neq('id', item.id);

      if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
        query = query.not('employer_id', 'in', formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS));
      }

      const { data: jobs, error } = await query.limit(limit) as any;

      if (error) throw error;

      return (jobs ?? []).map((job: any) => ({
        id: job.id,
        type: 'job' as const,
        title: job.job_title,
        description: job.description,
        price: job.salary,
        location: job.location,
        createdAt: job.created_at,
        relevanceScore: 75,
        reason: `Similar ${item.metadata?.jobType} role`,
        metadata: {
          jobType: job.job_type,
          experienceLevel: job.experience_level
        }
      }));
    } catch (error) {
      
      return [];
    }
  }

  // Get similar services
  private async getSimilarServices(
    item: RecommendationItem, 
    preferences: UserPreferences, 
    limit: number
  ): Promise<RecommendationItem[]> {
    try {
      let query: any = supabase
        .from('service_listings')
        .select('*')
        .eq('status', 'active')
        .eq('category', item.metadata?.category)
        .neq('id', item.id);

      if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
        query = query.not('owner_id', 'in', formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS));
      }

      const { data: services, error } = await query.limit(limit) as any;

      if (error) throw error;

      return (services ?? []).map((service: any) => {
        const imageUrls = service.image_urls as string[] | null;
        const pricingInfo = service.pricing_info as any;
        const tags = service.tags as string[] | null;
        return {
          id: service.id,
          type: 'service' as const,
          title: service.service_name,
          description: service.description,
          imageUrl: imageUrls?.[0],
          price: pricingInfo?.base_price,
          location: service.location,
          createdAt: service.created_at,
          relevanceScore: 75,
          reason: `Similar ${item.metadata?.category} service`,
          metadata: {
            category: service.category,
            tags: tags || []
          }
        };
      });
    } catch (error) {
      
      return [];
    }
  }


  // Get recommendations for home screen
  async getHomeScreenRecommendations(userId: string): Promise<{
    trending: RecommendationItem[];
    personalized: RecommendationItem[];
    recent: RecommendationItem[];
  }> {
    try {
      const [trending, personalized, recent] = await Promise.all([
        this.getTrendingRecommendations('property', 3),
        this.getPersonalizedRecommendations({
          maxResults: 6,
          includeTypes: ['property', 'job', 'service'],
          userId
        }),
        this.getRecentContent(userId, 4)
      ]);

      return { trending, personalized, recent };
    } catch (error) {
      
      return { trending: [], personalized: [], recent: [] };
    }
  }

  // Get recent content across all types
  private async getRecentContent(userId: string, limit: number): Promise<RecommendationItem[]> {
    try {
      const recommendations: RecommendationItem[] = [];

      // Get recent properties
      const recentPropertiesQuery: any = supabase
        .from('property_listings')
        .select('*')
        .eq('status', 'available');

      if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
        recentPropertiesQuery.not(
          'owner_id',
          'in',
          formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS)
        );
      }

      const { data: properties } = await recentPropertiesQuery
        .order('created_at', { ascending: false })
        .limit(2) as any;

      // Get recent jobs  
      const recentJobsQuery: any = supabase
        .from('job_postings')
        .select('*')
        .eq('status', 'open');

      if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
        recentJobsQuery.not(
          'employer_id',
          'in',
          formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS)
        );
      }

      const { data: jobs } = await recentJobsQuery
        .order('created_at', { ascending: false })
        .limit(2) as any;

      // Convert to recommendation format
      properties?.forEach((property: any) => {
        const imageUrls = property.image_urls as string[] | null;
        const locationCoords = property.location_coordinates as any;
        recommendations.push({
          id: property.id,
          type: 'property',
          title: property.title,
          description: property.description,
          imageUrl: imageUrls?.[0],
          price: property.price,
          location: locationCoords?.address,
          createdAt: property.created_at,
          relevanceScore: 60,
          reason: 'Recently posted'
        });
      });

      jobs?.forEach((job: any) => {
        recommendations.push({
          id: job.id,
          type: 'job',
          title: job.job_title,
          description: job.description,
          price: job.salary,
          location: job.location,
          createdAt: job.created_at,
          relevanceScore: 60,
          reason: 'Recent job posting'
        });
      });

      return recommendations
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    } catch (error) {
      
      return [];
    }
  }

  // Update user preferences based on interactions
  async updateUserPreferences(userId: string, action: string, contentType: string, metadata?: any): Promise<void> {
    try {
      // This would implement machine learning algorithms to update user preferences
      // For now, we'll track interactions in the user_activities table
      await supabase
        .from('user_activities')
        .insert([{
          user_id: userId,
          action,
          content_type: contentType,
          content_id: metadata?.contentId || '',
          metadata: metadata || {},
          timestamp: new Date().toISOString()
        }]);
    } catch (error) {
      
    }
  }

  // Get recommendation insights for analytics
  async getRecommendationInsights(userId: string): Promise<{
    totalRecommendations: number;
    clickThroughRate: number;
    topCategories: string[];
    engagementScore: number;
  }> {
    try {
      // Get user's recommendation interactions
      const { data: interactions } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', userId)
        .in('action', ['view', 'like', 'contact', 'share'])
        .order('created_at', { ascending: false })
        .limit(100);

      const totalRecommendations = interactions?.length || 0;
      const engagements = interactions?.filter(i => ['like', 'contact', 'share'].includes(i.action)).length || 0;
      const clickThroughRate = totalRecommendations > 0 ? (engagements / totalRecommendations) * 100 : 0;

      // Get top categories
      const categoryCount: Record<string, number> = {};
      interactions?.forEach(interaction => {
        const metadata = interaction.metadata as any;
        const category = metadata?.category || interaction.content_type;
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });

      const topCategories = Object.entries(categoryCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category]) => category);

      return {
        totalRecommendations,
        clickThroughRate,
        topCategories,
        engagementScore: clickThroughRate
      };
    } catch (error) {
      
      return {
        totalRecommendations: 0,
        clickThroughRate: 0,
        topCategories: [],
        engagementScore: 0
      };
    }
  }
}

export const recommendationService = new RecommendationService();

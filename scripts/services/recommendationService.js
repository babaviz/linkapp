"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendationService = void 0;
const supabaseClient_1 = require("./supabaseClient");
class RecommendationService {
    // Get personalized recommendations for a user
    async getPersonalizedRecommendations(config) {
        try {
            const userPreferences = await this.getUserPreferences(config.userId);
            const userActivity = await this.getUserActivity(config.userId);
            const recommendations = [];
            // Get recommendations for each content type
            for (const type of config.includeTypes) {
                const typeRecommendations = await this.getRecommendationsByType(type, config.userId, userPreferences, userActivity, Math.ceil(config.maxResults / config.includeTypes.length));
                recommendations.push(...typeRecommendations);
            }
            // Sort by relevance score and return top results
            return recommendations
                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                .slice(0, config.maxResults);
        }
        catch (error) {
            
            throw error;
        }
    }
    // Get trending content recommendations
    async getTrendingRecommendations(contentType, limit = 10) {
        try {
            const query = supabaseClient_1.supabase.from('engagement_metrics')
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
            if (error)
                throw error;
            const recommendations = [];
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
            return recommendations;
        }
        catch (error) {
            
            return [];
        }
    }
    // Get user preferences from profile and activity
    async getUserPreferences(userId) {
        try {
            // Get user's Date Mi profile for interests
            const { data: profile } = await supabaseClient_1.supabase
                .from('date_mi_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();
            // Get user's general profile
            const { data: user } = await supabaseClient_1.supabase
                .from('users')
                .select('location_preferences')
                .eq('id', userId)
                .single();
            // Analyze user's activity patterns
            const { data: activities } = await supabaseClient_1.supabase
                .from('user_activities')
                .select('action, content_type, metadata')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(100);
            const engagement_patterns = {};
            const interests = [];
            const contentTypes = [];
            // Analyze activity patterns
            activities?.forEach(activity => {
                engagement_patterns[activity.action] = (engagement_patterns[activity.action] || 0) + 1;
                if (!contentTypes.includes(activity.content_type)) {
                    contentTypes.push(activity.content_type);
                }
                // Extract interests from metadata
                if (activity.metadata?.category) {
                    if (!interests.includes(activity.metadata.category)) {
                        interests.push(activity.metadata.category);
                    }
                }
            });
            return {
                interests,
                priceRange: { min: 0, max: 100000 },
                locationPreference: user?.location_preferences?.preferred_location || 'Kenya',
                contentTypes,
                engagement_patterns
            };
        }
        catch (error) {
            
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
    async getUserActivity(userId) {
        try {
            const { data, error } = await supabaseClient_1.supabase
                .from('user_activities')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);
            return data || [];
        }
        catch (error) {
            
            return [];
        }
    }
    // Get recommendations by content type
    async getRecommendationsByType(type, userId, preferences, activity, limit) {
        switch (type) {
            case 'property':
                return this.getPropertyRecommendations(userId, preferences, limit);
            case 'job':
                return this.getJobRecommendations(userId, preferences, limit);
            case 'service':
                return this.getServiceRecommendations(userId, preferences, limit);
            case 'story':
                return this.getStoryRecommendations(userId, preferences, activity, limit);
            case 'profile':
                return this.getProfileRecommendations(userId, preferences, limit);
            default:
                return [];
        }
    }
    // Property recommendations based on user preferences
    async getPropertyRecommendations(userId, preferences, limit) {
        try {
            const { data: properties, error } = await supabaseClient_1.supabase
                .from('property_listings')
                .select(`
          id, title, description, price, location_coordinates,
          image_urls, property_type, listing_type, bedrooms,
          bathrooms, square_meters, created_at
        `)
                .eq('status', 'active')
                .gte('price', preferences.priceRange.min)
                .lte('price', preferences.priceRange.max)
                .order('created_at', { ascending: false })
                .limit(limit * 2); // Get more to filter and score
            if (error)
                throw error;
            return properties?.map(property => {
                let score = 50; // Base score
                let reason = 'Recent listing';
                // Location preference scoring
                if (property.location_coordinates?.address?.includes(preferences.locationPreference)) {
                    score += 20;
                    reason = `Located in your preferred area (${preferences.locationPreference})`;
                }
                // Interest-based scoring
                if (preferences.interests.some(interest => property.title.toLowerCase().includes(interest.toLowerCase()) ||
                    property.description.toLowerCase().includes(interest.toLowerCase()))) {
                    score += 15;
                    reason = 'Matches your interests';
                }
                return {
                    id: property.id,
                    type: 'property',
                    title: property.title,
                    description: property.description,
                    imageUrl: property.image_urls?.[0],
                    price: property.price,
                    location: property.location_coordinates?.address,
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
            }).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit) || [];
        }
        catch (error) {
            
            return [];
        }
    }
    // Job recommendations
    async getJobRecommendations(userId, preferences, limit) {
        try {
            const { data: jobs, error } = await supabaseClient_1.supabase
                .from('job_postings')
                .select('*')
                .eq('status', 'open')
                .order('created_at', { ascending: false })
                .limit(limit * 2);
            if (error)
                throw error;
            return jobs?.map(job => {
                let score = 50;
                let reason = 'Recent job posting';
                // Skills matching
                if (job.required_skills?.some((skill) => preferences.interests.some(interest => skill.toLowerCase().includes(interest.toLowerCase())))) {
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
                    type: 'job',
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
                        requiredSkills: job.required_skills
                    }
                };
            }).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit) || [];
        }
        catch (error) {
            
            return [];
        }
    }
    // Service recommendations
    async getServiceRecommendations(userId, preferences, limit) {
        try {
            const { data: services, error } = await supabaseClient_1.supabase
                .from('service_listings')
                .select('*')
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(limit * 2);
            if (error)
                throw error;
            return services?.map(service => {
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
                const basePrice = service.pricing_info?.base_price;
                if (basePrice && basePrice <= preferences.priceRange.max) {
                    score += 10;
                }
                return {
                    id: service.id,
                    type: 'service',
                    title: service.service_name,
                    description: service.description,
                    imageUrl: service.image_urls?.[0],
                    price: basePrice,
                    location: service.location,
                    createdAt: service.created_at,
                    relevanceScore: score,
                    reason,
                    metadata: {
                        category: service.category,
                        tags: service.tags,
                        pricingInfo: service.pricing_info
                    }
                };
            }).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit) || [];
        }
        catch (error) {
            
            return [];
        }
    }
    // Story recommendations based on engagement patterns
    async getStoryRecommendations(userId, preferences, activity, limit) {
        try {
            // Get stories the user hasn't viewed yet
            const viewedStoryIds = activity
                .filter(a => a.content_type === 'story' && a.action === 'view')
                .map(a => a.content_id);
            let query = supabaseClient_1.supabase
                .from('stories')
                .select('*')
                .eq('status', 'published')
                .order('engagement_count', { ascending: false });
            if (viewedStoryIds.length > 0) {
                query = query.not('id', 'in', `(${viewedStoryIds.join(',')})`);
            }
            const { data: stories, error } = await query.limit(limit * 2);
            if (error)
                throw error;
            return stories?.map(story => {
                let score = story.engagement_count || 0;
                let reason = 'Popular story';
                // Tag matching with user interests
                if (story.tags?.some((tag) => preferences.interests.some(interest => tag.toLowerCase().includes(interest.toLowerCase())))) {
                    score += 30;
                    reason = 'Story matching your interests';
                }
                // Media type preference
                if (preferences.engagement_patterns[story.media_type]) {
                    score += preferences.engagement_patterns[story.media_type] * 2;
                    reason = `${story.media_type} content you enjoy`;
                }
                return {
                    id: story.id,
                    type: 'story',
                    title: story.title,
                    description: story.content.substring(0, 150) + '...',
                    imageUrl: story.media_urls?.[0],
                    createdAt: story.created_at,
                    relevanceScore: score,
                    reason,
                    metadata: {
                        mediaType: story.media_type,
                        tags: story.tags,
                        engagementCount: story.engagement_count
                    }
                };
            }).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit) || [];
        }
        catch (error) {
            
            return [];
        }
    }
    // Profile recommendations for Date Mi
    async getProfileRecommendations(userId, preferences, limit) {
        try {
            // Get user's own profile to understand preferences
            const { data: userProfile } = await supabaseClient_1.supabase
                .from('date_mi_profiles')
                .select('gender_preferences, privacy_settings')
                .eq('user_id', userId)
                .single();
            const query = supabaseClient_1.supabase
                .from('date_mi_profiles')
                .select(`
          id, display_name, about_me, profile_pictures,
          age_verified, creator_status, subscription_tier,
          user_id, created_at
        `)
                .neq('user_id', userId) // Exclude self
                .order('created_at', { ascending: false });
            // Filter by gender preferences if set
            if (userProfile?.gender_preferences?.length > 0) {
                // This would need a join with users table for gender info
                // For now, we'll use a broader approach
            }
            const { data: profiles, error } = await query.limit(limit * 2);
            if (error)
                throw error;
            return profiles?.map(profile => {
                let score = 50;
                let reason = 'Active Date Mi user';
                // Premium users get higher scores
                if (profile.subscription_tier === 'premium') {
                    score += 20;
                    reason = 'Premium Date Mi member';
                }
                else if (profile.subscription_tier === 'creator') {
                    score += 25;
                    reason = 'Verified creator';
                }
                // Age verified users
                if (profile.age_verified) {
                    score += 15;
                }
                // Has profile picture
                if (profile.profile_pictures?.length > 0) {
                    score += 10;
                }
                // Has complete profile
                if (profile.about_me && profile.about_me.length > 50) {
                    score += 10;
                    reason = 'Complete profile with detailed bio';
                }
                return {
                    id: profile.id,
                    type: 'profile',
                    title: profile.display_name,
                    description: profile.about_me || 'Date Mi user',
                    imageUrl: profile.profile_pictures?.[0],
                    createdAt: profile.created_at,
                    relevanceScore: score,
                    reason,
                    metadata: {
                        ageVerified: profile.age_verified,
                        creatorStatus: profile.creator_status,
                        subscriptionTier: profile.subscription_tier
                    }
                };
            }).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit) || [];
        }
        catch (error) {
            
            return [];
        }
    }
    // Get content details by type and ID
    async getContentDetails(type, contentId) {
        try {
            switch (type) {
                case 'property':
                    const { data: property } = await supabaseClient_1.supabase
                        .from('property_listings')
                        .select('*')
                        .eq('id', contentId)
                        .single();
                    return property ? {
                        id: property.id,
                        type: 'property',
                        title: property.title,
                        description: property.description,
                        imageUrl: property.image_urls?.[0],
                        price: property.price,
                        location: property.location_coordinates?.address,
                        createdAt: property.created_at,
                        relevanceScore: 0,
                        reason: '',
                        metadata: {
                            propertyType: property.property_type,
                            listingType: property.listing_type
                        }
                    } : null;
                case 'job':
                    const { data: job } = await supabaseClient_1.supabase
                        .from('job_postings')
                        .select('*')
                        .eq('id', contentId)
                        .single();
                    return job ? {
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
                    } : null;
                case 'service':
                    const { data: service } = await supabaseClient_1.supabase
                        .from('service_listings')
                        .select('*')
                        .eq('id', contentId)
                        .single();
                    return service ? {
                        id: service.id,
                        type: 'service',
                        title: service.service_name,
                        description: service.description,
                        imageUrl: service.image_urls?.[0],
                        price: service.pricing_info?.base_price,
                        location: service.location,
                        createdAt: service.created_at,
                        relevanceScore: 0,
                        reason: '',
                        metadata: {
                            category: service.category,
                            tags: service.tags
                        }
                    } : null;
                case 'story':
                    const { data: story } = await supabaseClient_1.supabase
                        .from('stories')
                        .select('*')
                        .eq('id', contentId)
                        .single();
                    return story ? {
                        id: story.id,
                        type: 'story',
                        title: story.title,
                        description: story.content.substring(0, 150) + '...',
                        imageUrl: story.media_urls?.[0],
                        createdAt: story.created_at,
                        relevanceScore: 0,
                        reason: '',
                        metadata: {
                            mediaType: story.media_type,
                            tags: story.tags
                        }
                    } : null;
                default:
                    return null;
            }
        }
        catch (error) {
            
            return null;
        }
    }
    // Record user interaction for future recommendations
    async recordInteraction(userId, item, action) {
        try {
            await supabaseClient_1.supabase
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
        }
        catch (error) {
            
        }
    }
    // Get similar content based on a specific item
    async getSimilarContent(item, userId, limit = 5) {
        try {
            const preferences = await this.getUserPreferences(userId);
            switch (item.type) {
                case 'property':
                    return this.getSimilarProperties(item, preferences, limit);
                case 'job':
                    return this.getSimilarJobs(item, preferences, limit);
                case 'service':
                    return this.getSimilarServices(item, preferences, limit);
                case 'story':
                    return this.getSimilarStories(item, preferences, limit);
                default:
                    return [];
            }
        }
        catch (error) {
            
            return [];
        }
    }
    // Get similar properties
    async getSimilarProperties(item, preferences, limit) {
        try {
            const priceRange = item.price ? {
                min: item.price * 0.8,
                max: item.price * 1.2
            } : preferences.priceRange;
            const { data: properties, error } = await supabaseClient_1.supabase
                .from('property_listings')
                .select('*')
                .eq('status', 'active')
                .eq('property_type', item.metadata?.propertyType)
                .gte('price', priceRange.min)
                .lte('price', priceRange.max)
                .neq('id', item.id)
                .limit(limit);
            if (error)
                throw error;
            return properties?.map(property => ({
                id: property.id,
                type: 'property',
                title: property.title,
                description: property.description,
                imageUrl: property.image_urls?.[0],
                price: property.price,
                location: property.location_coordinates?.address,
                createdAt: property.created_at,
                relevanceScore: 70,
                reason: `Similar to ${item.title}`,
                metadata: {
                    propertyType: property.property_type,
                    listingType: property.listing_type
                }
            })) || [];
        }
        catch (error) {
            
            return [];
        }
    }
    // Get similar jobs
    async getSimilarJobs(item, preferences, limit) {
        try {
            const { data: jobs, error } = await supabaseClient_1.supabase
                .from('job_postings')
                .select('*')
                .eq('status', 'open')
                .eq('job_type', item.metadata?.jobType)
                .neq('id', item.id)
                .limit(limit);
            if (error)
                throw error;
            return jobs?.map(job => ({
                id: job.id,
                type: 'job',
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
            })) || [];
        }
        catch (error) {
            
            return [];
        }
    }
    // Get similar services
    async getSimilarServices(item, preferences, limit) {
        try {
            const { data: services, error } = await supabaseClient_1.supabase
                .from('service_listings')
                .select('*')
                .eq('status', 'active')
                .eq('category', item.metadata?.category)
                .neq('id', item.id)
                .limit(limit);
            if (error)
                throw error;
            return services?.map(service => ({
                id: service.id,
                type: 'service',
                title: service.service_name,
                description: service.description,
                imageUrl: service.image_urls?.[0],
                price: service.pricing_info?.base_price,
                location: service.location,
                createdAt: service.created_at,
                relevanceScore: 75,
                reason: `Similar ${item.metadata?.category} service`,
                metadata: {
                    category: service.category,
                    tags: service.tags
                }
            })) || [];
        }
        catch (error) {
            
            return [];
        }
    }
    // Get similar stories
    async getSimilarStories(item, preferences, limit) {
        try {
            const { data: stories, error } = await supabaseClient_1.supabase
                .from('stories')
                .select('*')
                .eq('status', 'published')
                .eq('media_type', item.metadata?.mediaType)
                .neq('id', item.id)
                .order('engagement_count', { ascending: false })
                .limit(limit);
            if (error)
                throw error;
            return stories?.map(story => ({
                id: story.id,
                type: 'story',
                title: story.title,
                description: story.content.substring(0, 150) + '...',
                imageUrl: story.media_urls?.[0],
                createdAt: story.created_at,
                relevanceScore: 70,
                reason: `Similar ${item.metadata?.mediaType} story`,
                metadata: {
                    mediaType: story.media_type,
                    tags: story.tags
                }
            })) || [];
        }
        catch (error) {
            
            return [];
        }
    }
    // Get recommendations for home screen
    async getHomeScreenRecommendations(userId) {
        try {
            const [trending, personalized, recent] = await Promise.all([
                this.getTrendingRecommendations('property', 3),
                this.getPersonalizedRecommendations({
                    maxResults: 6,
                    includeTypes: ['property', 'job', 'service', 'story'],
                    userId
                }),
                this.getRecentContent(userId, 4)
            ]);
            return { trending, personalized, recent };
        }
        catch (error) {
            
            return { trending: [], personalized: [], recent: [] };
        }
    }
    // Get recent content across all types
    async getRecentContent(userId, limit) {
        try {
            const recommendations = [];
            // Get recent properties
            const { data: properties } = await supabaseClient_1.supabase
                .from('property_listings')
                .select('*')
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(2);
            // Get recent jobs  
            const { data: jobs } = await supabaseClient_1.supabase
                .from('job_postings')
                .select('*')
                .eq('status', 'open')
                .order('created_at', { ascending: false })
                .limit(2);
            // Convert to recommendation format
            properties?.forEach(property => {
                recommendations.push({
                    id: property.id,
                    type: 'property',
                    title: property.title,
                    description: property.description,
                    imageUrl: property.image_urls?.[0],
                    price: property.price,
                    location: property.location_coordinates?.address,
                    createdAt: property.created_at,
                    relevanceScore: 60,
                    reason: 'Recently posted'
                });
            });
            jobs?.forEach(job => {
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
        }
        catch (error) {
            
            return [];
        }
    }
    // Update user preferences based on interactions
    async updateUserPreferences(userId, action, contentType, metadata) {
        try {
            // This would implement machine learning algorithms to update user preferences
            // For now, we'll track interactions in the user_activities table
            await supabaseClient_1.supabase
                .from('user_activities')
                .insert([{
                    user_id: userId,
                    action,
                    content_type: contentType,
                    content_id: metadata?.contentId || '',
                    metadata: metadata || {},
                    timestamp: new Date().toISOString()
                }]);
        }
        catch (error) {
            
        }
    }
    // Get recommendation insights for analytics
    async getRecommendationInsights(userId) {
        try {
            // Get user's recommendation interactions
            const { data: interactions } = await supabaseClient_1.supabase
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
            const categoryCount = {};
            interactions?.forEach(interaction => {
                const category = interaction.metadata?.category || interaction.content_type;
                categoryCount[category] = (categoryCount[category] || 0) + 1;
            });
            const topCategories = Object.entries(categoryCount)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([category]) => category);
            return {
                totalRecommendations,
                clickThroughRate,
                topCategories,
                engagementScore: clickThroughRate
            };
        }
        catch (error) {
            
            return {
                totalRecommendations: 0,
                clickThroughRate: 0,
                topCategories: [],
                engagementScore: 0
            };
        }
    }
}
exports.recommendationService = new RecommendationService();

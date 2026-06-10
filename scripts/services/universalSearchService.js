"use strict";
/**
 * Universal Search Service
 * Provides unified search functionality across all modules
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.universalSearchService = void 0;
const propertyService_1 = require("./propertyService");
const property_1 = require("../types/property");
/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
}
class UniversalSearchService {
    constructor() {
        this.searchPreferences = null;
        this.recentSearches = [];
    }
    /**
     * Perform universal search across specified module
     */
    async search(query) {
        const startTime = Date.now();
        try {
            let results = [];
            let totalResults = 0;
            let totalPages = 1;
            // Route search to appropriate module service
            switch (query.module) {
                case 'property':
                    results = await this.searchProperties(query);
                    break;
                case 'jobs':
                    results = await this.searchJobs(query);
                    break;
                case 'services':
                    results = await this.searchServices(query);
                    break;
                case 'stories':
                    results = await this.searchStories(query);
                    break;
                case 'datemi':
                    results = await this.searchDateMi(query);
                    break;
                default:
                    throw new Error(`Unsupported module: ${query.module}`);
            }
            // Calculate pagination
            const limit = query.limit || 20;
            const page = query.page || 1;
            totalResults = results.length;
            totalPages = Math.ceil(totalResults / limit);
            // Apply pagination
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedResults = results.slice(startIndex, endIndex);
            // Store recent search
            if (query.searchText) {
                this.addRecentSearch(query.searchText);
            }
            const searchTime = Date.now() - startTime;
            return {
                results: paginatedResults,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalResults,
                    hasMore: endIndex < totalResults
                },
                filters: query.filters,
                suggestions: await this.generateSuggestions(query),
                searchTime
            };
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Search properties
     */
    async searchProperties(query) {
        try {
            const propertyQuery = {
                search_text: query.searchText,
                filters: query.filters,
                sort_by: query.sortBy || 'date_newest',
                page: query.page || 1,
                limit: query.limit || 20
            };
            const response = await propertyService_1.propertyService.fetchProperties(propertyQuery);
            return response.properties.map(property => ({
                id: property.id,
                title: property.title,
                description: property.description,
                imageUrl: property.images[0],
                module: 'property',
                createdAt: property.created_at,
                updatedAt: property.updated_at,
                location: {
                    address: property.location.address,
                    coordinates: property.location.coordinates
                },
                metadata: {
                    price: property.price,
                    propertyType: property.property_type,
                    bedrooms: property.bedrooms,
                    bathrooms: property.bathrooms,
                    status: property.status
                }
            }));
        }
        catch (error) {
            
            return [];
        }
    }
    /**
     * Search jobs (demo implementation)
     */
    async searchJobs(query) {
        // Demo data for jobs with more realistic coordinates
        const demoJobs = [
            {
                id: 'job-1',
                title: 'React Native Developer',
                description: 'Join our team to build amazing mobile applications',
                company: 'TechCorp Kenya',
                salary: 150000,
                location: 'Nairobi, Kenya',
                coordinates: { latitude: -1.286389, longitude: 36.817223 }
            },
            {
                id: 'job-2',
                title: 'Digital Marketing Specialist',
                description: 'Drive growth through innovative marketing strategies',
                company: 'StartupHub',
                salary: 100000,
                location: 'Mombasa, Kenya',
                coordinates: { latitude: -4.0435, longitude: 39.6682 }
            },
            {
                id: 'job-3',
                title: 'Project Manager',
                description: 'Lead cross-functional teams in delivering successful projects',
                company: 'BuildIt Ltd',
                salary: 120000,
                location: 'Kisumu, Kenya',
                coordinates: { latitude: -0.0917, longitude: 34.7680 }
            },
            {
                id: 'job-4',
                title: 'Software Engineer',
                description: 'Full-stack development using modern technologies',
                company: 'Innovate Hub',
                salary: 140000,
                location: 'Nakuru, Kenya',
                coordinates: { latitude: -0.3031, longitude: 36.0800 }
            }
        ];
        let filteredJobs = demoJobs;
        // Apply search text filter
        if (query.searchText) {
            const searchLower = query.searchText.toLowerCase();
            filteredJobs = filteredJobs.filter(job => job.title.toLowerCase().includes(searchLower) ||
                job.description.toLowerCase().includes(searchLower) ||
                job.company.toLowerCase().includes(searchLower));
        }
        // Apply location filter
        if (query.filters.location?.coordinates) {
            const userLat = query.filters.location.coordinates.latitude;
            const userLon = query.filters.location.coordinates.longitude;
            const radius = query.filters.location.coordinates.radius || 50; // Default 50km radius
            filteredJobs = filteredJobs.filter(job => {
                const distance = calculateDistance(userLat, userLon, job.coordinates.latitude, job.coordinates.longitude);
                return distance <= radius;
            });
        }
        // Apply location county/town filter
        if (query.filters.location?.county || query.filters.location?.town) {
            const locationFilter = (query.filters.location.county || query.filters.location.town || '').toLowerCase();
            filteredJobs = filteredJobs.filter(job => job.location.toLowerCase().includes(locationFilter));
        }
        return filteredJobs.map(job => ({
            id: job.id,
            title: job.title,
            description: job.description,
            imageUrl: undefined,
            module: 'jobs',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            location: {
                address: job.location,
                coordinates: job.coordinates
            },
            metadata: {
                company: job.company,
                salary: job.salary,
                distance: query.filters.location?.coordinates ?
                    calculateDistance(query.filters.location.coordinates.latitude, query.filters.location.coordinates.longitude, job.coordinates.latitude, job.coordinates.longitude).toFixed(1) + ' km away' : undefined
            }
        }));
    }
    /**
     * Search services (demo implementation)
     */
    async searchServices(query) {
        const demoServices = [
            {
                id: 'service-1',
                title: 'Professional Plumbing Services',
                description: 'Reliable plumbing solutions for your home',
                provider: 'FixIt Pros',
                rating: 4.8,
                location: 'Nairobi, Kenya',
                coordinates: { latitude: -1.286389, longitude: 36.817223 }
            },
            {
                id: 'service-2',
                title: 'House Cleaning Services',
                description: 'Professional cleaning for residential properties',
                provider: 'CleanCorp',
                rating: 4.6,
                location: 'Kiambu, Kenya',
                coordinates: { latitude: -1.1742, longitude: 36.8350 }
            },
            {
                id: 'service-3',
                title: 'Electrical Repair & Installation',
                description: 'Licensed electricians for all your electrical needs',
                provider: 'PowerFix Electrical',
                rating: 4.9,
                location: 'Westlands, Nairobi',
                coordinates: { latitude: -1.2674, longitude: 36.8110 }
            },
            {
                id: 'service-4',
                title: 'Garden & Landscape Services',
                description: 'Beautiful gardens and landscape maintenance',
                provider: 'Green Thumb Ltd',
                rating: 4.5,
                location: 'Karen, Nairobi',
                coordinates: { latitude: -1.3191, longitude: 36.6853 }
            },
            {
                id: 'service-5',
                title: 'Home Security Installation',
                description: 'Professional security systems and CCTV installation',
                provider: 'SecureHome Kenya',
                rating: 4.7,
                location: 'Mombasa, Kenya',
                coordinates: { latitude: -4.0435, longitude: 39.6682 }
            }
        ];
        let filteredServices = demoServices;
        // Apply search text filter
        if (query.searchText) {
            const searchLower = query.searchText.toLowerCase();
            filteredServices = filteredServices.filter(service => service.title.toLowerCase().includes(searchLower) ||
                service.description.toLowerCase().includes(searchLower) ||
                service.provider.toLowerCase().includes(searchLower));
        }
        // Apply location filter with radius
        if (query.filters.location?.coordinates) {
            const userLat = query.filters.location.coordinates.latitude;
            const userLon = query.filters.location.coordinates.longitude;
            const radius = query.filters.location.coordinates.radius || 25; // Default 25km radius for services
            filteredServices = filteredServices.filter(service => {
                const distance = calculateDistance(userLat, userLon, service.coordinates.latitude, service.coordinates.longitude);
                return distance <= radius;
            });
        }
        // Apply location county/town filter
        if (query.filters.location?.county || query.filters.location?.town) {
            const locationFilter = (query.filters.location.county || query.filters.location.town || '').toLowerCase();
            filteredServices = filteredServices.filter(service => service.location.toLowerCase().includes(locationFilter));
        }
        // Sort by rating if no specific sort is provided
        if (!query.sortBy || query.sortBy === 'rating') {
            filteredServices.sort((a, b) => b.rating - a.rating);
        }
        return filteredServices.map(service => ({
            id: service.id,
            title: service.title,
            description: service.description,
            imageUrl: undefined,
            module: 'services',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            location: {
                address: service.location,
                coordinates: service.coordinates
            },
            metadata: {
                provider: service.provider,
                rating: service.rating,
                distance: query.filters.location?.coordinates ?
                    calculateDistance(query.filters.location.coordinates.latitude, query.filters.location.coordinates.longitude, service.coordinates.latitude, service.coordinates.longitude).toFixed(1) + ' km away' : undefined
            }
        }));
    }
    /**
     * Search stories (demo implementation)
     */
    async searchStories(query) {
        const demoStories = [
            {
                id: 'story-1',
                title: 'My Journey in Nairobi Tech Scene',
                description: 'Sharing experiences from the vibrant tech community',
                author: 'TechEnthusiast',
                likes: 245,
                type: 'text'
            },
            {
                id: 'story-2',
                title: 'Beautiful Kenya Safari Experience',
                description: 'Amazing wildlife photography from Maasai Mara',
                author: 'WildlifePhotog',
                likes: 892,
                type: 'photo'
            }
        ];
        let filteredStories = demoStories;
        if (query.searchText) {
            const searchLower = query.searchText.toLowerCase();
            filteredStories = filteredStories.filter(story => story.title.toLowerCase().includes(searchLower) ||
                story.description.toLowerCase().includes(searchLower));
        }
        return filteredStories.map(story => ({
            id: story.id,
            title: story.title,
            description: story.description,
            imageUrl: story.type === 'photo' ? 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=400' : undefined,
            module: 'stories',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {
                author: story.author,
                likes: story.likes,
                type: story.type
            }
        }));
    }
    /**
     * Search DateMi profiles (demo implementation)
     */
    async searchDateMi(query) {
        const demoProfiles = [
            {
                id: 'profile-1',
                name: 'Sarah K.',
                bio: 'Love hiking and exploring new places',
                age: 25,
                location: 'Nairobi',
                interests: ['hiking', 'travel', 'photography']
            },
            {
                id: 'profile-2',
                name: 'James M.',
                bio: 'Tech professional passionate about innovation',
                age: 28,
                location: 'Kisumu',
                interests: ['technology', 'music', 'fitness']
            }
        ];
        let filteredProfiles = demoProfiles;
        if (query.searchText) {
            const searchLower = query.searchText.toLowerCase();
            filteredProfiles = filteredProfiles.filter(profile => profile.name.toLowerCase().includes(searchLower) ||
                profile.bio.toLowerCase().includes(searchLower) ||
                profile.interests.some(interest => interest.toLowerCase().includes(searchLower)));
        }
        return filteredProfiles.map(profile => ({
            id: profile.id,
            title: profile.name,
            description: profile.bio,
            imageUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b789?w=400',
            module: 'datemi',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            location: {
                address: profile.location,
                coordinates: { latitude: -1.286389, longitude: 36.817223 }
            },
            metadata: {
                age: profile.age,
                interests: profile.interests
            }
        }));
    }
    /**
     * Generate search suggestions
     */
    async generateSuggestions(query) {
        const suggestions = [];
        // Add recent searches
        suggestions.push(...this.recentSearches.slice(0, 3));
        // Add module-specific suggestions
        switch (query.module) {
            case 'property':
                suggestions.push('apartments in Nairobi', '3 bedroom house', 'commercial plots');
                break;
            case 'jobs':
                suggestions.push('software developer', 'remote work', 'customer service');
                break;
            case 'services':
                suggestions.push('plumbing', 'house cleaning', 'electrical repair');
                break;
            case 'stories':
                suggestions.push('travel stories', 'tech experiences', 'lifestyle tips');
                break;
            case 'datemi':
                suggestions.push('serious relationship', 'casual dating', 'friendship');
                break;
        }
        // Remove duplicates and limit to 5
        return [...new Set(suggestions)].slice(0, 5);
    }
    /**
     * Get search suggestions for autocomplete
     */
    async getSearchSuggestions(partialQuery, module, limit = 10) {
        const suggestions = [];
        // Add recent searches that match
        this.recentSearches
            .filter(search => search.toLowerCase().includes(partialQuery.toLowerCase()))
            .slice(0, 3)
            .forEach(search => {
            suggestions.push({
                text: search,
                type: 'recent',
                module
            });
        });
        // Add autocomplete suggestions
        const autocompleteSuggestions = await this.getAutocompleteSuggestions(partialQuery, module);
        suggestions.push(...autocompleteSuggestions.slice(0, limit - suggestions.length));
        return suggestions;
    }
    /**
     * Get location-based suggestions
     */
    getLocationSuggestions(partialQuery) {
        if (!partialQuery)
            return property_1.KENYAN_COUNTIES.slice(0, 10);
        const query = partialQuery.toLowerCase();
        return property_1.KENYAN_COUNTIES
            .filter(county => county.toLowerCase().includes(query))
            .slice(0, 10);
    }
    /**
     * Save search preferences
     */
    saveSearchPreferences(preferences) {
        this.searchPreferences = preferences;
        // In a real app, this would persist to storage
    }
    /**
     * Get search preferences
     */
    getSearchPreferences() {
        return this.searchPreferences;
    }
    /**
     * Add to recent searches
     */
    addRecentSearch(search) {
        this.recentSearches = [
            search,
            ...this.recentSearches.filter(s => s !== search)
        ].slice(0, 10); // Keep only last 10 searches
    }
    /**
     * Get autocomplete suggestions
     */
    async getAutocompleteSuggestions(partialQuery, module) {
        // This would typically call an API or use a search index
        // For demo purposes, return static suggestions
        const suggestions = {
            property: [
                'apartment', 'house', 'commercial', 'land', 'bedsitter',
                'Nairobi properties', 'Karen homes', 'Westlands apartments'
            ],
            jobs: [
                'software developer', 'designer', 'manager', 'sales',
                'remote jobs', 'part-time', 'freelance', 'internship'
            ],
            services: [
                'plumbing', 'cleaning', 'electrical', 'painting',
                'home repair', 'garden maintenance', 'security'
            ],
            stories: [
                'travel', 'lifestyle', 'tech', 'business',
                'photography', 'food', 'culture', 'education'
            ],
            datemi: [
                'serious relationship', 'casual dating', 'friendship',
                'professional networking', 'hobby partner'
            ]
        };
        const modulesuggestions = suggestions[module] || [];
        const query = partialQuery.toLowerCase();
        return modulesuggestions
            .filter(suggestion => suggestion.toLowerCase().includes(query))
            .map(suggestion => ({
            text: suggestion,
            type: 'autocomplete',
            module
        }));
    }
    /**
     * Clear recent searches
     */
    clearRecentSearches() {
        this.recentSearches = [];
    }
}
// Export singleton instance
exports.universalSearchService = new UniversalSearchService();
exports.default = exports.universalSearchService;

"use strict";
/**
 * Job Service - Handles all job-related operations
 * Includes demo data for development and testing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobService = void 0;
const supabaseClient_1 = require("./supabaseClient");
class JobService {
    constructor() {
        this.tableName = 'job_postings';
    }
    isConfigured() {
        return (0, supabaseClient_1.isSupabaseConfigured)();
    }
    /**
     * Fetch jobs with search and filter options
     */
    async fetchJobs(searchQuery) {
        try {
            // TODO: Fix configuration detection later - for now use demo data for development
            
            return this.getDemoJobs(searchQuery);
            // Real Supabase implementation would go here
            const query = supabaseClient_1.supabase
                .from(this.tableName)
                .select('*', { count: 'exact' });
            // Apply filters...
            const { data, error, count } = await query;
            if (error) {
                const message = (error && error.message) ? error.message : 'Unknown error';
                throw new Error(`Failed to fetch jobs: ${message}`);
            }
            return {
                jobs: data || [],
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    totalResults: count || 0,
                    hasMore: false
                }
            };
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Get a single job by ID
     */
    async getJobById(jobId) {
        try {
            
            const demoResult = await this.getDemoJobs({ filters: {}, page: 1, limit: 20 });
            return demoResult.jobs.find(j => j.id === jobId) || null;
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Create a new job posting
     */
    async createJob(jobData, employerId) {
        try {
            // Demo mode - simulate job creation
            const newJob = {
                id: `demo-job-${Date.now()}`,
                employer_id: employerId,
                employer: {
                    name: 'Demo Employer',
                    company: 'Demo Company',
                    verified: false
                },
                title: jobData.title || 'New Job',
                description: jobData.description || 'Job description',
                job_type: jobData.job_type || 'full_time',
                experience_level: jobData.experience_level || 'intermediate',
                location: jobData.location || {
                    county: 'Nairobi',
                    town: 'CBD',
                    remote: false,
                    onsite: true
                },
                salary: jobData.salary || {
                    min: 25000,
                    max: 50000,
                    currency: 'KSH',
                    period: 'monthly'
                },
                requirements: jobData.requirements || [],
                skill_category: jobData.skill_category || 'General',
                application_method: jobData.application_method || 'phone',
                contact_info: jobData.contact_info || {},
                status: 'active',
                applications_count: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            return newJob;
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Apply to a job
     */
    async applyToJob(jobId, applicationData) {
        try {
            // Demo mode - simulate application
            const application = {
                id: `demo-app-${Date.now()}`,
                jobId: jobId,
                applicantId: applicationData.applicantId || 'demo-user-123',
                applicantName: applicationData.applicantName || 'Demo Applicant',
                applicantEmail: 'demo@example.com',
                applicantPhone: applicationData.applicantPhone || '+254700000000',
                coverLetter: applicationData.coverLetter,
                status: 'pending',
                appliedAt: new Date().toISOString()
            };
            return application;
        }
        catch (error) {
            
            throw error;
        }
    }
    /**
     * Get demo jobs for testing when Supabase is not configured
     */
    getDemoJobs(searchQuery) {
        const demoJobs = [
            {
                id: 'demo-job-1',
                employer_id: 'demo-employer-1',
                employer: {
                    name: 'Nairobi Construction Co.',
                    company: 'Nairobi Construction Co.',
                    verified: true
                },
                title: 'Experienced Mason - Residential Projects',
                description: 'We are looking for skilled masons for ongoing residential construction projects in Nairobi. Must have experience with modern building techniques and quality finishes.',
                job_type: 'full_time',
                experience_level: 'intermediate',
                location: {
                    address: 'Various sites in Nairobi',
                    county: 'Nairobi',
                    town: 'Westlands',
                    remote: false,
                    onsite: true
                },
                salary: {
                    min: 35000,
                    max: 50000,
                    currency: 'KSH',
                    period: 'monthly'
                },
                benefits: ['Transport Allowance', 'Medical Cover', 'Overtime Pay'],
                requirements: [
                    { skill: 'Bricklaying', level: 'advanced', required: true },
                    { skill: 'Concrete Work', level: 'intermediate', required: true },
                    { skill: 'Stone Work', level: 'intermediate', required: false }
                ],
                category: 'Masonry',
                status: 'active',
                applicationsCount: 12,
                applicationDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                featured: true,
                tags: ['Construction', 'Skilled Trade', 'Full Time']
            },
            {
                id: 'demo-job-2',
                employer_id: 'demo-employer-2',
                employer: {
                    name: 'Karen Plumbing Services',
                    company: 'Karen Plumbing Services',
                    verified: true
                },
                title: 'Plumber - Residential & Commercial',
                description: 'Join our team of professional plumbers. Handle installations, repairs, and maintenance for residential and commercial properties across Nairobi.',
                job_type: 'full_time',
                experience_level: 'intermediate',
                location: {
                    county: 'Nairobi',
                    town: 'Karen',
                    remote: false,
                    onsite: true
                },
                salary: {
                    min: 30000,
                    max: 45000,
                    currency: 'KSH',
                    period: 'monthly'
                },
                benefits: ['Tools Provided', 'Vehicle Allowance', 'Training'],
                requirements: [
                    { skill: 'Pipe Installation', level: 'advanced', required: true },
                    { skill: 'Drainage Systems', level: 'intermediate', required: true },
                    { skill: 'Water Heating', level: 'intermediate', required: false }
                ],
                category: 'Plumber',
                status: 'active',
                applicationsCount: 8,
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                featured: false,
                tags: ['Plumbing', 'Service', 'Full Time']
            },
            {
                id: 'demo-job-3',
                employer_id: 'demo-employer-3',
                employer: {
                    name: 'PowerLine Electrical',
                    company: 'PowerLine Electrical Solutions',
                    verified: true
                },
                title: 'Electrician - Solar Installation Specialist',
                description: 'Growing solar company needs skilled electricians for residential and commercial solar installations. Training provided for solar-specific skills.',
                job_type: 'full_time',
                experience_level: 'intermediate',
                location: {
                    county: 'Nairobi',
                    town: 'Industrial Area',
                    remote: false,
                    onsite: true
                },
                salary: {
                    min: 40000,
                    max: 60000,
                    currency: 'KSH',
                    period: 'monthly'
                },
                benefits: ['Solar Training', 'Company Vehicle', 'Performance Bonus'],
                requirements: [
                    { skill: 'House Wiring', level: 'advanced', required: true },
                    { skill: 'Solar Installation', level: 'beginner', required: false },
                    { skill: 'Electrical Safety', level: 'advanced', required: true }
                ],
                category: 'Electrician',
                status: 'active',
                applicationsCount: 15,
                createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                featured: true,
                tags: ['Electrical', 'Solar', 'Green Energy', 'Training Provided']
            },
            {
                id: 'demo-job-4',
                employer_id: 'demo-employer-4',
                employer: {
                    name: 'Sarah Kamau',
                    company: 'Sarah Kamau Designs',
                    verified: false
                },
                title: 'Freelance Carpenter - Custom Furniture',
                description: 'Need skilled carpenter for custom furniture project. Kitchen cabinets and bedroom furniture. Project-based work with potential for ongoing collaboration.',
                job_type: 'freelance',
                experience_level: 'intermediate',
                location: {
                    county: 'Kiambu',
                    town: 'Ruiru',
                    remote: false,
                    onsite: true
                },
                salary: {
                    min: 80000,
                    max: 120000,
                    currency: 'KSH',
                    period: 'project'
                },
                requirements: [
                    { skill: 'Furniture Making', level: 'advanced', required: true },
                    { skill: 'Cabinet Installation', level: 'advanced', required: true }
                ],
                category: 'Wood Workings',
                status: 'active',
                applicationsCount: 3,
                applicationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                tags: ['Carpentry', 'Freelance', 'Custom Work']
            },
            {
                id: 'demo-job-5',
                employer_id: 'demo-employer-5',
                employer: {
                    name: 'TechFix Nairobi',
                    company: 'TechFix Solutions',
                    verified: true
                },
                title: 'Phone & Computer Repair Technician',
                description: 'Busy repair shop in CBD needs experienced technician. Handle smartphones, tablets, and laptop repairs. Great opportunity for tech-savvy professionals.',
                job_type: 'full_time',
                experience_level: 'intermediate',
                location: {
                    address: 'Moi Avenue, CBD',
                    county: 'Nairobi',
                    town: 'CBD',
                    remote: false,
                    onsite: true
                },
                salary: {
                    min: 25000,
                    max: 40000,
                    currency: 'KSH',
                    period: 'monthly'
                },
                benefits: ['Commission on Repairs', 'Skills Training', 'Career Growth'],
                requirements: [
                    { skill: 'Phone Repair', level: 'advanced', required: true },
                    { skill: 'Computer Repair', level: 'intermediate', required: true },
                    { skill: 'Customer Service', level: 'intermediate', required: true }
                ],
                category: 'IT & Technology',
                status: 'active',
                applicationsCount: 22,
                createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                tags: ['Technology', 'Repair', 'CBD', 'Walk-in']
            }
        ];
        // Apply filters
        let filteredJobs = [...demoJobs];
        const { filters } = searchQuery;
        if (filters.category) {
            filteredJobs = filteredJobs.filter(j => j.category === filters.category);
        }
        if (filters.job_type) {
            filteredJobs = filteredJobs.filter(j => j.job_type === filters.job_type);
        }
        if (filters.experience_level) {
            filteredJobs = filteredJobs.filter(j => j.experience_level === filters.experience_level);
        }
        if (filters.location?.county) {
            filteredJobs = filteredJobs.filter(j => j.location.county.toLowerCase().includes(filters.location.county.toLowerCase()));
        }
        if (filters.location?.town) {
            filteredJobs = filteredJobs.filter(j => j.location.town.toLowerCase().includes(filters.location.town.toLowerCase()));
        }
        if (filters.salary_range?.min) {
            filteredJobs = filteredJobs.filter(j => j.salary && j.salary.min >= filters.salary_range.min);
        }
        if (filters.salary_range?.max) {
            filteredJobs = filteredJobs.filter(j => j.salary && j.salary.max <= filters.salary_range.max);
        }
        // Apply search text
        if (searchQuery.searchText) {
            const searchLower = searchQuery.searchText.toLowerCase();
            filteredJobs = filteredJobs.filter(j => j.title.toLowerCase().includes(searchLower) ||
                j.description.toLowerCase().includes(searchLower) ||
                (j.category ? j.category.toLowerCase().includes(searchLower) : false) ||
                j.employer.company?.toLowerCase().includes(searchLower));
        }
        // Apply sorting
        switch (searchQuery.sort_by) {
            case 'salary_high':
                filteredJobs.sort((a, b) => (b.salary?.max || 0) - (a.salary?.max || 0));
                break;
            case 'salary_low':
                filteredJobs.sort((a, b) => (a.salary?.min || 0) - (b.salary?.min || 0));
                break;
            case 'date_oldest':
                filteredJobs.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
                break;
            case 'date_newest':
            default:
                filteredJobs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
                break;
        }
        // Apply pagination
        const page = searchQuery.page || 1;
        const limit = searchQuery.limit || 20;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedJobs = filteredJobs.slice(startIndex, endIndex);
        return Promise.resolve({
            jobs: paginatedJobs,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(filteredJobs.length / limit),
                totalResults: filteredJobs.length,
                hasMore: endIndex < filteredJobs.length
            }
        });
    }
}
// Export singleton instance
exports.jobService = new JobService();

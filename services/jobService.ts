/**
 * Job Service - Handles all job-related operations
 * Includes demo data for development and testing
 */

import { ENV } from '../config/environment';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { categoryManagementService } from './categoryManagementService';
import locationRecommendationService from './locationRecommendationService';
import { LocationCoordinates } from '../types/property';
import type { Json } from '../types/supabase';
import { 
  JobPosting, 
  JobApplication, 
  JobSearchQuery,
  JobFilter,
  JobType,
  ExperienceLevel,
  JobLocation
} from '../types/job';
import { LEGACY_PLAY_STORE_REVIEWER_USER_IDS } from '../utils/playStoreReviewer';
import { formatPostgrestInList } from '../utils/supabaseFilters';
import { getJobCategoryVariants } from '../utils/jobCategoryMapping';

class JobService {
  private getSupabaseRequiredError(): Error {
    return new Error('Jobs database is not configured. Please check your connection and try again.');
  }

  private sanitizeEmployerLabel(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.toLowerCase() === 'unknown') return null;
    return trimmed;
  }

  private async mapDbRowsToJobPostings(rows: Record<string, unknown>[]): Promise<JobPosting[]> {
    if (rows.length === 0) return [];

    const employerIds = Array.from(
      new Set(
        rows
          .map((row) => row.employer_id)
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      )
    );

    const companyByEmployerId = new Map<string, Record<string, unknown>>();
    const userByEmployerId = new Map<string, Record<string, unknown>>();

    if (employerIds.length > 0) {
      try {
        const sb = supabase as any;
        const { data: companyRows } = await sb
          .from('company_profiles')
          .select('user_id, company_name')
          .in('user_id', employerIds);
        (companyRows || []).forEach((row: any) => {
          const userId = row?.user_id;
          if (typeof userId === 'string' && userId.trim().length > 0) {
            companyByEmployerId.set(userId, row);
          }
        });
      } catch {
        // Best effort enrichment only
      }

      try {
        const { data: userRows } = await supabase
          .from('users')
          .select('id, full_name, creator_verification_status')
          .in('id', employerIds);
        (userRows || []).forEach((row: Record<string, unknown>) => {
          const id = row.id;
          if (typeof id === 'string' && id.trim().length > 0) {
            userByEmployerId.set(id, row);
          }
        });
      } catch {
        // Best effort enrichment only
      }
    }

    return rows.map((row) => this.mapDbToJobPosting(row, companyByEmployerId, userByEmployerId));
  }

  private mapDbStatusToJobStatus(status?: string | null): JobPosting['status'] {
    switch ((status || '').toLowerCase()) {
      case 'open':
      case 'active':
        return 'active';
      case 'paused':
      case 'inactive':
        return 'paused';
      case 'draft':
        return 'draft';
      case 'closed':
      default:
        return 'closed';
    }
  }

  private mapJobStatusToDbStatus(status?: JobPosting['status']): string {
    switch (status) {
      case 'active':
        return 'open';
      case 'paused':
        return 'paused';
      case 'draft':
        return 'draft';
      case 'closed':
      default:
        return 'closed';
    }
  }

  isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  private mapDbToJobPosting(
    dbRow: Record<string, unknown>,
    companyByEmployerId?: Map<string, Record<string, unknown>>,
    userByEmployerId?: Map<string, Record<string, unknown>>
  ): JobPosting {
    const contactDetails = dbRow.contact_details as { name?: string; company?: string } | null | undefined;
    const requiredSkills = Array.isArray(dbRow.required_skills) ? dbRow.required_skills as string[] : [];
    const employerId = typeof dbRow.employer_id === 'string' ? dbRow.employer_id : undefined;
    const companyProfile = employerId ? companyByEmployerId?.get(employerId) : undefined;
    const userProfile = employerId ? userByEmployerId?.get(employerId) : undefined;
    const userVerification = typeof userProfile?.creator_verification_status === 'string'
      ? userProfile.creator_verification_status.toLowerCase()
      : '';
    const employerName = this.sanitizeEmployerLabel(contactDetails?.name)
      || this.sanitizeEmployerLabel(companyProfile?.company_name)
      || this.sanitizeEmployerLabel(userProfile?.full_name)
      || 'Verified Employer';
    const employerCompany = this.sanitizeEmployerLabel(contactDetails?.company)
      || this.sanitizeEmployerLabel(companyProfile?.company_name)
      || this.sanitizeEmployerLabel(userProfile?.full_name)
      || 'Company Profile';
    
    // Extract category and subcategory from database
    const category = (dbRow.category as string) || (dbRow.skill_category as string) || 'General';
    const subcategory = (dbRow.subcategory as string) || undefined;
    const county = (dbRow.location_county as string) || (dbRow.location as string) || 'Nairobi';
    const town = (dbRow.location_town as string) || '';
    const experienceLevel = dbRow.experience_level === 'mid' ? 'intermediate' : (dbRow.experience_level as ExperienceLevel) || 'entry';
    
    return {
      id: dbRow.id as string,
      employerId: employerId || undefined,
      employer: {
        name: employerName,
        company: employerCompany,
        verified: (dbRow.employer_verified as boolean) || userVerification.includes('verified') || false
      },
      title: dbRow.job_title as string,
      description: dbRow.description as string,
      job_type: (dbRow.job_type || 'full_time') as JobType,
      experience_level: experienceLevel,
      location: {
        county,
        town,
        remote: false,
        onsite: true
      },
      salary: dbRow.salary ? {
        min: Number(dbRow.salary),
        max: Number(dbRow.salary),
        currency: 'KSH' as const,
        period: 'monthly' as const
      } : undefined,
      requirements: requiredSkills.map((skill: string) => ({
        skill,
        level: 'intermediate' as const,
        required: true
      })),
      category,
      subcategory,
      status: this.mapDbStatusToJobStatus(dbRow.status as string | null | undefined),
      applicationsCount: (dbRow.applications_count as number) || 0,
      applicationDeadline: (dbRow.application_deadline as string) || (dbRow.deadline as string) || undefined,
      createdAt: dbRow.created_at as string,
      updatedAt: dbRow.updated_at as string
    };
  }

  private mapDbToJobApplication(dbRow: Record<string, unknown>): JobApplication {
    return {
      id: dbRow.id as string,
      jobId: dbRow.job_id as string,
      applicantId: dbRow.applicant_id as string,
      applicantName: (dbRow.applicant_name as string) || 'Unknown',
      applicantEmail: (dbRow.applicant_email as string) || '',
      applicantPhone: (dbRow.applicant_phone as string) || undefined,
      coverLetter: (dbRow.cover_letter as string) || undefined,
      resumeUrl: (dbRow.resume_url as string) || undefined,
      status: (dbRow.status as JobApplication['status']) || 'pending',
      appliedAt: (dbRow.applied_at as string) || (dbRow.created_at as string) || new Date().toISOString(),
      updatedAt: (dbRow.updated_at as string) || undefined,
      reviewedAt: (dbRow.reviewed_at as string) || undefined,
      reviewerNotes: (dbRow.notes as string) || undefined,
    };
  }

  /**
   * Fetch jobs with search and filter options
   */
  async fetchJobs(searchQuery: JobSearchQuery): Promise<{
    jobs: JobPosting[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalResults: number;
      hasMore: boolean;
    };
  }> {
    try {
      if (!isSupabaseConfigured()) {
        throw this.getSupabaseRequiredError();
      }

      // Real Supabase implementation
      const { filters, searchText, sort_by, page = 1, limit = 20 } = searchQuery;
      const offset = (page - 1) * limit;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = supabase
        .from('job_postings')
        .select('*', { count: 'exact' });

      // Never surface Play Store reviewer/test content in public job listings
      if (LEGACY_PLAY_STORE_REVIEWER_USER_IDS.length > 0) {
        query = query.not(
          'employer_id',
          'in',
          formatPostgrestInList(LEGACY_PLAY_STORE_REVIEWER_USER_IDS)
        );
      }

      // Apply search text filter
      if (searchText) {
        query = query.or(`job_title.ilike.%${searchText}%,description.ilike.%${searchText}%`);
      }

      // Apply category filter
      if (filters.category) {
        const categoryVariants = getJobCategoryVariants(filters.category);
        query = categoryVariants.length > 1
          ? query.in('category', categoryVariants)
          : query.eq('category', filters.category);
      }
      
      // Apply subcategory filter
      if (filters.subcategory) {
        query = query.eq('subcategory', filters.subcategory);
      }

      // Apply job type filter
      if (filters.job_type) {
        query = query.eq('job_type', filters.job_type);
      }

      // Apply experience level filter
      if (filters.experience_level) {
        query = query.eq('experience_level', filters.experience_level);
      }

      // Apply location filter
      if (filters.location?.county) {
        query = query.ilike('location_county', `%${filters.location.county}%`);
      }

      if (filters.location?.town) {
        query = query.ilike('location_town', `%${filters.location.town}%`);
      }

      // Apply salary range filter
      if (filters.salary_range?.min) {
        query = query.gte('salary', filters.salary_range.min);
      }
      if (filters.salary_range?.max) {
        query = query.lte('salary', filters.salary_range.max);
      }

      // Apply status filter (only show open jobs by default)
      query = query.in('status', ['open', 'active']);

      // Apply sorting
      switch (sort_by) {
        case 'salary_high':
          query = query.order('salary->max', { ascending: false });
          break;
        case 'salary_low':
          query = query.order('salary->min', { ascending: true });
          break;
        case 'date_oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'date_newest':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      // Apply pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      
      if (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to fetch jobs: ${message}`);
      }

      const totalResults = count || 0;
      const totalPages = Math.ceil(totalResults / limit);

      const jobs = await this.mapDbRowsToJobPostings((data || []) as Record<string, unknown>[]);
      return {
        jobs,
        pagination: {
          currentPage: page,
          totalPages,
          totalResults,
          hasMore: page < totalPages
        }
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('not configured')) {
        throw error;
      }
      throw new Error('Failed to fetch jobs from database. Please check your connection.');
    }
  }

  /**
   * Get a single job by ID
   */
  async getJobById(jobId: string): Promise<JobPosting | null> {
    if (!isSupabaseConfigured()) {
      throw this.getSupabaseRequiredError();
    }

    const { data, error } = await supabase
      .from('job_postings')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) throw error;
    if (!data) return null;
    const mapped = await this.mapDbRowsToJobPostings([data as Record<string, unknown>]);
    return mapped[0] || null;
  }

  /**
   * Get jobs posted by a specific employer
   */
  async getEmployerJobs(employerId: string, includeClosed: boolean = true): Promise<JobPosting[]> {
    if (!employerId) return [];

    if (!isSupabaseConfigured()) {
      throw this.getSupabaseRequiredError();
    }

    let query = supabase
      .from('job_postings')
      .select('*')
      .eq('employer_id', employerId)
      .order('created_at', { ascending: false });

    if (!includeClosed) {
      query = query.in('status', ['open', 'active']);
    }

    const { data, error } = await query;
    if (error) throw error;

    return this.mapDbRowsToJobPostings((data || []) as Record<string, unknown>[]);
  }

  /**
   * Create a new job posting
   */
  async createJob(jobData: Partial<JobPosting>, employerId: string): Promise<JobPosting> {
    if (jobData.category) {
      await categoryManagementService.ensureCategoryExists(
        'job',
        jobData.category,
        this.formatCategoryName(jobData.category)
      );
    }

    if (!isSupabaseConfigured()) {
      throw this.getSupabaseRequiredError();
    }

    // Fetch company profile to populate contact_details
    let contactDetails: Record<string, unknown> = {};
    try {
      const companyProfile = await this.getCompanyProfile(employerId);
      if (companyProfile) {
        contactDetails = {
          name: companyProfile.company_name || '',
          company: companyProfile.company_name || '',
          email: companyProfile.contact_email || '',
          phone: companyProfile.contact_phone || '',
          website: companyProfile.website || '',
        };
      }
    } catch {
      // Continue without company details
    }

    const { data, error } = await supabase
      .from('job_postings')
      .insert({
        employer_id: employerId,
        job_title: jobData.title,
        description: jobData.description,
        job_type: jobData.job_type,
        experience_level: jobData.experience_level,
        location: typeof jobData.location === 'object'
          ? `${jobData.location.county}${jobData.location.town ? `, ${jobData.location.town}` : ''}`
          : jobData.location,
        location_county: typeof jobData.location === 'object' ? jobData.location.county : null,
        location_town: typeof jobData.location === 'object' ? jobData.location.town : null,
        salary: jobData.salary?.min || 0,
        required_skills: jobData.requirements?.map(r => r.skill) || [],
        contact_details: contactDetails as unknown as Json,
        category: jobData.category || 'General',
        subcategory: jobData.subcategory || null,
        status: 'open'
      })
      .select('*')
      .single();

    if (error) throw error;
    const mapped = await this.mapDbRowsToJobPostings([data as Record<string, unknown>]);
    if (!mapped[0]) {
      throw new Error('Created job could not be mapped from database response.');
    }
    return mapped[0];
  }

  /**
   * Update a job posting
   */
  async updateJob(id: string, updates: Partial<JobPosting>): Promise<JobPosting> {
    if (!isSupabaseConfigured()) {
      throw this.getSupabaseRequiredError();
    }

    const updateData: Record<string, unknown> = {};
    if (updates.title) updateData.job_title = updates.title;
    if (updates.description) updateData.description = updates.description;
    if (updates.job_type) updateData.job_type = updates.job_type;
    if (updates.experience_level) updateData.experience_level = updates.experience_level;
    if (updates.location) {
      updateData.location = typeof updates.location === 'object'
        ? `${updates.location.county}${updates.location.town ? `, ${updates.location.town}` : ''}`
        : updates.location;
      if (typeof updates.location === 'object') {
        updateData.location_county = updates.location.county;
        updateData.location_town = updates.location.town;
      }
    }
    if (updates.salary) updateData.salary = updates.salary.min;
    if (updates.requirements) updateData.required_skills = updates.requirements.map(r => r.skill);
    if (updates.status) updateData.status = this.mapJobStatusToDbStatus(updates.status);
    if (updates.category) updateData.category = updates.category;
    if (updates.subcategory) updateData.subcategory = updates.subcategory;

    const { data, error } = await supabase
      .from('job_postings')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    const mapped = await this.mapDbRowsToJobPostings([data as Record<string, unknown>]);
    if (!mapped[0]) {
      throw new Error('Updated job could not be mapped from database response.');
    }
    return mapped[0];
  }

  /**
   * Delete a job posting
   */
  async deleteJob(id: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      return;
    }

    const { error } = await supabase
      .from('job_postings')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Apply to a job
   */
  async applyToJob(jobId: string, applicationData: Partial<JobApplication>): Promise<JobApplication> {
    if (!isSupabaseConfigured()) {
      const application: JobApplication = {
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
    if (!applicationData.applicantId) {
      throw new Error('Applicant ID is required to apply for a job');
    }

    const { data: existing, error: existingError } = await supabase
      .from('job_applications')
      .select('id,status')
      .eq('job_id', jobId)
      .eq('applicant_id', applicationData.applicantId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing?.id && existing.status === 'withdrawn') {
      const { data: updated, error: updateError } = await supabase
        .from('job_applications')
        .update({
          status: 'pending',
          updated_at: new Date().toISOString(),
          applied_at: new Date().toISOString(),
          cover_letter: applicationData.coverLetter || null,
          resume_url: applicationData.resumeUrl || null,
        })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (updateError) throw updateError;
      return this.mapDbToJobApplication(updated as Record<string, unknown>);
    }

    if (existing?.id) {
      throw new Error('You have already applied to this job');
    }

    const { data, error } = await supabase
      .from('job_applications')
      .insert({
        job_id: jobId,
        applicant_id: applicationData.applicantId,
        applicant_name: applicationData.applicantName || 'Applicant',
        applicant_email: applicationData.applicantEmail || '',
        applicant_phone: applicationData.applicantPhone || null,
        cover_letter: applicationData.coverLetter || null,
        resume_url: applicationData.resumeUrl || null,
        status: 'pending',
        applied_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;
    return this.mapDbToJobApplication(data as Record<string, unknown>);
  }

  async hasUserAppliedToJob(
    jobId: string,
    applicantId: string
  ): Promise<{ hasApplied: boolean; status?: JobApplication['status'] | string }> {
    if (!jobId || !applicantId) {
      return { hasApplied: false };
    }

    if (!isSupabaseConfigured()) {
      return { hasApplied: false };
    }

    const { data, error } = await supabase
      .from('job_applications')
      .select('status')
      .eq('job_id', jobId)
      .eq('applicant_id', applicantId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { hasApplied: false };

    return { hasApplied: data.status !== 'withdrawn', status: data.status as string };
  }

  /**
   * Get job applications for a specific job (for employers)
   */
  async getJobApplications(jobId: string): Promise<JobApplication[]> {
    if (!isSupabaseConfigured()) {
      if (ENV.APP_ENV === 'production') {
        throw new Error('Database not configured for production');
      }
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .eq('job_id', jobId)
        .order('applied_at', { ascending: false });

      if (error) {
        return [];
      }
      
      return (data || []).map((app: Record<string, unknown>) => this.mapDbToJobApplication(app));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get my applications (for job seekers)
   */
  async getMyApplications(userId?: string): Promise<(JobApplication & { job: JobPosting })[]> {
    if (!isSupabaseConfigured()) {
      if (ENV.APP_ENV === 'production') {
        throw new Error('Database not configured for production');
      }
      return [];
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    const columns: string = `
        *,
        job_postings:job_id (*)
        `;
    const { data, error } = await supabase
      .from('job_applications')
      .select(columns)
      .eq('applicant_id', userId)
      .order('applied_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((app: any) => ({
      ...this.mapDbToJobApplication(app as Record<string, unknown>),
      job: this.mapDbToJobPosting((app as any).job_postings as Record<string, unknown>),
    }));
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(applicationId: string, status: JobApplication['status']): Promise<void> {
    if (!isSupabaseConfigured()) {
      if (ENV.APP_ENV === 'production') {
        throw new Error('Database not configured for production');
      }
      return;
    }

    const updatePayload: Record<string, string> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status !== 'pending') {
      updatePayload.reviewed_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from('job_applications')
      .update(updatePayload)
      .eq('id', applicationId);

    if (error) throw error;
  }

  /**
   * Get job alerts for a user
   */
  async getJobAlerts(userId: string): Promise<any[]> {
    if (!isSupabaseConfigured()) {
      if (ENV.APP_ENV === 'production') {
        throw new Error('Database not configured for production');
      }
      return [];
    }

    const { data, error } = await supabase
      .from('job_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create a job alert
   */
  async createJobAlert(alertData: any): Promise<any> {
    if (!isSupabaseConfigured()) {
      if (ENV.APP_ENV === 'production') {
        throw new Error('Database not configured for production');
      }
      return { id: `demo-alert-${Date.now()}`, ...alertData };
    }

    const { data, error } = await supabase
      .from('job_alerts')
      .insert(alertData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update a job alert
   */
  async updateJobAlert(alertId: string, updates: any): Promise<void> {
    if (!isSupabaseConfigured()) {
      if (ENV.APP_ENV === 'production') {
        throw new Error('Database not configured for production');
      }
      return;
    }

    const { error } = await supabase
      .from('job_alerts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', alertId);

    if (error) throw error;
  }

  /**
   * Delete a job alert
   */
  async deleteJobAlert(alertId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      if (ENV.APP_ENV === 'production') {
        throw new Error('Database not configured for production');
      }
      return;
    }

    const { error } = await supabase
      .from('job_alerts')
      .delete()
      .eq('id', alertId);

    if (error) throw error;
  }

  /**
   * Map DB user_skills row to frontend UserSkill interface
   */
  private mapDbToUserSkill(dbRow: Record<string, unknown>): {
    id: string;
    skill: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    category: string;
    experience_years: number;
    certification: string;
    verified: boolean;
    is_primary: boolean;
    description: string;
  } {
    const certifications = Array.isArray(dbRow.certifications) ? dbRow.certifications as string[] : [];
    return {
      id: dbRow.id as string,
      skill: (dbRow.skill_name as string) || '',
      level: ((dbRow.skill_level as string) || 'intermediate') as 'beginner' | 'intermediate' | 'advanced' | 'expert',
      category: (dbRow.category as string) || 'General',
      experience_years: (dbRow.years_of_experience as number) || 0,
      certification: certifications.length > 0 ? certifications[0] : '',
      verified: (dbRow.verified as boolean) || false,
      is_primary: (dbRow.is_primary as boolean) || false,
      description: (dbRow.description as string) || '',
    };
  }

  /**
   * Map frontend UserSkill fields to DB column names
   */
  private mapUserSkillToDb(frontendData: Record<string, unknown>): Record<string, unknown> {
    const dbData: Record<string, unknown> = {};
    if (frontendData.skill !== undefined) dbData.skill_name = frontendData.skill;
    if (frontendData.level !== undefined) dbData.skill_level = frontendData.level;
    if (frontendData.category !== undefined) dbData.category = frontendData.category;
    if (frontendData.experience_years !== undefined) dbData.years_of_experience = frontendData.experience_years;
    if (frontendData.certification !== undefined) {
      const cert = frontendData.certification as string;
      dbData.certifications = cert ? [cert] : [];
    }
    if (frontendData.verified !== undefined) dbData.verified = frontendData.verified;
    if (frontendData.is_primary !== undefined) dbData.is_primary = frontendData.is_primary;
    if (frontendData.description !== undefined) dbData.description = frontendData.description;
    if (frontendData.user_id !== undefined) dbData.user_id = frontendData.user_id;
    return dbData;
  }

  /**
   * Get user skills
   */
  async getUserSkills(userId?: string): Promise<any[]> {
    if (!isSupabaseConfigured()) {
      if (ENV.APP_ENV === 'production') {
        throw new Error('Database not configured for production');
      }
      return [];
    }

    const { data, error } = await supabase
      .from('user_skills')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row: Record<string, unknown>) => this.mapDbToUserSkill(row));
  }

  /**
   * Create a user skill
   */
  async createUserSkill(skillData: any): Promise<any> {
    if (!isSupabaseConfigured()) {
      if (ENV.APP_ENV === 'production') {
        throw new Error('Database not configured for production');
      }
      return { id: `demo-skill-${Date.now()}`, ...skillData };
    }

    const dbData = this.mapUserSkillToDb(skillData);
    const { data, error } = await supabase
      .from('user_skills')
      .insert(dbData as any)
      .select('*')
      .single();

    if (error) throw error;
    return this.mapDbToUserSkill(data);
  }

  /**
   * Update a user skill
   */
  async updateUserSkill(skillId: string, updates: any): Promise<void> {
    if (!isSupabaseConfigured()) {
      if (ENV.APP_ENV === 'production') {
        throw new Error('Database not configured for production');
      }
      return;
    }

    const dbUpdates = this.mapUserSkillToDb(updates);
    const { error } = await supabase
      .from('user_skills')
      .update({ ...dbUpdates, updated_at: new Date().toISOString() })
      .eq('id', skillId);

    if (error) throw error;
  }

  /**
   * Delete a user skill
   */
  async deleteUserSkill(skillId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      if (ENV.APP_ENV === 'production') {
        throw new Error('Database not configured for production');
      }
      return;
    }

    const { error } = await supabase
      .from('user_skills')
      .delete()
      .eq('id', skillId);

    if (error) throw error;
  }

  // ============================================================
  // Company Profile Methods
  // ============================================================

  /**
   * Get a company profile by user ID
   */
  async getCompanyProfile(userId: string): Promise<any | null> {
    if (!isSupabaseConfigured()) {
      if (ENV.APP_ENV === 'production') {
        throw new Error('Database not configured for production');
      }
      return null;
    }

    const { data, error } = await supabase
      .from('company_profiles' as any)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  /**
   * Create a company profile
   */
  async createCompanyProfile(profileData: {
    user_id: string;
    company_name: string;
    industry?: string;
    description?: string;
    website?: string;
    location?: string;
    county?: string;
    town?: string;
    employee_count?: string;
    founded_year?: number;
    contact_email?: string;
    contact_phone?: string;
  }): Promise<any> {
    if (!isSupabaseConfigured()) {
      if (ENV.APP_ENV === 'production') {
        throw new Error('Database not configured for production');
      }
      return { id: `demo-company-${Date.now()}`, ...profileData };
    }

    const { data, error } = await supabase
      .from('company_profiles' as any)
      .insert(profileData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update a company profile
   */
  async updateCompanyProfile(userId: string, updates: Record<string, unknown>): Promise<any> {
    if (!isSupabaseConfigured()) {
      if (ENV.APP_ENV === 'production') {
        throw new Error('Database not configured for production');
      }
      return updates;
    }

    const { data, error } = await supabase
      .from('company_profiles' as any)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get employer stats (jobs posted, applications received)
   */
  async getEmployerStats(userId: string): Promise<{
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
  }> {
    if (!isSupabaseConfigured()) {
      return { totalJobs: 0, activeJobs: 0, totalApplications: 0 };
    }

    try {
      // Get total jobs
      const { count: totalJobs } = await supabase
        .from('job_postings')
        .select('*', { count: 'exact', head: true })
        .eq('employer_id', userId);

      // Get active jobs
      const { count: activeJobs } = await supabase
        .from('job_postings')
        .select('*', { count: 'exact', head: true })
        .eq('employer_id', userId)
        .eq('status', 'open');

      // Get total applications across all employer's jobs
      const { data: jobIds } = await supabase
        .from('job_postings')
        .select('id')
        .eq('employer_id', userId);

      let totalApplications = 0;
      if (jobIds && jobIds.length > 0) {
        const ids = jobIds.map((j: { id: string }) => j.id);
        const { count } = await supabase
          .from('job_applications')
          .select('*', { count: 'exact', head: true })
          .in('job_id', ids);
        totalApplications = count || 0;
      }

      return {
        totalJobs: totalJobs || 0,
        activeJobs: activeJobs || 0,
        totalApplications,
      };
    } catch {
      return { totalJobs: 0, activeJobs: 0, totalApplications: 0 };
    }
  }

  /**
   * Get demo jobs for testing when Supabase is not configured
   * ⚠️ PRODUCTION SAFETY: This method should NEVER be called in production
   */
  private getDemoJobs(searchQuery: JobSearchQuery): Promise<{
    jobs: JobPosting[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalResults: number;
      hasMore: boolean;
    };
  }> {
    // PRODUCTION GUARD - Prevent demo data from being used in production
    if (ENV.APP_ENV === 'production') {
      throw new Error(
        '🚨 PRODUCTION ERROR: Demo jobs method called in production build. ' +
        'Please ensure Supabase is properly configured for production.'
      );
    }
    
    const demoJobs: JobPosting[] = [
      {
        id: 'demo-job-1',
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
      const categoryVariants = new Set(getJobCategoryVariants(filters.category));
      filteredJobs = filteredJobs.filter(j => categoryVariants.has(j.category));
    }

    if (filters.job_type) {
      filteredJobs = filteredJobs.filter(j => j.job_type === filters.job_type);
    }

    if (filters.experience_level) {
      filteredJobs = filteredJobs.filter(j => j.experience_level === filters.experience_level);
    }

    if (filters.location?.county) {
      filteredJobs = filteredJobs.filter(j => 
        j.location.county.toLowerCase().includes(filters.location!.county!.toLowerCase())
      );
    }

    if (filters.location?.town) {
      filteredJobs = filteredJobs.filter(j => 
        j.location.town.toLowerCase().includes(filters.location!.town!.toLowerCase())
      );
    }

    if (filters.salary_range?.min) {
      filteredJobs = filteredJobs.filter(j => j.salary && j.salary.min >= filters.salary_range!.min!);
    }

    if (filters.salary_range?.max) {
      filteredJobs = filteredJobs.filter(j => j.salary && j.salary.max <= filters.salary_range!.max!);
    }

    // Apply search text
    if (searchQuery.searchText) {
      const searchLower = searchQuery.searchText.toLowerCase();
      filteredJobs = filteredJobs.filter(j => 
        j.title.toLowerCase().includes(searchLower) ||
        j.description.toLowerCase().includes(searchLower) ||
        (j.category ? j.category.toLowerCase().includes(searchLower) : false) ||
        j.employer.company?.toLowerCase().includes(searchLower)
      );
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
  /**
   * Format category name for display
   */
  private formatCategoryName(category: string): string {
    return category
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace('And', 'and')
      .replace('Or', 'or');
  }

  async getJobsNearLocation(
    centerCoordinates: LocationCoordinates,
    radiusKm: number = 10,
    limit: number = 20,
    filters?: {
      category?: string;
      job_type?: string;
      experience_level?: string;
    }
  ): Promise<{ job: JobPosting; distance?: number; distanceFormatted?: string }[]> {
    try {
      if (!isSupabaseConfigured()) {
        throw this.getSupabaseRequiredError();
      }

      const { data, error } = await supabase.rpc('get_nearby_jobs', {
        lat: centerCoordinates.latitude,
        lng: centerCoordinates.longitude,
        radius_km: radiusKm
      });

      if (error) {
        if (__DEV__) {
          console.warn('Failed to get nearby jobs:', error);
        }
        const fallbackQuery: JobSearchQuery = {
          filters: (filters || {}) as unknown as JobFilter,
          page: 1,
          limit: limit * 2
        };
        const result = await this.fetchJobs(fallbackQuery);
        return result.jobs.map(job => ({
          job,
          distance: undefined,
          distanceFormatted: 'Distance unknown'
        }));
      }

      const jobs = await Promise.all(
        ((data as any[]) || []).map(async (row: any) => {
          const job = await this.getJobById(row.id);
          if (!job) return null;
          return {
            job,
            distance: row.distance_km as number,
            distanceFormatted: `${row.distance_km}km away`
          };
        })
      );

      return jobs.filter(j => j !== null) as { job: JobPosting; distance?: number; distanceFormatted?: string }[];
    } catch (error) {
      if (__DEV__) {
        console.error('Error getting nearby jobs:', error);
      }
      return [];
    }
  }

  async getRecommendedJobsNearby(
    useCurrentLocation: boolean = true,
    radiusKm: number = 10,
    limit: number = 20,
    filters?: {
      category?: string;
      job_type?: string;
      experience_level?: string;
    }
  ): Promise<{ job: JobPosting; distance?: number; distanceFormatted?: string }[]> {
    try {
      let centerLocation: LocationCoordinates;

      if (useCurrentLocation) {
        const currentLocation = await locationRecommendationService.getUserCurrentLocation();
        centerLocation = currentLocation || locationRecommendationService.getDefaultLocation();
      } else {
        centerLocation = locationRecommendationService.getDefaultLocation();
      }

      return await this.getJobsNearLocation(centerLocation, radiusKm, limit, filters);
    } catch (error) {
      if (__DEV__) {
        console.error('Error getting recommended jobs:', error);
      }
      return [];
    }
  }
}

let instance: JobService | null = null;
function getInstance(): JobService {
  if (!instance) instance = new JobService();
  return instance;
}

export const jobService = new Proxy({} as JobService, {
  get(target, prop) {
    const service = getInstance();
    const value = (service as any)[prop];
    return typeof value === 'function' ? value.bind(service) : value;
  }
});

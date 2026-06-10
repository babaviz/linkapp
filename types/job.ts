/**
 * Job Types for LinkApp
 * Job postings, applications, and skill-related types
 */

// Job types
export type JobType = 'full_time' | 'part_time' | 'contract' | 'freelance' | 'internship' | 'temporary';

// Experience levels
export type ExperienceLevel = 'entry' | 'intermediate' | 'senior' | 'expert';

// Job status
export type JobStatus = 'active' | 'closed' | 'paused' | 'draft';

// Application status
export type ApplicationStatus =
  | 'pending'
  | 'reviewing'
  | 'shortlisted'
  | 'interviewed'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

// Skill levels
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

// Job location
export interface JobLocation {
  county: string;
  town: string;
  address?: string;
  remote: boolean;
  onsite: boolean;
  hybrid?: boolean;
}

// Salary range
export interface SalaryRange {
  min: number;
  max: number;
  currency: 'KSH' | 'USD';
  period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'project';
}

// Job requirement
export interface JobRequirement {
  skill: string;
  level: SkillLevel;
  required: boolean;
  description?: string;
}

// Employer information
export interface EmployerInfo {
  name: string;
  company: string;
  verified: boolean;
  logo?: string;
  description?: string;
  website?: string;
  location?: string;
  employeeCount?: string;
  industry?: string;
}

// Job posting
export interface JobPosting {
  id: string;
  employerId?: string;
  employer: EmployerInfo;
  title: string;
  description: string;
  job_type: JobType;
  experience_level: ExperienceLevel;
  location: JobLocation;
  salary?: SalaryRange;
  requirements: JobRequirement[];
  benefits?: string[];
  responsibilities?: string[];
  qualifications?: string[];
  applicationDeadline?: string;
  startDate?: string;
  duration?: string;
  category: string;
  subcategory?: string;
  tags?: string[];
  featured?: boolean;
  urgent?: boolean;
  status: JobStatus;
  applicationsCount?: number;
  viewsCount?: number;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string;
  closedAt?: string;
}

// Job application
export interface JobApplication {
  id: string;
  jobId: string;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  coverLetter?: string;
  resumeUrl?: string;
  portfolioUrl?: string;
  expectedSalary?: number;
  availabilityDate?: string;
  status: ApplicationStatus;
  appliedAt: string;
  updatedAt?: string;
  reviewedAt?: string;
  reviewerNotes?: string;
  interviewScheduled?: {
    date: string;
    time: string;
    location?: string;
    type: 'in_person' | 'phone' | 'video';
    notes?: string;
  };
}

// Job filter
export interface JobFilter {
  job_type?: JobType;
  experience_level?: ExperienceLevel;
  location?: {
    county?: string;
    town?: string;
    remote?: boolean;
  };
  salary_range?: {
    min?: number;
    max?: number;
  };
  category?: string;
  subcategory?: string;
  posted_within?: 'today' | 'week' | 'month' | 'all';
  company_verified?: boolean;
  featured?: boolean;
  urgent?: boolean;
}

// Job search query
export interface JobSearchQuery {
  searchText?: string;
  filters: JobFilter;
  sort_by?: 'relevance' | 'date_newest' | 'date_oldest' | 'salary_high' | 'salary_low';
  page?: number;
  limit?: number;
}

// Skill profile
export interface SkillProfile {
  userId: string;
  skills: {
    skill: string;
    level: SkillLevel;
    yearsOfExperience: number;
    certified?: boolean;
    certificationUrl?: string;
  }[];
  categories: string[];
  experience: {
    totalYears: number;
    currentPosition?: string;
    currentCompany?: string;
    previousPositions?: {
      title: string;
      company: string;
      duration: string;
      description?: string;
    }[];
  };
  education?: {
    degree: string;
    institution: string;
    year: string;
    field?: string;
  }[];
  certifications?: {
    name: string;
    issuer: string;
    dateIssued: string;
    expiryDate?: string;
    credentialId?: string;
    url?: string;
  }[];
  portfolio?: {
    title: string;
    description: string;
    url?: string;
    imageUrl?: string;
    technologies?: string[];
  }[];
  availability: {
    status: 'available' | 'employed' | 'not_looking';
    startDate?: string;
    workType: ('remote' | 'onsite' | 'hybrid')[];
    salaryExpectation?: SalaryRange;
  };
  createdAt: string;
  updatedAt?: string;
}

// Job statistics
export interface JobStats {
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  jobsByCategory: Record<string, number>;
  jobsByType: Record<JobType, number>;
  jobsByExperience: Record<ExperienceLevel, number>;
  averageSalary: Record<string, number>;
  topSkills: {
    skill: string;
    count: number;
  }[];
  topEmployers: {
    company: string;
    jobCount: number;
  }[];
}

// Kenyan skill categories
export const KENYAN_SKILL_CATEGORIES = [
  'Construction & Building',
  'Agriculture & Farming',
  'Automotive & Mechanics',
  'Beauty & Personal Care',
  'Catering & Food Service',
  'Cleaning & Maintenance',
  'Electrical & Electronics',
  'Fashion & Tailoring',
  'Health & Medical',
  'Information Technology',
  'Manufacturing & Production',
  'Marketing & Sales',
  'Plumbing & Water Systems',
  'Security & Safety',
  'Teaching & Training',
  'Transportation & Logistics',
  'Welding & Metalwork',
  'Business & Finance',
  'Creative & Design',
  'Legal & Compliance'
] as const;

export type KenyanSkillCategory = typeof KENYAN_SKILL_CATEGORIES[number];

// Job notification
export interface JobNotification {
  id: string;
  userId: string;
  type: 'new_job_match' | 'application_status' | 'interview_scheduled' | 'job_expired' | 'salary_alert';
  title: string;
  message: string;
  jobId?: string;
  applicationId?: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

// Job alert
export interface JobAlert {
  id: string;
  userId: string;
  name: string;
  searchQuery: JobSearchQuery;
  frequency: 'immediate' | 'daily' | 'weekly';
  active: boolean;
  lastSent?: string;
  matchCount?: number;
  createdAt: string;
  updatedAt?: string;
}

// Job analytics
export interface JobAnalytics {
  jobId: string;
  period: 'day' | 'week' | 'month' | 'year';
  metrics: {
    views: number;
    applications: number;
    clickThroughRate: number;
    applicationRate: number;
    qualityScore: number;
  };
  demographics: {
    experienceLevels: Record<ExperienceLevel, number>;
    locations: Record<string, number>;
    ageGroups: Record<string, number>;
  };
  sourceChannels: Record<string, number>;
  searchKeywords: {
    keyword: string;
    count: number;
  }[];
}

// Employer dashboard metrics
export interface EmployerMetrics {
  employerId: string;
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  hiredCandidates: number;
  averageTimeToHire: number;
  topPerformingJobs: {
    jobId: string;
    title: string;
    applications: number;
    views: number;
  }[];
  applicationTrends: {
    date: string;
    applications: number;
  }[];
}

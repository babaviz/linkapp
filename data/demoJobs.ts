/**
 * Demo Job Data for LinkApp
 * Comprehensive set of realistic job postings across all skill categories
 */

import { JobPosting, JobType, ExperienceLevel, SkillLevel } from '../types/job';

// Generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Demo employer data
const DEMO_EMPLOYERS = [
  { name: 'Nairobi Construction Ltd', company: 'Nairobi Construction Ltd', verified: true },
  { name: 'Mary Wanjiku', company: 'Home Services Pro', verified: true },
  { name: 'John Kamau', company: 'Tech Solutions Kenya', verified: false },
  { name: 'Grace Achieng', company: 'Beauty & Wellness Center', verified: true },
  { name: 'Samuel Kipchoge', company: 'SafeGuard Security', verified: true },
  { name: 'Rose Muthoni', company: 'Elite Catering Services', verified: true }
];

const getRandomEmployer = () => DEMO_EMPLOYERS[Math.floor(Math.random() * DEMO_EMPLOYERS.length)];
const getRandomFromArray = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Demo Jobs Data
export const DEMO_JOBS: JobPosting[] = [
  // Construction & Masonry
  {
    id: generateId(),
    employer: getRandomEmployer(),
    title: "Experienced Mason for Residential Project",
    description: "Looking for skilled mason to build stone wall and foundation for 4-bedroom house in Karen. Must have experience with natural stone work and modern construction techniques. Project duration 3-4 weeks.",
    job_type: 'contract',
    experience_level: 'intermediate',
    location: {
      county: 'Nairobi',
      town: 'Nairobi',
      address: 'Karen, Nairobi',
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
      { skill: 'Stone Work', level: 'advanced', required: true },
      { skill: 'Foundation', level: 'intermediate', required: true },
      { skill: 'Bricklaying', level: 'intermediate', required: false }
    ],
    category: 'Masonry',
    status: 'active',
    createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    featured: true,
    tags: ['urgent', 'stone work', 'residential'],
    benefits: ['Transport allowance', 'Tools provided', 'Lunch provided']
  },

  // Plumbing
  {
    id: generateId(),
    employer: getRandomEmployer(),
    title: "Plumber for Office Building Maintenance",
    description: "Seeking qualified plumber for ongoing maintenance of 10-story office building in Westlands. Responsibilities include pipe repairs, fixture installation, and emergency responses.",
    job_type: 'full_time',
    experience_level: 'intermediate',
    location: {
      county: 'Nairobi',
      town: 'Nairobi',
      address: 'Westlands, Nairobi',
      remote: false,
      onsite: true
    },
    salary: {
      min: 35000,
      max: 50000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Pipe Installation', level: 'advanced', required: true },
      { skill: 'Drainage', level: 'intermediate', required: true },
      { skill: 'Water Pumps', level: 'intermediate', required: false }
    ],
    category: 'Plumbing',
    status: 'active',
    createdAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString(),
    benefits: ['Medical insurance', 'NSSF', 'NHIF', 'Annual leave']
  },

  // Electrical
  {
    id: generateId(),
    employer: getRandomEmployer(),
    title: "Solar Panel Installation Technician",
    description: "Solar installation company seeks certified electrician for residential and commercial solar projects across Nairobi and surrounding areas. Must have experience with solar systems and electrical safety protocols.",
    job_type: 'full_time',
    experience_level: 'intermediate',
    location: {
      county: 'Nairobi',
      town: 'Nairobi',
      address: 'Various locations',
      remote: false,
      onsite: true
    },
    salary: {
      min: 40000,
      max: 65000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Solar Installation', level: 'advanced', required: true },
      { skill: 'House Wiring', level: 'intermediate', required: true },
      { skill: 'Electrical Appliances', level: 'intermediate', required: false }
    ],
    category: 'Electrical',
    status: 'active',
    createdAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
    featured: true,
    benefits: ['Transport allowance', 'Tools provided', 'Training provided']
  },

  // IT & Technology
  {
    id: generateId(),
    employer: getRandomEmployer(),
    title: "Website Developer - Remote Friendly",
    description: "Small business needs website developer to create e-commerce site for online shop. Experience with WordPress, WooCommerce, and mobile-responsive design required. Can work remotely with occasional meetings.",
    job_type: 'freelance',
    experience_level: 'intermediate',
    location: {
      county: 'Nairobi',
      town: 'Nairobi',
      address: 'Remote/Kilimani office',
      remote: true,
      onsite: false
    },
    salary: {
      min: 80000,
      max: 150000,
      currency: 'KSH',
      period: 'project'
    },
    requirements: [
      { skill: 'Website Development', level: 'advanced', required: true },
      { skill: 'Digital Marketing', level: 'beginner', required: false }
    ],
    category: 'IT & Technology',
    status: 'active',
    createdAt: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
    benefits: ['Flexible schedule', 'Remote work']
  },

  // Security Services
  {
    id: generateId(),
    employer: getRandomEmployer(),
    title: "Night Security Guard - Residential Estate",
    description: "Reputable security company seeks experienced night security guards for high-end residential estate in Runda. Must be physically fit, alert, and have clean criminal record.",
    job_type: 'full_time',
    experience_level: 'entry',
    location: {
      county: 'Nairobi',
      town: 'Nairobi',
      address: 'Runda Estate',
      remote: false,
      onsite: true
    },
    salary: {
      min: 25000,
      max: 30000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Security', level: 'intermediate', required: true }
    ],
    category: 'Security Services',
    status: 'active',
    createdAt: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString(),
    benefits: ['Uniform provided', 'Night allowance', 'NHIF']
  },

  // Catering & Food Service
  {
    id: generateId(),
    employer: getRandomEmployer(),
    title: "Chef for Wedding Catering Event",
    description: "Experienced chef needed for wedding catering event (200 guests) in Kiambu. Must specialize in Kenyan and continental cuisine. Event date: Next Saturday.",
    job_type: 'temporary',
    experience_level: 'intermediate',
    location: {
      county: 'Kiambu',
      town: 'Kiambu',
      address: 'Wedding venue, Kiambu',
      remote: false,
      onsite: true
    },
    salary: {
      min: 15000,
      max: 25000,
      currency: 'KSH',
      period: 'daily'
    },
    requirements: [
      { skill: 'Cooking', level: 'advanced', required: true }
    ],
    category: 'Catering & Food Service',
    status: 'active',
    createdAt: new Date(Date.now() - Math.random() * 1 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['urgent', 'wedding', 'one-daily'],
    benefits: ['Meals provided', 'Transport reimbursed']
  },

  // Hair & Beauty
  {
    id: generateId(),
    employer: getRandomEmployer(),
    title: "Hair Stylist - Part Time Weekend",
    description: "Busy beauty salon in Kilimani seeks skilled hair stylist for weekend shifts. Must be experienced in natural hair care, braiding, and modern styling techniques.",
    job_type: 'part_time',
    experience_level: 'intermediate',
    location: {
      county: 'Nairobi',
      town: 'Nairobi',
      address: 'Kilimani Beauty Center',
      remote: false,
      onsite: true
    },
    salary: {
      min: 1500,
      max: 2500,
      currency: 'KSH',
      period: 'daily'
    },
    requirements: [
      { skill: 'Hair Styling', level: 'advanced', required: true },
      { skill: 'Customer Service', level: 'intermediate', required: true }
    ],
    category: 'Hair & Beauty',
    status: 'active',
    createdAt: new Date(Date.now() - Math.random() * 6 * 24 * 60 * 60 * 1000).toISOString(),
    benefits: ['Commission on services', 'Product discounts']
  },

  // Auto Mechanics
  {
    id: generateId(),
    employer: getRandomEmployer(),
    title: "Motorbike Mechanic - Immediate Start",
    description: "Busy motorbike repair shop in Eastlands needs experienced mechanic. Must be familiar with common motorbike brands and have own basic tools.",
    job_type: 'full_time',
    experience_level: 'intermediate',
    location: {
      county: 'Nairobi',
      town: 'Nairobi',
      address: 'Eastlands, Nairobi',
      remote: false,
      onsite: true
    },
    salary: {
      min: 30000,
      max: 45000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Motorbike Repair', level: 'advanced', required: true },
      { skill: 'Customer Service', level: 'beginner', required: false }
    ],
    category: 'Auto Mechanics',
    status: 'active',
    createdAt: new Date(Date.now() - Math.random() * 4 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['immediate start', 'tools required']
  },

  // Teaching & Training
  {
    id: generateId(),
    employer: getRandomEmployer(),
    title: "Mathematics Tutor - Home Based",
    description: "Parent seeks qualified mathematics tutor for Form 4 student preparing for KCSE. Sessions will be at family home in Karen, 3 times per week.",
    job_type: 'part_time',
    experience_level: 'intermediate',
    location: {
      county: 'Nairobi',
      town: 'Nairobi',
      address: 'Karen (home based)',
      remote: false,
      onsite: true
    },
    salary: {
      min: 2000,
      max: 3000,
      currency: 'KSH',
      period: 'daily'
    },
    requirements: [
      { skill: 'Mathematics Teaching', level: 'advanced', required: true },
      { skill: 'KCSE Preparation', level: 'advanced', required: true }
    ],
    category: 'Teaching & Training',
    status: 'active',
    createdAt: new Date(Date.now() - Math.random() * 8 * 24 * 60 * 60 * 1000).toISOString(),
    benefits: ['Flexible schedule', 'Transport allowance']
  },

  // Cleaning Services
  {
    id: generateId(),
    employer: getRandomEmployer(),
    title: "Office Cleaning Team - Morning Shift",
    description: "Professional cleaning company needs reliable team for office building cleaning in CBD. Early morning shift (5 AM - 8 AM), Monday to Friday.",
    job_type: 'full_time',
    experience_level: 'entry',
    location: {
      county: 'Nairobi',
      town: 'Nairobi',
      address: 'CBD Office Building',
      remote: false,
      onsite: true
    },
    salary: {
      min: 20000,
      max: 25000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Cleaning', level: 'intermediate', required: true }
    ],
    category: 'Cleaning Services',
    status: 'active',
    createdAt: new Date(Date.now() - Math.random() * 12 * 24 * 60 * 60 * 1000).toISOString(),
    benefits: ['Early morning allowance', 'Cleaning supplies provided']
  }
];

// Helper functions
export const getJobsByCategory = (category: string): JobPosting[] => {
  return DEMO_JOBS.filter(job => job.category === category);
};

export const getRandomJobs = (count: number = 10): JobPosting[] => {
  const shuffled = [...DEMO_JOBS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export const getFeaturedJobs = (): JobPosting[] => {
  return DEMO_JOBS.filter(job => job.featured);
};

export const getJobsByLocation = (county: string, town?: string): JobPosting[] => {
  return DEMO_JOBS.filter(job => {
    const countyMatch = job.location.county.toLowerCase() === county.toLowerCase();
    const townMatch = !town || job.location.town.toLowerCase() === town.toLowerCase();
    return countyMatch && townMatch;
  });
};

export const getJobsByType = (jobType: JobType): JobPosting[] => {
  return DEMO_JOBS.filter(job => job.job_type === jobType);
};

export const getJobsByExperience = (level: ExperienceLevel): JobPosting[] => {
  return DEMO_JOBS.filter(job => job.experience_level === level);
};

// Job statistics
export const getDemoJobStats = () => {
  const stats = {
    total_jobs: DEMO_JOBS.length,
    active_jobs: DEMO_JOBS.filter(j => j.status === 'active').length,
    filled_jobs: DEMO_JOBS.filter(j => j.status === 'closed').length,
    average_salary: Math.round(
      DEMO_JOBS.filter(j => j.salary.period === 'monthly')
        .reduce((sum, j) => sum + ((j.salary.min + j.salary.max) / 2), 0) / 
      DEMO_JOBS.filter(j => j.salary.period === 'monthly').length
    ),
    jobs_by_category: {} as Record<string, number>,
    jobs_by_location: {} as Record<string, number>
  };

  // Count by category
  DEMO_JOBS.forEach(job => {
    const category = job.category || 'Other';
    stats.jobs_by_category[category] = (stats.jobs_by_category[category] || 0) + 1;
  });

  // Count by location
  DEMO_JOBS.forEach(job => {
    const location = `${job.location.town}, ${job.location.county}`;
    stats.jobs_by_location[location] = (stats.jobs_by_location[location] || 0) + 1;
  });

  return stats;
};


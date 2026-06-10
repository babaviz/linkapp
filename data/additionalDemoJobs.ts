/**
 * Additional Demo Job Data for New Categories
 * Realistic job postings for all newly added job categories
 */

import { JobPosting, EmployerInfo } from '../types/job';

// Generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Demo employer data for new categories
const NEW_EMPLOYERS: EmployerInfo[] = [
  { name: 'Nairobi Finance Group', company: 'Nairobi Finance Group', verified: true, logo: '🏢' },
  { name: 'TechHub Kenya', company: 'TechHub Kenya', verified: true, logo: '💻' },
  { name: 'Green Farms Ltd', company: 'Green Farms Ltd', verified: false, logo: '🌱' },
  { name: 'Legal Associates', company: 'Legal Associates', verified: true, logo: '⚖️' },
  { name: 'Safari Hotels', company: 'Safari Hotels', verified: true, logo: '🏨' },
  { name: 'TransLogistics Kenya', company: 'TransLogistics Kenya', verified: true, logo: '🚚' }
];

export const ADDITIONAL_DEMO_JOBS: Partial<JobPosting>[] = [
  // House Managers
  {
    id: generateId(),
    employer: { name: 'Embassy Residence', company: 'Embassy Residence', verified: true },
    title: "House Manager - Diplomatic Residence",
    description: "Experienced house manager needed for diplomatic residence in Muthaiga. Responsibilities include staff supervision, household budget management, event coordination, and maintaining high standards of service.",
    job_type: 'full_time',
    experience_level: 'senior',
    location: {
      county: 'Nairobi',
      town: 'Muthaiga',
      remote: false,
      onsite: true
    },
    salary: {
      min: 80000,
      max: 120000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Household Management', level: 'expert', required: true },
      { skill: 'Staff Management', level: 'advanced', required: true },
      { skill: 'Event Coordination', level: 'intermediate', required: false }
    ],
    // skill_category: 'House Managers',
    status: 'active',
    createdAt: new Date().toISOString(),
    benefits: ['Accommodation provided', 'Medical cover', 'Annual bonus']
  },

  // Finance & Accounting
  {
    id: generateId(),
    employer: NEW_EMPLOYERS[0],
    title: "Senior Accountant - Manufacturing",
    description: "Manufacturing company seeks qualified accountant with experience in cost accounting, financial reporting, and tax compliance. CPA(K) qualification required.",
    job_type: 'full_time',
    experience_level: 'senior',
    location: {
      county: 'Nairobi',
      town: 'Industrial Area',
      remote: false,
      onsite: true
    },
    salary: {
      min: 100000,
      max: 150000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Financial Accounting', level: 'expert', required: true },
      { skill: 'Tax Compliance', level: 'advanced', required: true },
      { skill: 'QuickBooks', level: 'intermediate', required: false }
    ],
    // skill_category: 'Finance & Accounting',
    status: 'active',
    createdAt: new Date().toISOString(),
    benefits: ['Medical insurance', 'Professional development', 'Performance bonus']
  },

  // Architecture & Construction
  {
    id: generateId(),
    employer: { name: 'BuildRight Architects', company: 'BuildRight Architects', verified: true },
    title: "Junior Architect - Residential Projects",
    description: "Architecture firm specializing in residential designs seeks junior architect. Experience with AutoCAD and 3D modeling software required.",
    job_type: 'full_time',
    experience_level: 'intermediate',
    location: {
      county: 'Nairobi',
      town: 'Westlands',
      remote: false,
      onsite: true,
      
    },
    salary: {
      min: 60000,
      max: 85000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'AutoCAD', level: 'advanced', required: true },
      { skill: '3D Modeling', level: 'intermediate', required: true },
      { skill: 'Building Codes', level: 'intermediate', required: false }
    ],
    // skill_category: 'Architecture & Construction',
    status: 'active',
    createdAt: new Date().toISOString(),
    benefits: ['Flexible hours', 'Professional training', 'Project bonuses']
  },

  // Mechanics
  {
    id: generateId(),
    employer: { name: 'Auto Masters', company: 'Auto Masters Garage', verified: true },
    title: "Diesel Mechanic - Heavy Equipment",
    description: "Experienced diesel mechanic needed for construction equipment maintenance. Must have experience with excavators, bulldozers, and generators.",
    job_type: 'full_time',
    experience_level: 'intermediate',
    location: {
      county: 'Kiambu',
      town: 'Ruiru',
      remote: false,
      onsite: true
    },
    salary: {
      min: 45000,
      max: 65000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Diesel Engines', level: 'advanced', required: true },
      { skill: 'Hydraulic Systems', level: 'intermediate', required: true },
      { skill: 'Electrical Diagnostics', level: 'intermediate', required: false }
    ],
    // skill_category: 'Mechanics',
    status: 'active',
    createdAt: new Date().toISOString(),
    benefits: ['Tools provided', 'Overtime pay', 'Training opportunities']
  },

  // Business Management & Administration
  {
    id: generateId(),
    employer: { name: 'Corporate Solutions', company: 'Corporate Solutions Ltd', verified: true },
    title: "Operations Manager - Retail Chain",
    description: "Retail chain seeks operations manager to oversee multiple store locations. Experience in retail management and supply chain required.",
    job_type: 'full_time',
    experience_level: 'senior',
    location: {
      county: 'Nairobi',
      town: 'CBD',
      remote: false,
      onsite: true
    },
    salary: {
      min: 120000,
      max: 180000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Operations Management', level: 'expert', required: true },
      { skill: 'Team Leadership', level: 'advanced', required: true },
      { skill: 'Supply Chain', level: 'intermediate', required: true }
    ],
    // skill_category: 'Business Management & Administration',
    status: 'active',
    createdAt: new Date().toISOString(),
    benefits: ['Car allowance', 'Medical cover', 'Performance bonus']
  },

  // Sales & Marketing
  {
    id: generateId(),
    employer: { name: 'Digital Marketing Pro', company: 'Digital Marketing Pro', verified: true },
    title: "Digital Marketing Specialist",
    description: "Growing e-commerce company needs digital marketing specialist. Experience with social media advertising, Google Ads, and SEO required.",
    job_type: 'full_time',
    experience_level: 'intermediate',
    location: {
      county: 'Nairobi',
      town: 'Kilimani',
      remote: true,
      onsite: false
    },
    salary: {
      min: 50000,
      max: 80000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Social Media Marketing', level: 'advanced', required: true },
      { skill: 'Google Ads', level: 'intermediate', required: true },
      { skill: 'Content Creation', level: 'intermediate', required: false }
    ],
    // skill_category: 'Sales & Marketing',
    status: 'active',
    createdAt: new Date().toISOString(),
    benefits: ['Remote work', 'Flexible hours', 'Internet allowance']
  },

  // Engineering & Manufacturing
  {
    id: generateId(),
    employer: { name: 'Kenya Manufacturing', company: 'Kenya Manufacturing Ltd', verified: true },
    title: "Production Engineer - Food Processing",
    description: "Food processing plant seeks production engineer to optimize manufacturing processes and ensure quality standards.",
    job_type: 'full_time',
    experience_level: 'intermediate',
    location: {
      county: 'Kiambu',
      town: 'Thika',
      remote: false,
      onsite: true
    },
    salary: {
      min: 80000,
      max: 120000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Process Engineering', level: 'advanced', required: true },
      { skill: 'Quality Control', level: 'advanced', required: true },
      { skill: 'HACCP', level: 'intermediate', required: false }
    ],
    // skill_category: 'Engineering & Manufacturing',
    status: 'active',
    createdAt: new Date().toISOString(),
    benefits: ['Medical insurance', 'Transport', 'Lunch provided']
  },

  // Science & Research
  {
    id: generateId(),
    employer: { name: 'Research Institute', company: 'Kenya Research Institute', verified: true },
    title: "Laboratory Technician - Agricultural Research",
    description: "Agricultural research center needs laboratory technician for soil and crop analysis. BSc in relevant field required.",
    job_type: 'full_time',
    experience_level: 'entry',
    location: {
      county: 'Nairobi',
      town: 'Karen',
      remote: false,
      onsite: true
    },
    salary: {
      min: 40000,
      max: 60000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Laboratory Analysis', level: 'intermediate', required: true },
      { skill: 'Data Collection', level: 'intermediate', required: true },
      { skill: 'Report Writing', level: 'beginner', required: false }
    ],
    // skill_category: 'Science & Research',
    status: 'active',
    createdAt: new Date().toISOString(),
    benefits: ['Research allowance', 'Professional development', 'Medical cover']
  },

  // Art Design & Media
  {
    id: generateId(),
    employer: { name: 'Creative Studios', company: 'Creative Studios Kenya', verified: true },
    title: "Graphic Designer - Advertising Agency",
    description: "Advertising agency seeks creative graphic designer for print and digital media projects. Portfolio required.",
    job_type: 'full_time',
    experience_level: 'intermediate',
    location: {
      county: 'Nairobi',
      town: 'Westlands',
      remote: false,
      onsite: true,
      
    },
    salary: {
      min: 45000,
      max: 75000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Adobe Creative Suite', level: 'advanced', required: true },
      { skill: 'UI/UX Design', level: 'intermediate', required: false },
      { skill: 'Video Editing', level: 'beginner', required: false }
    ],
    // skill_category: 'Art Design & Media',
    status: 'active',
    createdAt: new Date().toISOString(),
    benefits: ['Creative freedom', 'Flexible schedule', 'Equipment provided']
  },

  // Law
  {
    id: generateId(),
    employer: NEW_EMPLOYERS[3],
    title: "Legal Assistant - Corporate Law",
    description: "Law firm specializing in corporate law seeks legal assistant. Experience with legal research and document preparation required.",
    job_type: 'full_time',
    experience_level: 'entry',
    location: {
      county: 'Nairobi',
      town: 'Upper Hill',
      remote: false,
      onsite: true
    },
    salary: {
      min: 35000,
      max: 55000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Legal Research', level: 'intermediate', required: true },
      { skill: 'Document Drafting', level: 'intermediate', required: true },
      { skill: 'Court Filing', level: 'beginner', required: false }
    ],
    // skill_category: 'Law',
    status: 'active',
    createdAt: new Date().toISOString(),
    benefits: ['Legal training', 'Professional development', 'Court allowance']
  },

  // Public Safety
  {
    id: generateId(),
    employer: { name: 'SafeGuard Security', company: 'SafeGuard Security Services', verified: true },
    title: "Security Supervisor - Industrial Complex",
    description: "Large industrial complex requires experienced security supervisor for day shift operations. Must have supervisory experience.",
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
      max: 55000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Security Operations', level: 'advanced', required: true },
      { skill: 'Team Supervision', level: 'intermediate', required: true },
      { skill: 'CCTV Monitoring', level: 'intermediate', required: false }
    ],
    // skill_category: 'Public Safety',
    status: 'active',
    createdAt: new Date().toISOString(),
    benefits: ['Uniform provided', 'Medical insurance', 'Risk allowance']
  },

  // Hospitality & Food Services
  {
    id: generateId(),
    employer: NEW_EMPLOYERS[4],
    title: "Head Chef - Hotel Restaurant",
    description: "5-star hotel seeks experienced head chef for main restaurant. Must have experience with international cuisine and kitchen management.",
    job_type: 'full_time',
    experience_level: 'senior',
    location: {
      county: 'Nairobi',
      town: 'Westlands',
      remote: false,
      onsite: true
    },
    salary: {
      min: 80000,
      max: 120000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Culinary Arts', level: 'expert', required: true },
      { skill: 'Kitchen Management', level: 'advanced', required: true },
      { skill: 'Menu Planning', level: 'advanced', required: false }
    ],
    // skill_category: 'Hospitality & Food Services',
    status: 'active',
    createdAt: new Date().toISOString(),
    benefits: ['Meals provided', 'Service charge', 'Medical cover']
  },

  // Transportation & Logistics
  {
    id: generateId(),
    employer: NEW_EMPLOYERS[5],
    title: "Logistics Coordinator - Distribution Center",
    description: "Distribution company needs logistics coordinator to manage delivery schedules and coordinate with drivers and warehouses.",
    job_type: 'full_time',
    experience_level: 'intermediate',
    location: {
      county: 'Nairobi',
      town: 'Embakasi',
      remote: false,
      onsite: true
    },
    salary: {
      min: 45000,
      max: 65000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Logistics Planning', level: 'advanced', required: true },
      { skill: 'Fleet Management', level: 'intermediate', required: true },
      { skill: 'Supply Chain', level: 'intermediate', required: false }
    ],
    // skill_category: 'Transportation & Logistics',
    status: 'active',
    createdAt: new Date().toISOString(),
    benefits: ['Transport allowance', 'Communication allowance', 'Medical insurance']
  },

  // Animals
  {
    id: generateId(),
    employer: { name: 'Kenya Wildlife', company: 'Kenya Wildlife Conservation', verified: true },
    title: "Veterinary Assistant - Wildlife Sanctuary",
    description: "Wildlife sanctuary seeks veterinary assistant for animal care and medical procedures. Experience with wild animals preferred.",
    job_type: 'full_time',
    experience_level: 'intermediate',
    location: {
      county: 'Nairobi',
      town: 'Nairobi National Park',
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
      { skill: 'Animal Care', level: 'advanced', required: true },
      { skill: 'Veterinary Procedures', level: 'intermediate', required: true },
      { skill: 'Wildlife Handling', level: 'beginner', required: false }
    ],
    // skill_category: 'Animals',
    status: 'active',
    createdAt: new Date().toISOString(),
    benefits: ['Accommodation available', 'Risk allowance', 'Training provided']
  },

  // Food, Plants & Trees
  {
    id: generateId(),
    employer: NEW_EMPLOYERS[2],
    title: "Farm Manager - Organic Vegetables",
    description: "Organic farm seeks experienced manager to oversee vegetable production, staff management, and market coordination.",
    job_type: 'full_time',
    experience_level: 'senior',
    location: {
      county: 'Kiambu',
      town: 'Limuru',
      remote: false,
      onsite: true
    },
    salary: {
      min: 60000,
      max: 85000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Organic Farming', level: 'expert', required: true },
      { skill: 'Staff Management', level: 'advanced', required: true },
      { skill: 'Market Knowledge', level: 'intermediate', required: false }
    ],
    // skill_category: 'Food, Plants & Trees',
    status: 'active',
    createdAt: new Date().toISOString(),
    benefits: ['Housing provided', 'Farm produce', 'Performance bonus']
  },

  // Natural Resources
  {
    id: generateId(),
    employer: { name: 'Mining Kenya', company: 'Mining Kenya Ltd', verified: true },
    title: "Mining Engineer - Quarry Operations",
    description: "Quarry company seeks mining engineer to oversee extraction operations and ensure safety compliance.",
    job_type: 'full_time',
    experience_level: 'intermediate',
    location: {
      county: 'Machakos',
      town: 'Athi River',
      remote: false,
      onsite: true
    },
    salary: {
      min: 80000,
      max: 120000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Mining Operations', level: 'advanced', required: true },
      { skill: 'Safety Management', level: 'advanced', required: true },
      { skill: 'Equipment Operation', level: 'intermediate', required: false }
    ],
    // skill_category: 'Natural Resources',
    status: 'active',
    createdAt: new Date().toISOString(),
    benefits: ['Risk allowance', 'Medical cover', 'Transport provided']
  },

  // Marine & Fisheries
  {
    id: generateId(),
    employer: { name: 'Coastal Fisheries', company: 'Coastal Fisheries Co.', verified: true },
    title: "Fisheries Officer - Aquaculture Project",
    description: "Aquaculture project seeks fisheries officer to manage fish farming operations and provide technical support to farmers.",
    job_type: 'full_time',
    experience_level: 'intermediate',
    location: {
      county: 'Kisumu',
      town: 'Kisumu',
      remote: false,
      onsite: true
    },
    salary: {
      min: 45000,
      max: 65000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Aquaculture', level: 'advanced', required: true },
      { skill: 'Water Quality Management', level: 'intermediate', required: true },
      { skill: 'Fish Health', level: 'intermediate', required: false }
    ],
    // skill_category: 'Marine & Fisheries',
    status: 'active',
    createdAt: new Date().toISOString(),
    benefits: ['Field allowance', 'Medical insurance', 'Professional development']
  },

  // Quaternary Sector
  {
    id: generateId(),
    employer: { name: 'Tech Innovation Hub', company: 'Tech Innovation Hub', verified: true },
    title: "Data Scientist - AI Research",
    description: "Tech company seeks data scientist for AI/ML research projects. Experience with Python, TensorFlow, and big data required.",
    job_type: 'full_time',
    experience_level: 'senior',
    location: {
      county: 'Nairobi',
      town: 'Westlands',
      remote: true,
      onsite: false,
      
    },
    salary: {
      min: 150000,
      max: 250000,
      currency: 'KSH',
      period: 'monthly'
    },
    requirements: [
      { skill: 'Machine Learning', level: 'expert', required: true },
      { skill: 'Python Programming', level: 'expert', required: true },
      { skill: 'Big Data Analytics', level: 'advanced', required: false }
    ],
    // skill_category: 'Quaternary Sector',
    status: 'active',
    createdAt: new Date().toISOString(),
    benefits: ['Stock options', 'Remote work', 'Conference attendance']
  }
];


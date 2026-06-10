/**
 * Enhanced Demo Services Data with Subcategory Mappings
 * This file extends the demo services to include proper subcategory fields
 * matching the categories defined in ServicesScreen.tsx
 */

import { ServiceListing } from './demoServices';

// Category keys from ServicesScreen.tsx
export const CATEGORY_KEYS = {
  EDUCATION_TRAINING: 'education_training',
  HEALTHCARE_MEDICAL: 'healthcare_medical',
  BEAUTY_WELLNESS: 'beauty_wellness',
  CONSTRUCTION: 'construction',
  AUTOMOTIVE: 'automotive',
  HOME_GARDEN: 'home_garden',
  BUSINESS_SERVICES: 'business_services',
  ENTERTAINMENT: 'entertainment'
};

// Subcategory IDs from ServicesScreen.tsx
export const SUBCATEGORY_IDS = {
  // Education
  COLLEGES: 'colleges',
  PRIVATE_UNIVERSITIES: 'private_universities',
  PUBLIC_UNIVERSITIES: 'public_universities',
  DAYCARES: 'daycares',
  PRIMARY_SCHOOLS: 'primary_schools',
  SECONDARY_SCHOOLS: 'secondary_schools',
  VET: 'vet',
  EDU_CONSULTING: 'consulting',
  TUTORING: 'tutoring',
  EDTECH: 'edtech',
  CORPORATE_EDU: 'corporate_edu',
  
  // Healthcare
  HOSPITALS: 'hospitals',
  CLINICS: 'clinics',
  PHARMACIES: 'pharmacies',
  DENTISTS: 'dentists',
  OPTOMETRISTS: 'optometrists',
  PHYSIOTHERAPY: 'physiotherapy',
  LABS: 'labs',
  MENTAL_HEALTH: 'mental_health',
  
  // Beauty & Wellness
  SALONS: 'salons',
  BARBERS: 'barbers',
  SPAS: 'spas',
  NAILS: 'nails',
  MASSAGE: 'massage',
  SKINCARE: 'skincare',
  
  // Construction
  CONTRACTORS: 'contractors',
  ARCHITECTS: 'architects',
  MASONS: 'masons',
  CARPENTERS: 'carpenters',
  PLUMBERS: 'plumbers',
  ELECTRICIANS: 'electricians',
  PAINTERS: 'painters',
  ROOFERS: 'roofers',
  
  // Automotive
  MECHANICS: 'mechanics',
  CAR_WASH: 'car_wash',
  BODY_SHOPS: 'body_shops',
  TIRES: 'tires',
  DETAILING: 'detailing',
  
  // Home & Garden
  CLEANING: 'cleaning',
  LANDSCAPING: 'landscaping',
  PEST_CONTROL: 'pest_control',
  SECURITY: 'security',
  MOVERS: 'movers',
  
  // Business Services
  ACCOUNTING: 'accounting',
  LEGAL: 'legal',
  MARKETING: 'marketing',
  BIZ_CONSULTING: 'consulting',
  IT_SERVICES: 'it_services',
  
  // Entertainment
  DJS: 'djs',
  PHOTOGRAPHERS: 'photographers',
  VIDEOGRAPHERS: 'videographers',
  EVENT_PLANNERS: 'event_planners',
  CATERING: 'catering'
};

/**
 * Enhanced demo services with subcategory mappings
 * This data structure maps services to their appropriate categories and subcategories
 */
export const ENHANCED_DEMO_SERVICES: ServiceListing[] = [
  // Education Services
  {
    id: 'edu_college_001',
    ownerId: 'owner_001',
    serviceName: 'Nairobi Technical College',
    category: CATEGORY_KEYS.EDUCATION_TRAINING,
    subcategory: SUBCATEGORY_IDS.COLLEGES,
    description: 'Technical college offering diploma and certificate courses in engineering, IT, business, and hospitality. Modern facilities and experienced instructors.',
    location: 'South C, Nairobi',
    pricingInfo: { type: 'fixed', amount: 45000, currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700111001',
      email: 'info@nairobitch.ac.ke',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.5,
    reviews: 89,
    tags: ['diploma courses', 'modern facilities', 'IT training', 'engineering']
  },
  {
    id: 'edu_private_uni_001',
    ownerId: 'owner_002',
    serviceName: 'Strathmore University',
    category: CATEGORY_KEYS.EDUCATION_TRAINING,
    subcategory: SUBCATEGORY_IDS.PRIVATE_UNIVERSITIES,
    description: 'Leading private university offering undergraduate and postgraduate programs in business, IT, law, and humanities. Excellent academic reputation.',
    location: 'Madaraka, Nairobi',
    pricingInfo: { type: 'fixed', amount: 180000, currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700111002',
      email: 'admissions@strathmore.edu',
      preferredContactMethod: 'email'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.8,
    reviews: 256,
    featured: true,
    tags: ['private university', 'business school', 'IT programs', 'law school']
  },
  {
    id: 'edu_daycare_001',
    ownerId: 'owner_003',
    serviceName: 'Little Angels Daycare',
    category: CATEGORY_KEYS.EDUCATION_TRAINING,
    subcategory: SUBCATEGORY_IDS.DAYCARES,
    description: 'Safe and nurturing daycare for children aged 6 months to 5 years. Experienced caregivers, clean facilities, and engaging activities.',
    location: 'Lavington, Nairobi',
    pricingInfo: { type: 'fixed', amount: 15000, currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700111003',
      email: 'info@littleangels.co.ke',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.7,
    reviews: 45,
    tags: ['daycare', 'childcare', 'safe environment', 'experienced caregivers']
  },
  {
    id: 'edu_primary_001',
    ownerId: 'owner_004',
    serviceName: 'Brookside Academy Primary',
    category: CATEGORY_KEYS.EDUCATION_TRAINING,
    subcategory: SUBCATEGORY_IDS.PRIMARY_SCHOOLS,
    description: 'Modern primary school following CBC curriculum. Well-equipped classrooms, computer lab, library, and sports facilities.',
    location: 'Karen, Nairobi',
    pricingInfo: { type: 'fixed', amount: 35000, currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700111004',
      email: 'admissions@brooksideacademy.ac.ke',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.6,
    reviews: 123,
    tags: ['CBC curriculum', 'computer lab', 'library', 'sports']
  },
  {
    id: 'edu_tutoring_001',
    ownerId: 'owner_005',
    serviceName: 'Excel Tutoring Services',
    category: CATEGORY_KEYS.EDUCATION_TRAINING,
    subcategory: SUBCATEGORY_IDS.TUTORING,
    description: 'Professional tutoring for mathematics, science, and English. Small group classes and one-on-one sessions available.',
    location: 'Westlands, Nairobi',
    pricingInfo: { type: 'hourly', amount: 2000, currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700111005',
      email: 'info@exceltutoring.co.ke',
      whatsapp: '+254700111005',
      preferredContactMethod: 'whatsapp'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.5,
    reviews: 67,
    tags: ['mathematics', 'science', 'English', 'KCPE prep']
  },

  // Healthcare Services
  {
    id: 'health_hospital_001',
    ownerId: 'owner_006',
    serviceName: 'Nairobi West Hospital',
    category: CATEGORY_KEYS.HEALTHCARE_MEDICAL,
    subcategory: SUBCATEGORY_IDS.HOSPITALS,
    description: '24/7 hospital with emergency services, surgery, maternity, and pediatrics. Modern equipment and qualified staff.',
    location: 'Nairobi West, Nairobi',
    pricingInfo: { type: 'fixed', amount: 2500, currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700222001',
      email: 'info@nairobiwest.hospital',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.6,
    reviews: 234,
    featured: true,
    tags: ['24/7', 'emergency', 'NHIF accepted', 'surgery']
  },
  {
    id: 'health_clinic_001',
    ownerId: 'owner_007',
    serviceName: 'Family Care Clinic',
    category: CATEGORY_KEYS.HEALTHCARE_MEDICAL,
    subcategory: SUBCATEGORY_IDS.CLINICS,
    description: 'Modern family clinic offering general practice, immunizations, and health screenings. Friendly and experienced doctors.',
    location: 'Kilimani, Nairobi',
    pricingInfo: { type: 'fixed', amount: 1500, currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700222002',
      email: 'info@familycare.clinic',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.4,
    reviews: 89,
    tags: ['family friendly', 'immunizations', 'health screening']
  },
  {
    id: 'health_pharmacy_001',
    ownerId: 'owner_008',
    serviceName: 'MedPlus Pharmacy',
    category: CATEGORY_KEYS.HEALTHCARE_MEDICAL,
    subcategory: SUBCATEGORY_IDS.PHARMACIES,
    description: 'Well-stocked pharmacy with qualified pharmacists. Prescription and over-the-counter medications, health products, and consultations.',
    location: 'Westlands, Nairobi',
    pricingInfo: { type: 'negotiable', currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700222003',
      email: 'info@medplus.co.ke',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.5,
    reviews: 156,
    tags: ['prescription medication', 'consultation', 'health products']
  },
  {
    id: 'health_dentist_001',
    ownerId: 'owner_009',
    serviceName: 'Bright Smile Dental Clinic',
    category: CATEGORY_KEYS.HEALTHCARE_MEDICAL,
    subcategory: SUBCATEGORY_IDS.DENTISTS,
    description: 'Modern dental clinic offering general dentistry, cosmetic procedures, orthodontics, and teeth whitening. Pain-free treatments.',
    location: 'Kilimani, Nairobi',
    pricingInfo: { type: 'fixed', amount: 2000, currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700222004',
      email: 'info@brightsmile.co.ke',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.7,
    reviews: 98,
    tags: ['cosmetic dentistry', 'orthodontics', 'teeth whitening', 'pain-free']
  },

  // Beauty & Wellness Services
  {
    id: 'beauty_salon_001',
    ownerId: 'owner_010',
    serviceName: 'Elegant Hair & Beauty Salon',
    category: CATEGORY_KEYS.BEAUTY_WELLNESS,
    subcategory: SUBCATEGORY_IDS.SALONS,
    description: 'Full-service salon offering hair styling, cutting, coloring, and treatments. Experienced stylists with quality products.',
    location: 'Kilimani, Nairobi',
    pricingInfo: { type: 'fixed', amount: 1500, currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700333001',
      email: 'bookings@elegantbeauty.co.ke',
      whatsapp: '+254700333001',
      preferredContactMethod: 'whatsapp'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.6,
    reviews: 128,
    tags: ['hair styling', 'coloring', 'quality products', 'experienced stylists']
  },
  {
    id: 'beauty_barber_001',
    ownerId: 'owner_011',
    serviceName: 'Classic Cuts Barbershop',
    category: CATEGORY_KEYS.BEAUTY_WELLNESS,
    subcategory: SUBCATEGORY_IDS.BARBERS,
    description: 'Traditional and modern barbershop offering haircuts, shaves, beard trimming, and grooming services for men.',
    location: 'Westlands, Nairobi',
    pricingInfo: { type: 'fixed', amount: 500, currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700333002',
      whatsapp: '+254700333002',
      preferredContactMethod: 'whatsapp'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.5,
    reviews: 203,
    tags: ['men grooming', 'beard trimming', 'traditional shave', 'modern cuts']
  },
  {
    id: 'beauty_spa_001',
    ownerId: 'owner_012',
    serviceName: 'Serenity Spa & Wellness',
    category: CATEGORY_KEYS.BEAUTY_WELLNESS,
    subcategory: SUBCATEGORY_IDS.SPAS,
    description: 'Luxury spa offering massage therapy, aromatherapy, body treatments, and wellness consultations in a peaceful environment.',
    location: 'Karen, Nairobi',
    pricingInfo: { type: 'fixed', amount: 3500, currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700333003',
      email: 'info@serenityspa.co.ke',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.8,
    reviews: 95,
    featured: true,
    tags: ['luxury spa', 'massage', 'aromatherapy', 'wellness']
  },
  {
    id: 'beauty_nails_001',
    ownerId: 'owner_013',
    serviceName: 'Nail Studio by Ivy',
    category: CATEGORY_KEYS.BEAUTY_WELLNESS,
    subcategory: SUBCATEGORY_IDS.NAILS,
    description: 'Professional nail salon offering manicures, pedicures, gel nails, nail art, and nail extensions. Clean and hygienic.',
    location: 'Westlands, Nairobi',
    pricingInfo: { type: 'fixed', amount: 1200, currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700333004',
      whatsapp: '+254700333004',
      preferredContactMethod: 'whatsapp'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.6,
    reviews: 76,
    tags: ['manicure', 'pedicure', 'gel nails', 'nail art']
  },

  // Construction Services
  {
    id: 'const_contractor_001',
    ownerId: 'owner_014',
    serviceName: 'BuildRight Contractors',
    category: CATEGORY_KEYS.CONSTRUCTION,
    subcategory: SUBCATEGORY_IDS.CONTRACTORS,
    description: 'General contractors offering construction, renovation, and building services. Experienced team with quality workmanship.',
    location: 'Kasarani, Nairobi',
    pricingInfo: { type: 'negotiable', currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700444001',
      email: 'info@buildright.co.ke',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.5,
    reviews: 89,
    tags: ['construction', 'renovation', 'quality workmanship', 'experienced']
  },
  {
    id: 'const_plumber_001',
    ownerId: 'owner_015',
    serviceName: 'ProPlumb Services',
    category: CATEGORY_KEYS.CONSTRUCTION,
    subcategory: SUBCATEGORY_IDS.PLUMBERS,
    description: 'Professional plumbing services for installations, repairs, and maintenance. 24/7 emergency service available.',
    location: 'Industrial Area, Nairobi',
    pricingInfo: { type: 'hourly', amount: 1500, currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700444002',
      whatsapp: '+254700444002',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.4,
    reviews: 145,
    tags: ['plumbing', 'emergency service', '24/7', 'repairs']
  },
  {
    id: 'const_electrician_001',
    ownerId: 'owner_016',
    serviceName: 'PowerMax Electricians',
    category: CATEGORY_KEYS.CONSTRUCTION,
    subcategory: SUBCATEGORY_IDS.ELECTRICIANS,
    description: 'Certified electricians for installations, repairs, and electrical maintenance. Safe and reliable service.',
    location: 'South B, Nairobi',
    pricingInfo: { type: 'hourly', amount: 1800, currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700444003',
      email: 'info@powermax.co.ke',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.6,
    reviews: 112,
    tags: ['certified', 'electrical repairs', 'installations', 'safe service']
  },
  {
    id: 'const_carpenter_001',
    ownerId: 'owner_017',
    serviceName: 'WoodCraft Carpentry',
    category: CATEGORY_KEYS.CONSTRUCTION,
    subcategory: SUBCATEGORY_IDS.CARPENTERS,
    description: 'Skilled carpenters for furniture making, door and window installations, and custom woodwork. Quality craftsmanship.',
    location: 'Embakasi, Nairobi',
    pricingInfo: { type: 'negotiable', currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700444004',
      whatsapp: '+254700444004',
      preferredContactMethod: 'whatsapp'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.7,
    reviews: 87,
    tags: ['furniture making', 'custom woodwork', 'quality craftsmanship']
  },

  // Automotive Services
  {
    id: 'auto_mechanic_001',
    ownerId: 'owner_018',
    serviceName: 'AutoFix Garage',
    category: CATEGORY_KEYS.AUTOMOTIVE,
    subcategory: SUBCATEGORY_IDS.MECHANICS,
    description: 'Professional auto repair and maintenance services. Experienced mechanics with modern diagnostic equipment.',
    location: 'Industrial Area, Nairobi',
    pricingInfo: { type: 'negotiable', currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700555001',
      email: 'info@autofix.co.ke',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.5,
    reviews: 178,
    tags: ['auto repair', 'maintenance', 'diagnostics', 'experienced mechanics']
  },
  {
    id: 'auto_carwash_001',
    ownerId: 'owner_019',
    serviceName: 'Sparkle Car Wash',
    category: CATEGORY_KEYS.AUTOMOTIVE,
    subcategory: SUBCATEGORY_IDS.CAR_WASH,
    description: 'Professional car washing and detailing services. Interior and exterior cleaning with quality products.',
    location: 'Westlands, Nairobi',
    pricingInfo: { type: 'fixed', amount: 800, currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700555002',
      whatsapp: '+254700555002',
      preferredContactMethod: 'whatsapp'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.3,
    reviews: 234,
    tags: ['car wash', 'detailing', 'interior cleaning', 'quality products']
  },

  // Home & Garden Services
  {
    id: 'home_cleaning_001',
    ownerId: 'owner_020',
    serviceName: 'CleanPro Services',
    category: CATEGORY_KEYS.HOME_GARDEN,
    subcategory: SUBCATEGORY_IDS.CLEANING,
    description: 'Professional home and office cleaning services. Trained staff, eco-friendly products, and reliable service.',
    location: 'Nairobi',
    pricingInfo: { type: 'fixed', amount: 2500, currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700666001',
      email: 'info@cleanpro.co.ke',
      whatsapp: '+254700666001',
      preferredContactMethod: 'whatsapp'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.6,
    reviews: 145,
    featured: true,
    tags: ['home cleaning', 'office cleaning', 'eco-friendly', 'reliable']
  },
  {
    id: 'home_landscaping_001',
    ownerId: 'owner_021',
    serviceName: 'GreenThumb Landscaping',
    category: CATEGORY_KEYS.HOME_GARDEN,
    subcategory: SUBCATEGORY_IDS.LANDSCAPING,
    description: 'Professional landscaping and garden maintenance services. Design, planting, lawn care, and garden maintenance.',
    location: 'Karen, Nairobi',
    pricingInfo: { type: 'negotiable', currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700666002',
      email: 'info@greenthumb.co.ke',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.5,
    reviews: 67,
    tags: ['landscaping', 'garden design', 'lawn care', 'maintenance']
  },
  {
    id: 'home_movers_001',
    ownerId: 'owner_022',
    serviceName: 'Swift Movers & Packers',
    category: CATEGORY_KEYS.HOME_GARDEN,
    subcategory: SUBCATEGORY_IDS.MOVERS,
    description: 'Professional moving and packing services for homes and offices. Careful handling and secure transport.',
    location: 'Nairobi',
    pricingInfo: { type: 'negotiable', currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700666003',
      email: 'info@swiftmovers.co.ke',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.4,
    reviews: 98,
    tags: ['moving', 'packing', 'careful handling', 'secure transport']
  },

  // Business Services
  {
    id: 'biz_accounting_001',
    ownerId: 'owner_023',
    serviceName: 'AccountPro Services',
    category: CATEGORY_KEYS.BUSINESS_SERVICES,
    subcategory: SUBCATEGORY_IDS.ACCOUNTING,
    description: 'Professional accounting and bookkeeping services for businesses. Tax preparation, audits, and financial consulting.',
    location: 'Westlands, Nairobi',
    pricingInfo: { type: 'negotiable', currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700777001',
      email: 'info@accountpro.co.ke',
      preferredContactMethod: 'email'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.7,
    reviews: 56,
    tags: ['accounting', 'bookkeeping', 'tax preparation', 'audits']
  },
  {
    id: 'biz_marketing_001',
    ownerId: 'owner_024',
    serviceName: 'Digital Marketing Hub',
    category: CATEGORY_KEYS.BUSINESS_SERVICES,
    subcategory: SUBCATEGORY_IDS.MARKETING,
    description: 'Digital marketing agency offering SEO, social media marketing, content creation, and online advertising services.',
    location: 'Kilimani, Nairobi',
    pricingInfo: { type: 'negotiable', currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700777002',
      email: 'info@digitalmarketinghub.co.ke',
      preferredContactMethod: 'email'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.6,
    reviews: 78,
    tags: ['digital marketing', 'SEO', 'social media', 'content creation']
  },
  {
    id: 'biz_it_001',
    ownerId: 'owner_025',
    serviceName: 'TechSupport Solutions',
    category: CATEGORY_KEYS.BUSINESS_SERVICES,
    subcategory: SUBCATEGORY_IDS.IT_SERVICES,
    description: 'IT support and services for businesses. Network setup, computer repairs, software installation, and technical support.',
    location: 'Westlands, Nairobi',
    pricingInfo: { type: 'hourly', amount: 2500, currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700777003',
      email: 'info@techsupport.co.ke',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.5,
    reviews: 134,
    tags: ['IT support', 'network setup', 'computer repairs', 'technical support']
  },

  // Entertainment Services
  {
    id: 'ent_dj_001',
    ownerId: 'owner_026',
    serviceName: 'DJ Max Entertainment',
    category: CATEGORY_KEYS.ENTERTAINMENT,
    subcategory: SUBCATEGORY_IDS.DJS,
    description: 'Professional DJ services for weddings, parties, and corporate events. Modern equipment and diverse music selection.',
    location: 'Nairobi',
    pricingInfo: { type: 'negotiable', currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700888001',
      email: 'info@djmax.co.ke',
      whatsapp: '+254700888001',
      preferredContactMethod: 'whatsapp'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.7,
    reviews: 123,
    tags: ['DJ', 'weddings', 'parties', 'corporate events']
  },
  {
    id: 'ent_photographer_001',
    ownerId: 'owner_027',
    serviceName: 'Capture Moments Photography',
    category: CATEGORY_KEYS.ENTERTAINMENT,
    subcategory: SUBCATEGORY_IDS.PHOTOGRAPHERS,
    description: 'Professional photography services for weddings, events, portraits, and commercial photography. High-quality photos and fast delivery.',
    location: 'Nairobi',
    pricingInfo: { type: 'negotiable', currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700888002',
      email: 'info@capturemoments.co.ke',
      whatsapp: '+254700888002',
      preferredContactMethod: 'whatsapp'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.8,
    reviews: 167,
    featured: true,
    tags: ['photography', 'weddings', 'events', 'portraits']
  },
  {
    id: 'ent_catering_001',
    ownerId: 'owner_028',
    serviceName: 'Delicious Catering Services',
    category: CATEGORY_KEYS.ENTERTAINMENT,
    subcategory: SUBCATEGORY_IDS.CATERING,
    description: 'Professional catering for weddings, parties, and corporate events. Diverse menu options and professional service.',
    location: 'Nairobi',
    pricingInfo: { type: 'negotiable', currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700888003',
      email: 'info@deliciouscatering.co.ke',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.6,
    reviews: 89,
    tags: ['catering', 'weddings', 'parties', 'corporate events']
  },
  {
    id: 'ent_eventplanner_001',
    ownerId: 'owner_029',
    serviceName: 'Perfect Events Planning',
    category: CATEGORY_KEYS.ENTERTAINMENT,
    subcategory: SUBCATEGORY_IDS.EVENT_PLANNERS,
    description: 'Professional event planning and coordination for weddings, parties, and corporate events. End-to-end event management.',
    location: 'Nairobi',
    pricingInfo: { type: 'negotiable', currency: 'KSH' },
    imageUrls: [],
    contactDetails: {
      phone: '+254700888004',
      email: 'info@perfectevents.co.ke',
      preferredContactMethod: 'email'
    },
    createdAt: new Date().toISOString(),
    status: 'active',
    rating: 4.7,
    reviews: 102,
    tags: ['event planning', 'weddings', 'parties', 'corporate events']
  }
];

// Export functions to maintain compatibility with existing code
export const getServicesByCategory = (category: string): ServiceListing[] => {
  return ENHANCED_DEMO_SERVICES.filter(service => service.category === category);
};

export const getServicesBySubcategory = (category: string, subcategory: string): ServiceListing[] => {
  return ENHANCED_DEMO_SERVICES.filter(service => 
    service.category === category && service.subcategory === subcategory
  );
};

export const getRandomServices = (count: number = 10): ServiceListing[] => {
  const shuffled = [...ENHANCED_DEMO_SERVICES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export const getFeaturedServices = (): ServiceListing[] => {
  return ENHANCED_DEMO_SERVICES.filter(service => service.featured);
};

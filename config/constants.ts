// App-wide constants for LinkApp

// Navigation Tab Names
export const TAB_NAMES = {
  PROPERTY: 'Property',
  JOBS: 'Jobs',
  SERVICES: 'Services', 
  DATE_MI: 'Date Mi'
} as const;

// Property Types
export const PROPERTY_TYPES = {
  RESIDENTIAL: 'Residential',
  COMMERCIAL: 'Commercial',
  LAND: 'Land'
} as const;

// Property Listing Types
export const LISTING_TYPES = {
  RENT: 'rent',
  SALE: 'sale'
} as const;

// Job/Skill Categories
export const SKILL_CATEGORIES = {
  // Existing categories
  MASONRY: 'Masonry',
  PLUMBING: 'Plumbing', 
  ELECTRICIAN: 'Electrician',
  SEWAGE_TECHNICIAN: 'Sewage Technician',
  BIOGAS_TECHNICIAN: 'Biogas Technician',
  PAINTERS: 'Painters',
  WELDERS_FABRICATORS: 'Welders and Fabricators',
  WOOD_WORKINGS: 'Wood Workings',
  IT_TECHNOLOGY: 'IT & Technology',
  CONSTRUCTION: 'Construction',
  AUTOMOTIVE: 'Automotive',
  HEALTHCARE: 'Healthcare',
  
  // New additional categories
  HOUSE_MANAGERS: 'House Managers',
  FINANCE_ACCOUNTING: 'Finance & Accounting',
  ARCHITECTURE_CONSTRUCTION: 'Architecture & Construction',
  MECHANICS: 'Mechanics',
  BUSINESS_MANAGEMENT: 'Business Management & Administration',
  SALES_MARKETING: 'Sales & Marketing',
  ENGINEERING_MANUFACTURING: 'Engineering & Manufacturing',
  SCIENCE_RESEARCH: 'Science & Research',
  ART_DESIGN_MEDIA: 'Art Design & Media',
  LAW: 'Law',
  PUBLIC_SAFETY: 'Public Safety',
  HOSPITALITY_FOOD: 'Hospitality & Food Services',
  TRANSPORTATION_LOGISTICS: 'Transportation & Logistics',
  ANIMALS: 'Animals',
  FOOD_PLANTS_TREES: 'Food, Plants & Trees',
  NATURAL_RESOURCES: 'Natural Resources',
  MARINE_FISHERIES: 'Marine & Fisheries',
  QUATERNARY_SECTOR: 'Quaternary Sector'
} as const;

// Service Categories
export const SERVICE_CATEGORIES = {
  HOSPITALS_HEALTHCARE: 'Hospitals and Healthcare',
  SCHOOLS_EDUCATION: 'Schools and Educational Institutions',
  SUPERMARKETS_RETAIL: 'Supermarkets and Retail Stores',
  ENTERTAINMENT: 'Entertainment (Clubs, Recreation)',
  WINE_SPIRITS: 'Wine and Spirits',
  BUTCHERIES_FOOD: 'Butcheries and Food Services',
  BARBER_BEAUTY: 'Barber Shops and Beauty Services',
  SPAS_WELLNESS: 'Spas and Wellness Centers',
  MARKETS_TRADING: 'Markets and Trading Centers'
} as const;

// Tools & Materials Categories
export const TOOLS_MATERIALS = {
  TOOLS: 'Tools',
  SAND: 'Sand',
  BUILDING_STONES: 'Building Stones', 
  GRAVEL_CONCRETE: 'Gravel/Concrete',
  ALUMINIUM_GLASS: 'Aluminium and Glass',
  TILES_GRANITE: 'Tiles and Granite',
  HOME_MOVERS: 'Home Movers',
  HOUSE_APPLIANCES: 'House Appliances',
  PAINT_SHOPS: 'Paint Shops'
} as const;

// Date Mi Service Types
export const DATE_MI_SERVICES = {
  VIDEO_CALLING: 'video_calling',
  PREMIUM_PHOTOS: 'premium_photos',
  PRIVATE_MESSAGES: 'private_messages',
  EXTENDED_CHAT: 'extended_chat',
  VIRTUAL_DATE: 'virtual_date'
} as const;

// Date Mi Intentions
export const DATE_MI_INTENTIONS = {
  SHORT_TERM: 'short_term_fun',
  LONG_TERM: 'long_term_partner',
  DIGITAL_SERVICES: 'digital_services'
} as const;

// Payment/Transaction Status
export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DISPUTED: 'disputed',
  REFUNDED: 'refunded'
} as const;

// Escrow Status
export const ESCROW_STATUS = {
  CREATED: 'created',
  FUNDED: 'funded',
  SERVICE_DELIVERED: 'service_delivered',
  COMPLETED: 'completed',
  DISPUTED: 'disputed',
  CANCELLED: 'cancelled'
} as const;

// User Verification Status
export const VERIFICATION_STATUS = {
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected'
} as const;

// Content Protection Settings
export const CONTENT_PROTECTION = {
  WATERMARK_OPACITY: 0.3,
  MAX_SCREENSHOT_ATTEMPTS: 3,
  SESSION_TIMEOUT_MINUTES: 30,
  CONTENT_EXPIRY_HOURS: 24
} as const;

// App Limits
export const LIMITS = {
  MAX_IMAGES_PER_LISTING: 6,
  MAX_BIO_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_AGE_DATE_MI: 18,
  MAX_VIDEO_SESSION_HOURS: 4
} as const;

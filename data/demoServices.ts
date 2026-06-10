/**
 * Demo Services Data for LinkApp
 * Comprehensive set of realistic service listings across all categories
 */

import { SERVICE_CATEGORIES, TOOLS_MATERIALS } from '../config/constants';

export interface ServiceListing {
  id: string;
  ownerId: string;
  serviceName: string;
  category: string;
  subcategory?: string;
  description: string;
  location: string;
  pricingInfo: {
    type: 'fixed' | 'hourly' | 'negotiable' | 'package';
    amount?: number;
    currency: 'KSH' | 'USD';
  };
  imageUrls: string[];
    contactDetails: {
      phone: string;
      email?: string;
      whatsapp?: string;
      preferredContactMethod: 'phone' | 'email' | 'whatsapp' | 'in_app';
    };
  createdAt: string;
  status: 'active' | 'inactive';
  rating?: number;
  reviews?: number;
  featured?: boolean;
  tags?: string[];
  operatingHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
}

// Generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Demo service images (placeholder URLs)
const DEMO_IMAGES = {
  healthcare: [
    'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=800',
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=800',
    'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800'
  ],
  education: [
    'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800',
    'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=800',
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800'
  ],
  retail: [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
    'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800',
    'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800'
  ],
  entertainment: [
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800'
  ],
  beauty: [
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800'
  ],
  tools: [
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800',
    'https://images.unsplash.com/photo-1558618666-9c0992c83898?w=800',
    'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800'
  ]
};

const getRandomImages = (category: keyof typeof DEMO_IMAGES, count: number = 2) => {
  const images = DEMO_IMAGES[category];
  return Array(count).fill(0).map(() => images[Math.floor(Math.random() * images.length)]);
};

// Demo Services Data
export const DEMO_SERVICES: ServiceListing[] = [
  // Healthcare Services
  {
    id: generateId(),
    ownerId: 'health_001',
    serviceName: 'Nairobi West Hospital',
    category: SERVICE_CATEGORIES.HOSPITALS_HEALTHCARE,
    description: 'Full-service private hospital offering general medicine, surgery, maternity, pediatrics, and emergency services. 24/7 operations with modern equipment and qualified medical staff.',
    location: 'Nairobi West, Nairobi',
    pricingInfo: {
      type: 'fixed',
      amount: 2000,
      currency: 'KSH'
    },
    imageUrls: getRandomImages('healthcare', 3),
    contactDetails: {
      phone: '+254722123001',
      email: 'info@nairobiwest.hospital',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    rating: 4.5,
    reviews: 234,
    featured: true,
    tags: ['24/7', 'emergency', 'NHIF accepted', 'parking available'],
    operatingHours: {
      monday: '24 hours',
      tuesday: '24 hours', 
      wednesday: '24 hours',
      thursday: '24 hours',
      friday: '24 hours',
      saturday: '24 hours',
      sunday: '24 hours'
    }
  },

  {
    id: generateId(),
    ownerId: 'health_002',
    serviceName: 'Family Care Clinic',
    category: SERVICE_CATEGORIES.HOSPITALS_HEALTHCARE,
    description: 'Modern family clinic offering general practice, preventive care, immunizations, and health screenings. Experienced doctors and friendly staff in a comfortable environment.',
    location: 'Kilimani, Nairobi',
    pricingInfo: {
      type: 'fixed',
      amount: 1500,
      currency: 'KSH'
    },
    imageUrls: getRandomImages('healthcare', 2),
    contactDetails: {
      phone: '+254733456002',
      email: 'info@familycare.clinic',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    rating: 4.2,
    reviews: 89,
    tags: ['family friendly', 'immunizations', 'health screening'],
    operatingHours: {
      monday: '8:00 AM - 6:00 PM',
      tuesday: '8:00 AM - 6:00 PM',
      wednesday: '8:00 AM - 6:00 PM',
      thursday: '8:00 AM - 6:00 PM',
      friday: '8:00 AM - 6:00 PM',
      saturday: '9:00 AM - 4:00 PM',
      sunday: 'Closed'
    }
  },

  // Educational Services
  {
    id: generateId(),
    ownerId: 'edu_001',
    serviceName: 'Bright Stars Primary School',
    category: SERVICE_CATEGORIES.SCHOOLS_EDUCATION,
    description: 'Modern primary school with experienced teachers, well-equipped classrooms, computer lab, library, and playground. Following the CBC curriculum with excellent academic performance.',
    location: 'Karen, Nairobi',
    pricingInfo: {
      type: 'fixed',
      amount: 25000,
      currency: 'KSH'
    },
    imageUrls: getRandomImages('education', 3),
    contactDetails: {
      phone: '+254711234003',
      email: 'admissions@brightstars.school',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    rating: 4.7,
    reviews: 156,
    featured: true,
    tags: ['CBC curriculum', 'computer lab', 'library', 'playground', 'meals provided'],
    operatingHours: {
      monday: '7:00 AM - 4:30 PM',
      tuesday: '7:00 AM - 4:30 PM',
      wednesday: '7:00 AM - 4:30 PM',
      thursday: '7:00 AM - 4:30 PM',
      friday: '7:00 AM - 4:30 PM',
      saturday: 'Extra-curricular activities',
      sunday: 'Closed'
    }
  },

  {
    id: generateId(),
    ownerId: 'edu_002',
    serviceName: 'Excel Tutorial Center',
    category: SERVICE_CATEGORIES.SCHOOLS_EDUCATION,
    description: 'Professional tutoring center offering mathematics, science, and English lessons for primary and secondary students. Small class sizes and personalized attention.',
    location: 'Westlands, Nairobi',
    pricingInfo: {
      type: 'hourly',
      amount: 2500,
      currency: 'KSH'
    },
    imageUrls: getRandomImages('education', 2),
    contactDetails: {
      phone: '+254722345004',
      email: 'info@exceltutorial.com',
      whatsapp: '+254722345004',
      preferredContactMethod: 'whatsapp'
    },
    createdAt: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    rating: 4.4,
    reviews: 67,
    tags: ['small classes', 'personalized', 'KCPE prep', 'KCSE prep'],
    operatingHours: {
      monday: '2:00 PM - 8:00 PM',
      tuesday: '2:00 PM - 8:00 PM',
      wednesday: '2:00 PM - 8:00 PM',
      thursday: '2:00 PM - 8:00 PM',
      friday: '2:00 PM - 8:00 PM',
      saturday: '9:00 AM - 5:00 PM',
      sunday: '10:00 AM - 4:00 PM'
    }
  },

  // Retail Services
  {
    id: generateId(),
    ownerId: 'retail_001',
    serviceName: 'Fresh Foods Supermarket',
    category: SERVICE_CATEGORIES.SUPERMARKETS_RETAIL,
    description: 'Modern supermarket stocking fresh produce, groceries, household items, and electronics. Competitive prices with regular promotions and home delivery service available.',
    location: 'South B, Nairobi',
    pricingInfo: {
      type: 'negotiable',
      currency: 'KSH'
    },
    imageUrls: getRandomImages('retail', 3),
    contactDetails: {
      phone: '+254733456005',
      email: 'orders@freshfoods.co.ke',
      whatsapp: '+254733456005',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    rating: 4.1,
    reviews: 203,
    tags: ['home delivery', 'fresh produce', 'competitive prices', 'parking'],
    operatingHours: {
      monday: '7:00 AM - 9:00 PM',
      tuesday: '7:00 AM - 9:00 PM',
      wednesday: '7:00 AM - 9:00 PM',
      thursday: '7:00 AM - 9:00 PM',
      friday: '7:00 AM - 9:00 PM',
      saturday: '7:00 AM - 9:00 PM',
      sunday: '8:00 AM - 8:00 PM'
    }
  },

  // Entertainment
  {
    id: generateId(),
    ownerId: 'ent_001',
    serviceName: 'Club Pulse Nightclub',
    category: SERVICE_CATEGORIES.ENTERTAINMENT,
    description: 'Premium nightclub featuring local and international DJs, spacious dance floor, VIP sections, and full bar service. Regular themed nights and live music events.',
    location: 'Westlands, Nairobi',
    pricingInfo: {
      type: 'fixed',
      amount: 1000,
      currency: 'KSH'
    },
    imageUrls: getRandomImages('entertainment', 3),
    contactDetails: {
      phone: '+254711567006',
      email: 'bookings@clubpulse.co.ke',
      whatsapp: '+254711567006',
      preferredContactMethod: 'whatsapp'
    },
    createdAt: new Date(Date.now() - Math.random() * 25 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    rating: 4.3,
    reviews: 341,
    featured: true,
    tags: ['live music', 'VIP sections', 'themed nights', '18+', 'valet parking'],
    operatingHours: {
      wednesday: '9:00 PM - 4:00 AM',
      thursday: '9:00 PM - 4:00 AM',
      friday: '9:00 PM - 4:00 AM',
      saturday: '9:00 PM - 4:00 AM',
      sunday: 'Special events only'
    }
  },

  // Beauty Services  
  {
    id: generateId(),
    ownerId: 'beauty_001',
    serviceName: 'Elegant Hair & Beauty Salon',
    category: SERVICE_CATEGORIES.BARBER_BEAUTY,
    description: 'Full-service beauty salon offering hair styling, cutting, coloring, manicures, pedicures, and facial treatments. Experienced stylists using quality products.',
    location: 'Kilimani, Nairobi',
    pricingInfo: {
      type: 'fixed',
      amount: 1500,
      currency: 'KSH'
    },
    imageUrls: getRandomImages('beauty', 3),
    contactDetails: {
      phone: '+254722678007',
      email: 'bookings@elegantbeauty.co.ke',
      whatsapp: '+254722678007',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date(Date.now() - Math.random() * 18 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    rating: 4.6,
    reviews: 128,
    tags: ['appointment only', 'quality products', 'experienced stylists', 'manicure', 'pedicure'],
    operatingHours: {
      monday: '9:00 AM - 7:00 PM',
      tuesday: '9:00 AM - 7:00 PM',
      wednesday: '9:00 AM - 7:00 PM',
      thursday: '9:00 AM - 7:00 PM',
      friday: '9:00 AM - 7:00 PM',
      saturday: '8:00 AM - 6:00 PM',
      sunday: '10:00 AM - 4:00 PM'
    }
  },

  // Spa & Wellness
  {
    id: generateId(),
    ownerId: 'spa_001',
    serviceName: 'Serenity Spa & Wellness',
    category: SERVICE_CATEGORIES.SPAS_WELLNESS,
    description: 'Luxury spa offering massage therapy, aromatherapy, body treatments, and wellness consultations. Peaceful environment with trained therapists and natural products.',
    location: 'Karen, Nairobi',
    pricingInfo: {
      type: 'fixed',
      amount: 3500,
      currency: 'KSH'
    },
    imageUrls: getRandomImages('beauty', 2),
    contactDetails: {
      phone: '+254733789008',
      email: 'info@serenityspa.co.ke',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date(Date.now() - Math.random() * 35 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    rating: 4.8,
    reviews: 95,
    featured: true,
    tags: ['luxury spa', 'natural products', 'couple treatments', 'wellness consultation'],
    operatingHours: {
      monday: '10:00 AM - 8:00 PM',
      tuesday: '10:00 AM - 8:00 PM',
      wednesday: '10:00 AM - 8:00 PM',
      thursday: '10:00 AM - 8:00 PM',
      friday: '10:00 AM - 8:00 PM',
      saturday: '9:00 AM - 7:00 PM',
      sunday: '10:00 AM - 6:00 PM'
    }
  },

  // Tools & Materials
  {
    id: generateId(),
    ownerId: 'tools_001',
    serviceName: 'BuildMart Hardware Store',
    category: TOOLS_MATERIALS.TOOLS,
    description: 'Comprehensive hardware store stocking construction tools, building materials, plumbing supplies, electrical equipment, and paint. Competitive prices with bulk discounts.',
    location: 'Industrial Area, Nairobi',
    pricingInfo: {
      type: 'negotiable',
      currency: 'KSH'
    },
    imageUrls: getRandomImages('tools', 3),
    contactDetails: {
      phone: '+254711890009',
      email: 'sales@buildmart.co.ke',
      whatsapp: '+254711890009',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date(Date.now() - Math.random() * 28 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    rating: 4.2,
    reviews: 187,
    tags: ['bulk discounts', 'delivery available', 'wide selection', 'competitive prices'],
    operatingHours: {
      monday: '7:00 AM - 6:00 PM',
      tuesday: '7:00 AM - 6:00 PM',
      wednesday: '7:00 AM - 6:00 PM',
      thursday: '7:00 AM - 6:00 PM',
      friday: '7:00 AM - 6:00 PM',
      saturday: '8:00 AM - 5:00 PM',
      sunday: 'Closed'
    }
  },

  {
    id: generateId(),
    ownerId: 'materials_001',
    serviceName: 'Quality Sand & Ballast Suppliers',
    category: TOOLS_MATERIALS.SAND,
    description: 'Reliable supplier of construction sand, ballast, hardcore, and aggregates. Quality materials delivered promptly to construction sites across Nairobi and environs.',
    location: 'Kasarani, Nairobi',
    pricingInfo: {
      type: 'fixed',
      amount: 3000,
      currency: 'KSH'
    },
    imageUrls: getRandomImages('tools', 2),
    contactDetails: {
      phone: '+254722901010',
      whatsapp: '+254722901010',
      preferredContactMethod: 'phone'
    },
    createdAt: new Date(Date.now() - Math.random() * 12 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    rating: 4.0,
    reviews: 156,
    tags: ['quality materials', 'prompt delivery', 'construction sites', 'competitive rates'],
    operatingHours: {
      monday: '6:00 AM - 6:00 PM',
      tuesday: '6:00 AM - 6:00 PM',
      wednesday: '6:00 AM - 6:00 PM',
      thursday: '6:00 AM - 6:00 PM',
      friday: '6:00 AM - 6:00 PM',
      saturday: '6:00 AM - 4:00 PM',
      sunday: 'Emergency delivery only'
    }
  }
];

// Helper functions
export const getServicesByCategory = (category: string): ServiceListing[] => {
  return DEMO_SERVICES.filter(service => service.category === category);
};

export const getRandomServices = (count: number = 10): ServiceListing[] => {
  const shuffled = [...DEMO_SERVICES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export const getFeaturedServices = (): ServiceListing[] => {
  return DEMO_SERVICES.filter(service => service.featured);
};

export const getServicesByLocation = (location: string): ServiceListing[] => {
  return DEMO_SERVICES.filter(service => 
    service.location.toLowerCase().includes(location.toLowerCase())
  );
};

export const searchServices = (query: string): ServiceListing[] => {
  const searchTerm = query.toLowerCase();
  return DEMO_SERVICES.filter(service =>
    service.serviceName.toLowerCase().includes(searchTerm) ||
    service.description.toLowerCase().includes(searchTerm) ||
    service.location.toLowerCase().includes(searchTerm) ||
    service.category.toLowerCase().includes(searchTerm) ||
    (service.tags && service.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
  );
};

// Service statistics
export const getDemoServiceStats = () => {
  const stats = {
    total_services: DEMO_SERVICES.length,
    active_services: DEMO_SERVICES.filter(s => s.status === 'active').length,
    featured_services: DEMO_SERVICES.filter(s => s.featured).length,
    average_rating: parseFloat(
      (DEMO_SERVICES.filter(s => s.rating)
        .reduce((sum, s) => sum + (s.rating || 0), 0) / 
      DEMO_SERVICES.filter(s => s.rating).length).toFixed(1)
    ),
    services_by_category: {} as Record<string, number>,
    services_by_location: {} as Record<string, number>
  };

  // Count by category
  DEMO_SERVICES.forEach(service => {
    stats.services_by_category[service.category] = 
      (stats.services_by_category[service.category] || 0) + 1;
  });

  // Count by location
  DEMO_SERVICES.forEach(service => {
    const location = service.location.split(',')[1]?.trim() || service.location;
    stats.services_by_location[location] = 
      (stats.services_by_location[location] || 0) + 1;
  });

  return stats;
};

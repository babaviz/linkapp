/**
 * Canonical category mapping: subcategory/variants -> parent category.
 * Used at write time (store parent in DB) and read time (aggregate counts).
 * Database is the single source of truth; we store parent categories for consistency.
 */
export const SUBCATEGORY_TO_PARENT: Record<string, string> = {
  // Education & Training
  colleges: 'education_training',
  private_universities: 'education_training',
  public_universities: 'education_training',
  daycares: 'education_training',
  primary_schools: 'education_training',
  secondary_schools: 'education_training',
  vet: 'education_training',
  tutoring: 'education_training',
  edtech: 'education_training',
  corporate_edu: 'education_training',
  // Healthcare & Medical
  hospitals: 'healthcare_medical',
  clinics: 'healthcare_medical',
  pharmacies: 'healthcare_medical',
  dentists: 'healthcare_medical',
  optometrists: 'healthcare_medical',
  physiotherapy: 'healthcare_medical',
  labs: 'healthcare_medical',
  mental_health: 'healthcare_medical',
  // Beauty & Wellness
  salons: 'beauty_wellness',
  barbers: 'beauty_wellness',
  spas: 'beauty_wellness',
  nails: 'beauty_wellness',
  massage: 'beauty_wellness',
  skincare: 'beauty_wellness',
  // Construction & Building
  contractors: 'construction',
  architects: 'construction',
  masons: 'construction',
  carpenters: 'construction',
  plumbers: 'construction',
  electricians: 'construction',
  electrical: 'construction',
  painters: 'construction',
  roofers: 'construction',
  // Automotive
  mechanics: 'automotive',
  car_wash: 'automotive',
  body_shops: 'automotive',
  tires: 'automotive',
  detailing: 'automotive',
  // Home & Garden
  cleaning: 'home_garden',
  landscaping: 'home_garden',
  pest_control: 'home_garden',
  security: 'home_garden',
  movers: 'home_garden',
  // Business Services (IT, tech, consulting)
  accounting: 'business_services',
  legal: 'business_services',
  marketing: 'business_services',
  consulting: 'business_services',
  it_services: 'business_services',
  technology: 'business_services',
  it: 'business_services',
  tech: 'business_services',
  mobile_app_development: 'business_services',
  software_development: 'business_services',
  // Entertainment & Events
  djs: 'entertainment',
  photographers: 'entertainment',
  videographers: 'entertainment',
  event_planners: 'entertainment',
  catering: 'entertainment',
  general: 'business_services',
};

export const PARENT_CATEGORIES = [
  'education_training',
  'healthcare_medical',
  'beauty_wellness',
  'construction',
  'automotive',
  'home_garden',
  'business_services',
  'entertainment',
] as const;

export function mapCategoryToParent(category: string): string {
  const normalized = category.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (PARENT_CATEGORIES.includes(normalized as (typeof PARENT_CATEGORIES)[number])) {
    return normalized;
  }
  return SUBCATEGORY_TO_PARENT[normalized] ?? normalized;
}

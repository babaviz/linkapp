const CATEGORY_VARIANTS: Record<string, string[]> = {
  plumbing: ['Plumbing', 'plumbing', 'Plumber', 'plumber'],
  masonry: ['Masonry', 'masonry'],
  electrician: ['Electrician', 'electrician'],
  sewage_technician: ['Sewage Technician', 'sewage technician', 'sewage_technician'],
  biogas_technician: ['Biogas Technician', 'biogas technician', 'biogas_technician'],
  painters: ['Painters', 'painters', 'Painter', 'painter'],
  welders_and_fabricators: [
    'Welders and Fabricators',
    'welders and fabricators',
    'welders_and_fabricators',
    'welders_fabricators',
  ],
  wood_workings: ['Wood Workings', 'wood workings', 'wood_workings', 'Carpentry', 'carpentry'],
  it_and_technology: ['IT & Technology', 'it & technology', 'it_technology', 'technology'],
  construction: ['Construction', 'construction'],
  automotive: ['Automotive', 'automotive'],
  healthcare: ['Healthcare', 'healthcare'],
  house_managers: ['House Managers', 'house managers', 'house_managers'],
  finance_and_accounting: ['Finance & Accounting', 'finance & accounting', 'finance_accounting'],
  architecture_and_construction: [
    'Architecture & Construction',
    'architecture & construction',
    'architecture_construction',
  ],
  mechanics: ['Mechanics', 'mechanics'],
  business_management_and_administration: [
    'Business Management & Administration',
    'business management & administration',
    'business_management',
  ],
  sales_and_marketing: ['Sales & Marketing', 'sales & marketing', 'sales_marketing'],
  engineering_and_manufacturing: [
    'Engineering & Manufacturing',
    'engineering & manufacturing',
    'engineering_manufacturing',
  ],
  science_and_research: ['Science & Research', 'science & research', 'science_research'],
  art_design_and_media: ['Art Design & Media', 'art design & media', 'art_design_media'],
  law: ['Law', 'law'],
  public_safety: ['Public Safety', 'public safety', 'public_safety'],
  hospitality_and_food_services: [
    'Hospitality & Food Services',
    'hospitality & food services',
    'hospitality_food_services',
    'hospitality_food',
  ],
  transportation_and_logistics: [
    'Transportation & Logistics',
    'transportation & logistics',
    'transportation_logistics',
  ],
  animals: ['Animals', 'animals'],
  food_plants_and_trees: ['Food, Plants & Trees', 'food, plants & trees', 'food_plants_trees'],
  natural_resources: ['Natural Resources', 'natural resources', 'natural_resources'],
  marine_and_fisheries: ['Marine & Fisheries', 'marine & fisheries', 'marine_fisheries'],
  quaternary_sector: ['Quaternary Sector', 'quaternary sector', 'quaternary_sector'],
};

function normalizeCategoryForMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function getJobCategoryCanonicalKey(category: string): string {
  const normalizedInput = normalizeCategoryForMatch(category);
  for (const [canonical, variants] of Object.entries(CATEGORY_VARIANTS)) {
    if (variants.some(variant => normalizeCategoryForMatch(variant) === normalizedInput)) {
      return canonical;
    }
  }

  return category.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function getJobCategoryVariants(category: string): string[] {
  const canonical = getJobCategoryCanonicalKey(category);
  const direct = category.trim();
  const variants = CATEGORY_VARIANTS[canonical] || [];

  return Array.from(
    new Set([
      direct,
      direct.toLowerCase(),
      direct.replace(/_/g, ' '),
      direct.replace(/\s+/g, '_'),
      ...variants,
    ])
  ).filter(Boolean);
}

export function areSameJobCategory(left: string, right: string): boolean {
  return getJobCategoryCanonicalKey(left) === getJobCategoryCanonicalKey(right);
}

/**
 * Custom hook to get the user's country from their profile
 * Returns the country name or undefined if not set
 */

import { useAppSelector } from '../redux/hooks';

export const useUserCountry = (): string | undefined => {
  const user = useAppSelector((state) => state.auth.user);
  
  if (!user?.location) {
    return undefined;
  }

  const locationPrefs = user.location as any;
  return locationPrefs.county || locationPrefs.country;
};

/**
 * Get a dynamic subtitle with the user's country or a universal fallback
 * @param template - String template with {country} placeholder
 * @param fallback - Universal text without country reference
 */
export const useDynamicSubtitle = (
  template: string,
  fallback: string
): string => {
  const country = useUserCountry();
  
  if (country) {
    return template.replace('{country}', country);
  }
  
  return fallback;
};

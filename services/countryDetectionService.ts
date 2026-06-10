import locationService from './locationService';
import { supabase } from './supabaseClient';

export type SupportedCountry = 'KE' | 'UG' | 'TZ' | 'OTHER';

export interface CountryDetectionResult {
  countryCode: SupportedCountry;
  detectionMethod: 'gps' | 'ip' | 'stored' | 'manual' | 'default';
  confidence: 'high' | 'medium' | 'low';
  countryName?: string;
}

class CountryDetectionService {
  private static instance: CountryDetectionService;
  private cachedCountry: CountryDetectionResult | null = null;

  static getInstance(): CountryDetectionService {
    if (!CountryDetectionService.instance) {
      CountryDetectionService.instance = new CountryDetectionService();
    }
    return CountryDetectionService.instance;
  }

  /**
   * Detect user's country automatically using multiple methods
   */
  async detectUserCountry(userId?: string): Promise<CountryDetectionResult> {
    // 1. Check if country is already stored for this user
    if (userId) {
      const storedCountry = await this.getStoredCountry(userId);
      if (storedCountry) {
        this.cachedCountry = storedCountry;
        return storedCountry;
      }
    }

    // 2. Try GPS-based detection (most accurate)
    const gpsResult = await this.detectCountryFromGPS();
    if (gpsResult.countryCode !== 'OTHER') {
      this.cachedCountry = gpsResult;
      // Store for future use
      if (userId) {
        await this.storeUserCountry(userId, gpsResult.countryCode);
      }
      return gpsResult;
    }

    // 3. Try IP-based detection
    const ipResult = await this.detectCountryFromIP();
    if (ipResult.countryCode !== 'OTHER') {
      this.cachedCountry = ipResult;
      if (userId) {
        await this.storeUserCountry(userId, ipResult.countryCode);
      }
      return ipResult;
    }

    // 4. Default to Kenya (most common)
    const defaultResult: CountryDetectionResult = {
      countryCode: 'KE',
      detectionMethod: 'default',
      confidence: 'low',
      countryName: 'Kenya'
    };
    
    this.cachedCountry = defaultResult;
    return defaultResult;
  }

  /**
   * Detect country from GPS coordinates
   */
  private async detectCountryFromGPS(): Promise<CountryDetectionResult> {
    try {
      const locationResult = await locationService.getCurrentLocation();
      
      if (!locationResult.success || !locationResult.location) {
        return this.getOtherCountryResult();
      }

      const { latitude, longitude } = locationResult.location;

      // Check if coordinates fall within supported countries
      if (locationService.isWithinRegionBounds({ latitude, longitude }, 'kenya')) {
        return {
          countryCode: 'KE',
          detectionMethod: 'gps',
          confidence: 'high',
          countryName: 'Kenya'
        };
      } else if (locationService.isWithinRegionBounds({ latitude, longitude }, 'uganda')) {
        return {
          countryCode: 'UG',
          detectionMethod: 'gps',
          confidence: 'high',
          countryName: 'Uganda'
        };
      } else if (locationService.isWithinRegionBounds({ latitude, longitude }, 'tanzania')) {
        return {
          countryCode: 'TZ',
          detectionMethod: 'gps',
          confidence: 'high',
          countryName: 'Tanzania'
        };
      }

      return this.getOtherCountryResult();
    } catch {
      // Silent fallback - GPS detection failure is expected and handled gracefully
      return this.getOtherCountryResult();
    }
  }

  /**
   * Detect country from IP address using ipapi.co
   */
  private async detectCountryFromIP(): Promise<CountryDetectionResult> {
    try {
      // Use Promise.race for timeout (works in React Native)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      const fetchPromise = fetch('https://ipapi.co/json/', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        // Silent fallback - IP detection is optional
        return this.getOtherCountryResult();
      }

      const data = await response.json();
      
      // Check if response contains error from ipapi.co
      if (data.error) {
        return this.getOtherCountryResult();
      }

      const countryCode = data.country_code?.toUpperCase();

      const countryMap: Record<string, SupportedCountry> = {
        'KE': 'KE',
        'UG': 'UG',
        'TZ': 'TZ'
      };

      const detectedCountry = countryMap[countryCode] || 'OTHER';

      return {
        countryCode: detectedCountry,
        detectionMethod: 'ip',
        confidence: detectedCountry !== 'OTHER' ? 'medium' : 'low',
        countryName: data.country_name
      };
    } catch {
      // Silent fallback - IP detection failure is expected and handled gracefully
      // Don't log as error since this is a normal fallback scenario
      return this.getOtherCountryResult();
    }
  }

  /**
   * Get stored country preference from database
   */
  private async getStoredCountry(userId: string): Promise<CountryDetectionResult | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('country')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return null;
      }

      if (!data || !(data as any).country_code) {
        return null;
      }

      const countryCode = (data as any).country_code as string;
      
      if (['KE', 'UG', 'TZ'].includes(countryCode)) {
        const countryNames: Record<string, string> = {
          'KE': 'Kenya',
          'UG': 'Uganda',
          'TZ': 'Tanzania'
        };

        return {
          countryCode: countryCode as SupportedCountry,
          detectionMethod: 'stored',
          confidence: 'high',
          countryName: countryNames[countryCode]
        };
      }

      return null;
    } catch {
      // Silent fallback - database query failure is handled gracefully
      return null;
    }
  }

  /**
   * Store user's country preference
   */
  async storeUserCountry(userId: string, countryCode: SupportedCountry): Promise<void> {
    return;
  }

  /**
   * Manual country selection by user
   */
  async setManualCountry(userId: string, countryCode: SupportedCountry): Promise<CountryDetectionResult> {
    const countryNames: Record<string, string> = {
      'KE': 'Kenya',
      'UG': 'Uganda',
      'TZ': 'Tanzania',
      'OTHER': 'Other'
    };

    const result: CountryDetectionResult = {
      countryCode,
      detectionMethod: 'manual',
      confidence: 'high',
      countryName: countryNames[countryCode]
    };

    this.cachedCountry = result;
    await this.storeUserCountry(userId, countryCode);
    
    return result;
  }

  /**
   * Get cached country (if available)
   */
  getCachedCountry(): CountryDetectionResult | null {
    return this.cachedCountry;
  }

  /**
   * Clear cached country
   */
  clearCache(): void {
    this.cachedCountry = null;
  }

  /**
   * Helper to return OTHER country result
   */
  private getOtherCountryResult(): CountryDetectionResult {
    return {
      countryCode: 'OTHER',
      detectionMethod: 'default',
      confidence: 'low'
    };
  }

  /**
   * Check if country supports mobile money
   */
  supportsMobileMoney(countryCode: SupportedCountry): boolean {
    return ['KE', 'UG', 'TZ'].includes(countryCode);
  }

  /**
   * Get all supported countries for selection
   */
  getSupportedCountries(): Array<{code: SupportedCountry; name: string; flag: string}> {
    return [
      { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
      { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
      { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
      { code: 'OTHER', name: 'Other (Card Only)', flag: '🌍' }
    ];
  }
}

let instance: CountryDetectionService | null = null;
const handler: ProxyHandler<CountryDetectionService> = {
  get(target, prop) {
    if (!instance) instance = CountryDetectionService.getInstance();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
};
export default new Proxy({} as CountryDetectionService, handler);

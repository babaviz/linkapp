import AsyncStorage from '@react-native-async-storage/async-storage';
import { privacyPolicyData, PrivacyPolicyData } from '../data/privacyPolicy';

const PRIVACY_POLICY_VERSION_KEY = '@privacy_policy_version';
const PRIVACY_POLICY_ACCEPTED_KEY = '@privacy_policy_accepted';
const PRIVACY_POLICY_ACCEPTANCE_DATE_KEY = '@privacy_policy_acceptance_date';
const PRIVACY_POLICY_FIRST_VIEW_KEY = '@privacy_policy_first_view';

export interface PrivacyPolicyAcceptance {
  version: string;
  accepted: boolean;
  acceptanceDate: string | null;
  hasViewedFirstTime: boolean;
}

class PrivacyPolicyService {
  /**
   * Get the current privacy policy data
   */
  getCurrentPolicy(): PrivacyPolicyData {
    return privacyPolicyData;
  }

  /**
   * Get the user's privacy policy acceptance status
   */
  async getAcceptanceStatus(): Promise<PrivacyPolicyAcceptance> {
    try {
      const [version, accepted, acceptanceDate, hasViewedFirstTime] = await Promise.all([
        AsyncStorage.getItem(PRIVACY_POLICY_VERSION_KEY),
        AsyncStorage.getItem(PRIVACY_POLICY_ACCEPTED_KEY),
        AsyncStorage.getItem(PRIVACY_POLICY_ACCEPTANCE_DATE_KEY),
        AsyncStorage.getItem(PRIVACY_POLICY_FIRST_VIEW_KEY),
      ]);

      return {
        version: version || '',
        accepted: accepted === 'true',
        acceptanceDate: acceptanceDate || null,
        hasViewedFirstTime: hasViewedFirstTime === 'true',
      };
    } catch {
      return {
        version: '',
        accepted: false,
        acceptanceDate: null,
        hasViewedFirstTime: false,
      };
    }
  }

  /**
   * Check if user needs to accept a new version of the privacy policy
   */
  async needsAcceptance(): Promise<boolean> {
    const acceptance = await this.getAcceptanceStatus();
    const currentVersion = privacyPolicyData.version;

    // If no version stored, user needs to accept
    if (!acceptance.version) {
      return true;
    }

    // If version changed, user needs to accept new version
    if (acceptance.version !== currentVersion) {
      return true;
    }

    // If not accepted, user needs to accept
    if (!acceptance.accepted) {
      return true;
    }

    return false;
  }

  /**
   * Check if user has viewed the privacy policy for the first time
   */
  async hasViewedFirstTime(): Promise<boolean> {
    try {
      const hasViewed = await AsyncStorage.getItem(PRIVACY_POLICY_FIRST_VIEW_KEY);
      return hasViewed === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Mark privacy policy as viewed for the first time
   */
  async markAsViewedFirstTime(): Promise<void> {
    try {
      await AsyncStorage.setItem(PRIVACY_POLICY_FIRST_VIEW_KEY, 'true');
    } catch {
      // Silently fail
    }
  }

  /**
   * Accept the current privacy policy version
   */
  async acceptPolicy(): Promise<void> {
    try {
      const acceptanceDate = new Date().toISOString();
      await Promise.all([
        AsyncStorage.setItem(PRIVACY_POLICY_VERSION_KEY, privacyPolicyData.version),
        AsyncStorage.setItem(PRIVACY_POLICY_ACCEPTED_KEY, 'true'),
        AsyncStorage.setItem(PRIVACY_POLICY_ACCEPTANCE_DATE_KEY, acceptanceDate),
      ]);
    } catch {
      throw new Error('Failed to save privacy policy acceptance');
    }
  }

  /**
   * Revoke privacy policy acceptance (for testing or user request)
   */
  async revokeAcceptance(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(PRIVACY_POLICY_ACCEPTED_KEY),
        AsyncStorage.removeItem(PRIVACY_POLICY_ACCEPTANCE_DATE_KEY),
      ]);
    } catch {
      // Silently fail
    }
  }

  /**
   * Get acceptance date
   */
  async getAcceptanceDate(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(PRIVACY_POLICY_ACCEPTANCE_DATE_KEY);
    } catch {
      return null;
    }
  }
}

export const privacyPolicyService = new PrivacyPolicyService();


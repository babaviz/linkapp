import { Share, Platform } from 'react-native';
import referralService from '../services/referralService';
import { ENV } from '../config/environment';

// Safely import Firebase analytics
let firebaseAnalyticsService: any = null;
try {
  firebaseAnalyticsService = require('../services/firebaseAnalyticsService').default;
} catch (error) {
  // Firebase not available
}

export async function shareReferral(code?: string | null): Promise<void> {
  try {
    const title = 'Join me on LinkApp';
    const baseUrl = typeof ENV?.APP_URL === 'string' && ENV.APP_URL.trim().length > 0 ? ENV.APP_URL.replace(/\/+$/, '') : 'https://link-app.co';
    const link = code ? referralService.generateReferralLink(code) : baseUrl;
    const message = code
      ? `Join me on LinkApp and unlock rewards with my code ${code} → ${link}`
      : `Join me on LinkApp → ${link}`;

    if (Platform.OS === 'ios') {
      await Share.share({
        message,
        url: link,
        title,
      });
    } else {
      await Share.share(
        {
          message,
          title,
        },
        {
          dialogTitle: title,
        }
      );
    }

    // Best-effort analytics (non-blocking)
    if (firebaseAnalyticsService) {
      firebaseAnalyticsService.logCustomEvent('referral_share', {
        referral_code: code,
        link_length: link.length,
        platform: Platform.OS,
      }).catch(() => {});
    }
  } catch (error) {
    // Silent failure for share action - user likely cancelled
  }
}

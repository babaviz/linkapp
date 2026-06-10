import { Linking } from 'react-native';
import type { NavigationContainerRef } from '@react-navigation/native';

interface EmailVerificationParams {
  access_token?: string;
  refresh_token?: string;
  token_hash?: string;
  type?: string;
}

interface ParsedUrl {
  pathname: string;
  searchParams: Map<string, string>;
  hash: string;
}

export class LinkingService {
  private static navigationRef: NavigationContainerRef<Record<string, object | undefined>> | null = null;

  static setNavigationRef(ref: NavigationContainerRef<Record<string, object | undefined>>) {
    this.navigationRef = ref;
  }

  static navigate(routeName: string, params?: Record<string, unknown>) {
    if (this.navigationRef?.isReady()) {
      const navigation = this.navigationRef as NavigationContainerRef<any>;
      navigation.navigate(routeName as any, params as any);
    }
  }

  static goBack() {
    if (!this.navigationRef?.isReady()) return;
    const navigation = this.navigationRef as NavigationContainerRef<any>;
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }

  static getCurrentRouteName(): string | undefined {
    if (!this.navigationRef?.isReady()) return undefined;
    return this.navigationRef.getCurrentRoute?.()?.name;
  }

  static async initializeDeepLinking() {
    // Handle initial URL when app is opened from closed state
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      this.handleUrl(initialUrl);
    }

    // Handle URLs when app is in background/foreground
    const subscription = Linking.addEventListener('url', (event) => {
      this.handleUrl(event.url);
    });

    return subscription;
  }

  private static parseUrl(url: string): ParsedUrl | null {
    try {
      const parsedUrl = new URL(url);

      const protocol = parsedUrl.protocol.replace(':', '');
      const isHttp = protocol === 'http' || protocol === 'https';

      const pathname = isHttp
        ? parsedUrl.pathname
        : `/${parsedUrl.host}${parsedUrl.pathname}`;

      const searchParams = new Map<string, string>();
      parsedUrl.searchParams.forEach((value, key) => {
        searchParams.set(key, value);
      });

      const hash = parsedUrl.hash ? parsedUrl.hash.slice(1) : '';
      if (hash) {
        hash.split('&').forEach((param) => {
          const [key, value] = param.split('=');
          if (key) {
            searchParams.set(key, decodeURIComponent(value || ''));
          }
        });
      }

      return { pathname, searchParams, hash };
    } catch {
      return null;
    }
  }

  private static handleUrl(url: string) {
    const parsedUrl = this.parseUrl(url);
    if (!parsedUrl) {
      return;
    }
    
    // Handle auth callback URLs
    if (parsedUrl.pathname === '/auth/callback') {
      this.handleAuthCallback(parsedUrl);
    } else if (parsedUrl.pathname === '/auth/reset-password') {
      this.handlePasswordResetCallback(parsedUrl);
    }
  }

  private static handleAuthCallback(url: ParsedUrl) {
    const params: EmailVerificationParams = {};
    
    // Extract parameters from URL
    url.searchParams.forEach((value, key) => {
      if (key === 'access_token') params.access_token = value;
      else if (key === 'refresh_token') params.refresh_token = value;
      else if (key === 'token_hash') params.token_hash = value;
      else if (key === 'type') params.type = value;
    });

    // Navigate to email verification screen with parameters
    if (this.navigationRef?.isReady()) {
      this.navigationRef.navigate('EmailVerification', params);
    } else {
      // If navigation is not ready, wait and try again
      setTimeout(() => {
        if (this.navigationRef?.isReady()) {
          this.navigationRef.navigate('EmailVerification', params);
        }
      }, 1000);
    }
  }

  private static handlePasswordResetCallback(url: ParsedUrl) {
    const params: EmailVerificationParams = {};
    
    // Extract parameters from URL
    url.searchParams.forEach((value, key) => {
      if (key === 'access_token') params.access_token = value;
      else if (key === 'refresh_token') params.refresh_token = value;
      else if (key === 'token_hash') params.token_hash = value;
      else if (key === 'type') params.type = value;
    });

    // Set type to password reset if not already set
    if (!params.type) {
      params.type = 'recovery';
    }

    // Navigate to email verification screen with parameters (it handles password reset too)
    if (this.navigationRef?.isReady()) {
      this.navigationRef.navigate('EmailVerification', params);
    } else {
      // If navigation is not ready, wait and try again
      setTimeout(() => {
        if (this.navigationRef?.isReady()) {
          this.navigationRef.navigate('EmailVerification', params);
        }
      }, 1000);
    }
  }

  static getLinkingConfig() {
    return {
      prefixes: ['linkapp://', 'https://linkapp.com', 'https://link-app.co'],
      config: {
        screens: {
          // Referral deep links
          ReferralLink: {
            path: 'r/:code',
            parse: {
              code: (code: string) => decodeURIComponent(code),
            },
          },

          // Auth deep links
          EmailVerification: 'auth/callback',
          ResetPassword: 'auth/reset-password',

          // Chat deep links (universal entry points)
          ChatChannel: {
            path: 'chat/channel/:channelCid',
            parse: {
              channelCid: (channelCid: string) => decodeURIComponent(channelCid),
            },
          },
          ChatThread: {
            path: 'chat/thread/:channelCid/:parentMessageId',
            parse: {
              channelCid: (channelCid: string) => decodeURIComponent(channelCid),
              parentMessageId: (parentMessageId: string) => parentMessageId,
            },
          },

          // Call deep links
          VideoCallScreen: {
            path: 'call/:callId',
            parse: {
              callId: (callId: string) => decodeURIComponent(callId),
            },
          },

          // DateMi deep links
          DateMiChat: {
            path: 'datemi/chat/:matchId',
            parse: {
              matchId: (matchId: string) => matchId,
            },
          },
          ProfileView: {
            path: 'profile/:profileId',
            parse: {
              profileId: (profileId: string) => profileId,
            },
          },

          // Entity deep links
          PropertyDetails: {
            path: 'property/:propertyId',
            parse: {
              propertyId: (propertyId: string) => propertyId,
            },
          },
          JobDetails: {
            path: 'job/:jobId',
            parse: {
              jobId: (jobId: string) => jobId,
            },
          },
          ServiceDetails: {
            path: 'service/:serviceId',
            parse: {
              serviceId: (serviceId: string) => serviceId,
            },
          },

          // Utility deep links
          Notifications: 'notifications',
          PaymentScreen: 'payment',
        },
      },
    };
  }
}

import { supabase } from './supabaseClient';
import { ENV } from '../config/environment';
import transactionalNotificationService from './transactionalNotificationService';
import { dateMiFeatureEntitlementService } from './dateMiFeatureEntitlementService';
import entitlementService from './entitlementService';

// Currency exchange rates (can be replaced with live rates API)
export const EXCHANGE_RATES = {
  USD: {
    KES: 135, // 1 USD = 135 KES
    UGX: 3750, // 1 USD = 3,750 UGX
    TZS: 2500, // 1 USD = 2,500 TZS
  }
};

export interface PaystackConfig {
  publicKey: string;
  secretKey: string;
  baseUrl: string;
}

export interface CountryConfig {
  code: 'KE' | 'UG' | 'TZ';
  name: string;
  currency: 'KES' | 'UGX' | 'TZS';
  currencySymbol: string;
  paymentMethods: PaymentMethodConfig[];
  exchangeRate: number; // Rate from USD
}

export interface PaymentMethodConfig {
  type: 'card' | 'mobile_money' | 'bank';
  provider: string;
  displayName: string;
  icon?: string;
  channels: string[]; // Paystack channels
}

export interface SubscriptionPricing {
  tier: 'pro' | 'premium';
  billingCycle: 'monthly' | 'yearly';
  usdPrice: number;
  localPrice: number;
  currency: string;
  formattedPrice: string;
}

export interface PaystackPaymentRequest {
  email: string;
  amount: number; // In smallest currency unit (e.g., kobo for NGN, cents for KES)
  currency: 'KES' | 'UGX' | 'TZS' | 'NGN';
  reference?: string;
      metadata?: {
    userId: string;
    subscriptionTier: string;
    billingCycle: string;
    country: string;
    productType?: string;
    featurePackage?: string;
    custom_fields?: Array<{
      display_name: string;
      variable_name: string;
      value: string;
    }>;
  };
  channels?: string[]; // Specific payment channels to enable
  callback_url?: string;
}

export interface PaystackTransactionResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerificationResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    metadata: Record<string, unknown>;
    customer: {
      id: number;
      email: string;
      phone: string;
    };
  };
}

// Country configurations
export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  KE: {
    code: 'KE',
    name: 'Kenya',
    currency: 'KES',
    currencySymbol: 'KSh',
    exchangeRate: EXCHANGE_RATES.USD.KES,
    paymentMethods: [
      {
        type: 'mobile_money',
        provider: 'mpesa',
        displayName: 'M-PESA',
        icon: '📱',
        channels: ['mobile_money']
      },
      {
        type: 'mobile_money',
        provider: 'airtel',
        displayName: 'Airtel Money',
        icon: '📱',
        channels: ['mobile_money']
      },
      {
        type: 'card',
        provider: 'card',
        displayName: 'Debit/Credit Card',
        icon: '💳',
        channels: ['card']
      }
    ]
  },
  UG: {
    code: 'UG',
    name: 'Uganda',
    currency: 'UGX',
    currencySymbol: 'USh',
    exchangeRate: EXCHANGE_RATES.USD.UGX,
    paymentMethods: [
      {
        type: 'mobile_money',
        provider: 'mtn',
        displayName: 'MTN Mobile Money',
        icon: '📱',
        channels: ['mobile_money']
      },
      {
        type: 'mobile_money',
        provider: 'airtel',
        displayName: 'Airtel Money',
        icon: '📱',
        channels: ['mobile_money']
      },
      {
        type: 'card',
        provider: 'card',
        displayName: 'Debit/Credit Card',
        icon: '💳',
        channels: ['card']
      }
    ]
  },
  TZ: {
    code: 'TZ',
    name: 'Tanzania',
    currency: 'TZS',
    currencySymbol: 'TSh',
    exchangeRate: EXCHANGE_RATES.USD.TZS,
    paymentMethods: [
      {
        type: 'mobile_money',
        provider: 'tigopesa',
        displayName: 'TigoPesa',
        icon: '📱',
        channels: ['mobile_money']
      },
      {
        type: 'mobile_money',
        provider: 'airtel',
        displayName: 'Airtel Money',
        icon: '📱',
        channels: ['mobile_money']
      },
      {
        type: 'card',
        provider: 'card',
        displayName: 'Debit/Credit Card',
        icon: '💳',
        channels: ['card']
      }
    ]
  },
  OTHER: {
    code: 'KE', // Use Kenya for default processing but charge in USD
    name: 'International',
    currency: 'KES', // Paystack processes in KES for international cards
    currencySymbol: '$',
    exchangeRate: EXCHANGE_RATES.USD.KES,
    paymentMethods: [
      {
        type: 'card',
        provider: 'card',
        displayName: 'International Card',
        icon: '💳',
        channels: ['card']
      }
    ]
  }
};

// Subscription pricing in USD
export const SUBSCRIPTION_BASE_PRICES = {
  pro: {
    monthly: 1, // $1/month
    yearly: 10, // $10/year (2 months free)
  },
  premium: {
    monthly: 2, // $2/month - combines Pro + Premium features
    yearly: 20, // $20/year (4 months free)
  }
};

type PaystackMetadata = Record<string, unknown>;

function getPaystackMetadataString(meta: PaystackMetadata, key: string): string | undefined {
  const value = meta[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function getPaystackCustomFieldString(meta: PaystackMetadata, variableName: string): string | undefined {
  const raw = (meta as { custom_fields?: unknown }).custom_fields;
  if (!Array.isArray(raw)) return undefined;
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const vn = (entry as { variable_name?: unknown }).variable_name;
    if (vn !== variableName) continue;
    const value = (entry as { value?: unknown }).value;
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function extractPaystackMetaValue(meta: PaystackMetadata, keys: string[], customFieldNames: string[] = []): string | undefined {
  for (const key of keys) {
    const value = getPaystackMetadataString(meta, key);
    if (value) return value;
  }
  for (const variableName of customFieldNames) {
    const value = getPaystackCustomFieldString(meta, variableName);
    if (value) return value;
  }
  return undefined;
}

class PaystackService {
  private publicKey: string = '';
  private secretKey: string = '';
  private baseUrl: string = 'https://api.paystack.co';
  private initialized: boolean = false;

  constructor() {
    // CRITICAL FIX: Don't access ENV in constructor - causes crash before env is ready
    // Keys will be loaded on first use via ensureInitialized()
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      this.publicKey = ENV.PAYSTACK?.PUBLIC_KEY || '';
      this.secretKey = ENV.PAYSTACK?.SECRET_KEY || '';
      
      // Validate keys in production
      const isProduction = ENV.APP_ENV === 'production';
      if (isProduction) {
        // Check if test keys are being used in production
        const isTestPublicKey = this.publicKey.startsWith('pk_test_');
        const isTestSecretKey = this.secretKey.startsWith('sk_test_');
        
        if (isTestPublicKey || isTestSecretKey) {
          const errorMsg = `CRITICAL: Test Paystack keys detected in production! ` +
            `Public key: ${isTestPublicKey ? 'TEST KEY' : 'OK'}, ` +
            `Secret key: ${isTestSecretKey ? 'TEST KEY' : 'OK'}. ` +
            `Please use LIVE keys (pk_live_... and sk_live_...) for production.`;
          
          if (__DEV__) {
            console.error('[PaystackService]', errorMsg);
          }
          // In production, throw error to prevent using test keys
          throw new Error('Payment gateway configuration error: Test keys cannot be used in production. Please contact support.');
        }
        
        // Ensure live keys are being used
        if (!this.publicKey.startsWith('pk_live_') || !this.secretKey.startsWith('sk_live_')) {
          const errorMsg = 'Invalid Paystack keys for production. Keys must start with pk_live_ and sk_live_';
          if (__DEV__) {
            console.error('[PaystackService]', errorMsg);
          }
          throw new Error('Payment gateway configuration error. Please contact support.');
        }
      }
      
      // Validate keys are present
      if (!this.publicKey || !this.secretKey) {
        throw new Error('Paystack keys are not configured. Please contact support.');
      }
      
      this.initialized = true;
    }
  }

  /**
   * Get country configuration based on country code
   */
  getCountryConfig(countryCode: string): CountryConfig {
    return COUNTRY_CONFIGS[countryCode] || COUNTRY_CONFIGS['KE']; // Default to Kenya
  }

  /**
   * Convert USD to local currency
   */
  convertToLocalCurrency(
    usdAmount: number, 
    currency: 'KES' | 'UGX' | 'TZS'
  ): number {
    const rate = EXCHANGE_RATES.USD[currency];
    return Math.ceil(usdAmount * rate); // Round up to nearest whole number
  }

  /**
   * Format price with currency symbol
   */
  formatPrice(amount: number, currency: string): string {
    const country = Object.values(COUNTRY_CONFIGS).find(c => c.currency === currency);
    const symbol = country?.currencySymbol || currency;
    
    // Format with thousand separators
    const formatted = amount.toLocaleString('en-US');
    return `${symbol} ${formatted}`;
  }

  /**
   * Get subscription pricing for a specific country and tier
   */
  getSubscriptionPricing(
    tier: 'pro' | 'premium',
    billingCycle: 'monthly' | 'yearly',
    countryCode: string
  ): SubscriptionPricing {
    const country = this.getCountryConfig(countryCode);
    const usdPrice = SUBSCRIPTION_BASE_PRICES[tier][billingCycle];
    
    // For international users (OTHER), show USD price
    if (countryCode === 'OTHER') {
      return {
        tier,
        billingCycle,
        usdPrice,
        localPrice: usdPrice,
        currency: 'USD',
        formattedPrice: `$${usdPrice}`
      };
    }
    
    const localPrice = this.convertToLocalCurrency(usdPrice, country.currency);

    return {
      tier,
      billingCycle,
      usdPrice,
      localPrice,
      currency: country.currency,
      formattedPrice: this.formatPrice(localPrice, country.currency)
    };
  }

  /**
   * Initialize Paystack transaction with idempotency
   */
  async initializeTransaction(
    userId: string,
    email: string,
    tier: 'pro' | 'premium',
    billingCycle: 'monthly' | 'yearly',
    countryCode: string,
    paymentChannel?: string,
    extraMetadata?: Record<string, unknown>
  ): Promise<PaystackTransactionResponse> {
    this.ensureInitialized();
    const country = this.getCountryConfig(countryCode);
    const pricing = this.getSubscriptionPricing(tier, billingCycle, countryCode);
    
    // For international users (OTHER), convert USD to KES for Paystack processing
    let amountInSmallestUnit: number;
    let transactionCurrency: string;
    
    if (countryCode === 'OTHER') {
      // Convert USD to KES for Paystack (Paystack processes international cards in local currency)
      const amountInKES = this.convertToLocalCurrency(pricing.usdPrice, 'KES');
      amountInSmallestUnit = amountInKES * 100;
      transactionCurrency = 'KES';
    } else {
      // Convert to smallest currency unit (e.g., kobo, cents)
      amountInSmallestUnit = pricing.localPrice * 100;
      transactionCurrency = country.currency;
    }
    
    // Generate unique reference with timestamp and random component
    const reference = this.generateUniqueReference(userId, tier, billingCycle);
    
    // Generate idempotency key to prevent duplicate charges
    const idempotencyKey = `idempotency_${userId}_${tier}_${billingCycle}_${Date.now()}`;

    const productType =
      extraMetadata && typeof extraMetadata.productType === 'string' ? extraMetadata.productType : undefined;
    const featurePackage =
      extraMetadata && typeof extraMetadata.featurePackage === 'string'
        ? extraMetadata.featurePackage
        : undefined;
    
    const customFields: NonNullable<PaystackPaymentRequest['metadata']>['custom_fields'] = [
      {
        display_name: 'Subscription Plan',
        variable_name: 'subscription_plan',
        value: `${tier}_${billingCycle}`
      },
      {
        display_name: 'Display Currency',
        variable_name: 'display_currency',
        value: pricing.currency
      },
      {
        display_name: 'Display Amount',
        variable_name: 'display_amount',
        value: pricing.formattedPrice
      },
    ];
    
    if (productType) {
      customFields.push({
        display_name: 'Product Type',
        variable_name: 'product_type',
        value: productType,
      });
    }
    if (featurePackage) {
      customFields.push({
        display_name: 'Feature Package',
        variable_name: 'feature_package',
        value: featurePackage,
      });
    }
    
    const paymentRequest: PaystackPaymentRequest = {
      email,
      amount: amountInSmallestUnit,
      currency: transactionCurrency as 'KES' | 'UGX' | 'TZS' | 'NGN',
      reference,
      metadata: {
        userId,
        subscriptionTier: tier,
        billingCycle,
        country: countryCode,
        ...(extraMetadata || {}),
        custom_fields: customFields,
      },
      channels: paymentChannel ? paymentChannel.split(',') : undefined,
      callback_url: `${ENV.APP_URL}/subscription/success`
    };

    // Log the request for debugging (only in development)
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[PaystackService] Payment request:', {
        email,
        amount: amountInSmallestUnit,
        currency: transactionCurrency,
        reference,
        userId,
        tier,
        billingCycle,
        country: countryCode,
        hasSecretKey: !!this.secretKey,
        keyType: this.secretKey?.startsWith('sk_live_') ? 'LIVE' : this.secretKey?.startsWith('sk_test_') ? 'TEST' : 'UNKNOWN'
      });
    }

    // Initialize transaction with Paystack (with idempotency header)
    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey, // Prevent duplicate charges
      },
      body: JSON.stringify(paymentRequest),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      // eslint-disable-next-line no-console
      console.error('[PaystackService] Initialize transaction failed:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      
      // Try to parse the error response
      let errorMessage = `Paystack initialization failed: ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorBody);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // If parsing fails, use the default error message
      }
      
      throw new Error(errorMessage);
    }

    const result: PaystackTransactionResponse = await response.json();
    
    // Store transaction reference in database (non-blocking)
    // Don't fail the payment flow if database insert fails
    try {
      await this.storeTransactionReference(
        userId,
        reference,
        pricing,
        country.currency,
        tier,
        billingCycle,
        countryCode,
        extraMetadata
      );
    } catch (dbError) {
      // Log error but don't throw - payment was successfully initialized with Paystack
      // eslint-disable-next-line no-console
      console.error('[PaystackService] Failed to store transaction reference:', {
        error: dbError,
        reference,
        userId,
        tier,
        billingCycle,
        countryCode
      });
      // Continue with payment flow even if DB insert fails
      // Transaction can still be verified later via webhook or manual verification
    }

    return result;
  }

  /**
   * Verify Paystack transaction
   */
  async verifyTransaction(reference: string): Promise<PaystackVerificationResponse> {
    this.ensureInitialized();
    const response = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Paystack verification failed: ${response.statusText}`);
    }

    const result: PaystackVerificationResponse = await response.json();
    
    // Handle all transaction statuses
    if (result.status && result.data.status === 'success') {
      const rawMeta = result.data.metadata || {};
      const meta = rawMeta as Record<string, unknown>;
      let productType = extractPaystackMetaValue(
        meta,
        ['productType', 'product_type'],
        ['product_type']
      );
      let featurePackage = extractPaystackMetaValue(
        meta,
        ['featurePackage', 'feature_package'],
        ['feature_package']
      );

      // Fallback: if Paystack metadata does not include our fields,
      // use the locally-stored transaction metadata (set at initialization time).
      // This prevents misclassification of feature-package purchases as subscriptions.
      if (!productType || !featurePackage) {
        try {
          const { data: localTx } = await supabase
            .from('paystack_transactions')
            .select('metadata')
            .eq('reference', reference)
            .maybeSingle();

          const localMetaRaw = localTx?.metadata;
          const localMeta =
            localMetaRaw && typeof localMetaRaw === 'object' ? (localMetaRaw as PaystackMetadata) : {};

          productType =
            productType ??
            extractPaystackMetaValue(localMeta, ['productType', 'product_type'], ['product_type']);
          featurePackage =
            featurePackage ??
            extractPaystackMetaValue(localMeta, ['featurePackage', 'feature_package'], ['feature_package']);
        } catch {
          // Non-blocking
        }
      }
      
      // Entitlement/subscription activation is best-effort.
      // We MUST return the Paystack result to the caller regardless so onSuccess fires.
      // If activation fails, the user can be healed via reverifyPendingFeaturePackages.
      try {
        if (productType === 'datemi_feature_package' && featurePackage) {
          await this.activateDateMiFeaturePackage(reference, result.data, featurePackage);
        } else {
          await this.activateSubscription(reference, result.data);
        }
      } catch (activationError) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.error('[PaystackService] Activation failed (non-blocking):', activationError);
        }
      }
    } else if (result.data.status === 'failed' || result.data.status === 'abandoned') {
      await this.handleFailedTransaction(reference, result.data);
    }

    return result;
  }
  
  private async activateDateMiFeaturePackage(
    reference: string,
    transactionData: PaystackVerificationResponse['data'],
    featurePackage: string
  ) {
    // Resolve userId from local transaction record (preferred), falling back to Paystack metadata.
    let userId: string | null = null;
    try {
      const { data: transactionRow } = await supabase
        .from('paystack_transactions')
        .select('user_id')
        .eq('reference', reference)
        .single();
      if (transactionRow?.user_id) {
        userId = transactionRow.user_id as string;
      }
    } catch {
      // ignore
    }
    
    if (!userId) {
      const meta = (transactionData.metadata || {}) as Record<string, unknown>;
      const candidate = extractPaystackMetaValue(meta, ['userId', 'user_id'], ['user_id']) ?? null;
      userId = candidate;
    }
    
    if (!userId) {
      throw new Error('User not found for this transaction');
    }
    
    const normalizedFeature =
      featurePackage === 'messaging' || featurePackage === 'voice_call' || featurePackage === 'video_call'
        ? (featurePackage as 'messaging' | 'voice_call' | 'video_call')
        : null;
    
    if (!normalizedFeature) {
      throw new Error('Invalid feature package');
    }
    
    // Grant/extend entitlement (1 month).
    const entitlementResult = await dateMiFeatureEntitlementService.upsertMonthlyEntitlement({
      userId,
      feature: normalizedFeature,
      transactionReference: reference,
      source: 'paystack',
      metadata: {
        paystack_transaction_id: transactionData.id?.toString?.() || String(transactionData.id || ''),
        payment_channel: transactionData.channel,
        currency: transactionData.currency,
        amount_paid: transactionData.amount ? transactionData.amount / 100 : undefined,
      },
    });
    
    if (!entitlementResult.success) {
      throw new Error(entitlementResult.error || 'Failed to activate feature package');
    }
    
    // Mark transaction as completed (best-effort).
    try {
      await supabase
        .from('paystack_transactions')
        .update({
          status: 'completed',
          paystack_transaction_id: transactionData.id.toString(),
          paid_at: transactionData.paid_at,
          payment_channel: transactionData.channel,
        })
        .eq('reference', reference);
    } catch {
      // ignore
    }
  }

  /**
   * Re-verify any pending DateMi feature package transactions for the user.
   * Use when the user already paid but verification failed (e.g. table was missing).
   * Idempotent: safe to call on every access check.
   */
  async reverifyPendingFeaturePackages(userId: string): Promise<void> {
    if (!userId) return;
    try {
      const { data: rows, error } = await supabase
        .from('paystack_transactions')
        .select('reference, metadata, created_at, paid_at, status')
        .eq('user_id', userId)
        .in('status', ['pending', 'completed'])
        .order('created_at', { ascending: false })
        .limit(25);

      if (error || !rows?.length) return;

      // Avoid hitting Paystack if the entitlement is already active.
      let activeEntitlements: Set<'messaging' | 'voice_call' | 'video_call'> = new Set();
      try {
        activeEntitlements = await dateMiFeatureEntitlementService.getActiveEntitlements(userId);
      } catch {
        // Non-blocking
      }

      for (const row of rows) {
        const rawMeta = row.metadata;
        const meta = rawMeta && typeof rawMeta === 'object' ? (rawMeta as PaystackMetadata) : {};
        const productType = extractPaystackMetaValue(
          meta,
          ['productType', 'product_type'],
          ['product_type']
        );
        if (productType !== 'datemi_feature_package') continue;

        const pkg = extractPaystackMetaValue(
          meta,
          ['featurePackage', 'feature_package'],
          ['feature_package']
        );
        if (pkg !== 'messaging' && pkg !== 'voice_call' && pkg !== 'video_call') continue;

        if (activeEntitlements.has(pkg)) {
          continue;
        }

        // Safety: don't resurrect very old completed packages (likely expired).
        if (row.status === 'completed') {
          const paidAt =
            typeof row.paid_at === 'string'
              ? row.paid_at
              : typeof row.created_at === 'string'
                ? row.created_at
                : null;
          if (paidAt) {
            const paidMs = new Date(paidAt).getTime();
            const maxAgeMs = 45 * 24 * 60 * 60 * 1000;
            if (Number.isFinite(paidMs) && Date.now() - paidMs > maxAgeMs) {
              continue;
            }
          }
        }
        try {
          if (typeof row.reference === 'string' && row.reference.trim() !== '') {
            await this.verifyTransaction(row.reference);
            activeEntitlements.add(pkg);
          }
        } catch {
          // Ignore per-reference errors (e.g. Paystack not yet paid)
        }
      }
    } catch {
      // Non-blocking
    }
  }

  /**
   * Alias for initializeTransaction (backward compatibility)
   */
  async initializePayment(
    userId: string,
    email: string,
    tier: 'pro' | 'premium',
    billingCycle: 'monthly' | 'yearly',
    countryCode: string,
    paymentChannel?: string
  ): Promise<PaystackTransactionResponse> {
    return this.initializeTransaction(userId, email, tier, billingCycle, countryCode, paymentChannel);
  }

  /**
   * Alias for verifyTransaction (backward compatibility)
   */
  async verifyPayment(reference: string): Promise<PaystackVerificationResponse> {
    return this.verifyTransaction(reference);
  }

  /**
   * Store transaction reference in database
   */
  private async storeTransactionReference(
    userId: string,
    reference: string,
    pricing: SubscriptionPricing,
    currency: string,
    tier: string,
    billingCycle: string,
    countryCode: string,
    metadata?: Record<string, unknown>
  ) {
    try {
      // Check if Supabase is configured before making request
      const supabaseUrl = ENV.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl || supabaseUrl === '' || supabaseUrl.includes('demo')) {
        // eslint-disable-next-line no-console
        console.warn('[PaystackService] Supabase not configured - skipping database insert. Reference:', reference);
        return; // Don't throw - payment can still proceed
      }

      // Always include productType/featurePackage in stored metadata so recovery
      // (reverifyPendingFeaturePackages) can identify feature-package transactions
      // even if Paystack's returned metadata is stripped or reformatted.
      const storedMetadata: Record<string, unknown> = { ...(metadata ?? {}) };
      if (storedMetadata.productType || storedMetadata.featurePackage) {
        // Already present from caller -- ensure both keys are set for consistency.
        storedMetadata.productType = storedMetadata.productType ?? 'datemi_feature_package';
      }

      const { error, data } = await supabase
        .from('paystack_transactions')
        .insert({
          user_id: userId,
          reference,
          amount: pricing.localPrice,
          currency,
          tier,
          billing_cycle: billingCycle,
          country: countryCode,
          status: 'pending',
          metadata: storedMetadata as any,
        })
        .select();

      if (error) {
        // Provide detailed error information for debugging
        const errorDetails = {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          reference,
          userId,
          tier,
          billingCycle,
          countryCode,
          amount: pricing.localPrice,
          currency
        };
        
        // eslint-disable-next-line no-console
        console.error('[PaystackService] Database insert error:', errorDetails);
        
        // Check if it's a duplicate reference error (idempotency)
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          // eslint-disable-next-line no-console
          console.warn('[PaystackService] Duplicate reference detected (idempotency):', reference);
          // Don't throw for duplicate references - this is expected behavior
          return;
        }
        
        // Don't throw - log and continue (payment was successful with Paystack)
        // eslint-disable-next-line no-console
        console.warn('[PaystackService] Failed to store transaction reference, but payment was successful:', reference);
        return;
      }
      
      // Log successful insert in development
      if (__DEV__ && data) {
        // eslint-disable-next-line no-console
        console.log('[PaystackService] Transaction reference stored:', reference);
      }
    } catch (networkError: unknown) {
      // Catch network errors (like "Network request failed")
      const errorMessage = networkError instanceof Error ? networkError.message : String(networkError);
      
      // eslint-disable-next-line no-console
      console.warn('[PaystackService] Network error storing transaction reference:', {
        error: errorMessage,
        reference,
        note: 'Payment was successful with Paystack. Transaction can be verified later via webhook.'
      });
      
      // Don't throw - payment was successful, database insert can be retried later
      // The webhook handler will create the transaction record when payment completes
    }
  }

  /**
   * Handle failed or abandoned transactions
   */
  private async handleFailedTransaction(
    reference: string,
    transactionData: PaystackVerificationResponse['data']
  ) {
    try {
      // Get transaction details
      const { data: transaction } = await supabase
        .from('paystack_transactions')
        .select('*')
        .eq('reference', reference)
        .single();

      await supabase
        .from('paystack_transactions')
        .update({
          status: transactionData.status === 'failed' ? 'failed' : 'abandoned',
          paystack_transaction_id: transactionData.id.toString(),
          updated_at: new Date().toISOString()
        })
        .eq('reference', reference);

      // Send payment failed notification (non-blocking)
      if (transaction?.user_id) {
        const reason = transactionData.gateway_response || 'Payment could not be processed';
        transactionalNotificationService.sendPaymentFailed(
          transaction.user_id as string,
          reason
        ).catch(() => {});
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[PaystackService] Failed to update failed transaction:', error);
    }
  }

  /**
   * Activate subscription after successful payment
   */
  private async activateSubscription(
    reference: string,
    transactionData: PaystackVerificationResponse['data']
  ) {
    // Get transaction details from database
    const { data: transaction, error: txError } = await supabase
      .from('paystack_transactions')
      .select('*')
      .eq('reference', reference)
      .single();

    if (txError || !transaction) {
      throw new Error('Transaction not found');
    }

    // Deactivate existing active subscriptions first to prevent duplicates.
    // Include legacy trialing rows to avoid stale state collisions.
    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', transaction.user_id)
      .in('status', ['active', 'trialing']);

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    
    const billingCycle = (transaction.billing_cycle as string) || 'monthly';
    if (billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Create subscription record
    const { data: createdSubscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: transaction.user_id,
        tier: transaction.tier,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        payment_method: 'paystack',
        payment_channel: transactionData.channel,
        transaction_id: reference,
        amount_paid: transactionData.amount / 100, // Convert from smallest unit
        currency: transactionData.currency,
        // Use country_code column (matches subscriptions schema)
        country_code: transaction.country,
        auto_renew: true
      })
      .select('id')
      .single();

    if (subError) throw subError;

    await (supabase as any).rpc('convert_trial_to_paid', {
      p_user_id: transaction.user_id,
      p_subscription_id: createdSubscription?.id ?? null,
    });

    // Update transaction status
    await supabase
      .from('paystack_transactions')
      .update({
        status: 'completed',
        paystack_transaction_id: transactionData.id.toString(),
        paid_at: transactionData.paid_at
      })
      .eq('reference', reference);

    // Subscription tier is now computed from date_mi_profiles_with_tier view
    // No need to update date_mi_profiles table directly

    // Send transactional notifications (non-blocking)
    const userId = transaction.user_id as string;
    const tier = transaction.tier as string;
    const amount = transactionData.amount / 100;
    const currency = transactionData.currency;

    Promise.all([
      // Payment success notification
      transactionalNotificationService.sendPaymentSuccess(
        userId,
        amount,
        currency,
        reference,
        {
          tier,
          billingCycle,
          paymentChannel: transactionData.channel,
        }
      ),
      // Subscription activated notification
      transactionalNotificationService.sendSubscriptionActivated(
        userId,
        tier,
        {
          billingCycle,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          amount,
          currency,
        }
      ),
    ]).catch((error) => {
      if (__DEV__) {
        console.error('[PaystackService] Failed to send transaction notifications:', error);
      }
    });

    entitlementService.invalidateUser(userId);
  }

  /**
   * Get available payment methods for a country
   */
  getPaymentMethods(countryCode: string): PaymentMethodConfig[] {
    const country = this.getCountryConfig(countryCode);
    return country.paymentMethods;
  }

  /**
   * Format subscription features for display
   */
  getSubscriptionFeatures(tier: 'pro' | 'premium'): string[] {
    const features = {
      pro: [
        '✅ Unlimited messaging',
        '✅ See who liked you',
        '✅ Advanced search filters',
        '✅ No ads',
        '✅ Priority matching',
      ],
      premium: [
        '✅ All Pro features',
        '✅ Unlimited messaging & chat',
        '✅ Unlimited voice calls',
        '✅ Unlimited video calls',
        '✅ Unlimited likes & super likes',
        '✅ Advanced analytics',
        '✅ Priority support',
        '✅ Early access to new features',
      ]
    };

    return features[tier];
  }

  /**
   * Handle webhook from Paystack
   * 
   * WARNING: Webhook handling should be implemented on your backend/server for security.
   * The Node.js 'crypto' module is not available in React Native.
   * Use a backend API endpoint to handle Paystack webhooks instead.
   * 
   * @deprecated Use backend webhook endpoint for production
   */
  async handleWebhook(_signature: string, payload: Record<string, unknown>): Promise<void> {
    // NOTE: Skipping signature verification in React Native
    // Webhook signature verification MUST be done on the backend/server
    // eslint-disable-next-line no-console
    console.warn('Webhook handling should be done on the backend for security');

    // Process webhook event (only for development/testing)
    const event = payload.event as string;
    switch (event) {
      case 'charge.success':
        await this.verifyTransaction((payload.data as { reference: string }).reference);
        break;
      
      case 'subscription.create':
      case 'subscription.enable':
        // Handle subscription creation/enablement
        break;
      
      case 'subscription.disable':
        // Handle subscription cancellation
        await this.handleSubscriptionCancellation(payload.data as Record<string, unknown>);
        break;
      
      default:
        // Unhandled webhook event
    }
  }

  /**
   * Handle subscription cancellation
   */
  private async handleSubscriptionCancellation(data: Record<string, unknown>) {
    const subscriptionCode = String(data.subscription_code || '');
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        auto_renew: false,
        cancelled_at: new Date().toISOString()
      })
      .eq('paystack_subscription_code', subscriptionCode);

    if (error) throw error;
  }

  /**
   * Get current subscription for a user
   */
  async getCurrentSubscription(userId: string): Promise<{
    id: string;
    tier: string;
    status: string;
    billingCycle: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    createdAt: string;
    updatedAt: string;
  } | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      tier: data.tier,
      status: data.status,
      billingCycle: ((data as { billing_cycle?: string }).billing_cycle || data.tier || 'monthly') as string,
      currentPeriodEnd: data.end_date as string,
      cancelAtPeriodEnd: !data.auto_renew,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string
    };
  }

  /**
   * Get user entitlements based on subscription
   */
  async getUserEntitlements(userId: string): Promise<{
    tier: string;
    canSendMessages: number;
    canViewProfiles: number;
    canUseAdvancedFilters: boolean;
    canSeeWhoLikedYou: boolean;
    canUseVoiceCall: boolean;
    canUseVideoCall: boolean;
    hasAds: boolean;
    hasPriorityMatching: boolean;
    hasPremiumBadge?: boolean;
    hasFeaturedProfile?: boolean;
    hasContentCreation?: boolean;
    hasMonetizationTools?: boolean;
    hasEscrowPayments?: boolean;
  }> {
    const subscription = await this.getCurrentSubscription(userId);
    
    if (!subscription) {
      return {
        tier: 'free',
        canSendMessages: 5,
        canViewProfiles: 10,
        canUseAdvancedFilters: false,
        canSeeWhoLikedYou: false,
        canUseVoiceCall: false,
        canUseVideoCall: false,
        hasAds: true,
        hasPriorityMatching: false
      };
    }

    const entitlements = {
      pro: {
        tier: 'pro',
        canSendMessages: -1, // unlimited
        canViewProfiles: -1,
        canUseAdvancedFilters: true,
        canSeeWhoLikedYou: true,
        canUseVoiceCall: false,
        canUseVideoCall: false,
        hasAds: false,
        hasPriorityMatching: true
      },
      premium: {
        tier: 'premium',
        canSendMessages: -1,
        canViewProfiles: -1,
        canUseAdvancedFilters: true,
        canSeeWhoLikedYou: true,
        canUseVoiceCall: true,
        canUseVideoCall: true,
        hasAds: false,
        hasPriorityMatching: true,
        hasPremiumBadge: true,
        hasFeaturedProfile: true,
        hasContentCreation: true,
        hasMonetizationTools: true,
        hasEscrowPayments: true
      }
    };

    return entitlements[subscription.tier as keyof typeof entitlements] || entitlements.pro;
  }

  /**
   * Create checkout session (returns Paystack payment URL)
   */
  async createCheckoutSession(request: {
    userId: string;
    tier: 'pro' | 'premium';
    billingCycle: 'monthly' | 'yearly';
    email: string;
    country: string;
  }): Promise<{
    url: string;
    sessionId: string;
    reference: string;
  }> {
    const { userId, tier, billingCycle, email, country } = request;
    
    const transaction = await this.initializeTransaction(
      userId,
      email,
      tier,
      billingCycle,
      country,
      'card'
    );

    return {
      url: transaction.data.authorization_url,
      sessionId: transaction.data.access_code,
      reference: transaction.data.reference
    };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        auto_renew: false,
        cancelled_at: new Date().toISOString()
      })
      .eq('id', subscriptionId);

    if (error) throw error;
  }

  /**
   * Get billing history for a user
   */
  async getBillingHistory(userId: string): Promise<Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    date: string;
    description: string;
    tier: string;
    billingCycle: string;
  }>> {
    const { data, error } = await supabase
      .from('paystack_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return [];
    }

    return (data || []).map((transaction) => ({
      id: transaction.id as string,
      amount: transaction.amount as number,
      currency: transaction.currency as string,
      status: transaction.status as string,
      date: (transaction.paid_at as string) || (transaction.created_at as string),
      description: `${transaction.tier as string} - ${transaction.billing_cycle as string}`,
      tier: transaction.tier as string,
      billingCycle: transaction.billing_cycle as string
    }));
  }

  /**
   * Check if subscription is expired and needs renewal
   */
  async checkSubscriptionExpiry(userId: string): Promise<{
    isExpired: boolean;
    daysUntilExpiry?: number;
    subscription?: {
      id: string;
      tier: string;
      status: string;
      billingCycle: string;
      currentPeriodEnd: string;
      cancelAtPeriodEnd: boolean;
      createdAt: string;
      updatedAt: string;
    };
  }> {
    const subscription = await this.getCurrentSubscription(userId);
    
    if (!subscription) {
      return { isExpired: true };
    }

    const now = new Date();
    const endDate = new Date(subscription.currentPeriodEnd);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      isExpired: now > endDate,
      daysUntilExpiry: daysUntilExpiry > 0 ? daysUntilExpiry : 0,
      subscription
    };
  }

  /**
   * Upgrade subscription (e.g., from Pro to Premium)
   */
  async upgradeSubscription(
    userId: string,
    email: string,
    newTier: 'pro' | 'premium',
    countryCode: string
  ): Promise<{
    success: boolean;
    checkoutUrl?: string;
    error?: string;
  }> {
    try {
      const currentSub = await this.getCurrentSubscription(userId);
      
      if (!currentSub) {
        return {
          success: false,
          error: 'No active subscription found'
        };
      }

      // Prevent downgrade
      if (currentSub.tier === 'premium' && newTier === 'pro') {
        return {
          success: false,
          error: 'Cannot downgrade from Premium to Pro'
        };
      }

      // Calculate prorated amount if needed
      const billingCycle = (currentSub.billingCycle || 'monthly') as 'monthly' | 'yearly';
      
      // Initialize new transaction for upgrade
      const result = await this.initializeTransaction(
        userId,
        email,
        newTier,
        billingCycle,
        countryCode
      );

      if (result.status) {
        // Mark old subscription as upgraded
        await supabase
          .from('subscriptions')
          .update({
            status: 'upgraded',
            updated_at: new Date().toISOString()
          })
          .eq('id', currentSub.id);

        return {
          success: true,
          checkoutUrl: result.data.authorization_url
        };
      }

      return {
        success: false,
        error: result.message
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upgrade failed'
      };
    }
  }

  /**
   * Renew expired subscription
   */
  async renewSubscription(
    userId: string,
    email: string,
    countryCode: string
  ): Promise<{
    success: boolean;
    checkoutUrl?: string;
    error?: string;
  }> {
    try {
      // Get the last subscription to determine tier and billing cycle
      const { data: lastSub, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !lastSub) {
        return {
          success: false,
          error: 'No previous subscription found'
        };
      }

      const tier = lastSub.tier as 'pro' | 'premium';
      const billingCycle = (((lastSub as { billing_cycle?: string }).billing_cycle || 'monthly') as string) as 'monthly' | 'yearly';

      // Initialize new transaction for renewal
      const result = await this.initializeTransaction(
        userId,
        email,
        tier,
        billingCycle,
        countryCode
      );

      if (result.status) {
        return {
          success: true,
          checkoutUrl: result.data.authorization_url
        };
      }

      return {
        success: false,
        error: result.message
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Renewal failed'
      };
    }
  }

  /**
   * Get pricing (alias for backward compatibility)
   */
  getPricing(
    tier: 'pro' | 'premium',
    billingCycle: 'monthly' | 'yearly',
    country: string
  ): SubscriptionPricing {
    return this.getSubscriptionPricing(tier, billingCycle, country);
  }

  /**
   * Generate unique reference with improved uniqueness
   */
  generateReference(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Generate unique reference for subscription transactions
   */
  private generateUniqueReference(
    userId: string, 
    tier: string, 
    billingCycle: string
  ): string {
    const timestamp = Date.now();
    // Generate additional random components for uniqueness (React Native compatible)
    const microTimestamp = Math.random().toString(36).substring(2, 10);
    const random = Math.random().toString(36).substring(2, 15);
    const extraRandom = Math.floor(Math.random() * 1000000);
    const userShort = userId.substring(0, 8);
    return `sub_${userShort}_${tier}_${billingCycle}_${timestamp}_${microTimestamp}_${random}_${extraRandom}`;
  }
  
  /**
   * Verify Paystack webhook signature
   * 
   * IMPORTANT: This method cannot be used in React Native as the Node.js 'crypto' module
   * is not available. Webhook signature verification MUST be implemented on your backend/server.
   * 
   * For production use:
   * 1. Set up a backend endpoint (e.g., /api/webhooks/paystack)
   * 2. Implement HMAC-SHA512 verification server-side using Node.js crypto
   * 3. Forward validated events to your React Native app via your API
   * 
   * @deprecated Use backend webhook endpoint instead
   */
  verifyWebhookSignature(_payload: string, _signature: string): boolean {
    // Node.js 'crypto' module is not available in React Native
    // eslint-disable-next-line no-console
    console.warn(
      'verifyWebhookSignature: Webhook verification must be done on the backend. ' +
      'This method is not functional in React Native.'
    );
    return false; // Always return false to prevent unsafe usage
  }
  
  /**
   * Process webhook event safely
   */
  async processWebhook(
    event: string,
    data: Record<string, unknown>,
    signature: string,
    rawBody: string
  ): Promise<{ success: boolean; message?: string }> {
    // Verify webhook signature first
    if (!this.verifyWebhookSignature(rawBody, signature)) {
      return { success: false, message: 'Invalid signature' };
    }
    
    // Process verified webhook events
    switch (event) {
      case 'charge.success':
        // Handle successful charge
        return await this.handleSuccessfulCharge(data);
      
      case 'subscription.create':
      case 'subscription.not_renew':
      case 'subscription.disable':
        // Handle subscription events
        return { success: true };
      
      default:
        return { success: true, message: 'Event received but not processed' };
    }
  }
  
  /**
   * Handle successful charge from webhook
   */
  private async handleSuccessfulCharge(data: Record<string, unknown>): Promise<{ success: boolean }> {
    try {
      // Verify transaction again
      const verification = await this.verifyTransaction(data.reference as string);
      
      if (verification.status && verification.data.status === 'success') {
        return { success: true };
      }
      
      return { success: false };
    } catch {
      return { success: false };
    }
  }
}

let instance: PaystackService | null = null;
function getInstance(): PaystackService {
  if (!instance) instance = new PaystackService();
  return instance;
}

export const paystackService = new Proxy({} as PaystackService, {
  get(target, prop) {
    const service = getInstance();
    const value = (service as any)[prop];
    return typeof value === 'function' ? value.bind(service) : value;
  }
});

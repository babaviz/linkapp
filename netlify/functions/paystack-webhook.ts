/**
 * Paystack Webhook Handler for Netlify Functions
 * 
 * This function handles Paystack webhook events securely with signature verification.
 * 
 * Webhook URL: https://link-app.co/.netlify/functions/paystack-webhook
 * 
 * Configure this URL in Paystack Dashboard → Settings → Webhooks
 */

 
// @ts-ignore - Netlify functions types
import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import crypto from 'crypto';

// Type for Supabase client (using require, so we need to type it)
// Using a more flexible type that matches Supabase's actual API structure
type SupabaseSelectBuilder = {
  eq: (column: string, value: unknown) => SupabaseSelectBuilder;
  single: () => Promise<{ data: unknown; error: unknown }>;
};

type SupabaseUpdateBuilder = {
  eq: (column: string, value: unknown) => Promise<{ error: unknown }>;
};

type SupabaseClient = {
  from: (table: string) => {
    select: (columns?: string) => SupabaseSelectBuilder;
    update: (data: Record<string, unknown>) => SupabaseUpdateBuilder;
    insert: (data: Record<string, unknown>) => Promise<{ error: unknown }>;
  };
  rpc: (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

// Database transaction type
interface DatabaseTransaction {
  user_id: string;
  tier: string;
  billing_cycle?: string;
  country?: string;
  reference: string;
  [key: string]: unknown;
}

// Paystack transaction data type
interface PaystackTransactionData {
  id: number | string;
  status: string;
  reference: string;
  amount: number;
  currency: string;
  channel?: string;
  paid_at?: string;
}

// Paystack webhook event data types
interface PaystackWebhookData {
  reference?: string;
  id?: number | string;
  subscription_code?: string;
}

// Initialize Supabase client with service role
function createSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration');
  }

  // Create Supabase client - using dynamic import for serverless environment
  const { createClient } = require('@supabase/supabase-js') as { createClient: (url: string, key: string, options: unknown) => SupabaseClient };
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }) as SupabaseClient;
}

// Verify Paystack webhook signature
function verifyPaystackSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }

  // Paystack signs payload with HMAC-SHA512
  const hash = crypto
    .createHmac('sha512', secret)
    .update(payload)
    .digest('hex');

  return hash === signature;
}

// Handle successful charge
async function handleSuccessfulCharge(data: PaystackWebhookData, supabase: SupabaseClient) {
  const reference = data.reference;
  
  if (!reference) {
    throw new Error('Missing reference in charge.success event');
  }

    // Verify transaction with Paystack API
    const verification = await verifyTransactionWithPaystack(reference);
    
    if (verification.status && verification.data.status === 'success') {
      // Activate subscription
      await activateSubscription(reference, verification.data, supabase);
      
      // Log only in development or for critical errors
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log(`[Webhook] Subscription activated for reference: ${reference}`);
      }
      return { success: true, message: 'Subscription activated' };
    }

  return { success: false, message: 'Transaction verification failed' };
}

// Handle failed charge
async function handleFailedCharge(data: PaystackWebhookData, supabase: SupabaseClient) {
  const reference = data.reference;
  
  if (!reference) {
    throw new Error('Missing reference in charge.failed event');
  }

  // Update transaction status to failed
  const { error } = await supabase
    .from('paystack_transactions')
    .update({
      status: 'failed',
      paystack_transaction_id: data.id?.toString(),
      updated_at: new Date().toISOString()
    })
    .eq('reference', reference);

  if (error) {
    // Always log errors for monitoring
    // eslint-disable-next-line no-console
    console.error('[Webhook] Failed to update transaction:', error);
    throw error;
  }

  // Log only in development
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`[Webhook] Transaction marked as failed: ${reference}`);
  }
  return { success: true, message: 'Transaction marked as failed' };
}

// Handle subscription disable/cancellation
async function handleSubscriptionDisable(data: PaystackWebhookData, supabase: SupabaseClient) {
  const subscriptionCode = data.subscription_code;
  
  if (!subscriptionCode) {
    throw new Error('Missing subscription_code in disable event');
  }

  // Cancel subscription in database
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      auto_renew: false,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('paystack_subscription_code', subscriptionCode);

  if (error) {
    // Always log errors for monitoring
    // eslint-disable-next-line no-console
    console.error('[Webhook] Failed to cancel subscription:', error);
    throw error;
  }

  // Log only in development
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`[Webhook] Subscription cancelled: ${subscriptionCode}`);
  }
  return { success: true, message: 'Subscription cancelled' };
}

// Verify transaction with Paystack API
async function verifyTransactionWithPaystack(reference: string) {
  const secret = process.env.PAYSTACK_SECRET_KEY || process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY;
  
  if (!secret) {
    throw new Error('Paystack secret key not configured');
  }

  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${secret}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Paystack verification failed: ${response.statusText}`);
  }

  return await response.json();
}

// Activate subscription (same logic as in paystackService.ts)
async function activateSubscription(
  reference: string,
  transactionData: PaystackTransactionData,
  supabase: SupabaseClient
) {
  // Get transaction from database
  const { data: dbTransaction, error: txError } = await supabase
    .from('paystack_transactions')
    .select('*')
    .eq('reference', reference)
    .single();

  if (txError || !dbTransaction) {
    throw new Error('Transaction not found');
  }

  // Type assertion for transaction data
  const transaction = dbTransaction as unknown as DatabaseTransaction;

  // Deactivate existing subscriptions
  const deactivateResult = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', transaction.user_id);
  
  // Chain second eq call
  if (deactivateResult && 'eq' in deactivateResult) {
    await (deactivateResult as { eq: (col: string, val: unknown) => Promise<{ error: unknown }> }).eq('status', 'active');
  }

  // Calculate subscription dates
  const startDate = new Date();
  const endDate = new Date();
  
  const billingCycle = transaction.billing_cycle || 'monthly';
  if (billingCycle === 'yearly') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  // Create new subscription
  const { error: subError } = await supabase
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
      amount_paid: transactionData.amount / 100,
      currency: transactionData.currency,
      auto_renew: true
    });

  if (subError) throw subError;

  // Trial users who subscribe should be converted immediately.
  await supabase.rpc('convert_trial_to_paid', {
    p_user_id: transaction.user_id,
    p_subscription_id: null,
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

  // Update user profile
  await supabase
    .from('date_mi_profiles')
    .update({ 
      subscription_tier: transaction.tier,
      subscription_country: transaction.country
    })
    .eq('user_id', transaction.user_id);

  // Insert transactional notifications into notification_history
  // (These will be delivered via push when the app is running)
  const userId = transaction.user_id;
  const tier = transaction.tier;
  const amount = transactionData.amount / 100;
  const currency = transactionData.currency;

  try {
    await Promise.all([
      // Payment success notification
      supabase.from('notification_history').insert({
        user_id: userId,
        title: 'Payment Successful',
        body: `Your payment of ${amount} ${currency} was processed successfully. Receipt: ${reference}`,
        category: 'payment',
        data: {
          type: 'payment_success',
          transactional: true,
          amount,
          currency,
          reference,
          tier,
          billingCycle,
        },
        status: 'sent',
        sent_at: new Date().toISOString(),
      }),
      // Subscription activated notification
      supabase.from('notification_history').insert({
        user_id: userId,
        title: 'Subscription Activated! 🎉',
        body: `Welcome to ${tier}! Your subscription is now active and all features are unlocked.`,
        category: 'payment',
        data: {
          type: 'subscription_activated',
          transactional: true,
          tier,
          billingCycle,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          amount,
          currency,
        },
        status: 'sent',
        sent_at: new Date().toISOString(),
      }),
    ]);
  } catch (notificationError) {
    // Log error but don't fail the subscription activation
    // eslint-disable-next-line no-console
    console.error('[Webhook] Failed to create notification records:', notificationError);
  }
}

// Log webhook event for audit
async function logWebhookEvent(event: string, data: PaystackWebhookData, supabase: SupabaseClient) {
  try {
    await supabase
      .from('webhook_events')
      .insert({
        provider: 'paystack',
        event_type: event,
        event_id: data.id?.toString() || data.reference || null,
        payload: data,
        processed: false,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    // Always log errors for monitoring
    // eslint-disable-next-line no-console
    console.error('[Webhook] Failed to log event:', error);
  }
}

// Main handler
export const handler: Handler = async (
  event: HandlerEvent,
  _context: HandlerContext
) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get signature from headers
    const signature = event.headers['x-paystack-signature'] || event.headers['X-Paystack-Signature'];
    const secret = process.env.PAYSTACK_SECRET_KEY || process.env.EXPO_PUBLIC_PAYSTACK_SECRET_KEY;

    if (!signature || !secret) {
      // eslint-disable-next-line no-console
      console.error('[Webhook] Missing signature or secret key');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized - missing signature or secret' })
      };
    }

    // Get raw body for signature verification
    // Netlify provides rawBody in the event for signature verification
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawBody = (event as any).rawBody || event.body || '';
    const bodyString = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
    
    // Verify signature
    const isValid = verifyPaystackSignature(bodyString, signature, secret);
    
    if (!isValid) {
      // eslint-disable-next-line no-console
      console.error('[Webhook] Invalid signature');
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid signature' })
      };
    }

    // Parse webhook payload
    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const eventType = payload.event;
    const data = payload.data;

    // Initialize Supabase admin client
    const supabase = createSupabaseAdmin();

    // Log webhook event
    await logWebhookEvent(eventType, data, supabase);

    // Process webhook based on event type
    let result;
    switch (eventType) {
      case 'charge.success':
        result = await handleSuccessfulCharge(data, supabase);
        break;

      case 'charge.failed':
        result = await handleFailedCharge(data, supabase);
        break;

      case 'subscription.create':
        // Log subscription creation only in development
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log(`[Webhook] Subscription created: ${data.subscription_code}`);
        }
        result = { success: true, message: 'Subscription creation logged' };
        break;

      case 'subscription.disable':
      case 'subscription.not_renew':
        result = await handleSubscriptionDisable(data, supabase);
        break;

      default:
        // Log unhandled events only in development
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log(`[Webhook] Unhandled event: ${eventType}`);
        }
        result = { success: true, message: 'Event received but not processed' };
    }

    // Always return 200 to acknowledge receipt (even if processing failed)
    // This prevents Paystack from retrying indefinitely
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        received: true,
        event: eventType,
        ...result
      })
    };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('[Webhook] Processing error:', error);
    
    // Still return 200 to prevent Paystack retries
    // Log error for manual review
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        received: true,
        error: 'Processing failed',
        message: error.message
      })
    };
  }
};


-- Migration: Add Paystack Integration Tables
-- Description: Tables for managing Paystack payments and multi-country subscriptions

-- Add country and currency fields to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS payment_channel VARCHAR(50),
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3),
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);

-- Create paystack_transactions table
CREATE TABLE IF NOT EXISTS paystack_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    reference VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    country VARCHAR(2) NOT NULL,
    tier VARCHAR(50) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    paystack_transaction_id VARCHAR(100),
    payment_channel VARCHAR(50),
    paid_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_paystack_transactions_user_id ON paystack_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_paystack_transactions_reference ON paystack_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_paystack_transactions_status ON paystack_transactions(status);

-- Add subscription_country to date_mi_profiles
ALTER TABLE date_mi_profiles
ADD COLUMN IF NOT EXISTS subscription_country VARCHAR(2) DEFAULT 'KE';

-- Create payment_methods_extended table for multi-country support
CREATE TABLE IF NOT EXISTS payment_methods_extended (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    country_code VARCHAR(2) NOT NULL,
    payment_type VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    account_info JSONB,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create webhook_events table for Paystack webhook handling
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL, -- 'paystack', 'stripe', etc.
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255) UNIQUE,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for webhook events
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);

-- Create subscription_pricing table for country-specific pricing
CREATE TABLE IF NOT EXISTS subscription_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier VARCHAR(50) NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    monthly_price DECIMAL(10, 2) NOT NULL,
    yearly_price DECIMAL(10, 2) NOT NULL,
    exchange_rate DECIMAL(10, 4),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tier, country_code)
);

-- Insert default pricing for each country
INSERT INTO subscription_pricing (tier, country_code, currency, monthly_price, yearly_price, exchange_rate)
VALUES 
    -- Kenya (KES)
    ('pro', 'KE', 'KES', 135, 1350, 135.00),
    ('premium', 'KE', 'KES', 270, 2700, 135.00),
    -- Uganda (UGX)
    ('pro', 'UG', 'UGX', 3750, 37500, 3750.00),
    ('premium', 'UG', 'UGX', 7500, 75000, 3750.00),
    -- Tanzania (TZS)
    ('pro', 'TZ', 'TZS', 2500, 25000, 2500.00),
    ('premium', 'TZ', 'TZS', 5000, 50000, 2500.00)
ON CONFLICT (tier, country_code) DO UPDATE
SET 
    monthly_price = EXCLUDED.monthly_price,
    yearly_price = EXCLUDED.yearly_price,
    exchange_rate = EXCLUDED.exchange_rate,
    updated_at = NOW();

-- Create function to verify Paystack payment
CREATE OR REPLACE FUNCTION verify_paystack_payment(
    p_reference VARCHAR,
    p_transaction_id VARCHAR,
    p_status VARCHAR,
    p_paid_at TIMESTAMP WITH TIME ZONE,
    p_channel VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_transaction_id UUID;
    v_user_id UUID;
    v_tier VARCHAR;
    v_billing_cycle VARCHAR;
    v_amount DECIMAL;
    v_currency VARCHAR;
BEGIN
    -- Get transaction details
    SELECT id, user_id, tier, billing_cycle, amount, currency
    INTO v_transaction_id, v_user_id, v_tier, v_billing_cycle, v_amount, v_currency
    FROM paystack_transactions
    WHERE reference = p_reference;

    IF v_transaction_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Update transaction status
    UPDATE paystack_transactions
    SET 
        status = p_status,
        paystack_transaction_id = p_transaction_id,
        payment_channel = p_channel,
        paid_at = p_paid_at,
        updated_at = NOW()
    WHERE reference = p_reference;

    -- If payment successful, activate subscription
    IF p_status = 'completed' OR p_status = 'success' THEN
        -- Calculate subscription dates
        DECLARE
            v_start_date TIMESTAMP WITH TIME ZONE := NOW();
            v_end_date TIMESTAMP WITH TIME ZONE;
        BEGIN
            IF v_billing_cycle = 'yearly' THEN
                v_end_date := v_start_date + INTERVAL '1 year';
            ELSE
                v_end_date := v_start_date + INTERVAL '1 month';
            END IF;

            -- Deactivate existing subscriptions
            UPDATE subscriptions
            SET status = 'cancelled', updated_at = NOW()
            WHERE user_id = v_user_id AND status = 'active';

            -- Create new subscription
            INSERT INTO subscriptions (
                user_id, tier, status, start_date, end_date,
                payment_method, payment_channel, transaction_id,
                amount_paid, currency, auto_renew, created_at
            ) VALUES (
                v_user_id, v_tier, 'active', v_start_date, v_end_date,
                'paystack', p_channel, p_reference,
                v_amount, v_currency, true, NOW()
            );

            -- Update user's subscription tier
            UPDATE date_mi_profiles
            SET subscription_tier = v_tier
            WHERE user_id = v_user_id;
        END;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle subscription renewal
CREATE OR REPLACE FUNCTION process_subscription_renewal(
    p_subscription_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_subscription RECORD;
    v_new_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get subscription details
    SELECT * INTO v_subscription
    FROM subscriptions
    WHERE id = p_subscription_id AND auto_renew = true;

    IF v_subscription IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Calculate new end date
    IF v_subscription.tier LIKE '%yearly%' THEN
        v_new_end_date := v_subscription.end_date + INTERVAL '1 year';
    ELSE
        v_new_end_date := v_subscription.end_date + INTERVAL '1 month';
    END IF;

    -- Update subscription
    UPDATE subscriptions
    SET 
        end_date = v_new_end_date,
        updated_at = NOW()
    WHERE id = p_subscription_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies
ALTER TABLE paystack_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods_extended ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_pricing ENABLE ROW LEVEL SECURITY;

-- Policies for paystack_transactions
CREATE POLICY "Users can view their own transactions" ON paystack_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all transactions" ON paystack_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- Policies for payment_methods_extended
CREATE POLICY "Users can view their own payment methods" ON payment_methods_extended
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods" ON payment_methods_extended
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods" ON payment_methods_extended
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods" ON payment_methods_extended
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for subscription_pricing (read-only for all authenticated users)
CREATE POLICY "All users can view pricing" ON subscription_pricing
    FOR SELECT USING (true);

-- Webhook events are service-only
CREATE POLICY "Service role can manage webhook events" ON webhook_events
    FOR ALL USING (auth.role() = 'service_role');
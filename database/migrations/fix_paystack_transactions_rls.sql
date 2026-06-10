-- Migration: Fix Paystack Transactions RLS Policy
-- Description: Add INSERT policy for authenticated users to create their own transaction records
-- Issue: Users were getting "new row violates row-level security policy" when attempting to upgrade

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view their own transactions" ON paystack_transactions;
DROP POLICY IF EXISTS "Service role can manage all transactions" ON paystack_transactions;

-- Allow users to view their own transactions
CREATE POLICY "Users can view their own transactions" ON paystack_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own transactions (required for initializeTransaction)
CREATE POLICY "Users can insert their own transactions" ON paystack_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow service role to manage all transactions (for webhook processing)
CREATE POLICY "Service role can manage all transactions" ON paystack_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to update their own pending transactions
-- This is needed for payment verification flow
CREATE POLICY "Users can update their own transactions" ON paystack_transactions
    FOR UPDATE USING (auth.uid() = user_id);

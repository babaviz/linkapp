-- Migration: Add Missing Moderation and Paystack Tables
-- Description: Add auto_moderation_rules, community_guidelines, and paystack_transactions tables
-- Date: 2025-01-27

-- ==========================================
-- AUTO MODERATION RULES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.auto_moderation_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('keyword', 'pattern', 'ai_detection', 'behavior')),
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    created_by UUID REFERENCES public.users(id)
);

-- ==========================================
-- COMMUNITY GUIDELINES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.community_guidelines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'respectful_communication', 'accurate_information', 'appropriate_content',
        'safety_security', 'legal_compliance', 'platform_integrity'
    )),
    severity TEXT NOT NULL CHECK (severity IN ('minor', 'major', 'severe')),
    examples TEXT[],
    consequences TEXT[],
    is_active BOOLEAN DEFAULT TRUE
);

-- ==========================================
-- PAYSTACK TRANSACTIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.paystack_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
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
    metadata JSONB DEFAULT '{}'::JSONB
);

-- ==========================================
-- ENABLE ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE public.auto_moderation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paystack_transactions ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Auto moderation rules policies
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'auto_moderation_rules' 
        AND policyname = 'Admins can view all auto moderation rules'
    ) THEN
        CREATE POLICY "Admins can view all auto moderation rules" ON public.auto_moderation_rules
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.user_roles 
                    WHERE user_roles.user_id = auth.uid() 
                    AND user_roles.role IN ('admin', 'super_admin', 'moderator')
                    AND user_roles.is_active = TRUE
                )
            );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'auto_moderation_rules' 
        AND policyname = 'Admins can manage auto moderation rules'
    ) THEN
        CREATE POLICY "Admins can manage auto moderation rules" ON public.auto_moderation_rules
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.user_roles 
                    WHERE user_roles.user_id = auth.uid() 
                    AND user_roles.role IN ('admin', 'super_admin')
                    AND user_roles.is_active = TRUE
                )
            );
    END IF;
END $$;

-- Community guidelines policies
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'community_guidelines' 
        AND policyname = 'Anyone can view active community guidelines'
    ) THEN
        CREATE POLICY "Anyone can view active community guidelines" ON public.community_guidelines
            FOR SELECT USING (is_active = TRUE);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'community_guidelines' 
        AND policyname = 'Admins can manage community guidelines'
    ) THEN
        CREATE POLICY "Admins can manage community guidelines" ON public.community_guidelines
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.user_roles 
                    WHERE user_roles.user_id = auth.uid() 
                    AND user_roles.role IN ('admin', 'super_admin')
                    AND user_roles.is_active = TRUE
                )
            );
    END IF;
END $$;

-- Paystack transactions policies
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'paystack_transactions' 
        AND policyname = 'Users can view their own paystack transactions'
    ) THEN
        CREATE POLICY "Users can view their own paystack transactions" ON public.paystack_transactions
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'paystack_transactions' 
        AND policyname = 'Service role can manage all paystack transactions'
    ) THEN
        CREATE POLICY "Service role can manage all paystack transactions" ON public.paystack_transactions
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- ==========================================
-- ADD UPDATED_AT TRIGGERS
-- ==========================================
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'handle_auto_moderation_rules_updated_at'
    ) THEN
        CREATE TRIGGER handle_auto_moderation_rules_updated_at 
            BEFORE UPDATE ON public.auto_moderation_rules 
            FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'handle_community_guidelines_updated_at'
    ) THEN
        CREATE TRIGGER handle_community_guidelines_updated_at 
            BEFORE UPDATE ON public.community_guidelines 
            FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'handle_paystack_transactions_updated_at'
    ) THEN
        CREATE TRIGGER handle_paystack_transactions_updated_at 
            BEFORE UPDATE ON public.paystack_transactions 
            FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
    END IF;
END $$;

-- ==========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ==========================================

-- Auto moderation rules indexes
CREATE INDEX IF NOT EXISTS idx_auto_moderation_rules_active ON public.auto_moderation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_auto_moderation_rules_type ON public.auto_moderation_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_auto_moderation_rules_severity ON public.auto_moderation_rules(severity);
CREATE INDEX IF NOT EXISTS idx_auto_moderation_rules_created_by ON public.auto_moderation_rules(created_by);

-- Community guidelines indexes
CREATE INDEX IF NOT EXISTS idx_community_guidelines_active ON public.community_guidelines(is_active);
CREATE INDEX IF NOT EXISTS idx_community_guidelines_category ON public.community_guidelines(category);
CREATE INDEX IF NOT EXISTS idx_community_guidelines_severity ON public.community_guidelines(severity);

-- Paystack transactions indexes
CREATE INDEX IF NOT EXISTS idx_paystack_transactions_user_id ON public.paystack_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_paystack_transactions_reference ON public.paystack_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_paystack_transactions_status ON public.paystack_transactions(status);
CREATE INDEX IF NOT EXISTS idx_paystack_transactions_created_at ON public.paystack_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paystack_transactions_payment_channel ON public.paystack_transactions(payment_channel);

-- ==========================================
-- INSERT DEFAULT COMMUNITY GUIDELINES
-- ==========================================
INSERT INTO public.community_guidelines (title, description, category, severity, examples, consequences) 
VALUES
    ('Respectful Communication', 'Treat all community members with respect and courtesy', 'respectful_communication', 'major', 
     ARRAY['Be polite in messages', 'Avoid personal attacks', 'Respect different viewpoints'], 
     ARRAY['Warning for first offense', 'Temporary suspension for repeated violations']),
    
    ('Accurate Information', 'Provide truthful and accurate information in listings and communications', 'accurate_information', 'major',
     ARRAY['List actual property details', 'Provide real contact information', 'Be honest about availability'],
     ARRAY['Content removal', 'Account warning', 'Potential suspension for fraud']),
    
    ('Appropriate Content', 'Keep all content appropriate for a general audience', 'appropriate_content', 'severe',
     ARRAY['No explicit images or language', 'Family-friendly content only', 'Professional communication'],
     ARRAY['Immediate content removal', 'Account suspension', 'Permanent ban for severe violations']),
    
    ('Safety and Security', 'Prioritize the safety and security of all community members', 'safety_security', 'severe',
     ARRAY['No threats or intimidation', 'Meet in public places', 'Report suspicious activity'],
     ARRAY['Immediate investigation', 'Account suspension', 'Law enforcement referral if needed']),
    
    ('Legal Compliance', 'Ensure all activities comply with applicable laws and regulations', 'legal_compliance', 'severe',
     ARRAY['Valid property ownership or authorization', 'Comply with rental laws', 'No illegal activities'],
     ARRAY['Content removal', 'Account suspension', 'Legal action if required']),
    
    ('Platform Integrity', 'Maintain the integrity and trustworthiness of the platform', 'platform_integrity', 'major',
     ARRAY['One account per person', 'No spam or duplicate listings', 'Use platform as intended'],
     ARRAY['Account warning', 'Listing removal', 'Account suspension for repeated violations'])
ON CONFLICT DO NOTHING;

-- ==========================================
-- INSERT DEFAULT AUTO MODERATION RULES
-- ==========================================
INSERT INTO public.auto_moderation_rules (name, rule_type, conditions, actions, severity, is_active)
VALUES
    ('Spam Detection', 'keyword', 
     '{"keywords": ["spam", "scam", "fake", "fraud"], "threshold": 2}'::jsonb,
     '{"flag": true, "autoRemove": false, "notifyModerators": true}'::jsonb,
     'medium', TRUE),
    
    ('Inappropriate Language', 'keyword',
     '{"keywords": ["explicit terms here"], "threshold": 1}'::jsonb,
     '{"flag": true, "autoRemove": true, "notifyModerators": true}'::jsonb,
     'high', TRUE),
    
    ('Suspicious URLs', 'pattern',
     '{"patterns": ["bit\\.ly", "tinyurl", "suspicious-site"], "action": "flag"}'::jsonb,
     '{"flag": true, "autoRemove": false, "requireReview": true}'::jsonb,
     'medium', TRUE)
ON CONFLICT DO NOTHING;

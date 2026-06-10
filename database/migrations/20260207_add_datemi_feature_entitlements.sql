-- Migration: Add DateMi Feature Entitlements
-- Description: Enables $1/month per-feature add-ons (messaging / voice_call / video_call) for DateMi.

-- ==========================================
-- DATEMI FEATURE ENTITLEMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.datemi_feature_entitlements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    feature TEXT NOT NULL CHECK (feature IN ('messaging', 'voice_call', 'video_call')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    source TEXT NOT NULL DEFAULT 'paystack',
    transaction_reference VARCHAR(100),
    metadata JSONB DEFAULT '{}'::JSONB,
    UNIQUE (user_id, feature)
);

ALTER TABLE public.datemi_feature_entitlements ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- UPDATED_AT TRIGGER
-- ==========================================
DROP TRIGGER IF EXISTS handle_datemi_feature_entitlements_updated_at ON public.datemi_feature_entitlements;
CREATE TRIGGER handle_datemi_feature_entitlements_updated_at
    BEFORE UPDATE ON public.datemi_feature_entitlements
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_datemi_feature_entitlements_user_id
    ON public.datemi_feature_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_datemi_feature_entitlements_feature
    ON public.datemi_feature_entitlements(feature);
CREATE INDEX IF NOT EXISTS idx_datemi_feature_entitlements_status
    ON public.datemi_feature_entitlements(status);
CREATE INDEX IF NOT EXISTS idx_datemi_feature_entitlements_end_date
    ON public.datemi_feature_entitlements(end_date DESC);

-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================
DROP POLICY IF EXISTS "Users can view their own DateMi feature entitlements" ON public.datemi_feature_entitlements;
DROP POLICY IF EXISTS "Users can insert their own DateMi feature entitlements" ON public.datemi_feature_entitlements;
DROP POLICY IF EXISTS "Users can update their own DateMi feature entitlements" ON public.datemi_feature_entitlements;
DROP POLICY IF EXISTS "Service role can manage all DateMi feature entitlements" ON public.datemi_feature_entitlements;

CREATE POLICY "Users can view their own DateMi feature entitlements" ON public.datemi_feature_entitlements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own DateMi feature entitlements" ON public.datemi_feature_entitlements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own DateMi feature entitlements" ON public.datemi_feature_entitlements
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all DateMi feature entitlements" ON public.datemi_feature_entitlements
    FOR ALL USING (auth.role() = 'service_role');


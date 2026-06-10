-- Migration: Create Property Inquiries Table
-- Description: Enable users to send inquiries to property owners
-- Date: 2025-01-27

-- ==========================================
-- PROPERTY INQUIRIES TABLE
-- ==========================================

DROP TABLE IF EXISTS public.property_inquiries;
CREATE TABLE public.property_inquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    property_id UUID REFERENCES public.property_listings(id) ON DELETE CASCADE NOT NULL,
    inquirer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    inquirer_name TEXT NOT NULL,
    message TEXT NOT NULL,
    contact_phone TEXT,
    contact_email TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'closed')),
    responded_at TIMESTAMP WITH TIME ZONE,
    response_message TEXT,
    
    -- Ensure at least one contact method is provided
    CONSTRAINT contact_method_check CHECK (
        contact_phone IS NOT NULL AND LENGTH(TRIM(contact_phone)) > 0 
        OR contact_email IS NOT NULL AND LENGTH(TRIM(contact_email)) > 0
    )
);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_property_inquiries_property_id ON public.property_inquiries(property_id);
CREATE INDEX IF NOT EXISTS idx_property_inquiries_inquirer_id ON public.property_inquiries(inquirer_id);
CREATE INDEX IF NOT EXISTS idx_property_inquiries_owner_id ON public.property_inquiries(owner_id);
CREATE INDEX IF NOT EXISTS idx_property_inquiries_status ON public.property_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_property_inquiries_created_at ON public.property_inquiries(created_at DESC);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE public.property_inquiries ENABLE ROW LEVEL SECURITY;

-- Users can view inquiries they sent or received
DROP POLICY IF EXISTS "Users can view their own inquiries" ON public.property_inquiries;
CREATE POLICY "Users can view their own inquiries" 
ON public.property_inquiries FOR SELECT 
USING (auth.uid() = inquirer_id OR auth.uid() = owner_id);

-- Users can submit property inquiries (must be authenticated)
DROP POLICY IF EXISTS "Users can submit property inquiries" ON public.property_inquiries;
CREATE POLICY "Users can submit property inquiries" 
ON public.property_inquiries FOR INSERT 
WITH CHECK (auth.uid() = inquirer_id AND auth.uid() IS NOT NULL);

-- Property owners can update inquiry status and add responses
DROP POLICY IF EXISTS "Property owners can update inquiry status" ON public.property_inquiries;
CREATE POLICY "Property owners can update inquiry status" 
ON public.property_inquiries FOR UPDATE 
USING (auth.uid() = owner_id);

-- Users can delete their own inquiries (soft delete via status)
DROP POLICY IF EXISTS "Users can delete their own inquiries" ON public.property_inquiries;
CREATE POLICY "Users can delete their own inquiries" 
ON public.property_inquiries FOR DELETE 
USING (auth.uid() = inquirer_id);

-- ==========================================
-- TRIGGERS
-- ==========================================
-- Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS handle_property_inquiries_updated_at ON public.property_inquiries;
CREATE TRIGGER handle_property_inquiries_updated_at 
BEFORE UPDATE ON public.property_inquiries 
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==========================================
-- COMMENTS
-- ==========================================
COMMENT ON TABLE public.property_inquiries IS 'Stores property inquiries from potential tenants to property owners';
COMMENT ON COLUMN public.property_inquiries.inquirer_name IS 'Full name of the person inquiring (for display purposes)';
COMMENT ON COLUMN public.property_inquiries.status IS 'pending: awaiting response, responded: owner replied, closed: inquiry resolved';
COMMENT ON COLUMN public.property_inquiries.response_message IS 'Response from property owner';

-- MyNyumbApp Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    full_name TEXT,
    profile_image_url TEXT,
    location_preferences JSONB,
    kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'verified', 'rejected', 'unverified')),
    creator_verification_status TEXT DEFAULT 'not_applied' CHECK (creator_verification_status IN ('not_applied', 'pending', 'verified', 'rejected', 'unverified'))
);

-- Normalize public.users.email to lower(trim(email)) on all writes
CREATE OR REPLACE FUNCTION public.normalize_public_users_email()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email := lower(trim(NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_normalize_email ON public.users;
CREATE TRIGGER users_normalize_email
    BEFORE INSERT OR UPDATE OF email ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.normalize_public_users_email();

-- Property listings table
CREATE TABLE public.property_listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    owner_id UUID REFERENCES public.users(id) NOT NULL,
    property_type TEXT NOT NULL CHECK (property_type IN (
        'houses', 'apartments', 'commercial', 'land', 'bedsitters', 
        'one_bedroom', 'two_bedroom', 'three_bedroom', 'four_bedroom', 'five_bedroom',
        'studios', 'studio', 'penthouse', 'student_housing',
        'villa', 'townhouse', 'town_house', 'bungalow', 'condo',
        'container_house', 'cabin', 'farm_house', 'cottage', 
        'mansionate', 'duplex_house'
    )),
    listing_type TEXT NOT NULL DEFAULT 'rent' CHECK (listing_type IN ('rent', 'sale')),
    title TEXT NOT NULL,
    description TEXT,
    
    -- Location fields
    location_coordinates JSONB, -- {lat: number, lng: number}
    location_address TEXT NOT NULL,
    location_county TEXT NOT NULL DEFAULT 'Nairobi',
    location_town TEXT,
    location_neighborhood TEXT,
    
    -- Pricing
    price DECIMAL(12,2) NOT NULL,
    price_period TEXT DEFAULT 'monthly' CHECK (price_period IN ('monthly', 'yearly', 'one_time')),
    currency TEXT DEFAULT 'KSH',
    
    -- Property details
    bedrooms INTEGER,
    bathrooms INTEGER,
    area_sqm DECIMAL(10,2),
    amenities TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Media
    image_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Status and metadata
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'rented', 'sold', 'inactive')),
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    inquiry_count INTEGER DEFAULT 0,
    favorited_count INTEGER DEFAULT 0,
    
    -- Contact information
    contact_phone TEXT,
    contact_email TEXT,
    
    -- Ensure at least one contact method is provided
    CONSTRAINT contact_method_required CHECK (
        contact_phone IS NOT NULL AND LENGTH(TRIM(contact_phone)) > 0 
        OR contact_email IS NOT NULL AND LENGTH(TRIM(contact_email)) > 0
    )
);

-- Job postings table
CREATE TABLE public.job_postings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    employer_id UUID REFERENCES public.users(id) NOT NULL,
    job_title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    salary DECIMAL(12,2),
    required_skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    contact_details JSONB, -- {phone, email, etc}
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'filled', 'closed')),
    job_type TEXT CHECK (job_type IN ('full_time', 'part_time', 'contract', 'freelance')),
    experience_level TEXT CHECK (experience_level IN ('entry', 'mid', 'senior'))
);

-- Service listings table
CREATE TABLE public.service_listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    owner_id UUID REFERENCES public.users(id) NOT NULL,
    service_name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    pricing_info JSONB, -- {base_price, currency, price_type: 'fixed'|'hourly'|'negotiable'}
    image_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    contact_details JSONB,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    tags TEXT[] DEFAULT ARRAY[]::TEXT[]
);


-- Date Mi profiles table
CREATE TABLE public.date_mi_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    age_verified BOOLEAN DEFAULT FALSE,
    gender_preferences TEXT[] DEFAULT ARRAY[]::TEXT[],
    profile_pictures TEXT[] DEFAULT ARRAY[]::TEXT[],
    about_me TEXT,
    privacy_settings JSONB DEFAULT '{
        "contact_visible": false,
        "photos_protected": true,
        "location_sharing": "city_only"
    }'::JSONB,
    creator_status BOOLEAN DEFAULT FALSE,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
    subscription_country TEXT DEFAULT 'KE'
);

-- Escrow transactions table
CREATE TABLE public.escrow_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payer_id UUID REFERENCES public.users(id) NOT NULL,
    payee_id UUID REFERENCES public.users(id) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'KES',
    escrow_status TEXT DEFAULT 'initiated' CHECK (escrow_status IN ('initiated', 'escrowed', 'released', 'disputed', 'cancelled')),
    service_type TEXT NOT NULL,
    session_reference TEXT,
    service_reference TEXT,
    completion_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    dispute_status TEXT CHECK (dispute_status IN ('none', 'pending', 'resolved')),
    dispute_reason TEXT,
    transaction_metadata JSONB,
    session_metadata JSONB,
    escrow_fees_percentage DECIMAL(5,2) DEFAULT 10.00,
    platform_fees DECIMAL(12,2) DEFAULT 0,
    payout_amount DECIMAL(12,2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))
);


-- Payment methods table
CREATE TABLE public.payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('card')),
    provider TEXT NOT NULL,
    account_number TEXT NOT NULL, -- Masked account number (e.g., ****1234)
    is_default BOOLEAN DEFAULT FALSE
);

-- Transactions table
CREATE TABLE public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('subscription', 'listing_promotion', 'escrow')),
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'KES',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method TEXT NOT NULL,
    reference_id TEXT NOT NULL UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb
);


-- Creator services table
CREATE TABLE public.creator_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creator_id UUID REFERENCES public.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    service_type TEXT NOT NULL CHECK (service_type IN ('video_call', 'photo_content', 'chat_session', 'custom')),
    price DECIMAL(12,2) NOT NULL,
    duration INTEGER, -- in minutes
    is_active BOOLEAN DEFAULT TRUE,
    preview_image_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Creator content table
CREATE TABLE public.creator_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creator_id UUID REFERENCES public.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    content_type TEXT NOT NULL CHECK (content_type IN ('photo', 'video', 'audio')),
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    price DECIMAL(12,2) NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Creator earnings table
CREATE TABLE public.creator_earnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creator_id UUID REFERENCES public.users(id) NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('video_call', 'content_purchase', 'tip', 'subscription')),
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'KES',
    escrow_transaction_id UUID REFERENCES public.escrow_transactions(id),
    service_reference TEXT,
    customer_id UUID REFERENCES public.users(id)
);

-- Escrow sessions table (for tracking video calls and timed services)
CREATE TABLE public.escrow_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    escrow_transaction_id UUID REFERENCES public.escrow_transactions(id) NOT NULL,
    session_type TEXT NOT NULL CHECK (session_type IN ('video_call', 'chat_session')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- actual duration in minutes
    rate_per_minute DECIMAL(12,2) NOT NULL,
    final_amount DECIMAL(12,2) DEFAULT 0,
    session_status TEXT DEFAULT 'active' CHECK (session_status IN ('active', 'ended', 'cancelled')),
    participant_data JSONB NOT NULL
);

-- Payout requests table
CREATE TABLE public.payout_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creator_id UUID REFERENCES public.users(id) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'KES',
    payment_method_id UUID REFERENCES public.payment_methods(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    reference_id TEXT,
    notes TEXT
);

-- Video call sessions table
CREATE TABLE public.video_call_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    caller_id UUID REFERENCES public.users(id) NOT NULL,
    callee_id UUID REFERENCES public.users(id) NOT NULL,
    status TEXT DEFAULT 'calling' CHECK (status IN ('calling', 'active', 'ended', 'cancelled')),
    escrow_transaction_id UUID REFERENCES public.escrow_transactions(id),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actual_start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- in seconds
    rate_per_minute DECIMAL(12,2) DEFAULT 0,
    current_cost DECIMAL(12,2) DEFAULT 0,
    final_cost DECIMAL(12,2) DEFAULT 0
);

-- WebRTC signaling messages table
CREATE TABLE public.signaling_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id UUID REFERENCES public.video_call_sessions(id) NOT NULL,
    target_user_id UUID REFERENCES public.users(id),
    message_type TEXT NOT NULL CHECK (message_type IN ('offer', 'answer', 'ice-candidate', 'hang-up')),
    message_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE
);

-- Analytics table
CREATE TABLE public.analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id),
    event_type TEXT NOT NULL,
    event_name TEXT NOT NULL,
    properties JSONB DEFAULT '{}'::jsonb,
    session_id TEXT,
    device_info JSONB DEFAULT '{}'::jsonb
);

-- ==========================================
-- MISSING CORE TABLES
-- ==========================================

-- Property inquiries table
CREATE TABLE public.property_inquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    property_id UUID REFERENCES public.property_listings(id) ON DELETE CASCADE NOT NULL,
    inquirer_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    contact_phone TEXT,
    contact_email TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'closed')),
    responded_at TIMESTAMP WITH TIME ZONE,
    response TEXT,
    
    -- Ensure at least one contact method is provided
    CONSTRAINT contact_method_check CHECK (
        contact_phone IS NOT NULL AND LENGTH(TRIM(contact_phone)) > 0 
        OR contact_email IS NOT NULL AND LENGTH(TRIM(contact_email)) > 0
    )
);

-- Subscriptions table (for Date Mi premium tiers)
CREATE TABLE public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'premium')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trialing', 'past_due')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    payment_method TEXT,
    payment_channel TEXT,
    transaction_id TEXT,
    amount_paid DECIMAL(12,2),
    currency TEXT DEFAULT 'KES',
    country_code TEXT DEFAULT 'KE',
    auto_renew BOOLEAN DEFAULT TRUE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::JSONB
);

-- User documents table (for resumes, certificates, etc.)
CREATE TABLE public.user_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('resume', 'certificate', 'id_document', 'portfolio', 'cover_letter')),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    storage_path TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Job application documents table
CREATE TABLE public.job_application_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_id UUID REFERENCES public.user_documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES public.job_postings(id) ON DELETE CASCADE NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('resume', 'cover_letter', 'certificate', 'portfolio')),
    application_id UUID,
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'accepted', 'rejected'))
);

-- User roles table (for moderation and admin access)
CREATE TABLE public.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'moderator', 'admin', 'super_admin')),
    granted_by UUID REFERENCES public.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSONB DEFAULT '{}'::JSONB,
    
    UNIQUE(user_id, role)
);

-- Function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- ANALYTICS & SOCIAL PROOF TABLES
-- ==========================================

-- User activities table (for tracking all user interactions)
CREATE TABLE public.user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('view', 'like', 'share', 'contact', 'save', 'search', 'browse', 'apply', 'inquire')),
    content_type TEXT NOT NULL CHECK (content_type IN ('property', 'job', 'service', 'story', 'profile')),
    content_id UUID NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Engagement metrics table (aggregated metrics for content)
CREATE TABLE public.engagement_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    content_type TEXT NOT NULL CHECK (content_type IN ('property', 'job', 'service', 'story', 'profile')),
    content_id UUID NOT NULL,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    contacts INTEGER DEFAULT 0,
    favorites INTEGER DEFAULT 0,
    UNIQUE(content_type, content_id)
);

-- Content performance snapshots (for historical tracking)
CREATE TABLE public.performance_snapshots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date DATE NOT NULL,
    content_type TEXT NOT NULL,
    content_id UUID NOT NULL,
    metrics JSONB NOT NULL, -- {views: number, interactions: number, etc}
    UNIQUE(date, content_type, content_id)
);

-- System activity indicators (for real-time social proof)
CREATE TABLE public.activity_indicators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    module TEXT NOT NULL CHECK (module IN ('property', 'jobs', 'services', 'stories', 'datemi')),
    activity_count INTEGER NOT NULL,
    activity_text TEXT NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.date_mi_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signaling_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Users can read all, modify their own)
-- Users table policies
CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (TRUE);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Property listings policies
CREATE POLICY "Anyone can view active property listings" ON public.property_listings FOR SELECT USING (status = 'active');
CREATE POLICY "Users can insert their own property listings" ON public.property_listings FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own property listings" ON public.property_listings FOR UPDATE USING (auth.uid() = owner_id);

-- Job postings policies
CREATE POLICY "Anyone can view open job postings" ON public.job_postings FOR SELECT USING (status = 'open');
CREATE POLICY "Users can insert their own job postings" ON public.job_postings FOR INSERT WITH CHECK (auth.uid() = employer_id);
CREATE POLICY "Users can update their own job postings" ON public.job_postings FOR UPDATE USING (auth.uid() = employer_id);

-- Service listings policies
CREATE POLICY "Anyone can view active service listings" ON public.service_listings FOR SELECT USING (status = 'active');
CREATE POLICY "Service owners can view their own service listings" ON public.service_listings FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own service listings" ON public.service_listings FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own service listings" ON public.service_listings FOR UPDATE USING (auth.uid() = owner_id);


-- Date Mi profiles policies
CREATE POLICY "Users can view date mi profiles" ON public.date_mi_profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users can insert their own date mi profile" ON public.date_mi_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own date mi profile" ON public.date_mi_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Escrow transactions policies
CREATE POLICY "Users can view their own escrow transactions" ON public.escrow_transactions FOR SELECT USING (auth.uid() = payer_id OR auth.uid() = payee_id);
CREATE POLICY "Users can insert escrow transactions" ON public.escrow_transactions FOR INSERT WITH CHECK (auth.uid() = payer_id);
CREATE POLICY "Users can update their own escrow transactions" ON public.escrow_transactions FOR UPDATE USING (auth.uid() = payer_id OR auth.uid() = payee_id);

-- Payment methods policies
CREATE POLICY "Users can view their own payment methods" ON public.payment_methods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own payment methods" ON public.payment_methods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own payment methods" ON public.payment_methods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own payment methods" ON public.payment_methods FOR DELETE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System can update transactions" ON public.transactions FOR UPDATE USING (TRUE); -- Allow system updates for payment callbacks


-- Creator services policies
CREATE POLICY "Anyone can view active creator services" ON public.creator_services FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Creators can manage their own services" ON public.creator_services FOR ALL USING (auth.uid() = creator_id);

-- Creator content policies  
CREATE POLICY "Anyone can view public creator content" ON public.creator_content FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Creators can view their own content" ON public.creator_content FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "Creators can manage their own content" ON public.creator_content FOR ALL USING (auth.uid() = creator_id);

-- Creator earnings policies
CREATE POLICY "Creators can view their own earnings" ON public.creator_earnings FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "System can insert creator earnings" ON public.creator_earnings FOR INSERT WITH CHECK (TRUE);

-- Escrow sessions policies
CREATE POLICY "Users can view their own escrow sessions" ON public.escrow_sessions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.escrow_transactions 
    WHERE escrow_transactions.id = escrow_sessions.escrow_transaction_id 
    AND (escrow_transactions.payer_id = auth.uid() OR escrow_transactions.payee_id = auth.uid())
  )
);
CREATE POLICY "System can manage escrow sessions" ON public.escrow_sessions FOR ALL USING (TRUE);

-- Payout requests policies
CREATE POLICY "Creators can view their own payout requests" ON public.payout_requests FOR SELECT USING (auth.uid() = creator_id);
CREATE POLICY "Creators can create payout requests" ON public.payout_requests FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Analytics events policies
CREATE POLICY "Users can insert their own analytics events" ON public.analytics_events FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "No one can read analytics events" ON public.analytics_events FOR SELECT USING (FALSE); -- Analytics are for internal use only

-- Property inquiries policies
CREATE POLICY "Users can view their own inquiries" ON public.property_inquiries FOR SELECT USING (auth.uid() = inquirer_id OR auth.uid() = owner_id);
CREATE POLICY "Users can submit property inquiries" ON public.property_inquiries FOR INSERT WITH CHECK (auth.uid() = inquirer_id);
CREATE POLICY "Property owners can update inquiry status" ON public.property_inquiries FOR UPDATE USING (auth.uid() = owner_id);

-- Subscriptions policies
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System can update subscriptions" ON public.subscriptions FOR UPDATE USING (TRUE);

-- User documents policies
CREATE POLICY "Users can view their own documents" ON public.user_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upload their own documents" ON public.user_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own documents" ON public.user_documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own documents" ON public.user_documents FOR DELETE USING (auth.uid() = user_id);

-- Job application documents policies
CREATE POLICY "Users can view their own application documents" ON public.job_application_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can submit application documents" ON public.job_application_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Employers can view documents for their jobs" ON public.job_application_documents FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.job_postings 
        WHERE job_postings.id = job_application_documents.job_id 
        AND job_postings.employer_id = auth.uid()
    )
);

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role IN ('admin', 'super_admin')
        AND user_roles.is_active = TRUE
    )
);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role IN ('admin', 'super_admin')
        AND user_roles.is_active = TRUE
    )
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
CREATE TRIGGER handle_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_property_listings_updated_at BEFORE UPDATE ON public.property_listings FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_job_postings_updated_at BEFORE UPDATE ON public.job_postings FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_service_listings_updated_at BEFORE UPDATE ON public.service_listings FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_date_mi_profiles_updated_at BEFORE UPDATE ON public.date_mi_profiles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_escrow_transactions_updated_at BEFORE UPDATE ON public.escrow_transactions FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_creator_services_updated_at BEFORE UPDATE ON public.creator_services FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_creator_content_updated_at BEFORE UPDATE ON public.creator_content FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_escrow_sessions_updated_at BEFORE UPDATE ON public.escrow_sessions FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_payout_requests_updated_at BEFORE UPDATE ON public.payout_requests FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_property_inquiries_updated_at BEFORE UPDATE ON public.property_inquiries FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_user_documents_updated_at BEFORE UPDATE ON public.user_documents FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Enable RLS for analytics tables
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_indicators ENABLE ROW LEVEL SECURITY;

-- Analytics RLS Policies
-- User activities - users can view all activities for public content, but only their own private activities
CREATE POLICY "Users can view public activities" ON public.user_activities FOR SELECT USING (TRUE);
CREATE POLICY "Users can insert their own activities" ON public.user_activities FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Engagement metrics - anyone can view metrics for public content
CREATE POLICY "Anyone can view engagement metrics" ON public.engagement_metrics FOR SELECT USING (TRUE);
CREATE POLICY "System can manage engagement metrics" ON public.engagement_metrics FOR ALL USING (TRUE); -- For system updates

-- Performance snapshots - anyone can view performance data
CREATE POLICY "Anyone can view performance snapshots" ON public.performance_snapshots FOR SELECT USING (TRUE);
CREATE POLICY "System can manage performance snapshots" ON public.performance_snapshots FOR ALL USING (TRUE);

-- Activity indicators - anyone can view activity indicators (social proof)
CREATE POLICY "Anyone can view activity indicators" ON public.activity_indicators FOR SELECT USING (TRUE);
CREATE POLICY "System can manage activity indicators" ON public.activity_indicators FOR ALL USING (TRUE);

-- Video call sessions policies
CREATE POLICY "Users can view their own video call sessions" ON public.video_call_sessions FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = callee_id);
CREATE POLICY "Users can create video call sessions" ON public.video_call_sessions FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "System can update video call sessions" ON public.video_call_sessions FOR UPDATE USING (TRUE);

-- Signaling messages policies
CREATE POLICY "Users can view signaling messages for their sessions" ON public.signaling_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.video_call_sessions 
    WHERE video_call_sessions.id = signaling_messages.session_id 
    AND (video_call_sessions.caller_id = auth.uid() OR video_call_sessions.callee_id = auth.uid())
  )
);
CREATE POLICY "Users can send signaling messages" ON public.signaling_messages FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.video_call_sessions 
    WHERE video_call_sessions.id = signaling_messages.session_id 
    AND (video_call_sessions.caller_id = auth.uid() OR video_call_sessions.callee_id = auth.uid())
  )
);

-- Add updated_at triggers for video call tables
CREATE TRIGGER handle_video_call_sessions_updated_at BEFORE UPDATE ON public.video_call_sessions FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Add updated_at triggers for analytics tables
CREATE TRIGGER handle_engagement_metrics_updated_at BEFORE UPDATE ON public.engagement_metrics FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
CREATE TRIGGER handle_activity_indicators_updated_at BEFORE UPDATE ON public.activity_indicators FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX idx_user_activities_content ON public.user_activities(content_type, content_id);
CREATE INDEX idx_user_activities_timestamp ON public.user_activities(timestamp);
CREATE INDEX idx_user_activities_action ON public.user_activities(action);

CREATE INDEX idx_engagement_metrics_content ON public.engagement_metrics(content_type, content_id);
CREATE INDEX idx_engagement_metrics_updated_at ON public.engagement_metrics(updated_at);

CREATE INDEX idx_performance_snapshots_date ON public.performance_snapshots(date);
CREATE INDEX idx_performance_snapshots_content ON public.performance_snapshots(content_type, content_id);

CREATE INDEX idx_activity_indicators_module ON public.activity_indicators(module);
CREATE INDEX idx_activity_indicators_updated ON public.activity_indicators(last_updated);

-- ==========================================
-- INDEXES FOR MISSING CORE TABLES
-- ==========================================

-- Property inquiries indexes
CREATE INDEX idx_property_inquiries_property_id ON public.property_inquiries(property_id);
CREATE INDEX idx_property_inquiries_inquirer_id ON public.property_inquiries(inquirer_id);
CREATE INDEX idx_property_inquiries_owner_id ON public.property_inquiries(owner_id);
CREATE INDEX idx_property_inquiries_status ON public.property_inquiries(status);
CREATE INDEX idx_property_inquiries_created_at ON public.property_inquiries(created_at DESC);

-- Subscriptions indexes
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_tier ON public.subscriptions(tier);
CREATE INDEX idx_subscriptions_end_date ON public.subscriptions(end_date);
CREATE INDEX idx_subscriptions_active ON public.subscriptions(user_id, status) WHERE status = 'active';

-- User documents indexes
CREATE INDEX idx_user_documents_user_id ON public.user_documents(user_id);
CREATE INDEX idx_user_documents_type ON public.user_documents(document_type);
CREATE INDEX idx_user_documents_active ON public.user_documents(user_id, is_active) WHERE is_active = TRUE;

-- Job application documents indexes
CREATE INDEX idx_job_application_documents_user_id ON public.job_application_documents(user_id);
CREATE INDEX idx_job_application_documents_job_id ON public.job_application_documents(job_id);
CREATE INDEX idx_job_application_documents_file_id ON public.job_application_documents(file_id);

-- User roles indexes
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_user_roles_active ON public.user_roles(user_id, role, is_active) WHERE is_active = TRUE;

-- Service listings indexes (optimize search and filtering)
CREATE INDEX IF NOT EXISTS idx_service_listings_status ON public.service_listings(status);
CREATE INDEX IF NOT EXISTS idx_service_listings_owner_id ON public.service_listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_service_listings_category ON public.service_listings(category);
CREATE INDEX IF NOT EXISTS idx_service_listings_location ON public.service_listings(location);
CREATE INDEX IF NOT EXISTS idx_service_listings_created_at ON public.service_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_listings_status_category_created_at ON public.service_listings(status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_listings_owner_created_at ON public.service_listings(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_listings_tags_gin ON public.service_listings USING GIN (tags);

-- Function to update engagement metrics automatically
CREATE OR REPLACE FUNCTION public.update_engagement_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update engagement metrics when user activities are inserted
    INSERT INTO public.engagement_metrics (content_type, content_id, views, likes, shares, contacts, favorites)
    VALUES (
        NEW.content_type,
        NEW.content_id,
        CASE WHEN NEW.action = 'view' THEN 1 ELSE 0 END,
        CASE WHEN NEW.action = 'like' THEN 1 ELSE 0 END,
        CASE WHEN NEW.action = 'share' THEN 1 ELSE 0 END,
        CASE WHEN NEW.action = 'contact' THEN 1 ELSE 0 END,
        CASE WHEN NEW.action = 'save' THEN 1 ELSE 0 END
    )
    ON CONFLICT (content_type, content_id)
    DO UPDATE SET
        views = public.engagement_metrics.views + (CASE WHEN NEW.action = 'view' THEN 1 ELSE 0 END),
        likes = public.engagement_metrics.likes + (CASE WHEN NEW.action = 'like' THEN 1 ELSE 0 END),
        shares = public.engagement_metrics.shares + (CASE WHEN NEW.action = 'share' THEN 1 ELSE 0 END),
        contacts = public.engagement_metrics.contacts + (CASE WHEN NEW.action = 'contact' THEN 1 ELSE 0 END),
        favorites = public.engagement_metrics.favorites + (CASE WHEN NEW.action = 'save' THEN 1 ELSE 0 END),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update engagement metrics
CREATE TRIGGER on_user_activity_created
    AFTER INSERT ON public.user_activities
    FOR EACH ROW EXECUTE PROCEDURE public.update_engagement_metrics();

-- Function to generate daily performance snapshots
CREATE OR REPLACE FUNCTION public.create_daily_snapshots()
RETURNS void AS $$
BEGIN
    -- Create snapshots for all content with engagement
    INSERT INTO public.performance_snapshots (date, content_type, content_id, metrics)
    SELECT 
        CURRENT_DATE,
        content_type,
        content_id,
        jsonb_build_object(
            'views', views,
            'likes', likes,
            'shares', shares,
            'contacts', contacts,
            'favorites', favorites,
            'total_interactions', likes + shares + contacts + favorites
        )
    FROM public.engagement_metrics
    WHERE updated_at >= CURRENT_DATE - INTERVAL '1 day'
    ON CONFLICT (date, content_type, content_id) 
    DO UPDATE SET 
        metrics = EXCLUDED.metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initial data for activity indicators (for demo purposes)
INSERT INTO public.activity_indicators (module, activity_count, activity_text) VALUES
('property', 23, '23 people searching right now'),
('jobs', 47, '47 people searching right now'),
('services', 31, '31 people searching for services right now'),
('stories', 35, '35 people sharing stories right now'),
('datemi', 89, '89 active matches today')
ON CONFLICT DO NOTHING;

-- ==========================================
-- ACCOUNT DELETION RPC
-- ==========================================
-- Permanent, user-initiated deletion that removes user-scoped data from public tables
-- and deletes both public.users and auth.users so the same email can re-register only
-- after full cleanup.
CREATE OR REPLACE FUNCTION public.delete_user_account(
  expected_user_id UUID DEFAULT NULL,
  expected_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_uid UUID;
  v_email TEXT;
  v_date_mi_profile_id UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF expected_user_id IS NOT NULL AND expected_user_id <> v_uid THEN
    RAISE EXCEPTION 'User mismatch' USING ERRCODE = '22023';
  END IF;

  IF expected_email IS NOT NULL THEN
    v_email := NULL;

    BEGIN
      SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
    EXCEPTION
      WHEN undefined_table THEN v_email := NULL;
    END;

    IF v_email IS NULL AND to_regclass('public.users') IS NOT NULL THEN
      BEGIN
        EXECUTE 'SELECT email FROM public.users WHERE id = $1' INTO v_email USING v_uid;
      EXCEPTION
        WHEN undefined_column THEN v_email := NULL;
      END;
    END IF;

    IF lower(trim(coalesce(v_email, ''))) <> lower(trim(expected_email)) THEN
      RAISE EXCEPTION 'Email mismatch' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Null out audit references that could block deletion (moderation/admin scenarios)
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    BEGIN
      EXECUTE 'UPDATE public.user_roles SET granted_by = NULL WHERE granted_by = $1' USING v_uid;
    EXCEPTION
      WHEN undefined_column THEN NULL;
    END;
  END IF;

  IF to_regclass('public.age_verifications') IS NOT NULL THEN
    BEGIN
      EXECUTE 'UPDATE public.age_verifications SET verified_by = NULL WHERE verified_by = $1' USING v_uid;
    EXCEPTION
      WHEN undefined_column THEN NULL;
    END;
  END IF;

  IF to_regclass('public.content_reports') IS NOT NULL THEN
    BEGIN
      EXECUTE 'UPDATE public.content_reports SET resolved_by = NULL WHERE resolved_by = $1' USING v_uid;
    EXCEPTION
      WHEN undefined_column THEN NULL;
    END;
  END IF;

  IF to_regclass('public.auto_moderation_rules') IS NOT NULL THEN
    BEGIN
      EXECUTE 'UPDATE public.auto_moderation_rules SET created_by = NULL WHERE created_by = $1' USING v_uid;
    EXCEPTION
      WHEN undefined_column THEN NULL;
    END;
  END IF;

  -- Resolve DateMi profile id (if any) to clean up profile-referencing tables first
  v_date_mi_profile_id := NULL;
  IF to_regclass('public.date_mi_profiles') IS NOT NULL THEN
    BEGIN
      EXECUTE 'SELECT id FROM public.date_mi_profiles WHERE user_id = $1 LIMIT 1'
      INTO v_date_mi_profile_id
      USING v_uid;
    EXCEPTION
      WHEN undefined_column THEN v_date_mi_profile_id := NULL;
    END;
  END IF;

  -- DateMi matching / interaction tables (optional per deployment)
  IF to_regclass('public.datemi_likes') IS NOT NULL THEN
    EXECUTE
      'DELETE FROM public.datemi_likes WHERE liker_id = $1 OR ($2 IS NOT NULL AND liked_profile_id = $2)'
      USING v_uid, v_date_mi_profile_id;
  END IF;

  IF to_regclass('public.datemi_passes') IS NOT NULL THEN
    EXECUTE
      'DELETE FROM public.datemi_passes WHERE passer_id = $1 OR ($2 IS NOT NULL AND passed_profile_id = $2)'
      USING v_uid, v_date_mi_profile_id;
  END IF;

  IF to_regclass('public.datemi_profile_views') IS NOT NULL THEN
    EXECUTE
      'DELETE FROM public.datemi_profile_views WHERE viewer_id = $1 OR ($2 IS NOT NULL AND viewed_profile_id = $2)'
      USING v_uid, v_date_mi_profile_id;
  END IF;

  IF to_regclass('public.datemi_matches') IS NOT NULL THEN
    EXECUTE
      'DELETE FROM public.datemi_matches WHERE user1_id = $1 OR user2_id = $1 OR unmatch_by = $1'
      USING v_uid;
  END IF;

  IF to_regclass('public.datemi_match_cache') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.datemi_match_cache WHERE user_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.datemi_user_behavior') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.datemi_user_behavior WHERE user_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.datemi_matching_preferences') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.datemi_matching_preferences WHERE user_id = $1' USING v_uid;
  END IF;

  -- Other optional user-scoped tables (jobs, skills, feature usage, calls)
  IF to_regclass('public.datemi_feature_usage') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.datemi_feature_usage WHERE user_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.job_alerts') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.job_alerts WHERE user_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.user_skills') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_skills WHERE user_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.job_applications') IS NOT NULL THEN
    BEGIN
      EXECUTE 'DELETE FROM public.job_applications WHERE applicant_id = $1' USING v_uid;
    EXCEPTION
      WHEN undefined_column THEN
        EXECUTE 'DELETE FROM public.job_applications WHERE user_id = $1' USING v_uid;
    END;
  END IF;

  IF to_regclass('public.calls') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.calls WHERE caller_id = $1 OR receiver_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.call_history') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.call_history WHERE caller_id = $1 OR receiver_id = $1' USING v_uid;
  END IF;

  -- WebRTC signaling messages must be removed before deleting sessions
  IF to_regclass('public.signaling_messages') IS NOT NULL AND to_regclass('public.video_call_sessions') IS NOT NULL THEN
    EXECUTE $SQL$
      DELETE FROM public.signaling_messages sm
      USING public.video_call_sessions vcs
      WHERE sm.session_id = vcs.id
        AND (vcs.caller_id = $1 OR vcs.callee_id = $1)
    $SQL$ USING v_uid;

    EXECUTE 'DELETE FROM public.signaling_messages WHERE target_user_id = $1' USING v_uid;
  ELSIF to_regclass('public.signaling_messages') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.signaling_messages WHERE target_user_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.video_call_sessions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.video_call_sessions WHERE caller_id = $1 OR callee_id = $1' USING v_uid;
  END IF;

  -- Escrow sessions reference escrow_transactions; delete sessions before transactions
  IF to_regclass('public.escrow_sessions') IS NOT NULL AND to_regclass('public.escrow_transactions') IS NOT NULL THEN
    EXECUTE $SQL$
      DELETE FROM public.escrow_sessions es
      USING public.escrow_transactions et
      WHERE es.escrow_transaction_id = et.id
        AND (et.payer_id = $1 OR et.payee_id = $1)
    $SQL$ USING v_uid;
  END IF;

  -- Creator-related tables
  IF to_regclass('public.creator_earnings') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.creator_earnings WHERE creator_id = $1 OR customer_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.payout_requests') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.payout_requests WHERE creator_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.creator_content') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.creator_content WHERE creator_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.creator_services') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.creator_services WHERE creator_id = $1' USING v_uid;
  END IF;

  -- Payments / transactions
  IF to_regclass('public.transactions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.transactions WHERE user_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.payment_methods') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.payment_methods WHERE user_id = $1' USING v_uid;
  END IF;

  -- Activity / analytics
  IF to_regclass('public.user_activities') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_activities WHERE user_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.analytics_events') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.analytics_events WHERE user_id = $1' USING v_uid;
  END IF;

  -- Listings owned by the user
  IF to_regclass('public.property_listings') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.property_listings WHERE owner_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.job_postings') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.job_postings WHERE employer_id = $1' USING v_uid;
  END IF;

  IF to_regclass('public.service_listings') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.service_listings WHERE owner_id = $1' USING v_uid;
  END IF;

  -- DateMi profile last (after clearing profile-referencing tables)
  IF to_regclass('public.date_mi_profiles') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.date_mi_profiles WHERE user_id = $1' USING v_uid;
  END IF;

  -- Escrow transactions after sessions/calls/earnings are deleted
  IF to_regclass('public.escrow_transactions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.escrow_transactions WHERE payer_id = $1 OR payee_id = $1' USING v_uid;
  END IF;

  -- Clean user preference row explicitly (even if it also cascades)
  IF to_regclass('public.user_preferences') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_preferences WHERE user_id = $1' USING v_uid;
  END IF;

  -- Delete the domain user row (this also cascades many child tables via FK constraints)
  IF to_regclass('public.users') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.users WHERE id = $1' USING v_uid;
  END IF;

  -- Finally delete the auth user (should cascade auth.sessions/auth.identities, etc.)
  BEGIN
    DELETE FROM auth.users WHERE id = v_uid;
  EXCEPTION
    WHEN undefined_table THEN NULL;
  END;

  RETURN jsonb_build_object('success', true, 'user_id', v_uid::text);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID, TEXT) TO authenticated;

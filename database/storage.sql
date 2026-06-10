-- MyNyumbApp Supabase Storage Setup
-- Run this SQL in your Supabase SQL Editor after running the main schema.sql

-- ==========================================
-- STORAGE BUCKETS CREATION
-- ==========================================

-- Profile images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Property images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Service images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-images',
  'service-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;


-- Date Mi profile pictures bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'datemi-photos',
  'datemi-photos',
  false, -- Private bucket - access controlled by RLS
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Creator content bucket (for Date Mi creator content)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'creator-content',
  'creator-content',
  false, -- Private bucket - paid content
  104857600, -- 100MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm', 'audio/mpeg', 'audio/wav']
) ON CONFLICT (id) DO NOTHING;

-- Document uploads bucket (for KYC and age verification)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- Private bucket - sensitive documents
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- STORAGE POLICIES
-- ==========================================

-- Profile Images Policies
CREATE POLICY "Anyone can view profile images" ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');

CREATE POLICY "Authenticated users can upload their own profile images" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile images" ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile images" ON storage.objects FOR DELETE
USING (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Property Images Policies
CREATE POLICY "Anyone can view property images" ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

CREATE POLICY "Property owners can upload property images" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'property-images' AND 
  EXISTS (
    SELECT 1 FROM public.property_listings 
    WHERE property_listings.id::text = (storage.foldername(name))[1] 
    AND property_listings.owner_id = auth.uid()
  )
);

CREATE POLICY "Property owners can update their property images" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'property-images' AND 
  EXISTS (
    SELECT 1 FROM public.property_listings 
    WHERE property_listings.id::text = (storage.foldername(name))[1] 
    AND property_listings.owner_id = auth.uid()
  )
);

CREATE POLICY "Property owners can delete their property images" ON storage.objects FOR DELETE
USING (
  bucket_id = 'property-images' AND 
  EXISTS (
    SELECT 1 FROM public.property_listings 
    WHERE property_listings.id::text = (storage.foldername(name))[1] 
    AND property_listings.owner_id = auth.uid()
  )
);

-- Service Images Policies
CREATE POLICY "Anyone can view service images" ON storage.objects FOR SELECT
USING (bucket_id = 'service-images');

CREATE POLICY "Service owners can upload service images" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'service-images' AND 
  EXISTS (
    SELECT 1 FROM public.service_listings 
    WHERE service_listings.id::text = (storage.foldername(name))[1] 
    AND service_listings.owner_id = auth.uid()
  )
);

CREATE POLICY "Service owners can update their service images" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'service-images' AND 
  EXISTS (
    SELECT 1 FROM public.service_listings 
    WHERE service_listings.id::text = (storage.foldername(name))[1] 
    AND service_listings.owner_id = auth.uid()
  )
);

CREATE POLICY "Service owners can delete their service images" ON storage.objects FOR DELETE
USING (
  bucket_id = 'service-images' AND 
  EXISTS (
    SELECT 1 FROM public.service_listings 
    WHERE service_listings.id::text = (storage.foldername(name))[1] 
    AND service_listings.owner_id = auth.uid()
  )
);


-- Date Mi Profile Pictures Policies
CREATE POLICY "Users can view Date Mi photos based on privacy settings" ON storage.objects FOR SELECT
USING (
  bucket_id = 'datemi-photos' AND 
  (
    -- Own photos
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Public photos (not privacy protected)
    EXISTS (
      SELECT 1 FROM public.date_mi_profiles 
      WHERE date_mi_profiles.user_id::text = (storage.foldername(name))[1]
      AND date_mi_profiles.privacy_settings->>'photos_protected' = 'false'
    )
  )
);

CREATE POLICY "Users can upload their own Date Mi photos" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'datemi-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own Date Mi photos" ON storage.objects FOR UPDATE
USING (bucket_id = 'datemi-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own Date Mi photos" ON storage.objects FOR DELETE
USING (bucket_id = 'datemi-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Creator Content Policies (Premium/Paid Content)
CREATE POLICY "Creators can view their own creator content" ON storage.objects FOR SELECT
USING (
  bucket_id = 'creator-content' AND 
  EXISTS (
    SELECT 1 FROM public.creator_content 
    WHERE creator_content.id::text = (storage.foldername(name))[1] 
    AND creator_content.creator_id = auth.uid()
  )
);

CREATE POLICY "Users can view purchased creator content" ON storage.objects FOR SELECT
USING (
  bucket_id = 'creator-content' AND 
  EXISTS (
    SELECT 1 FROM public.creator_content 
    JOIN public.escrow_transactions ON TRUE -- This would need proper purchase tracking
    WHERE creator_content.id::text = (storage.foldername(name))[1]
    AND (
      creator_content.is_public = TRUE OR
      -- Add logic here to check if user has purchased the content
      creator_content.creator_id = auth.uid()
    )
  )
);

CREATE POLICY "Creators can upload their own creator content" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'creator-content' AND 
  EXISTS (
    SELECT 1 FROM public.creator_content 
    WHERE creator_content.id::text = (storage.foldername(name))[1] 
    AND creator_content.creator_id = auth.uid()
  )
);

CREATE POLICY "Creators can update their own creator content" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'creator-content' AND 
  EXISTS (
    SELECT 1 FROM public.creator_content 
    WHERE creator_content.id::text = (storage.foldername(name))[1] 
    AND creator_content.creator_id = auth.uid()
  )
);

CREATE POLICY "Creators can delete their own creator content" ON storage.objects FOR DELETE
USING (
  bucket_id = 'creator-content' AND 
  EXISTS (
    SELECT 1 FROM public.creator_content 
    WHERE creator_content.id::text = (storage.foldername(name))[1] 
    AND creator_content.creator_id = auth.uid()
  )
);

-- Document Upload Policies (KYC/Age Verification)
CREATE POLICY "Users can view their own documents" ON storage.objects FOR SELECT
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own documents" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents" ON storage.objects FOR UPDATE
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents" ON storage.objects FOR DELETE
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ==========================================
-- STORAGE HELPER FUNCTIONS
-- ==========================================

-- Function to generate signed URL for private content
CREATE OR REPLACE FUNCTION public.get_signed_url(
  bucket_name TEXT,
  file_path TEXT,
  expires_in INTEGER DEFAULT 3600
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  signed_url TEXT;
BEGIN
  -- This is a placeholder function. In a real implementation,
  -- you would use Supabase's client-side methods or edge functions
  -- to generate signed URLs for private content access
  
  -- For now, return the public URL format
  -- In production, this should integrate with Supabase's signed URL generation
  SELECT 'https://' || current_setting('app.settings.supabase_url') || 
         '/storage/v1/object/sign/' || bucket_name || '/' || file_path
  INTO signed_url;
  
  RETURN signed_url;
END;
$$;

-- Function to clean up orphaned files
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_files()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cleanup_count INTEGER := 0;
BEGIN
  -- This function would identify and clean up storage objects
  -- that no longer have corresponding database records
  
  -- Example: Delete property images for non-existent properties
  DELETE FROM storage.objects
  WHERE bucket_id = 'property-images'
  AND NOT EXISTS (
    SELECT 1 FROM public.property_listings
    WHERE property_listings.id::text = (storage.foldername(storage.objects.name))[1]
  );
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  -- Add similar cleanup for other buckets as needed
  
  RETURN cleanup_count;
END;
$$;

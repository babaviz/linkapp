-- Migration: Add indexes for service_listings search performance
-- Date: 2026-02-17

-- Optimize common filters and ordering
CREATE INDEX IF NOT EXISTS idx_service_listings_status ON public.service_listings(status);
CREATE INDEX IF NOT EXISTS idx_service_listings_owner_id ON public.service_listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_service_listings_category ON public.service_listings(category);
CREATE INDEX IF NOT EXISTS idx_service_listings_location ON public.service_listings(location);
CREATE INDEX IF NOT EXISTS idx_service_listings_created_at ON public.service_listings(created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_service_listings_status_category_created_at
  ON public.service_listings(status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_listings_owner_created_at
  ON public.service_listings(owner_id, created_at DESC);

-- Speed up array and tag-based filtering
CREATE INDEX IF NOT EXISTS idx_service_listings_tags_gin ON public.service_listings USING GIN (tags);


-- Migration: Allow service owners to view their own service listings (including inactive)
-- Date: 2026-02-17

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'service_listings'
      AND policyname = 'Service owners can view their own service listings'
  ) THEN
    EXECUTE 'CREATE POLICY "Service owners can view their own service listings" ON public.service_listings FOR SELECT USING (auth.uid() = owner_id)';
  END IF;
END $$;


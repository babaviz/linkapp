-- Fix Google Play Store Reviewer Account Location
-- Updates the location from "Nairobi, Nairobi" to "Nairobi, Kenya"

UPDATE public.users
SET 
  location_preferences = jsonb_build_object(
    'town', 'Nairobi',
    'county', 'Kenya'
  ),
  updated_at = NOW()
WHERE email = 'playstore.reviewer@linkapp.test'
  AND (location_preferences->>'county' = 'Nairobi' AND location_preferences->>'town' = 'Nairobi');

-- Verify the update
SELECT 
  id,
  email,
  full_name,
  location_preferences,
  updated_at
FROM public.users
WHERE email = 'playstore.reviewer@linkapp.test';

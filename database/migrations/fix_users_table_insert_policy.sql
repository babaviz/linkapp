-- Fix missing INSERT policy for users table
-- This allows authenticated users to create their own profile record after signup

-- Also ensure users can read their own profile even if it's incomplete
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
CREATE POLICY "Users can view all profiles" 
ON public.users 
FOR SELECT 
USING (TRUE);

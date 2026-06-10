-- Enforce one-account-per-email at the profile layer (public.users)
-- - Normalize email values to lower(trim(email))
-- - Add a UNIQUE constraint on public.users.email
-- - Ensure all future writes are normalized via a trigger
-- Date: 2026-02-16

-- 1) Normalize existing rows (idempotent)
UPDATE public.users
SET email = lower(trim(email))
WHERE email IS NOT NULL
  AND email <> lower(trim(email));

-- 2) Fail fast if duplicates exist after normalization
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.users
    GROUP BY email
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add UNIQUE(email) to public.users: duplicate normalized emails exist. Resolve duplicates before re-running this migration.';
  END IF;
END $$;

-- 3) Normalize future writes
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

-- 4) Add UNIQUE constraint (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_email_unique'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_email_unique UNIQUE (email);
  END IF;
END $$;


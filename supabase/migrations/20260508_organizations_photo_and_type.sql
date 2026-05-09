-- Add photo and explicit type (school vs organization) to organizations

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS entity_type TEXT NOT NULL DEFAULT 'SCHOOL';

-- Replace/ensure constraint for entity_type
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'organizations'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%entity_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_entity_type_check
  CHECK (entity_type IN ('SCHOOL', 'ORG'));


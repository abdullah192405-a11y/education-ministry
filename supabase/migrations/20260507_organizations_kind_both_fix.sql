-- Ensure organizations.kind accepts BOTH even if old constraint name differs.
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
          AND pg_get_constraintdef(con.oid) ILIKE '%kind%'
    LOOP
        EXECUTE format('ALTER TABLE public.organizations DROP CONSTRAINT IF EXISTS %I', c.conname);
    END LOOP;
END $$;

ALTER TABLE public.organizations
ADD CONSTRAINT organizations_kind_check
CHECK (kind IN ('EDUCATIONAL', 'ENRICHMENT', 'BOTH'));

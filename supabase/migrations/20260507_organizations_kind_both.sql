-- Allow organizations to be both educational and enrichment at the same time.
ALTER TABLE public.organizations
DROP CONSTRAINT IF EXISTS organizations_kind_check;

ALTER TABLE public.organizations
ADD CONSTRAINT organizations_kind_check
CHECK (kind IN ('EDUCATIONAL', 'ENRICHMENT', 'BOTH'));

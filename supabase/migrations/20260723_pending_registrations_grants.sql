-- Allow public signup flow to write/read pending_registrations via anon key.
-- Email verification is handled by Clerk; this table only stores app metadata.

ALTER TABLE public.pending_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pending_registrations_select" ON public.pending_registrations;
DROP POLICY IF EXISTS "pending_registrations_insert" ON public.pending_registrations;
DROP POLICY IF EXISTS "pending_registrations_update" ON public.pending_registrations;
DROP POLICY IF EXISTS "pending_registrations_delete" ON public.pending_registrations;

CREATE POLICY "pending_registrations_select"
ON public.pending_registrations FOR SELECT
USING (true);

CREATE POLICY "pending_registrations_insert"
ON public.pending_registrations FOR INSERT
WITH CHECK (true);

CREATE POLICY "pending_registrations_update"
ON public.pending_registrations FOR UPDATE
USING (true);

CREATE POLICY "pending_registrations_delete"
ON public.pending_registrations FOR DELETE
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_registrations TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- Wahj Reading Report Links
-- Stores immutable-ish snapshots for public, token-based individual reports.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wahj_reading_report_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  participant_key TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wahj_reading_report_links_token
ON public.wahj_reading_report_links(token);

CREATE INDEX IF NOT EXISTS idx_wahj_reading_report_links_created_by
ON public.wahj_reading_report_links(created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wahj_reading_report_links_subject
ON public.wahj_reading_report_links(subject_id, created_at DESC);

ALTER TABLE public.wahj_reading_report_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow teachers create wahj reading report links" ON public.wahj_reading_report_links;
DROP POLICY IF EXISTS "Allow creators read wahj reading report links" ON public.wahj_reading_report_links;
DROP POLICY IF EXISTS "Allow creators update wahj reading report links" ON public.wahj_reading_report_links;

CREATE POLICY "Allow teachers create wahj reading report links"
ON public.wahj_reading_report_links FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow creators read wahj reading report links"
ON public.wahj_reading_report_links FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow creators update wahj reading report links"
ON public.wahj_reading_report_links FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE
ON TABLE public.wahj_reading_report_links
TO authenticated;

GRANT INSERT
ON TABLE public.wahj_reading_report_links
TO anon;

CREATE OR REPLACE FUNCTION public.get_wahj_reading_report_by_token(report_token TEXT)
RETURNS TABLE (
  token TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.token,
    r.payload,
    r.created_at,
    r.updated_at
  FROM public.wahj_reading_report_links r
  WHERE r.token = report_token
    AND (r.expires_at IS NULL OR r.expires_at > NOW())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_wahj_reading_report_by_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_wahj_reading_report_by_token(TEXT) TO anon, authenticated;

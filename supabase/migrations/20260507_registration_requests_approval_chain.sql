-- Hierarchical approval chain:
-- SUPERADMIN > ADMIN > TEACHER > STUDENT
CREATE TABLE IF NOT EXISTS public.registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  applicant_role TEXT NOT NULL CHECK (applicant_role IN ('TEACHER', 'STUDENT', 'ADMIN')),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  grade_id UUID REFERENCES public.grades(id) ON DELETE SET NULL,
  teacher_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  requested_package TEXT CHECK (requested_package IS NULL OR requested_package IN ('INSTITUTION_ADMIN_STUDENT', 'INSTITUTION_FULL')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  approver_role TEXT NOT NULL CHECK (approver_role IN ('SUPERADMIN', 'ADMIN', 'TEACHER')),
  reviewed_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON public.registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_requests_org ON public.registration_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_registration_requests_teacher ON public.registration_requests(teacher_user_id, status);

ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registration_requests_select" ON public.registration_requests;
DROP POLICY IF EXISTS "registration_requests_insert" ON public.registration_requests;
DROP POLICY IF EXISTS "registration_requests_update" ON public.registration_requests;
DROP POLICY IF EXISTS "registration_requests_delete" ON public.registration_requests;

CREATE POLICY "registration_requests_select"
ON public.registration_requests FOR SELECT
USING (true);

CREATE POLICY "registration_requests_insert"
ON public.registration_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "registration_requests_update"
ON public.registration_requests FOR UPDATE
USING (true);

CREATE POLICY "registration_requests_delete"
ON public.registration_requests FOR DELETE
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registration_requests TO anon, authenticated;

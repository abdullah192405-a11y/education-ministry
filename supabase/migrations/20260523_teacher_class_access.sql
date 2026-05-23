-- Org/school admin assigns which grades (classes) and optionally subjects each teacher may manage.

CREATE TABLE IF NOT EXISTS public.teacher_grade_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_profile_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
    grade_id UUID NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (teacher_profile_id, grade_id)
);

CREATE TABLE IF NOT EXISTS public.teacher_subject_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_profile_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
    grade_id UUID NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (teacher_profile_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_grade_access_teacher
    ON public.teacher_grade_access(teacher_profile_id);

CREATE INDEX IF NOT EXISTS idx_teacher_subject_access_teacher_grade
    ON public.teacher_subject_access(teacher_profile_id, grade_id);

ALTER TABLE public.teacher_grade_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subject_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read teacher grade access" ON public.teacher_grade_access;
DROP POLICY IF EXISTS "Allow write teacher grade access" ON public.teacher_grade_access;
DROP POLICY IF EXISTS "Allow read teacher subject access" ON public.teacher_subject_access;
DROP POLICY IF EXISTS "Allow write teacher subject access" ON public.teacher_subject_access;

CREATE POLICY "Allow read teacher grade access" ON public.teacher_grade_access FOR SELECT USING (true);
CREATE POLICY "Allow write teacher grade access" ON public.teacher_grade_access FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow read teacher subject access" ON public.teacher_subject_access FOR SELECT USING (true);
CREATE POLICY "Allow write teacher subject access" ON public.teacher_subject_access FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_grade_access TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_subject_access TO anon, authenticated;

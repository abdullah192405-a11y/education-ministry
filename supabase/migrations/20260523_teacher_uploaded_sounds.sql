-- Per-teacher uploaded interaction sounds (correct / wrong / background).
-- Scoped to teacher_profiles — not shared across teachers.

CREATE TABLE IF NOT EXISTS public.teacher_uploaded_sounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
    sound_category TEXT NOT NULL CHECK (sound_category IN ('correct', 'wrong', 'background')),
    url TEXT NOT NULL CHECK (char_length(trim(url)) > 0),
    label TEXT,
    storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_uploaded_sounds_teacher_category
    ON public.teacher_uploaded_sounds(teacher_id, sound_category, created_at DESC);

ALTER TABLE public.teacher_uploaded_sounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read teacher uploaded sounds" ON public.teacher_uploaded_sounds;
DROP POLICY IF EXISTS "Allow insert teacher uploaded sounds" ON public.teacher_uploaded_sounds;
DROP POLICY IF EXISTS "Allow delete teacher uploaded sounds" ON public.teacher_uploaded_sounds;

CREATE POLICY "Allow read teacher uploaded sounds" ON public.teacher_uploaded_sounds FOR SELECT USING (true);
CREATE POLICY "Allow insert teacher uploaded sounds" ON public.teacher_uploaded_sounds FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete teacher uploaded sounds" ON public.teacher_uploaded_sounds FOR DELETE USING (true);

GRANT SELECT, INSERT, DELETE ON public.teacher_uploaded_sounds TO anon, authenticated;

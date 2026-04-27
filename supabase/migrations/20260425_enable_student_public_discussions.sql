-- ============================================================================
-- PUBLIC DISCUSSIONS FEATURE
-- Enables student discussion arena per topic + platform toggle
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.topic_discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(trim(content)) > 0),
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.topic_discussion_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID NOT NULL REFERENCES public.topic_discussions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(trim(content)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topic_discussions_topic_created
    ON public.topic_discussions(topic_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_topic_discussion_replies_discussion_created
    ON public.topic_discussion_replies(discussion_id, created_at ASC);

ALTER TABLE public.topic_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_discussion_replies ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_discussions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_discussion_replies TO anon, authenticated;

DROP POLICY IF EXISTS "Allow read topic discussions" ON public.topic_discussions;
DROP POLICY IF EXISTS "Allow insert topic discussions" ON public.topic_discussions;
DROP POLICY IF EXISTS "Allow update topic discussions" ON public.topic_discussions;
DROP POLICY IF EXISTS "Allow delete topic discussions" ON public.topic_discussions;
CREATE POLICY "Allow read topic discussions" ON public.topic_discussions FOR SELECT USING (true);
CREATE POLICY "Allow insert topic discussions" ON public.topic_discussions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update topic discussions" ON public.topic_discussions FOR UPDATE USING (true);
CREATE POLICY "Allow delete topic discussions" ON public.topic_discussions FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow read topic discussion replies" ON public.topic_discussion_replies;
DROP POLICY IF EXISTS "Allow insert topic discussion replies" ON public.topic_discussion_replies;
DROP POLICY IF EXISTS "Allow update topic discussion replies" ON public.topic_discussion_replies;
DROP POLICY IF EXISTS "Allow delete topic discussion replies" ON public.topic_discussion_replies;
CREATE POLICY "Allow read topic discussion replies" ON public.topic_discussion_replies FOR SELECT USING (true);
CREATE POLICY "Allow insert topic discussion replies" ON public.topic_discussion_replies FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update topic discussion replies" ON public.topic_discussion_replies FOR UPDATE USING (true);
CREATE POLICY "Allow delete topic discussion replies" ON public.topic_discussion_replies FOR DELETE USING (true);

INSERT INTO public.platform_settings (key, value, type, label, updated_at)
VALUES (
    'student_public_discussions_enabled',
    'true',
    'boolean',
    'تفعيل ساحة النقاش للطلاب',
    NOW()
)
ON CONFLICT (key) DO NOTHING;

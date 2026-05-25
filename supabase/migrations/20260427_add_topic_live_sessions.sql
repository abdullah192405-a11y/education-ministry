-- ============================================================================
-- LIVE STREAMING SESSIONS (Google Meet / Zoom / Microsoft Teams / custom links)
-- Allows teachers to publish scheduled or active live sessions per topic.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.topic_live_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS', 'CUSTOM')),
    meeting_url TEXT NOT NULL CHECK (char_length(trim(meeting_url)) > 0),
    title TEXT,
    notes TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT topic_live_sessions_time_window CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_topic_live_sessions_topic_time
    ON public.topic_live_sessions(topic_id, starts_at DESC);

CREATE INDEX IF NOT EXISTS idx_topic_live_sessions_teacher_time
    ON public.topic_live_sessions(teacher_id, starts_at DESC);

ALTER TABLE public.topic_live_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read topic live sessions" ON public.topic_live_sessions;
DROP POLICY IF EXISTS "Allow insert topic live sessions" ON public.topic_live_sessions;
DROP POLICY IF EXISTS "Allow update topic live sessions" ON public.topic_live_sessions;
DROP POLICY IF EXISTS "Allow delete topic live sessions" ON public.topic_live_sessions;
CREATE POLICY "Allow read topic live sessions" ON public.topic_live_sessions FOR SELECT USING (true);
CREATE POLICY "Allow insert topic live sessions" ON public.topic_live_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update topic live sessions" ON public.topic_live_sessions FOR UPDATE USING (true);
CREATE POLICY "Allow delete topic live sessions" ON public.topic_live_sessions FOR DELETE USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_live_sessions TO anon, authenticated;

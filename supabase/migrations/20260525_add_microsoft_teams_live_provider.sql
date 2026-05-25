-- Allow Microsoft Teams as a live session provider
ALTER TABLE public.topic_live_sessions
    DROP CONSTRAINT IF EXISTS topic_live_sessions_provider_check;

ALTER TABLE public.topic_live_sessions
    ADD CONSTRAINT topic_live_sessions_provider_check
    CHECK (provider IN ('GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS', 'CUSTOM'));

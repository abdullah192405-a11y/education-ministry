-- Allow anonymous lesson ratings via stable guest_id (localStorage on client).

ALTER TABLE public.topic_ratings
    ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.topic_ratings
    ADD COLUMN IF NOT EXISTS guest_id TEXT;

ALTER TABLE public.topic_ratings
    DROP CONSTRAINT IF EXISTS topic_ratings_topic_id_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_topic_ratings_topic_user_unique
    ON public.topic_ratings (topic_id, user_id)
    WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_topic_ratings_topic_guest_unique
    ON public.topic_ratings (topic_id, guest_id)
    WHERE guest_id IS NOT NULL;

ALTER TABLE public.topic_ratings
    DROP CONSTRAINT IF EXISTS topic_ratings_has_rater;

ALTER TABLE public.topic_ratings
    ADD CONSTRAINT topic_ratings_has_rater
    CHECK (user_id IS NOT NULL OR guest_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_topic_ratings_guest_id
    ON public.topic_ratings (guest_id)
    WHERE guest_id IS NOT NULL;

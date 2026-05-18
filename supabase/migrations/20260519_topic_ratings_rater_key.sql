-- PostgREST upsert requires a non-partial UNIQUE constraint (partial indexes fail with ON CONFLICT).

ALTER TABLE public.topic_ratings
    ADD COLUMN IF NOT EXISTS rater_key TEXT;

UPDATE public.topic_ratings
SET rater_key = CASE
    WHEN user_id IS NOT NULL THEN 'user:' || user_id::text
    WHEN guest_id IS NOT NULL THEN 'guest:' || guest_id
    ELSE rater_key
END
WHERE rater_key IS NULL;

DELETE FROM public.topic_ratings
WHERE rater_key IS NULL;

ALTER TABLE public.topic_ratings
    ALTER COLUMN rater_key SET NOT NULL;

DROP INDEX IF EXISTS public.idx_topic_ratings_topic_user_unique;
DROP INDEX IF EXISTS public.idx_topic_ratings_topic_guest_unique;

ALTER TABLE public.topic_ratings
    DROP CONSTRAINT IF EXISTS topic_ratings_topic_id_rater_key_key;

ALTER TABLE public.topic_ratings
    ADD CONSTRAINT topic_ratings_topic_id_rater_key_key UNIQUE (topic_id, rater_key);

CREATE INDEX IF NOT EXISTS idx_topic_ratings_rater_key
    ON public.topic_ratings (rater_key);

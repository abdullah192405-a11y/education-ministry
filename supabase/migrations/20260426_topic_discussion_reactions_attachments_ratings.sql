-- WhatsApp-like discussion enhancements:
-- - Attachments and stickers on discussions/replies
-- - Emoji reactions
-- - Topic ratings

ALTER TABLE public.topic_discussions
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT,
ADD COLUMN IF NOT EXISTS sticker TEXT;

ALTER TABLE public.topic_discussion_replies
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_type TEXT,
ADD COLUMN IF NOT EXISTS sticker TEXT;

CREATE TABLE IF NOT EXISTS public.topic_discussion_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID REFERENCES public.topic_discussions(id) ON DELETE CASCADE,
    reply_id UUID REFERENCES public.topic_discussion_replies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL CHECK (char_length(trim(emoji)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT topic_discussion_reactions_one_target CHECK (
        (discussion_id IS NOT NULL AND reply_id IS NULL) OR
        (discussion_id IS NULL AND reply_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_topic_discussion_reactions_discussion
    ON public.topic_discussion_reactions(user_id, discussion_id, emoji)
    WHERE discussion_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_topic_discussion_reactions_reply
    ON public.topic_discussion_reactions(user_id, reply_id, emoji)
    WHERE reply_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_topic_discussion_reactions_discussion_id
    ON public.topic_discussion_reactions(discussion_id);

CREATE INDEX IF NOT EXISTS idx_topic_discussion_reactions_reply_id
    ON public.topic_discussion_reactions(reply_id);

CREATE TABLE IF NOT EXISTS public.topic_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(topic_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_topic_ratings_topic_id
    ON public.topic_ratings(topic_id);

ALTER TABLE public.topic_discussion_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read topic discussion reactions" ON public.topic_discussion_reactions;
DROP POLICY IF EXISTS "Allow insert topic discussion reactions" ON public.topic_discussion_reactions;
DROP POLICY IF EXISTS "Allow update topic discussion reactions" ON public.topic_discussion_reactions;
DROP POLICY IF EXISTS "Allow delete topic discussion reactions" ON public.topic_discussion_reactions;
CREATE POLICY "Allow read topic discussion reactions" ON public.topic_discussion_reactions FOR SELECT USING (true);
CREATE POLICY "Allow insert topic discussion reactions" ON public.topic_discussion_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update topic discussion reactions" ON public.topic_discussion_reactions FOR UPDATE USING (true);
CREATE POLICY "Allow delete topic discussion reactions" ON public.topic_discussion_reactions FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow read topic ratings" ON public.topic_ratings;
DROP POLICY IF EXISTS "Allow insert topic ratings" ON public.topic_ratings;
DROP POLICY IF EXISTS "Allow update topic ratings" ON public.topic_ratings;
DROP POLICY IF EXISTS "Allow delete topic ratings" ON public.topic_ratings;
CREATE POLICY "Allow read topic ratings" ON public.topic_ratings FOR SELECT USING (true);
CREATE POLICY "Allow insert topic ratings" ON public.topic_ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update topic ratings" ON public.topic_ratings FOR UPDATE USING (true);
CREATE POLICY "Allow delete topic ratings" ON public.topic_ratings FOR DELETE USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_discussion_reactions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_ratings TO anon, authenticated;

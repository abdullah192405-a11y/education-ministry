-- ============================================================================
-- Wahj participant profiles and intake attempts (linked across tries)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wahj_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wahj_participants_reference_id
ON public.wahj_participants(reference_id);

CREATE INDEX IF NOT EXISTS idx_wahj_participants_subject_id
ON public.wahj_participants(subject_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wahj_reading_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES public.wahj_participants(id) ON DELETE CASCADE,
  challenge_result_id UUID REFERENCES public.challenge_results(id) ON DELETE SET NULL,
  topic_id TEXT NOT NULL,
  pages_read INT NOT NULL DEFAULT 0 CHECK (pages_read >= 0),
  benefits_count INT NOT NULL DEFAULT 0 CHECK (benefits_count >= 0),
  discussion_attendance TEXT NOT NULL CHECK (discussion_attendance IN ('full', 'partial', 'none')),
  enrichment_attendance TEXT NOT NULL CHECK (enrichment_attendance IN ('full', 'partial', 'none')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wahj_reading_attempts_participant
ON public.wahj_reading_attempts(participant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wahj_reading_attempts_result
ON public.wahj_reading_attempts(challenge_result_id);

ALTER TABLE public.wahj_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wahj_reading_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert wahj participants" ON public.wahj_participants;
DROP POLICY IF EXISTS "Allow read wahj participants" ON public.wahj_participants;
DROP POLICY IF EXISTS "Allow insert wahj reading attempts" ON public.wahj_reading_attempts;
DROP POLICY IF EXISTS "Allow read wahj reading attempts" ON public.wahj_reading_attempts;
DROP POLICY IF EXISTS "Allow update wahj reading attempts" ON public.wahj_reading_attempts;

CREATE POLICY "Allow insert wahj participants"
ON public.wahj_participants FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow read wahj participants"
ON public.wahj_participants FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow insert wahj reading attempts"
ON public.wahj_reading_attempts FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow read wahj reading attempts"
ON public.wahj_reading_attempts FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow update wahj reading attempts"
ON public.wahj_reading_attempts FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT ON public.wahj_participants TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.wahj_reading_attempts TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.generate_wahj_reference_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'WJ-';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_wahj_participant(
  p_display_name TEXT,
  p_subject_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_reference_id TEXT;
  v_attempt INT := 0;
BEGIN
  IF coalesce(trim(p_display_name), '') = '' OR coalesce(trim(p_subject_id), '') = '' THEN
    RAISE EXCEPTION 'display_name and subject_id are required';
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    v_reference_id := public.generate_wahj_reference_id();
    BEGIN
      INSERT INTO public.wahj_participants (reference_id, display_name, subject_id)
      VALUES (v_reference_id, trim(p_display_name), trim(p_subject_id))
      RETURNING id INTO v_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= 8 THEN
        RAISE EXCEPTION 'Could not generate unique Wahj reference id';
      END IF;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'participant_id', v_id,
    'reference_id', v_reference_id,
    'display_name', trim(p_display_name)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_wahj_participant(
  p_reference_id TEXT,
  p_subject_id TEXT
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH participant AS (
    SELECT p.id, p.reference_id, p.display_name
    FROM public.wahj_participants p
    WHERE upper(trim(p.reference_id)) = upper(trim(p_reference_id))
      AND p.subject_id = trim(p_subject_id)
    LIMIT 1
  ),
  last_attempt AS (
    SELECT a.pages_read, a.benefits_count, a.discussion_attendance, a.enrichment_attendance, a.created_at
    FROM public.wahj_reading_attempts a
    JOIN participant p ON p.id = a.participant_id
    ORDER BY a.created_at DESC
    LIMIT 1
  ),
  totals AS (
    SELECT
      count(*)::int AS attempt_count,
      coalesce(sum(a.pages_read), 0)::int AS total_pages,
      coalesce(sum(a.benefits_count), 0)::int AS total_benefits
    FROM public.wahj_reading_attempts a
    JOIN participant p ON p.id = a.participant_id
  )
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM participant) THEN NULL
    ELSE jsonb_build_object(
      'participant_id', (SELECT id FROM participant),
      'reference_id', (SELECT reference_id FROM participant),
      'display_name', (SELECT display_name FROM participant),
      'attempt_count', (SELECT attempt_count FROM totals),
      'total_pages', (SELECT total_pages FROM totals),
      'total_benefits', (SELECT total_benefits FROM totals),
      'last_attempt', (
        SELECT jsonb_build_object(
          'pages_read', pages_read,
          'benefits_count', benefits_count,
          'discussion_attendance', discussion_attendance,
          'enrichment_attendance', enrichment_attendance,
          'created_at', created_at
        )
        FROM last_attempt
      )
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.create_wahj_reading_attempt(
  p_participant_id UUID,
  p_topic_id TEXT,
  p_pages_read INT,
  p_benefits_count INT,
  p_discussion_attendance TEXT,
  p_enrichment_attendance TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_participant_id IS NULL OR coalesce(trim(p_topic_id), '') = '' THEN
    RAISE EXCEPTION 'participant_id and topic_id are required';
  END IF;

  IF p_discussion_attendance NOT IN ('full', 'partial', 'none')
     OR p_enrichment_attendance NOT IN ('full', 'partial', 'none') THEN
    RAISE EXCEPTION 'invalid attendance value';
  END IF;

  INSERT INTO public.wahj_reading_attempts (
    participant_id,
    topic_id,
    pages_read,
    benefits_count,
    discussion_attendance,
    enrichment_attendance
  )
  VALUES (
    p_participant_id,
    trim(p_topic_id),
    greatest(0, coalesce(p_pages_read, 0)),
    greatest(0, coalesce(p_benefits_count, 0)),
    p_discussion_attendance,
    p_enrichment_attendance
  )
  RETURNING id INTO v_id;

  UPDATE public.wahj_participants
  SET updated_at = NOW()
  WHERE id = p_participant_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_wahj_attempt_to_result(
  p_attempt_id UUID,
  p_challenge_result_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.wahj_reading_attempts
  SET challenge_result_id = p_challenge_result_id
  WHERE id = p_attempt_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_wahj_intake_for_subject(p_subject_id TEXT)
RETURNS TABLE (
  participant_id UUID,
  reference_id TEXT,
  display_name TEXT,
  participant_key TEXT,
  attempt_id UUID,
  challenge_result_id UUID,
  topic_id TEXT,
  pages_read INT,
  benefits_count INT,
  discussion_attendance TEXT,
  enrichment_attendance TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS participant_id,
    p.reference_id,
    p.display_name,
    'wahj:' || p.id::text AS participant_key,
    a.id AS attempt_id,
    a.challenge_result_id,
    a.topic_id,
    a.pages_read,
    a.benefits_count,
    a.discussion_attendance,
    a.enrichment_attendance,
    a.created_at
  FROM public.wahj_participants p
  JOIN public.wahj_reading_attempts a ON a.participant_id = p.id
  WHERE p.subject_id = trim(p_subject_id)
  ORDER BY a.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.generate_wahj_reference_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_wahj_participant(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lookup_wahj_participant(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_wahj_reading_attempt(UUID, TEXT, INT, INT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.link_wahj_attempt_to_result(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_wahj_intake_for_subject(TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_wahj_participant(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_wahj_participant(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_wahj_reading_attempt(UUID, TEXT, INT, INT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_wahj_attempt_to_result(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_wahj_intake_for_subject(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.attach_wahj_extra_to_challenge_result(
  p_challenge_result_id UUID,
  p_participant_extra TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_challenge_result_id IS NULL THEN
    RAISE EXCEPTION 'challenge_result_id is required';
  END IF;

  UPDATE public.challenge_results
  SET participant_extra = p_participant_extra
  WHERE id = p_challenge_result_id;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_wahj_extra_to_challenge_result(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attach_wahj_extra_to_challenge_result(UUID, TEXT) TO anon, authenticated;

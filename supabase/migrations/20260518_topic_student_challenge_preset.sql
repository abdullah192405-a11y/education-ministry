-- Teacher can lock how students enter challenges (mode + category) for a lesson.
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS student_challenge_mode text,
  ADD COLUMN IF NOT EXISTS student_challenge_category text;

ALTER TABLE public.topics
  DROP CONSTRAINT IF EXISTS topics_student_challenge_mode_check;

ALTER TABLE public.topics
  ADD CONSTRAINT topics_student_challenge_mode_check
  CHECK (student_challenge_mode IS NULL OR student_challenge_mode IN ('single', 'group'));

ALTER TABLE public.topics
  DROP CONSTRAINT IF EXISTS topics_student_challenge_category_check;

ALTER TABLE public.topics
  ADD CONSTRAINT topics_student_challenge_category_check
  CHECK (
    student_challenge_category IS NULL
    OR student_challenge_category IN ('activities', 'games', 'mixed')
  );

COMMENT ON COLUMN public.topics.student_challenge_mode IS
  'When set with student_challenge_category, students skip challenge mode selection (single or group).';
COMMENT ON COLUMN public.topics.student_challenge_category IS
  'When set with student_challenge_mode, students skip activity category selection.';

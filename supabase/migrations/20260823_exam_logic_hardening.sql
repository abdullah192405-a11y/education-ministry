-- ============================================================================
-- EXAMS - Logic hardening
--
-- 1. Adds the columns the application already relies on but that were never
--    captured in a migration (exams.grade_id, challenge_questions.exam_id).
-- 2. Tracks attempts so `max_attempts` is actually enforceable.
-- 3. Enforces the submission window and the attempt limit in the database, so
--    the rules hold even though RLS on these tables is permissive and the
--    client is therefore not trustworthy.
--
-- All statements are idempotent: safe to run against a database where some of
-- this was already applied by `prisma db push`.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Missing columns / indexes
-- ---------------------------------------------------------------------------
ALTER TABLE exams
    ADD COLUMN IF NOT EXISTS grade_id UUID REFERENCES grades(id) ON DELETE SET NULL;

ALTER TABLE challenge_questions
    ADD COLUMN IF NOT EXISTS exam_id UUID REFERENCES exams(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_exams_grade ON exams(grade_id);
CREATE INDEX IF NOT EXISTS idx_challenge_questions_exam ON challenge_questions(exam_id);
-- The student runner reads a paper ordered by sort_order.
CREATE INDEX IF NOT EXISTS idx_challenge_questions_exam_sort ON challenge_questions(exam_id, sort_order);

-- ---------------------------------------------------------------------------
-- 2. Attempt tracking
--
-- There is one result row per (exam, student); a permitted retake overwrites it
-- and bumps the counter, so the limit survives even without attempt history.
-- ---------------------------------------------------------------------------
ALTER TABLE exam_results
    ADD COLUMN IF NOT EXISTS attempts_used INT NOT NULL DEFAULT 1;

-- ---------------------------------------------------------------------------
-- 3. Sane bounds on the exam settings themselves
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exams_duration_positive') THEN
        ALTER TABLE exams
            ADD CONSTRAINT exams_duration_positive
            CHECK (duration_minutes IS NULL OR duration_minutes > 0) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exams_max_attempts_positive') THEN
        ALTER TABLE exams
            ADD CONSTRAINT exams_max_attempts_positive
            CHECK (max_attempts IS NULL OR max_attempts >= 1) NOT VALID;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Submission guard
--
-- A student can reach PostgREST directly, so "the exam is over" and "you have
-- no attempts left" cannot be client-side rules. A grace period covers a
-- submission that was already in flight when the window closed.
--
-- Bulk data repair that legitimately needs to bypass this can
-- `ALTER TABLE exam_results DISABLE TRIGGER enforce_exam_result_rules;`.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_exam_result_rules()
RETURNS TRIGGER AS $$
DECLARE
    v_exam       exams%ROWTYPE;
    v_grace      INTERVAL := INTERVAL '10 minutes';
    v_max        INT;
BEGIN
    SELECT * INTO v_exam FROM exams WHERE id = NEW.exam_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Exam % does not exist', NEW.exam_id
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF v_exam.status = 'DRAFT' THEN
        RAISE EXCEPTION 'Exam % is still a draft and cannot accept submissions', NEW.exam_id
            USING ERRCODE = 'check_violation';
    END IF;

    IF NOW() < v_exam.start_time OR NOW() > v_exam.end_time + v_grace THEN
        RAISE EXCEPTION 'Exam % is not open for submissions', NEW.exam_id
            USING ERRCODE = 'check_violation';
    END IF;

    v_max := COALESCE(v_exam.max_attempts, 1);
    IF COALESCE(NEW.attempts_used, 1) > v_max THEN
        RAISE EXCEPTION 'Exam % allows at most % attempt(s)', NEW.exam_id, v_max
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_exam_result_rules ON exam_results;
CREATE TRIGGER enforce_exam_result_rules
    BEFORE INSERT OR UPDATE ON exam_results
    FOR EACH ROW EXECUTE FUNCTION enforce_exam_result_rules();

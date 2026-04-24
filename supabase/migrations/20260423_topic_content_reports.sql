-- ============================================================================
-- Topic Content Reports
-- Stores precomputed content analytics per topic for teacher dashboards
-- ============================================================================

CREATE TABLE IF NOT EXISTS topic_content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  teacher_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  viewers INT NOT NULL DEFAULT 0,
  unique_viewers INT NOT NULL DEFAULT 0,

  total_attempts INT NOT NULL DEFAULT 0,
  single_attempts INT NOT NULL DEFAULT 0,
  group_attempts INT NOT NULL DEFAULT 0,

  unique_participants INT NOT NULL DEFAULT 0,
  unique_single_participants INT NOT NULL DEFAULT 0,
  unique_group_participants INT NOT NULL DEFAULT 0,

  average_score_overall INT NOT NULL DEFAULT 0,
  average_score_single INT NOT NULL DEFAULT 0,
  average_score_group INT NOT NULL DEFAULT 0,
  highest_score INT NOT NULL DEFAULT 0,
  pass_rate INT NOT NULL DEFAULT 0,

  last_attempt_at TIMESTAMPTZ,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(topic_id)
);

CREATE INDEX IF NOT EXISTS idx_topic_content_reports_topic_id ON topic_content_reports(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_content_reports_teacher_id ON topic_content_reports(teacher_user_id);
CREATE INDEX IF NOT EXISTS idx_topic_content_reports_computed_at ON topic_content_reports(computed_at DESC);

ALTER TABLE topic_content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read topic_content_reports" ON topic_content_reports;
DROP POLICY IF EXISTS "Allow insert topic_content_reports" ON topic_content_reports;
DROP POLICY IF EXISTS "Allow update topic_content_reports" ON topic_content_reports;
DROP POLICY IF EXISTS "Allow delete topic_content_reports" ON topic_content_reports;

CREATE POLICY "Allow read topic_content_reports"
ON topic_content_reports FOR SELECT
USING (true);

CREATE POLICY "Allow insert topic_content_reports"
ON topic_content_reports FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update topic_content_reports"
ON topic_content_reports FOR UPDATE
USING (true);

CREATE POLICY "Allow delete topic_content_reports"
ON topic_content_reports FOR DELETE
USING (true);


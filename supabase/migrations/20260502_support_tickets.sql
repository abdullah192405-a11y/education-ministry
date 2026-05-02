-- Support tickets: students → teachers (by grade), teachers → admin, escalations
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name_snapshot TEXT,
  grade_id UUID REFERENCES grades(id) ON DELETE SET NULL,
  scope TEXT NOT NULL CHECK (scope IN ('STUDENT_TO_TEACHER', 'TEACHER_TO_ADMIN')),
  ticket_type TEXT NOT NULL DEFAULT 'OTHER',
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  attachment_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED')),
  parent_ticket_id UUID REFERENCES support_tickets(id) ON DELETE SET NULL,
  teacher_escalation_note TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_author ON support_tickets(author_user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_grade_scope_status ON support_tickets(grade_id, scope, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_scope_status ON support_tickets(scope, status);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read support_tickets" ON support_tickets;
DROP POLICY IF EXISTS "Allow insert support_tickets" ON support_tickets;
DROP POLICY IF EXISTS "Allow update support_tickets" ON support_tickets;
DROP POLICY IF EXISTS "Allow delete support_tickets" ON support_tickets;

CREATE POLICY "Allow read support_tickets"
ON support_tickets FOR SELECT
USING (true);

CREATE POLICY "Allow insert support_tickets"
ON support_tickets FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update support_tickets"
ON support_tickets FOR UPDATE
USING (true);

CREATE POLICY "Allow delete support_tickets"
ON support_tickets FOR DELETE
USING (true);

-- PostgREST (anon / authenticated) must be able to use the table; RLS still applies.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO anon, authenticated;

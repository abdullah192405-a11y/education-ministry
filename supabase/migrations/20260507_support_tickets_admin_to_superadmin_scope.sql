-- Add scope for organization admin escalation to superadmin.
ALTER TABLE public.support_tickets
DROP CONSTRAINT IF EXISTS support_tickets_scope_check;

ALTER TABLE public.support_tickets
ADD CONSTRAINT support_tickets_scope_check
CHECK (scope IN ('STUDENT_TO_TEACHER', 'TEACHER_TO_ADMIN', 'ADMIN_TO_SUPERADMIN'));

-- ============================================================================
-- ADMIN USER MANAGEMENT
--
-- Deleting a student or teacher from the org admin panel currently fails when
-- the account has ever played a challenge or produced an audit entry: those two
-- foreign keys still default to NO ACTION.
--
-- Both columns are nullable, so they are detached rather than cascaded — a game
-- session keeps its player row and the audit trail keeps its entry, which is the
-- point of an audit trail.
--
-- Idempotent: safe to re-run.
-- ============================================================================

DO $$
BEGIN
    -- player_sessions.user_id -> users.id (SET NULL, keeps the session record)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'player_sessions'
          AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.player_sessions
            DROP CONSTRAINT IF EXISTS player_sessions_user_id_fkey;

        ALTER TABLE public.player_sessions
            ADD CONSTRAINT player_sessions_user_id_fkey
            FOREIGN KEY (user_id)
            REFERENCES public.users(id)
            ON DELETE SET NULL;
    END IF;

    -- audit_logs.user_id -> users.id (SET NULL, keeps the trail)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'audit_logs'
          AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.audit_logs
            DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

        ALTER TABLE public.audit_logs
            ADD CONSTRAINT audit_logs_user_id_fkey
            FOREIGN KEY (user_id)
            REFERENCES public.users(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- The admin tables filter students and teachers by organization and class.
CREATE INDEX IF NOT EXISTS idx_users_organization_role ON users(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_student_profiles_grade ON student_profiles(grade_id);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_grade ON teacher_profiles(grade_id);

-- Allow deleting a student user with automatic cleanup
-- of scores/challenge result records.

-- NOTE:
-- challenge_answers does NOT have user_id; it links via result_id.
-- Once challenge_results is cascaded, challenge_answers are deleted via
-- challenge_answers.result_id -> challenge_results.id (already CASCADE).

DO $$
BEGIN
    -- challenge_results.user_id -> users.id (CASCADE)
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'challenge_results'
          AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.challenge_results
            DROP CONSTRAINT IF EXISTS challenge_results_user_id_fkey;

        ALTER TABLE public.challenge_results
            ADD CONSTRAINT challenge_results_user_id_fkey
            FOREIGN KEY (user_id)
            REFERENCES public.users(id)
            ON DELETE CASCADE;
    END IF;

    -- exam_results.user_id -> users.id (CASCADE)
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'exam_results'
          AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.exam_results
            DROP CONSTRAINT IF EXISTS exam_results_user_id_fkey;

        ALTER TABLE public.exam_results
            ADD CONSTRAINT exam_results_user_id_fkey
            FOREIGN KEY (user_id)
            REFERENCES public.users(id)
            ON DELETE CASCADE;
    END IF;
END $$;

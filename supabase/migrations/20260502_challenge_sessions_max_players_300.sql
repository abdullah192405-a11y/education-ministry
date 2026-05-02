-- Raise default lobby capacity (was 30).
ALTER TABLE public.challenge_sessions
  ALTER COLUMN max_players SET DEFAULT 300;

-- Align existing sessions that still had the old default.
UPDATE public.challenge_sessions
SET max_players = 300
WHERE max_players = 30;

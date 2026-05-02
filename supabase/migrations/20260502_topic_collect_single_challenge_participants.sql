-- Optional teacher setting: require name / extra details before anonymous single-challenge play.
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS collect_single_challenge_participant_data boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.topics.collect_single_challenge_participant_data IS
  'When true, guests must enter display name (and optional notes) before starting the single-player challenge; results store participant_display_name.';

-- Allow recording single-challenge results without a platform user (guests who identified themselves).
ALTER TABLE public.challenge_results
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.challenge_results
  ADD COLUMN IF NOT EXISTS participant_display_name text,
  ADD COLUMN IF NOT EXISTS participant_extra text;

COMMENT ON COLUMN public.challenge_results.participant_display_name IS
  'When user_id is null, name entered by guest for teacher reporting.';
COMMENT ON COLUMN public.challenge_results.participant_extra IS
  'Optional extra info from guest (e.g. class) when user_id is null.';

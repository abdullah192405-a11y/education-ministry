-- Optional video and audio attachments on challenge/exam questions
ALTER TABLE public.challenge_questions
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Add per-question analytics cache to topic_content_reports
ALTER TABLE public.topic_content_reports
ADD COLUMN IF NOT EXISTS question_analytics JSONB NOT NULL DEFAULT '[]'::jsonb;


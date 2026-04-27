-- Enable/disable public discussions per topic (content-level control)
ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS discussions_enabled BOOLEAN NOT NULL DEFAULT true;


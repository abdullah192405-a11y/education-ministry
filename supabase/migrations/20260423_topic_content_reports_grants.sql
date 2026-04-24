-- Ensure anon/authenticated roles can use topic_content_reports with RLS policies.
-- This fixes guest single-challenge flows that upsert analytics from the client.

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.topic_content_reports
TO anon, authenticated;


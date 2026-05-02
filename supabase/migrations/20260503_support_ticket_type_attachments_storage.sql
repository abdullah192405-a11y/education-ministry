-- Ticket classification + image attachments (URLs in JSON).
-- Run this migration if you see: Could not find the 'attachment_urls' column ... schema cache
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS ticket_type TEXT NOT NULL DEFAULT 'OTHER',
  ADD COLUMN IF NOT EXISTS attachment_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE support_tickets SET ticket_type = COALESCE(ticket_type, 'OTHER');

-- Refresh PostgREST schema cache (Supabase API)
NOTIFY pgrst, 'reload schema';

-- Storage for ticket screenshots (public read; app uses anon client like other buckets)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-tickets',
  'support-tickets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  public = true;

DROP POLICY IF EXISTS "support_tickets_select" ON storage.objects;
DROP POLICY IF EXISTS "support_tickets_insert" ON storage.objects;
DROP POLICY IF EXISTS "support_tickets_update" ON storage.objects;
DROP POLICY IF EXISTS "support_tickets_delete" ON storage.objects;

CREATE POLICY "support_tickets_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'support-tickets');

CREATE POLICY "support_tickets_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'support-tickets');

CREATE POLICY "support_tickets_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'support-tickets');

CREATE POLICY "support_tickets_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'support-tickets');

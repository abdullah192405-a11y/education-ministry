-- Student display name on ticket (RLS often blocks reading other rows in `users` from the client)
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS author_name_snapshot TEXT;

UPDATE support_tickets st
SET author_name_snapshot = u.name
FROM public.users u
WHERE st.author_user_id = u.id
  AND (st.author_name_snapshot IS NULL OR TRIM(st.author_name_snapshot) = '');

-- Resolve author rows for support-ticket UIs (bypasses RLS on users for these reads only)
CREATE OR REPLACE FUNCTION public.support_ticket_resolve_authors(p_ids uuid[])
RETURNS TABLE (author_id uuid, name text, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT u.id, u.name, u.email
  FROM public.users u
  WHERE u.id = ANY(p_ids);
$$;

GRANT EXECUTE ON FUNCTION public.support_ticket_resolve_authors(uuid[]) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

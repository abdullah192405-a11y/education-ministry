-- Fix "permission denied for table organizations" for client queries.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organizations TO anon, authenticated;

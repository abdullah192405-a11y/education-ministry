-- Fix: permission denied for table support_tickets (client uses anon / authenticated)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

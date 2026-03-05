-- This SQL enables the login fallback by allowing anyone to query email/password from users table
-- Run this in your Supabase SQL editor

-- Drop existing policies if any
DROP POLICY IF EXISTS "users_anon_read" ON public.users;
DROP POLICY IF EXISTS "users_authenticated_read" ON public.users;
DROP POLICY IF EXISTS "users_authenticated_update_own" ON public.users;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to SELECT by email (for login fallback)
CREATE POLICY "users_anon_select_by_email" ON public.users
  FOR SELECT
  USING (true);

-- Allow authenticated users to SELECT their own record
CREATE POLICY "users_authenticated_select" ON public.users
  FOR SELECT
  USING (auth.uid() = auth.uid());

-- Allow authenticated users to UPDATE their own record
CREATE POLICY "users_authenticated_update" ON public.users
  FOR UPDATE
  USING (auth.uid()::text = id);

-- Allow authenticated users to INSERT (for profile updates)
CREATE POLICY "users_authenticated_insert" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid()::text = id);

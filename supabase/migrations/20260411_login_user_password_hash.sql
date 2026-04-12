-- DB-backed login fallback (used when Supabase Auth has no matching user)
-- Ensures admin@gmail.com / 123456 works after migrate / db push.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS password_hash text;

CREATE OR REPLACE FUNCTION public.login_user(p_email text, p_password text)
RETURNS TABLE(
  id uuid,
  email text,
  name text,
  role text,
  verified boolean,
  is_active boolean,
  success boolean,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_password_hash text;
BEGIN
  SELECT users.id, users.email, users.name, users.role, users.verified, users.is_active, users.password_hash
  INTO v_user
  FROM users
  WHERE lower(trim(users.email)) = lower(trim(p_email))
    AND users.is_active = true;

  IF v_user IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::boolean, NULL::boolean, false, 'User not found or inactive';
    RETURN;
  END IF;

  IF v_user.password_hash IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::boolean, NULL::boolean, false, 'Invalid credentials';
    RETURN;
  END IF;

  v_password_hash := md5(p_password);

  IF v_password_hash = v_user.password_hash THEN
    RETURN QUERY SELECT v_user.id, v_user.email, v_user.name, v_user.role::text, v_user.verified, v_user.is_active, true, 'Login successful';
  ELSE
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::text, NULL::boolean, NULL::boolean, false, 'Invalid credentials';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_user(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.login_user(text, text) TO authenticated;

-- Only touches the existing admin row (no INSERTs, no other rows).
UPDATE public.users
SET password_hash = md5('123456')
WHERE lower(trim(email)) = 'admin@gmail.com';

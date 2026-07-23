-- Pending email verification for signup (PIN + activation link)
CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL,
  role text NOT NULL,
  organization_id uuid NULL,
  grade_id uuid NULL,
  password_hash text NOT NULL,
  password_temp text NOT NULL,
  pin text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pending_registrations_email_idx
  ON public.pending_registrations (lower(email));

CREATE INDEX IF NOT EXISTS pending_registrations_pin_email_idx
  ON public.pending_registrations (pin, lower(email));

-- Professional subscription management layer for organizations.
CREATE TABLE IF NOT EXISTS public.organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_package TEXT NOT NULL CHECK (subscription_package IN ('INSTITUTION_ADMIN_STUDENT', 'INSTITUTION_FULL')),
  billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (billing_cycle IN ('MONTHLY', 'YEARLY')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELED')),
  price_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'SAR',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  next_billing_at TIMESTAMPTZ,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status ON public.organization_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_next_billing ON public.organization_subscriptions(next_billing_at);

ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organization_subscriptions_select" ON public.organization_subscriptions;
DROP POLICY IF EXISTS "organization_subscriptions_insert" ON public.organization_subscriptions;
DROP POLICY IF EXISTS "organization_subscriptions_update" ON public.organization_subscriptions;
DROP POLICY IF EXISTS "organization_subscriptions_delete" ON public.organization_subscriptions;

CREATE POLICY "organization_subscriptions_select"
ON public.organization_subscriptions FOR SELECT
USING (true);

CREATE POLICY "organization_subscriptions_insert"
ON public.organization_subscriptions FOR INSERT
WITH CHECK (true);

CREATE POLICY "organization_subscriptions_update"
ON public.organization_subscriptions FOR UPDATE
USING (true);

CREATE POLICY "organization_subscriptions_delete"
ON public.organization_subscriptions FOR DELETE
USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_subscriptions TO anon, authenticated;

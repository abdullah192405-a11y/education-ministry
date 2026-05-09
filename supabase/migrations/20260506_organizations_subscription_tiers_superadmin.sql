-- Multi-tenant foundation: organizations (باقات مؤسسات)، أفراد (individual_tier)، دور SUPERADMIN

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL CHECK (kind IN ('EDUCATIONAL', 'ENRICHMENT')),
    subscription_package TEXT NOT NULL CHECK (subscription_package IN (
        'INSTITUTION_ADMIN_STUDENT',
        'INSTITUTION_FULL'
    )),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations (slug);

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS individual_tier TEXT CHECK (individual_tier IS NULL OR individual_tier = 'INDIVIDUAL_FREE');

CREATE INDEX IF NOT EXISTS idx_users_organization_id ON public.users (organization_id);

COMMENT ON TABLE public.organizations IS 'مؤسسة مشتراة من السوبر أدمن: تعليمي/إثرائي + باقة (أدمن+طالب أو أدمن+معلم+طالب)';
COMMENT ON COLUMN public.users.organization_id IS 'ربط المستخدم بمؤسسة (باقات ٢ و٣). فارغ للأفراد.';
COMMENT ON COLUMN public.users.individual_tier IS 'باقة الأفراد: INDIVIDUAL_FREE = إثرائي مجاني بدون رقابة/تتبع. NULL = سلوك قديم/كامل المنصة.';

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organizations_select" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "organizations_insert" ON public.organizations FOR INSERT WITH CHECK (true);
CREATE POLICY "organizations_update" ON public.organizations FOR UPDATE USING (true);
CREATE POLICY "organizations_delete" ON public.organizations FOR DELETE USING (true);

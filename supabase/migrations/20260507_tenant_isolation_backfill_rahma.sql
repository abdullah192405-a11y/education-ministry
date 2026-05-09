-- Tenant isolation: tie classes/users to organization
-- and backfill existing data under:
-- admin@gmail.com + مؤسسة الرحمة

ALTER TABLE public.grades
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_grades_organization_id ON public.grades(organization_id);

DO $$
DECLARE
    v_org_id UUID;
BEGIN
    SELECT id
    INTO v_org_id
    FROM public.organizations
    WHERE name = 'مؤسسة الرحمة'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_org_id IS NULL THEN
        INSERT INTO public.organizations (
            name, slug, kind, subscription_package, is_active, created_at, updated_at
        ) VALUES (
            'مؤسسة الرحمة',
            'alrahma-school',
            'BOTH',
            'INSTITUTION_FULL',
            true,
            now(),
            now()
        )
        RETURNING id INTO v_org_id;
    END IF;

    -- Ensure the known admin is linked and active
    UPDATE public.users
    SET
        role = 'ADMIN',
        organization_id = v_org_id,
        is_active = true,
        verified = true,
        updated_at = now()
    WHERE lower(email) = 'admin@gmail.com';

    -- Put existing classes under مؤسسة الرحمة when unassigned
    UPDATE public.grades
    SET organization_id = v_org_id
    WHERE organization_id IS NULL;

    -- Ensure existing teachers/students are tied to مؤسسة الرحمة
    UPDATE public.users
    SET organization_id = v_org_id, updated_at = now()
    WHERE role IN ('TEACHER', 'STUDENT')
      AND organization_id IS NULL;
END $$;

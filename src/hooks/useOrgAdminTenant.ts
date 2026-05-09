import { useUser } from "@/hooks/useDatabase";
import { isOrgAdminRole, normalizeOrganization, orgAdminScopedOrganizationId } from "@/lib/accountCapabilities";

/** خيارات جلب مستخدمين وإحصاءات حسب المؤسسة لمدير المؤسسة (ADMIN). */
export function useOrgAdminTenant() {
    const { data: user, isLoading } = useUser();
    const scopedOrganizationId = orgAdminScopedOrganizationId(user ?? undefined);
    const organization = normalizeOrganization(user as any);
    const isOrgAdmin = isOrgAdminRole(user ?? undefined);
    const isTenantLinked = !!scopedOrganizationId;

    return {
        isLoadingUser: isLoading,
        isOrgAdmin,
        isTenantLinked,
        scopedOrganizationId,
        organizationName: organization?.name ?? null,
        allUsersOptions: {
            organizationId: scopedOrganizationId,
            enabled: !isOrgAdmin || isTenantLinked,
        },
        adminStatsOptions: {
            organizationId: scopedOrganizationId,
            enabled: !isOrgAdmin || isTenantLinked,
        },
    };
}

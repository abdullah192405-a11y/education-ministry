import { useMemo } from "react";
import { useUser } from "@/hooks/useDatabase";
import {
    normalizeOrganization,
    hasMonitoringAndTracking,
    orgAllowsTeachers,
    allowedRolesForOrganization,
    isIndividualFreeTier,
    isSuperadmin,
    type OrganizationRow,
} from "@/lib/accountCapabilities";

export function useAccountCapabilities() {
    const { data: user, isLoading } = useUser();

    return useMemo(() => {
        const organization = normalizeOrganization(user as any);
        return {
            user,
            isLoading,
            organization,
            isSuperadmin: isSuperadmin(user as any),
            isIndividualFreeTier: isIndividualFreeTier(user as any),
            hasMonitoringAndTracking: hasMonitoringAndTracking(user as any),
            orgAllowsTeachers: orgAllowsTeachers(organization),
            allowedRolesForOrganization: allowedRolesForOrganization(organization),
        };
    }, [user, isLoading]);
}

export type { OrganizationRow };

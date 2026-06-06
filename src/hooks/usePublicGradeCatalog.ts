import { useMemo } from "react";
import { useGrades } from "@/hooks/useDatabase";
import { useCatalogGradeClassMode } from "@/hooks/useCatalogGradeClassMode";
import { useAccountCapabilities } from "@/hooks/useAccountCapabilities";
import { useMemberGradeScope } from "@/hooks/useMemberGradeScope";
import { normalizeGradeClassType } from "@/lib/gradeClassType";
import {
    filterEducationalGradesForOrganization,
    filterGradesForMemberScope,
    filterGradesForPublicCatalog,
    getGradeOrganizationId,
} from "@/lib/contentVisibility";
import {
    canViewOrganizationEducationalGrades,
    userOrganizationId,
} from "@/lib/accountCapabilities";

/**
 * Public catalog: enrichment (platform) for everyone; educational grades only for
 * signed-in school/org members, scoped to their organization.
 * Students/teachers see only their assigned class(es).
 */
export function usePublicGradeCatalog() {
    const { data: gradesData = [], isLoading: loadingGrades, error } = useGrades();
    const { mode: visitorGradeMode, isLoading: loadingMode } = useCatalogGradeClassMode();
    const { user, isLoading: loadingUser } = useAccountCapabilities();
    const memberScope = useMemberGradeScope();

    const isLoading = loadingGrades || loadingMode || loadingUser || memberScope.isLoading;

    return useMemo(() => {
        const visible = filterGradesForPublicCatalog(gradesData, visitorGradeMode);
        const showOrgEducational = canViewOrganizationEducationalGrades(user);
        const orgId = userOrganizationId(user);

        let enrichment = visible.filter(
            (g) => normalizeGradeClassType(g.class_type ?? g.classType) === "اثرائي",
        );
        const educationalAll = visible.filter(
            (g) => normalizeGradeClassType(g.class_type ?? g.classType) === "تعليمي",
        );
        let educational = showOrgEducational
            ? filterEducationalGradesForOrganization(educationalAll, orgId)
            : [];

        let catalogGrades = visible.filter((g) => {
            const kind = normalizeGradeClassType(g.class_type ?? g.classType);
            if (kind === "تعليمي") {
                return showOrgEducational && getGradeOrganizationId(g) === orgId;
            }
            return true;
        });

        if (memberScope.isScoped && memberScope.gradeIds?.size) {
            enrichment = filterGradesForMemberScope(enrichment, memberScope.gradeIds);
            educational = filterGradesForMemberScope(educational, memberScope.gradeIds);
            catalogGrades = filterGradesForMemberScope(catalogGrades, memberScope.gradeIds);
        }

        const showEducationalSection =
            educational.length > 0 && visitorGradeMode !== "enrichment_only";
        const showEnrichmentSection = visitorGradeMode !== "teaching_only";

        return {
            enrichment,
            educational,
            catalogGrades,
            showEducationalSection,
            showEnrichmentSection,
            showOrgEducational,
            organizationId: orgId,
            visitorGradeMode,
            memberScope,
            isLoading,
            error,
        };
    }, [gradesData, visitorGradeMode, user, memberScope]);
}

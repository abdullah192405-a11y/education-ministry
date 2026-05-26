import { useMemo } from "react";
import { useGrades } from "@/hooks/useDatabase";
import { useCatalogGradeClassMode } from "@/hooks/useCatalogGradeClassMode";
import { useAccountCapabilities } from "@/hooks/useAccountCapabilities";
import { normalizeGradeClassType } from "@/lib/gradeClassType";
import {
    filterEducationalGradesForOrganization,
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
 */
export function usePublicGradeCatalog() {
    const { data: gradesData = [], isLoading: loadingGrades, error } = useGrades();
    const { mode: visitorGradeMode, isLoading: loadingMode } = useCatalogGradeClassMode();
    const { user, isLoading: loadingUser } = useAccountCapabilities();

    const isLoading = loadingGrades || loadingMode || loadingUser;

    return useMemo(() => {
        const visible = filterGradesForPublicCatalog(gradesData, visitorGradeMode);
        const showOrgEducational = canViewOrganizationEducationalGrades(user);
        const orgId = userOrganizationId(user);

        const enrichment = visible.filter(
            (g) => normalizeGradeClassType(g.class_type ?? g.classType) === "اثرائي",
        );
        const educationalAll = visible.filter(
            (g) => normalizeGradeClassType(g.class_type ?? g.classType) === "تعليمي",
        );
        const educational = showOrgEducational
            ? filterEducationalGradesForOrganization(educationalAll, orgId)
            : [];

        const catalogGrades = visible.filter((g) => {
            const kind = normalizeGradeClassType(g.class_type ?? g.classType);
            if (kind === "تعليمي") {
                return showOrgEducational && getGradeOrganizationId(g) === orgId;
            }
            return true;
        });

        const showEducationalSection =
            showOrgEducational && visitorGradeMode !== "enrichment_only";
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
            isLoading,
            error,
        };
    }, [gradesData, visitorGradeMode, user]);
}

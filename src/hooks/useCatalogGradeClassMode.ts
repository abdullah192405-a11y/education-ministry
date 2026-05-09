import { useMemo } from "react";
import { useVisitorGradeClassMode } from "@/hooks/useDatabase";
import { useAccountCapabilities } from "@/hooks/useAccountCapabilities";
import type { VisitorGradeClassMode } from "@/lib/contentVisibility";

/**
 * للأفراد (INDIVIDUAL_FREE): يقتصر كتالوج الصفوف على المحتوى الإثرائي (باقة ١).
 */
export function useCatalogGradeClassMode(): { mode: VisitorGradeClassMode; isLoading: boolean } {
    const { mode: platformMode, isLoading: loadingPlatform } = useVisitorGradeClassMode();
    const { isIndividualFreeTier, user, isLoading: loadingCap } = useAccountCapabilities();

    return useMemo(() => {
        const isStudent = user?.role?.toUpperCase() === "STUDENT" || user?.role === "طالب";
        if (isIndividualFreeTier && isStudent) {
            return { mode: "enrichment_only" as const, isLoading: loadingPlatform || loadingCap };
        }
        return { mode: platformMode, isLoading: loadingPlatform || loadingCap };
    }, [platformMode, isIndividualFreeTier, user, loadingPlatform, loadingCap]);
}

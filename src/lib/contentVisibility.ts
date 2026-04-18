import { isGradePublished, normalizeGradeClassType } from "@/lib/gradeClassType";

/** platform_settings.key for which grades’ challenge/topic content is shown platform-wide */
export const CONTENT_VISIBILITY_FOCUS_KEY = "content_visibility_focus";

/** Which grade class types appear in public / teacher pickers (admin always sees all) */
export const VISITOR_GRADE_CLASS_MODE_KEY = "visitor_grade_class_mode";

export type VisitorGradeClassMode = "all" | "teaching_only" | "enrichment_only";

export function parseVisitorGradeClassMode(raw: unknown): VisitorGradeClassMode {
    const s = String(raw ?? "").trim().toLowerCase();
    if (s === "teaching_only" || s === "teaching") return "teaching_only";
    if (s === "enrichment_only" || s === "enrichment") return "enrichment_only";
    return "all";
}

/** If false, hide this grade from visitors/teachers in catalogs (not from admin). */
export function gradeMatchesVisitorClassMode(
    grade: { class_type?: string | null; classType?: string | null },
    mode: VisitorGradeClassMode,
): boolean {
    if (mode === "all") return true;
    const t = normalizeGradeClassType(grade.class_type ?? grade.classType);
    if (mode === "teaching_only") return t === "تعليمي";
    if (mode === "enrichment_only") return t === "اثرائي";
    return true;
}

export function filterGradesForPublicCatalog<
    T extends {
        class_type?: string | null;
        classType?: string | null;
        is_hidden?: boolean | null;
        isHidden?: boolean | null;
    },
>(grades: T[] | undefined, mode: VisitorGradeClassMode): T[] {
    return (grades ?? []).filter(
        (g) => isGradePublished(g) && gradeMatchesVisitorClassMode(g, mode),
    );
}

export type ContentVisibilityFocus =
    | null
    | { kind: "all" }
    | { kind: "allowlist"; ids: Set<string>; slugs: Set<string> };

function toAllowlist(raw: unknown): { ids: Set<string>; slugs: Set<string> } {
    const ids = new Set<string>();
    const slugs = new Set<string>();
    const add = (v: unknown) => {
        const s = String(v ?? "").trim();
        if (s) {
            ids.add(s);
            slugs.add(s);
        }
    };

    if (Array.isArray(raw)) {
        raw.forEach(add);
        return { ids, slugs };
    }
    if (raw && typeof raw === "object") {
        const o = raw as Record<string, unknown>;
        const idList = o.gradeIds ?? o.ids;
        const slugList = o.slugs;
        if (Array.isArray(idList)) idList.forEach(add);
        if (Array.isArray(slugList)) slugList.forEach(add);
        return { ids, slugs };
    }
    return { ids, slugs };
}

/**
 * Parses the platform_settings value: "all", JSON array/object, or comma-separated ids/slugs.
 * `null` means the setting is absent — callers should treat that as no restriction.
 */
export function parseContentVisibilityFocus(raw: unknown): ContentVisibilityFocus {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    const lower = s.toLowerCase();
    if (lower === "all" || lower === "*" || lower === "any") {
        return { kind: "all" };
    }

    try {
        const parsed = JSON.parse(s) as unknown;
        if (Array.isArray(parsed)) {
            const { ids, slugs } = toAllowlist(parsed);
            return { kind: "allowlist", ids, slugs };
        }
        if (parsed && typeof parsed === "object") {
            const { ids, slugs } = toAllowlist(parsed);
            return { kind: "allowlist", ids, slugs };
        }
    } catch {
        // fall through to comma-separated
    }

    const parts = s.split(",").map((x) => x.trim()).filter(Boolean);
    const { ids, slugs } = toAllowlist(parts);
    return { kind: "allowlist", ids, slugs };
}

/** Returns true if this grade is allowed under the current focus (or focus is unrestricted). */
export function gradeMatchesContentFocus(
    grade: { id?: string; slug?: string } | null | undefined,
    focus: ContentVisibilityFocus
): boolean {
    if (!grade) return true;
    if (focus == null || focus.kind === "all") return true;
    const { ids, slugs } = focus;
    if (ids.size === 0 && slugs.size === 0) return true;

    const id = grade.id != null ? String(grade.id) : "";
    const slug = grade.slug != null ? String(grade.slug) : "";

    if (id && (ids.has(id) || slugs.has(id))) return true;
    if (slug && (ids.has(slug) || slugs.has(slug))) return true;
    return false;
}

/**
 * When the user opens `/grade/:gradeId/.../topic/:topicId/challenge/...`, `gradeId` may be a UUID or a
 * grade slug (e.g. Arabic). If it matches the topic’s loaded grade, they navigated coherently — same
 * resolution as ChallengeModeSelect — and we should not block on platform focus alone.
 */
export function routeGradeMatchesTopicGrade(
    routeGradeId: string | undefined,
    grade: { id?: string; slug?: string | null } | null | undefined
): boolean {
    if (!routeGradeId?.trim() || !grade) return false;
    let decoded = routeGradeId;
    try {
        decoded = decodeURIComponent(routeGradeId);
    } catch {
        /* use raw */
    }
    const id = grade.id != null ? String(grade.id) : "";
    const slug = grade.slug != null ? String(grade.slug) : "";
    return (
        (id !== "" && (id === routeGradeId || id === decoded)) ||
        (slug !== "" && (slug === routeGradeId || slug === decoded))
    );
}

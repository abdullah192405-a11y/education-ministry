import type { NavigateFunction } from "react-router-dom";
import type { ChallengeCategory, ChallengeMode } from "@/data/challengeTypes";
import { categoryLabels, generatePin } from "@/data/challengeTypes";

export type TopicChallengePreset = {
    mode: ChallengeMode;
    category: ChallengeCategory;
};

export type StudentChallengePresetValue =
    | "free"
    | "single:activities"
    | "single:games"
    | "single:mixed"
    | "group:activities"
    | "group:games"
    | "group:mixed";

export const STUDENT_CHALLENGE_PRESET_OPTIONS: Array<{
    value: StudentChallengePresetValue;
    label: string;
}> = [
    { value: "free", label: "الطلاب يختارون (افتراضي)" },
    { value: "single:activities", label: `تحدي فردي — ${categoryLabels.activities.name}` },
    { value: "single:games", label: `تحدي فردي — ${categoryLabels.games.name}` },
    { value: "single:mixed", label: `تحدي فردي — ${categoryLabels.mixed.name}` },
    { value: "group:activities", label: `تحدي جماعي — ${categoryLabels.activities.name}` },
    { value: "group:games", label: `تحدي جماعي — ${categoryLabels.games.name}` },
    { value: "group:mixed", label: `تحدي جماعي — ${categoryLabels.mixed.name}` },
];

const isChallengeMode = (value: unknown): value is ChallengeMode =>
    value === "single" || value === "group";

const isChallengeCategory = (value: unknown): value is ChallengeCategory =>
    value === "activities" || value === "games" || value === "mixed";

/** Returns a preset only when the teacher chose both mode and category; otherwise null (students pick as before). */
export const getTopicChallengePreset = (
    topic: Record<string, unknown> | null | undefined
): TopicChallengePreset | null => {
    if (!topic) return null;
    const mode = topic.student_challenge_mode ?? topic.studentChallengeMode;
    const category = topic.student_challenge_category ?? topic.studentChallengeCategory;
    // Both must be set — if either is missing, students see the full selection flow
    if (isChallengeMode(mode) && isChallengeCategory(category)) {
        return { mode, category };
    }
    return null;
};

export const presetToSelectValue = (
    preset: TopicChallengePreset | null | undefined
): StudentChallengePresetValue => {
    if (!preset) return "free";
    return `${preset.mode}:${preset.category}` as StudentChallengePresetValue;
};

export const selectValueToPresetFields = (
    value: StudentChallengePresetValue
): { student_challenge_mode: ChallengeMode | null; student_challenge_category: ChallengeCategory | null } => {
    if (value === "free") {
        return { student_challenge_mode: null, student_challenge_category: null };
    }
    const [mode, category] = value.split(":") as [ChallengeMode, ChallengeCategory];
    if (!isChallengeMode(mode) || !isChallengeCategory(category)) {
        return { student_challenge_mode: null, student_challenge_category: null };
    }
    return { student_challenge_mode: mode, student_challenge_category: category };
};

export type CreateChallengeSessionFn = (args: {
    topicId: string;
    hostId: string;
    mode: string;
    category: string;
    pin: string;
}) => Promise<unknown>;

export const navigateToTopicChallenge = async (params: {
    preset: TopicChallengePreset;
    gradeId: string;
    subjectId: string;
    topicId: string;
    navigate: NavigateFunction;
    currentUser?: { id?: string; name?: string | null } | null;
    createSession: CreateChallengeSessionFn;
    playerName?: string;
}): Promise<void> => {
    const { preset, gradeId, subjectId, topicId, navigate, currentUser, createSession, playerName } = params;
    const base = `/grade/${gradeId}/subject/${subjectId}/topic/${topicId}/challenge`;

    if (preset.mode === "single") {
        navigate(`${base}/single/${preset.category}`);
        return;
    }

    const pin = generatePin();
    const hostId = currentUser?.id || "00000000-0000-0000-0000-000000000000";
    const displayName = playerName?.trim() || currentUser?.name || "لاعب";

    await createSession({
        topicId,
        hostId,
        mode: "GROUP",
        category: (preset.category || "mixed").toUpperCase(),
        pin,
    });

    navigate(
        `${base}/group/${preset.category}/${pin}?host=true&creator=true&name=${encodeURIComponent(displayName)}`
    );
};

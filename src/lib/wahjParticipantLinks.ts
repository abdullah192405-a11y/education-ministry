import { publicClient, supabase } from "@/lib/supabase";
import type { WahjAttendanceLevel } from "@/lib/wahjIntakeLabels";

export type WahjParticipantExtra = {
    wahjParticipantId?: string;
    wahjReferenceId?: string;
    wahjAttemptId?: string;
    wahjPagesRead?: number;
    wahjBenefitsCount?: number;
};

export type WahjIntakeFormValues = {
    displayName: string;
    pagesRead: number;
    benefitsCount: number;
    discussionAttendance: WahjAttendanceLevel;
    enrichmentAttendance: WahjAttendanceLevel;
};

export type WahjParticipantLookup = {
    participantId: string;
    referenceId: string;
    displayName: string;
    attemptCount: number;
    totalPages: number;
    totalBenefits: number;
    lastAttempt?: {
        pagesRead: number;
        benefitsCount: number;
        discussionAttendance: WahjAttendanceLevel;
        enrichmentAttendance: WahjAttendanceLevel;
        createdAt: string;
    };
};

export type WahjIntakeRow = {
    participantId: string;
    referenceId: string;
    displayName: string;
    participantKey: string;
    attemptId: string;
    challengeResultId: string | null;
    topicId: string;
    pagesRead: number;
    benefitsCount: number;
    discussionAttendance: WahjAttendanceLevel;
    enrichmentAttendance: WahjAttendanceLevel;
    createdAt: string;
};

export function parseWahjParticipantExtra(raw: unknown): WahjParticipantExtra {
    if (!raw) return {};
    if (typeof raw === "object" && raw !== null) return raw as WahjParticipantExtra;
    if (typeof raw !== "string") return {};
    try {
        return JSON.parse(raw) as WahjParticipantExtra;
    } catch {
        return {};
    }
}

export function serializeWahjParticipantExtra(extra: WahjParticipantExtra): string {
    return JSON.stringify(extra);
}

export async function lookupWahjParticipant(
    referenceId: string,
    subjectId: string,
): Promise<WahjParticipantLookup | null> {
    const { data, error } = await publicClient.rpc("lookup_wahj_participant", {
        p_reference_id: referenceId.trim(),
        p_subject_id: subjectId,
    });
    if (error) throw error;
    if (!data) return null;

    const row = data as Record<string, unknown>;
    const last = row.last_attempt as Record<string, unknown> | null | undefined;

    return {
        participantId: String(row.participant_id),
        referenceId: String(row.reference_id),
        displayName: String(row.display_name),
        attemptCount: Number(row.attempt_count ?? 0),
        totalPages: Number(row.total_pages ?? 0),
        totalBenefits: Number(row.total_benefits ?? 0),
        lastAttempt: last
            ? {
                pagesRead: Number(last.pages_read ?? 0),
                benefitsCount: Number(last.benefits_count ?? 0),
                discussionAttendance: String(last.discussion_attendance) as WahjAttendanceLevel,
                enrichmentAttendance: String(last.enrichment_attendance) as WahjAttendanceLevel,
                createdAt: String(last.created_at ?? ""),
            }
            : undefined,
    };
}

export async function createWahjParticipant(
    displayName: string,
    subjectId: string,
): Promise<{ participantId: string; referenceId: string; displayName: string }> {
    const { data, error } = await publicClient.rpc("create_wahj_participant", {
        p_display_name: displayName.trim(),
        p_subject_id: subjectId,
    });
    if (error) throw error;

    const row = data as Record<string, unknown>;
    return {
        participantId: String(row.participant_id),
        referenceId: String(row.reference_id),
        displayName: String(row.display_name),
    };
}

export async function saveWahjReadingAttempt(input: {
    participantId: string;
    topicId: string;
    pagesRead: number;
    benefitsCount: number;
    discussionAttendance: WahjAttendanceLevel;
    enrichmentAttendance: WahjAttendanceLevel;
}): Promise<string> {
    const { data, error } = await publicClient.rpc("create_wahj_reading_attempt", {
        p_participant_id: input.participantId,
        p_topic_id: input.topicId,
        p_pages_read: input.pagesRead,
        p_benefits_count: input.benefitsCount,
        p_discussion_attendance: input.discussionAttendance,
        p_enrichment_attendance: input.enrichmentAttendance,
    });
    if (error) throw error;
    return String(data);
}

export async function linkWahjAttemptToResult(
    attemptId: string,
    challengeResultId: string,
): Promise<void> {
    const { error } = await publicClient.rpc("link_wahj_attempt_to_result", {
        p_attempt_id: attemptId,
        p_challenge_result_id: challengeResultId,
    });
    if (error) throw error;
}

export function buildReportChallengeResult(
    savedResult: Record<string, unknown>,
    topicId: string,
    linked: { participantId: string; referenceId: string; attemptId: string },
    intake: WahjIntakeFormValues,
): Record<string, unknown> {
    const extra = serializeWahjParticipantExtra({
        wahjParticipantId: linked.participantId,
        wahjReferenceId: linked.referenceId,
        wahjAttemptId: linked.attemptId,
        wahjPagesRead: intake.pagesRead,
        wahjBenefitsCount: intake.benefitsCount,
    });

    return {
        ...savedResult,
        participant_extra: extra,
        session: {
            topic_id: topicId,
            topic: { id: topicId },
        },
    };
}

export async function fetchWahjIntakeForParticipant(participantId: string): Promise<WahjIntakeRow[]> {
    const { data, error } = await publicClient.rpc("get_wahj_intake_for_participant", {
        p_participant_id: participantId,
    });
    if (error) throw error;

    return (data || []).map((row: Record<string, unknown>) => ({
        participantId: String(row.participant_id),
        referenceId: String(row.reference_id),
        displayName: String(row.display_name),
        participantKey: String(row.participant_key),
        attemptId: String(row.attempt_id),
        challengeResultId: row.challenge_result_id ? String(row.challenge_result_id) : null,
        topicId: String(row.topic_id),
        pagesRead: Number(row.pages_read ?? 0),
        benefitsCount: Number(row.benefits_count ?? 0),
        discussionAttendance: String(row.discussion_attendance) as WahjAttendanceLevel,
        enrichmentAttendance: String(row.enrichment_attendance) as WahjAttendanceLevel,
        createdAt: String(row.created_at ?? ""),
    }));
}

export async function fetchWahjIntakeForSubject(subjectId: string): Promise<WahjIntakeRow[]> {
    const { data, error } = await supabase.rpc("get_wahj_intake_for_subject", {
        p_subject_id: subjectId,
    });
    if (error) throw error;

    return (data || []).map((row: Record<string, unknown>) => ({
        participantId: String(row.participant_id),
        referenceId: String(row.reference_id),
        displayName: String(row.display_name),
        participantKey: String(row.participant_key),
        attemptId: String(row.attempt_id),
        challengeResultId: row.challenge_result_id ? String(row.challenge_result_id) : null,
        topicId: String(row.topic_id),
        pagesRead: Number(row.pages_read ?? 0),
        benefitsCount: Number(row.benefits_count ?? 0),
        discussionAttendance: String(row.discussion_attendance) as WahjAttendanceLevel,
        enrichmentAttendance: String(row.enrichment_attendance) as WahjAttendanceLevel,
        createdAt: String(row.created_at ?? ""),
    }));
}

export async function persistWahjIntakeForChallengeResult(input: {
    subjectId: string;
    topicId: string;
    intake: WahjIntakeFormValues;
    participantId?: string;
    referenceId?: string;
    challengeResultId: string;
}): Promise<{ participantId: string; referenceId: string; attemptId: string }> {
    let participantId = input.participantId;
    let referenceId = input.referenceId;

    if (!participantId) {
        const created = await createWahjParticipant(input.intake.displayName, input.subjectId);
        participantId = created.participantId;
        referenceId = created.referenceId;
    }

    const attemptId = await saveWahjReadingAttempt({
        participantId,
        topicId: input.topicId,
        pagesRead: input.intake.pagesRead,
        benefitsCount: input.intake.benefitsCount,
        discussionAttendance: input.intake.discussionAttendance,
        enrichmentAttendance: input.intake.enrichmentAttendance,
    });

    await linkWahjAttemptToResult(attemptId, input.challengeResultId);

    const extra = serializeWahjParticipantExtra({
        wahjParticipantId: participantId,
        wahjReferenceId: referenceId,
        wahjAttemptId: attemptId,
        wahjPagesRead: input.intake.pagesRead,
        wahjBenefitsCount: input.intake.benefitsCount,
    });

    const { error: rpcError } = await publicClient.rpc("attach_wahj_extra_to_challenge_result", {
        p_challenge_result_id: input.challengeResultId,
        p_participant_extra: extra,
    });

    if (rpcError) {
        const { error } = await publicClient
            .from("challenge_results")
            .update({ participant_extra: extra })
            .eq("id", input.challengeResultId);

        if (error) throw error;
    }

    return { participantId, referenceId: referenceId || "", attemptId };
}

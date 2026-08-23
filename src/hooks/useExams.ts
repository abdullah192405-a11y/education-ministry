import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { normalizeWheelSegments } from "@/lib/wheelSegments";
import { generatePin } from "@/data/challengeTypes";
import {
    EXAM_SUBMIT_GRACE_MS,
    clampExamDuration,
    filterExamQuestions,
    getExamLiveStatus,
    getExamMaxAttempts,
    parseExamDate,
} from "@/lib/examLogic";

// ============================================================================
// Exam Category Labels (Arabic)
// ============================================================================
export const examCategoryLabels: Record<string, { label: string; color: string; icon: string }> = {
    WEEKLY: { label: "أسبوعي", color: "bg-blue-500", icon: "📅" },
    MONTHLY: { label: "شهري", color: "bg-purple-500", icon: "📆" },
    MID_SEMESTER: { label: "نصف الفصل", color: "bg-amber-500", icon: "📝" },
    FINAL_SEMESTER: { label: "نهاية الفصل", color: "bg-red-500", icon: "🎓" },
};

export const examStatusLabels: Record<string, { label: string; color: string }> = {
    DRAFT: { label: "مسودة", color: "bg-gray-500" },
    SCHEDULED: { label: "مجدول", color: "bg-blue-500" },
    ACTIVE: { label: "نشط", color: "bg-emerald-500" },
    ENDED: { label: "منتهي", color: "bg-red-500" },
};

/** How often the student/teacher views re-evaluate an exam's live window. */
const EXAM_POLL_INTERVAL_MS = 60_000;

// ============================================================================
// Shared mapping
// ============================================================================

/** Map one `challenge_questions` row to the camelCase shape the UI works with. */
const mapExamQuestion = (q: any) => {
    const rawCorrect = q.correct_answer != null ? q.correct_answer : q.correctAnswer;
    const correctText = typeof rawCorrect === "string" ? rawCorrect.trim() : rawCorrect;
    const numericCorrect =
        typeof correctText === "string" && correctText !== "" && !Number.isNaN(Number(correctText))
            ? Number(correctText)
            : correctText;

    return {
        ...q,
        type: q.type?.toLowerCase() || "multiple_choice",
        typeTitle: q.type_title || q.typeTitle,
        correctAnswer: numericCorrect ?? null,
        imageUrl: q.image_url || q.imageUrl,
        videoUrl: q.video_url || q.videoUrl,
        audioUrl: q.audio_url || q.audioUrl,
        orderItems: q.order_items || q.orderItems || [],
        timeLimit: q.time_limit || q.timeLimit || 15,
        points: q.points || 100,
        sortOrder: q.sort_order ?? q.sortOrder ?? 0,
        wheelSegments: normalizeWheelSegments(q.wheel_segments || q.wheelSegments),
        pairs: q.pairs || null,
        explanation: q.explanation || null,
    };
};

const bySortOrder = (a: any, b: any) => {
    const diff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (diff !== 0) return diff;
    return String(a.created_at || "").localeCompare(String(b.created_at || ""));
};

/**
 * Build the paper a student will actually sit.
 *
 * Exam-owned questions win; a topic's questions are only a fallback, and in that
 * case they are *borrowed* (`usesTopicQuestions`) — the teacher editor must copy
 * them rather than re-parent the topic's originals.
 * Types the exam runner cannot grade are dropped instead of scoring as wrong.
 */
const buildExamQuestions = (exam: any) => {
    const own = (exam?.questions || []).map(mapExamQuestion);
    const fromTopic = (exam?.topic?.challengeItems || []).map(mapExamQuestion);
    const usesTopicQuestions = own.length === 0 && fromTopic.length > 0;
    const source = own.length > 0 ? own : fromTopic;

    return {
        usesTopicQuestions,
        challengeItems: filterExamQuestions(source).sort(bySortOrder),
    };
};

// ============================================================================
// Queries
// ============================================================================

/** Fetch all exams created by a teacher */
export const useTeacherExams = (hostId: string) => {
    return useQuery({
        queryKey: ["teacher_exams", hostId],
        queryFn: async () => {
            try {
                const { data, error } = await supabase
                    .from("exams")
                    .select(`
                        *,
                        grade:grades (id, name),
                        topic:topics (
                            id, title,
                            subject:subjects (id, name, grade:grades (id, name)),
                            challengeItems:challenge_questions (*)
                        ),
                        questions:challenge_questions (*),
                        exam_results (
                            id, user_id, student_name, score, max_score, percentage,
                            correct_answers, wrong_answers, total_questions, time_taken,
                            question_results, started_at, submitted_at, created_at,
                            user:users (id, name, email, avatar)
                        )
                    `)
                    .eq("host_id", hostId)
                    .order("created_at", { ascending: false });

                if (error) {
                    console.warn("Exams table query error (table may not exist yet):", error.message);
                    return [];
                }

                return (data || []).map((exam: any) => ({ ...exam, ...buildExamQuestions(exam) }));
            } catch (e) {
                console.warn("Exams fetch failed:", e);
                return [];
            }
        },
        enabled: !!hostId,
        refetchInterval: EXAM_POLL_INTERVAL_MS,
        retry: false,
    });
};

/**
 * Exams a student can see for their grade: everything not yet finished
 * (scheduled + currently open). The live state is derived on the client from the
 * time window, so a cached list can never hand out an exam that has closed.
 */
export const useStudentExams = (gradeId: string, userId: string) => {
    return useQuery({
        queryKey: ["student_exams", gradeId, userId],
        queryFn: async () => {
            if (!gradeId) return [];
            try {
                // Loose server-side bound only (a day of slack) so the cached
                // query key never has to carry "now".
                const floor = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                const { data, error } = await supabase
                    .from("exams")
                    .select(`
                        *,
                        topic:topics (id, title, subject:subjects (id, name)),
                        host:users!exams_host_id_fkey (id, name, avatar),
                        exam_results (id, user_id, percentage, submitted_at)
                    `)
                    .eq("grade_id", gradeId)
                    .neq("status", "DRAFT")
                    .gte("end_time", floor)
                    // Embedded filter: keeps every exam but narrows the results
                    // to this student's, so classmates' scores are never sent.
                    .eq("exam_results.user_id", userId)
                    .order("start_time", { ascending: true });

                if (error) throw error;

                return (data || []).map((exam: any) => {
                    const studentResult = exam.exam_results?.find((r: any) => r.user_id === userId);
                    return {
                        ...exam,
                        hasSubmitted: !!studentResult,
                        studentResult: studentResult || null,
                    };
                });
            } catch (e) {
                console.warn("Student exams fetch failed:", e);
                return [];
            }
        },
        enabled: !!gradeId && !!userId,
        refetchInterval: EXAM_POLL_INTERVAL_MS,
        retry: false,
    });
};

/**
 * Exams the student has already submitted. Deliberately not filtered by grade:
 * a student who changes class keeps their history.
 */
export const useStudentCompletedExams = (userId: string) => {
    return useQuery({
        queryKey: ["student_completed_exams", userId],
        queryFn: async () => {
            if (!userId) return [];
            try {
                const { data: results, error: resultsError } = await supabase
                    .from("exam_results")
                    .select("exam_id, percentage, score, max_score, correct_answers, wrong_answers, submitted_at")
                    .eq("user_id", userId);

                if (resultsError) throw resultsError;
                if (!results || results.length === 0) return [];

                const examIds = results.map((r: any) => r.exam_id);

                const { data: exams, error: examsError } = await supabase
                    .from("exams")
                    .select(`
                        *,
                        topic:topics (id, title, subject:subjects (id, name)),
                        host:users!exams_host_id_fkey (id, name, avatar)
                    `)
                    .in("id", examIds)
                    .order("start_time", { ascending: false });

                if (examsError) throw examsError;

                return (exams || []).map((exam: any) => ({
                    ...exam,
                    hasSubmitted: true,
                    studentResult: results.find((r: any) => r.exam_id === exam.id) || null,
                }));
            } catch (e) {
                console.warn("Student completed exams fetch failed:", e);
                return [];
            }
        },
        enabled: !!userId,
        retry: false,
    });
};

export const useExamByPin = (pin: string) => {
    return useQuery({
        queryKey: ["exam_by_pin", pin],
        queryFn: async () => {
            try {
                const { data, error } = await supabase
                    .from("exams")
                    .select(`
                        *,
                        grade:grades (id, name),
                        topic:topics (
                            id, title, description,
                            subject:subjects (id, name, grade:grades (id, name)),
                            challengeItems:challenge_questions (*)
                        ),
                        questions:challenge_questions (*),
                        host:users!exams_host_id_fkey (id, name, avatar)
                    `)
                    .eq("pin", pin)
                    .maybeSingle();

                if (error) {
                    console.warn("Exam by PIN query error:", error.message);
                    return null;
                }
                if (!data) return null;

                return { ...data, ...buildExamQuestions(data) };
            } catch (e) {
                console.warn("Exam by PIN fetch failed:", e);
                return null;
            }
        },
        enabled: /^\d{6}$/.test(pin || ""),
        retry: false,
    });
};

/** Fetch exam results for a specific exam */
export const useExamResults = (examId: string) => {
    return useQuery({
        queryKey: ["exam_results", examId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("exam_results")
                .select(`
                    *,
                    user:users (id, name, email, avatar)
                `)
                .eq("exam_id", examId)
                .order("percentage", { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!examId,
    });
};

/** Check if a user has already submitted for an exam */
export const useExamSubmission = (examId: string, userId: string) => {
    return useQuery({
        queryKey: ["exam_submission", examId, userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("exam_results")
                .select("*")
                .eq("exam_id", examId)
                .eq("user_id", userId)
                .maybeSingle();

            if (error) throw error;
            return data;
        },
        enabled: !!examId && !!userId,
    });
};

// ============================================================================
// Mutations
// ============================================================================

/** Insert an exam, retrying on the (rare) random PIN collision. */
const insertExamWithUniquePin = async (insertData: Record<string, any>, requestedPin: string) => {
    let pin = requestedPin;

    for (let attempt = 0; attempt < 5; attempt += 1) {
        const { data, error } = await supabase
            .from("exams")
            .insert([{ ...insertData, pin }])
            .select()
            .single();

        if (!error) return data;
        // 23505 = unique_violation; only the PIN is unique on this table.
        if (error.code !== "23505") throw error;
        pin = generatePin();
    }

    throw new Error("تعذر توليد رمز اختبار فريد، حاول مرة أخرى");
};

/** Create a new exam */
export const useCreateExam = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (exam: {
            title: string;
            description?: string;
            gradeId: string;
            topicId: string | null;
            hostId: string;
            pin: string;
            category: string;
            startTime: string;
            endTime: string;
            durationMinutes?: number;
            maxAttempts?: number;
            shuffleQuestions?: boolean;
            showResults?: boolean;
            isDraft?: boolean;
        }) => {
            const start = parseExamDate(exam.startTime);
            const end = parseExamDate(exam.endTime);
            if (!start || !end) throw new Error("وقت بداية أو نهاية الاختبار غير صالح");
            if (end <= start) throw new Error("يجب أن يكون وقت النهاية بعد وقت البداية");

            const now = new Date().toISOString();
            const status = exam.isDraft
                ? "DRAFT"
                : getExamLiveStatus({ start_time: exam.startTime, end_time: exam.endTime });

            const insertData = {
                title: exam.title,
                description: exam.description || null,
                grade_id: exam.gradeId,
                topic_id: exam.topicId,
                host_id: exam.hostId,
                category: exam.category,
                status,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                duration_minutes: clampExamDuration(exam.durationMinutes),
                max_attempts: getExamMaxAttempts({ max_attempts: exam.maxAttempts }),
                shuffle_questions: exam.shuffleQuestions || false,
                show_results: exam.showResults !== false,
                created_at: now,
                updated_at: now,
            };

            return insertExamWithUniquePin(insertData, exam.pin);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["teacher_exams"] });
            queryClient.invalidateQueries({ queryKey: ["student_exams"] });
        },
    });
};

/** Update an exam */
export const useUpdateExam = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
            const { data, error } = await supabase
                .from("exams")
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["teacher_exams"] });
            queryClient.invalidateQueries({ queryKey: ["exam_by_pin"] });
            queryClient.invalidateQueries({ queryKey: ["student_exams"] });
        },
    });
};

/** Delete an exam */
export const useDeleteExam = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("exams")
                .delete()
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["teacher_exams"] });
            queryClient.invalidateQueries({ queryKey: ["student_exams"] });
        },
    });
};

/**
 * Save the exam's question set.
 *
 * Rows are split into inserts and updates: PostgREST requires every object in a
 * batch to carry the same keys, so mixing new questions (no id) with existing
 * ones (id) in a single upsert fails. `sort_order` is taken from the editor's
 * ordering so the paper is presented in a stable, intentional sequence.
 */
export const useBulkUpsertExamQuestions = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ examId, questions }: { examId: string; questions: any[] }) => {
            const now = new Date().toISOString();

            const rows = questions.map((q, index) => {
                const { id, created_at: _createdAt, ...fields } = q;
                return {
                    id,
                    row: {
                        ...fields,
                        exam_id: examId,
                        topic_id: null,
                        sort_order: index,
                        updated_at: now,
                    },
                };
            });

            const saved: any[] = [];

            const toInsert = rows.filter((r) => typeof r.id !== "string");
            if (toInsert.length > 0) {
                const { data, error } = await supabase
                    .from("challenge_questions")
                    .insert(toInsert.map((r) => ({ ...r.row, created_at: now })))
                    .select();
                if (error) throw error;
                saved.push(...(data || []));
            }

            for (const { id, row } of rows.filter((r) => typeof r.id === "string")) {
                const { data, error } = await supabase
                    .from("challenge_questions")
                    .update(row)
                    .eq("id", id)
                    .select()
                    .single();
                if (error) throw error;
                saved.push(data);
            }

            return saved;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["teacher_exams"] });
            queryClient.invalidateQueries({ queryKey: ["exam_by_pin"] });
        },
    });
};

/** Delete an exam question */
export const useDeleteExamQuestion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (questionId: string) => {
            const { error } = await supabase
                .from("challenge_questions")
                .delete()
                .eq("id", questionId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["teacher_exams"] });
            queryClient.invalidateQueries({ queryKey: ["exam_by_pin"] });
        },
    });
};

export class ExamSubmissionError extends Error {
    reason: "closed" | "attempts" | "missing";
    constructor(reason: "closed" | "attempts" | "missing", message: string) {
        super(message);
        this.name = "ExamSubmissionError";
        this.reason = reason;
    }
}

/**
 * Submit an attempt.
 *
 * The exam row is re-read here rather than trusted from the caller's cache, so
 * the window and the attempt limit are checked against current data. There is
 * one result row per (exam, student): a permitted retake overwrites it and bumps
 * `attempts_used`.
 */
export const useSubmitExamResult = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (result: {
            examId: string;
            userId: string;
            studentName?: string;
            totalQuestions: number;
            correctAnswers: number;
            wrongAnswers: number;
            score: number;
            maxScore: number;
            percentage: number;
            timeTaken: number;
            questionResults: any;
            startedAt?: string;
        }) => {
            const { data: exam, error: examError } = await supabase
                .from("exams")
                .select("id, start_time, end_time, status, max_attempts")
                .eq("id", result.examId)
                .maybeSingle();

            if (examError) throw examError;
            if (!exam) throw new ExamSubmissionError("missing", "لم يعد هذا الاختبار متاحاً");

            const now = Date.now();
            const start = parseExamDate(exam.start_time);
            const end = parseExamDate(exam.end_time);
            const withinWindow =
                !!start && !!end && now >= start.getTime() && now <= end.getTime() + EXAM_SUBMIT_GRACE_MS;

            if (!withinWindow) {
                throw new ExamSubmissionError("closed", "انتهى وقت الاختبار ولم يعد بالإمكان التسليم");
            }

            const { data: existing, error: existingError } = await supabase
                .from("exam_results")
                .select("*")
                .eq("exam_id", result.examId)
                .eq("user_id", result.userId)
                .maybeSingle();

            if (existingError) throw existingError;

            const maxAttempts = getExamMaxAttempts(exam);
            const attemptsUsed = existing ? Number(existing.attempts_used ?? 1) : 0;
            if (existing && attemptsUsed >= maxAttempts) {
                throw new ExamSubmissionError("attempts", "لقد استنفدت عدد المحاولات المسموحة لهذا الاختبار");
            }

            const nowIso = new Date().toISOString();
            const payload: Record<string, any> = {
                exam_id: result.examId,
                user_id: result.userId,
                student_name: result.studentName || null,
                total_questions: result.totalQuestions,
                correct_answers: result.correctAnswers,
                wrong_answers: result.wrongAnswers,
                score: result.score,
                max_score: result.maxScore,
                percentage: result.percentage,
                time_taken: result.timeTaken,
                question_results: result.questionResults,
                started_at: result.startedAt || nowIso,
                submitted_at: nowIso,
            };

            if (existing) {
                // Only send the counter when the row proves the column exists,
                // so the feature degrades cleanly on a database that has not had
                // the migration applied yet. A first submission never sends it —
                // there is no row to inspect, and the column defaults to 1.
                if ("attempts_used" in existing) {
                    payload.attempts_used = attemptsUsed + 1;
                }

                const { data, error } = await supabase
                    .from("exam_results")
                    .update(payload)
                    .eq("id", existing.id)
                    .select()
                    .single();
                if (error) throw error;
                return data;
            }

            const { data, error } = await supabase
                .from("exam_results")
                .insert([{ ...payload, created_at: nowIso }])
                .select()
                .single();

            if (error) {
                if (error.code === "23505") {
                    throw new ExamSubmissionError("attempts", "تم تسجيل تسليم سابق لهذا الاختبار");
                }
                throw error;
            }
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["exam_results", variables.examId] });
            queryClient.invalidateQueries({ queryKey: ["exam_submission", variables.examId, variables.userId] });
            queryClient.invalidateQueries({ queryKey: ["teacher_exams"] });
            queryClient.invalidateQueries({ queryKey: ["student_exams"] });
            queryClient.invalidateQueries({ queryKey: ["student_completed_exams"] });
        },
    });
};

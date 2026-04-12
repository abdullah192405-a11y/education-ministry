import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

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
                        topic:topics (
                            id, title,
                            subject:subjects (id, name, grade:grades (id, name)),
                            challengeItems:challenge_questions (*)
                        ),
                        questions:challenge_questions (*),
                        exam_results (
                            id, user_id, student_name, score, max_score, percentage,
                            correct_answers, wrong_answers, total_questions, time_taken,
                            question_results, submitted_at, created_at,
                            user:users (id, name, email, avatar)
                        )
                    `)
                    .eq("host_id", hostId)
                    .order("created_at", { ascending: false });

                if (error) {
                    console.warn("Exams table query error (table may not exist yet):", error.message);
                    return [];
                }

                // Map questions for each exam
                return (data || []).map((exam: any) => {
                    const examQuestions = exam.questions || [];
                    const topicQuestions = exam.topic?.challengeItems || [];
                    const sourceQuestions = examQuestions.length > 0 ? examQuestions : topicQuestions;

                    return {
                        ...exam,
                        challengeItems: sourceQuestions.map((q: any) => ({
                            ...q,
                            type: q.type?.toLowerCase() || "multiple_choice",
                            typeTitle: q.type_title || q.typeTitle,
                            correctAnswer: q.correct_answer != null
                                ? (isNaN(Number(q.correct_answer)) ? q.correct_answer : Number(q.correct_answer))
                                : q.correctAnswer,
                            imageUrl: q.image_url || q.imageUrl,
                            orderItems: q.order_items || q.orderItems || [],
                            timeLimit: q.time_limit || q.timeLimit || 15,
                            points: q.points || 100,
                            wheelSegments: q.wheel_segments || q.wheelSegments,
                            pairs: q.pairs || null,
                            explanation: q.explanation || null,
                        }))
                    };
                });
            } catch (e) {
                console.warn("Exams fetch failed:", e);
                return [];
            }
        },
        enabled: !!hostId,
        retry: false,
    });
};

/** Fetch all exams targeted to a specific grade (student view) */
export const useStudentExams = (gradeId: string, userId: string) => {
    return useQuery({
        queryKey: ["student_exams", gradeId, userId],
        queryFn: async () => {
            if (!gradeId) return [];
            try {
                const { data, error } = await supabase
                    .from("exams")
                    .select(`
                        *,
                        topic:topics (id, title, subject:subjects (id, name)),
                        host:users!exams_host_id_fkey (id, name, avatar),
                        exam_results (id, user_id, percentage, submitted_at)
                    `)
                    .eq("grade_id", gradeId)
                    .eq("status", "ACTIVE") // Only show active exams to students
                    .order("start_time", { ascending: false });

                if (error) throw error;

                // Map results to identify if THIS student has submitted
                return (data || []).map(exam => {
                    const studentResult = exam.exam_results?.find((r: any) => r.user_id === userId);
                    return {
                        ...exam,
                        hasSubmitted: !!studentResult,
                        studentResult: studentResult || null
                    };
                });
            } catch (e) {
                console.warn("Student exams fetch failed:", e);
                return [];
            }
        },
        enabled: !!gradeId,
        retry: false,
    });
};

/** Fetch a single exam by PIN */
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
                    .single();

                if (error) {
                    console.warn("Exam by PIN query error:", error.message);
                    return null;
                }

                // Map challenge questions (priority to exam-specific questions)
                const examQuestions = data?.questions || [];
                const topicQuestions = data?.topic?.challengeItems || [];
                
                // Combine them, but prioritize those with the same content if needed? 
                // For now, let's just use exam-specific if they exist, otherwise topic
                const sourceQuestions = examQuestions.length > 0 ? examQuestions : topicQuestions;

                data.challengeItems = sourceQuestions.map((q: any) => ({
                    ...q,
                    type: q.type?.toLowerCase() || "multiple_choice",
                    typeTitle: q.type_title || q.typeTitle,
                    correctAnswer: q.correct_answer != null
                        ? (isNaN(Number(q.correct_answer)) ? q.correct_answer : Number(q.correct_answer))
                        : q.correctAnswer,
                    imageUrl: q.image_url || q.imageUrl,
                    orderItems: q.order_items || q.orderItems || [],
                    timeLimit: q.time_limit || q.timeLimit || 15,
                    points: q.points || 100,
                    wheelSegments: q.wheel_segments || q.wheelSegments,
                    pairs: q.pairs || null,
                    explanation: q.explanation || null,
                }));

                return data;
            } catch (e) {
                console.warn("Exam by PIN fetch failed:", e);
                return null;
            }
        },
        enabled: pin.length === 6,
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
        }) => {
            const now = new Date().toISOString();
            const startDate = new Date(exam.startTime);
            const nowDate = new Date();

            // Determine initial status
            let status = "SCHEDULED";
            if (startDate <= nowDate) {
                const endDate = new Date(exam.endTime);
                status = endDate > nowDate ? "ACTIVE" : "ENDED";
            }

            const insertData = {
                title: exam.title,
                description: exam.description || null,
                grade_id: exam.gradeId,
                topic_id: exam.topicId,
                host_id: exam.hostId,
                pin: exam.pin,
                category: exam.category,
                status,
                start_time: exam.startTime,
                end_time: exam.endTime,
                duration_minutes: exam.durationMinutes || 60,
                max_attempts: exam.maxAttempts || 1,
                shuffle_questions: exam.shuffleQuestions || false,
                show_results: exam.showResults !== false,
                created_at: now,
                updated_at: now,
            };

            const { data, error } = await supabase
                .from("exams")
                .insert([insertData])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["teacher_exams"] });
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
        },
    });
};

/** Bulk upsert exam questions */
export const useBulkUpsertExamQuestions = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ examId, questions }: { examId: string; questions: any[] }) => {
            const now = new Date().toISOString();
            const questionsToInsert = questions.map(q => ({
                ...q,
                exam_id: examId,
                updated_at: now,
                created_at: q.id ? q.created_at : now
            }));

            const { data, error } = await supabase
                .from("challenge_questions")
                .upsert(questionsToInsert)
                .select();

            if (error) throw error;
            return data;
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

/** Submit exam result */
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
        }) => {
            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from("exam_results")
                .insert([{
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
                    submitted_at: now,
                    created_at: now,
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["exam_results", variables.examId] });
            queryClient.invalidateQueries({ queryKey: ["exam_submission", variables.examId, variables.userId] });
            queryClient.invalidateQueries({ queryKey: ["teacher_exams"] });
        },
    });
};

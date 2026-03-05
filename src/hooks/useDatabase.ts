import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// --- Shared Mapper: DB snake_case → Frontend camelCase for challenge questions ---
export const mapChallengeQuestion = (q: any) => ({
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
});

// --- Education Hierarchy ---

export const useGrades = () => {
    return useQuery({
        queryKey: ["grades"],
        queryFn: async () => {
            console.log("useGrades: Fetching grades...");
            const { data, error } = await supabase
                .from("grades")
                .select(`
          *,
          subjects (id, name),
          student_profiles (id)
        `)
                .order("sort_order", { ascending: true });

            if (error) {
                console.error("useGrades Error:", error);
                throw error;
            }
            console.log("useGrades: Success", data?.length, "grades");

            // Map student_profiles count to students_count
            return (data || []).map((grade: any) => ({
                ...grade,
                students_count: grade.student_profiles?.length || grade.students_count || 0,
            }));
        },
    });
};

export const useGradeDetail = (slug: string) => {
    return useQuery({
        queryKey: ["grade", slug],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("grades")
                .select(`
          *,
          subjects (
            *,
            topics (
              *,
              mediaItems:topic_media (*),
              quizQuestions:quiz_questions (*)
            )
          ),
          student_profiles (id)
        `)
                .eq("slug", slug)
                .single();

            if (error) throw error;

            // Map student_profiles count to students_count
            return {
                ...data,
                students_count: data?.student_profiles?.length || 0,
            };
        },
        enabled: !!slug,
    });
};

export const useSubject = (id: string) => {
    return useQuery({
        queryKey: ["subject", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("subjects")
                .select(`
          *,
          grade:grades (*),
          topics (
            *,
            mediaItems:topic_media (*),
            quizQuestions:quiz_questions (*),
            challengeItems:challenge_questions (*),
            challengeSessions:challenge_sessions (*)
          )
        `)
                .eq("id", id)
                .single();

            if (error) throw error;

            // Map challenge questions for each topic
            return {
                ...data,
                topics: (data?.topics || []).map((topic: any) => ({
                    ...topic,
                    challengeItems: (topic.challengeItems || []).map(mapChallengeQuestion),
                })),
            };
        },
        enabled: !!id,
    });
};

export const useTopic = (id: string) => {
    return useQuery({
        queryKey: ["topic", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("topics")
                .select(`
          *,
          subject:subjects (*, grade:grades (*), topics(id)),
          mediaItems:topic_media (*),
          quizQuestions:quiz_questions (*),
          challengeItems:challenge_questions (*)
        `)
                .eq("id", id)
                .single();

            if (error) throw error;

            // Map challenge questions from DB snake_case to frontend camelCase
            return {
                ...data,
                challengeItems: (data?.challengeItems || []).map(mapChallengeQuestion),
            };
        },
        enabled: !!id,
    });
};

// --- Challenges ---

export const useChallengeSession = (pin: string) => {
    return useQuery({
        queryKey: ["challenge_session", pin],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("challenge_sessions")
                .select(`
          *,
          topic:topics (*)
        `)
                .eq("pin", pin)
                .single();

            if (error) {
                console.error("useChallengeSession Error checking pin:", error);
                // Fallback: try without topic join
                const { data: noTopicData, error: noTopicError } = await supabase
                    .from("challenge_sessions")
                    .select("*")
                    .eq("pin", pin)
                    .single();

                if (noTopicError) throw noTopicError;
                return noTopicData;
            }

            return data;
        },
        enabled: pin.length === 6,
    });
};

// --- Platform Settings ---

export const usePlatformSettings = () => {
    return useQuery({
        queryKey: ["platform_settings"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("platform_settings")
                .select("*");

            if (error) throw error;

            // Convert to key-value object
            const settings: Record<string, any> = {};
            data.forEach(s => {
                settings[s.key] = s.value;
            });
            return settings;
        },
    });
};

// --- Announcements ---

export const useAnnouncements = () => {
    return useQuery({
        queryKey: ["announcements"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("announcements")
                .select("*")
                .eq("is_active", true)
                .order("published_at", { ascending: false });

            if (error) throw error;
            return data;
        },
    });
};

// --- Users & Profiles ---

export const useUser = () => {
    return useQuery({
        queryKey: ["current_user"],
        queryFn: async () => {
            // 1. Try Supabase Auth session first (registered users)
            try {
                const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

                if (!authError && authUser) {
                    const { data: user } = await supabase
                        .from("users")
                        .select("*")
                        .eq("auth_id", authUser.id)
                        .maybeSingle();

                    if (user) return user;
                }
            } catch {
                // Auth session missing or expired — continue to fallback
            }

            // 2. Fallback to localStorage (demo accounts / seeded users without auth_id)
            try {
                const stored = localStorage.getItem("edu_user");
                if (stored) {
                    const parsed = JSON.parse(stored);
                    // Look up by email from the DB to get the full record
                    if (parsed.email) {
                        const { data: user } = await supabase
                            .from("users")
                            .select("*")
                            .eq("email", parsed.email)
                            .maybeSingle();

                        if (user) return user;
                    }
                    // If DB lookup fails, return the localStorage data as-is
                    return parsed;
                }
            } catch {
                // localStorage parse error — ignore
            }

            return null;
        },
        staleTime: 0,
        retry: false,
    });
};

export const useStudentProfile = (userId: string) => {
    return useQuery({
        queryKey: ["student_profile", userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("student_profiles")
                .select(`
          *,
          grade:grades (*)
        `)
                .eq("user_id", userId)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!userId,
    });
};

export const useTeacherProfile = (userId: string) => {
    return useQuery({
        queryKey: ["teacher_profile", userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("teacher_profiles")
                .select(`
          *,
          grade:grades (*),
          subject:subjects (*),
          topics (*)
        `)
                .eq("user_id", userId)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!userId,
    });
};

// --- Student Progress & Activity ---

export const useGradeSubjectProgress = (gradeId: string, subjectId: string) => {
    return useQuery({
        queryKey: ["grade_subject_progress", gradeId, subjectId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("student_subject_progress")
                .select(`
          *,
          student:student_profiles!inner(*)
        `)
                .eq("subject_id", subjectId)
                .eq("student.grade_id", gradeId);

            if (error) throw error;
            return data;
        },
        enabled: !!gradeId && !!subjectId,
    });
};

export const useStudentSubjectProgress = (studentProfileId: string) => {
    return useQuery({
        queryKey: ["student_subject_progress", studentProfileId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("student_subject_progress")
                .select(`
          *,
          subject:subjects (*)
        `)
                .eq("student_id", studentProfileId);

            if (error) throw error;
            return data;
        },
        enabled: !!studentProfileId,
    });
};

export const useStudentsInGrade = (gradeId: string) => {
    return useQuery({
        queryKey: ["students_in_grade", gradeId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("student_profiles")
                .select(`
          *,
          user:users (*)
        `)
                .eq("grade_id", gradeId);

            if (error) throw error;
            return data;
        },
        enabled: !!gradeId,
    });
};

export const useStudentTopicActivities = (studentProfileId: string, limit = 10) => {
    return useQuery({
        queryKey: ["student_topic_activities", studentProfileId, limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("student_topic_activities")
                .select(`
          *,
          topic:topics (
            *,
            subject:subjects (*)
          )
        `)
                .eq("student_id", studentProfileId)
                .order("date", { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data;
        },
        enabled: !!studentProfileId,
    });
};

// --- Badges ---

export const useUserBadges = (userId: string) => {
    return useQuery({
        queryKey: ["user_badges", userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("user_badges")
                .select(`
          *,
          badge:badges (*)
        `)
                .eq("user_id", userId)
                .order("earned_at", { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!userId,
    });
};

export const useAllBadges = () => {
    return useQuery({
        queryKey: ["all_badges"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("badges")
                .select("*")
                .eq("is_active", true);

            if (error) throw error;
            return data;
        },
    });
};

// --- Challenge Sessions (Active) ---

export const useActiveChallengesByHost = (hostId: string) => {
    return useQuery({
        queryKey: ["active_challenges_host", hostId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("challenge_sessions")
                .select(`
          *,
          topic:topics (*, subject:subjects (*, grade:grades (*))),
          players:player_sessions (*)
        `)
                .eq("host_id", hostId)
                .in("status", ["WAITING", "PLAYING"])
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!hostId,
        refetchInterval: 5000,
    });
};

// --- Challenge Results ---

export const useRecentChallengeResults = (userId: string, limit = 10) => {
    return useQuery({
        queryKey: ["recent_challenge_results", userId, limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("challenge_results")
                .select(`
          *,
          user:users (*),
          session:challenge_sessions (
            *,
            topic:topics (*)
          )
        `)
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data;
        },
        enabled: !!userId,
    });
};

export const useGlobalLeaderboard = (limit = 5) => {
    return useQuery({
        queryKey: ["global_leaderboard", limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("challenge_results")
                .select(`
          *,
          user:users (*)
        `)
                .order("score", { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data;
        },
    });
};

export const useHostedChallengeResults = (teacherId: string, limit = 50) => {
    return useQuery({
        queryKey: ["hosted_challenge_results", teacherId, limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("challenge_results")
                .select(`
          *,
          user:users (*),
          session:challenge_sessions!inner (
            *,
            topic:topics (*)
          )
        `)
                .eq("session.host_id", teacherId)
                .order("created_at", { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data;
        },
        enabled: !!teacherId,
    });
};

export const useHostedSessions = (teacherId: string) => {
    return useQuery({
        queryKey: ["hosted_sessions", teacherId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("challenge_sessions")
                .select(`
          *,
          topic:topics (*),
          players:player_sessions (*)
        `)
                .eq("host_id", teacherId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!teacherId,
    });
};

export const useSessionResults = (sessionId: string) => {
    return useQuery({
        queryKey: ["session_results", sessionId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("challenge_results")
                .select(`
          *,
          user:users (*)
        `)
                .eq("session_id", sessionId)
                .order("score", { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!sessionId,
    });
};

// --- Admin Extended Stats ---

export const useAdminStats = () => {
    return useQuery({
        queryKey: ["admin_stats"],
        queryFn: async () => {
            const [usersCount, sessionsCount, gradesCount, subjectsCount, topicsCount, teachersCount, studentsCount] = await Promise.all([
                supabase.from("users").select("*", { count: "exact", head: true }),
                supabase.from("challenge_sessions").select("*", { count: "exact", head: true }),
                supabase.from("grades").select("*", { count: "exact", head: true }),
                supabase.from("subjects").select("*", { count: "exact", head: true }),
                supabase.from("topics").select("*", { count: "exact", head: true }),
                supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "TEACHER"),
                supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "STUDENT"),
            ]);

            return {
                totalUsers: usersCount.count || 0,
                totalChallenges: sessionsCount.count || 0,
                totalGrades: gradesCount.count || 0,
                totalSubjects: subjectsCount.count || 0,
                totalTopics: topicsCount.count || 0,
                totalTeachers: teachersCount.count || 0,
                totalStudents: studentsCount.count || 0,
            };
        },
    });
};

export const useRecentAuditLogs = (limit = 10) => {
    return useQuery({
        queryKey: ["recent_audit_logs", limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("audit_logs")
                .select(`
          *,
          user:users (*)
        `)
                .order("created_at", { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data;
        },
    });
};

export const useAllUsers = () => {
    return useQuery({
        queryKey: ["all_users"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("users")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data;
        },
    });
};

// --- Mutations ---

export const useUpdateTeacherProfile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, updates }: { userId: string, updates: any }) => {
            const { data, error } = await supabase
                .from("teacher_profiles")
                .update(updates)
                .eq("user_id", userId);
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["teacher_profile", variables.userId] });
        }
    });
};

export const useUpdateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, updates }: { userId: string, updates: any }) => {
            const { data, error } = await supabase
                .from("users")
                .update(updates)
                .eq("id", userId);
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["current_user"] });
            queryClient.invalidateQueries({ queryKey: ["user", variables.userId] });
        }
    });
};

export const useCreateTopic = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (topic: any) => {
            const now = new Date().toISOString();
            const payload = { ...topic, updated_at: now };
            const { data, error } = await supabase
                .from("topics")
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["subject", data.subject_id] });
            queryClient.invalidateQueries({ queryKey: ["teacher_profile"] });
        }
    });
};

export const useUpdateTopic = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
            const now = new Date().toISOString();
            const payload = { ...updates, updated_at: now };
            const { data, error } = await supabase
                .from("topics")
                .update(payload)
                .eq("id", id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["topic", data.id] });
            queryClient.invalidateQueries({ queryKey: ["subject", data.subject_id] });
        }
    });
};

export const useDeleteTopic = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("topics")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subject"] });
            queryClient.invalidateQueries({ queryKey: ["teacher_profile"] });
        }
    });
};
// --- Grade Mutations ---

export const useCreateGrade = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (grade: any) => {
            const now = new Date().toISOString();
            const payload = {
                ...grade,
                updated_at: now,
            };
            const { data, error } = await supabase.from("grades").insert([payload]).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["grades"] });
            queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
        }
    });
};

export const useUpdateGrade = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
            const now = new Date().toISOString();
            const payload = {
                ...updates,
                updated_at: now,
            };
            const { data, error } = await supabase.from("grades").update(payload).eq("id", id).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["grades"] });
            queryClient.invalidateQueries({ queryKey: ["grade", data.slug] });
        }
    });
};

export const useDeleteGrade = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("grades").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["grades"] });
            queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
        }
    });
};

// --- Subject Mutations ---

export const useCreateSubject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (subject: any) => {
            const now = new Date().toISOString();
            const payload = { ...subject, updated_at: now };
            const { data, error } = await supabase.from("subjects").insert([payload]).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
            queryClient.invalidateQueries({ queryKey: ["grade"] });
            queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
        }
    });
};

export const useUpdateSubject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
            const now = new Date().toISOString();
            const payload = { ...updates, updated_at: now };
            const { data, error } = await supabase.from("subjects").update(payload).eq("id", id).select().single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["subject", data.id] });
            queryClient.invalidateQueries({ queryKey: ["grade"] });
        }
    });
};

export const useDeleteSubject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("subjects").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
            queryClient.invalidateQueries({ queryKey: ["grade"] });
            queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
        }
    });
};

// --- Topic Media Mutations ---

export const useSaveTopicMedia = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ topicId, media }: { topicId: string, media: any[] }) => {
            // Delete existing media for this topic first
            await supabase.from("topic_media").delete().eq("topic_id", topicId);

            if (media.length === 0) return [];

            // Insert new media items
            const mediaPayload = media.map((m, index) => ({
                topic_id: topicId,
                type: m.type?.toUpperCase() || "TEXT",
                url: m.url || null,
                content: m.content || null,
                caption: m.caption || null,
                file_name: m.fileName || null,
                pdf_base64: m.pdfBase64 || null,
                sort_order: index,
            }));

            const { data, error } = await supabase
                .from("topic_media")
                .insert(mediaPayload)
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["topic", variables.topicId] });
            queryClient.invalidateQueries({ queryKey: ["subject"] });
        }
    });
};

export const useDeleteTopicMedia = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ mediaId, topicId }: { mediaId: string, topicId: string }) => {
            const { error } = await supabase.from("topic_media").delete().eq("id", mediaId);
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["topic", variables.topicId] });
            queryClient.invalidateQueries({ queryKey: ["subject"] });
        }
    });
};

// --- Challenge Questions Mutations ---

export const useSaveChallengeQuestions = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ topicId, questions }: { topicId: string, questions: any[] }) => {
            // Delete existing challenge questions for this topic first
            await supabase.from("challenge_questions").delete().eq("topic_id", topicId);

            if (questions.length === 0) return [];

            const now = new Date().toISOString();

            // Map frontend question type to DB enum
            const typeMap: Record<string, string> = {
                "multiple_choice": "MULTIPLE_CHOICE",
                "true_false": "TRUE_FALSE",
                "qa": "QA",
                "know_dont_know": "KNOW_DONT_KNOW",
                "order_questions": "ORDER_QUESTIONS",
                "puzzle": "PUZZLE",
                "shooting": "SHOOTING",
                "matching": "MATCHING",
                "wheel_spin": "WHEEL_SPIN",
            };

            // Insert new challenge questions
            const questionsPayload = questions.map((q, index) => ({
                topic_id: topicId,
                type: typeMap[q.type] || q.type?.toUpperCase() || "MULTIPLE_CHOICE",
                type_title: q.typeTitle || null,
                question: q.question || "",
                options: q.options || [],
                correct_answer: q.correctAnswer != null ? String(q.correctAnswer) : null,
                image_url: q.imageUrl || null,
                pairs: q.pairs || null,
                order_items: q.orderItems || [],
                explanation: q.explanation || null,
                points: q.points || 100,
                time_limit: q.timeLimit || 15,
                wheel_segments: q.wheelSegments || null,
                sort_order: index,
                is_active: true,
                updated_at: now,
            }));

            const { data, error } = await supabase
                .from("challenge_questions")
                .insert(questionsPayload)
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["topic", variables.topicId] });
            queryClient.invalidateQueries({ queryKey: ["subject"] });
        }
    });
};

export const useDeleteChallengeQuestion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ questionId, topicId }: { questionId: string, topicId: string }) => {
            const { error } = await supabase.from("challenge_questions").delete().eq("id", questionId);
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["topic", variables.topicId] });
            queryClient.invalidateQueries({ queryKey: ["subject"] });
        }
    });
};

// --- Challenge Result & Student Progress Mutations ---

/** Create a single-player challenge session */
export const useCreateChallengeSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (session: {
            topicId: string;
            hostId: string;
            mode: string;
            category: string;
            pin?: string;
        }) => {
            const pin = session.pin || Math.floor(100000 + Math.random() * 900000).toString();
            const now = new Date().toISOString();
            const initialStatus = session.mode === "GROUP" ? "WAITING" : "PLAYING";

            const insertData: any = {
                pin,
                topic_id: session.topicId,
                host_id: session.hostId,
                mode: session.mode,
                category: session.category,
                status: initialStatus,
                started_at: now,
                created_at: now,
                updated_at: now,
            };

            // Only set finished_at for immediately finished sessions
            if (session.mode === "SINGLE") {
                // Historically single was marked FINISHED immediately in some flows, but really it should be PLAYING
                // Setting it to PLAYING is safe based on the app logic, but let's stick to the previous pattern if it's strictly single
            }

            const { data, error } = await supabase
                .from("challenge_sessions")
                .insert([insertData])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["active_challenges_host"] });
            queryClient.invalidateQueries({ queryKey: ["hosted_sessions"] });
        }
    });
};

/** Join a challenge session as a player */
export const useJoinChallengeSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (playerData: {
            sessionId: string;
            userId?: string;
            name: string;
            avatar?: string;
        }) => {
            // Helper to validate UUID
            const isUUID = (str: string) => {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                return uuidRegex.test(str);
            };

            const validUserId = (playerData.userId && isUUID(playerData.userId)) ? playerData.userId : null;

            const { data, error } = await supabase
                .from("player_sessions")
                .insert([{
                    session_id: playerData.sessionId,
                    user_id: validUserId,
                    name: playerData.name,
                    avatar: playerData.avatar,
                    is_host: false,
                    is_online: true,
                }])
                .select()
                .single();

            if (error) {
                // If user already in session, fetch their existing session instead of throwing
                if (error.code === '23505' && validUserId) {
                    const { data: existingPlayer } = await supabase
                        .from("player_sessions")
                        .select("*")
                        .eq("session_id", playerData.sessionId)
                        .eq("user_id", validUserId)
                        .single();
                    if (existingPlayer) return existingPlayer;
                }
                throw error;
            }
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["challenge_session"] });
            queryClient.invalidateQueries({ queryKey: ["active_challenges_host"] });
        },
    });
};

/** Update player session stats */
export const useUpdatePlayerSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
            const { data, error } = await supabase
                .from("player_sessions")
                .update(updates)
                .eq("id", id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["challenge_session"] });
        },
    });
};

/** Update a challenge session */
export const useUpdateChallengeSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ pin, updates }: { pin: string; updates: any }) => {
            const { data, error } = await supabase
                .from("challenge_sessions")
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq("pin", pin)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["challenge_sessions"] });
            if (data?.pin) {
                queryClient.invalidateQueries({ queryKey: ["challenge_session", data.pin] });
            }
            if (data?.topic_id) {
                queryClient.invalidateQueries({ queryKey: ["challenge_sessions", data.topic_id] });
            }
            queryClient.invalidateQueries({ queryKey: ["active_challenges_host"] });
        },
    });
};

/** Delete a challenge session */
export const useDeleteChallengeSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (pin: string) => {
            const { error } = await supabase
                .from("challenge_sessions")
                .delete()
                .eq("pin", pin);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["active_challenges_host"] });
            queryClient.invalidateQueries({ queryKey: ["hosted_sessions"] });
            queryClient.invalidateQueries({ queryKey: ["challenge_sessions"] });
        },
    });
};

/** Save a challenge result */
export const useSaveChallengeResult = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (result: {
            sessionId: string;
            userId: string;
            totalQuestions: number;
            correctAnswers: number;
            wrongAnswers: number;
            score: number;
            maxScore: number;
            percentage: number;
            timeTaken: number;
            averageTimePerQuestion: number;
            longestStreak: number;
            accuracy: number;
            level: string;
            questionResults: any;
        }) => {
            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from("challenge_results")
                .insert([{
                    session_id: result.sessionId,
                    user_id: result.userId,
                    total_questions: result.totalQuestions,
                    correct_answers: result.correctAnswers,
                    wrong_answers: result.wrongAnswers,
                    score: result.score,
                    max_score: result.maxScore,
                    percentage: result.percentage,
                    time_taken: result.timeTaken,
                    avg_time_per_question: result.averageTimePerQuestion,
                    longest_streak: result.longestStreak,
                    accuracy: result.accuracy,
                    level: result.level,
                    question_results: result.questionResults,
                    created_at: now,
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["recent_challenge_results", variables.userId] });
            queryClient.invalidateQueries({ queryKey: ["hosted_challenge_results"] });
        }
    });
};

/** Update student profile stats after a challenge */
export const useUpdateStudentProfile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ studentProfileId, updates }: {
            studentProfileId: string;
            updates: {
                totalPoints?: number;
                totalChallenges?: number;
                completedTopics?: number;
                averageScore?: number;
                longestStreak?: number;
                currentStreak?: number;
                totalStudyHours?: number;
            };
        }) => {
            const payload: any = { updated_at: new Date().toISOString() };
            if (updates.totalPoints !== undefined) payload.total_points = updates.totalPoints;
            if (updates.totalChallenges !== undefined) payload.total_challenges = updates.totalChallenges;
            if (updates.completedTopics !== undefined) payload.completed_topics = updates.completedTopics;
            if (updates.averageScore !== undefined) payload.average_score = updates.averageScore;
            if (updates.longestStreak !== undefined) payload.longest_streak = updates.longestStreak;
            if (updates.currentStreak !== undefined) payload.current_streak = updates.currentStreak;
            if (updates.totalStudyHours !== undefined) payload.total_study_hours = updates.totalStudyHours;

            const { data, error } = await supabase
                .from("student_profiles")
                .update(payload)
                .eq("id", studentProfileId)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["student_profile"] });
            if (data?.user_id) {
                queryClient.invalidateQueries({ queryKey: ["student_profile", data.user_id] });
            }
        }
    });
};

/** Log a student topic activity */
export const useSaveTopicActivity = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (activity: {
            studentProfileId: string;
            topicId: string;
            topicTitle: string;
            score: number;
            completed: boolean;
        }) => {
            const { data, error } = await supabase
                .from("student_topic_activities")
                .insert([{
                    student_id: activity.studentProfileId,
                    topic_id: activity.topicId,
                    topic_title: activity.topicTitle,
                    score: activity.score,
                    completed: activity.completed,
                    date: new Date().toISOString(),
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["student_topic_activities", variables.studentProfileId] });
        }
    });
};

/** Upsert student subject progress */
export const useUpsertSubjectProgress = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (progress: {
            studentProfileId: string;
            subjectId: string;
            completedTopics: number;
            totalTopics: number;
            averageScore: number;
        }) => {
            const { data, error } = await supabase
                .from("student_subject_progress")
                .upsert({
                    student_id: progress.studentProfileId,
                    subject_id: progress.subjectId,
                    completed_topics: progress.completedTopics,
                    total_topics: progress.totalTopics,
                    average_score: progress.averageScore,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'student_id,subject_id'
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["student_subject_progress"] });
            queryClient.invalidateQueries({ queryKey: ["grade"] });
            queryClient.invalidateQueries({ queryKey: ["student_profile"] });
            if (variables.studentProfileId) {
                queryClient.invalidateQueries({ queryKey: ["student_subject_progress", variables.studentProfileId] });
            }
        }
    });
};

/** Award badges to a user */
export const useAwardBadges = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, badgeSlugs, resultId }: {
            userId: string;
            badgeSlugs: string[];
            resultId?: string;
        }) => {
            if (badgeSlugs.length === 0) return [];

            // Look up badge IDs by slug
            const { data: badges, error: badgeError } = await supabase
                .from("badges")
                .select("id, slug")
                .in("slug", badgeSlugs)
                .eq("is_active", true);
            if (badgeError) throw badgeError;
            if (!badges || badges.length === 0) return [];

            // Insert user_badges (ignore duplicates)
            const userBadgePayload = badges.map(b => ({
                user_id: userId,
                badge_id: b.id,
            }));

            // Use upsert to avoid duplicate errors
            const { data: userBadgeData, error: ubError } = await supabase
                .from("user_badges")
                .upsert(userBadgePayload, { onConflict: "user_id,badge_id" })
                .select();
            if (ubError) throw ubError;

            // If resultId provided, also link badges to the result
            if (resultId) {
                const resultBadgePayload = badges.map(b => ({
                    result_id: resultId,
                    badge_id: b.id,
                }));
                await supabase
                    .from("result_badges")
                    .upsert(resultBadgePayload, { onConflict: "result_id,badge_id" })
                    .select();
            }

            return userBadgeData;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["user_badges", variables.userId] });
            queryClient.invalidateQueries({ queryKey: ["all_badges"] });
        }
    });
};

/** Save individual participant answers to the database */
export const useSaveAnswers = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (answers: Array<{
            resultId: string;
            questionId: string;
            userAnswer: string | null;
            isCorrect: boolean;
            timeTaken: number;
            pointsEarned: number;
        }>) => {
            if (answers.length === 0) return [];

            const payload = answers.map(answer => ({
                result_id: answer.resultId,
                question_id: answer.questionId,
                user_answer: answer.userAnswer,
                is_correct: answer.isCorrect,
                time_taken: answer.timeTaken,
                points_earned: answer.pointsEarned,
                created_at: new Date().toISOString(),
            }));

            const { data, error } = await supabase
                .from("challenge_answers")
                .insert(payload)
                .select();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["challenge_answers"] });
        }
    });
};


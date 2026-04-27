import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { encodeTopicMediaForInsert, mapTopicMediaItems, getMediaItemsFromTopicRow } from "@/lib/topicMediaCodec";
import {
    CONTENT_VISIBILITY_FOCUS_KEY,
    parseContentVisibilityFocus,
    VISITOR_GRADE_CLASS_MODE_KEY,
    parseVisitorGradeClassMode,
} from "@/lib/contentVisibility";

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
              _TeacherTopics(A),
              mediaItems:topic_media (*),
              quizQuestions:quiz_questions (*)
            )
          ),
          student_profiles (id)
        `)
                .eq("slug", slug)
                .single();

            if (error) throw error;

            // Map student_profiles count to students_count; decode صوت/رابط المخزّنة كـ TEXT
            const subjects = (data?.subjects || []).map((s: any) => ({
                ...s,
                topics: (s.topics || []).map((t: any) => ({
                    ...t,
                    mediaItems: mapTopicMediaItems(getMediaItemsFromTopicRow(t)),
                })),
            }));

            return {
                ...data,
                subjects,
                students_count: data?.student_profiles?.length || 0,
            };
        },
        enabled: !!slug,
    });
};

export const useSubject = (id: string, teacherId?: string) => {
    return useQuery({
        queryKey: ["subject", id, teacherId],
        queryFn: async () => {
            let query = supabase
                .from("subjects")
                .select(`
          *,
          grade:grades (*),
          topics (
            *,
            mediaItems:topic_media (id, topic_id, type, url, content, caption, file_name, sort_order),
            quizQuestions:quiz_questions (*),
            challengeItems:challenge_questions (*),
            challengeSessions:challenge_sessions (*),
            activities:student_topic_activities (id, student_id, date),
            ${teacherId 
              ? "_TeacherTopics!inner(A, teacher_profiles(id, user:users(id, name, avatar)))" 
              : "_TeacherTopics(teacher_profiles(id, user:users(id, name, avatar)))"}
          )
        `);

            query = query.eq("id", id);
            if (teacherId) {
                query = query.eq("topics._TeacherTopics.A", teacherId);
            }

            const { data, error } = await query.single();

            if (error) throw error;

            // Map challenge questions for each topic; decode وسائط الدرس
            return {
                ...data,
                topics: (data?.topics || []).map((topic: any) => ({
                    ...topic,
                    mediaItems: mapTopicMediaItems(getMediaItemsFromTopicRow(topic)),
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
          mediaItems:topic_media (id, topic_id, type, url, content, caption, file_name, pdf_base64, sort_order),
          quizQuestions:quiz_questions (*),
          challengeItems:challenge_questions (*),
          activities:student_topic_activities (id, student_id, date)
        `)
                .eq("id", id)
                .single();

            if (error) throw error;

            // Map challenge questions from DB snake_case to frontend camelCase
            return {
                ...data,
                mediaItems: mapTopicMediaItems(getMediaItemsFromTopicRow(data)),
                challengeItems: (data?.challengeItems || []).map(mapChallengeQuestion),
            };
        },
        enabled: !!id,
    });
};

// --- Challenges ---

/** Attach `players` (player_sessions) for host dashboards and join flows. */
async function mergeSessionWithPlayers<T extends { id: string }>(session: T): Promise<T & { players: unknown[] }> {
    const { data, error } = await supabase
        .from("player_sessions")
        .select(`
            *,
            user:users(
                id,
                name,
                details,
                student_profiles(
                    grade:grades(name)
                )
            )
        `)
        .eq("session_id", session.id)
        .order("joined_at", { ascending: true });

    if (error) {
        console.warn("mergeSessionWithPlayers: fallback plain players", error.message);
        const { data: plain } = await supabase
            .from("player_sessions")
            .select("*")
            .eq("session_id", session.id)
            .order("joined_at", { ascending: true });
        return { ...session, players: plain || [] };
    }
    return { ...session, players: data || [] };
}

export const useChallengeSession = (
    pin: string,
    options?: { refetchInterval?: number | false }
) => {
    return useQuery({
        queryKey: ["challenge_session", pin],
        queryFn: async () => {
            // Priority 1: Try deep join for full metadata
            const { data, error } = await supabase
                .from("challenge_sessions")
                .select(`
                    *,
                    topic:topics (
                        *,
                        subject:subjects (
                            *,
                            grade:grades (*)
                        )
                    )
                `)
                .eq("pin", pin)
                .single();

            if (error) {
                console.warn("useChallengeSession: Fallback triggered due to join error:", error.message);
                
                // Priority 2: Fetch only session first to bypass join complexity/RLS issues
                const { data: sessionOnly, error: sessionError } = await supabase
                    .from("challenge_sessions")
                    .select("*")
                    .eq("pin", pin)
                    .single();

                if (sessionError) throw sessionError;

                // Priority 3: Fetch topic separately if session exists
                if (sessionOnly.topic_id) {
                    try {
                        const { data: topicData } = await supabase
                            .from("topics")
                            .select("*, subject:subjects(*, grade:grades(*))")
                            .eq("id", sessionOnly.topic_id)
                            .single();
                        
                        if (topicData) {
                            return mergeSessionWithPlayers({ ...sessionOnly, topic: topicData });
                        }
                    } catch (e) {
                        console.error("Failed to fetch topic separately:", e);
                    }
                }
                
                return mergeSessionWithPlayers(sessionOnly);
            }

            return mergeSessionWithPlayers(data);
        },
        enabled: pin.length === 6,
        refetchInterval: options?.refetchInterval,
    });
};

// --- Platform Settings ---
export const STUDENT_PUBLIC_DISCUSSIONS_ENABLED_KEY = "student_public_discussions_enabled";

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

// --- Public Topic Discussions ---

export const useTopicDiscussions = (topicId: string) => {
    return useQuery({
        queryKey: ["topic_discussions", topicId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("topic_discussions")
                .select(`
                    *,
                    user:users(
                        id,
                        name,
                        avatar,
                        role,
                        details,
                        student_profiles(
                            grade:grades(name)
                        )
                    ),
                    replies:topic_discussion_replies(
                        *,
                        user:users(
                            id,
                            name,
                            avatar,
                            role,
                            details,
                            student_profiles(
                                grade:grades(name)
                            )
                        ),
                        reactions:topic_discussion_reactions(
                            id,
                            user_id,
                            emoji
                        )
                    ),
                    reactions:topic_discussion_reactions(
                        id,
                        user_id,
                        emoji
                    )
                `)
                .eq("topic_id", topicId)
                .order("is_pinned", { ascending: false })
                .order("created_at", { ascending: false });

            if (error) throw error;
            return (data || []).map((discussion: any) => ({
                ...discussion,
                replies: (discussion.replies || []).sort(
                    (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                ),
            }));
        },
        enabled: !!topicId,
    });
};

export const useCreateTopicDiscussion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            topicId: string;
            userId: string;
            content: string;
            attachmentUrl?: string | null;
            attachmentName?: string | null;
            attachmentType?: string | null;
            sticker?: string | null;
        }) => {
            const { data, error } = await supabase
                .from("topic_discussions")
                .insert([{
                    topic_id: payload.topicId,
                    user_id: payload.userId,
                    content: payload.content.trim(),
                    attachment_url: payload.attachmentUrl || null,
                    attachment_name: payload.attachmentName || null,
                    attachment_type: payload.attachmentType || null,
                    sticker: payload.sticker || null,
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["topic_discussions", variables.topicId] });
        },
    });
};

export const useCreateTopicDiscussionReply = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            topicId: string;
            discussionId: string;
            userId: string;
            content: string;
            attachmentUrl?: string | null;
            attachmentName?: string | null;
            attachmentType?: string | null;
            sticker?: string | null;
        }) => {
            const { data, error } = await supabase
                .from("topic_discussion_replies")
                .insert([{
                    discussion_id: payload.discussionId,
                    user_id: payload.userId,
                    content: payload.content.trim(),
                    attachment_url: payload.attachmentUrl || null,
                    attachment_name: payload.attachmentName || null,
                    attachment_type: payload.attachmentType || null,
                    sticker: payload.sticker || null,
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["topic_discussions", variables.topicId] });
        },
    });
};

export const useToggleDiscussionReaction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            topicId: string;
            userId: string;
            emoji: string;
            discussionId?: string;
            replyId?: string;
        }) => {
            const base = {
                user_id: payload.userId,
                emoji: payload.emoji,
                discussion_id: payload.discussionId || null,
                reply_id: payload.replyId || null,
            };

            const query = supabase
                .from("topic_discussion_reactions")
                .select("id")
                .eq("user_id", payload.userId)
                .eq("emoji", payload.emoji);

            const { data: existing, error: existingError } = await (payload.discussionId
                ? query.eq("discussion_id", payload.discussionId).is("reply_id", null).maybeSingle()
                : query.eq("reply_id", payload.replyId || "").is("discussion_id", null).maybeSingle());

            if (existingError) throw existingError;

            if (existing?.id) {
                const { error: deleteError } = await supabase
                    .from("topic_discussion_reactions")
                    .delete()
                    .eq("id", existing.id);
                if (deleteError) throw deleteError;
                return { removed: true };
            }

            const { error: insertError } = await supabase
                .from("topic_discussion_reactions")
                .insert([base]);
            if (insertError) throw insertError;
            return { removed: false };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["topic_discussions", variables.topicId] });
        },
    });
};

export const useTopicRatings = (topicId: string) => {
    return useQuery({
        queryKey: ["topic_ratings", topicId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("topic_ratings")
                .select("id, user_id, rating, comment, created_at")
                .eq("topic_id", topicId)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!topicId,
    });
};

export const useUpsertTopicRating = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { topicId: string; userId: string; rating: number; comment?: string | null }) => {
            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from("topic_ratings")
                .upsert(
                    {
                        topic_id: payload.topicId,
                        user_id: payload.userId,
                        rating: payload.rating,
                        comment: payload.comment || null,
                        updated_at: now,
                    },
                    { onConflict: "topic_id,user_id" }
                )
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["topic_ratings", variables.topicId] });
        },
    });
};

// --- Topic Live Sessions ---

export const useTopicLiveSessions = (topicId: string) => {
    return useQuery({
        queryKey: ["topic_live_sessions", topicId],
        queryFn: async () => {
            const nowIso = new Date().toISOString();
            const { data, error } = await supabase
                .from("topic_live_sessions")
                .select(`
                    *,
                    host:teacher_profiles(
                        id,
                        user:users(id, name, avatar)
                    )
                `)
                .eq("topic_id", topicId)
                .eq("is_active", true)
                .gte("ends_at", nowIso)
                .order("starts_at", { ascending: true });
            if (error) throw error;
            return data || [];
        },
        enabled: !!topicId,
        refetchInterval: 30_000,
    });
};

export const useTeacherLiveSessions = (teacherId: string) => {
    return useQuery({
        queryKey: ["teacher_live_sessions", teacherId],
        queryFn: async () => {
            if (!teacherId) return [];
            const { data, error } = await supabase
                .from("topic_live_sessions")
                .select(`
                    *,
                    topic:topics(
                        id,
                        title,
                        subject:subjects(
                            id,
                            name,
                            grade:grades(
                                id,
                                slug,
                                name
                            )
                        )
                    )
                `)
                .eq("teacher_id", teacherId)
                .order("starts_at", { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!teacherId,
        refetchInterval: 30_000,
    });
};

export const useCreateTopicLiveSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            topicId: string;
            teacherId: string;
            provider: "GOOGLE_MEET" | "ZOOM" | "CUSTOM";
            meetingUrl: string;
            title?: string | null;
            startsAt: string;
            endsAt: string;
            notes?: string | null;
        }) => {
            const { data, error } = await supabase
                .from("topic_live_sessions")
                .insert([{
                    topic_id: payload.topicId,
                    teacher_id: payload.teacherId,
                    provider: payload.provider,
                    meeting_url: payload.meetingUrl.trim(),
                    title: payload.title?.trim() || null,
                    starts_at: payload.startsAt,
                    ends_at: payload.endsAt,
                    notes: payload.notes?.trim() || null,
                    is_active: true,
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["topic_live_sessions", variables.topicId] });
            queryClient.invalidateQueries({ queryKey: ["teacher_live_sessions", variables.teacherId] });
        },
    });
};

export const useUpdateTopicLiveSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            id: string;
            updates: Record<string, any>;
            topicId?: string;
            teacherId?: string;
        }) => {
            const { data, error } = await supabase
                .from("topic_live_sessions")
                .update(payload.updates)
                .eq("id", payload.id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["topic_live_sessions", variables.topicId || data.topic_id] });
            queryClient.invalidateQueries({ queryKey: ["teacher_live_sessions", variables.teacherId || data.teacher_id] });
        },
    });
};

export const useContentVisibilityFocus = () => {
    const q = usePlatformSettings();
    const focus = parseContentVisibilityFocus(q.data?.[CONTENT_VISIBILITY_FOCUS_KEY]);
    return { ...q, focus };
};

export const useVisitorGradeClassMode = () => {
    const q = usePlatformSettings();
    const mode = parseVisitorGradeClassMode(q.data?.[VISITOR_GRADE_CLASS_MODE_KEY]);
    return { ...q, mode };
};

export const useUpsertPlatformSetting = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { key: string; value: string; type?: string; label?: string | null }) => {
            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from("platform_settings")
                .upsert(
                    {
                        key: payload.key,
                        value: payload.value,
                        type: payload.type ?? "string",
                        label: payload.label ?? null,
                        updated_at: now,
                    },
                    { onConflict: "key" }
                )
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["platform_settings"] });
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
    // Get Clerk auth state (works because ClerkProvider wraps the app)
    let clerkUserId: string | null | undefined = undefined;
    let clerkEmail: string | undefined = undefined;
    let isClerkSignedIn = false;

    try {
        const clerkAuth = useClerkAuth();
        isClerkSignedIn = clerkAuth.isSignedIn || false;
        clerkUserId = clerkAuth.userId;
    } catch {
        // Clerk not available — ignore
    }

    return useQuery({
        queryKey: ["current_user"],
        queryFn: async () => {
            // 1. Try Clerk session first (Google login users)
            if (isClerkSignedIn && clerkUserId) {
                try {
                    // We can't get the email from useAuth directly,
                    // so we check localStorage first for the cached user
                    const stored = localStorage.getItem("edu_user");
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        if (parsed.email) {
                            const { data: user } = await supabase
                                .from("users")
                                .select("*")
                                .eq("email", parsed.email)
                                .maybeSingle();

                            if (user) return user;
                        }
                        // Return cached data if DB lookup fails
                        return parsed;
                    }
                } catch {
                    // Parse error — continue
                }
            }

            // 2. Try Supabase Auth session (email/password users)
            try {
                const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

                if (!authError && authUser) {
                    const { data: user } = await supabase
                        .from("users")
                        .select("*")
                        .eq("auth_id", authUser.id)
                        .maybeSingle();

                    if (user) return user;

                    // Fallback: try by email
                    if (authUser.email) {
                        const { data: userByEmail } = await supabase
                            .from("users")
                            .select("*")
                            .eq("email", authUser.email)
                            .maybeSingle();

                        if (userByEmail) return userByEmail;
                    }
                }
            } catch {
                // Auth session missing or expired — continue to fallback
            }

            // 3. Fallback to localStorage (demo accounts / seeded users without auth_id)
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
        gcTime: 0,
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
                .maybeSingle();

            if (error) {
                throw error;
            }
            return data || null;
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

/**
 * Single challenge attempts on teacher-owned topics.
 * This captures direct single links where session host may be the student.
 */
export const useTeacherSingleChallengeResults = (teacherProfileId: string, limit = 500) => {
    return useQuery({
        queryKey: ["teacher_single_challenge_results", teacherProfileId, limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("challenge_results")
                .select(`
          *,
          user:users (*),
          session:challenge_sessions!inner (
            *,
            players:player_sessions(
              id,
              user_id,
              name,
              avatar,
              user:users(id, name, avatar)
            ),
            topic:topics!inner (
              *,
              _TeacherTopics!inner (A)
            )
          )
        `)
                .eq("session.mode", "SINGLE")
                .eq("session.topic._TeacherTopics.A", teacherProfileId)
                .order("created_at", { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data;
        },
        enabled: !!teacherProfileId,
    });
};

/**
 * Full content report for one topic (teacher dashboard).
 * Calculates views + single/group challenge attempts and score metrics.
 */
export const useTeacherTopicContentReport = (
    topicId: string,
    _teacherUserId: string,
    _teacherProfileId: string
) => {
    return useQuery({
        queryKey: ["teacher_topic_content_report", topicId],
        queryFn: async () => {
            const normalizeSparseMetrics = (m: any) => {
                const out = { ...m };

                // Guest/sparse flows may only persist aggregates; fill obvious gaps.
                if (out.totalAttempts > 0) {
                    if ((out.uniqueSingleParticipants ?? 0) === 0 && (out.singleAttempts ?? 0) > 0) {
                        out.uniqueSingleParticipants = out.singleAttempts;
                    }
                    if ((out.uniqueGroupParticipants ?? 0) === 0 && (out.groupAttempts ?? 0) > 0) {
                        out.uniqueGroupParticipants = out.groupAttempts;
                    }
                    if ((out.uniqueParticipants ?? 0) === 0) {
                        out.uniqueParticipants = Math.max(
                            out.uniqueSingleParticipants || 0,
                            out.uniqueGroupParticipants || 0,
                            Math.min(out.totalAttempts, 1)
                        );
                    }

                    if ((out.medianScore ?? 0) === 0 && (out.averageScoreOverall ?? 0) > 0) {
                        out.medianScore = out.averageScoreOverall;
                    }
                    if ((out.lowestScore ?? 0) === 0 && (out.highestScore ?? 0) > 0) {
                        out.lowestScore = Math.min(out.highestScore, out.averageScoreOverall || out.highestScore);
                    }

                    // If no per-attempt timestamps are available, infer minimal activity from lastAttemptAt.
                    if ((out.attemptsToday ?? 0) === 0 && (out.attemptsLast7Days ?? 0) === 0 && out.lastAttemptAt) {
                        const ts = new Date(out.lastAttemptAt).getTime();
                        const now = Date.now();
                        const startOfToday = new Date();
                        startOfToday.setHours(0, 0, 0, 0);
                        if (ts >= startOfToday.getTime()) {
                            out.attemptsToday = out.totalAttempts;
                        }
                        if (ts >= now - (7 * 24 * 60 * 60 * 1000)) {
                            out.attemptsLast7Days = out.totalAttempts;
                        }
                        if (ts >= now - (30 * 24 * 60 * 60 * 1000) && (out.activityDaysLast30Days ?? 0) === 0) {
                            out.activityDaysLast30Days = 1;
                        }
                    }
                }

                return out;
            };

            const empty = {
                viewers: 0,
                uniqueViewers: 0,
                totalAttempts: 0,
                singleAttempts: 0,
                groupAttempts: 0,
                uniqueParticipants: 0,
                uniqueSingleParticipants: 0,
                uniqueGroupParticipants: 0,
                averageScoreOverall: 0,
                averageScoreSingle: 0,
                averageScoreGroup: 0,
                highestScore: 0,
                lowestScore: 0,
                medianScore: 0,
                passRate: 0,
                highPerformersCount: 0,
                lowPerformersCount: 0,
                attemptsToday: 0,
                attemptsLast7Days: 0,
                activityDaysLast30Days: 0,
                lastAttemptAt: null as string | null,
                questionAnalytics: [] as Array<{
                    questionId: string;
                    questionText: string;
                    attempts: number;
                    correct: number;
                    wrong: number;
                    accuracy: number;
                }>,
            };

            if (!topicId) return empty;

            const [topicRes, activityRes, sessionsRes, cachedReportRes] = await Promise.all([
                supabase
                    .from("topics")
                    .select("id, views, challengeItems:challenge_questions(id, question)")
                    .eq("id", topicId)
                    .maybeSingle(),
                supabase
                    .from("student_topic_activities")
                    .select("id, student_id, date")
                    .eq("topic_id", topicId),
                supabase
                    .from("challenge_sessions")
                    .select(`
                        id,
                        mode,
                        host_id,
                        topic_id
                    `)
                    .eq("topic_id", topicId)
                    .in("mode", ["GROUP", "SINGLE"]),
                supabase
                    .from("topic_content_reports")
                    .select("*")
                    .eq("topic_id", topicId)
                    .maybeSingle(),
            ]);

            if (topicRes.error) throw topicRes.error;
            if (activityRes.error) throw activityRes.error;
            if (sessionsRes.error) throw sessionsRes.error;
            if (cachedReportRes.error) throw cachedReportRes.error;

            const topicViews = Number(topicRes.data?.views || 0);
            const activities = activityRes.data || [];
            const sessions = sessionsRes.data || [];
            const cachedReport = cachedReportRes.data;
            const sessionIds = sessions.map((s: any) => s.id);
            const sessionModeById = new Map(sessionIds.map((sid: any) => {
                const session = sessions.find((s: any) => s.id === sid);
                return [sid, String(session?.mode || "").toUpperCase()];
            }));

            if (sessionIds.length === 0) {
                const liveBase = {
                    ...empty,
                    viewers: topicViews + activities.length,
                    uniqueViewers: new Set(activities.map((a: any) => a.student_id).filter((id: any) => !!id)).size,
                };
                if (!cachedReport) return normalizeSparseMetrics(liveBase);
                return normalizeSparseMetrics({
                    ...liveBase,
                    totalAttempts: Math.max(liveBase.totalAttempts, Number(cachedReport.total_attempts || 0)),
                    singleAttempts: Math.max(liveBase.singleAttempts, Number(cachedReport.single_attempts || 0)),
                    groupAttempts: Math.max(liveBase.groupAttempts, Number(cachedReport.group_attempts || 0)),
                    uniqueParticipants: Math.max(liveBase.uniqueParticipants, Number(cachedReport.unique_participants || 0)),
                    uniqueSingleParticipants: Math.max(liveBase.uniqueSingleParticipants, Number(cachedReport.unique_single_participants || 0)),
                    uniqueGroupParticipants: Math.max(liveBase.uniqueGroupParticipants, Number(cachedReport.unique_group_participants || 0)),
                    averageScoreOverall: Math.max(liveBase.averageScoreOverall, Number(cachedReport.average_score_overall || 0)),
                    averageScoreSingle: Math.max(liveBase.averageScoreSingle, Number(cachedReport.average_score_single || 0)),
                    averageScoreGroup: Math.max(liveBase.averageScoreGroup, Number(cachedReport.average_score_group || 0)),
                    highestScore: Math.max(liveBase.highestScore, Number(cachedReport.highest_score || 0)),
                    passRate: Math.max(liveBase.passRate, Number(cachedReport.pass_rate || 0)),
                    lastAttemptAt: liveBase.lastAttemptAt || cachedReport.last_attempt_at || null,
                    questionAnalytics: Array.isArray(cachedReport.question_analytics) ? cachedReport.question_analytics : [],
                });
            }

            const { data: results, error: resultsError } = await supabase
                .from("challenge_results")
                .select("id, session_id, user_id, score, percentage, created_at")
                .in("session_id", sessionIds);

            if (resultsError) throw resultsError;

            const groupResults = (results || []).filter((r: any) => sessionModeById.get(r.session_id) === "GROUP");
            const singleResults = (results || []).filter((r: any) => sessionModeById.get(r.session_id) === "SINGLE");

            const groupSessionIds = sessions
                .filter((s: any) => String(s.mode || "").toUpperCase() === "GROUP")
                .map((s: any) => s.id);
            const singleSessionIds = sessions
                .filter((s: any) => String(s.mode || "").toUpperCase() === "SINGLE")
                .map((s: any) => s.id);

            const fetchPlayerSessionsForReport = async (
                targetSessionIds: string[],
                withJoinedAt: boolean
            ) => {
                const detailedCols = withJoinedAt
                    ? "id, session_id, user_id, name, score, correct_answers, wrong_answers, time_taken, joined_at"
                    : "id, session_id, user_id, name, score, correct_answers, wrong_answers, time_taken";
                const baseCols = "id, session_id, user_id, name, score";

                const tryDetailed = await supabase
                    .from("player_sessions")
                    .select(detailedCols)
                    .in("session_id", targetSessionIds)
                    .eq("is_host", false);

                if (!tryDetailed.error) {
                    return tryDetailed.data || [];
                }

                // Some DBs may miss analytics columns; fallback to minimal stable columns.
                const tryBase = await supabase
                    .from("player_sessions")
                    .select(baseCols)
                    .in("session_id", targetSessionIds)
                    .eq("is_host", false);

                if (tryBase.error) throw tryBase.error;
                return tryBase.data || [];
            };

            let guestPlayers: any[] = [];
            if (groupSessionIds.length > 0) {
                guestPlayers = await fetchPlayerSessionsForReport(groupSessionIds, false);
            }

            let singlePlayers: any[] = [];
            if (singleSessionIds.length > 0) {
                singlePlayers = await fetchPlayerSessionsForReport(singleSessionIds, true);
            }

            const scoreOf = (r: any) => {
                const v = Number(r?.percentage ?? r?.score ?? 0);
                return Number.isFinite(v) ? v : 0;
            };

            const scoreRowsGroup = groupResults.map((r: any) => ({
                userKey: r.user_id ? `u:${r.user_id}` : null,
                score: scoreOf(r),
                createdAt: r.created_at as string | null,
            }));

            const scoreRowsSingle = singleResults.map((r: any) => ({
                userKey: r.user_id ? `u:${r.user_id}` : null,
                score: scoreOf(r),
                createdAt: r.created_at as string | null,
            }));

            // Add non-member players who completed group challenge but may not have challenge_results rows
            const resultUserIdsBySession = new Map<string, Set<string>>();
            groupResults.forEach((r: any) => {
                const sid = r.session?.id || r.session_id;
                const uid = r.user_id;
                if (!sid || !uid) return;
                if (!resultUserIdsBySession.has(sid)) resultUserIdsBySession.set(sid, new Set<string>());
                resultUserIdsBySession.get(sid)!.add(uid);
            });

            const guestCompletionRows = guestPlayers
                .filter((p: any) => {
                    const sid = p.session_id;
                    const uid = p.user_id;
                    if (uid && resultUserIdsBySession.get(sid)?.has(uid)) return false;
                    const ca = p.correct_answers || 0;
                    const wa = p.wrong_answers || 0;
                    return ca + wa > 0 || (p.score || 0) > 0;
                })
                .map((p: any) => {
                    const ca = p.correct_answers || 0;
                    const wa = p.wrong_answers || 0;
                    const pct = ca + wa > 0 ? Math.round((ca / (ca + wa)) * 100) : Number(p.score || 0);
                    return {
                        userKey: p.user_id ? `u:${p.user_id}` : p.name ? `n:${p.name}` : `g:${p.id}`,
                        score: Number.isFinite(pct) ? pct : 0,
                        createdAt: null as string | null,
                    };
                });

            // Include single attempts from player_sessions for non-user/guest flows
            const singleResultUserIdsBySession = new Map<string, Set<string>>();
            singleResults.forEach((r: any) => {
                const sid = r.session_id;
                const uid = r.user_id;
                if (!sid || !uid) return;
                if (!singleResultUserIdsBySession.has(sid)) singleResultUserIdsBySession.set(sid, new Set<string>());
                singleResultUserIdsBySession.get(sid)!.add(uid);
            });

            const singlePlayerCompletionRows = singlePlayers
                .filter((p: any) => {
                    const sid = p.session_id;
                    const uid = p.user_id;
                    if (uid && singleResultUserIdsBySession.get(sid)?.has(uid)) return false;
                    const ca = p.correct_answers || 0;
                    const wa = p.wrong_answers || 0;
                    return ca + wa > 0 || (p.score || 0) > 0;
                })
                .map((p: any) => {
                    const ca = p.correct_answers || 0;
                    const wa = p.wrong_answers || 0;
                    const pct = ca + wa > 0 ? Math.round((ca / (ca + wa)) * 100) : Number(p.score || 0);
                    return {
                        userKey: p.user_id ? `u:${p.user_id}` : p.name ? `n:${p.name}` : `g:${p.id}`,
                        score: Number.isFinite(pct) ? pct : 0,
                        createdAt: p.joined_at || null,
                    };
                });

            const allGroupRows = [...scoreRowsGroup, ...guestCompletionRows];
            const allSingleRows = [...scoreRowsSingle, ...singlePlayerCompletionRows];
            const allRows = [...allGroupRows, ...allSingleRows];

            const questionMap = new Map<string, { questionId: string; questionText: string; attempts: number; correct: number; wrong: number }>();
            const questionTextById = new Map<string, string>(
                ((topicRes.data as any)?.challengeItems || []).map((q: any) => [String(q.id), q.question || `سؤال ${q.id}`])
            );
            const trackQuestionResult = (questionId: any, isCorrect: boolean) => {
                if (questionId === undefined || questionId === null) return;
                const qid = String(questionId);
                const current = questionMap.get(qid) || {
                    questionId: qid,
                    questionText: questionTextById.get(qid) || `سؤال ${qid}`,
                    attempts: 0,
                    correct: 0,
                    wrong: 0,
                };
                current.attempts += 1;
                if (isCorrect) current.correct += 1;
                else current.wrong += 1;
                questionMap.set(qid, current);
            };

            (results || []).forEach((r: any) => {
                const qResults = Array.isArray(r?.question_results) ? r.question_results : [];
                qResults.forEach((q: any) => {
                    const qid = q?.questionId ?? q?.question_id ?? q?.id;
                    const ok = Boolean(q?.correct ?? q?.isCorrect ?? q?.is_correct);
                    trackQuestionResult(qid, ok);
                });
            });

            const questionAnalytics = Array.from(questionMap.values())
                .map((q) => ({
                    ...q,
                    accuracy: q.attempts > 0 ? Math.round((q.correct / q.attempts) * 100) : 0,
                }))
                .sort((a, b) => b.attempts - a.attempts);

            const avg = (arr: Array<{ score: number }>) =>
                arr.length ? Math.round(arr.reduce((a, r) => a + (r.score || 0), 0) / arr.length) : 0;

            const participantsAll = new Set<string>();
            const participantsSingle = new Set<string>();
            const participantsGroup = new Set<string>();

            allGroupRows.forEach((r) => { if (r.userKey) participantsGroup.add(r.userKey); if (r.userKey) participantsAll.add(r.userKey); });
            allSingleRows.forEach((r) => { if (r.userKey) participantsSingle.add(r.userKey); if (r.userKey) participantsAll.add(r.userKey); });

            const latestAttempt = allRows
                .map((r) => r.createdAt)
                .filter((d): d is string => !!d)
                .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;

            const totalAttempts = allRows.length;
            const passedCount = allRows.filter((r) => (r.score || 0) >= 70).length;
            const highestScore = allRows.length ? Math.max(...allRows.map((r) => r.score || 0)) : 0;
            const lowestScore = allRows.length ? Math.min(...allRows.map((r) => r.score || 0)) : 0;
            const sortedScores = allRows.map((r) => r.score || 0).sort((a, b) => a - b);
            const medianScore = sortedScores.length === 0
                ? 0
                : sortedScores.length % 2 === 1
                    ? sortedScores[Math.floor(sortedScores.length / 2)]
                    : Math.round((sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2);
            const highPerformersCount = allRows.filter((r) => (r.score || 0) >= 90).length;
            const lowPerformersCount = allRows.filter((r) => (r.score || 0) < 50).length;

            const now = Date.now();
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
            const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
            const attemptsToday = allRows.filter((r) => r.createdAt && new Date(r.createdAt).getTime() >= startOfToday.getTime()).length;
            const attemptsLast7Days = allRows.filter((r) => r.createdAt && new Date(r.createdAt).getTime() >= sevenDaysAgo).length;
            const activityDaysLast30Days = new Set(
                allRows
                    .filter((r) => r.createdAt && new Date(r.createdAt).getTime() >= thirtyDaysAgo)
                    .map((r) => new Date(r.createdAt as string).toISOString().slice(0, 10))
            ).size;

            const liveMetrics = {
                viewers: topicViews + activities.length,
                uniqueViewers: new Set(activities.map((a: any) => a.student_id).filter((id: any) => !!id)).size,
                totalAttempts,
                singleAttempts: allSingleRows.length,
                groupAttempts: allGroupRows.length,
                uniqueParticipants: participantsAll.size,
                uniqueSingleParticipants: participantsSingle.size,
                uniqueGroupParticipants: participantsGroup.size,
                averageScoreOverall: avg(allRows),
                averageScoreSingle: avg(allSingleRows),
                averageScoreGroup: avg(allGroupRows),
                highestScore,
                lowestScore,
                medianScore,
                passRate: totalAttempts ? Math.round((passedCount / totalAttempts) * 100) : 0,
                highPerformersCount,
                lowPerformersCount,
                attemptsToday,
                attemptsLast7Days,
                activityDaysLast30Days,
                lastAttemptAt: latestAttempt,
                questionAnalytics,
            };
            if (!cachedReport) return normalizeSparseMetrics(liveMetrics);

            const liveQuestionAnalytics = Array.isArray(liveMetrics.questionAnalytics) ? liveMetrics.questionAnalytics : [];
            const cachedQuestionAnalytics = Array.isArray(cachedReport.question_analytics) ? cachedReport.question_analytics : [];
            const mergedQuestionMap = new Map<string, any>();
            cachedQuestionAnalytics.forEach((q: any) => {
                const qid = String(q?.questionId || q?.question_id || "");
                if (!qid) return;
                mergedQuestionMap.set(qid, {
                    questionId: qid,
                    questionText: q?.questionText || q?.question_text || `سؤال ${qid}`,
                    attempts: Number(q?.attempts || 0),
                    correct: Number(q?.correct || 0),
                    wrong: Number(q?.wrong || 0),
                    accuracy: Number(q?.accuracy || 0),
                });
            });
            liveQuestionAnalytics.forEach((q: any) => {
                const qid = String(q?.questionId || q?.question_id || "");
                if (!qid) return;
                const existing = mergedQuestionMap.get(qid) || {
                    questionId: qid,
                    questionText: q?.questionText || q?.question_text || `سؤال ${qid}`,
                    attempts: 0,
                    correct: 0,
                    wrong: 0,
                    accuracy: 0,
                };
                existing.attempts += Number(q?.attempts || 0);
                existing.correct += Number(q?.correct || 0);
                existing.wrong += Number(q?.wrong || 0);
                existing.accuracy = existing.attempts > 0
                    ? Math.round((existing.correct / existing.attempts) * 100)
                    : 0;
                mergedQuestionMap.set(qid, existing);
            });
            const mergedQuestionAnalytics = Array.from(mergedQuestionMap.values()).sort((a, b) => b.attempts - a.attempts);

            return normalizeSparseMetrics({
                ...liveMetrics,
                totalAttempts: Math.max(liveMetrics.totalAttempts, Number(cachedReport.total_attempts || 0)),
                singleAttempts: Math.max(liveMetrics.singleAttempts, Number(cachedReport.single_attempts || 0)),
                groupAttempts: Math.max(liveMetrics.groupAttempts, Number(cachedReport.group_attempts || 0)),
                uniqueParticipants: Math.max(liveMetrics.uniqueParticipants, Number(cachedReport.unique_participants || 0)),
                uniqueSingleParticipants: Math.max(liveMetrics.uniqueSingleParticipants, Number(cachedReport.unique_single_participants || 0)),
                uniqueGroupParticipants: Math.max(liveMetrics.uniqueGroupParticipants, Number(cachedReport.unique_group_participants || 0)),
                averageScoreOverall: Math.max(liveMetrics.averageScoreOverall, Number(cachedReport.average_score_overall || 0)),
                averageScoreSingle: Math.max(liveMetrics.averageScoreSingle, Number(cachedReport.average_score_single || 0)),
                averageScoreGroup: Math.max(liveMetrics.averageScoreGroup, Number(cachedReport.average_score_group || 0)),
                highestScore: Math.max(liveMetrics.highestScore, Number(cachedReport.highest_score || 0)),
                passRate: Math.max(liveMetrics.passRate, Number(cachedReport.pass_rate || 0)),
                lastAttemptAt: liveMetrics.lastAttemptAt || cachedReport.last_attempt_at || null,
                questionAnalytics: mergedQuestionAnalytics,
            });
        },
        enabled: !!topicId,
    });
};

/** Read cached report row from topic_content_reports */
export const useTopicContentReportRow = (topicId: string) => {
    return useQuery({
        queryKey: ["topic_content_report_row", topicId],
        queryFn: async () => {
            if (!topicId) return null;
            const { data, error } = await supabase
                .from("topic_content_reports")
                .select("*")
                .eq("topic_id", topicId)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        enabled: !!topicId,
    });
};

/** Upsert cached report row in topic_content_reports */
export const useUpsertTopicContentReportRow = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            topic_id: string;
            teacher_user_id?: string | null;
            viewers: number;
            unique_viewers: number;
            total_attempts: number;
            single_attempts: number;
            group_attempts: number;
            unique_participants: number;
            unique_single_participants: number;
            unique_group_participants: number;
            average_score_overall: number;
            average_score_single: number;
            average_score_group: number;
            highest_score: number;
            pass_rate: number;
            last_attempt_at?: string | null;
        }) => {
            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from("topic_content_reports")
                .upsert(
                    {
                        ...payload,
                        computed_at: now,
                        updated_at: now,
                    },
                    { onConflict: "topic_id" }
                )
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["topic_content_report_row", data.topic_id] });
            queryClient.invalidateQueries({ queryKey: ["teacher_topic_content_report", data.topic_id] });
        },
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

export const useSessionResults = (
    sessionId: string,
    options?: { refetchInterval?: number | false }
) => {
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
        refetchInterval: options?.refetchInterval ?? false,
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

export const useTeacherAllTopics = (teacherProfileId: string) => {
    return useQuery({
        queryKey: ["teacher_topics_all", teacherProfileId],
        queryFn: async () => {
            if (!teacherProfileId) return [];

            const { data, error } = await supabase
                .from("topics")
                .select(`
                    *,
                    subject:subjects (*, grade:grades (*)),
                    _TeacherTopics!inner(A),
                    mediaItems:topic_media(id)
                `)
                .eq("_TeacherTopics.A", teacherProfileId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!teacherProfileId
    });
};

export const useCreateTopic = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload_with_teacher: any) => {
            const { teacherId, ...topic } = payload_with_teacher;
            const now = new Date().toISOString();
            const payload = { ...topic, updated_at: now };
            const { data, error } = await supabase
                .from("topics")
                .insert([payload])
                .select()
                .single();
            if (error) throw error;

            // Link to teacher profile if provided (required for teacher-scoped RLS on related rows)
            if (teacherId && data.id) {
                const { error: linkError } = await supabase
                    .from("_TeacherTopics")
                    .insert([{ A: teacherId, B: data.id }]);
                if (linkError) {
                    console.error("_TeacherTopics insert failed:", linkError);
                    throw new Error(
                        `فشل ربط الدرس بحساب المعلم: ${linkError.message}. بدون هذا الربط قد يفشل حفظ الوسائط أو الأسئلة.`
                    );
                }
            }

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
            const { error: deleteError } = await supabase.from("topic_media").delete().eq("topic_id", topicId);
            if (deleteError) {
                console.error("Error deleting existing media:", deleteError);
                throw new Error(`فشل حذف الوسائط القديمة: ${deleteError.message}`);
            }

            if (media.length === 0) return [];

            // Insert new media items (صوت/رابط → TEXT + JSON إذا لم يدعم DB قيم AUDIO/LINK)
            const mediaPayload = media.map((m, index) => {
                const row = encodeTopicMediaForInsert(m);
                return {
                    topic_id: topicId,
                    type: row.type,
                    url: row.url,
                    content: row.content,
                    caption: row.caption,
                    file_name: row.file_name,
                    pdf_base64: row.pdf_base64,
                    sort_order: index,
                };
            });

            console.log("[useSaveTopicMedia] inserting rows:", mediaPayload.length);

            const { data, error } = await supabase
                .from("topic_media")
                .insert(mediaPayload)
                .select();
            if (error) {
                console.error("Error inserting media:", error);
                throw new Error(`فشل حفظ الوسائط: ${error.message}`);
            }
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
            if (error) {
                console.error("challenge_questions insert:", error);
                throw new Error(`فشل حفظ أسئلة التحدي: ${error.message}${error.details ? ` (${error.details})` : ""}`);
            }
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
            scheduledStartTime?: string;
            scheduledEndTime?: string;
        }) => {
            const pin = session.pin || Math.floor(100000 + Math.random() * 900000).toString();
            const now = new Date().toISOString();
            const initialStatus = (session.mode === "GROUP" && !session.scheduledStartTime) ? "WAITING" : "PLAYING";

            const insertData: any = {
                pin,
                topic_id: session.topicId,
                host_id: session.hostId,
                mode: session.mode,
                category: session.category,
                status: initialStatus,
                started_at: now,
                scheduled_start_time: session.scheduledStartTime,
                scheduled_end_time: session.scheduledEndTime,
                created_at: now,
                updated_at: now,
            };

            // Only set finished_at for immediately finished sessions
            if (session.mode === "SINGLE") {
                // Historically single was marked FINISHED immediately in some flows, but really it should be PLAYING
                // Setting it to PLAYING is safe based on the app logic, but let's stick to the previous pattern if it's strictly single
            }

            console.log("Supabase Insert Data:", insertData);
            const { data, error } = await supabase
                .from("challenge_sessions")
                .insert([insertData])
                .select()
                .single();
            if (error) {
                console.error("Supabase Insert Error:", error);
                throw error;
            }
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
            queryClient.invalidateQueries({ queryKey: ["session_results", variables.sessionId] });
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


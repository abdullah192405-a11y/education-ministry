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
import { getSupportTicketTypeLabel } from "@/lib/supportTicketTypes";
import { sortTopicsByOrder } from "@/lib/sortTopics";

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

type GradesOptions = {
    organizationId?: string | null;
    enabled?: boolean;
};

export const useGrades = (options?: GradesOptions) => {
    const orgId = options?.organizationId && String(options.organizationId).length ? options.organizationId : null;
    const enabled = options?.enabled ?? true;
    return useQuery({
        queryKey: ["grades", orgId ?? "all"],
        queryFn: async () => {
            console.log("useGrades: Fetching grades...");
            let query = supabase
                .from("grades")
                .select(`
          *,
          organizations (id, name),
          subjects (
            id,
            name,
            description,
            icon,
            color,
            topics (
              id,
              title,
              mediaItems:topic_media (id, type),
              quizQuestions:quiz_questions (id)
            )
          ),
          student_profiles (id)
        `)
                .order("sort_order", { ascending: true });
            if (orgId) {
                query = query.eq("organization_id", orgId);
            }
            const { data, error } = await query;

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
        enabled,
    });
};

type OrgScopeOptions = {
    organizationId?: string | null;
};

export const useGradeDetail = (slug: string, options?: OrgScopeOptions) => {
    const orgId = options?.organizationId && String(options.organizationId).length ? options.organizationId : null;
    return useQuery({
        queryKey: ["grade", slug, orgId ?? "all"],
        queryFn: async () => {
            let query = supabase
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
                .eq("slug", slug);
            if (orgId) {
                query = query.eq("organization_id", orgId);
            }
            const { data, error } = await query.single();

            if (error) throw error;

            // Map student_profiles count to students_count; decode صوت/رابط المخزّنة كـ TEXT
            const subjects = (data?.subjects || []).map((s: any) => ({
                ...s,
                topics: sortTopicsByOrder(
                    (s.topics || []).map((t: any) => ({
                        ...t,
                        mediaItems: mapTopicMediaItems(getMediaItemsFromTopicRow(t)),
                    })),
                ),
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

export const useSubject = (id: string, teacherId?: string, options?: OrgScopeOptions) => {
    const orgId = options?.organizationId && String(options.organizationId).length ? options.organizationId : null;
    return useQuery({
        queryKey: ["subject", id, teacherId, orgId ?? "all"],
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
            if (orgId) {
                query = query.eq("grade.organization_id", orgId);
            }
            if (teacherId) {
                query = query.eq("topics._TeacherTopics.A", teacherId);
            }

            const { data, error } = await query.single();

            if (error) throw error;

            // Map challenge questions for each topic; decode وسائط الدرس
            return {
                ...data,
                topics: sortTopicsByOrder(
                    (data?.topics || []).map((topic: any) => ({
                        ...topic,
                        mediaItems: mapTopicMediaItems(getMediaItemsFromTopicRow(topic)),
                        challengeItems: (topic.challengeItems || []).map(mapChallengeQuestion),
                    })),
                ),
            };
        },
        enabled: !!id,
    });
};

export const useTopic = (id: string, options?: OrgScopeOptions) => {
    const orgId = options?.organizationId && String(options.organizationId).length ? options.organizationId : null;
    return useQuery({
        queryKey: ["topic", id, orgId ?? "all"],
        queryFn: async () => {
            let query = supabase
                .from("topics")
                .select(`
          *,
          subject:subjects (*, grade:grades (*), topics(id)),
          _TeacherTopics(teacher_profiles(user_id)),
          mediaItems:topic_media (id, topic_id, type, url, content, caption, file_name, pdf_base64, sort_order),
          quizQuestions:quiz_questions (*),
          challengeItems:challenge_questions (*),
          activities:student_topic_activities (id, student_id, date)
        `)
                .eq("id", id);
            if (orgId) {
                query = query.eq("subject.grade.organization_id", orgId);
            }
            const { data, error } = await query.single();

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

const USER_WITH_ORG_SELECT = "*, organizations(*)";

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
                                .select(USER_WITH_ORG_SELECT)
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
                        .select(USER_WITH_ORG_SELECT)
                        .eq("auth_id", authUser.id)
                        .maybeSingle();

                    if (user) return user;

                    // Fallback: try by email
                    if (authUser.email) {
                        const { data: userByEmail } = await supabase
                            .from("users")
                            .select(USER_WITH_ORG_SELECT)
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
                            .select(USER_WITH_ORG_SELECT)
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
            const toRecord = (value: unknown): Record<string, unknown> =>
                value && typeof value === "object" ? value as Record<string, unknown> : {};

            const clampScorePercent = (score: number) => Math.max(0, Math.min(100, Math.round(score)));

            const scoreOf = (r: unknown) => {
                const row = toRecord(r);
                const percentage = Number(row.percentage);
                if (Number.isFinite(percentage)) return clampScorePercent(percentage);

                const score = Number(row.score);
                const maxScore = Number(row.max_score ?? row.maxScore);
                if (Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0) {
                    return clampScorePercent((score / maxScore) * 100);
                }

                return Number.isFinite(score) ? clampScorePercent(score) : 0;
            };

            const weightedAverage = (liveAverage: number, liveCount: number, cachedAverage: number, cachedCount: number) => {
                const totalCount = liveCount + cachedCount;
                if (totalCount <= 0) return 0;
                return Math.round(((liveAverage * liveCount) + (cachedAverage * cachedCount)) / totalCount);
            };

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
                const cachedSingleAttempts = Number(cachedReport.single_attempts || 0);
                const cachedGroupAttempts = Number(cachedReport.group_attempts || 0);
                const cachedTotalAttempts = Number(cachedReport.total_attempts || cachedSingleAttempts + cachedGroupAttempts || 0);
                return normalizeSparseMetrics({
                    ...liveBase,
                    totalAttempts: cachedTotalAttempts,
                    singleAttempts: cachedSingleAttempts,
                    groupAttempts: cachedGroupAttempts,
                    uniqueParticipants: Number(cachedReport.unique_participants || 0),
                    uniqueSingleParticipants: Number(cachedReport.unique_single_participants || 0),
                    uniqueGroupParticipants: Number(cachedReport.unique_group_participants || 0),
                    averageScoreOverall: Number(cachedReport.average_score_overall || 0),
                    averageScoreSingle: Number(cachedReport.average_score_single || 0),
                    averageScoreGroup: Number(cachedReport.average_score_group || 0),
                    highestScore: Number(cachedReport.highest_score || 0),
                    passRate: Number(cachedReport.pass_rate || 0),
                    lastAttemptAt: cachedReport.last_attempt_at || null,
                    questionAnalytics: Array.isArray(cachedReport.question_analytics) ? cachedReport.question_analytics : [],
                });
            }

            const { data: results, error: resultsError } = await supabase
                .from("challenge_results")
                .select("id, session_id, user_id, score, max_score, percentage, question_results, created_at")
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

            const cachedSingleAttempts = Number(cachedReport.single_attempts || 0);
            const cachedGroupAttempts = Number(cachedReport.group_attempts || 0);
            const cachedTotalAttempts = Math.max(
                Number(cachedReport.total_attempts || 0),
                cachedSingleAttempts + cachedGroupAttempts
            );
            const cachedUniqueSingle = Number(cachedReport.unique_single_participants || 0) || cachedSingleAttempts;
            const cachedUniqueGroup = Number(cachedReport.unique_group_participants || 0) || cachedGroupAttempts;
            const cachedUniqueParticipants = Number(cachedReport.unique_participants || 0)
                || Math.max(cachedUniqueSingle, cachedUniqueGroup);
            const cachedPassRate = Number(cachedReport.pass_rate || 0);
            const cachedPassedCount = Math.round((cachedPassRate / 100) * cachedTotalAttempts);
            const cachedLastAttemptAt = cachedReport.last_attempt_at || null;
            const cachedLastAttemptTime = cachedLastAttemptAt ? new Date(cachedLastAttemptAt).getTime() : NaN;
            const cachedAttemptsToday = Number.isFinite(cachedLastAttemptTime) && cachedLastAttemptTime >= startOfToday.getTime()
                ? cachedTotalAttempts
                : 0;
            const cachedAttemptsLast7Days = Number.isFinite(cachedLastAttemptTime) && cachedLastAttemptTime >= sevenDaysAgo
                ? cachedTotalAttempts
                : 0;
            const combinedActivityDays = new Set(
                allRows
                    .filter((r) => r.createdAt && new Date(r.createdAt).getTime() >= thirtyDaysAgo)
                    .map((r) => new Date(r.createdAt as string).toISOString().slice(0, 10))
            );
            if (Number.isFinite(cachedLastAttemptTime) && cachedLastAttemptTime >= thirtyDaysAgo) {
                combinedActivityDays.add(new Date(cachedLastAttemptAt as string).toISOString().slice(0, 10));
            }

            const combinedTotalAttempts = liveMetrics.totalAttempts + cachedTotalAttempts;
            const combinedSingleAttempts = liveMetrics.singleAttempts + cachedSingleAttempts;
            const combinedGroupAttempts = liveMetrics.groupAttempts + cachedGroupAttempts;
            const liveLastAttemptTime = liveMetrics.lastAttemptAt ? new Date(liveMetrics.lastAttemptAt).getTime() : NaN;
            const lastAttemptAt = Number.isFinite(cachedLastAttemptTime) && (!Number.isFinite(liveLastAttemptTime) || cachedLastAttemptTime > liveLastAttemptTime)
                ? cachedLastAttemptAt
                : liveMetrics.lastAttemptAt;

            return normalizeSparseMetrics({
                ...liveMetrics,
                totalAttempts: combinedTotalAttempts,
                singleAttempts: combinedSingleAttempts,
                groupAttempts: combinedGroupAttempts,
                uniqueParticipants: liveMetrics.uniqueParticipants + cachedUniqueParticipants,
                uniqueSingleParticipants: liveMetrics.uniqueSingleParticipants + cachedUniqueSingle,
                uniqueGroupParticipants: liveMetrics.uniqueGroupParticipants + cachedUniqueGroup,
                averageScoreOverall: weightedAverage(
                    liveMetrics.averageScoreOverall,
                    liveMetrics.totalAttempts,
                    Number(cachedReport.average_score_overall || 0),
                    cachedTotalAttempts
                ),
                averageScoreSingle: weightedAverage(
                    liveMetrics.averageScoreSingle,
                    liveMetrics.singleAttempts,
                    Number(cachedReport.average_score_single || 0),
                    cachedSingleAttempts
                ),
                averageScoreGroup: weightedAverage(
                    liveMetrics.averageScoreGroup,
                    liveMetrics.groupAttempts,
                    Number(cachedReport.average_score_group || 0),
                    cachedGroupAttempts
                ),
                highestScore: Math.max(liveMetrics.highestScore, Number(cachedReport.highest_score || 0)),
                passRate: combinedTotalAttempts ? Math.round(((passedCount + cachedPassedCount) / combinedTotalAttempts) * 100) : 0,
                attemptsToday: liveMetrics.attemptsToday + cachedAttemptsToday,
                attemptsLast7Days: liveMetrics.attemptsLast7Days + cachedAttemptsLast7Days,
                activityDaysLast30Days: combinedActivityDays.size,
                lastAttemptAt,
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

type AdminStatsOptions = {
    /** When set (مدير مؤسسة): user counts ضمن هذه المؤسسة فقط. المحتوى التعليمي يبقى إحصاء المنصة. */
    organizationId?: string | null;
    enabled?: boolean;
};

export const useAdminStats = (options?: AdminStatsOptions) => {
    const orgId = options?.organizationId && String(options.organizationId).length ? options.organizationId : null;
    const enabled = options?.enabled ?? true;

    return useQuery({
        queryKey: ["admin_stats", orgId ?? "all"],
        queryFn: async () => {
            const [usersCount, sessionsCount, gradesCount, subjectsCount, topicsCount, teachersCount, studentsCount] =
                await Promise.all([
                    orgId
                        ? supabase
                              .from("users")
                              .select("*", { count: "exact", head: true })
                              .eq("organization_id", orgId)
                        : supabase.from("users").select("*", { count: "exact", head: true }),
                    orgId
                        ? supabase
                              .from("challenge_sessions")
                              .select("id, topic:topics!inner(id, subject:subjects!inner(id, grade:grades!inner(id, organization_id)))", {
                                  count: "exact",
                                  head: true,
                              })
                              .eq("topic.subject.grade.organization_id", orgId)
                        : supabase.from("challenge_sessions").select("*", { count: "exact", head: true }),
                    orgId
                        ? supabase.from("grades").select("*", { count: "exact", head: true }).eq("organization_id", orgId)
                        : supabase.from("grades").select("*", { count: "exact", head: true }),
                    orgId
                        ? supabase
                              .from("subjects")
                              .select("id, grade:grades!inner(id, organization_id)", { count: "exact", head: true })
                              .eq("grade.organization_id", orgId)
                        : supabase.from("subjects").select("*", { count: "exact", head: true }),
                    orgId
                        ? supabase
                              .from("topics")
                              .select("id, subject:subjects!inner(id, grade:grades!inner(id, organization_id))", { count: "exact", head: true })
                              .eq("subject.grade.organization_id", orgId)
                        : supabase.from("topics").select("*", { count: "exact", head: true }),
                    orgId
                        ? supabase
                              .from("users")
                              .select("*", { count: "exact", head: true })
                              .eq("role", "TEACHER")
                              .eq("organization_id", orgId)
                        : supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "TEACHER"),
                    orgId
                        ? supabase
                              .from("users")
                              .select("*", { count: "exact", head: true })
                              .eq("role", "STUDENT")
                              .eq("organization_id", orgId)
                        : supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "STUDENT"),
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
        enabled,
    });
};

export const useRecentAuditLogs = (limit = 10, options?: { enabled?: boolean }) => {
    const enabled = options?.enabled ?? true;
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
        enabled,
    });
};

export const useOrganizations = (options?: { includeInactive?: boolean }) => {
    const includeInactive = options?.includeInactive ?? false;

    return useQuery({
        queryKey: ["organizations", includeInactive],
        queryFn: async () => {
            let q = supabase.from("organizations").select("*").order("name", { ascending: true });
            if (!includeInactive) {
                q = q.eq("is_active", true);
            }
            const { data, error } = await q;

            if (error) throw error;
            return data ?? [];
        },
    });
};

/** مديرو المؤسسات (ADMIN) للإشراف السوبر أدمن فقط من الواجهة. */
export const useOrgAdminUsers = () => {
    return useQuery({
        queryKey: ["org_admin_users"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("users")
                .select("id, name, email, details, organization_id, created_at, organizations ( id, name, slug )")
                .eq("role", "ADMIN")
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data ?? [];
        },
    });
};

type OrganizationKind = "EDUCATIONAL" | "ENRICHMENT" | "BOTH";
type OrgSubscriptionPackage = "INSTITUTION_ADMIN_STUDENT" | "INSTITUTION_FULL";
type OrgSubscriptionStatus = "ACTIVE" | "TRIAL" | "PAST_DUE" | "CANCELED";
type OrgBillingCycle = "MONTHLY" | "YEARLY";

type UpsertOrganizationPayload = {
    id?: string;
    name: string;
    slug: string;
    kind: OrganizationKind;
    subscription_package: OrgSubscriptionPackage;
    is_active?: boolean;
    entity_type?: "SCHOOL" | "ORG";
    image_url?: string | null;
    description?: string | null;
};

export const useUpsertOrganization = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: UpsertOrganizationPayload) => {
            const now = new Date().toISOString();
            if (payload.id) {
                const { data, error } = await supabase
                    .from("organizations")
                    .update({
                        name: payload.name,
                        slug: payload.slug,
                        kind: payload.kind,
                        subscription_package: payload.subscription_package,
                        is_active: payload.is_active ?? true,
                        entity_type: payload.entity_type ?? "SCHOOL",
                        image_url: payload.image_url ?? null,
                        description: payload.description?.trim() || null,
                        updated_at: now,
                    })
                    .eq("id", payload.id)
                    .select("*")
                    .single();
                if (error) throw error;
                return data;
            }

            const { data, error } = await supabase
                .from("organizations")
                .insert({
                    name: payload.name,
                    slug: payload.slug,
                    kind: payload.kind,
                    subscription_package: payload.subscription_package,
                    is_active: payload.is_active ?? true,
                    entity_type: payload.entity_type ?? "SCHOOL",
                    image_url: payload.image_url ?? null,
                    description: payload.description?.trim() || null,
                    created_at: now,
                    updated_at: now,
                })
                .select("*")
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organizations"] });
            queryClient.invalidateQueries({ queryKey: ["org_admin_users"] });
            queryClient.invalidateQueries({ queryKey: ["all_users"] });
        },
    });
};

export const useDeleteOrganization = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("organizations").delete().eq("id", id);
            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organizations"] });
            queryClient.invalidateQueries({ queryKey: ["org_admin_users"] });
            queryClient.invalidateQueries({ queryKey: ["all_users"] });
        },
    });
};

export const useOrganizationSubscriptions = () => {
    return useQuery({
        queryKey: ["organization_subscriptions"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("organization_subscriptions")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data ?? [];
        },
    });
};

type UpsertOrganizationSubscriptionPayload = {
    organization_id: string;
    subscription_package: OrgSubscriptionPackage;
    billing_cycle: OrgBillingCycle;
    status: OrgSubscriptionStatus;
    price_amount: number;
    currency_code?: string;
    starts_at?: string;
    ends_at?: string | null;
    next_billing_at?: string | null;
    auto_renew?: boolean;
    notes?: string | null;
};

export const useUpsertOrganizationSubscription = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: UpsertOrganizationSubscriptionPayload) => {
            const now = new Date().toISOString();

            const row = {
                organization_id: payload.organization_id,
                subscription_package: payload.subscription_package,
                billing_cycle: payload.billing_cycle,
                status: payload.status,
                price_amount: Number(payload.price_amount || 0),
                currency_code: payload.currency_code || "SAR",
                starts_at: payload.starts_at || now,
                ends_at: payload.ends_at ?? null,
                next_billing_at: payload.next_billing_at ?? null,
                auto_renew: payload.auto_renew ?? true,
                notes: payload.notes ?? null,
                updated_at: now,
            };

            const { data, error } = await supabase
                .from("organization_subscriptions")
                .upsert(row, { onConflict: "organization_id" })
                .select("*")
                .single();
            if (error) throw error;

            const { error: orgErr } = await supabase
                .from("organizations")
                .update({ subscription_package: payload.subscription_package, updated_at: now })
                .eq("id", payload.organization_id);
            if (orgErr) throw orgErr;

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["organization_subscriptions"] });
            queryClient.invalidateQueries({ queryKey: ["organizations"] });
            queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
        },
    });
};

type UpdateOrgAdminPayload = {
    id: string;
    organization_id?: string | null;
    is_active?: boolean;
    name?: string;
};

export const useUpdateOrgAdmin = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: UpdateOrgAdminPayload) => {
            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from("users")
                .update({ ...updates, updated_at: now })
                .eq("id", id)
                .eq("role", "ADMIN")
                .select("id, name, email, organization_id, is_active")
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["org_admin_users"] });
            queryClient.invalidateQueries({ queryKey: ["all_users"] });
        },
    });
};

export const useDeleteOrgAdmin = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("users")
                .delete()
                .eq("id", id)
                .eq("role", "ADMIN");
            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["org_admin_users"] });
            queryClient.invalidateQueries({ queryKey: ["all_users"] });
        },
    });
};

type AllUsersOptions = {
    organizationId?: string | null;
    enabled?: boolean;
};

export const useAllUsers = (options?: AllUsersOptions) => {
    const orgId = options?.organizationId && String(options.organizationId).length ? options.organizationId : null;
    const enabled = options?.enabled ?? true;

    return useQuery({
        queryKey: ["all_users", orgId ?? "all"],
        queryFn: async () => {
            let q = supabase.from("users").select("*").order("created_at", { ascending: false });
            if (orgId) {
                q = q.eq("organization_id", orgId);
            }

            const { data, error } = await q;

            if (error) throw error;
            return data;
        },
        enabled,
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
            queryClient.invalidateQueries({ queryKey: ["all_users"] });
            queryClient.invalidateQueries({ queryKey: ["org_admin_users"] });
            queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
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
            queryClient.invalidateQueries({ queryKey: ["grade"] });
        }
    });
};

/** Persist display order for all topics in a subject (lesson reordering in teacher dashboard). */
export const useReorderTopics = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            orders,
        }: {
            orders: { id: string; sort_order: number }[];
            subjectId: string;
        }) => {
            const now = new Date().toISOString();
            const results = await Promise.all(
                orders.map(({ id, sort_order }) =>
                    supabase.from("topics").update({ sort_order, updated_at: now }).eq("id", id),
                ),
            );
            const failed = results.find((r) => r.error);
            if (failed?.error) throw failed.error;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["subject", variables.subjectId] });
            queryClient.invalidateQueries({ queryKey: ["grade"] });
            queryClient.invalidateQueries({ queryKey: ["teacher_topics_all"] });
        },
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
            userId?: string | null;
            participantDisplayName?: string | null;
            participantExtra?: string | null;
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
                    user_id: result.userId ?? null,
                    participant_display_name: result.participantDisplayName ?? null,
                    participant_extra: result.participantExtra ?? null,
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
            if (variables.userId) {
                queryClient.invalidateQueries({ queryKey: ["recent_challenge_results", variables.userId] });
            }
            queryClient.invalidateQueries({ queryKey: ["hosted_challenge_results"] });
            queryClient.invalidateQueries({ queryKey: ["session_results", variables.sessionId] });
            queryClient.invalidateQueries({ queryKey: ["teacher_single_challenge_results"] });
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

// --- Support tickets (student → teacher by grade, teacher → admin, escalation) ---

const parseAttachmentUrls = (raw: unknown): string[] => {
    if (Array.isArray(raw)) return raw.filter((u): u is string => typeof u === "string");
    return [];
};

export const mapSupportTicket = (r: any) => ({
    id: r.id,
    authorUserId: r.author_user_id ?? r.authorUserId,
    authorNameSnapshot: r.author_name_snapshot ?? r.authorNameSnapshot ?? null,
    gradeId: r.grade_id ?? r.gradeId,
    scope: r.scope,
    ticketType: r.ticket_type ?? r.ticketType ?? "OTHER",
    subject: r.subject,
    body: r.body,
    attachmentUrls: parseAttachmentUrls(r.attachment_urls ?? r.attachmentUrls),
    status: r.status,
    parentTicketId: r.parent_ticket_id ?? r.parentTicketId,
    teacherEscalationNote: r.teacher_escalation_note ?? r.teacherEscalationNote,
    resolvedAt: r.resolved_at ?? r.resolvedAt,
    createdAt: r.created_at ?? r.createdAt,
    updatedAt: r.updated_at ?? r.updatedAt,
    author: r.author,
    grade: r.grade,
    parent: r.parent ? mapSupportTicket(r.parent) : undefined,
});

/** Load user rows for ticket authors; SECURITY DEFINER RPC bypasses RLS on `users`; merges with direct select for any gaps. */
async function fetchSupportTicketAuthorsByIds(ids: string[]): Promise<
    Map<string, { id: string; name: string; email?: string | null }>
> {
    const map = new Map<string, { id: string; name: string; email?: string | null }>();
    const unique = [...new Set(ids.filter((x): x is string => typeof x === "string" && !!x))];
    if (!unique.length) return map;

    const { data: rpcData, error: rpcErr } = await supabase.rpc("support_ticket_resolve_authors", {
        p_ids: unique,
    });
    if (!rpcErr && Array.isArray(rpcData)) {
        for (const row of rpcData as { author_id: string; name: string; email: string | null }[]) {
            if (row.author_id) {
                map.set(row.author_id, { id: row.author_id, name: row.name, email: row.email });
            }
        }
    }

    const missing = unique.filter((id) => !map.has(id));
    if (missing.length > 0) {
        const { data: users } = await supabase.from("users").select("id, name, email").in("id", missing);
        (users || []).forEach((u: { id: string; name: string; email?: string | null }) => map.set(u.id, u));
    }

    return map;
}

function buildStudentAuthorFromParent(
    parentRow: { author_user_id?: string; author_name_snapshot?: string | null },
    byId: Map<string, { id: string; name: string; email?: string | null }>
): { name?: string; email?: string | null } {
    const uid = parentRow.author_user_id as string;
    const fetched = uid ? byId.get(uid) : undefined;
    const snap = (parentRow.author_name_snapshot ?? "").trim();
    const name = snap || fetched?.name || undefined;
    return {
        name,
        email: fetched?.email ?? undefined,
    };
}

export const useMyStudentSupportTickets = (userId: string) => {
    return useQuery({
        queryKey: ["support_tickets", "student", userId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("support_tickets")
                .select(`
          *,
          grade:grades (id, name, slug)
        `)
                .eq("author_user_id", userId)
                .eq("scope", "STUDENT_TO_TEACHER")
                .order("created_at", { ascending: false });

            if (error) throw error;
            return (data || []).map(mapSupportTicket);
        },
        enabled: !!userId,
    });
};

export const useTeacherIncomingStudentTickets = (teacherGradeId: string | undefined) => {
    return useQuery({
        queryKey: ["support_tickets", "teacher_incoming", teacherGradeId],
        queryFn: async () => {
            if (!teacherGradeId) return [];
            const { data, error } = await supabase
                .from("support_tickets")
                .select(`
          *,
          author:users!author_user_id (id, name, email, avatar),
          grade:grades (id, name, slug)
        `)
                .eq("scope", "STUDENT_TO_TEACHER")
                .eq("grade_id", teacherGradeId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return (data || []).map(mapSupportTicket);
        },
        enabled: !!teacherGradeId,
    });
};

export const useTeacherAdminSupportTickets = (teacherUserId: string) => {
    return useQuery({
        queryKey: ["support_tickets", "teacher_admin_outbound", teacherUserId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("support_tickets")
                .select(`
          *,
          parent:support_tickets!parent_ticket_id (
            id,
            subject,
            body,
            author_user_id,
            ticket_type,
            attachment_urls,
            author_name_snapshot
          )
        `)
                .eq("scope", "TEACHER_TO_ADMIN")
                .eq("author_user_id", teacherUserId)
                .order("created_at", { ascending: false });

            if (error) throw error;

            const rows = data || [];
            const studentAuthorIds = [
                ...new Set(
                    rows
                        .map((r: { parent?: unknown }) => {
                            const p = r.parent as { author_user_id?: string } | { author_user_id?: string }[] | null | undefined;
                            const row = Array.isArray(p) ? p[0] : p;
                            return row?.author_user_id;
                        })
                        .filter((id: string | undefined): id is string => typeof id === "string" && !!id)
                ),
            ];

            const studentById = await fetchSupportTicketAuthorsByIds(studentAuthorIds);

            return rows.map((row: any) => {
                const rawParent = row.parent;
                const parentRow = Array.isArray(rawParent) ? rawParent[0] : rawParent;
                return {
                    ...mapSupportTicket(row),
                    parent: parentRow
                        ? {
                              ...mapSupportTicket(parentRow),
                              studentAuthor: buildStudentAuthorFromParent(parentRow, studentById),
                          }
                        : undefined,
                };
            });
        },
        enabled: !!teacherUserId,
    });
};

export const useAdminSupportTickets = () => {
    return useQuery({
        queryKey: ["support_tickets", "admin"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("support_tickets")
                .select(`
          *,
          author:users!author_user_id (id, name, email, avatar, role, organization_id),
          grade:grades (id, name, slug),
          parent:support_tickets!parent_ticket_id (
            id,
            subject,
            body,
            scope,
            author_user_id,
            ticket_type,
            attachment_urls,
            author_name_snapshot
          )
        `)
                .eq("scope", "TEACHER_TO_ADMIN")
                .order("created_at", { ascending: false });

            if (error) throw error;

            const rows = data || [];
            const studentAuthorIds = [
                ...new Set(
                    rows
                        .map((r: { parent?: unknown }) => {
                            const p = r.parent as { author_user_id?: string } | { author_user_id?: string }[] | null | undefined;
                            const row = Array.isArray(p) ? p[0] : p;
                            return row?.author_user_id;
                        })
                        .filter((id: string | undefined): id is string => typeof id === "string" && !!id)
                ),
            ];

            const studentById = await fetchSupportTicketAuthorsByIds(studentAuthorIds);

            return rows.map((row: any) => {
                const rawParent = row.parent;
                const parentRow = Array.isArray(rawParent) ? rawParent[0] : rawParent;
                return {
                    ...mapSupportTicket(row),
                    author: row.author,
                    grade: row.grade,
                    parent: parentRow
                        ? {
                              ...mapSupportTicket(parentRow),
                              studentAuthor: buildStudentAuthorFromParent(parentRow, studentById),
                          }
                        : undefined,
                };
            });
        },
    });
};

export const useSuperadminSupportTickets = () => {
    return useQuery({
        queryKey: ["support_tickets", "superadmin"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("support_tickets")
                .select(`
          *,
          author:users!author_user_id (id, name, email, avatar, role),
          parent:support_tickets!parent_ticket_id (
            id,
            subject,
            body,
            scope,
            author_user_id,
            ticket_type,
            attachment_urls,
            author_name_snapshot
          )
        `)
                .eq("scope", "ADMIN_TO_SUPERADMIN")
                .order("created_at", { ascending: false });

            if (error) throw error;

            const rows = data || [];
            const parentAuthorIds = [
                ...new Set(
                    rows
                        .map((r: { parent?: unknown }) => {
                            const p = r.parent as { author_user_id?: string } | { author_user_id?: string }[] | null | undefined;
                            const row = Array.isArray(p) ? p[0] : p;
                            return row?.author_user_id;
                        })
                        .filter((id: string | undefined): id is string => typeof id === "string" && !!id)
                ),
            ];
            const parentAuthorById = await fetchSupportTicketAuthorsByIds(parentAuthorIds);

            return rows.map((row: any) => {
                const rawParent = row.parent;
                const parentRow = Array.isArray(rawParent) ? rawParent[0] : rawParent;
                return {
                    ...mapSupportTicket(row),
                    author: row.author,
                    parent: parentRow
                        ? {
                              ...mapSupportTicket(parentRow),
                              parentAuthor: parentAuthorById.get(parentRow.author_user_id),
                          }
                        : undefined,
                };
            });
        },
    });
};

const SUPPORT_BUCKET = "support-tickets";

async function uploadSupportTicketImages(ticketId: string, files: File[]): Promise<string[]> {
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
        const safeName = files[i].name.replace(/[^\w.\-]/g, "_");
        const path = `${ticketId}/${i}_${safeName}`;
        const { error: upErr } = await supabase.storage.from(SUPPORT_BUCKET).upload(path, files[i], {
            cacheControl: "3600",
            upsert: true,
        });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from(SUPPORT_BUCKET).getPublicUrl(path);
        urls.push(data.publicUrl);
    }
    return urls;
}

export const useCreateStudentSupportTicket = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            authorUserId: string;
            gradeId: string;
            ticketType: string;
            body: string;
            authorName?: string | null;
            files?: File[];
        }) => {
            const subjectLine = getSupportTicketTypeLabel(payload.ticketType);
            const snap = (payload.authorName ?? "").trim();
            const { data: row, error } = await supabase
                .from("support_tickets")
                .insert({
                    author_user_id: payload.authorUserId,
                    author_name_snapshot: snap || null,
                    grade_id: payload.gradeId,
                    scope: "STUDENT_TO_TEACHER",
                    ticket_type: payload.ticketType,
                    subject: subjectLine,
                    body: payload.body.trim(),
                    attachment_urls: [],
                    status: "OPEN",
                })
                .select()
                .single();
            if (error) throw error;

            const ticketId = row.id as string;
            try {
                if (payload.files?.length) {
                    const urls = await uploadSupportTicketImages(ticketId, payload.files);
                    const { data: updated, error: uErr } = await supabase
                        .from("support_tickets")
                        .update({
                            attachment_urls: urls,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", ticketId)
                        .select()
                        .single();
                    if (uErr) throw uErr;
                    return mapSupportTicket(updated);
                }
            } catch (e) {
                await supabase.from("support_tickets").delete().eq("id", ticketId);
                throw e;
            }

            return mapSupportTicket(row);
        },
        onSuccess: (_, v) => {
            queryClient.invalidateQueries({ queryKey: ["support_tickets", "student", v.authorUserId] });
            queryClient.invalidateQueries({ queryKey: ["support_tickets", "teacher_incoming"] });
        },
    });
};

export const useCreateTeacherAdminSupportTicket = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            authorUserId: string;
            subject: string;
            body: string;
            gradeId?: string | null;
        }) => {
            const { data, error } = await supabase
                .from("support_tickets")
                .insert({
                    author_user_id: payload.authorUserId,
                    grade_id: payload.gradeId || null,
                    scope: "TEACHER_TO_ADMIN",
                    ticket_type: "TEACHER_ADMIN",
                    subject: payload.subject.trim(),
                    body: payload.body.trim(),
                    attachment_urls: [],
                    status: "OPEN",
                })
                .select()
                .single();
            if (error) throw error;
            return mapSupportTicket(data);
        },
        onSuccess: (_, v) => {
            queryClient.invalidateQueries({ queryKey: ["support_tickets", "teacher_admin_outbound", v.authorUserId] });
            queryClient.invalidateQueries({ queryKey: ["support_tickets", "admin"] });
        },
    });
};

export const useEscalateStudentSupportTicket = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            studentTicketId: string;
            teacherUserId: string;
            subject: string;
            originalBody: string;
            note: string;
            studentTicketType?: string;
            parentAttachmentUrls?: string[];
        }) => {
            const { data: adminRow, error: insErr } = await supabase
                .from("support_tickets")
                .insert({
                    author_user_id: payload.teacherUserId,
                    grade_id: null,
                    scope: "TEACHER_TO_ADMIN",
                    ticket_type: payload.studentTicketType || "OTHER",
                    subject: payload.subject,
                    body: payload.originalBody,
                    attachment_urls: payload.parentAttachmentUrls ?? [],
                    status: "OPEN",
                    parent_ticket_id: payload.studentTicketId,
                    teacher_escalation_note: payload.note.trim(),
                })
                .select()
                .single();
            if (insErr) throw insErr;

            const { error: upErr } = await supabase
                .from("support_tickets")
                .update({ status: "ESCALATED", updated_at: new Date().toISOString() })
                .eq("id", payload.studentTicketId);
            if (upErr) throw upErr;

            return mapSupportTicket(adminRow);
        },
        onSuccess: (_, v) => {
            queryClient.invalidateQueries({ queryKey: ["support_tickets"] });
        },
    });
};

export const useEscalateAdminSupportTicket = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            adminTicketId: string;
            adminUserId: string;
            subject: string;
            originalBody: string;
            note: string;
            ticketType?: string;
            parentAttachmentUrls?: string[];
        }) => {
            const { data: superRow, error: insErr } = await supabase
                .from("support_tickets")
                .insert({
                    author_user_id: payload.adminUserId,
                    grade_id: null,
                    scope: "ADMIN_TO_SUPERADMIN",
                    ticket_type: payload.ticketType || "OTHER",
                    subject: payload.subject,
                    body: payload.originalBody,
                    attachment_urls: payload.parentAttachmentUrls ?? [],
                    status: "OPEN",
                    parent_ticket_id: payload.adminTicketId,
                    teacher_escalation_note: payload.note.trim(),
                })
                .select()
                .single();
            if (insErr) throw insErr;

            const { error: upErr } = await supabase
                .from("support_tickets")
                .update({ status: "ESCALATED", updated_at: new Date().toISOString() })
                .eq("id", payload.adminTicketId);
            if (upErr) throw upErr;

            return mapSupportTicket(superRow);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["support_tickets"] });
        },
    });
};

export const useUpdateSupportTicketStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { id: string; status: string; resolved?: boolean }) => {
            const patch: Record<string, unknown> = {
                status: payload.status,
                updated_at: new Date().toISOString(),
            };
            if (payload.status === "RESOLVED" || payload.resolved) {
                patch.resolved_at = new Date().toISOString();
            }
            const { data, error } = await supabase
                .from("support_tickets")
                .update(patch)
                .eq("id", payload.id)
                .select()
                .single();
            if (error) throw error;
            return mapSupportTicket(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["support_tickets"] });
        },
    });
};

// --- Registration approval chain ---
export const usePendingTeacherRegistrationRequestsForAdmin = (organizationId?: string | null) => {
    const orgId = organizationId || null;
    return useQuery({
        queryKey: ["registration_requests", "admin", orgId ?? "none"],
        queryFn: async () => {
            if (!orgId) return [];
            const { data, error } = await supabase
                .from("registration_requests")
                .select(`
                  *,
                  applicant:users!applicant_user_id (id, name, email, role, is_active),
                  grade:grades (id, name, slug)
                `)
                .eq("status", "PENDING")
                .eq("applicant_role", "TEACHER")
                .eq("approver_role", "ADMIN")
                .eq("organization_id", orgId)
                .order("created_at", { ascending: true });
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!orgId,
    });
};

export const usePendingStudentRegistrationRequestsForTeacher = (teacherUserId?: string | null) => {
    const teacherId = teacherUserId || null;
    return useQuery({
        queryKey: ["registration_requests", "teacher", teacherId ?? "none"],
        queryFn: async () => {
            if (!teacherId) return [];
            const { data, error } = await supabase
                .from("registration_requests")
                .select(`
                  *,
                  applicant:users!applicant_user_id (id, name, email, role, is_active),
                  grade:grades (id, name, slug)
                `)
                .eq("status", "PENDING")
                .eq("applicant_role", "STUDENT")
                .eq("approver_role", "TEACHER")
                .eq("teacher_user_id", teacherId)
                .order("created_at", { ascending: true });
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!teacherId,
    });
};

export const usePendingAdminRegistrationRequestsForSuperadmin = () => {
    return useQuery({
        queryKey: ["registration_requests", "superadmin", "admins"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("registration_requests")
                .select(`
                  *,
                  applicant:users!applicant_user_id (id, name, email, role, is_active),
                  organization:organizations (id, name, slug, kind, subscription_package, is_active)
                `)
                .eq("status", "PENDING")
                .eq("applicant_role", "ADMIN")
                .eq("approver_role", "SUPERADMIN")
                .order("created_at", { ascending: true });
            if (error) throw error;
            return data ?? [];
        },
    });
};

export const useReviewRegistrationRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            requestId: string;
            reviewerUserId: string;
            decision: "APPROVED" | "REJECTED";
            reviewNote?: string;
        }) => {
            const now = new Date().toISOString();
            const { data: req, error: reqErr } = await supabase
                .from("registration_requests")
                .select("*")
                .eq("id", payload.requestId)
                .single();
            if (reqErr) throw reqErr;

            const { error: upReqErr } = await supabase
                .from("registration_requests")
                .update({
                    status: payload.decision,
                    reviewed_by_user_id: payload.reviewerUserId,
                    review_note: payload.reviewNote?.trim() || null,
                    reviewed_at: now,
                    updated_at: now,
                })
                .eq("id", payload.requestId);
            if (upReqErr) throw upReqErr;

            if (payload.decision === "APPROVED") {
                const userPatch: Record<string, any> = {
                    is_active: true,
                    verified: true,
                    updated_at: now,
                };
                if (req.applicant_role === "TEACHER") {
                    userPatch.organization_id = req.organization_id ?? null;
                    userPatch.individual_tier = null;
                    userPatch.details = "معلم معتمد";
                } else if (req.applicant_role === "STUDENT") {
                    userPatch.organization_id = req.organization_id ?? null;
                    userPatch.individual_tier = null;
                    userPatch.details = "طالب معتمد";
                } else if (req.applicant_role === "ADMIN") {
                    userPatch.organization_id = req.organization_id ?? null;
                    userPatch.individual_tier = null;
                    userPatch.details = "أدمن مؤسسة معتمد";
                }
                const { error: upUserErr } = await supabase
                    .from("users")
                    .update(userPatch)
                    .eq("id", req.applicant_user_id);
                if (upUserErr) throw upUserErr;

                if (req.applicant_role === "TEACHER" && req.grade_id) {
                    await supabase
                        .from("teacher_profiles")
                        .update({ grade_id: req.grade_id, updated_at: now })
                        .eq("user_id", req.applicant_user_id);
                }
                if (req.applicant_role === "STUDENT" && req.grade_id) {
                    await supabase
                        .from("student_profiles")
                        .update({ grade_id: req.grade_id, updated_at: now })
                        .eq("user_id", req.applicant_user_id);
                }
                if (req.applicant_role === "ADMIN" && req.organization_id) {
                    await supabase
                        .from("organizations")
                        .update({ is_active: true, updated_at: now })
                        .eq("id", req.organization_id);

                    if (req.requested_package) {
                        await supabase
                            .from("organization_subscriptions")
                            .upsert(
                                {
                                    organization_id: req.organization_id,
                                    subscription_package: req.requested_package,
                                    billing_cycle: "MONTHLY",
                                    status: "TRIAL",
                                    price_amount: 0,
                                    next_billing_at: null,
                                    auto_renew: true,
                                    notes: "طلب اشتراك من الصفحة الرئيسية - بانتظار الضبط المالي",
                                    updated_at: now,
                                },
                                { onConflict: "organization_id" }
                            );
                    }
                }
            }

            return req;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["registration_requests"] });
            queryClient.invalidateQueries({ queryKey: ["all_users"] });
            queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
            queryClient.invalidateQueries({ queryKey: ["current_user"] });
            queryClient.invalidateQueries({ queryKey: ["organizations"] });
            queryClient.invalidateQueries({ queryKey: ["organization_subscriptions"] });
            queryClient.invalidateQueries({ queryKey: ["org_admin_users"] });
        },
    });
};


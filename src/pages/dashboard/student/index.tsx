import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
    Trophy, Star, Target, Clock, Brain, Flame, Medal,
    BookOpen, History, Settings, User, LogOut, Bell,
    ChevronLeft, Play, Download, Share2, Calendar,
    TrendingUp, Award, Zap, Crown, CheckCircle, GraduationCap,
    BarChart3, Activity, BookMarked
} from "lucide-react";
import {
    useUser,
    useStudentProfile,
    useStudentSubjectProgress,
    useStudentTopicActivities,
    useUserBadges,
    useAllBadges,
    useUpdateUser,
    useGradeDetail
} from "@/hooks/useDatabase";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

const StudentDashboard = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const updateUserMutation = useUpdateUser();
    const [activeTab, setActiveTab] = useState("overview");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    const { data: user, isLoading: isLoadingUser } = useUser();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem("edu_user");
        queryClient.invalidateQueries({ queryKey: ["current_user"] });
        navigate("/");
    };

    useEffect(() => {
        if (user?.role) {
            const role = user.role.toUpperCase();
            if (role === "TEACHER" || role === "معلم" || role === "معلمة") {
                navigate("/dashboard/teacher");
            } else if (role === "ADMIN" || role === "مسؤول") {
                navigate("/dashboard/admin");
            }
        }
    }, [user, navigate]);
    const { data: profile, isLoading: isLoadingProfile } = useStudentProfile(user?.id || "");

    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setEmail(user.email || "");
        }
    }, [user]);

    const handleUpdateProfile = async () => {
        if (!user?.id) return;
        try {
            await updateUserMutation.mutateAsync({
                userId: user.id,
                updates: { name, email }
            });
            toast({
                title: "تم التحديث بنجاح",
                description: "تم تحديث معلومات ملفك الشخصي بنجاح.",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "خطأ في التحديث",
                description: "حدث خطأ أثناء محاولة تحديث بياناتك.",
            });
        }
    };
    const { data: subjectProgress, isLoading: isLoadingProgress } = useStudentSubjectProgress(profile?.id || "");
    const { data: gradeDetail, isLoading: isLoadingGradeDetail } = useGradeDetail(profile?.grade?.slug || "");
    const { data: topicActivities, isLoading: isLoadingActivities } = useStudentTopicActivities(profile?.id || "", 1000);
    const { data: userBadges, isLoading: isLoadingUserBadges } = useUserBadges(user?.id || "");
    const { data: allBadges, isLoading: isLoadingAllBadges } = useAllBadges();

    const isLoading = isLoadingUser || isLoadingProfile;

    // Derive student data from real DB
    const student = {
        id: user?.id || "",
        name: user?.name || "طالب",
        email: user?.email || "",
        avatar: user?.avatar || "https://api.dicebear.com/7.x/fun-emoji/svg?seed=student",
        stats: {
            totalTopicsCompleted: profile?.completed_topics || 0,
            averageScore: profile?.average_score || 0,
            totalPoints: profile?.total_points || 0,
            longestStreak: profile?.longest_streak || 0,
            currentStreak: profile?.current_streak || 0,
            rank: profile?.rank || 0,
            badges: userBadges?.length || 0,
            totalStudyHours: profile?.total_study_hours || 0
        }
    };

    const currentGrade = profile?.grade;

    // Map subject progress from DB
    // We'll use activities as the source of truth for completion counts
    const mappedSubjectProgress = (gradeDetail?.subjects || []).map((subject: any) => {
        // Find progress by matching the ID directly or looking inside the joined subject property
        const progress = (subjectProgress || []).find((sp: any) => {
            const spSubjectId = String(sp.subject_id || sp.subject?.id || "").trim().toLowerCase();
            const targetId = String(subject.id || "").trim().toLowerCase();

            // 1. Primary match: Case-insensitive ID matching
            if (spSubjectId === targetId && targetId !== "") return true;

            // 2. Secondary match: Case-insensitive Name matching (fallback)
            const spName = String(sp.subject?.name || "").trim().toLowerCase();
            const targetName = String(subject.name || "").trim().toLowerCase();
            if (spName === targetName && targetName !== "") return true;

            return false;
        });

        // SOURCE OF TRUTH: Count unique completed topics for THIS subject from all activities
        const subjectTopicIds = (subject.topics || []).map((t: any) => String(t.id).toLowerCase());
        const uniqueCompletedInActivities = new Set(
            (topicActivities || [])
                .filter((ta: any) => ta.completed && subjectTopicIds.includes(String(ta.topic_id || ta.topic?.id).toLowerCase()))
                .map((ta: any) => String(ta.topic_id || ta.topic?.id).toLowerCase())
        );

        const completedCount = uniqueCompletedInActivities.size > 0
            ? uniqueCompletedInActivities.size
            : Number(progress?.completed_topics) || 0;

        // Diagnostic counts: try topics array first, then columns
        const totalTopicsCount = (subject.topics?.length > 0 ? subject.topics.length : null)
            || progress?.total_topics
            || subject.total_topics
            || 0;

        return {
            subjectId: subject.id,
            gradeId: gradeDetail.id,
            name: subject.name || "مادة",
            icon: subject.icon || "📚",
            completedTopics: completedCount,
            totalTopics: Math.max(Number(totalTopicsCount) || 0, completedCount, 1),
            averageScore: Math.round(progress?.average_score || 0),
            color: subject.color || "#6366f1"
        };
    });

    // Map recent topic activities from DB
    const mappedRecentTopics = (topicActivities || []).map((ta: any) => ({
        id: ta.id,
        topicTitle: ta.topic_title || ta.topic?.title || "درس",
        subjectName: ta.topic?.subject?.name || "مادة",
        subjectIcon: ta.topic?.subject?.icon || "📚",
        gradeId: ta.topic?.subject?.grade_id || "",
        subjectId: ta.topic?.subject_id || "",
        topicId: ta.topic_id || "",
        date: ta.date ? new Date(ta.date).toLocaleDateString("ar-SA") : "",
        score: Math.round(ta.score || 0),
        completed: ta.completed || false
    }));

    // Map badges from DB: combine all badges with earned status
    const mappedBadges = (allBadges || []).map((badge: any) => ({
        id: badge.id,
        name: badge.name,
        icon: badge.icon,
        description: badge.description,
        earned: (userBadges || []).some((ub: any) => ub.badge_id === badge.id)
    }));

    // If only user badges exist (no allBadges table populated yet), use user badges directly
    const displayBadges = mappedBadges.length > 0 ? mappedBadges : (userBadges || []).map((ub: any) => ({
        id: ub.badge?.id || ub.id,
        name: ub.badge?.name || "شارة",
        icon: ub.badge?.icon || "🏆",
        description: ub.badge?.description || "",
        earned: true
    }));

    return (
        <div className="min-h-screen font-cairo bg-gradient-to-br from-background via-background to-primary/5" dir="rtl">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        <Link to="/" className="flex items-center gap-3">
                            <img src="/logo.png" alt="Lab4" className="w-10 h-10 rounded-xl object-contain bg-background" />
                            <span className="text-xl font-bold">Lab4</span>
                        </Link>

                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" className="relative">
                                <Bell className="w-5 h-5" />
                            </Button>
                            <div className="flex items-center gap-3">
                                {isLoading ? (
                                    <Skeleton className="w-10 h-10 rounded-full" />
                                ) : (
                                    <img src={student.avatar} alt="Avatar" className="w-10 h-10 rounded-full" />
                                )}
                                <div className="hidden md:block">
                                    {isLoading ? (
                                        <>
                                            <Skeleton className="h-4 w-24 mb-1" />
                                            <Skeleton className="h-3 w-32" />
                                        </>
                                    ) : (
                                        <>
                                            <p className="font-medium text-sm">{student.name}</p>
                                            <p className="text-xs text-muted-foreground">{currentGrade?.name || "طالب"}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-1"
                    >
                        <Card className="sticky top-24">
                            <CardContent className="p-6">
                                {/* Student Profile Summary */}
                                <div className="text-center mb-6">
                                    <div className="relative inline-block mb-4">
                                        {isLoading ? (
                                            <Skeleton className="w-24 h-24 rounded-2xl" />
                                        ) : (
                                            <img
                                                src={student.avatar}
                                                alt="Avatar"
                                                className="w-24 h-24 rounded-2xl border-4 border-primary/20"
                                            />
                                        )}
                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                                            <Crown className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    {isLoading ? (
                                        <>
                                            <Skeleton className="h-6 w-32 mx-auto mb-2" />
                                            <Skeleton className="h-4 w-40 mx-auto mb-1" />
                                            <Skeleton className="h-3 w-28 mx-auto mb-4" />
                                        </>
                                    ) : (
                                        <>
                                            <h2 className="text-xl font-bold mb-1">{student.name}</h2>
                                            <p className="text-sm text-muted-foreground mb-1">{currentGrade?.name || ""}</p>
                                            {student.stats.rank > 0 && (
                                                <p className="text-xs text-muted-foreground mb-4">
                                                    المرتبة #{student.stats.rank} في الصف
                                                </p>
                                            )}
                                            <div className="flex items-center justify-center gap-2 text-sm">
                                                <Flame className="w-4 h-4 text-orange-500" />
                                                <span>سلسلة: {student.stats.currentStreak} أيام</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-center">
                                        <Trophy className="w-5 h-5 mx-auto mb-1 text-primary" />
                                        {isLoading ? (
                                            <Skeleton className="h-6 w-12 mx-auto mb-1" />
                                        ) : (
                                            <div className="text-lg font-bold">{student.stats.totalPoints.toLocaleString()}</div>
                                        )}
                                        <div className="text-xs text-muted-foreground">نقطة</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 text-center">
                                        <Medal className="w-5 h-5 mx-auto mb-1 text-secondary" />
                                        {isLoadingUserBadges ? (
                                            <Skeleton className="h-6 w-8 mx-auto mb-1" />
                                        ) : (
                                            <div className="text-lg font-bold">{student.stats.badges}</div>
                                        )}
                                        <div className="text-xs text-muted-foreground">شارة</div>
                                    </div>
                                </div>

                                {/* Navigation */}
                                <nav className="space-y-2">
                                    {[
                                        { id: "overview", icon: BarChart3, label: "نظرة عامة" },
                                        { id: "subjects", icon: BookOpen, label: "المواد الدراسية" },
                                        { id: "history", icon: History, label: "سجل الدروس" },
                                        { id: "badges", icon: Award, label: "الشارات" },
                                        { id: "settings", icon: Settings, label: "الإعدادات" }
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                                                ? "bg-primary text-primary-foreground"
                                                : "hover:bg-muted"
                                                }`}
                                        >
                                            <item.icon className="w-5 h-5" />
                                            <span>{item.label}</span>
                                        </button>
                                    ))}
                                </nav>

                                <div className="mt-6 pt-6 border-t">
                                    <Button
                                        variant="ghost"
                                        className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                                        onClick={handleLogout}
                                    >
                                        <LogOut className="w-4 h-4" />
                                        تسجيل الخروج
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Main Content */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-3 space-y-6"
                    >
                        <AnimatePresence mode="wait">
                            {/* Overview Tab */}
                            {activeTab === "overview" && (
                                <motion.div
                                    key="overview"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    {/* Welcome Banner */}
                                    <Card className="overflow-hidden">
                                        <div className="relative p-6 md:p-8 bg-gradient-to-r from-primary via-primary/90 to-secondary">
                                            <div className="relative z-10">
                                                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                                                    مرحباً، {student.name.split(" ")[0]}! 👋
                                                </h1>
                                                <p className="text-white/80 mb-4">
                                                    {student.stats.currentStreak > 0
                                                        ? `استمر في التعلم والتفوق! لديك سلسلة ${student.stats.currentStreak} أيام متتالية.`
                                                        : "ابدأ رحلة التعلم الممتعة اليوم!"}
                                                </p>
                                                <Button variant="secondary" size="lg" asChild className="gap-2">
                                                    <Link to="/grades">
                                                        <Play className="w-5 h-5" />
                                                        تصفح الدروس
                                                    </Link>
                                                </Button>
                                            </div>
                                            <div className="absolute left-0 top-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                                            <div className="absolute right-10 bottom-0 w-32 h-32 bg-secondary/20 rounded-full blur-2xl" />
                                        </div>
                                    </Card>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <Card className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                                    <BookMarked className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    {isLoading ? <Skeleton className="h-7 w-8 mb-1" /> : (
                                                        <p className="text-2xl font-bold">{student.stats.totalTopicsCompleted}</p>
                                                    )}
                                                    <p className="text-sm text-muted-foreground">درس مكتمل</p>
                                                </div>
                                            </div>
                                        </Card>
                                        <Card className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                                                    <TrendingUp className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    {isLoading ? <Skeleton className="h-7 w-12 mb-1" /> : (
                                                        <p className="text-2xl font-bold">{Math.round(student.stats.averageScore)}%</p>
                                                    )}
                                                    <p className="text-sm text-muted-foreground">متوسط النتائج</p>
                                                </div>
                                            </div>
                                        </Card>
                                        <Card className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                                    <Clock className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    {isLoading ? <Skeleton className="h-7 w-8 mb-1" /> : (
                                                        <p className="text-2xl font-bold">{Math.round(student.stats.totalStudyHours)}</p>
                                                    )}
                                                    <p className="text-sm text-muted-foreground">ساعة دراسة</p>
                                                </div>
                                            </div>
                                        </Card>
                                        <Card className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                                    <Award className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    {isLoadingUserBadges ? <Skeleton className="h-7 w-8 mb-1" /> : (
                                                        <p className="text-2xl font-bold">{student.stats.badges}</p>
                                                    )}
                                                    <p className="text-sm text-muted-foreground">شارة محققة</p>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>

                                    {/* Subject Progress */}
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between py-4">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <GraduationCap className="w-5 h-5 text-primary" />
                                                المواد الدراسية
                                            </CardTitle>
                                            <Button variant="ghost" size="sm" onClick={() => setActiveTab("subjects")}>
                                                عرض الكل
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {isLoadingProgress || isLoadingGradeDetail ? (
                                                Array.from({ length: 3 }).map((_, i) => (
                                                    <div key={i} className="space-y-2">
                                                        <Skeleton className="h-5 w-48" />
                                                        <Skeleton className="h-2 w-full" />
                                                    </div>
                                                ))
                                            ) : mappedSubjectProgress.length > 0 ? (
                                                mappedSubjectProgress.map((subject) => (
                                                    <Link
                                                        key={subject.subjectId}
                                                        to={`/grade/${subject.gradeId}/subject/${subject.subjectId}`}
                                                        className="block space-y-2 hover:bg-muted/50 p-2 rounded-lg transition-colors group"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-2xl group-hover:scale-110 transition-transform">{subject.icon}</span>
                                                                <div>
                                                                    <p className="font-medium group-hover:text-primary transition-colors">{subject.name}</p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {subject.completedTopics} من {subject.totalTopics} دروس
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-left">
                                                                <p className="font-bold text-lg" style={{ color: subject.color }}>
                                                                    {subject.averageScore}%
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Progress
                                                            value={subject.totalTopics > 0 ? (subject.completedTopics / subject.totalTopics) * 100 : 0}
                                                            className="h-2"
                                                            style={{
                                                                backgroundColor: `${subject.color}20`,
                                                            }}
                                                        />
                                                    </Link>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 text-muted-foreground">
                                                    <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                                    <p className="text-sm">لا يوجد تقدم بعد. ابدأ بتصفح الدروس!</p>
                                                    <Button variant="outline" size="sm" className="mt-3 gap-2" asChild>
                                                        <Link to="/grades"><Play className="w-4 h-4" />ابدأ التعلم</Link>
                                                    </Button>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Recent Topics & Weekly Progress */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Recent Topics */}
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between py-4">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <History className="w-5 h-5 text-primary" />
                                                    آخر الدروس
                                                </CardTitle>
                                                <Button variant="ghost" size="sm" onClick={() => setActiveTab("history")}>
                                                    عرض الكل
                                                </Button>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {isLoadingActivities ? (
                                                    Array.from({ length: 3 }).map((_, i) => (
                                                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                                                    ))
                                                ) : mappedRecentTopics.length > 0 ? (
                                                    mappedRecentTopics.slice(0, 3).map((topic) => (
                                                        <Link
                                                            key={topic.id}
                                                            to={`/grade/${topic.gradeId}/subject/${topic.subjectId}/topic/${topic.topicId}`}
                                                            className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                                                        >
                                                            <div className="flex-1">
                                                                <p className="font-medium text-sm line-clamp-1">{topic.topicTitle}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {topic.subjectIcon} {topic.subjectName}
                                                                </p>
                                                            </div>
                                                            <div className="text-left">
                                                                <p className={`font-bold ${topic.score >= 90 ? "text-success" : topic.score >= 75 ? "text-warning" : "text-destructive"}`}>
                                                                    {topic.score}%
                                                                </p>
                                                            </div>
                                                        </Link>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-6 text-muted-foreground">
                                                        <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                                        <p className="text-sm">لا توجد دروس مكتملة بعد</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        {/* Weekly Activity */}
                                        <Card>
                                            <CardHeader className="py-4">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Activity className="w-5 h-5 text-primary" />
                                                    نشاطك هذا الأسبوع
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    {["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"].map((day, i) => {
                                                        // Count activities for each day of the current week
                                                        const today = new Date();
                                                        const dayOffset = today.getDay() - i;
                                                        const targetDate = new Date(today);
                                                        targetDate.setDate(today.getDate() - dayOffset);
                                                        const targetStr = targetDate.toISOString().split("T")[0];

                                                        const dayActivities = (topicActivities || []).filter((ta: any) => {
                                                            const actDate = new Date(ta.date).toISOString().split("T")[0];
                                                            return actDate === targetStr;
                                                        });
                                                        const dayScore = dayActivities.length > 0
                                                            ? Math.round(dayActivities.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / dayActivities.length)
                                                            : 0;

                                                        return (
                                                            <div key={day} className="flex items-center gap-3">
                                                                <span className="w-16 text-sm text-muted-foreground">{day}</span>
                                                                <Progress
                                                                    value={dayScore}
                                                                    className="flex-1 h-2"
                                                                />
                                                                <span className="w-10 text-sm font-medium text-left">
                                                                    {dayScore > 0 ? `${dayScore}%` : "-"}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Recent Badges */}
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between py-4">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Award className="w-5 h-5 text-primary" />
                                                آخر الشارات المحققة
                                            </CardTitle>
                                            <Button variant="ghost" size="sm" onClick={() => setActiveTab("badges")}>
                                                عرض الكل
                                            </Button>
                                        </CardHeader>
                                        <CardContent>
                                            {isLoadingUserBadges ? (
                                                <div className="flex gap-3">
                                                    {Array.from({ length: 3 }).map((_, i) => (
                                                        <Skeleton key={i} className="h-10 w-28 rounded-full" />
                                                    ))}
                                                </div>
                                            ) : displayBadges.filter(b => b.earned).length > 0 ? (
                                                <div className="flex flex-wrap gap-3">
                                                    {displayBadges.filter(b => b.earned).slice(0, 5).map(badge => (
                                                        <div
                                                            key={badge.id}
                                                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
                                                        >
                                                            <span className="text-xl">{badge.icon}</span>
                                                            <span className="font-medium text-sm">{badge.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 text-muted-foreground">
                                                    <Award className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                                    <p className="text-sm">لم تحصل على شارات بعد. أكمل التحديات لتربح!</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {/* Subjects Tab */}
                            {activeTab === "subjects" && (
                                <motion.div
                                    key="subjects"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    <h2 className="text-2xl font-bold flex items-center gap-2">
                                        <BookOpen className="w-6 h-6 text-primary" />
                                        المواد الدراسية {currentGrade ? `- ${currentGrade.name}` : ""}
                                    </h2>

                                    {isLoadingProgress || isLoadingGradeDetail ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {Array.from({ length: 3 }).map((_, i) => (
                                                <Skeleton key={i} className="h-48 rounded-xl" />
                                            ))}
                                        </div>
                                    ) : mappedSubjectProgress.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {mappedSubjectProgress.map((subject) => (
                                                <Link
                                                    key={subject.subjectId}
                                                    to={`/grade/${subject.gradeId}/subject/${subject.subjectId}`}
                                                    className="block hover:no-underline"
                                                >
                                                    <Card className="hover:shadow-lg transition-all group cursor-pointer h-full border-2 hover:border-primary/20">
                                                        <CardContent className="p-6">
                                                            <div className="text-center mb-4">
                                                                <div
                                                                    className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4 text-4xl group-hover:scale-110 transition-transform"
                                                                    style={{ backgroundColor: `${subject.color}20` }}
                                                                >
                                                                    {subject.icon}
                                                                </div>
                                                                <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">{subject.name}</h3>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {subject.totalTopics} دروس
                                                                </p>
                                                            </div>

                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between text-sm">
                                                                    <span>التقدم</span>
                                                                    <span className="font-bold" style={{ color: subject.color }}>
                                                                        {subject.totalTopics > 0 ? Math.round((subject.completedTopics / subject.totalTopics) * 100) : 0}%
                                                                    </span>
                                                                </div>
                                                                <Progress
                                                                    value={subject.totalTopics > 0 ? (subject.completedTopics / subject.totalTopics) * 100 : 0}
                                                                    className="h-2"
                                                                />
                                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                                    <span>{subject.completedTopics} من {subject.totalTopics}</span>
                                                                    <span>متوسط: {subject.averageScore}%</span>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <Card>
                                            <CardContent className="p-12 text-center text-muted-foreground">
                                                <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                                <p className="text-lg font-medium mb-2">لا يوجد مواد مسجلة بعد</p>
                                                <p className="text-sm mb-4">ابدأ بتصفح الصفوف والمواد الدراسية</p>
                                                <Button asChild><Link to="/grades">تصفح الصفوف</Link></Button>
                                            </CardContent>
                                        </Card>
                                    )}
                                </motion.div>
                            )}

                            {/* History Tab */}
                            {activeTab === "history" && (
                                <motion.div
                                    key="history"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold flex items-center gap-2">
                                            <History className="w-6 h-6 text-primary" />
                                            سجل الدروس
                                        </h2>
                                    </div>

                                    {isLoadingActivities ? (
                                        <div className="space-y-4">
                                            {Array.from({ length: 3 }).map((_, i) => (
                                                <Skeleton key={i} className="h-32 rounded-xl" />
                                            ))}
                                        </div>
                                    ) : mappedRecentTopics.length > 0 ? (
                                        <div className="space-y-4">
                                            {mappedRecentTopics.slice(0, 10).map((topic, i) => (
                                                <motion.div
                                                    key={topic.id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.1 }}
                                                >
                                                    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                                                        <CardContent className="p-0">
                                                            <div className="flex flex-col md:flex-row">
                                                                {/* Score Indicator */}
                                                                <div className={`w-full md:w-2 ${topic.score >= 90 ? "bg-success" :
                                                                    topic.score >= 75 ? "bg-warning" : "bg-destructive"
                                                                    }`} />

                                                                <div className="flex-1 p-5">
                                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                                        <div>
                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                <span className="text-2xl">{topic.subjectIcon}</span>
                                                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
                                                                                    {topic.subjectName}
                                                                                </span>
                                                                                {topic.completed && (
                                                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                                                                                        مكتمل
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <h3 className="text-lg font-bold mb-1">{topic.topicTitle}</h3>
                                                                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                                                <Calendar className="w-4 h-4" />
                                                                                {topic.date}
                                                                            </p>
                                                                        </div>

                                                                        <div className="flex items-center gap-6">
                                                                            <div className="text-center">
                                                                                <p className={`text-3xl font-bold ${topic.score >= 90 ? "text-success" :
                                                                                    topic.score >= 75 ? "text-warning" : "text-destructive"
                                                                                    }`}>
                                                                                    {topic.score}%
                                                                                </p>
                                                                                <p className="text-xs text-muted-foreground">النتيجة</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                                                        <div className="flex gap-2">
                                                                            <Button variant="ghost" size="sm" className="gap-1">
                                                                                <Share2 className="w-4 h-4" />
                                                                                مشاركة
                                                                            </Button>
                                                                        </div>
                                                                        <Button variant="outline" size="sm" className="gap-1" asChild>
                                                                            <Link to={`/grade/${topic.gradeId}/subject/${topic.subjectId}/topic/${topic.topicId}`}>
                                                                                <Play className="w-4 h-4" />
                                                                                إعادة الدرس
                                                                            </Link>
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <Card>
                                            <CardContent className="p-12 text-center text-muted-foreground">
                                                <History className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                                <p className="text-lg font-medium mb-2">لا توجد دروس في السجل</p>
                                                <p className="text-sm mb-4">ابدأ بمشاهدة الدروس وإكمال التحديات</p>
                                                <Button asChild><Link to="/grades">ابدأ التعلم</Link></Button>
                                            </CardContent>
                                        </Card>
                                    )}
                                </motion.div>
                            )}

                            {/* Badges Tab */}
                            {activeTab === "badges" && (
                                <motion.div
                                    key="badges"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    <h2 className="text-2xl font-bold flex items-center gap-2">
                                        <Award className="w-6 h-6 text-primary" />
                                        الشارات والإنجازات
                                    </h2>

                                    {(isLoadingAllBadges || isLoadingUserBadges) ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {Array.from({ length: 6 }).map((_, i) => (
                                                <Skeleton key={i} className="h-40 rounded-xl" />
                                            ))}
                                        </div>
                                    ) : displayBadges.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {displayBadges.map((badge, i) => (
                                                <motion.div
                                                    key={badge.id}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: i * 0.05 }}
                                                >
                                                    <Card className={`relative overflow-hidden transition-all ${badge.earned ? "hover:shadow-lg" : "opacity-50 grayscale"
                                                        }`}>
                                                        {badge.earned && (
                                                            <div className="absolute top-2 left-2">
                                                                <CheckCircle className="w-5 h-5 text-success" />
                                                            </div>
                                                        )}
                                                        <CardContent className="p-6 text-center">
                                                            <div className={`text-5xl mb-3 ${badge.earned ? "" : "grayscale"}`}>
                                                                {badge.icon}
                                                            </div>
                                                            <h3 className="font-bold text-lg mb-2">{badge.name}</h3>
                                                            <p className="text-sm text-muted-foreground">{badge.description}</p>
                                                        </CardContent>
                                                    </Card>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <Card>
                                            <CardContent className="p-12 text-center text-muted-foreground">
                                                <Award className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                                <p className="text-lg font-medium mb-2">لا توجد شارات متاحة حالياً</p>
                                                <p className="text-sm">أكمل التحديات والدروس للحصول على شارات</p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </motion.div>
                            )}

                            {/* Settings Tab */}
                            {activeTab === "settings" && (
                                <motion.div
                                    key="settings"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    <h2 className="text-2xl font-bold flex items-center gap-2">
                                        <Settings className="w-6 h-6 text-primary" />
                                        الإعدادات
                                    </h2>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>معلومات الحساب</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium mb-2 block">الاسم</label>
                                                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-2 block">البريد الإلكتروني</label>
                                                    <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                                                </div>
                                            </div>
                                            <Button
                                                onClick={handleUpdateProfile}
                                                disabled={updateUserMutation.isPending}
                                            >
                                                {updateUserMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
                                            </Button>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>إعدادات الإشعارات</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {[
                                                "إشعارات الدروس الجديدة",
                                                "إشعارات الشارات المحققة",
                                                "تذكيرات السلسلة اليومية",
                                                "تحديثات المواد الدراسية"
                                            ].map((item, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                                    <span>{item}</span>
                                                    <Button variant="outline" size="sm">مفعل</Button>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;

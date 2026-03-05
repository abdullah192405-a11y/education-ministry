import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
    LayoutDashboard, Library, Users, Gamepad2, ChartBar, Cog,
    Bell, LogOut, ChevronRight, GraduationCap, Award, Search,
    Plus, Trophy, History, Clock, Eye, Star, Info, AlertTriangle,
    CheckCircle, TrendingUp, Zap, Copy
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { generatePin } from "@/data/challengeTypes";
import { useUser, useTeacherProfile, useGradeDetail, useActiveChallengesByHost, useHostedChallengeResults, useHostedSessions, useRecentChallengeResults, useStudentsInGrade, useGradeSubjectProgress, useCreateChallengeSession, useUpdateChallengeSession, useDeleteChallengeSession } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";
import TeacherTopicsTab from "./components/TeacherTopicsTab";
import TeacherChallengesTab from "./components/TeacherChallengesTab";
import TeacherStudentsTab from "./components/TeacherStudentsTab";
import TeacherAnalyticsTab from "./components/TeacherAnalyticsTab";
import TeacherSettingsTab from "./components/TeacherSettingsTab";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

const TeacherDashboard = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: user, isLoading: isLoadingUser } = useUser();
    const createSessionMutation = useCreateChallengeSession();
    const updateSessionMutation = useUpdateChallengeSession();
    const deleteSessionMutation = useDeleteChallengeSession();

    useEffect(() => {
        if (user?.role) {
            const role = user.role.toUpperCase();
            if (role === "STUDENT" || role === "طالب") {
                navigate("/dashboard/student");
            } else if (role === "ADMIN" || role === "مسؤول") {
                navigate("/dashboard/admin");
            }
        }
    }, [user, navigate]);
    const { data: profile, isLoading: isLoadingProfile } = useTeacherProfile(user?.id || "");
    const { data: gradeDetail, isLoading: isLoadingGrade } = useGradeDetail(profile?.grade?.slug || "");
    const { data: dbActiveChallenges } = useActiveChallengesByHost(user?.id || "");
    const { data: hostedResults } = useHostedChallengeResults(user?.id || "", 50);
    const { data: hostedSessions } = useHostedSessions(user?.id || "");
    const { data: gradeStudents } = useStudentsInGrade(profile?.grade_id || "");
    const { data: gradeSubjectProgress } = useGradeSubjectProgress(profile?.grade_id || "", profile?.subject_id || "");

    const [activeTab, setActiveTab] = useState("overview");
    const { toast } = useToast();
    const [localChallenges, setLocalChallenges] = useState<any[]>([]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem("edu_user");
        queryClient.invalidateQueries({ queryKey: ["current_user"] });
        navigate("/");
    };

    const isLoading = isLoadingUser || isLoadingProfile;

    // Filter topics for the teacher's subject
    const topics = gradeDetail?.subjects?.find((s: any) => s.id === profile?.subject_id)?.topics || [];

    // Calculate unique students from the grade (source of truth)
    const uniqueStudentsCount = gradeStudents?.length || 0;

    // Derive teacher data from real DB
    const teacherData = {
        id: user?.id || "",
        name: user?.name || "معلم",
        email: user?.email || "",
        avatar: user?.avatar || "https://api.dicebear.com/7.x/fun-emoji/svg?seed=teacher",
        gradeId: profile?.grade_id || "",
        subjectId: profile?.subject_id || "",
        verified: user?.verified || false,
        stats: {
            totalTopics: profile?.total_topics || topics.length || 0,
            totalStudents: uniqueStudentsCount || profile?.total_students || 0,
            averageScore: (gradeSubjectProgress || []).length > 0
                ? Math.round(gradeSubjectProgress!.reduce((acc: number, r: any) => acc + (r.average_score || 0), 0) / gradeSubjectProgress!.length)
                : hostedResults?.length
                    ? Math.round(hostedResults.reduce((acc: number, r: any) => acc + (r.score || 0), 0) / hostedResults.length)
                    : Math.round(profile?.average_score || 0),
            totalChallenges: hostedSessions?.length || profile?.total_challenges || 0,
        }
    };

    // Build score distribution for overview
    const scoreDistribution = [
        { name: "90-100%", count: 0, color: "#10b981" },
        { name: "70-89%", count: 0, color: "#3b82f6" },
        { name: "50-69%", count: 0, color: "#f59e0b" },
        { name: "أقل من 50%", count: 0, color: "#ef4444" },
    ];

    if ((gradeSubjectProgress || []).length > 0) {
        gradeSubjectProgress!.forEach((r: any) => {
            const score = r.average_score || 0;
            if (score >= 90) scoreDistribution[0].count++;
            else if (score >= 70) scoreDistribution[1].count++;
            else if (score >= 50) scoreDistribution[2].count++;
            else scoreDistribution[3].count++;
        });
    }

    const currentGrade = profile?.grade;
    const currentSubject = profile?.subject;

    // Merge DB active challenges with locally-created ones, ensuring no duplicates by PIN
    const activeChallenges = [
        ...localChallenges.filter(lc => !(dbActiveChallenges || []).some((dbc: any) => dbc.pin === lc.pin)),
        ...(dbActiveChallenges || []).map((c: any) => ({
            id: c.id,
            topicId: c.topic_id,
            gradeId: c.topic?.subject?.grade_id || c.topic?.grade_id || teacherData.gradeId,
            subjectId: c.topic?.subject_id || teacherData.subjectId,
            pin: c.pin,
            topicTitle: c.topic?.title || "تحدي",
            mode: c.mode?.toLowerCase() || "group",
            players: (c.players || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                avatar: p.avatar || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${p.name}`
            })),
            playersCount: c.players?.length || 0,
            status: c.status?.toLowerCase() || "waiting",
            startedAt: c.created_at ? new Date(c.created_at).toLocaleString("ar-SA") : "",
            type: "admin" as const
        }))
    ] as any[];

    // Map hosted results for "recent students" section
    const recentStudents = (hostedResults || []).slice(0, 4).map((r: any) => ({
        name: r.user?.name || "طالب",
        score: Math.round(r.score || 0),
        avatar: r.user?.avatar || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${r.user_id}`,
        lastActive: r.created_at ? new Date(r.created_at).toLocaleString("ar-SA") : ""
    }));

    const handleStartSession = async (pin: string, topicId: string) => {
        try {
            await updateSessionMutation.mutateAsync({
                pin: pin,
                updates: { status: "PLAYING" }
            });
            navigate(`/grade/${teacherData.gradeId}/subject/${teacherData.subjectId}/topic/${topicId}/challenge/group/ACTIVITIES/${pin}?host=true`);
        } catch (error) {
            console.error("Failed to start session:", error);
            toast({
                title: "خطأ",
                description: "تعذر بدء التحدي.",
                variant: "destructive"
            });
        }
    };

    const handleCancelChallenge = async (pin: string) => {
        try {
            await deleteSessionMutation.mutateAsync(pin);
            setLocalChallenges(prev => prev.filter(c => c.pin !== pin));
            toast({
                title: "تم إلغاء التحدي",
                description: `تم إغلاق التحدي ذو الرمز ${pin} بنجاح.`,
            });
        } catch (error) {
            console.error("Failed to cancel session:", error);
            toast({
                title: "خطأ",
                description: "تعذر إلغاء التحدي.",
                variant: "destructive"
            });
        }
    };

    const handleCreateChallenge = async (topicId: string) => {
        const topic = topics.find((t: any) => t.id === topicId);
        if (!topic) return;

        const pin = generatePin();
        const newChallenge = {
            id: Date.now(),
            topicId: topic.id,
            gradeId: topic.grade_id || teacherData.gradeId,
            subjectId: topic.subject_id || teacherData.subjectId,
            pin: pin,
            topicTitle: topic.title,
            mode: "group" as const,
            players: [],
            playersCount: 0,
            status: "waiting" as const,
            startedAt: "الآن",
            type: "admin" as const
        };

        try {
            await createSessionMutation.mutateAsync({
                topicId: topic.id,
                hostId: teacherData.id,
                mode: "GROUP",
                category: "ACTIVITIES",
                pin: pin
            });

            setLocalChallenges(prev => [newChallenge, ...prev]);

            toast({
                title: "تم إنشاء التحدي بنجاح",
                description: `رمز الدخول: ${pin}. يمكنك الآن متابعة المنضمين من تبويب التحديات.`,
            });

            // Transition to challenges tab to see the new lobby row
            setActiveTab("challenges");
        } catch (error) {
            console.error("Failed to create session from dashboard", error);
            toast({
                title: "خطأ",
                description: "تعذر إنشاء التحدي في قاعدة البيانات.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="min-h-screen font-cairo bg-gradient-to-br from-background via-background to-primary/5" dir="rtl">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        <div className="flex items-center gap-4">
                            <Link to="/" className="flex items-center gap-3">
                                <img src="/logo.png" alt="Lab4" className="w-10 h-10 rounded-xl object-contain bg-background" />
                                <span className="text-xl font-bold hidden md:block">Lab4</span>
                            </Link>
                            <div className="h-8 w-px bg-border" />
                            <div className="flex items-center gap-2">
                                {isLoading ? (
                                    <Skeleton className="w-8 h-8 rounded-lg" />
                                ) : (
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl">
                                        {currentSubject?.icon || "📚"}
                                    </div>
                                )}
                                <div className="hidden md:block">
                                    {isLoading ? (
                                        <>
                                            <Skeleton className="h-4 w-24 mb-1" />
                                            <Skeleton className="h-3 w-32" />
                                        </>
                                    ) : (
                                        <>
                                            <span className="font-medium text-sm">{currentSubject?.name || ""}</span>
                                            <p className="text-xs text-muted-foreground">{currentGrade?.name || ""}</p>
                                        </>
                                    )}
                                </div>
                                {teacherData.verified && <CheckCircle className="w-4 h-4 text-primary fill-primary/20" />}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" className="relative">
                                <Bell className="w-5 h-5" />
                            </Button>
                            <div className="flex items-center gap-2">
                                {isLoading ? (
                                    <Skeleton className="w-10 h-10 rounded-full" />
                                ) : (
                                    <img src={teacherData.avatar} alt={teacherData.name} className="w-10 h-10 rounded-full" />
                                )}
                                <div className="hidden md:block">
                                    {isLoading ? (
                                        <>
                                            <Skeleton className="h-4 w-20 mb-1" />
                                            <Skeleton className="h-3 w-12" />
                                        </>
                                    ) : (
                                        <>
                                            <p className="font-medium text-sm">{teacherData.name}</p>
                                            <p className="text-xs text-muted-foreground">{currentSubject?.name || user?.details || "Teacher"}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Sidebar */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-1"
                    >
                        <Card className="sticky top-24">
                            <CardContent className="p-4">
                                {/* Teacher Info */}
                                <div className="text-center mb-4 pb-4 border-b">
                                    {isLoading ? (
                                        <Skeleton className="w-16 h-16 rounded-xl mx-auto mb-3" />
                                    ) : (
                                        <img
                                            src={teacherData.avatar}
                                            alt={teacherData.name}
                                            className="w-16 h-16 rounded-xl mx-auto mb-3 border-4 border-primary/20"
                                        />
                                    )}
                                    {isLoading ? (
                                        <Skeleton className="h-4 w-24 mx-auto mb-2" />
                                    ) : (
                                        <h2 className="font-bold text-sm mb-1">{teacherData.name}</h2>
                                    )}
                                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                        <GraduationCap className="w-3 h-3" />
                                        <span>{teacherData.stats.totalStudents} طالب</span>
                                        <Award className="w-3 h-3 text-warning fill-warning mr-2" />
                                        <span>{teacherData.stats.averageScore}%</span>
                                    </div>
                                </div>

                                {/* Navigation */}
                                <nav className="space-y-1">
                                    {[
                                        { id: "overview", icon: LayoutDashboard, label: "نظرة عامة" },
                                        { id: "topics", icon: Library, label: "الدروس" },
                                        { id: "challenges", icon: Gamepad2, label: "التحديات" },
                                        { id: "students", icon: Users, label: "الطلاب" },
                                        { id: "analytics", icon: ChartBar, label: "الإحصائيات" },
                                        { id: "settings", icon: Cog, label: "الإعدادات" }
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === item.id
                                                ? "bg-primary text-primary-foreground"
                                                : "hover:bg-muted"
                                                }`}
                                        >
                                            <item.icon className="w-4 h-4" />
                                            <span>{item.label}</span>
                                        </button>
                                    ))}
                                </nav>

                                <div className="mt-4 pt-4 border-t">
                                    <Button
                                        variant="ghost"
                                        size="sm"
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
                        className="lg:col-span-4 space-y-6"
                    >
                        {!profile?.subject_id && (
                            <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                                <AlertTitle className="font-bold">المعلومات ناقصة</AlertTitle>
                                <AlertDescription className="text-sm">
                                    لم يتم تحديد المادة أو الصف الدراسي الخاص بك بعد. يرجى التوجه إلى الإعدادات لتحديث بياناتك المهنية.
                                    <Button variant="link" size="sm" className="text-amber-700 font-bold p-0 mr-2" onClick={() => setActiveTab("settings")}>
                                        إذهب للإعدادات
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        )}

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
                                        <div className="relative p-6 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500">
                                            <div className="relative z-10">
                                                <h1 className="text-2xl font-bold text-white mb-2">
                                                    مرحباً، {teacherData.name.split(" ").pop() || teacherData.name}! 👋
                                                </h1>
                                                <p className="text-white/80 mb-4">
                                                    {currentSubject?.name && currentGrade?.name
                                                        ? `إدارة دروس ${currentSubject.name} - ${currentGrade.name}`
                                                        : "مرحباً بك في لوحة التحكم"}
                                                </p>
                                                <div className="flex gap-3">
                                                    {teacherData.gradeId && teacherData.subjectId && (
                                                        <Button variant="secondary" size="sm" asChild className="gap-2">
                                                            <Link to={`/grade/${teacherData.gradeId}/subject/${teacherData.subjectId}`}>
                                                                <Eye className="w-4 h-4" />
                                                                عرض المادة
                                                            </Link>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="absolute left-0 top-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                                        </div>
                                    </Card>

                                    {/* Quick Stats */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <Card className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                                    <Library className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    {isLoading ? <Skeleton className="h-7 w-8 mb-1" /> : (
                                                        <p className="text-2xl font-bold">{teacherData.stats.totalTopics}</p>
                                                    )}
                                                    <p className="text-sm text-muted-foreground">درس</p>
                                                </div>
                                            </div>
                                        </Card>
                                        <Card className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                                                    <Users className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    {isLoading ? <Skeleton className="h-7 w-8 mb-1" /> : (
                                                        <p className="text-2xl font-bold">{teacherData.stats.totalStudents}</p>
                                                    )}
                                                    <p className="text-sm text-muted-foreground">طالب</p>
                                                </div>
                                            </div>
                                        </Card>
                                        <Card className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                                    <TrendingUp className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    {isLoading ? <Skeleton className="h-7 w-12 mb-1" /> : (
                                                        <p className="text-2xl font-bold">{teacherData.stats.averageScore}%</p>
                                                    )}
                                                    <p className="text-sm text-muted-foreground">متوسط النتائج</p>
                                                </div>
                                            </div>
                                        </Card>
                                        <Card className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                                    <Gamepad2 className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    {isLoading ? <Skeleton className="h-7 w-8 mb-1" /> : (
                                                        <p className="text-2xl font-bold">{teacherData.stats.totalChallenges}</p>
                                                    )}
                                                    <p className="text-sm text-muted-foreground">تحدي</p>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>

                                    {/* Active Challenges & Statistics Preview */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Score Distribution Preview */}
                                        <Card className="lg:col-span-1">
                                            <CardHeader className="py-4">
                                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                    <ChartBar className="w-4 h-4 text-primary" />
                                                    توزيع الدرجات (المادة)
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                {scoreDistribution.some(s => s.count > 0) ? (
                                                    <div className="h-[180px] w-full" dir="ltr">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <PieChart>
                                                                <Pie
                                                                    data={scoreDistribution.filter(s => s.count > 0)}
                                                                    cx="50%"
                                                                    cy="50%"
                                                                    innerRadius={40}
                                                                    outerRadius={65}
                                                                    paddingAngle={4}
                                                                    dataKey="count"
                                                                >
                                                                    {scoreDistribution.filter(s => s.count > 0).map((entry, index) => (
                                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                                    ))}
                                                                </Pie>
                                                                <RechartsTooltip />
                                                            </PieChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                ) : (
                                                    <div className="h-[180px] flex items-center justify-center text-muted-foreground text-xs text-center border-2 border-dashed rounded-xl">
                                                        لا توجد بيانات <br /> كافية حالياً
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-2 gap-2 mt-4">
                                                    {scoreDistribution.map((range, i) => (
                                                        <div key={i} className="flex items-center gap-1.5 text-[10px]">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: range.color }} />
                                                            <span className="truncate">{range.name}: {range.count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Active Challenges */}
                                        <Card className="lg:col-span-2">
                                            <CardHeader className="flex flex-row items-center justify-between py-4">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Zap className="w-5 h-5 text-warning" />
                                                    التحديات النشطة
                                                </CardTitle>
                                                <span className="px-2 py-1 rounded-full bg-success/10 text-success text-xs font-bold">
                                                    {activeChallenges.length} قيد التشغيل
                                                </span>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {activeChallenges.slice(0, 3).map(challenge => (
                                                    <div
                                                        key={challenge.id}
                                                        className="p-3 rounded-xl bg-primary/5 border border-primary/20"
                                                    >
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-2 h-2 rounded-full ${challenge.status === "playing" ? "bg-success animate-pulse" : "bg-warning"}`} />
                                                                <span className="text-sm font-medium truncate max-w-[150px]">
                                                                    {challenge.topicTitle}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground font-bold">
                                                                <Users className="w-3 h-3" />
                                                                {challenge.playersCount}
                                                            </div>
                                                        </div>

                                                        {/* Players Mini Preview */}
                                                        {challenge.players && challenge.players.length > 0 && (
                                                            <div className="flex -space-x-2 rtl:space-x-reverse mb-4 overflow-hidden">
                                                                {challenge.players.slice(0, 5).map((p: any) => (
                                                                    <img
                                                                        key={p.id}
                                                                        src={p.avatar}
                                                                        className="w-6 h-6 rounded-full border-2 border-background ring-1 ring-primary/5"
                                                                        title={p.name}
                                                                    />
                                                                ))}
                                                                {challenge.playersCount > 5 && (
                                                                    <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px] font-bold">
                                                                        +{challenge.playersCount - 5}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        <div className="flex items-center justify-between">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">كود الانضمام</span>
                                                                <span className="font-mono font-black text-lg text-primary tracking-tighter">{challenge.pin}</span>
                                                            </div>
                                                            <div className="flex flex-col gap-1.5">
                                                                <Button
                                                                    size="sm"
                                                                    className="h-8 gap-1.5 bg-primary hover:bg-primary/90 shadow-sm px-3 active:scale-95 transition-transform"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const url = `/grade/${challenge.gradeId}/subject/${challenge.subjectId}/topic/${challenge.topicId}/challenge/group/ACTIVITIES/${challenge.pin}?host=true`;
                                                                        console.log("Navigating to Control Panel:", url);
                                                                        navigate(url);
                                                                    }}
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                    لوحة التحكم
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    className="h-8 text-[11px] px-3 gap-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 border active:scale-95 transition-transform"
                                                                    onClick={() => handleStartSession(challenge.pin, challenge.topicId)}
                                                                >
                                                                    <Zap className="w-3.5 h-3.5" />
                                                                    بدء التحدي
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {activeChallenges.length === 0 && (
                                                    <div className="text-center py-8 text-muted-foreground">
                                                        <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                                        <p className="text-sm">لا توجد تحديات نشطة</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        {/* Recent Students */}
                                        <Card>
                                            <CardHeader className="py-4">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Users className="w-5 h-5 text-primary" />
                                                    آخر المشاركين
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {recentStudents.length > 0 ? (
                                                    recentStudents.map((student: any, i: number) => (
                                                        <div
                                                            key={i}
                                                            className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                                                        >
                                                            <img
                                                                src={student.avatar}
                                                                alt={student.name}
                                                                className="w-10 h-10 rounded-full"
                                                            />
                                                            <div className="flex-1">
                                                                <p className="font-medium text-sm">{student.name}</p>
                                                                <p className="text-xs text-muted-foreground">{student.lastActive}</p>
                                                            </div>
                                                            <span className={`font-bold ${student.score >= 90 ? "text-success" :
                                                                student.score >= 75 ? "text-warning" : "text-destructive"
                                                                }`}>
                                                                {student.score}%
                                                            </span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-8 text-muted-foreground">
                                                        <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                                        <p className="text-sm">لا يوجد طلاب حتى الآن</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* My Topics */}
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between py-4">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Library className="w-5 h-5 text-primary" />
                                                دروسي
                                            </CardTitle>
                                            <Button size="sm" onClick={() => setActiveTab("topics")}>
                                                عرض الكل
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {isLoadingGrade ? (
                                                Array.from({ length: 2 }).map((_, i) => (
                                                    <Skeleton key={i} className="h-40 rounded-xl" />
                                                ))
                                            ) : topics.length > 0 ? (
                                                topics.map((topic: any) => (
                                                    <div key={topic.id} className="p-4 rounded-xl border hover:border-primary/50 transition-all">
                                                        <h3 className="font-bold mb-2">{topic.title}</h3>
                                                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{topic.description}</p>
                                                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                                                            <span><Eye className="w-3 h-3 inline ml-1" />{topic.views || 0} مشاهدة</span>
                                                            <span>{topic.mediaItems?.length || 0} عنصر</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button size="sm" variant="outline" className="flex-1 text-xs" asChild>
                                                                <Link to={`/grade/${teacherData.gradeId}/subject/${teacherData.subjectId}/topic/${topic.id}`}>
                                                                    <Eye className="w-3 h-3 ml-1" />
                                                                    عرض
                                                                </Link>
                                                            </Button>
                                                            <Button size="sm" className="flex-1 text-xs" onClick={() => handleCreateChallenge(topic.id)}>
                                                                <Gamepad2 className="w-3 h-3 ml-1" />
                                                                تحدي
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="col-span-2 text-center py-8 text-muted-foreground">
                                                    <Library className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                                    <p className="text-sm">لا توجد دروس بعد</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {/* Other tabs */}
                            {activeTab !== "overview" && (
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    {activeTab === "topics" && (
                                        <TeacherTopicsTab
                                            gradeId={teacherData.gradeId}
                                            subjectId={teacherData.subjectId}
                                            onCreateChallenge={handleCreateChallenge}
                                        />
                                    )}
                                    {activeTab === "challenges" && (
                                        <TeacherChallengesTab
                                            gradeId={teacherData.gradeId}
                                            subjectId={teacherData.subjectId}
                                            activeChallenges={activeChallenges}
                                            onStartChallenge={handleStartSession}
                                            onDeleteChallenge={handleCancelChallenge}
                                            onCopyToClipboard={(text) => {
                                                navigator.clipboard.writeText(text);
                                                toast({ title: "تم النسخ", description: text });
                                            }}
                                        />
                                    )}
                                    {activeTab === "students" && <TeacherStudentsTab />}
                                    {activeTab === "analytics" && <TeacherAnalyticsTab />}
                                    {activeTab === "settings" && <TeacherSettingsTab />}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;

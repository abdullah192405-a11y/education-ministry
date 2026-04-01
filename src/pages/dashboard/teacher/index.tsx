import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
    LayoutDashboard, Library, Users, Gamepad2, ChartBar, Cog,
    Bell, LogOut, ChevronRight, GraduationCap, Award, Search,
    Plus, Trophy, History, Clock, Eye, Star, Info, AlertTriangle,
    CheckCircle, TrendingUp, Zap, Copy, Upload, Share2, MessageCircle, Twitter, Send
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { generatePin } from "@/data/challengeTypes";
import { useUser, useTeacherProfile, useActiveChallengesByHost, useHostedChallengeResults, useHostedSessions, useRecentChallengeResults, useCreateChallengeSession, useUpdateChallengeSession, useDeleteChallengeSession, useTeacherAllTopics } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";
import TeacherTopicsTab from "./components/TeacherTopicsTab";
import TeacherChallengesTab from "./components/TeacherChallengesTab";
import TeacherStudentsTab from "./components/TeacherStudentsTab";
import TeacherAnalyticsTab from "./components/TeacherAnalyticsTab";
import TeacherSettingsTab from "./components/TeacherSettingsTab";


import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";

const TeacherDashboard = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { signOut: clerkSignOut } = useAuth();
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
    const { data: dbActiveChallenges } = useActiveChallengesByHost(user?.id || "");
    const { data: hostedResults } = useHostedChallengeResults(user?.id || "", 50);
    const { data: hostedSessions } = useHostedSessions(user?.id || "");

    const [activeTab, setActiveTab] = useState("overview");
    const { toast } = useToast();
    const [localChallenges, setLocalChallenges] = useState<any[]>([]);

    // State for sharing modal
    const [createdChallengeInfo, setCreatedChallengeInfo] = useState<{ pin: string, title: string } | null>(null);

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            await clerkSignOut();
            localStorage.removeItem("edu_user");
            queryClient.clear(); // Clear all cached data
            navigate("/");
        } catch (error) {
            console.error("Logout error:", error);
            navigate("/");
        }
    };

    const { data: allTopics, isLoading: isLoadingTopics } = useTeacherAllTopics(profile?.id || "");

    const isLoading = isLoadingUser || isLoadingProfile;

    // Filter topics for this teacher's content
    const topics = allTopics || [];

    // Calculate unique students who have participated in this teacher's challenges
    const uniqueStudentsParticipated = new Set((hostedResults || []).map((r: any) => r.user_id || r.userId));
    const uniqueStudentsCount = uniqueStudentsParticipated.size;

    // Derive teacher data from real DB
    const teacherData = {
        id: user?.id || "",
        name: user?.name || "معلم",
        email: user?.email || "",
        avatar: user?.avatar || "https://api.dicebear.com/7.x/fun-emoji/svg?seed=teacher",
        verified: user?.verified || false,
        stats: {
            totalTopics: profile?.total_topics || topics.length || 0,
            totalStudents: uniqueStudentsCount || profile?.total_students || 0,
            averageScore: (() => {
                return hostedResults?.length
                    ? Math.round(hostedResults.reduce((acc: number, r: any) => acc + (r.score || 0), 0) / hostedResults.length)
                    : Math.round(profile?.average_score || 0);
            })(),
            totalChallenges: hostedSessions?.length || profile?.total_challenges || 0,
        }
    };

    // Build score distribution for overview (from hosted results directly)
    const scoreDistribution = [
        { name: "90-100%", count: 0, color: "#10b981" },
        { name: "70-89%", count: 0, color: "#3b82f6" },
        { name: "50-69%", count: 0, color: "#f59e0b" },
        { name: "أقل من 50%", count: 0, color: "#ef4444" },
    ];

    if ((hostedResults || []).length > 0) {
        hostedResults!.forEach((r: any) => {
            const score = r.score || 0;
            if (score >= 90) scoreDistribution[0].count++;
            else if (score >= 70) scoreDistribution[1].count++;
            else if (score >= 50) scoreDistribution[2].count++;
            else scoreDistribution[3].count++;
        });
    }



    // Merge DB active challenges with locally-created ones, ensuring no duplicates by PIN
    const activeChallenges = [
        ...localChallenges.filter(lc => !(dbActiveChallenges || []).some((dbc: any) => dbc.pin === lc.pin)),
        ...(dbActiveChallenges || []).map((c: any) => ({
            id: c.id,
            topicId: c.topic_id,
            gradeId: c.topic?.subject?.grade_id || c.topic?.grade_id || "",
            subjectId: c.topic?.subject_id || "",
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
            // Get gradeId/subjectId from the challenge data
            const challenge = activeChallenges.find(c => c.pin === pin);
            const gId = challenge?.gradeId || "0";
            const sId = challenge?.subjectId || "0";
            navigate(`/grade/${gId}/subject/${sId}/topic/${topicId}/challenge/group/ACTIVITIES/${pin}?host=true`);
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

    const handleCreateChallenge = async (topicId: string | number, details?: { title: string, gradeId?: string, subjectId?: string }) => {
        let topic = topics.find((t: any) => String(t.id) === String(topicId));
        
        if (!topic && details) {
            topic = {
                id: topicId,
                title: details.title,
                grade_id: details.gradeId || "",
                subject_id: details.subjectId || ""
            };
        }

        if (!topic) {
            toast({
                title: "تنبيه",
                description: "لم يتم العثور على الدرس المطابق. يرجى تحديث الصفحة والمحاولة مرة أخرى.",
                variant: "destructive"
            });
            return;
        }

        if (!teacherData.id) {
            toast({
                title: "خطأ في الجلسة",
                description: "لم يتم العثور على بيانات المعلم. يرجى محاولة تسجيل الدخول مرة أخرى.",
                variant: "destructive"
            });
            return;
        }

        const pin = generatePin();
        const newChallenge = {
            id: Date.now(),
            topicId: topic.id,
            gradeId: topic.grade_id || details?.gradeId || "",
            subjectId: topic.subject_id || details?.subjectId || "",
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

            const joinLink = `${window.location.origin}/join/${pin}`;
            const shareText = `انضم إلى تحدي "${topic.title}"! رمز الانضمام: ${pin}`;

            toast({
                title: "تم إنشاء التحدي بنجاح",
                description: (
                    <div className="flex flex-col gap-3 mt-1">
                        <p>رمز الدخول: <span className="font-mono font-bold text-primary">{pin}</span>. يمكنك الآن متابعة المنضمين من تبويب التحديات.</p>
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5 border-primary/20 hover:bg-primary/10 hover:text-primary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(joinLink);
                                    toast({ title: "تم النسخ", description: "تم نسخ رابط التحدي بنجاح" });
                                }}
                            >
                                <Copy className="w-3 h-3" />
                                نسخ الرابط
                            </Button>
                            <Button
                                size="sm"
                                className="h-7 text-xs gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(joinLink + "\n\n" + shareText)}`);
                                }}
                            >
                                <Share2 className="w-3 h-3" />
                                واتساب
                            </Button>
                        </div>
                    </div>
                ),
            });

            // Transition to challenges tab to see the new lobby row
            setActiveTab("challenges");
        } catch (error: any) {
            console.error("Detailed Error creating challenge:", error);

            // Extract the most descriptive error message
            const errorMessage = error?.message ||
                error?.error_description ||
                (typeof error === 'string' ? error : "تعذر إنشاء التحدي في قاعدة البيانات.");

            toast({
                title: "خطأ في إنشاء التحدي",
                description: (
                    <div className="mt-1 flex flex-col gap-1">
                        <p>{errorMessage}</p>
                        {error?.details && <p className="text-[10px] opacity-70">Details: {error.details}</p>}
                        {error?.hint && <p className="text-[10px] opacity-70">Hint: {error.hint}</p>}
                        {error?.code && <p className="text-[10px] font-mono">Code: {error.code}</p>}
                    </div>
                ),
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
                                        📚
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
                                            <span className="font-medium text-sm">لوحة المعلم</span>
                                            <p className="text-xs text-muted-foreground">{teacherData.name}</p>
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
                                            <p className="text-xs text-muted-foreground">{user?.details || "معلم"}</p>
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
                                                    مرحباً بك في لوحة التحكم
                                                </p>
                                                <div className="flex gap-3">
                                                    <Button variant="secondary" size="sm" className="gap-2" onClick={() => setActiveTab("topics")}>
                                                        <Library className="w-4 h-4" />
                                                        إدارة الدروس
                                                    </Button>
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

                                    {/* My Topics - prompt to go to topics tab */}
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
                                            {isLoadingTopics ? (
                                                Array.from({ length: 4 }).map((_, i) => (
                                                    <Skeleton key={i} className="h-40 rounded-xl" />
                                                ))
                                            ) : topics.length > 0 ? (
                                                topics.slice(0, 4).map((topic: any) => {
                                                    const gId = topic.subject?.grade?.id || topic.grade_id || "0";
                                                    const sId = topic.subject_id || "0";
                                                    return (
                                                        <div key={topic.id} className="p-4 rounded-xl border hover:border-primary/50 transition-all flex flex-col h-full">
                                                            <div className="flex-1">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <h3 className="font-bold">{topic.title}</h3>
                                                                    <Badge variant="outline" className="text-[10px] truncate max-w-[100px]">{topic.subject?.name || "مادة"}</Badge>
                                                                </div>
                                                                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{topic.description}</p>
                                                            </div>
                                                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 pt-2 border-t">
                                                                <span><Eye className="w-3 h-3 inline ml-1" />{topic.views || 0} مشاهدة</span>
                                                                <span>{topic.mediaItems?.length || 0} عنصر</span>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button size="sm" variant="outline" className="flex-1 text-xs" asChild>
                                                                    <Link to={`/grade/${gId}/subject/${sId}/topic/${topic.id}`}>
                                                                        <Eye className="w-3 h-3 ml-1" />
                                                                        عرض
                                                                    </Link>
                                                                </Button>
                                                                <Button size="sm" className="flex-1 text-xs" onClick={() => handleCreateChallenge(topic.id, { title: topic.title, gradeId: gId, subjectId: sId })}>
                                                                    <Gamepad2 className="w-3 h-3 ml-1" />
                                                                    تحدي
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            ) : (
                                                <div className="col-span-1 md:col-span-2 text-center py-8">
                                                    <Library className="w-12 h-12 mx-auto mb-3 text-primary/30" />
                                                    <p className="text-muted-foreground text-sm mb-4">لا توجد دروس حالياً، اذهب إلى تبويب "الدروس" لإنشاء درس جديد</p>
                                                    <Button onClick={() => setActiveTab("topics")} className="gap-2">
                                                        <Plus className="w-4 h-4" />
                                                        إنشاء درس جديد
                                                    </Button>
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
                                            teacherProfileId={profile?.id}
                                            onCreateChallenge={handleCreateChallenge}
                                        />
                                    )}
                                    {activeTab === "challenges" && (
                                        <TeacherChallengesTab
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
                    </motion.div >
                </div >
            </div >

            <Dialog open={!!createdChallengeInfo} onOpenChange={(open) => !open && setCreatedChallengeInfo(null)}>
                <DialogContent className="sm:max-w-md" dir="rtl">
                    <DialogHeader>
                        <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                            <Share2 className="w-6 h-6" />
                        </div>
                        <DialogTitle className="text-center text-xl">شارك رابط التحدي</DialogTitle>
                        <DialogDescription className="text-center">
                            تم إنشاء تحدي <span className="font-bold text-foreground">"{createdChallengeInfo?.title}"</span> بنجاح. شارك رمز الانضمام مع طلابك للبدء.
                        </DialogDescription>
                    </DialogHeader>

                    {createdChallengeInfo && (
                        <div className="space-y-6 py-4">
                            <div className="flex flex-col items-center justify-center bg-muted/50 p-6 rounded-2xl border-2 border-dashed">
                                <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">رمز التحدي</span>
                                <span className="text-5xl font-mono font-black text-primary tracking-widest">{createdChallengeInfo.pin}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    className="h-12 bg-[#25D366] hover:bg-[#25D366]/90 text-white gap-2"
                                    onClick={() => {
                                        const link = `${window.location.origin}/join/${createdChallengeInfo.pin}`;
                                        const text = `انضم إلى تحدي "${createdChallengeInfo.title}"! رمز الانضمام هو: ${createdChallengeInfo.pin}`;
                                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(link + "\n\n" + text)}`);
                                    }}
                                >
                                    <MessageCircle className="w-5 h-5" />
                                    واتس اب
                                </Button>

                                <Button
                                    className="h-12 bg-[#1DA1F2] hover:bg-[#1DA1F2]/90 text-white gap-2"
                                    onClick={() => {
                                        const link = `${window.location.origin}/join/${createdChallengeInfo.pin}`;
                                        const text = `انضم إلى تحدي "${createdChallengeInfo.title}"! رمز الانضمام هو: ${createdChallengeInfo.pin}`;
                                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`, '_blank');
                                    }}
                                >
                                    <Twitter className="w-5 h-5" />
                                    تويتر / X
                                </Button>

                                <Button
                                    className="h-12 bg-[#0088cc] hover:bg-[#0088cc]/90 text-white gap-2"
                                    onClick={() => {
                                        const link = `${window.location.origin}/join/${createdChallengeInfo.pin}`;
                                        const text = `انضم إلى تحدي "${createdChallengeInfo.title}"! رمز الانضمام هو: ${createdChallengeInfo.pin}`;
                                        window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, '_blank');
                                    }}
                                >
                                    <Send className="w-5 h-5" />
                                    تيليجرام
                                </Button>

                                <Button
                                    variant="outline"
                                    className="h-12 border-primary/20 text-primary hover:bg-primary/5 gap-2"
                                    onClick={() => {
                                        const link = `${window.location.origin}/join/${createdChallengeInfo.pin}`;
                                        navigator.clipboard.writeText(link);
                                        toast({ title: "تم النسخ", description: "تم نسخ رابط التحدي بنجاح" });
                                    }}
                                >
                                    <Copy className="w-5 h-5" />
                                    نسخ الرابط
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div >
    );
};

export default TeacherDashboard;

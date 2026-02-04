import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    BookOpen, History, Settings, LogOut, Bell,
    Play, Download, Share2, Calendar,
    TrendingUp, Award, Zap, CheckCircle,
    BarChart3, Activity, Plus, Edit, Trash2,
    Users, Eye, Gamepad2, LayoutDashboard, Library, ChartBar, Cog,
    ExternalLink, Sparkles, AlertTriangle, Copy, GraduationCap
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { generatePin } from "@/data/challengeTypes";
import { gradesData } from "@/data/educationData";
import TeacherTopicsTab from "@/components/dashboard/teacher/TeacherTopicsTab";
import TeacherChallengesTab from "@/components/dashboard/teacher/TeacherChallengesTab";
import TeacherStudentsTab from "@/components/dashboard/teacher/TeacherStudentsTab";
import TeacherAnalyticsTab from "@/components/dashboard/teacher/TeacherAnalyticsTab";
import TeacherSettingsTab from "@/components/dashboard/teacher/TeacherSettingsTab";

// Mock Teacher Data
const mockTeacherData = {
    id: 1,
    name: "أ. فاطمة الحربي",
    email: "teacher@edu.sa",
    avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=fatima",
    gradeId: 1, // الصف الأول الابتدائي
    subjectId: 1, // اللغة العربية
    verified: true,
    stats: {
        totalTopics: 2,
        totalStudents: 28,
        averageScore: 87,
        totalChallenges: 15,
        activeStudents: 24
    }
};

const initialActiveChallenges = [
    {
        id: 1,
        topicId: 1,
        pin: "847291",
        topicTitle: "حروف الهجاء العربية",
        mode: "group",
        players: 18,
        status: "playing",
        startedAt: "قبل 5 دقائق",
        type: "admin"
    },
    {
        id: 2,
        topicId: 2,
        pin: "319847",
        topicTitle: "الحركات والتنوين",
        mode: "group",
        players: 12,
        status: "waiting",
        startedAt: "قبل دقيقة",
        type: "admin"
    }
];

const mockRecentStudents = [
    { name: "سارة أحمد", score: 95, avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=sara", lastActive: "منذ 10 دقائق" },
    { name: "محمد علي", score: 88, avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=mohammad", lastActive: "منذ 15 دقيقة" },
    { name: "فاطمة خالد", score: 92, avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=fatimak", lastActive: "منذ 20 دقيقة" },
    { name: "عمر حسن", score: 85, avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=omar", lastActive: "منذ 25 دقيقة" }
];

const TeacherDashboard = () => {
    const [activeTab, setActiveTab] = useState("overview");
    const { toast } = useToast();
    const navigate = useNavigate();
    const [activeChallenges, setActiveChallenges] = useState(initialActiveChallenges);

    // Get teacher's grade and subject
    const currentGrade = gradesData.find(g => g.id === mockTeacherData.gradeId);
    const currentSubject = currentGrade?.subjects.find(s => s.id === mockTeacherData.subjectId);
    const topics = currentSubject?.topics || [];

    const handleCreateChallenge = (topicId: number) => {
        const topic = topics.find(t => t.id === topicId);
        if (!topic) return;

        const pin = generatePin();
        const newChallenge = {
            id: Date.now(),
            topicId: topic.id,
            pin: pin,
            topicTitle: topic.title,
            mode: "group" as const,
            players: 0,
            status: "waiting" as const,
            startedAt: "الآن",
            type: "admin" as const
        };

        setActiveChallenges(prev => [newChallenge, ...prev]);

        toast({
            title: "تم إنشاء التحدي بنجاح",
            description: `رمز الدخول: ${pin}`,
        });

        // Navigate to challenge
        setTimeout(() => {
            navigate(`/grade/${mockTeacherData.gradeId}/subject/${mockTeacherData.subjectId}/topic/${topicId}/challenge/group/activities/${pin}?host=true`);
        }, 1000);
    };

    return (
        <div className="min-h-screen font-cairo bg-gradient-to-br from-background via-background to-primary/5" dir="rtl">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        <div className="flex items-center gap-4">
                            <Link to="/" className="flex items-center gap-3">
                                <img src="/logo.png" alt="وزارة التربية والتعليم" className="w-10 h-10 rounded-xl object-contain bg-background" />
                                <span className="text-xl font-bold hidden md:block">وزارة التربية والتعليم</span>
                            </Link>
                            <div className="h-8 w-px bg-border" />
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xl">
                                    {currentSubject?.icon}
                                </div>
                                <div className="hidden md:block">
                                    <span className="font-medium text-sm">{currentSubject?.name}</span>
                                    <p className="text-xs text-muted-foreground">{currentGrade?.name}</p>
                                </div>
                                {mockTeacherData.verified && <CheckCircle className="w-4 h-4 text-primary fill-primary/20" />}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" className="relative">
                                <Bell className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">3</span>
                            </Button>
                            <div className="flex items-center gap-2">
                                <img src={mockTeacherData.avatar} alt={mockTeacherData.name} className="w-10 h-10 rounded-full" />
                                <div className="hidden md:block">
                                    <p className="font-medium text-sm">{mockTeacherData.name}</p>
                                    <p className="text-xs text-muted-foreground">معلمة</p>
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
                                    <img
                                        src={mockTeacherData.avatar}
                                        alt={mockTeacherData.name}
                                        className="w-16 h-16 rounded-xl mx-auto mb-3 border-4 border-primary/20"
                                    />
                                    <h2 className="font-bold text-sm mb-1">{mockTeacherData.name}</h2>
                                    <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                        <GraduationCap className="w-3 h-3" />
                                        <span>{mockTeacherData.stats.totalStudents} طالب</span>
                                        <Award className="w-3 h-3 text-warning fill-warning mr-2" />
                                        <span>{mockTeacherData.stats.averageScore}%</span>
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
                                    <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2">
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
                                                    مرحباً، {mockTeacherData.name.split(" ")[1]}! 👋
                                                </h1>
                                                <p className="text-white/80 mb-4">
                                                    إدارة دروس {currentSubject?.name} - {currentGrade?.name}
                                                </p>
                                                <div className="flex gap-3">
                                                    <Button variant="secondary" size="sm" asChild className="gap-2">
                                                        <Link to={`/grade/${mockTeacherData.gradeId}/subject/${mockTeacherData.subjectId}`}>
                                                            <Eye className="w-4 h-4" />
                                                            عرض المادة
                                                        </Link>
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
                                                    <p className="text-2xl font-bold">{mockTeacherData.stats.totalTopics}</p>
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
                                                    <p className="text-2xl font-bold">{mockTeacherData.stats.totalStudents}</p>
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
                                                    <p className="text-2xl font-bold">{mockTeacherData.stats.averageScore}%</p>
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
                                                    <p className="text-2xl font-bold">{mockTeacherData.stats.totalChallenges}</p>
                                                    <p className="text-sm text-muted-foreground">تحدي</p>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>

                                    {/* Active Challenges & Quick Actions */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Active Challenges */}
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between py-4">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Zap className="w-5 h-5 text-warning" />
                                                    تحديات نشطة
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
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-2 h-2 rounded-full ${challenge.status === "playing" ? "bg-success animate-pulse" : "bg-warning"}`} />
                                                                <span className="text-sm font-medium truncate max-w-[150px]">
                                                                    {challenge.topicTitle}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-xs text-muted-foreground font-bold">
                                                                <Users className="w-3 h-3" />
                                                                {challenge.players}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-xs font-bold text-muted-foreground">PIN:</span>
                                                                <span className="font-mono font-black text-sm text-primary">{challenge.pin}</span>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                <Button size="sm" className="h-7 text-xs px-2 gap-1">
                                                                    <Eye className="w-3 h-3" />
                                                                    إدارة
                                                                </Button>
                                                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => {
                                                                    navigator.clipboard.writeText(challenge.pin);
                                                                    toast({ title: "تم نسخ الرمز", description: challenge.pin });
                                                                }}>
                                                                    <Copy className="w-3 h-3" />
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
                                                {mockRecentStudents.map((student, i) => (
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
                                                ))}
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
                                            {topics.map((topic) => (
                                                <div key={topic.id} className="p-4 rounded-xl border hover:border-primary/50 transition-all">
                                                    <h3 className="font-bold mb-2">{topic.title}</h3>
                                                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{topic.description}</p>
                                                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                                                        <span><Eye className="w-3 h-3 inline ml-1" />{topic.views} مشاهدة</span>
                                                        <span>{topic.media.length} عنصر</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" variant="outline" className="flex-1 text-xs" asChild>
                                                            <Link to={`/grade/${mockTeacherData.gradeId}/subject/${mockTeacherData.subjectId}/topic/${topic.id}`}>
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
                                            ))}
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
                                            gradeId={mockTeacherData.gradeId}
                                            subjectId={mockTeacherData.subjectId}
                                            onCreateChallenge={handleCreateChallenge}
                                        />
                                    )}
                                    {activeTab === "challenges" && (
                                        <TeacherChallengesTab
                                            activeChallenges={activeChallenges}
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

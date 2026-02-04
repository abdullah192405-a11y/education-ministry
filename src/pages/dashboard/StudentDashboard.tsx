import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
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
import { gradesData } from "@/data/educationData";

// Mock student data
const mockStudentData = {
    id: "student-1",
    name: "أحمد الحربي",
    email: "ahmed@example.com",
    avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=ahmed",
    gradeId: 1, // الصف الأول الابتدائي
    joinedAt: "2024-01-01",
    stats: {
        totalTopicsCompleted: 12,
        averageScore: 85,
        totalPoints: 5420,
        longestStreak: 15,
        currentStreak: 7,
        rank: 42, // في صفه
        badges: 12,
        totalStudyHours: 24
    }
};

// Mock study progress by subject
const mockSubjectProgress = [
    { subjectId: 1, name: "اللغة العربية", icon: "📖", completedTopics: 2, totalTopics: 2, averageScore: 92, color: "#10b981" },
    { subjectId: 2, name: "الرياضيات", icon: "🔢", completedTopics: 2, totalTopics: 2, averageScore: 88, color: "#3b82f6" },
    { subjectId: 3, name: "العلوم", icon: "🔬", completedTopics: 1, totalTopics: 1, averageScore: 78, color: "#8b5cf6" }
];

// Mock recent topics
const mockRecentTopics = [
    {
        id: 1,
        topicTitle: "حروف الهجاء العربية",
        subjectName: "اللغة العربية",
        subjectIcon: "📖",
        gradeId: 1,
        subjectId: 1,
        topicId: 1,
        date: "2024-01-29",
        score: 95,
        completed: true
    },
    {
        id: 2,
        topicTitle: "الحركات والتنوين",
        subjectName: "اللغة العربية",
        subjectIcon: "📖",
        gradeId: 1,
        subjectId: 1,
        topicId: 2,
        date: "2024-01-28",
        score: 88,
        completed: true
    },
    {
        id: 3,
        topicTitle: "جمع الأرقام البسيطة",
        subjectName: "الرياضيات",
        subjectIcon: "🔢",
        gradeId: 1,
        subjectId: 2,
        topicId: 2,
        date: "2024-01-27",
        score: 92,
        completed: true
    }
];

const mockBadges = [
    { id: "perfect", name: "مثالي", icon: "🏆", earned: true, description: "أجبت على جميع الأسئلة بشكل صحيح" },
    { id: "speed_demon", name: "البرق", icon: "⚡", earned: true, description: "أجبت خلال 3 ثواني على جميع الأسئلة" },
    { id: "streak_master", name: "متسلسل", icon: "🔥", earned: true, description: "حققت 7 أيام متتالية من الدراسة" },
    { id: "scholar", name: "العالِم", icon: "📚", earned: true, description: "حصلت على أكثر من 90%" },
    { id: "math_genius", name: "عبقري الرياضيات", icon: "🧮", earned: true, description: "أكملت جميع دروس الرياضيات" },
    { id: "arabic_master", name: "بطل اللغة العربية", icon: "📖", earned: true, description: "أتقنت حروف الهجاء" },
    { id: "quick_learner", name: "سريع التعلم", icon: "🧠", earned: true, description: "أكملت التحدي في أقل من دقيقتين" },
    { id: "persistent", name: "المثابر", icon: "💪", earned: true, description: "أعدت المحاولة 3 مرات حتى النجاح" },
    { id: "science_explorer", name: "مستكشف العلوم", icon: "🔬", earned: false, description: "أكمل جميع دروس العلوم" },
    { id: "champion", name: "البطل", icon: "👑", earned: false, description: "احتل المركز الأول في صفك" }
];

const StudentDashboard = () => {
    const [activeTab, setActiveTab] = useState("overview");
    const currentGrade = gradesData.find(g => g.id === mockStudentData.gradeId);

    return (
        <div className="min-h-screen font-cairo bg-gradient-to-br from-background via-background to-primary/5" dir="rtl">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        <Link to="/" className="flex items-center gap-3">
                            <img src="/logo.png" alt="وزارة التربية والتعليم" className="w-10 h-10 rounded-xl object-contain bg-background" />
                            <span className="text-xl font-bold">وزارة التربية والتعليم</span>
                        </Link>

                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" className="relative">
                                <Bell className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">2</span>
                            </Button>
                            <div className="flex items-center gap-3">
                                <img src={mockStudentData.avatar} alt="Avatar" className="w-10 h-10 rounded-full" />
                                <div className="hidden md:block">
                                    <p className="font-medium text-sm">{mockStudentData.name}</p>
                                    <p className="text-xs text-muted-foreground">{currentGrade?.name}</p>
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
                                        <img
                                            src={mockStudentData.avatar}
                                            alt="Avatar"
                                            className="w-24 h-24 rounded-2xl border-4 border-primary/20"
                                        />
                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                                            <Crown className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <h2 className="text-xl font-bold mb-1">{mockStudentData.name}</h2>
                                    <p className="text-sm text-muted-foreground mb-1">{currentGrade?.name}</p>
                                    <p className="text-xs text-muted-foreground mb-4">
                                        المرتبة #{mockStudentData.stats.rank} في الصف
                                    </p>
                                    <div className="flex items-center justify-center gap-2 text-sm">
                                        <Flame className="w-4 h-4 text-orange-500" />
                                        <span>سلسلة: {mockStudentData.stats.currentStreak} أيام</span>
                                    </div>
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-center">
                                        <Trophy className="w-5 h-5 mx-auto mb-1 text-primary" />
                                        <div className="text-lg font-bold">{mockStudentData.stats.totalPoints.toLocaleString()}</div>
                                        <div className="text-xs text-muted-foreground">نقطة</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 text-center">
                                        <Medal className="w-5 h-5 mx-auto mb-1 text-secondary" />
                                        <div className="text-lg font-bold">{mockStudentData.stats.badges}</div>
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
                                    <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2">
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
                                                    مرحباً، {mockStudentData.name.split(" ")[0]}! 👋
                                                </h1>
                                                <p className="text-white/80 mb-4">
                                                    استمر في التعلم والتفوق! لديك سلسلة {mockStudentData.stats.currentStreak} أيام متتالية.
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
                                                    <p className="text-2xl font-bold">{mockStudentData.stats.totalTopicsCompleted}</p>
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
                                                    <p className="text-2xl font-bold">{mockStudentData.stats.averageScore}%</p>
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
                                                    <p className="text-2xl font-bold">{mockStudentData.stats.totalStudyHours}</p>
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
                                                    <p className="text-2xl font-bold">{mockStudentData.stats.badges}</p>
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
                                                تقدمك في المواد
                                            </CardTitle>
                                            <Button variant="ghost" size="sm" onClick={() => setActiveTab("subjects")}>
                                                عرض الكل
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {mockSubjectProgress.map((subject) => (
                                                <div key={subject.subjectId} className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-2xl">{subject.icon}</span>
                                                            <div>
                                                                <p className="font-medium">{subject.name}</p>
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
                                                        value={(subject.completedTopics / subject.totalTopics) * 100}
                                                        className="h-2"
                                                        style={{
                                                            backgroundColor: `${subject.color}20`,
                                                        }}
                                                    />
                                                </div>
                                            ))}
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
                                                {mockRecentTopics.slice(0, 3).map((topic) => (
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
                                                ))}
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
                                                    {["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"].map((day, i) => (
                                                        <div key={day} className="flex items-center gap-3">
                                                            <span className="w-16 text-sm text-muted-foreground">{day}</span>
                                                            <Progress
                                                                value={i < 5 ? 70 + Math.random() * 30 : 0}
                                                                className="flex-1 h-2"
                                                            />
                                                            <span className="w-10 text-sm font-medium text-left">
                                                                {i < 5 ? `${Math.floor(70 + Math.random() * 30)}%` : "-"}
                                                            </span>
                                                        </div>
                                                    ))}
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
                                            <div className="flex flex-wrap gap-3">
                                                {mockBadges.filter(b => b.earned).slice(0, 5).map(badge => (
                                                    <div
                                                        key={badge.id}
                                                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
                                                    >
                                                        <span className="text-xl">{badge.icon}</span>
                                                        <span className="font-medium text-sm">{badge.name}</span>
                                                    </div>
                                                ))}
                                            </div>
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
                                        المواد الدراسية - {currentGrade?.name}
                                    </h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {currentGrade?.subjects.map((subject) => {
                                            const progress = mockSubjectProgress.find(s => s.subjectId === subject.id);
                                            return (
                                                <Link
                                                    key={subject.id}
                                                    to={`/grade/${currentGrade.id}/subject/${subject.id}`}
                                                >
                                                    <Card className="hover:shadow-lg transition-all group cursor-pointer h-full">
                                                        <CardContent className="p-6">
                                                            <div className="text-center mb-4">
                                                                <div
                                                                    className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4 text-4xl"
                                                                    style={{ backgroundColor: `${subject.color}20` }}
                                                                >
                                                                    {subject.icon}
                                                                </div>
                                                                <h3 className="text-xl font-bold mb-1">{subject.name}</h3>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {subject.topics.length} دروس
                                                                </p>
                                                            </div>

                                                            {progress && (
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center justify-between text-sm">
                                                                        <span>التقدم</span>
                                                                        <span className="font-bold" style={{ color: subject.color }}>
                                                                            {Math.round((progress.completedTopics / progress.totalTopics) * 100)}%
                                                                        </span>
                                                                    </div>
                                                                    <Progress
                                                                        value={(progress.completedTopics / progress.totalTopics) * 100}
                                                                        className="h-2"
                                                                    />
                                                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                                        <span>{progress.completedTopics} من {progress.totalTopics}</span>
                                                                        <span>متوسط: {progress.averageScore}%</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </CardContent>
                                                    </Card>
                                                </Link>
                                            );
                                        })}
                                    </div>
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
                                        <Button variant="outline" className="gap-2">
                                            <Download className="w-4 h-4" />
                                            تصدير
                                        </Button>
                                    </div>

                                    <div className="space-y-4">
                                        {mockRecentTopics.map((topic, i) => (
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

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {mockBadges.map((badge, i) => (
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
                                                    <Input defaultValue={mockStudentData.name} />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-2 block">البريد الإلكتروني</label>
                                                    <Input defaultValue={mockStudentData.email} />
                                                </div>
                                            </div>
                                            <Button>حفظ التغييرات</Button>
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

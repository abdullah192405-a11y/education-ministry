import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Trophy, Star, Target, Clock, Brain, Flame, Medal,
    BookOpen, History, Settings, User, LogOut, Bell,
    ChevronLeft, Play, Download, Share2, Calendar,
    TrendingUp, Award, Zap, Crown, CheckCircle, XCircle,
    BarChart3, PieChart, Activity
} from "lucide-react";

// Mock user data
const mockUserData = {
    id: "user-1",
    name: "اسم الطالب",
    email: "ahmed@example.com",
    avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=ahmed",
    joinedAt: "2024-01-01",
    stats: {
        totalChallenges: 47,
        averageScore: 78,
        totalPoints: 4520,
        longestStreak: 12,
        currentStreak: 5,
        rank: 156,
        badges: 8
    }
};

const mockChallengeHistory = [
    {
        id: 1,
        contentTitle: "كيف نحمي أنفسنا من الجراثيم",
        channelName: "القناة التعليمية",
        date: "2024-01-28",
        score: 85,
        maxScore: 100,
        correctAnswers: 6,
        totalQuestions: 7,
        timeTaken: 245,
        category: "activities",
        mode: "single"
    },
    {
        id: 2,
        contentTitle: "جدول الضرب بطريقة ممتعة",
        channelName: "القناة المدرسية",
        date: "2024-01-27",
        score: 92,
        maxScore: 100,
        correctAnswers: 3,
        totalQuestions: 3,
        timeTaken: 120,
        category: "games",
        mode: "group"
    },
    {
        id: 3,
        contentTitle: "إعادة التدوير في المنزل",
        channelName: "القناة الثقافية",
        date: "2024-01-26",
        score: 70,
        maxScore: 100,
        correctAnswers: 2,
        totalQuestions: 2,
        timeTaken: 80,
        category: "mixed",
        mode: "single"
    }
];

const mockBadges = [
    { id: "perfect", name: "مثالي", icon: "🏆", earned: true, description: "أجبت على جميع الأسئلة بشكل صحيح" },
    { id: "speed_demon", name: "البرق", icon: "⚡", earned: true, description: "أجبت خلال 3 ثواني على جميع الأسئلة" },
    { id: "streak_master", name: "متسلسل", icon: "🔥", earned: true, description: "حققت 5 إجابات صحيحة متتالية" },
    { id: "scholar", name: "العالِم", icon: "📚", earned: true, description: "حصلت على أكثر من 90%" },
    { id: "first_try", name: "المحاولة الأولى", icon: "🌟", earned: true, description: "أكملت التحدي من أول مرة" },
    { id: "quick_learner", name: "سريع التعلم", icon: "🧠", earned: true, description: "أكملت التحدي في أقل من دقيقتين" },
    { id: "persistent", name: "المثابر", icon: "💪", earned: true, description: "أعدت المحاولة 3 مرات" },
    { id: "improver", name: "المتطور", icon: "📈", earned: true, description: "تحسنت نتيجتك عن المحاولة السابقة" },
    { id: "champion", name: "البطل", icon: "👑", earned: false, description: "احتل المركز الأول في 10 تحديات" },
    { id: "social", name: "اجتماعي", icon: "👥", earned: false, description: "شارك في 20 تحدي جماعي" }
];

const mockFollowedChannels = [
    { id: 1, name: "القناة التعليمية", logo: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=200&h=200&fit=crop", category: "صحة" },
    { id: 2, name: "القناة المدرسية", logo: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200&h=200&fit=crop", category: "تعليم" },
    { id: 3, name: "القناة الثقافية", logo: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&h=200&fit=crop", category: "بيئة" }
];

const UserDashboard = () => {
    const [activeTab, setActiveTab] = useState("overview");

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
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">3</span>
                            </Button>
                            <div className="flex items-center gap-3">
                                <img src={mockUserData.avatar} alt="Avatar" className="w-10 h-10 rounded-full" />
                                <div className="hidden md:block">
                                    <p className="font-medium text-sm">{mockUserData.name}</p>
                                    <p className="text-xs text-muted-foreground">المستوى: متقدم</p>
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
                                {/* User Profile Summary */}
                                <div className="text-center mb-6">
                                    <div className="relative inline-block mb-4">
                                        <img
                                            src={mockUserData.avatar}
                                            alt="Avatar"
                                            className="w-24 h-24 rounded-2xl border-4 border-primary/20"
                                        />
                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                                            <Crown className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <h2 className="text-xl font-bold mb-1">{mockUserData.name}</h2>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        المرتبة #{mockUserData.stats.rank} عالمياً
                                    </p>
                                    <div className="flex items-center justify-center gap-2 text-sm">
                                        <Flame className="w-4 h-4 text-orange-500" />
                                        <span>سلسلة: {mockUserData.stats.currentStreak} أيام</span>
                                    </div>
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 text-center">
                                        <Trophy className="w-5 h-5 mx-auto mb-1 text-primary" />
                                        <div className="text-lg font-bold">{mockUserData.stats.totalPoints.toLocaleString()}</div>
                                        <div className="text-xs text-muted-foreground">نقطة</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 text-center">
                                        <Medal className="w-5 h-5 mx-auto mb-1 text-secondary" />
                                        <div className="text-lg font-bold">{mockUserData.stats.badges}</div>
                                        <div className="text-xs text-muted-foreground">شارة</div>
                                    </div>
                                </div>

                                {/* Navigation */}
                                <nav className="space-y-2">
                                    {[
                                        { id: "overview", icon: BarChart3, label: "نظرة عامة" },
                                        { id: "history", icon: History, label: "سجل التحديات" },
                                        { id: "badges", icon: Award, label: "الشارات" },
                                        { id: "channels", icon: BookOpen, label: "القنوات المتابعة" },
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
                                                    مرحباً، {mockUserData.name.split(" ")[0]}! 👋
                                                </h1>
                                                <p className="text-white/80 mb-4">
                                                    استمر في التعلم والمنافسة. لديك سلسلة {mockUserData.stats.currentStreak} أيام!
                                                </p>
                                                <Button variant="secondary" size="lg" asChild className="gap-2">
                                                    <Link to="/channels">
                                                        <Play className="w-5 h-5" />
                                                        ابدأ تحدي جديد
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
                                                    <Target className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold">{mockUserData.stats.totalChallenges}</p>
                                                    <p className="text-sm text-muted-foreground">تحدي مكتمل</p>
                                                </div>
                                            </div>
                                        </Card>
                                        <Card className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                                                    <TrendingUp className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold">{mockUserData.stats.averageScore}%</p>
                                                    <p className="text-sm text-muted-foreground">متوسط النتائج</p>
                                                </div>
                                            </div>
                                        </Card>
                                        <Card className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                                    <Flame className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold">{mockUserData.stats.longestStreak}</p>
                                                    <p className="text-sm text-muted-foreground">أطول سلسلة</p>
                                                </div>
                                            </div>
                                        </Card>
                                        <Card className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                                    <Award className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold">{mockUserData.stats.badges}</p>
                                                    <p className="text-sm text-muted-foreground">شارة محققة</p>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>

                                    {/* Recent Activity & Performance */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Recent Challenges */}
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between py-4">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <History className="w-5 h-5 text-primary" />
                                                    آخر التحديات
                                                </CardTitle>
                                                <Button variant="ghost" size="sm" onClick={() => setActiveTab("history")}>
                                                    عرض الكل
                                                </Button>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {mockChallengeHistory.slice(0, 3).map((challenge, i) => (
                                                    <div
                                                        key={challenge.id}
                                                        className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                                                    >
                                                        <div className="flex-1">
                                                            <p className="font-medium text-sm line-clamp-1">{challenge.contentTitle}</p>
                                                            <p className="text-xs text-muted-foreground">{challenge.channelName}</p>
                                                        </div>
                                                        <div className="text-left">
                                                            <p className={`font-bold ${challenge.score >= 80 ? "text-success" : challenge.score >= 60 ? "text-warning" : "text-destructive"}`}>
                                                                {challenge.score}%
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">{challenge.date}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>

                                        {/* Performance Chart Placeholder */}
                                        <Card>
                                            <CardHeader className="py-4">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Activity className="w-5 h-5 text-primary" />
                                                    أداؤك هذا الأسبوع
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    {["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"].map((day, i) => (
                                                        <div key={day} className="flex items-center gap-3">
                                                            <span className="w-16 text-sm text-muted-foreground">{day}</span>
                                                            <Progress value={60 + Math.random() * 40} className="flex-1 h-3" />
                                                            <span className="w-10 text-sm font-medium text-left">{Math.floor(60 + Math.random() * 40)}%</span>
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
                                            سجل التحديات
                                        </h2>
                                        <Button variant="outline" className="gap-2">
                                            <Download className="w-4 h-4" />
                                            تصدير
                                        </Button>
                                    </div>

                                    <div className="space-y-4">
                                        {mockChallengeHistory.map((challenge, i) => (
                                            <motion.div
                                                key={challenge.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                            >
                                                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                                                    <CardContent className="p-0">
                                                        <div className="flex flex-col md:flex-row">
                                                            {/* Score Indicator */}
                                                            <div className={`w-full md:w-2 ${challenge.score >= 80 ? "bg-success" :
                                                                challenge.score >= 60 ? "bg-warning" : "bg-destructive"
                                                                }`} />

                                                            <div className="flex-1 p-5">
                                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${challenge.mode === "single" ? "bg-blue-500/10 text-blue-600" : "bg-purple-500/10 text-purple-600"
                                                                                }`}>
                                                                                {challenge.mode === "single" ? "فردي" : "جماعي"}
                                                                            </span>
                                                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
                                                                                {challenge.category === "activities" ? "أنشطة" : challenge.category === "games" ? "ألعاب" : "مختلط"}
                                                                            </span>
                                                                        </div>
                                                                        <h3 className="text-lg font-bold mb-1">{challenge.contentTitle}</h3>
                                                                        <p className="text-sm text-muted-foreground">{challenge.channelName}</p>
                                                                    </div>

                                                                    <div className="flex items-center gap-6">
                                                                        <div className="text-center">
                                                                            <p className={`text-2xl font-bold ${challenge.score >= 80 ? "text-success" :
                                                                                challenge.score >= 60 ? "text-warning" : "text-destructive"
                                                                                }`}>
                                                                                {challenge.score}%
                                                                            </p>
                                                                            <p className="text-xs text-muted-foreground">النتيجة</p>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <p className="text-lg font-bold">
                                                                                {challenge.correctAnswers}/{challenge.totalQuestions}
                                                                            </p>
                                                                            <p className="text-xs text-muted-foreground">إجابات صحيحة</p>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <p className="text-lg font-bold flex items-center gap-1">
                                                                                <Clock className="w-4 h-4" />
                                                                                {Math.floor(challenge.timeTaken / 60)}:{(challenge.timeTaken % 60).toString().padStart(2, "0")}
                                                                            </p>
                                                                            <p className="text-xs text-muted-foreground">الوقت</p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                                        <Calendar className="w-4 h-4" />
                                                                        {challenge.date}
                                                                    </p>
                                                                    <div className="flex gap-2">
                                                                        <Button variant="ghost" size="sm" className="gap-1">
                                                                            <Share2 className="w-4 h-4" />
                                                                            مشاركة
                                                                        </Button>
                                                                        <Button variant="outline" size="sm" className="gap-1">
                                                                            <Play className="w-4 h-4" />
                                                                            إعادة
                                                                        </Button>
                                                                    </div>
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

                            {/* Followed Channels Tab */}
                            {activeTab === "channels" && (
                                <motion.div
                                    key="channels"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold flex items-center gap-2">
                                            <BookOpen className="w-6 h-6 text-primary" />
                                            القنوات المتابعة
                                        </h2>
                                        <Button asChild>
                                            <Link to="/channels">استكشف المزيد</Link>
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {mockFollowedChannels.map((channel, i) => (
                                            <motion.div
                                                key={channel.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                            >
                                                <Link to={`/channel/${channel.id}`}>
                                                    <Card className="hover:shadow-lg transition-all group cursor-pointer">
                                                        <CardContent className="p-5">
                                                            <div className="flex items-center gap-4">
                                                                <img
                                                                    src={channel.logo}
                                                                    alt={channel.name}
                                                                    className="w-16 h-16 rounded-xl object-cover group-hover:scale-105 transition-transform"
                                                                />
                                                                <div>
                                                                    <h3 className="font-bold group-hover:text-primary transition-colors">{channel.name}</h3>
                                                                    <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium">{channel.category}</span>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </Link>
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
                                                    <Input defaultValue={mockUserData.name} />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-2 block">البريد الإلكتروني</label>
                                                    <Input defaultValue={mockUserData.email} />
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
                                                "إشعارات التحديات الجديدة",
                                                "إشعارات الشارات المحققة",
                                                "تذكيرات السلسلة اليومية",
                                                "أخبار القنوات المتابعة"
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

export default UserDashboard;

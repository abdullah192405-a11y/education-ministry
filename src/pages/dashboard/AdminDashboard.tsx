import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, PieChart as RePieChart, Pie, Cell,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    LineChart, Line
} from 'recharts';
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
    Trophy, Star, Target, Clock, Brain, Flame, Medal,
    BookOpen, History, Settings, User, LogOut, Bell,
    ChevronLeft, Play, Download, Share2, Calendar,
    TrendingUp, TrendingDown, Award, Zap, Crown, CheckCircle, XCircle,
    BarChart3, PieChart, Activity, Plus, Edit, Trash2,
    Users, Eye, Video, Image, FileText, Send, Copy,
    Gamepad2, LayoutDashboard, Library, ChartBar, Cog,
    ExternalLink, Upload, Sparkles, ListChecks, Shield,
    Building2, GraduationCap, Landmark, Briefcase,
    AlertTriangle, Ban, Check, Search, Filter, MoreVertical,
    Globe, Mail, Phone, UserCog, ShieldCheck, Database,
    Server, RefreshCw, Lock, Unlock, FileWarning,
    CreditCard, Rocket, Gem, Wallet, Banknote, CalendarDays
} from "lucide-react";

// Mock Platform Stats
const mockPlatformStats = {
    totalUsers: 45280,
    totalChannels: 523,
    totalChallenges: 128450,
    totalContents: 3842,
    activeUsers: 8540,
    newUsersToday: 156,
    newChannelsToday: 4,
    challengesToday: 2340,
    revenue: 125000,
    conversionRate: "2.4%",
    avgSessionTime: "12m 45s",
    retentionRate: "68%"
};

// Analytics Data
const engagementData = [
    { name: 'السبت', users: 4500, challenges: 12000, active: 3200 },
    { name: 'الأحد', users: 5200, challenges: 15000, active: 3800 },
    { name: 'الاثنين', users: 4800, challenges: 13000, active: 3500 },
    { name: 'الثلاثاء', users: 6100, challenges: 18000, active: 4200 },
    { name: 'الأربعاء', users: 5900, challenges: 17500, active: 4000 },
    { name: 'الخميس', users: 7500, challenges: 22000, active: 5500 },
    { name: 'الجمعة', users: 8200, challenges: 25000, active: 6200 },
];

const categoryPerformance = [
    { subject: 'ثقافة عامة', A: 120, B: 110, fullMark: 150 },
    { subject: 'علوم', A: 98, B: 130, fullMark: 150 },
    { subject: 'تاريخ', A: 86, B: 130, fullMark: 150 },
    { subject: 'رياضة', A: 99, B: 100, fullMark: 150 },
    { subject: 'ترفيه', A: 85, B: 90, fullMark: 150 },
    { subject: 'تقنية', A: 65, B: 85, fullMark: 150 },
];

const deviceData = [
    { name: 'iPhone', value: 45 },
    { name: 'Android', value: 35 },
    { name: 'Web', value: 15 },
    { name: 'Tablet', value: 5 },
];

const COLORS = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981'];

// Mock Users Data
const mockUsers = [
    { id: 1, name: "طالب 1", email: "student1@example.com", role: "user", status: "active", challenges: 47, joinDate: "2024-01-01", avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=student1", lastActive: "منذ دقيقتين" },
    { id: 2, name: "طالب 2", email: "student2@example.com", role: "user", status: "active", challenges: 89, joinDate: "2024-01-05", avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=student2", lastActive: "منذ 15 دقيقة" },
    { id: 3, name: "مالك قناة", email: "channel_owner", status: "active", challenges: 156, joinDate: "2023-12-20", avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=owner", lastActive: "نشط الآن" },
    { id: 4, name: "طالب 3", email: "student3@example.com", role: "user", status: "suspended", challenges: 12, joinDate: "2024-01-15", avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=student3", lastActive: "منذ يومين" },
    { id: 5, name: "مدير النظام", email: "admin@example.com", role: "admin", status: "active", challenges: 234, joinDate: "2023-11-10", avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=admin", lastActive: "نشط الآن" }
];

// Mock Channels Data
const mockChannels = [
    { id: 1, name: "القناة الرسمية", type: "ministry", status: "verified", followers: 125000, contents: 3, owner: "الإدارة", createdAt: "2023-06-15", logo: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=200", engagement: "92%", plan: "enterprise", contentLimit: "∞", monthIncome: 999 },
    { id: 2, name: "قناة المدرسة", type: "school", status: "verified", followers: 5600, contents: 2, owner: "إدارة المدرسة", createdAt: "2023-08-20", logo: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200", engagement: "85%", plan: "pro", contentLimit: 20, monthIncome: 299 },
    { id: 3, name: "القناة العلمية", type: "organization", status: "verified", followers: 34000, contents: 2, owner: "الجمعية العلمية", createdAt: "2023-09-10", logo: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200", engagement: "78%", plan: "pro", contentLimit: 20, monthIncome: 299 },
    { id: 4, name: "قناة التقنية", type: "organization", status: "pending", followers: 89000, contents: 1, owner: "الهيئة التقنية", createdAt: "2024-01-10", logo: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=200", engagement: "0%", plan: "free", contentLimit: 3, monthIncome: 0 },
    { id: 5, name: "أكاديمية المعرفة", type: "company", status: "verified", followers: 28000, contents: 1, owner: "شركة المعرفة", createdAt: "2023-12-01", logo: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=200", engagement: "64%", plan: "pro", contentLimit: 20, monthIncome: 299 }
];

// Mock Reports
const mockReports = [
    { id: 1, type: "content", target: "محتوى مخالف", reporter: "طالب 2", reason: "محتوى غير لائق", status: "pending", date: "2024-01-28", priority: "high" },
    { id: 2, type: "user", target: "حساب مشبوه", reporter: "مالك قناة", reason: "سلوك مسيء", status: "resolved", date: "2024-01-27", priority: "medium" },
    { id: 3, type: "channel", target: "قناة مخالفة", reporter: "طالب 1", reason: "انتحال صفة", status: "under_review", date: "2024-01-26", priority: "high" }
];

// Mock SaaS Plans
const mockPlans = [
    { id: "free", name: "المجاني", icon: Rocket, price: 0, limits: { challenges: 3, verified: false, analytics: "basic" }, color: "blue", activeChannels: 450 },
    { id: "pro", name: "الاحترافي", icon: Target, price: 299, limits: { challenges: 20, verified: true, analytics: "advanced" }, color: "purple", activeChannels: 65 },
    { id: "enterprise", name: "المؤسسات", icon: Gem, price: 999, limits: { challenges: "∞", verified: true, analytics: "unlimited" }, color: "amber", activeChannels: 8 }
];

// Mock Subscription Revenue
const revenueData = [
    { month: 'يناير', mrr: 12400, usage: 8900 },
    { month: 'فبراير', mrr: 15600, usage: 10200 },
    { month: 'مارس', mrr: 14200, usage: 11500 },
    { month: 'أبريل', mrr: 18900, usage: 12800 },
    { month: 'مايو', mrr: 21500, usage: 14000 },
    { month: 'يونيو', mrr: 25800, usage: 16500 },
];

// Mock System Logs
const mockSystemLogs = [
    { id: 1, action: "تسجيل دخول مسؤول", user: "مدير النظام", ip: "192.168.1.1", time: "منذ 5 دقائق", type: "info" },
    { id: 2, action: "إنشاء قناة جديدة", user: "مالك قناة", ip: "192.168.1.25", time: "منذ 30 دقيقة", type: "success" },
    { id: 3, action: "محاولة تسجيل دخول فاشلة", user: "unknown", ip: "192.168.1.100", time: "منذ ساعة", type: "warning" },
    { id: 4, action: "تعليق حساب", user: "Admin", ip: "192.168.1.1", time: "منذ 2 ساعة", type: "danger" }
];


const getChannelTypeIcon = (type: string) => {
    switch (type) {
        case "ministry": return <Landmark className="w-4 h-4" />;
        case "school": return <GraduationCap className="w-4 h-4" />;
        case "organization": return <Building2 className="w-4 h-4" />;
        case "company": return <Briefcase className="w-4 h-4" />;
        default: return <User className="w-4 h-4" />;
    }
};

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState("overview");
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = () => {
        setIsExporting(true);
        setTimeout(() => setIsExporting(false), 2000);
    };
    const [searchTerm, setSearchTerm] = useState("");
    const [userFilter, setUserFilter] = useState("all");
    const [channelFilter, setChannelFilter] = useState("all");

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
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                                <Shield className="w-4 h-4 text-purple-500" />
                                <span className="text-sm font-medium text-purple-600">مدير النظام</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative hidden md:block">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="بحث سريع..."
                                    className="w-64 pr-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="ghost" size="icon" className="relative">
                                <Bell className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">8</span>
                            </Button>
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                                    <Shield className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                    {/* Sidebar */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-1"
                    >
                        <Card className="sticky top-24">
                            <CardContent className="p-4">
                                <div className="text-center mb-4 pb-4 border-b">
                                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-3">
                                        <Shield className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="font-bold">لوحة الإدارة</h2>
                                    <p className="text-xs text-muted-foreground">صلاحيات كاملة</p>
                                </div>

                                {/* Navigation */}
                                <nav className="space-y-1">
                                    {[
                                        { id: "overview", icon: LayoutDashboard, label: "نظرة عامة" },
                                        { id: "users", icon: Users, label: "المستخدمين" },
                                        { id: "channels", icon: Library, label: "القنوات" },
                                        { id: "reports", icon: AlertTriangle, label: "البلاغات" },
                                        { id: "analytics", icon: ChartBar, label: "الإحصائيات" },
                                        { id: "saas", icon: Wallet, label: "الاشتراكات والدخل" },
                                        { id: "challenges_analysis", icon: Target, label: "تحليل التحديات" },
                                        { id: "logs", icon: Database, label: "سجل النظام" },
                                        { id: "settings", icon: Cog, label: "الإعدادات" }
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => setActiveTab(item.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${activeTab === item.id
                                                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                                                : "hover:bg-muted"
                                                }`}
                                        >
                                            <item.icon className="w-4 h-4" />
                                            <span>{item.label}</span>
                                            {item.id === "reports" && (
                                                <span className="mr-auto px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs">3</span>
                                            )}
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
                        className="lg:col-span-5 space-y-6"
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
                                    {/* Welcome & Platform Health */}
                                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                        <Card className="lg:col-span-3 overflow-hidden border-none shadow-xl bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 relative">
                                            <div className="relative z-10 p-8">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold border border-white/30 flex items-center gap-2">
                                                        <Activity className="w-3 h-3 animate-pulse text-green-400" />
                                                        المنصة تعمل بكفاءة عالية
                                                    </div>
                                                </div>
                                                <h1 className="text-3xl font-bold text-white mb-2">
                                                    أهلاً بك مجدداً، مدير النظام 🛡️
                                                </h1>
                                                <p className="text-white/80 max-w-lg">
                                                    هناك 3 قنوات بانتظار التوثيق و 8 بلاغات جديدة تتطلب مراجعتك. المنصة تشهد نمواً بنسبة 12% في النشاط اليومي.
                                                </p>
                                                <div className="mt-6 flex gap-3">
                                                    <Button variant="secondary" className="bg-white text-purple-600 hover:bg-white/90">مراجعة البلاغات</Button>
                                                    <Button variant="ghost" className="text-white hover:bg-white/10 border border-white/20">تصدير تقرير اليوم</Button>
                                                </div>
                                            </div>
                                            <div className="absolute left-0 top-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                                            <div className="absolute right-20 bottom-0 w-48 h-48 bg-pink-300/20 rounded-full blur-2xl" />
                                            <Shield className="absolute left-10 top-1/2 -translate-y-1/2 w-32 h-32 text-white/10 -rotate-12" />
                                        </Card>

                                        <Card className="border-none shadow-md p-6 flex flex-col justify-between bg-gradient-to-br from-background to-muted/50">
                                            <div>
                                                <h3 className="font-bold mb-2">حالة النظام</h3>
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                                                            <Server className="w-4 h-4" /> الخادم
                                                        </span>
                                                        <span className="text-xs font-bold text-success flex items-center gap-1">
                                                            99.9% <Sparkles className="w-3 h-3" />
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                                                            <Database className="w-4 h-4" /> القاعدة
                                                        </span>
                                                        <span className="text-xs font-bold text-success">مستقر</span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                                                            <Zap className="w-4 h-4" /> الاستجابة
                                                        </span>
                                                        <span className="text-xs font-bold text-success">120ms</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button variant="outline" size="sm" className="w-full mt-4">مركز الدعم</Button>
                                        </Card>
                                    </div>

                                    {/* Platform Pulse Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        {[
                                            { label: "إجمالي المستخدمين", value: "45.2K", icon: Users, color: "blue", trend: "+12%" },
                                            { label: "القنوات الموثقة", value: "382", icon: Library, color: "emerald", trend: "+4" },
                                            { label: "التحديات (اليوم)", value: "2.3K", icon: Gamepad2, color: "amber", trend: "+15%" },
                                            { label: "النشطين الآن", value: "8,540", icon: Activity, color: "purple", trend: "↑ 22%" }
                                        ].map((stat, i) => (
                                            <Card key={i} className="group hover:border-primary/50 transition-all duration-300">
                                                <CardContent className="p-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className={`w-10 h-10 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-500 group-hover:scale-110 transition-transform`}>
                                                            <stat.icon className="w-5 h-5" />
                                                        </div>
                                                        <span className={`text-xs font-bold py-1 px-2 rounded-full bg-${stat.trend.includes('-') ? 'destructive' : 'success'}/10 text-${stat.trend.includes('-') ? 'destructive' : 'success'}`}>
                                                            {stat.trend}
                                                        </span>
                                                    </div>
                                                    <div className="mt-4">
                                                        <h3 className="text-2xl font-bold">{stat.value}</h3>
                                                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>

                                    {/* Real-time Platform Pulse & Quick Actions */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Live Activity Pulse */}
                                        <Card className="border-none shadow-md">
                                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
                                                    نبض المنصة المباشر
                                                </CardTitle>
                                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                    تحديث تلقائي <RefreshCw className="w-3 h-3 animate-spin duration-[4s]" />
                                                </span>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {[
                                                    { user: "طالب مميز", action: "أكمل تحدي 'أساسيات البرمجة'", time: "الآن", score: "+450", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=student1" },
                                                    { user: "طالبة مجتهدة", action: "أنشأت تحدي مجموعة جديد", time: "منذ دقيقتين", score: "G23", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=student2" },
                                                    { user: "قناة العلوم", action: "نشرت محتوى مرئي جديد", time: "منذ 5 دقائق", score: "NEW", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=channel" },
                                                    { user: "طالب مثابر", action: "وصل للمستوى الخبير", time: "منذ 8 دقائق", score: "LEV10", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=student3" },
                                                ].map((activity, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors">
                                                        <img src={activity.avatar} className="w-10 h-10 rounded-full bg-muted shadow-sm" alt="" />
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold">{activity.user}</p>
                                                            <p className="text-xs text-muted-foreground">{activity.action}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs font-bold text-primary">{activity.score}</p>
                                                            <p className="text-[10px] text-muted-foreground">{activity.time}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>

                                        {/* Actionable Insights */}
                                        <div className="space-y-6">
                                            <Card className="border-none shadow-md overflow-hidden">
                                                <CardHeader className="bg-warning/10 border-b border-warning/20">
                                                    <CardTitle className="text-sm flex items-center gap-2 text-warning">
                                                        <AlertTriangle className="w-4 h-4" />
                                                        تحتاج لاهتمامك اليوم
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-0">
                                                    {[
                                                        { label: "بلاغات محتوى عالية الخطورة", count: 3, action: "مراجعة", color: "destructive" },
                                                        { label: "طلبات توثيق قنوات", count: 5, action: "فحص", color: "primary" },
                                                        { label: "تنبيهات أمان النظام", count: 12, action: "تفاصيل", color: "warning" }
                                                    ].map((item, i) => (
                                                        <div key={i} className="flex items-center justify-between p-4 border-b last:border-0">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-2 h-2 rounded-full bg-${item.color}`} />
                                                                <span className="text-sm font-medium">{item.label}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-sm font-bold">{item.count}</span>
                                                                <Button size="sm" variant="ghost" className="h-8 text-primary hover:bg-primary/5">
                                                                    {item.action}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </CardContent>
                                            </Card>

                                            <div className="grid grid-cols-2 gap-4">
                                                <button className="p-4 rounded-2xl bg-primary/5 hover:bg-primary/10 border border-primary/20 transition-all group flex flex-col items-center gap-2">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20">
                                                        <Plus className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <span className="text-xs font-bold">إضافة مسؤول</span>
                                                </button>
                                                <button className="p-4 rounded-2xl bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/20 transition-all group flex flex-col items-center gap-2">
                                                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20">
                                                        <ExternalLink className="w-5 h-5 text-purple-500" />
                                                    </div>
                                                    <span className="text-xs font-bold">إعلان عام</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Leaderboards for Admin */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Best Channels */}
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between py-4">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Award className="w-5 h-5 text-amber-500" />
                                                    أفضل القنوات أداءً
                                                </CardTitle>
                                                <Button variant="ghost" size="sm" onClick={() => setActiveTab("channels")}>
                                                    عرض الكل
                                                </Button>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {mockChannels.slice(0, 3).map((channel, i) => (
                                                    <div key={channel.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-transparent hover:border-primary/20 transition-all">
                                                        <div className="relative">
                                                            <img src={channel.logo} alt={channel.name} className="w-10 h-10 rounded-lg object-cover" />
                                                            {i === 0 && <Crown className="absolute -top-2 -right-2 w-4 h-4 text-amber-500 fill-amber-500 rotate-12" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-bold text-sm flex items-center gap-1">
                                                                {channel.name}
                                                                {channel.status === "verified" && <CheckCircle className="w-3 h-3 text-primary" />}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">{channel.followers.toLocaleString()} متابع • {channel.engagement} تفاعل</p>
                                                        </div>
                                                        <TrendingUp className="w-4 h-4 text-success" />
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>

                                        {/* MVP Users */}
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between py-4">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Star className="w-5 h-5 text-purple-500" />
                                                    المستخدمين الأكثر تميزاً
                                                </CardTitle>
                                                <Button variant="ghost" size="sm" onClick={() => setActiveTab("users")}>
                                                    عرض الكل
                                                </Button>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {mockUsers.sort((a, b) => b.challenges - a.challenges).slice(0, 3).map((user, i) => (
                                                    <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-transparent hover:border-purple-500/20 transition-all">
                                                        <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full ring-2 ring-purple-500/20" />
                                                        <div className="flex-1">
                                                            <p className="font-bold text-sm">{user.name}</p>
                                                            <p className="text-xs text-muted-foreground">{user.challenges} تحدي • {user.lastActive}</p>
                                                        </div>
                                                        <Medal className={`w-5 h-5 ${i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : "text-amber-700"}`} />
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>
                                    </div>
                                </motion.div>
                            )}


                            {/* Users Tab */}
                            {activeTab === "users" && (
                                <motion.div
                                    key="users"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <h2 className="text-2xl font-bold flex items-center gap-2">
                                            <Users className="w-6 h-6 text-primary" />
                                            إدارة المستخدمين
                                        </h2>
                                        <div className="flex gap-2">
                                            <div className="relative">
                                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                <Input placeholder="بحث عن مستخدم..." className="w-64 pr-10" />
                                            </div>
                                            <select
                                                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={userFilter}
                                                onChange={(e) => setUserFilter(e.target.value)}
                                            >
                                                <option value="all">جميع الأدوار</option>
                                                <option value="admin">مديرين</option>
                                                <option value="channel_owner">ملاك قنوات</option>
                                                <option value="user">مستخدمين</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Users List */}
                                    <Card>
                                        <CardContent className="p-0">
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead className="border-b bg-muted/50">
                                                        <tr>
                                                            <th className="text-right p-4 font-medium text-sm">المستخدم</th>
                                                            <th className="text-right p-4 font-medium text-sm">البريد</th>
                                                            <th className="text-right p-4 font-medium text-sm">الدور</th>
                                                            <th className="text-right p-4 font-medium text-sm">الحالة</th>
                                                            <th className="text-right p-4 font-medium text-sm">التحديات</th>
                                                            <th className="text-right p-4 font-medium text-sm">تاريخ الانضمام</th>
                                                            <th className="text-right p-4 font-medium text-sm">إجراءات</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {mockUsers.map(user => (
                                                            <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                                                                        <span className="font-medium">{user.name}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-sm text-muted-foreground">{user.email}</td>
                                                                <td className="p-4">
                                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === "admin" ? "bg-purple-500/10 text-purple-600" :
                                                                        user.role === "channel_owner" ? "bg-secondary/10 text-secondary" : "bg-muted"
                                                                        }`}>
                                                                        {user.role === "admin" ? "مدير" : user.role === "channel_owner" ? "مالك قناة" : "مستخدم"}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4">
                                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                                                                        }`}>
                                                                        {user.status === "active" ? "نشط" : "موقوف"}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4 font-medium">{user.challenges}</td>
                                                                <td className="p-4 text-sm text-muted-foreground">{user.joinDate}</td>
                                                                <td className="p-4">
                                                                    <div className="flex gap-1">
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                            <Edit className="w-4 h-4" />
                                                                        </Button>
                                                                        {user.status === "active" ? (
                                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                                                                <Ban className="w-4 h-4" />
                                                                            </Button>
                                                                        ) : (
                                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-success hover:text-success">
                                                                                <Unlock className="w-4 h-4" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {/* Channels Tab */}
                            {activeTab === "channels" && (
                                <motion.div
                                    key="channels"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <h2 className="text-2xl font-bold flex items-center gap-2">
                                            <Library className="w-6 h-6 text-primary" />
                                            إدارة القنوات (SaaS)
                                        </h2>
                                        <div className="flex gap-2">
                                            <select
                                                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={channelFilter}
                                                onChange={(e) => setChannelFilter(e.target.value)}
                                            >
                                                <option value="all">جميع الحالات</option>
                                                <option value="verified">موثقة</option>
                                                <option value="pending">بانتظار التوثيق</option>
                                                <option value="pro">خطة احترافية</option>
                                                <option value="free">خطة مجانية</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Channels Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {mockChannels.map((channel, i) => (
                                            <motion.div
                                                key={channel.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                            >
                                                <Card className="overflow-hidden hover:shadow-lg transition-shadow border-none shadow-md">
                                                    <CardContent className="p-0">
                                                        <div className="flex">
                                                            <div className="w-32 h-32 flex-shrink-0 relative">
                                                                <img src={channel.logo} alt={channel.name} className="w-full h-full object-cover" />
                                                                <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold text-white ${channel.plan === "enterprise" ? "bg-amber-500" :
                                                                    channel.plan === "pro" ? "bg-purple-500" : "bg-blue-500"
                                                                    }`}>
                                                                    {channel.plan === "enterprise" ? "Enterprise" : channel.plan === "pro" ? "Pro" : "Free"}
                                                                </div>
                                                            </div>
                                                            <div className="flex-1 p-4">
                                                                <div className="flex items-start justify-between">
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <h3 className="font-bold text-base">{channel.name}</h3>
                                                                            {channel.status === "verified" && (
                                                                                <CheckCircle className="w-4 h-4 text-primary fill-primary/20" />
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                                                                            {getChannelTypeIcon(channel.type)}
                                                                            <span>{channel.owner}</span>
                                                                        </div>

                                                                        {/* Plan Limits & Income */}
                                                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                                                            <div className="space-y-1">
                                                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">سعة المحتوى</p>
                                                                                <div className="flex items-center gap-2">
                                                                                    <Progress value={(channel.contents / (typeof channel.contentLimit === 'number' ? channel.contentLimit : 100)) * 100} className="h-1 flex-1" />
                                                                                    <span className="text-[10px] font-bold">{channel.contents}/{channel.contentLimit}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">الدخل الشهري</p>
                                                                                <p className="text-xs font-bold text-emerald-600">${channel.monthIncome}</p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                                                            <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
                                                                                <Users className="w-3 h-3" />
                                                                                {channel.followers.toLocaleString()}
                                                                            </span>
                                                                            <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full">
                                                                                <TrendingUp className="w-3 h-3 text-success" />
                                                                                {channel.engagement} تفاعل
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col gap-2">
                                                                        <Button variant="outline" size="sm" className="h-8 text-[10px] gap-1 px-2">
                                                                            <Gem className="w-3 h-3" />
                                                                            ترقية
                                                                        </Button>
                                                                        <div className="flex gap-1 justify-end">
                                                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10">
                                                                                <Edit className="w-4 h-4" />
                                                                            </Button>
                                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </Button>
                                                                        </div>
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

                            {/* Reports Tab */}
                            {activeTab === "reports" && (
                                <motion.div
                                    key="reports"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    <h2 className="text-2xl font-bold flex items-center gap-2">
                                        <AlertTriangle className="w-6 h-6 text-warning" />
                                        البلاغات والمخالفات
                                    </h2>

                                    <div className="space-y-4">
                                        {mockReports.map((report, i) => (
                                            <motion.div
                                                key={report.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                            >
                                                <Card className={`border-r-4 ${report.status === "pending" ? "border-r-destructive" :
                                                    report.status === "under_review" ? "border-r-warning" : "border-r-success"
                                                    }`}>
                                                    <CardContent className="p-5">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${report.type === "content" ? "bg-blue-500/10 text-blue-600" :
                                                                        report.type === "user" ? "bg-purple-500/10 text-purple-600" : "bg-amber-500/10 text-amber-600"
                                                                        }`}>
                                                                        {report.type === "content" ? "محتوى" : report.type === "user" ? "مستخدم" : "قناة"}
                                                                    </span>
                                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${report.status === "pending" ? "bg-destructive/10 text-destructive" :
                                                                        report.status === "under_review" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                                                                        }`}>
                                                                        {report.status === "pending" ? "جديد" : report.status === "under_review" ? "قيد المراجعة" : "تم الحل"}
                                                                    </span>
                                                                </div>
                                                                <h3 className="font-bold mb-1">{report.target}</h3>
                                                                <p className="text-sm text-muted-foreground mb-2">السبب: {report.reason}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    أبلغ بواسطة: {report.reporter} • {report.date}
                                                                </p>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button variant="outline" size="sm">عرض التفاصيل</Button>
                                                                {report.status === "pending" && (
                                                                    <>
                                                                        <Button variant="destructive" size="sm">حظر</Button>
                                                                        <Button variant="ghost" size="sm">تجاهل</Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Analytics Tab */}
                            {activeTab === "analytics" && (
                                <motion.div
                                    key="analytics"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold flex items-center gap-2">
                                            <ChartBar className="w-6 h-6 text-primary" />
                                            التحليل المتقدم للمنصة
                                        </h2>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm">آخر 7 أيام</Button>
                                            <Button variant="outline" size="sm">آخر 30 يوم</Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="gap-2"
                                                onClick={handleExport}
                                                disabled={isExporting}
                                            >
                                                <Download className={`w-4 h-4 ${isExporting ? "animate-bounce" : ""}`} />
                                                {isExporting ? "جاري التصدير..." : "تصدير البيانات"}
                                            </Button>
                                        </div>
                                    </div>

                                    {/* High Level Stats */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <Card className="p-4 relative overflow-hidden group border-none bg-gradient-to-br from-primary/10 to-transparent">
                                            <p className="text-sm text-muted-foreground mb-1">نسبة الاحتفاظ</p>
                                            <h3 className="text-2xl font-bold text-primary">{mockPlatformStats.retentionRate}</h3>
                                            <p className="text-xs text-success flex items-center gap-1 mt-1">
                                                <TrendingUp className="w-3 h-3" />
                                                +4.2% عن الشهر الماضي
                                            </p>
                                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                                                <Target className="w-20 h-20" />
                                            </div>
                                        </Card>
                                        <Card className="p-4 relative overflow-hidden group border-none bg-gradient-to-br from-purple-500/10 to-transparent">
                                            <p className="text-sm text-muted-foreground mb-1">متوسط وقت الجلسة</p>
                                            <h3 className="text-2xl font-bold text-purple-600">{mockPlatformStats.avgSessionTime}</h3>
                                            <p className="text-xs text-success flex items-center gap-1 mt-1">
                                                <TrendingUp className="w-3 h-3" />
                                                +1m 12s زيادة
                                            </p>
                                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                                                <Clock className="w-20 h-20" />
                                            </div>
                                        </Card>
                                        <Card className="p-4 relative overflow-hidden group border-none bg-gradient-to-br from-amber-500/10 to-transparent">
                                            <p className="text-sm text-muted-foreground mb-1">العوائد التقديرية (نقاط)</p>
                                            <h3 className="text-2xl font-bold text-amber-600">{mockPlatformStats.revenue.toLocaleString()}</h3>
                                            <p className="text-xs text-success flex items-center gap-1 mt-1">
                                                <TrendingUp className="w-3 h-3" />
                                                +12% نمو
                                            </p>
                                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                                                <Medal className="w-20 h-20" />
                                            </div>
                                        </Card>
                                        <Card className="p-4 relative overflow-hidden group border-none bg-gradient-to-br from-emerald-500/10 to-transparent">
                                            <p className="text-sm text-muted-foreground mb-1">معدل التحويل</p>
                                            <h3 className="text-2xl font-bold text-emerald-600">{mockPlatformStats.conversionRate}</h3>
                                            <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                                                <TrendingUp className="w-3 h-3 rotate-180" />
                                                -0.5% انخفاض
                                            </p>
                                            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                                                <Zap className="w-20 h-20" />
                                            </div>
                                        </Card>
                                    </div>

                                    {/* Charts Row 1: Engagement */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <Card className="lg:col-span-2 overflow-hidden border-none shadow-md">
                                            <CardHeader>
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Activity className="w-4 h-4 text-primary" />
                                                    نشاط المنصة الأسبوعي
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="h-[300px] w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={engagementData}>
                                                            <defs>
                                                                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                                                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                                                </linearGradient>
                                                                <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3} />
                                                                    <stop offset="95%" stopColor="#EC4899" stopOpacity={0} />
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                                            <YAxis axisLine={false} tickLine={false} />
                                                            <Tooltip
                                                                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                                                            />
                                                            <Area type="monotone" dataKey="users" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={3} />
                                                            <Area type="monotone" dataKey="active" stroke="#EC4899" fillOpacity={1} fill="url(#colorActive)" strokeWidth={3} />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="border-none shadow-md">
                                            <CardHeader>
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Brain className="w-4 h-4 text-purple-500" />
                                                    توزيع الاهتمامات
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="h-[300px] w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={categoryPerformance}>
                                                            <PolarGrid opacity={0.3} />
                                                            <PolarAngleAxis dataKey="subject" />
                                                            <PolarRadiusAxis angle={30} domain={[0, 150]} />
                                                            <Radar name="الأداء" dataKey="A" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} />
                                                            <Radar name="المتوسط" dataKey="B" stroke="#EC4899" fill="#EC4899" fillOpacity={0.3} />
                                                        </RadarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Charts Row 2: Devices & Categories */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <Card className="border-none shadow-md">
                                            <CardHeader>
                                                <CardTitle className="text-base">الأجهزة المستخدمة</CardTitle>
                                            </CardHeader>
                                            <CardContent className="flex items-center justify-between">
                                                <div className="h-[250px] w-1/2">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <RePieChart>
                                                            <Pie
                                                                data={deviceData}
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={60}
                                                                outerRadius={80}
                                                                paddingAngle={5}
                                                                dataKey="value"
                                                            >
                                                                {deviceData.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip />
                                                        </RePieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                                <div className="w-1/2 space-y-3">
                                                    {deviceData.map((item, i) => (
                                                        <div key={item.name} className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                                                                <span className="text-sm">{item.name}</span>
                                                            </div>
                                                            <span className="text-sm font-bold">{item.value}%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="border-none shadow-md">
                                            <CardHeader>
                                                <CardTitle className="text-base">نمو المحتوى</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    {[
                                                        { type: "تحديات فردية", count: 8540, grow: "+15%", color: "bg-blue-500" },
                                                        { type: "تحديات مجموعات", count: 3210, grow: "+22%", color: "bg-purple-500" },
                                                        { type: "مسابقات مباشرة", count: 1240, grow: "+8%", color: "bg-pink-500" },
                                                        { type: "محتوى تعليمي", count: 4500, grow: "+30%", color: "bg-emerald-500" }
                                                    ].map(item => (
                                                        <div key={item.type} className="space-y-1">
                                                            <div className="flex justify-between text-sm">
                                                                <span>{item.type}</span>
                                                                <span className="font-bold">{item.count.toLocaleString()} <span className="text-xs text-success font-normal">{item.grow}</span></span>
                                                            </div>
                                                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                                <div className={`h-full ${item.color}`} style={{ width: `${(item.count / 10000) * 100}%` }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Export Report Card */}
                                    <div className="p-8 rounded-3xl bg-gradient-to-br from-purple-600 to-pink-500 text-white relative overflow-hidden group">
                                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div>
                                                <h3 className="text-2xl font-bold mb-2">جاهز لتحليل أعمق؟ 📊</h3>
                                                <p className="text-white/80 max-w-md">يمكنك تصدير تقارير مفصلة بصيغة PDF أو Excel للحصول على نظرة شاملة عن أداء المنصة وطلبات المستخدمين.</p>
                                            </div>
                                            <div className="flex gap-4">
                                                <Button
                                                    variant="secondary"
                                                    className="bg-white text-purple-600 hover:bg-white/90 px-8 py-6 rounded-2xl font-bold"
                                                    onClick={handleExport}
                                                    disabled={isExporting}
                                                >
                                                    {isExporting ? "جاري التجهيز..." : "تصدير التقرير الشامل"}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-300/20 rounded-full -ml-10 -mb-10 blur-2xl" />
                                    </div>
                                </motion.div>
                            )}

                            {/* Challenges Analysis Tab */}
                            {activeTab === "challenges_analysis" && (
                                <motion.div
                                    key="challenges_analysis"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold flex items-center gap-2">
                                            <Target className="w-6 h-6 text-primary" />
                                            تحليل أداء التحديات
                                        </h2>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" className="gap-2">
                                                <Filter className="w-4 h-4" />
                                                تصفية حسب التصنيف
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Participation Trend */}
                                        <Card className="lg:col-span-2 border-none shadow-md">
                                            <CardHeader className="flex flex-row items-center justify-between">
                                                <CardTitle className="text-base">نزعة المشاركة الأسبوعية</CardTitle>
                                                <div className="flex items-center gap-2 text-xs text-success bg-success/10 px-2 py-1 rounded-full">
                                                    <TrendingUp className="w-3 h-3" />
                                                    +15.4% نمو
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="h-[300px] w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart data={[
                                                            { day: 'السبت', value: 1200 },
                                                            { day: 'الأحد', value: 1800 },
                                                            { day: 'الاثنين', value: 1600 },
                                                            { day: 'الثلاثاء', value: 2100 },
                                                            { day: 'الأربعاء', value: 1900 },
                                                            { day: 'الخميس', value: 2800 },
                                                            { day: 'الجمعة', value: 3400 },
                                                        ]}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                                            <XAxis dataKey="day" axisLine={false} tickLine={false} />
                                                            <YAxis axisLine={false} tickLine={false} />
                                                            <Tooltip
                                                                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                                                            />
                                                            <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6' }} activeDot={{ r: 6 }} />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Success Rate by Difficulty */}
                                        <Card className="border-none shadow-md">
                                            <CardHeader>
                                                <CardTitle className="text-base">نسبة النجاح حسب مستوى الصعوبة</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="h-[300px] w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={[
                                                            { difficulty: 'سهل', success: 85 },
                                                            { difficulty: 'متوسط', success: 62 },
                                                            { difficulty: 'صعب', success: 28 },
                                                            { difficulty: 'خبير', success: 12 },
                                                        ]}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                                            <XAxis dataKey="difficulty" axisLine={false} tickLine={false} />
                                                            <YAxis axisLine={false} tickLine={false} />
                                                            <Tooltip
                                                                cursor={{ fill: 'transparent' }}
                                                                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                                                            />
                                                            <Bar dataKey="success" name="نسبة النجاح %" radius={[10, 10, 0, 0]}>
                                                                <Cell fill="#10B981" />
                                                                <Cell fill="#3B82F6" />
                                                                <Cell fill="#8B5CF6" />
                                                                <Cell fill="#EC4899" />
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Popular Categories */}
                                        <Card className="border-none shadow-md">
                                            <CardHeader>
                                                <CardTitle className="text-base">أكثر التصنيفات مشاركة</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    {[
                                                        { category: "ثقافة عامة", players: "45K", trend: "up" },
                                                        { category: "علوم وتقنية", players: "32K", trend: "up" },
                                                        { category: "تاريخ وأدب", players: "28K", trend: "down" },
                                                        { category: "رياضة وصحة", players: "22K", trend: "up" },
                                                        { category: "ترفيه وألعاب", players: "18K", trend: "neutral" }
                                                    ].map((item, i) => (
                                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                                    {i + 1}
                                                                </div>
                                                                <span className="font-medium">{item.category}</span>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <span className="text-sm font-bold">{item.players} لاعب</span>
                                                                {item.trend === "up" ? (
                                                                    <TrendingUp className="w-4 h-4 text-success" />
                                                                ) : item.trend === "down" ? (
                                                                    <TrendingDown className="w-4 h-4 text-destructive" />
                                                                ) : (
                                                                    <Activity className="w-4 h-4 text-muted-foreground" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Top Rated Challenges */}
                                        <Card className="border-none shadow-md">
                                            <CardHeader>
                                                <CardTitle className="text-base">أعلى التحديات تقييماً</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    {[
                                                        { title: "تحدي العباقرة 2024", channel: "قناة المعرفة", rating: 4.9, plays: "12K" },
                                                        { title: "ماراثون البرمجة", channel: "أكاديمية تقنية", rating: 4.8, plays: "8.5K" },
                                                        { title: "لغز التاريخ القديم", channel: "قناة التراث", rating: 4.7, plays: "15K" },
                                                        { title: "اختبار الذكاء العاطفي", channel: "بصيرة", rating: 4.6, plays: "5K" },
                                                        { title: "بطل الرياضة", channel: "لايف سبورت", rating: 4.5, plays: "9K" }
                                                    ].map((item, i) => (
                                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                                    <Star className="w-5 h-5 fill-amber-500" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold">{item.title}</p>
                                                                    <p className="text-xs text-muted-foreground">{item.channel}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-bold">{item.rating}</p>
                                                                <p className="text-[10px] text-muted-foreground">{item.plays} مشارك</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Question Analysis Table */}
                                    <Card className="border-none shadow-md overflow-hidden">
                                        <CardHeader>
                                            <CardTitle className="text-base">تحليل الأسئلة الأكثر تحدياً</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-muted/50">
                                                        <tr>
                                                            <th className="text-right p-4">السؤال</th>
                                                            <th className="text-right p-4">التصنيف</th>
                                                            <th className="text-right p-4">نسبة الحل الصحيح</th>
                                                            <th className="text-right p-4">متوسط الوقت</th>
                                                            <th className="text-right p-4">الحالة</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {[
                                                            { q: "ما هي عاصمة الدولة الأموية؟", cat: "تاريخ", success: "15%", time: "4.2s", status: "hard" },
                                                            { q: "ما هو العنصر الكيميائي الذي يرمز له بـ Au؟", cat: "علوم", success: "22%", time: "3.5s", status: "medium" },
                                                            { q: "من هو متصدر الدوري السعودي الموسم الماضي؟", cat: "رياضة", success: "78%", time: "1.8s", status: "easy" },
                                                        ].map((item, i) => (
                                                            <tr key={i} className="border-t hover:bg-muted/20">
                                                                <td className="p-4 font-medium">{item.q}</td>
                                                                <td className="p-4">{item.cat}</td>
                                                                <td className="p-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <Progress value={parseInt(item.success)} className="w-20 h-1.5" />
                                                                        <span>{item.success}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-muted-foreground">{item.time}</td>
                                                                <td className="p-4">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${item.status === "hard" ? "bg-destructive/10 text-destructive" :
                                                                        item.status === "medium" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                                                                        }`}>
                                                                        {item.status === "hard" ? "صعب جداً" : item.status === "medium" ? "متوسط" : "سهل"}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}

                            {/* SaaS & Subscriptions Tab */}
                            {activeTab === "saas" && (
                                <motion.div
                                    key="saas"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold flex items-center gap-2">
                                            <Wallet className="w-6 h-6 text-primary" />
                                            إدارة نموذج SaaS والدخل
                                        </h2>
                                        <div className="flex gap-2">
                                            <Button variant="outline" className="gap-2">
                                                <Settings className="w-4 h-4" />
                                                إعدادات الأسعار
                                            </Button>
                                            <Button variant="default" className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 border-none">
                                                <Banknote className="w-4 h-4" />
                                                تقرير الأرباح
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Revenue Overview */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20 shadow-md border-none">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                                    <TrendingUp className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">صافي الدخل الشهري (MRR)</p>
                                                    <h3 className="text-3xl font-bold text-emerald-600">$25,800</h3>
                                                    <p className="text-xs text-success flex items-center gap-1">
                                                        <TrendingUp className="w-3 h-3" />
                                                        +20.4% نمو شهري
                                                    </p>
                                                </div>
                                            </div>
                                        </Card>
                                        <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20 shadow-md border-none">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                                    <CreditCard className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">الاشتراكات النشطة</p>
                                                    <h3 className="text-3xl font-bold text-blue-600">523</h3>
                                                    <p className="text-xs text-blue-600">من أصل 1.2K قناة</p>
                                                </div>
                                            </div>
                                        </Card>
                                        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/5 border-purple-500/20 shadow-md border-none">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                                                    <Zap className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">متوسط الدخل لكل قناة</p>
                                                    <h3 className="text-3xl font-bold text-purple-600">$142</h3>
                                                    <p className="text-xs text-purple-600">ARPU الأسبوعي</p>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Revenue Growth Chart */}
                                        <Card className="lg:col-span-2 border-none shadow-md overflow-hidden">
                                            <CardHeader className="flex flex-row items-center justify-between">
                                                <CardTitle className="text-base flex items-center gap-2">
                                                    <Activity className="w-4 h-4 text-primary" />
                                                    نمو العوائد الشهرية
                                                </CardTitle>
                                                <div className="flex gap-2">
                                                    <div className="flex items-center gap-1 text-[10px]">
                                                        <div className="w-2 h-2 rounded-full bg-primary" /> اشتراكات
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px]">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500" /> إضافات
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="h-[300px] w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <AreaChart data={revenueData}>
                                                            <defs>
                                                                <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                                                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                                                </linearGradient>
                                                            </defs>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                                            <XAxis dataKey="month" axisLine={false} tickLine={false} />
                                                            <YAxis axisLine={false} tickLine={false} />
                                                            <Tooltip
                                                                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '12px' }}
                                                            />
                                                            <Area type="monotone" dataKey="mrr" name="الدخل المتكرر" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorMrr)" strokeWidth={3} />
                                                            <Area type="monotone" dataKey="usage" name="الدخل المتغير" stroke="#10B981" fillOpacity={0.1} strokeDasharray="5 5" strokeWidth={1} />
                                                        </AreaChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Plan Distribution */}
                                        <Card className="border-none shadow-md">
                                            <CardHeader>
                                                <CardTitle className="text-base">توزيع الخطط</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="h-[200px] w-full mb-6">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <RePieChart>
                                                            <Pie
                                                                data={mockPlans}
                                                                dataKey="activeChannels"
                                                                nameKey="name"
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={50}
                                                                outerRadius={70}
                                                                paddingAngle={5}
                                                            >
                                                                {mockPlans.map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={entry.color === 'blue' ? '#3B82F6' : entry.color === 'purple' ? '#8B5CF6' : '#F59E0B'} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip />
                                                        </RePieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                                <div className="space-y-3">
                                                    {mockPlans.map((plan, i) => (
                                                        <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-muted/30">
                                                            <div className="flex items-center gap-2">
                                                                <plan.icon className={`w-4 h-4 text-${plan.color}-500`} />
                                                                <span className="text-sm font-bold">{plan.name}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-sm font-bold">{plan.activeChannels}</span>
                                                                <span className="text-[10px] text-muted-foreground block">قناة</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Action - Edit Plans */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {mockPlans.map((plan, i) => (
                                            <Card key={i} className={`border-2 border-transparent hover:border-${plan.color}-500/20 transition-all p-6 relative overflow-hidden group border-none shadow-md`}>
                                                <div className="relative z-10">
                                                    <div className={`w-12 h-12 rounded-2xl bg-${plan.color}-500/10 flex items-center justify-center text-${plan.color}-500 mb-4 group-hover:scale-110 transition-transform`}>
                                                        <plan.icon className="w-6 h-6" />
                                                    </div>
                                                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                                                    <p className="text-2xl font-bold mb-4">
                                                        ${plan.price}
                                                        <span className="text-sm font-normal text-muted-foreground"> / شهرياً</span>
                                                    </p>
                                                    <ul className="space-y-3 mb-6">
                                                        <li className="flex items-center gap-2 text-sm">
                                                            <Check className="w-4 h-4 text-success" />
                                                            {plan.limits.challenges} تحديات مسموحة
                                                        </li>
                                                        <li className="flex items-center gap-2 text-sm">
                                                            {plan.limits.verified ? (
                                                                <Check className="w-4 h-4 text-success" />
                                                            ) : (
                                                                <XCircle className="w-4 h-4 text-destructive" />
                                                            )}
                                                            شارة التوثيق
                                                        </li>
                                                        <li className="flex items-center gap-2 text-sm">
                                                            <Check className="w-4 h-4 text-success" />
                                                            تحليلات {plan.limits.analytics === 'unlimited' ? 'لا محدودة' : 'متقدمة'}
                                                        </li>
                                                    </ul>
                                                    <Button className="w-full" variant="outline">تعديل الخطة</Button>
                                                </div>
                                                <div className={`absolute -right-8 -bottom-8 opacity-5 group-hover:opacity-10 transition-opacity`}>
                                                    <plan.icon className="w-32 h-32" />
                                                </div>
                                            </Card>
                                        ))}
                                    </div>

                                    {/* Transaction Table */}
                                    <Card className="border-none shadow-md overflow-hidden">
                                        <CardHeader>
                                            <CardTitle className="text-base">آخر عمليات الدفع</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-muted/50 text-right">
                                                        <tr>
                                                            <th className="p-4">القناة / العميل</th>
                                                            <th className="p-4">الخطة</th>
                                                            <th className="p-4">التاريخ</th>
                                                            <th className="p-4">المبلغ</th>
                                                            <th className="p-4">الحالة</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {[
                                                            { name: "أكاديمية المعرفة", plan: "الاحترافية", date: "2024-05-12", amount: "$299", status: "success" },
                                                            { name: "وزارة التربية", plan: "المؤسسات", date: "2024-05-11", amount: "$999", status: "success" },
                                                            { name: "ستوديو الإبداع", plan: "الاحترافية", date: "2024-05-10", amount: "$299", status: "pending" },
                                                            { name: "نادي الابتكار", plan: "الاحترافية", date: "2024-05-09", amount: "$299", status: "failed" },
                                                        ].map((tx, i) => (
                                                            <tr key={i} className="border-t hover:bg-muted/20">
                                                                <td className="p-4 font-bold">{tx.name}</td>
                                                                <td className="p-4">
                                                                    <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                                                                        {tx.plan}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4 text-muted-foreground">{tx.date}</td>
                                                                <td className="p-4 font-bold">{tx.amount}</td>
                                                                <td className="p-4">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${tx.status === "success" ? "bg-success/10 text-success" :
                                                                        tx.status === "pending" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                                                                        }`}>
                                                                        {tx.status === "success" ? "مكتمل" : tx.status === "pending" ? "معلق" : "فاشل"}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                            {activeTab === "logs" && (
                                <motion.div
                                    key="logs"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-bold flex items-center gap-2">
                                            <Database className="w-6 h-6 text-primary" />
                                            سجل النظام
                                        </h2>
                                        <Button variant="outline" className="gap-2">
                                            <RefreshCw className="w-4 h-4" />
                                            تحديث
                                        </Button>
                                    </div>

                                    <Card>
                                        <CardContent className="p-0">
                                            <div className="space-y-0">
                                                {mockSystemLogs.map((log, i) => (
                                                    <div
                                                        key={log.id}
                                                        className={`flex items-center gap-4 p-4 border-b last:border-b-0 ${log.type === "danger" ? "bg-destructive/5" :
                                                            log.type === "warning" ? "bg-warning/5" : ""
                                                            }`}
                                                    >
                                                        <div className={`w-3 h-3 rounded-full ${log.type === "danger" ? "bg-destructive" :
                                                            log.type === "warning" ? "bg-warning" :
                                                                log.type === "success" ? "bg-success" : "bg-primary"
                                                            }`} />
                                                        <div className="flex-1">
                                                            <p className="font-medium">{log.action}</p>
                                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                                <span>المستخدم: {log.user}</span>
                                                                <span>IP: {log.ip}</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm text-muted-foreground">{log.time}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
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
                                        <Cog className="w-6 h-6 text-primary" />
                                        إعدادات النظام
                                    </h2>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>إعدادات المنصة العامة</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium mb-2 block">اسم المنصة</label>
                                                    <Input defaultValue="لاب 4 - منصة المسابقات التفاعلية" />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-2 block">البريد الإلكتروني للدعم</label>
                                                    <Input defaultValue="support@lab4.sa" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium mb-2 block">وصف المنصة</label>
                                                <Textarea defaultValue="منصة المسابقات التفاعلية الأولى في السعودية" rows={3} />
                                            </div>
                                            <Button>حفظ التغييرات</Button>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>إعدادات الأمان</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {[
                                                { label: "التحقق بخطوتين للمديرين", enabled: true },
                                                { label: "تسجيل تلقائي لجميع العمليات", enabled: true },
                                                { label: "حظر تلقائي للسلوك المشبوه", enabled: false },
                                                { label: "إشعارات الأمان الفورية", enabled: true }
                                            ].map((setting, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                                    <div className="flex items-center gap-3">
                                                        <Lock className="w-4 h-4 text-muted-foreground" />
                                                        <span>{setting.label}</span>
                                                    </div>
                                                    <Button variant={setting.enabled ? "default" : "outline"} size="sm">
                                                        {setting.enabled ? "مفعل" : "معطل"}
                                                    </Button>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>حالة الخادم</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="p-4 rounded-xl bg-success/10 text-center">
                                                    <Server className="w-8 h-8 mx-auto mb-2 text-success" />
                                                    <p className="font-bold text-success">يعمل</p>
                                                    <p className="text-sm text-muted-foreground">الخادم الرئيسي</p>
                                                </div>
                                                <div className="p-4 rounded-xl bg-success/10 text-center">
                                                    <Database className="w-8 h-8 mx-auto mb-2 text-success" />
                                                    <p className="font-bold text-success">متصل</p>
                                                    <p className="text-sm text-muted-foreground">قاعدة البيانات</p>
                                                </div>
                                                <div className="p-4 rounded-xl bg-success/10 text-center">
                                                    <Globe className="w-8 h-8 mx-auto mb-2 text-success" />
                                                    <p className="font-bold text-success">99.9%</p>
                                                    <p className="text-sm text-muted-foreground">وقت التشغيل</p>
                                                </div>
                                            </div>
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

export default AdminDashboard;

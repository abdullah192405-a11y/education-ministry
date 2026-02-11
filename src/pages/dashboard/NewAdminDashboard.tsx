import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Shield, Settings, LogOut, Bell,
    TrendingUp, Award, CheckCircle,
    BarChart3, Activity, Plus, Edit,
    Users, GraduationCap, BookOpen, LayoutDashboard,
    School, UserCheck, Trophy, Sparkles, Target,
    Clock, Eye, Gamepad2, FileText, ChartBar
} from "lucide-react";
import { gradesData } from "@/data/educationData";
import GradesTab from "@/components/dashboard/admin/GradesTab";
import TeachersTab from "@/components/dashboard/admin/TeachersTab";
import StudentsTab from "@/components/dashboard/admin/StudentsTab";
import SubjectsTab from "@/components/dashboard/admin/SubjectsTab";
import AnalyticsTab from "@/components/dashboard/admin/AnalyticsTab";
import SettingsTab from "@/components/dashboard/admin/SettingsTab";

// Mock Admin Data
const mockAdminData = {
    id: 1,
    name: "مدير المنصة",
    email: "admin@edu.sa",
    avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=admin",
    role: "مسؤول النظام",
    verified: true
};

// System-wide statistics
const systemStats = {
    totalGrades: 12,
    totalSubjects: 36,
    totalTopics: 145,
    totalStudents: 2450,
    totalTeachers: 68,
    totalChallenges: 3420,
    activeUsers: 1240,
    averageScore: 84
};

// Mock data for charts
const monthlyActivity = [
    { month: "محرم", students: 980, challenges: 245 },
    { month: "صفر", students: 1120, challenges: 312 },
    { month: "ربيع الأول", students: 1340, challenges: 398 },
    { month: "ربيع الثاني", students: 1560, challenges: 445 },
    { month: "جمادى الأولى", students: 1780, challenges: 521 },
    { month: "جمادى الثانية", students: 2100, challenges: 687 },
];

const topPerformingGrades = [
    { name: "الصف السادس الابتدائي", average: 92, students: 215, color: "from-emerald-500 to-teal-500" },
    { name: "الصف الثالث المتوسط", average: 89, students: 198, color: "from-blue-500 to-cyan-500" },
    { name: "الصف الثاني الثانوي", average: 87, students: 187, color: "from-purple-500 to-pink-500" },
    { name: "الصف الخامس الابتدائي", average: 86, students: 203, color: "from-amber-500 to-orange-500" }
];

const topPerformingTeachers = [
    { name: "معلم 1", subject: "اللغة العربية", avgScore: 91, students: 28, avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=teacher1" },
    { name: "معلم 2", subject: "الرياضيات", avgScore: 89, students: 32, avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=teacher2" },
    { name: "معلم 3", subject: "العلوم", avgScore: 87, students: 30, avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=teacher3" },
    { name: "معلم 4", subject: "اللغة الإنجليزية", avgScore: 85, students: 26, avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=teacher4" }
];

const recentActivities = [
    { type: "student", message: "انضم 15 طالب جديد للمنصة", time: "منذ 5 دقائق", icon: UserCheck, color: "text-success" },
    { type: "challenge", message: "تم إكمال 24 تحدي جماعي", time: "منذ 15 دقيقة", icon: Trophy, color: "text-warning" },
    { type: "grade", message: "تم تحديث منهج الصف الثالث الابتدائي", time: "منذ ساعة", icon: BookOpen, color: "text-blue-500" },
    { type: "teacher", message: "انضم 3 معلمين جدد", time: "منذ ساعتين", icon: Award, color: "text-purple-500" }
];

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState("overview");

    return (
        <div className="min-h-screen font-cairo bg-gradient-to-br from-background via-background to-amber/5" dir="rtl">
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
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-white" />
                                </div>
                                <div className="hidden md:block">
                                    <span className="font-medium text-sm">لوحة الإدارة</span>
                                    <p className="text-xs text-muted-foreground">إدارة شاملة</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" className="relative">
                                <Bell className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">5</span>
                            </Button>
                            <div className="flex items-center gap-2">
                                <img src={mockAdminData.avatar} alt={mockAdminData.name} className="w-10 h-10 rounded-full" />
                                <div className="hidden md:block">
                                    <p className="font-medium text-sm">{mockAdminData.name}</p>
                                    <p className="text-xs text-muted-foreground">{mockAdminData.role}</p>
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
                                {/* Admin Info */}
                                <div className="text-center mb-4 pb-4 border-b">
                                    <div className="w-16 h-16 rounded-xl mx-auto mb-3 bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                        <Shield className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="font-bold text-sm mb-1">{mockAdminData.name}</h2>
                                    <p className="text-xs text-muted-foreground">{mockAdminData.role}</p>
                                    <div className="flex items-center justify-center gap-1 text-xs text-primary mt-2">
                                        <CheckCircle className="w-3 h-3 fill-primary" />
                                        <span>مصادق عليه</span>
                                    </div>
                                </div>

                                {/* Navigation */}
                                <nav className="space-y-1">
                                    {[
                                        { id: "overview", icon: LayoutDashboard, label: "نظرة عامة" },
                                        { id: "grades", icon: School, label: "الصفوف الدراسية" },
                                        { id: "teachers", icon: UserCheck, label: "المعلمين" },
                                        { id: "students", icon: GraduationCap, label: "الطلاب" },
                                        { id: "subjects", icon: BookOpen, label: "المواد" },
                                        { id: "analytics", icon: ChartBar, label: "تقارير شاملة" },
                                        { id: "settings", icon: Settings, label: "إعدادات" }
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
                                        <div className="relative p-6 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500">
                                            <div className="relative z-10">
                                                <h1 className="text-2xl font-bold text-white mb-2">
                                                    لوحة إدارة المنصة التعليمية 🏛️
                                                </h1>
                                                <p className="text-white/80 mb-4">
                                                    إدارة شاملة للمنصة التعليمية - نظرة عامة على الأداء
                                                </p>
                                                <div className="flex gap-3">
                                                    <Button variant="secondary" size="sm" className="gap-2">
                                                        <Plus className="w-4 h-4" />
                                                        إضافة صف دراسي
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20">
                                                        <FileText className="w-4 h-4" />
                                                        تقرير شامل
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="absolute left-0 top-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                                        </div>
                                    </Card>

                                    {/* System Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <Card className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                                    <School className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold">{systemStats.totalGrades}</p>
                                                    <p className="text-sm text-muted-foreground">صف دراسي</p>
                                                </div>
                                            </div>
                                        </Card>
                                        <Card className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                                    <BookOpen className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold">{systemStats.totalSubjects}</p>
                                                    <p className="text-sm text-muted-foreground">مادة دراسية</p>
                                                </div>
                                            </div>
                                        </Card>
                                        <Card className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                                                    <GraduationCap className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold">{systemStats.totalStudents.toLocaleString()}</p>
                                                    <p className="text-sm text-muted-foreground">طالب</p>
                                                </div>
                                            </div>
                                        </Card>
                                        <Card className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                                    <UserCheck className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold">{systemStats.totalTeachers}</p>
                                                    <p className="text-sm text-muted-foreground">معلم</p>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>

                                    {/* Secondary Stats */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <Card className="p-4 border-dashed">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">إجمالي الدروس</p>
                                                    <p className="text-xl font-bold">{systemStats.totalTopics}</p>
                                                </div>
                                                <Target className="w-8 h-8 text-blue-500 opacity-50" />
                                            </div>
                                        </Card>
                                        <Card className="p-4 border-dashed">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">إجمالي التحديات</p>
                                                    <p className="text-xl font-bold">{systemStats.totalChallenges.toLocaleString()}</p>
                                                </div>
                                                <Gamepad2 className="w-8 h-8 text-purple-500 opacity-50" />
                                            </div>
                                        </Card>
                                        <Card className="p-4 border-dashed">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">مستخدمون نشطون</p>
                                                    <p className="text-xl font-bold">{systemStats.activeUsers.toLocaleString()}</p>
                                                </div>
                                                <Activity className="w-8 h-8 text-success opacity-50" />
                                            </div>
                                        </Card>
                                        <Card className="p-4 border-dashed">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">متوسط النتائج</p>
                                                    <p className="text-xl font-bold">{systemStats.averageScore}%</p>
                                                </div>
                                                <TrendingUp className="w-8 h-8 text-amber-500 opacity-50" />
                                            </div>
                                        </Card>
                                    </div>

                                    {/* Charts & Lists */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Top Performing Grades */}
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Trophy className="w-5 h-5 text-warning" />
                                                    الصفوف المتفوقة
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {topPerformingGrades.map((grade, idx) => (
                                                    <div key={idx} className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${grade.color} flex items-center justify-center text-white text-xs font-bold`}>
                                                                    {idx + 1}
                                                                </span>
                                                                <span className="text-sm font-medium">{grade.name}</span>
                                                            </div>
                                                            <span className="text-sm font-bold text-success">{grade.average}%</span>
                                                        </div>
                                                        <Progress value={grade.average} className="h-1.5" />
                                                        <p className="text-xs text-muted-foreground">
                                                            {grade.students} طالب
                                                        </p>
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>

                                        {/* Top Performing Teachers */}
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Award className="w-5 h-5 text-primary" />
                                                    المعلمون المتميزون
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {topPerformingTeachers.map((teacher, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                                                        <img
                                                            src={teacher.avatar}
                                                            alt={teacher.name}
                                                            className="w-10 h-10 rounded-full"
                                                        />
                                                        <div className="flex-1">
                                                            <p className="font-medium text-sm">{teacher.name}</p>
                                                            <p className="text-xs text-muted-foreground">{teacher.subject} • {teacher.students} طالب</p>
                                                        </div>
                                                        <span className="font-bold text-success">{teacher.avgScore}%</span>
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Monthly Activity */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <BarChart3 className="w-5 h-5 text-primary" />
                                                النشاط الشهري
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                {monthlyActivity.map((month, idx) => (
                                                    <div key={idx} className="space-y-2">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="font-medium">{month.month}</span>
                                                            <div className="flex gap-4 text-xs">
                                                                <span className="text-blue-600">
                                                                    <Users className="w-3 h-3 inline ml-1" />
                                                                    {month.students}
                                                                </span>
                                                                <span className="text-purple-600">
                                                                    <Gamepad2 className="w-3 h-3 inline ml-1" />
                                                                    {month.challenges}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <Progress value={(month.students / 2500) * 100} className="h-2 bg-blue-100" />
                                                            </div>
                                                            <div>
                                                                <Progress value={(month.challenges / 700) * 100} className="h-2 bg-purple-100" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Recent Activity */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Clock className="w-5 h-5 text-primary" />
                                                آخر الأنشطة
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {recentActivities.map((activity, idx) => (
                                                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                                                    <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${activity.color}`}>
                                                        <activity.icon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">{activity.message}</p>
                                                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>

                                    {/* All Grades */}
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <School className="w-5 h-5 text-primary" />
                                                جميع الصفوف الدراسية ({gradesData.length})
                                            </CardTitle>
                                            <Button size="sm" onClick={() => setActiveTab("grades")}>
                                                إدارة الصفوف
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {gradesData.map((grade) => (
                                                <div key={grade.id} className="p-4 rounded-xl border hover:border-primary/50 transition-all">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xl font-bold">
                                                            {grade.id}
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="font-bold text-sm">{grade.name}</h3>
                                                            <p className="text-xs text-muted-foreground">{grade.level}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                        <span><BookOpen className="w-3 h-3 inline ml-1" />{grade.subjects.length} مادة</span>
                                                        <span><GraduationCap className="w-3 h-3 inline ml-1" />{grade.studentsCount} طالب</span>
                                                    </div>
                                                    <Button size="sm" variant="outline" className="w-full mt-3 text-xs" asChild>
                                                        <Link to={`/grade/${grade.id}`}>
                                                            <Eye className="w-3 h-3 ml-1" />
                                                            عرض التفاصيل
                                                        </Link>
                                                    </Button>
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
                                    {activeTab === "grades" && <GradesTab />}
                                    {activeTab === "teachers" && <TeachersTab />}
                                    {activeTab === "students" && <StudentsTab />}
                                    {activeTab === "subjects" && <SubjectsTab />}
                                    {activeTab === "analytics" && <AnalyticsTab />}
                                    {activeTab === "settings" && <SettingsTab />}
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

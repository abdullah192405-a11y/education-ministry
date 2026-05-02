import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Shield, Settings, LogOut, Bell,
    TrendingUp, Award, CheckCircle,
    BarChart3, Activity, Plus, Edit,
    Users, GraduationCap, BookOpen, LayoutDashboard,
    School, UserCheck, Trophy, Sparkles, Target,
    Clock, Eye, Gamepad2, FileText, ChartBar, LifeBuoy
} from "lucide-react";
import { useUser, useAdminStats, useAllUsers, useGrades, useRecentAuditLogs } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import GradesTab from "./components/GradesTab";
import TeachersTab from "./components/TeachersTab";
import StudentsTab from "./components/StudentsTab";
import SubjectsTab from "./components/SubjectsTab";
import AnalyticsTab from "./components/AnalyticsTab";
import SettingsTab from "./components/SettingsTab";
import AdminSupportTab from "./components/AdminSupportTab";

// Action type icons/colors for audit logs
const auditActionMeta: Record<string, { icon: any; color: string }> = {
    CREATE: { icon: Plus, color: "text-success" },
    UPDATE: { icon: Edit, color: "text-blue-500" },
    DELETE: { icon: Trophy, color: "text-destructive" },
    LOGIN: { icon: UserCheck, color: "text-success" },
    default: { icon: Activity, color: "text-muted-foreground" }
};

const AdminDashboard = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { signOut: clerkSignOut } = useAuth();

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            await clerkSignOut();
            localStorage.removeItem("edu_user");
            queryClient.clear();
            navigate("/");
        } catch (error) {
            console.error("Logout error:", error);
            navigate("/");
        }
    };
    const { data: user, isLoading: isLoadingUser } = useUser();

    useEffect(() => {
        if (user?.role) {
            const role = user.role.toUpperCase();
            if (role === "STUDENT" || role === "طالب") {
                navigate("/dashboard/student");
            } else if (role === "TEACHER" || role === "معلم" || role === "معلمة") {
                navigate("/dashboard/teacher");
            }
        }
    }, [user, navigate]);

    const { data: stats, isLoading: isLoadingStats } = useAdminStats();
    const { data: allUsers, isLoading: isLoadingUsers } = useAllUsers();

    const { data: grades, isLoading: isLoadingGrades } = useGrades();
    const { data: auditLogs, isLoading: isLoadingLogs } = useRecentAuditLogs(6);

    const [activeTab, setActiveTab] = useState("overview");

    const isLoading = isLoadingUser || isLoadingStats;

    // Derive admin data from real DB
    const adminData = {
        id: user?.id || "",
        name: user?.name || "مدير Lab4",
        email: user?.email || "",
        avatar: user?.avatar || "https://api.dicebear.com/7.x/fun-emoji/svg?seed=admin",
        role: "مسؤول النظام",
        verified: user?.verified || false
    };

    // Real stats from DB
    const currentStats = {
        totalGrades: stats?.totalGrades || 0,
        totalSubjects: stats?.totalSubjects || 0,
        totalTopics: stats?.totalTopics || 0,
        totalStudents: stats?.totalStudents || 0,
        totalTeachers: stats?.totalTeachers || 0,
        totalChallenges: stats?.totalChallenges || 0,
        totalUsers: stats?.totalUsers || 0,
    };

    // Derive teacher users from allUsers
    const teacherUsers = (allUsers || []).filter((u: any) => u.role === "TEACHER");
    const studentUsers = (allUsers || []).filter((u: any) => u.role === "STUDENT");

    // Map audit logs for recent activity
    const recentActivities = (auditLogs || []).map((log: any) => {
        const meta = auditActionMeta[log.action] || auditActionMeta.default;
        return {
            type: log.action,
            message: log.details || `${log.action} on ${log.entity_type || "entity"}`,
            time: log.created_at ? new Date(log.created_at).toLocaleString("ar-SA") : "",
            icon: meta.icon,
            color: meta.color,
            user: log.user?.name || ""
        };
    });

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
                            </Button>
                            <div className="flex items-center gap-2">
                                {isLoadingUser ? (
                                    <Skeleton className="w-10 h-10 rounded-full" />
                                ) : (
                                    <img src={adminData.avatar} alt={adminData.name} className="w-10 h-10 rounded-full" />
                                )}
                                <div className="hidden md:block">
                                    {isLoadingUser ? (
                                        <>
                                            <Skeleton className="h-4 w-24 mb-1" />
                                            <Skeleton className="h-3 w-16" />
                                        </>
                                    ) : (
                                        <>
                                            <p className="font-medium text-sm">{adminData.name}</p>
                                            <p className="text-xs text-muted-foreground">{adminData.role}</p>
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
                                {/* Admin Info */}
                                <div className="text-center mb-4 pb-4 border-b">
                                    <div className="w-16 h-16 rounded-xl mx-auto mb-3 bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                        <Shield className="w-8 h-8 text-white" />
                                    </div>
                                    {isLoadingUser ? (
                                        <Skeleton className="h-4 w-24 mx-auto mb-1" />
                                    ) : (
                                        <h2 className="font-bold text-sm mb-1">{adminData.name}</h2>
                                    )}
                                    <p className="text-xs text-muted-foreground">{adminData.role}</p>
                                    {adminData.verified && (
                                        <div className="flex items-center justify-center gap-1 text-xs text-primary mt-2">
                                            <CheckCircle className="w-3 h-3 fill-primary" />
                                            <span>مصادق عليه</span>
                                        </div>
                                    )}
                                </div>

                                {/* Navigation */}
                                <nav className="space-y-1">
                                    {[
                                        { id: "overview", icon: LayoutDashboard, label: "نظرة عامة" },
                                        { id: "grades", icon: School, label: "الصفوف الدراسية" },
                                        { id: "teachers", icon: UserCheck, label: "المعلمين" },
                                        { id: "students", icon: GraduationCap, label: "الطلاب" },
                                        { id: "support", icon: LifeBuoy, label: "تذاكر الدعم" },
                                        { id: "subjects", icon: BookOpen, label: "المواد الدراسية" },
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
                                    <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2" onClick={handleLogout}>
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
                                                    لوحة إدارة Lab4 🏛️
                                                </h1>
                                                <p className="text-white/80 mb-4">
                                                    إدارة شاملة لـ Lab4 - نظرة عامة على الأداء
                                                </p>
                                                <div className="flex gap-3">
                                                    <Button variant="secondary" size="sm" className="gap-2" onClick={() => setActiveTab("grades")}>
                                                        <Plus className="w-4 h-4" />
                                                        إدارة الصفوف
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => setActiveTab("analytics")}>
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
                                                    {isLoadingStats ? <Skeleton className="h-7 w-8 mb-1" /> : (
                                                        <p className="text-2xl font-bold">{currentStats.totalGrades}</p>
                                                    )}
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
                                                    {isLoadingStats ? <Skeleton className="h-7 w-8 mb-1" /> : (
                                                        <p className="text-2xl font-bold">{currentStats.totalSubjects}</p>
                                                    )}
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
                                                    {isLoadingStats ? <Skeleton className="h-7 w-12 mb-1" /> : (
                                                        <p className="text-2xl font-bold">{currentStats.totalStudents.toLocaleString()}</p>
                                                    )}
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
                                                    {isLoadingStats ? <Skeleton className="h-7 w-8 mb-1" /> : (
                                                        <p className="text-2xl font-bold">{currentStats.totalTeachers}</p>
                                                    )}
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
                                                    {isLoadingStats ? <Skeleton className="h-6 w-12" /> : (
                                                        <p className="text-xl font-bold">{currentStats.totalTopics}</p>
                                                    )}
                                                </div>
                                                <Target className="w-8 h-8 text-blue-500 opacity-50" />
                                            </div>
                                        </Card>
                                        <Card className="p-4 border-dashed">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">إجمالي التحديات</p>
                                                    {isLoadingStats ? <Skeleton className="h-6 w-12" /> : (
                                                        <p className="text-xl font-bold">{currentStats.totalChallenges.toLocaleString()}</p>
                                                    )}
                                                </div>
                                                <Gamepad2 className="w-8 h-8 text-purple-500 opacity-50" />
                                            </div>
                                        </Card>
                                        <Card className="p-4 border-dashed">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">إجمالي المستخدمين</p>
                                                    {isLoadingStats ? <Skeleton className="h-6 w-12" /> : (
                                                        <p className="text-xl font-bold">{currentStats.totalUsers.toLocaleString()}</p>
                                                    )}
                                                </div>
                                                <Activity className="w-8 h-8 text-success opacity-50" />
                                            </div>
                                        </Card>

                                    </div>

                                    {/* Teacher & Students Lists */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Top Teachers */}
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Award className="w-5 h-5 text-primary" />
                                                    المعلمون ({teacherUsers.length})
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {isLoadingUsers ? (
                                                    Array.from({ length: 3 }).map((_, i) => (
                                                        <Skeleton key={i} className="h-16 rounded-xl" />
                                                    ))
                                                ) : teacherUsers.length > 0 ? (
                                                    teacherUsers.slice(0, 4).map((teacher: any, idx: number) => (
                                                        <div key={teacher.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                                                            <img
                                                                src={teacher.avatar || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${teacher.id}`}
                                                                alt={teacher.name}
                                                                className="w-10 h-10 rounded-full"
                                                            />
                                                            <div className="flex-1">
                                                                <p className="font-medium text-sm">{teacher.name}</p>
                                                                <p className="text-xs text-muted-foreground">{teacher.details || teacher.email}</p>
                                                            </div>
                                                            {teacher.verified && <CheckCircle className="w-4 h-4 text-primary" />}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-8 text-muted-foreground">
                                                        <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                                        <p className="text-sm">لا يوجد معلمون بعد</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        {/* Recent Students */}
                                        <Card>
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <GraduationCap className="w-5 h-5 text-primary" />
                                                    آخر الطلاب ({studentUsers.length})
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                {isLoadingUsers ? (
                                                    Array.from({ length: 3 }).map((_, i) => (
                                                        <Skeleton key={i} className="h-16 rounded-xl" />
                                                    ))
                                                ) : studentUsers.length > 0 ? (
                                                    studentUsers.slice(0, 4).map((student: any) => (
                                                        <div key={student.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                                                            <img
                                                                src={student.avatar || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${student.id}`}
                                                                alt={student.name}
                                                                className="w-10 h-10 rounded-full"
                                                            />
                                                            <div className="flex-1">
                                                                <p className="font-medium text-sm">{student.name}</p>
                                                                <p className="text-xs text-muted-foreground">{student.details || student.email}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-8 text-muted-foreground">
                                                        <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                                        <p className="text-sm">لا يوجد طلاب بعد</p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Recent Activity from Audit Logs */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Clock className="w-5 h-5 text-primary" />
                                                آخر الأنشطة
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {isLoadingLogs ? (
                                                Array.from({ length: 3 }).map((_, i) => (
                                                    <Skeleton key={i} className="h-14 rounded-xl" />
                                                ))
                                            ) : recentActivities.length > 0 ? (
                                                recentActivities.map((activity: any, idx: number) => (
                                                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                                                        <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${activity.color}`}>
                                                            <activity.icon className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium">{activity.message}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {activity.user && `${activity.user} • `}{activity.time}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 text-muted-foreground">
                                                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                                    <p className="text-sm">لا توجد أنشطة حديثة</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* All Grades from DB */}
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <School className="w-5 h-5 text-primary" />
                                                جميع الصفوف الدراسية ({grades?.length || 0})
                                            </CardTitle>
                                            <Button size="sm" onClick={() => setActiveTab("grades")}>
                                                إدارة الصفوف
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {isLoadingGrades ? (
                                                Array.from({ length: 3 }).map((_, i) => (
                                                    <Skeleton key={i} className="h-32 rounded-xl" />
                                                ))
                                            ) : (grades || []).length > 0 ? (
                                                (grades || []).map((grade: any) => (
                                                    <div key={grade.id} className="p-4 rounded-xl border hover:border-primary/50 transition-all">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xl font-bold">
                                                                {grade.icon || grade.name?.charAt(0) || "📚"}
                                                            </div>
                                                            <div className="flex-1">
                                                                <h3 className="font-bold text-sm">{grade.name}</h3>
                                                                <p className="text-xs text-muted-foreground">{grade.level}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                            <span><BookOpen className="w-3 h-3 inline ml-1" />{grade.subjects?.length || 0} مادة</span>
                                                            <span><GraduationCap className="w-3 h-3 inline ml-1" />{grade.students_count || 0} طالب</span>
                                                        </div>
                                                        <Button size="sm" variant="outline" className="w-full mt-3 text-xs" asChild>
                                                            <Link to={`/grade/${grade.slug}`}>
                                                                <Eye className="w-3 h-3 ml-1" />
                                                                عرض التفاصيل
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="col-span-3 text-center py-8 text-muted-foreground">
                                                    <School className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                                    <p className="text-sm">لا توجد صفوف دراسية بعد</p>
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
                                    {activeTab === "grades" && <GradesTab />}
                                    {activeTab === "teachers" && <TeachersTab />}
                                    {activeTab === "students" && <StudentsTab />}
                                    {activeTab === "support" && <AdminSupportTab />}
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

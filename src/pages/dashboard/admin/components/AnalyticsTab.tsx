import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import { TrendingUp, Users, BookOpen, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminStats, useAllUsers, useGrades } from "@/hooks/useDatabase";
import { useOrgAdminTenant } from "@/hooks/useOrgAdminTenant";

const AnalyticsTab = () => {
    const { allUsersOptions, adminStatsOptions, scopedOrganizationId } = useOrgAdminTenant();
    const { data: adminStats, isLoading: isLoadingStats } = useAdminStats(adminStatsOptions);
    const { data: allUsers } = useAllUsers(allUsersOptions);
    const { data: gradesData } = useGrades({
        organizationId: scopedOrganizationId,
        enabled: allUsersOptions.enabled,
    });

    const students = (allUsers || []).filter((u: any) => u.role === "STUDENT");
    const activeStudents = students.filter((s: any) => s.is_active !== false);

    // Build subjects performance from grades data
    const subjectsPerformance = (gradesData || []).flatMap((grade: any) =>
        (grade.subjects || []).map((subject: any) => ({
            name: subject.name,
            topics: subject.topics?.length || 0,
        }))
    ).slice(0, 6);

    // Build grade distribution from grades data
    const gradeDistribution = (gradesData || []).map((grade: any) => ({
        name: grade.name,
        value: grade.students_count || grade.studentsCount || 0,
        color: grade.level === "PRIMARY" ? "#10b981" :
            grade.level === "MIDDLE" ? "#3b82f6" : "#8b5cf6"
    })).filter((g: any) => g.value > 0);

    return (
        <div className="space-y-6">
            {scopedOrganizationId && (
                <p className="text-xs text-muted-foreground rounded-lg border border-border bg-muted/30 px-4 py-2">
                    جميع الأرقام والرسومات أدناه تخص مؤسستك فقط.
                </p>
            )}
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">إجمالي الصفوف</p>
                            <p className="text-2xl font-bold">
                                {isLoadingStats ? <Skeleton className="h-8 w-12" /> : (adminStats?.totalGrades || 0)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">إجمالي الطلاب</p>
                            <p className="text-2xl font-bold">
                                {isLoadingStats ? <Skeleton className="h-8 w-12" /> : (adminStats?.totalStudents || students.length)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">إجمالي المواد</p>
                            <p className="text-2xl font-bold">
                                {isLoadingStats ? <Skeleton className="h-8 w-12" /> : (adminStats?.totalSubjects || 0)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">إجمالي الدروس</p>
                            <p className="text-2xl font-bold">
                                {isLoadingStats ? <Skeleton className="h-8 w-12" /> : (adminStats?.totalTopics || 0)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">المواد الدراسية (عدد الدروس)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {subjectsPerformance.length > 0 ? (
                            <div className="h-[300px] w-full" dir="ltr">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={subjectsPerformance}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <RechartsTooltip />
                                        <Bar dataKey="topics" fill="#10b981" radius={[4, 4, 0, 0]} name="الدروس" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                لا توجد بيانات كافية لعرض الرسم البياني
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">توزيع الطلاب حسب الصف</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {gradeDistribution.length > 0 ? (
                            <>
                                <div className="h-[250px] w-full flex items-center justify-center" dir="ltr">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={gradeDistribution}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {gradeDistribution.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center mt-4">
                                    {gradeDistribution.map((item: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-1 text-sm">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span>{item.name} ({item.value})</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                لا توجد بيانات كافية لعرض الرسم البياني
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Grades Summary */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">ملخص الصفوف الدراسية</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {(gradesData || []).slice(0, 6).map((grade: any, i: number) => (
                            <div key={grade.id} className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center font-bold">
                                    {i + 1}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <span className="font-medium">{grade.name}</span>
                                        <span className="text-sm text-muted-foreground">
                                            {grade.subjects?.length || 0} مواد · {(grade.students_count || 0)} طالب
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary"
                                            style={{
                                                width: `${Math.min(100, ((grade.subjects?.length || 0) / Math.max(1, ...((gradesData || []).map((g: any) => g.subjects?.length || 0)))) * 100)}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(gradesData || []).length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                لا توجد بيانات لعرضها
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AnalyticsTab;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { TrendingUp, Users, BookOpen, Gamepad2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser, useTeacherProfile, useHostedChallengeResults, useActiveChallengesByHost, useStudentsInGrade, useGradeSubjectProgress, useSubject } from "@/hooks/useDatabase";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import { averageChallengeResultScorePercent, getChallengeResultScorePercent } from "@/lib/challengeResultScore";

const TeacherAnalyticsTab = () => {
    const { t, locale } = useDashboardLocale();
    const { data: user } = useUser();
    const { data: profile } = useTeacherProfile(user?.id || "");
    const { data: hostedResults, isLoading } = useHostedChallengeResults(user?.id || "", 50);
    const { data: activeChallenges } = useActiveChallengesByHost(user?.id || "");
    const { data: gradeStudents } = useStudentsInGrade(profile?.grade_id || "");
    const { data: gradeSubjectProgress, isLoading: isLoadingAnalytics } = useGradeSubjectProgress(profile?.grade_id || "", profile?.subject_id || "");
    const { data: teacherSubject } = useSubject(profile?.subject_id || "", profile?.id);

    const uniqueStudentsParticipated = new Set((hostedResults || []).map((r: any) => r.user_id || r.userId));
    const uniqueStudents = uniqueStudentsParticipated.size;
    const totalChallenges = (hostedResults || []).length;

    const subjectProgressList = (gradeSubjectProgress || []).filter((sp: any) =>
        uniqueStudentsParticipated.has(sp.student_id) || uniqueStudentsParticipated.has(sp.student?.user_id)
    );

    const averageScore = subjectProgressList.length > 0
        ? Math.round(subjectProgressList.reduce((acc: number, r: any) => acc + (r.average_score || 0), 0) / subjectProgressList.length)
        : totalChallenges > 0
            ? averageChallengeResultScorePercent(hostedResults!)
            : Math.max(0, Math.min(100, Math.round(Number(profile?.average_score) || 0)));

    const scoreRanges = [
        { name: "90-100%", count: 0, color: "#10b981" },
        { name: "70-89%", count: 0, color: "#3b82f6" },
        { name: "50-69%", count: 0, color: "#f59e0b" },
        { name: t("dash.teacher.scoreBelow50"), count: 0, color: "#ef4444" },
    ];

    if (subjectProgressList.length > 0) {
        subjectProgressList.forEach((r: any) => {
            const score = r.average_score || 0;
            if (score >= 90) scoreRanges[0].count++;
            else if (score >= 70) scoreRanges[1].count++;
            else if (score >= 50) scoreRanges[2].count++;
            else scoreRanges[3].count++;
        });
    } else {
        (hostedResults || []).forEach((r: any) => {
            const score = getChallengeResultScorePercent(r);
            if (score >= 90) scoreRanges[0].count++;
            else if (score >= 70) scoreRanges[1].count++;
            else if (score >= 50) scoreRanges[2].count++;
            else scoreRanges[3].count++;
        });
    }

    const dailyMap = new Map<string, number>();
    (hostedResults || []).forEach((r: any) => {
        const date = r.created_at ? new Date(r.created_at).toLocaleDateString(locale, { month: 'short', day: 'numeric' }) : "—";
        dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
    });
    const dailyActivity = Array.from(dailyMap.entries()).map(([date, count]) => ({
        date,
        challenges: count
    })).slice(-7);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{t("dash.teacher.stats.lessons")}</p>
                            <p className="text-2xl font-bold">
                                {isLoading ? <Skeleton className="h-7 w-10" /> : (teacherSubject?.topics?.length || profile?.total_topics || 0)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{t("dash.teacher.stats.students")}</p>
                            <p className="text-2xl font-bold">
                                {isLoading ? <Skeleton className="h-7 w-10" /> : uniqueStudents}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                            <Gamepad2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{t("dash.teacher.stats.challenges")}</p>
                            <p className="text-2xl font-bold">
                                {isLoading ? <Skeleton className="h-7 w-10" /> : totalChallenges}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{t("dash.teacher.stats.averageShort")}</p>
                            <p className="text-2xl font-bold">
                                {isLoading ? <Skeleton className="h-7 w-10" /> : `${averageScore}%`}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{t("dash.teacher.analytics.scoreDistTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {scoreRanges.some(s => s.count > 0) ? (
                            <div className="h-[280px] w-full flex items-center justify-center" dir="ltr">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={scoreRanges.filter(s => s.count > 0)}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={3}
                                            dataKey="count"
                                        >
                                            {scoreRanges.filter(s => s.count > 0).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                                {t("dash.teacher.scoreNoData")}
                            </div>
                        )}
                        <div className="flex flex-wrap gap-3 justify-center mt-2">
                            {scoreRanges.map((range, i) => (
                                <div key={i} className="flex items-center gap-1 text-xs">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: range.color }} />
                                    <span>{range.name} ({range.count})</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">{t("dash.teacher.analytics.dailyActivity")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {dailyActivity.length > 0 ? (
                            <div className="h-[280px] w-full" dir="ltr">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dailyActivity}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <RechartsTooltip />
                                        <Bar dataKey="challenges" fill="#8b5cf6" radius={[4, 4, 0, 0]} name={t("dash.teacher.analytics.challengesBar")} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                                {t("dash.teacher.scoreNoData")}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{t("dash.teacher.analytics.activeNowTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                    {(activeChallenges || []).length > 0 ? (
                        <div className="space-y-3">
                            {(activeChallenges || []).map((ch: any) => (
                                <div key={ch.id} className="flex items-center gap-4 p-3 rounded-xl bg-muted/50">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{ch.topic?.title || t("dash.teacher.challengeFallback")}</p>
                                        <p className="text-xs text-muted-foreground">PIN: {ch.pin}</p>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm font-bold">
                                        <Users className="w-3 h-3" />
                                        {ch.players?.length || 0}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 text-muted-foreground">
                            {t("dash.teacher.noActiveChallenges")}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default TeacherAnalyticsTab;

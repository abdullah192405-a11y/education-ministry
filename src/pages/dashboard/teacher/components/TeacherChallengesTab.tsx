import {
    Gamepad2, Zap, Users, Calendar, History,
    Trophy, Clock, Eye, Copy, ArrowRight, Play, Radio,
    Trash2, StopCircle, RefreshCw, BarChart3, PieChart,
    CheckCircle2, XCircle, Info, ChevronLeft, Share2, MessageCircle, Twitter, Send, Download,
    Filter, Loader2, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
    useUser,
    useTeacherProfile,
    useHostedChallengeResults,
    useHostedSessions,
    useTeacherSingleChallengeResults,
    useTopic
} from "@/hooks/useDatabase";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { isScheduledTeacherChallenge } from "@/lib/teacherScheduledChallenge";
import {
    downloadChallengeResultsCsv,
    type ChallengeReportCsvOptions,
} from "@/lib/challengeReportDownload";
import { downloadChallengeReportPdf } from "@/lib/challengeReportPdf";
import { useToast } from "@/hooks/use-toast";

const SINGLE_HISTORY_ALL_MONTHS = "__all_months__";
const SINGLE_HISTORY_ALL_DAYS = "__all_days__";

function parseSessionDate(s: { endedAt?: string; date?: string; created_at?: string }): Date | null {
    const raw = s?.endedAt || s?.created_at;
    if (raw) {
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
}

/** يدمج كل جلسات الفردي المطابقة للفلتر (شهر/يوم) حتى تظهر كل المحاولات وليس آخر جلسة فقط */
function buildMergedSessionForFilter(sessions: any[]): any | null {
    if (!sessions.length) return null;
    if (sessions.length === 1) return sessions[0];

    const base = { ...sessions[0] };
    const resultsList: any[] = [];
    let topScore = 0;
    let topStudent = "";

    for (const sess of sessions) {
        const list = sess.resultsList || [];
        list.forEach((r: any, i: number) => {
            const uid =
                r.id != null ? `${sess.id}-${r.id}` : `${sess.id}-row-${i}`;
            resultsList.push({ ...r, id: uid });
            if ((r.score || 0) > topScore) {
                topScore = r.score || 0;
                topStudent =
                    r.name ||
                    r.user?.name ||
                    r.participant_display_name ||
                    topStudent;
            }
        });
    }

    const n = resultsList.length;
    const totalPct = resultsList.reduce(
        (acc, r) => acc + (r.percentage ?? r.score ?? 0),
        0
    );
    const avgScore = n > 0 ? Math.round(totalPct / n) : 0;

    return {
        ...base,
        id: `merged-${sessions[0]?.id ?? "x"}-${sessions.length}`,
        resultsList,
        finishedPlayers: n,
        participants: n,
        totalScore: totalPct,
        topScore,
        topStudent: topStudent || base.topStudent || "",
        avgScore,
        sessionCountInView: sessions.length,
        date:
            n > 0
                ? `مجمّع ${sessions.length} جلسة (${n} محاولة)`
                : base.date,
        timeLabel: "—",
    };
}

interface Challenge {
    id: number;
    topicId: number;
    gradeId?: string;
    subjectId?: string;
    pin: string;
    topicTitle: string;
    mode: "group" | "single";
    players: any[];
    playersCount: number;
    status: "playing" | "waiting" | "finished";
    startedAt: string;
    type: "admin" | "user";
    category?: string;
    scheduledStartTime?: string;
    scheduledEndTime?: string;
}

interface TeacherChallengesTabProps {
    gradeId?: string;
    subjectId?: string;
    activeChallenges: Challenge[];
    onStartChallenge?: (pin: string, topicId: string) => void;
    onDeleteChallenge?: (pin: string) => void;
    onCopyToClipboard: (text: string) => void;
}

// --- Sub-component for Challenge Details ---
const ChallengeDetailsContent = ({ session }: { session: any }) => {
    const { toast } = useToast();
    const [pdfExporting, setPdfExporting] = useState(false);
    const { data: topic, isLoading: loadingTopic } = useTopic(session?.topicId || "");
    const results = useMemo(() => session?.resultsList || [], [session]);

    const stats = useMemo(() => {
        if (!results || results.length === 0) return null;

        const totalAccuracy = results.reduce((acc: number, r: any) => acc + (r.percentage || 0), 0);
        const avgAccuracy = Math.round(totalAccuracy / results.length);

        const totalTime = results.reduce((acc: number, r: any) => acc + (r.time_taken || 0), 0);
        const avgTime = Math.round(totalTime / results.length);

        // Question Analysis
        const questionStats = new Map<string, { correct: number, total: number, time: number }>();

        results.forEach((r: any) => {
            const qRes = r.question_results || [];
            qRes.forEach((q: any) => {
                const qId = String(q.questionId);
                const current = questionStats.get(qId) || { correct: 0, total: 0, time: 0 };
                questionStats.set(qId, {
                    correct: current.correct + (q.correct ? 1 : 0),
                    total: current.total + 1,
                    time: current.time + (q.timeTaken || 0)
                });
            });
        });

        return {
            avgAccuracy,
            avgTime,
            averageScore: Math.round(
                results.reduce((acc: number, r: any) => acc + (r.score || 0), 0) / results.length
            ),
            memberParticipants: results.filter((r: any) => !!r.user?.id).length,
            guestParticipants: results.filter((r: any) => !r.user?.id).length,
            questionStats: Array.from(questionStats.entries()).map(([id, data]) => ({
                id,
                ...data,
                accuracy: Math.round((data.correct / data.total) * 100),
                avgTime: Math.round(data.time / data.total)
            }))
        };
    }, [results]);

    const reportOptions = useMemo((): ChallengeReportCsvOptions => {
        const questionRows =
            topic?.challengeItems?.map((q: any, idx: number) => {
                const qStat = stats?.questionStats.find((s) => s.id === String(q.id)) || {
                    accuracy: 0,
                    correct: 0,
                    total: 0,
                };
                return {
                    questionText: `${idx + 1}. ${String(q.question || "")}`,
                    accuracy: qStat.accuracy,
                    correct: qStat.correct,
                    total: qStat.total,
                };
            }) || [];

        return {
            topicTitle: (topic as any)?.title || session?.topicTitle || "تحدي",
            sessionDate: session?.date,
            sessionTime: session?.timeLabel,
            mergedSessionsNote:
                typeof session?.sessionCountInView === "number" && session.sessionCountInView > 1
                    ? `مدموج من ${session.sessionCountInView} جلسة`
                    : undefined,
            results: session?.resultsList || [],
            questionRows: questionRows.length > 0 ? questionRows : undefined,
        };
    }, [session, topic, stats]);

    const handleDownloadCsv = useCallback(() => {
        downloadChallengeResultsCsv(reportOptions);
        toast({
            title: "تم التحميل",
            description: "تم حفظ ملف التقرير (CSV) على جهازك.",
        });
    }, [reportOptions, toast]);

    const handleDownloadPdf = useCallback(async () => {
        setPdfExporting(true);
        try {
            await downloadChallengeReportPdf(reportOptions);
            toast({
                title: "تم التحميل",
                description: "تم حفظ التقرير (PDF) على جهازك.",
            });
        } catch (e) {
            console.error(e);
            toast({
                title: "تعذر إنشاء PDF",
                description: "حاول مرة أخرى أو نزّل نسخة CSV.",
                variant: "destructive",
            });
        } finally {
            setPdfExporting(false);
        }
    }, [reportOptions, toast]);

    if (loadingTopic) return <div className="p-12 flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;
    if (!session) return null;

    return (
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-3 pb-2 border-b shrink-0 bg-muted/10">
                <span className="text-xs text-muted-foreground">تصدير التقرير</span>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="gap-2 shrink-0"
                        disabled={pdfExporting}
                        onClick={() => void handleDownloadPdf()}
                    >
                        {pdfExporting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <FileText className="w-4 h-4" />
                        )}
                        تحميل PDF
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 shrink-0"
                        disabled={pdfExporting}
                        onClick={handleDownloadCsv}
                    >
                        <Download className="w-4 h-4" />
                        CSV
                    </Button>
                </div>
            </div>
        <Tabs defaultValue="overview" dir="rtl" className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="px-6 border-b">
                <TabsList className="bg-transparent h-12 gap-6 p-0 border-none">
                    <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-full px-1">
                        <BarChart3 className="w-4 h-4 me-2" />
                        نظرة عامة
                    </TabsTrigger>
                    <TabsTrigger value="participants" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-full px-1">
                        <Users className="w-4 h-4 me-2" />
                        المشاركون
                    </TabsTrigger>
                    <TabsTrigger value="questions" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-full px-1">
                        <PieChart className="w-4 h-4 me-2" />
                        تحليل الأسئلة
                    </TabsTrigger>
                </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                <TabsContent value="overview" className="mt-0 space-y-6">
                    {/* General Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="bg-primary/5 border-none shadow-none">
                            <CardContent className="p-4 text-center">
                                <div className="text-3xl font-black text-primary mb-1">{stats?.avgAccuracy || 0}%</div>
                                <div className="text-xs font-bold text-muted-foreground uppercase">متوسط الدقة</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-emerald-50 border-none shadow-none">
                            <CardContent className="p-4 text-center">
                                <div className="text-3xl font-black text-emerald-600 mb-1">{session.participants}</div>
                                <div className="text-xs font-bold text-muted-foreground uppercase">إجمالي المشاركين</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-amber-50 border-none shadow-none">
                            <CardContent className="p-4 text-center">
                                <div className="text-3xl font-black text-amber-600 mb-1">{session.topScore}</div>
                                <div className="text-xs font-bold text-muted-foreground uppercase">أعلى نقطة</div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="bg-sky-50 border-none shadow-none">
                            <CardContent className="p-4 text-center">
                                <div className="text-3xl font-black text-sky-600 mb-1">{stats?.averageScore || 0}</div>
                                <div className="text-xs font-bold text-muted-foreground uppercase">متوسط النقاط</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-indigo-50 border-none shadow-none">
                            <CardContent className="p-4 text-center">
                                <div className="text-3xl font-black text-indigo-600 mb-1">{stats?.memberParticipants || 0}</div>
                                <div className="text-xs font-bold text-muted-foreground uppercase">أعضاء مسجلون</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-violet-50 border-none shadow-none">
                            <CardContent className="p-4 text-center">
                                <div className="text-3xl font-black text-violet-600 mb-1">{stats?.guestParticipants || 0}</div>
                                <div className="text-xs font-bold text-muted-foreground uppercase">مشاركون ضيوف</div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 font-bold text-lg border-s-4 border-primary ps-3 py-1">
                            تفاصيل التحدي
                        </div>
                        <div className="grid grid-cols-2 gap-y-6 text-sm bg-muted/20 p-6 rounded-2xl border border-border/50">
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">التاريخ</span>
                                <span className="font-bold flex items-center gap-2 text-base"><Calendar className="w-4 h-4 text-primary" /> {session.date}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">الـوقـت</span>
                                <span className="font-bold flex items-center gap-2 text-base"><Clock className="w-4 h-4 text-primary" /> {session.timeLabel || "—"}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">المركز الأول</span>
                                <span className="font-bold flex items-center gap-2 text-base text-amber-600"><Trophy className="w-4 h-4" /> {session.topStudent || "—"}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">عدد الأسئلة</span>
                                <span className="font-bold flex items-center gap-2 text-base"><BarChart3 className="w-4 h-4 text-primary" /> {topic?.challengeItems?.length || 0} سؤال</span>
                            </div>
                        </div>
                    </div>

                    {stats && stats.avgTime > 0 && (
                        <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/50 flex items-center gap-5 shadow-sm">
                            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                                <Zap className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <div className="font-black text-blue-950">تحليل سرعة الاستجابة</div>
                                <div className="text-sm text-blue-800/80 leading-relaxed">استغرق الطلاب في المتوسط <span className="font-black text-blue-900 border-b-2 border-blue-300">{stats.avgTime} ثانية</span> لإكمال التحدي بالكامل.</div>
                            </div>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="participants" className="mt-0 space-y-3">
                    {results.length > 0 ? (
                        [...results]
                            .sort((a, b) => (b.score || 0) - (a.score || 0))
                            .map((res: any, index: number) => (
                                <div key={res.id} className="flex items-center gap-4 p-4 rounded-2xl border bg-background hover:border-primary/30 transition-all shadow-sm group">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 shadow-sm
                                        ${index === 0 ? "bg-amber-400 text-white" : index === 1 ? "bg-slate-300 text-slate-700" : index === 2 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"}
                                    `}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-base group-hover:text-primary transition-colors text-start">
                                            {res.user?.name || res.name || res.participant_display_name || "طالب"}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
                                            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 font-bold"><CheckCircle2 className="w-3 h-3" /> {res.correct_answers || 0}</span>
                                            <span className="flex items-center gap-1.5 bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-100 font-bold"><XCircle className="w-3 h-3" /> {res.wrong_answers || 0}</span>
                                            <span className="flex items-center gap-1.5 bg-slate-50 text-slate-700 px-2 py-0.5 rounded-full border border-slate-100 font-bold"><Clock className="w-3 h-3" /> {res.time_taken || 0}ث</span>
                                            {!res.user?.id && (
                                                <span className="flex items-center gap-1.5 bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full border border-violet-100 font-bold">زائر</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-end shrink-0">
                                        <div className="font-black text-xl text-primary leading-none">{(res.percentage || 0).toFixed(0)}<span className="text-xs ms-0.5">%</span></div>
                                        <div className="text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-tight">{res.score || 0} نقطة</div>
                                    </div>
                                </div>
                            ))
                    ) : (
                        <div className="text-center py-24 text-muted-foreground bg-muted/10 rounded-3xl border-2 border-dashed">
                            <Users className="w-16 h-16 mx-auto mb-4 opacity-10" />
                            <p className="font-bold">لا يوجد بيانات للمشاركين لهذا التحدي</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="questions" className="mt-0 space-y-4">
                    {topic?.challengeItems && topic.challengeItems.length > 0 ? (
                        topic.challengeItems.map((q: any, idx: number) => {
                            const qStat = stats?.questionStats.find(s => s.id === String(q.id)) || { accuracy: 0, correct: 0, total: 0 };
                            return (
                                <div key={q.id} className="p-5 rounded-2xl border bg-muted/10 hover:bg-muted/20 transition-colors space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="font-bold text-sm leading-relaxed flex-1">
                                            <span className="bg-primary/10 text-primary w-6 h-6 inline-flex items-center justify-center rounded-lg text-[10px] font-black me-3 mb-1">
                                                {idx + 1}
                                            </span>
                                            {q.question}
                                        </div>
                                        <Badge variant="outline" className={`shrink-0 rounded-full px-3 py-1 font-black ${qStat.accuracy > 70 ? "border-emerald-200 bg-emerald-50 text-emerald-600" : qStat.accuracy > 40 ? "border-amber-200 bg-amber-50 text-amber-600" : "border-red-200 bg-red-50 text-red-600"}`}>
                                            {qStat.accuracy}%
                                        </Badge>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                            <span>معدل الإجابات الصحيحة</span>
                                            <span>{qStat.correct} من {qStat.total || session.participants} طلاب</span>
                                        </div>
                                        <div className="relative h-2 w-full bg-background rounded-full overflow-hidden border">
                                            <div
                                                className={`absolute top-0 start-0 h-full transition-all duration-500 ${qStat.accuracy > 70 ? "bg-emerald-500" : qStat.accuracy > 40 ? "bg-amber-500" : "bg-red-500"}`}
                                                style={{ width: `${qStat.accuracy}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-24 text-muted-foreground bg-muted/10 rounded-3xl border-2 border-dashed">
                            <PieChart className="w-16 h-16 mx-auto mb-4 opacity-10" />
                            <p className="font-bold">لا يوجد بيانات لتحليل الأسئلة</p>
                        </div>
                    )}
                </TabsContent>
            </div>
        </Tabs>
        </div>
    );
};

type SingleTopicHistoryGroup = {
    topicId: string;
    topicTitle: string;
    sessions: any[];
    latestEndedAt?: string;
    totalAttempts: number;
    weightedAvg: number;
    topStudent: string;
    sessionCount: number;
};

const TeacherChallengesTab = ({ activeChallenges, onCopyToClipboard, gradeId, subjectId, onStartChallenge, onDeleteChallenge }: TeacherChallengesTabProps) => {
const navigate = useNavigate();
    const [selectedHistory, setSelectedHistory] = useState<any>(null);
    const [selectedSingleTopicGroup, setSelectedSingleTopicGroup] = useState<SingleTopicHistoryGroup | null>(null);
    /** YYYY-MM or "" = كل الشهور */
    const [singleHistoryMonth, setSingleHistoryMonth] = useState("");
    /** 1–31 أو null = كل الأيام (ضمن الشهر المحدد) */
    const [singleHistoryDay, setSingleHistoryDay] = useState<number | null>(null);
    const { data: user } = useUser();
    const { data: teacherProfile } = useTeacherProfile(user?.id || "");
    const { data: hostedResults } = useHostedChallengeResults(user?.id || "", 500);
    const { data: hostedSessions, isLoading } = useHostedSessions(user?.id || "");
    const { data: topicOwnedSingleResults } = useTeacherSingleChallengeResults(teacherProfile?.id || "", 1000);

    const downloadChallengeQR = async (link: string, pin: string) => {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&data=${encodeURIComponent(link)}`;
        try {
            const response = await fetch(qrUrl);
            if (!response.ok) throw new Error("QR fetch failed");

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = objectUrl;
            anchor.download = `challenge-join-${pin}.png`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(objectUrl);
        } catch (error) {
            console.error("Failed to download challenge QR:", error);
        }
    };
    
    const scheduledChallenges = useMemo(
        () => activeChallenges.filter(isScheduledTeacherChallenge),
        [activeChallenges]
    );

    const trulyActiveChallenges = useMemo(
        () => activeChallenges.filter(c => !isScheduledTeacherChallenge(c)),
        [activeChallenges]
    );

    // Derive challenge history from hosted sessions AND results
    const historyChallenges = useMemo(() => {
        const map = new Map<string, any>();
        const playerNameBySessionUser = new Map<string, string>();
        (hostedSessions || []).forEach((session: any) => {
            (session.players || []).forEach((player: any) => {
                const uid = player.user_id || player.user?.id;
                if (!uid) return;
                if (!playerNameBySessionUser.has(`${session.id}:${uid}`)) {
                    playerNameBySessionUser.set(`${session.id}:${uid}`, player.name || player.user?.name || "طالب");
                }
            });
        });
        const mergedResults = [
            ...(hostedResults || []),
            ...((topicOwnedSingleResults || []).filter((single: any) =>
                !(hostedResults || []).some((r: any) => r.id === single.id)
            ))
        ];

        // 1. Process Finished Sessions
        (hostedSessions || []).forEach((session: any) => {
            if (session.status !== "FINISHED" && session.status !== "RESULT" && session.status !== "LEADERBOARD") return;

            map.set(session.id, {
                id: session.id,
                topicId: session.topic_id,
                topicTitle: session.topic?.title || "تحدي جماعي",
                mode: session.mode,
                date: session.created_at ? new Date(session.created_at).toLocaleDateString('ar-SA') : "—",
                timeLabel: session.created_at ? new Date(session.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : "—",
                endedAt: session.finished_at || session.updated_at || session.created_at,
                participants: session.players?.length || 0,
                totalScore: 0,
                topStudent: "",
                topScore: 0,
                finishedPlayers: 0,
                resultsList: []
            });
        });

        // 2. Process Results
        (mergedResults || []).forEach((r: any) => {
            const sessionId = r.session_id || r.sessionId || r.session?.id;
            if (!sessionId) return;
            if (!map.has(sessionId)) {
                map.set(sessionId, {
                    id: sessionId,
                    topicId: r.session?.topic_id || r.topic_id,
                    topicTitle: r.session?.topic?.title || r.topic_title || "تحدي",
                    mode: r.session?.mode || "SINGLE",
                    date: r.created_at ? new Date(r.created_at).toLocaleDateString('ar-SA') : "—",
                    timeLabel: r.created_at ? new Date(r.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : "—",
                    endedAt: r.created_at,
                    participants: 0,
                    totalScore: 0,
                    topStudent: "",
                    topScore: 0,
                    finishedPlayers: 0,
                    resultsList: []
                });
            }
            const ch = map.get(sessionId)!;
            if (r.created_at && (!ch.endedAt || new Date(r.created_at) > new Date(ch.endedAt))) {
                ch.endedAt = r.created_at;
            }
            const resultUserId = r.user_id || r.user?.id;
            const fallbackName = resultUserId
                ? playerNameBySessionUser.get(`${sessionId}:${resultUserId}`) || playerNameBySessionUser.get(`${r.session?.id}:${resultUserId}`)
                : undefined;
            const normalizedResult = {
                ...r,
                name: r.name || r.user?.name || r.participant_display_name || fallbackName || "طالب",
            };
            ch.finishedPlayers += 1;
            ch.resultsList.push(normalizedResult);
            ch.totalScore += r.percentage || r.score || 0;
            if ((r.score || 0) > ch.topScore) {
                ch.topScore = r.score || 0;
                ch.topStudent = normalizedResult.name;
            }
            if (ch.finishedPlayers > ch.participants) {
                ch.participants = ch.finishedPlayers;
            }
        });

        // 3. Merge guest/non-member completions from player_sessions
        (hostedSessions || []).forEach((session: any) => {
            const sessionId = session.id;
            if (!map.has(sessionId)) return;

            const ch = map.get(sessionId)!;
            const resultUserIds = new Set(
                (ch.resultsList || [])
                    .map((r: any) => r.user_id || r.user?.id)
                    .filter((id: any) => !!id)
            );

            const playerOnlyResults = (session.players || [])
                .filter((p: any) => !p.is_host)
                .filter((p: any) => {
                    const uid = p.user_id || p.user?.id;
                    if (uid && resultUserIds.has(uid)) return false;
                    const ca = p.correct_answers || 0;
                    const wa = p.wrong_answers || 0;
                    const played = ca + wa > 0 || (p.score || 0) > 0;
                    return played;
                })
                .map((p: any) => {
                    const ca = p.correct_answers || 0;
                    const wa = p.wrong_answers || 0;
                    const percentage = ca + wa > 0 ? Math.round((ca / (ca + wa)) * 100) : 0;
                    return {
                        id: `ps-${p.id}`,
                        user: null,
                        name: p.name || "زائر",
                        user_id: p.user_id || null,
                        session_id: sessionId,
                        score: p.score || 0,
                        correct_answers: ca,
                        wrong_answers: wa,
                        percentage,
                        time_taken: p.time_taken || 0,
                        question_results: [],
                    };
                });

            playerOnlyResults.forEach((guestResult: any) => {
                ch.finishedPlayers += 1;
                ch.resultsList.push(guestResult);
                ch.totalScore += guestResult.percentage || guestResult.score || 0;
                if ((guestResult.score || 0) > ch.topScore) {
                    ch.topScore = guestResult.score || 0;
                    ch.topStudent = guestResult.name || "زائر";
                }
            });

            const joinedPlayersCount = (session.players || []).filter((p: any) => !p.is_host).length;
            if (joinedPlayersCount > ch.participants) {
                ch.participants = joinedPlayersCount;
            }
        });

        return Array.from(map.values())
            .map(ch => ({
                ...ch,
                avgScore: ch.finishedPlayers > 0 ? Math.round(ch.totalScore / ch.finishedPlayers) : 0,
            }))
            .sort((a, b) => {
                const tb = new Date(b.endedAt || b.date || 0).getTime();
                const ta = new Date(a.endedAt || a.date || 0).getTime();
                return tb - ta;
            });
    }, [hostedSessions, hostedResults, topicOwnedSingleResults]);

    const isChallengeSingleMode = (mode: unknown) =>
        String(mode ?? "").toUpperCase() === "SINGLE";

    /** Group sessions stay one row each; all SINGLE sessions for the same topic appear under one row + one detail dialog with per-session tabs. */
    const { historyGroupChallenges, historySingleTopicGroups } = useMemo(() => {
        const list = historyChallenges || [];
        const groupRows = list.filter((ch) => !isChallengeSingleMode(ch.mode));
        const singles = list.filter((ch) => isChallengeSingleMode(ch.mode));

        const topicMap = new Map<
            string,
            { topicId: string; topicTitle: string; sessions: typeof list }
        >();
        for (const ch of singles) {
            const tid = ch.topicId != null ? String(ch.topicId) : "unknown";
            const cur = topicMap.get(tid);
            if (!cur) {
                topicMap.set(tid, {
                    topicId: tid,
                    topicTitle: ch.topicTitle || "تحدي فردي",
                    sessions: [ch],
                });
            } else {
                cur.sessions.push(ch);
                if (!cur.topicTitle && ch.topicTitle) cur.topicTitle = ch.topicTitle;
            }
        }

        const singleTopicGroups = Array.from(topicMap.values())
            .map((g) => {
                const sessions = [...g.sessions].sort(
                    (a, b) =>
                        new Date(b.endedAt || b.date || 0).getTime() -
                        new Date(a.endedAt || a.date || 0).getTime()
                );
                const latestEndedAt = sessions[0]?.endedAt || sessions[0]?.date;
                const totalAttempts = sessions.reduce(
                    (acc, s) => acc + (s.finishedPlayers || s.participants || 0),
                    0
                );
                const weightedAvg =
                    totalAttempts > 0
                        ? Math.round(
                              sessions.reduce(
                                  (acc, s) =>
                                      acc +
                                      (s.avgScore || 0) *
                                          (s.finishedPlayers || s.participants || 0),
                                  0
                              ) / totalAttempts
                          )
                        : 0;
                const topSession = sessions.reduce(
                    (best, s) =>
                        (s.topScore || 0) > (best?.topScore || 0) ? s : best,
                    sessions[0] as (typeof sessions)[0] | undefined
                );
                return {
                    topicId: g.topicId,
                    topicTitle: g.topicTitle,
                    sessions,
                    latestEndedAt,
                    totalAttempts,
                    weightedAvg,
                    topStudent: topSession?.topStudent || "",
                    sessionCount: sessions.length,
                };
            })
            .sort(
                (a, b) =>
                    new Date(b.latestEndedAt || 0).getTime() -
                    new Date(a.latestEndedAt || 0).getTime()
            );

        return { historyGroupChallenges: groupRows, historySingleTopicGroups: singleTopicGroups };
    }, [historyChallenges]);

    const singleTopicMonthOptions = useMemo(() => {
        if (!selectedSingleTopicGroup) return [] as { value: string; label: string }[];
        const byKey = new Map<string, string>();
        for (const s of selectedSingleTopicGroup.sessions) {
            const d = parseSessionDate(s);
            if (!d) continue;
            const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            if (!byKey.has(value)) {
                byKey.set(
                    value,
                    d.toLocaleDateString("ar-SA", { year: "numeric", month: "long" })
                );
            }
        }
        return [...byKey.entries()]
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([value, label]) => ({ value, label }));
    }, [selectedSingleTopicGroup]);

    const singleTopicDayOptions = useMemo(() => {
        if (!selectedSingleTopicGroup || !singleHistoryMonth) return [] as number[];
        const [y, m] = singleHistoryMonth.split("-").map(Number);
        const days = new Set<number>();
        for (const s of selectedSingleTopicGroup.sessions) {
            const d = parseSessionDate(s);
            if (!d) continue;
            if (d.getFullYear() !== y || d.getMonth() + 1 !== m) continue;
            days.add(d.getDate());
        }
        return [...days].sort((a, b) => a - b);
    }, [selectedSingleTopicGroup, singleHistoryMonth]);

    const filteredSingleTopicSessions = useMemo(() => {
        if (!selectedSingleTopicGroup) return [];
        return selectedSingleTopicGroup.sessions
            .filter((s) => {
                const d = parseSessionDate(s);
                if (!d) {
                    return !singleHistoryMonth && singleHistoryDay == null;
                }
                if (singleHistoryMonth) {
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                    if (key !== singleHistoryMonth) return false;
                }
                if (singleHistoryDay != null && d.getDate() !== singleHistoryDay) return false;
                return true;
            })
            .sort(
                (a, b) =>
                    (parseSessionDate(b)?.getTime() || 0) - (parseSessionDate(a)?.getTime() || 0)
            );
    }, [selectedSingleTopicGroup, singleHistoryMonth, singleHistoryDay]);

    /** دمج كل الجلسات المطابقة للفلتر — كل مشارك/محاولة يظهر (وليس آخر جلسة وحدها) */
    const selectedSingleSession = useMemo(
        () => buildMergedSessionForFilter(filteredSingleTopicSessions),
        [filteredSingleTopicSessions]
    );

    useEffect(() => {
        if (!singleHistoryMonth) setSingleHistoryDay(null);
    }, [singleHistoryMonth]);

    useEffect(() => {
        if (singleHistoryDay == null) return;
        if (singleHistoryMonth && !singleTopicDayOptions.includes(singleHistoryDay)) {
            setSingleHistoryDay(null);
        }
    }, [singleHistoryMonth, singleTopicDayOptions, singleHistoryDay]);

    return (
        <Tabs defaultValue="active" className="space-y-6" dir="rtl">
            <TabsList>
                <TabsTrigger value="active" className="gap-2">
                    <Zap className="w-4 h-4" />
                    التحديات النشطة
                    <Badge variant="secondary" className="me-1 ms-0 px-1 h-5 min-w-[1.25rem]">{trulyActiveChallenges.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="gap-2">
                    <Calendar className="w-4 h-4" />
                    تحديات مجدولة
                    <Badge variant="secondary" className="me-1 ms-0 px-1 h-5 min-w-[1.25rem]">{scheduledChallenges.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                    <History className="w-4 h-4" />
                    سجل التحديات
                </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
                {isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                        <Card key={i} className="border-s-4 border-s-muted overflow-hidden">
                            <CardContent className="p-0">
                                <div className="p-5 pb-4">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <Skeleton className="h-6 w-48 mb-2" />
                                            <div className="flex items-center gap-2">
                                                <Skeleton className="h-5 w-24 rounded-full" />
                                                <Skeleton className="h-4 w-16" />
                                            </div>
                                        </div>
                                        <Skeleton className="w-24 h-20 rounded-xl" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-5 w-5 rounded" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                </div>
                                <div className="bg-muted/20 border-t border-b p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Skeleton className="h-4 w-4 rounded" />
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-5 w-16 rounded-full" />
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {Array.from({ length: 4 }).map((_, j) => (
                                            <Skeleton key={j} className="h-10 rounded-xl" />
                                        ))}
                                    </div>
                                </div>
                                <div className="p-5 pt-4 flex gap-2">
                                    <Skeleton className="h-11 flex-1 rounded-md" />
                                    <Skeleton className="h-11 flex-1 rounded-md" />
                                    <Skeleton className="h-11 w-11 rounded-md" />
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                <>
                {trulyActiveChallenges.length > 0 && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg">
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            تحديث مباشر — يتم تحديث قائمة المشاركين تلقائياً
                        </div>
                        <div className="flex items-center gap-1 opacity-50">
                            <RefreshCw className="w-3 h-3 animate-spin-slow" />
                            كل 5 ثوانٍ
                        </div>
                    </div>
                )}

                {trulyActiveChallenges.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                        {trulyActiveChallenges.map((challenge) => (
                            <Card key={challenge.id} className="border-s-4 border-s-emerald-500 overflow-hidden group">
                                <CardContent className="p-0">
                                    {/* Header Section */}
                                    <div className="p-5 pb-4">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{challenge.topicTitle}</h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Badge variant="outline" className={challenge.status === "playing" ? "border-emerald-500 text-emerald-500 animate-pulse" : "border-amber-500 text-amber-500"}>
                                                        {challenge.status === "playing" ? "جاري اللعب" : "في الانتظار"}
                                                    </Badge>
                                                    <span>•</span>
                                                    <span>منذ {challenge.startedAt}</span>
                                                </div>
                                            </div>
                                            {/* PIN Display */}
                                            <div
                                                className="text-center bg-gradient-to-br from-primary/5 to-primary/10 p-3 rounded-xl border border-primary/20 cursor-pointer hover:border-primary/40 hover:scale-105 transition-all"
                                                onClick={() => onCopyToClipboard(challenge.pin)}
                                                title="انقر للنسخ"
                                            >
                                                <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">رمز الانضمام</span>
                                                <span className="block text-2xl font-mono font-black tracking-widest text-primary" dir="ltr">{challenge.pin}</span>
                                                <span className="block text-[9px] text-muted-foreground mt-0.5">
                                                    <Copy className="w-2.5 h-2.5 inline me-1" />
                                                    انقر للنسخ
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 mb-1">
                                            <div className="flex items-center gap-2">
                                                <Gamepad2 className="w-4 h-4 text-purple-500" />
                                                <span className="text-sm font-medium">تحدي جماعي</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Participants Section — Full Width */}
                                    <div className="bg-muted/20 border-t border-b p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-blue-500" />
                                                <span className="font-bold text-sm">المشاركون المنضمون</span>
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold px-2"
                                                >
                                                    {challenge.players?.length || 0} لاعب
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                                                مباشر
                                            </div>
                                        </div>

                                        {challenge.players && challenge.players.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                                {challenge.players.map((player: any) => (
                                                    <div
                                                        key={player.id}
                                                        className="flex items-center gap-2 p-2 rounded-xl bg-background/60 border border-border/50 hover:border-primary/30 transition-all"
                                                    >
                                                        <img
                                                            src={player.avatar || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${player.name}`}
                                                            alt={player.name}
                                                            className="w-8 h-8 rounded-full border-2 border-background ring-2 ring-primary/10 shrink-0"
                                                        />
                                                        <span className="font-medium text-xs truncate">{player.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-muted-foreground">
                                                <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                                <p className="text-sm">في انتظار انضمام اللاعبين...</p>
                                                <p className="text-xs mt-1">شارك رمز الانضمام <span className="font-mono font-bold text-primary">{challenge.pin}</span> مع الطلاب</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions Section */}
                                    <div className="p-5 pt-4">
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                className="flex-1 min-w-[140px] gap-2 bg-primary hover:bg-primary/90 shadow-sm active:scale-[0.98] transition-all h-11"
                                                size="default"
                                                onClick={() => {
                                                    const cat = challenge.category || "ACTIVITIES";
                                                    const url = `/grade/${challenge.gradeId || gradeId || '0'}/subject/${challenge.subjectId || subjectId || '0'}/topic/${challenge.topicId || '0'}/challenge/group/${cat}/${challenge.pin}?host=true`;
                                                    console.log("Navigating from tab to Control Panel:", url);
                                                    navigate(url);
                                                }}
                                            >
                                                <Eye className="w-5 h-5" />
                                                لوحة التحكم
                                            </Button>

                                            {challenge.status === "waiting" ? (
                                                <Button
                                                    className="flex-1 min-w-[140px] gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-[0.98] transition-all h-11"
                                                    size="default"
                                                    disabled={(challenge.players?.length || 0) < 1}
                                                    onClick={() => {
                                                        if (onStartChallenge) {
                                                            onStartChallenge(challenge.pin, String(challenge.topicId));
                                                        } else {
                                                            const cat = challenge.category || "ACTIVITIES";
                                                            navigate(`/grade/${challenge.gradeId || gradeId || '0'}/subject/${challenge.subjectId || subjectId || '0'}/topic/${challenge.topicId || '0'}/challenge/group/${cat}/${challenge.pin}?host=true`);
                                                        }
                                                    }}
                                                >
                                                    <Play className="w-5 h-5" />
                                                    بدء التحدي
                                                </Button>
                                            ) : (
                                                <Button
                                                    className="flex-1 min-w-[140px] gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-[0.98] transition-all h-11"
                                                    size="default"
                                                    onClick={() => {
                                                        const cat = challenge.category || "ACTIVITIES";
                                                        navigate(`/grade/${challenge.gradeId || gradeId || '0'}/subject/${challenge.subjectId || subjectId || '0'}/topic/${challenge.topicId || '0'}/challenge/group/${cat}/${challenge.pin}?host=true`);
                                                    }}
                                                >
                                                    <RefreshCw className="w-5 h-5" />
                                                    متابعة التحدي
                                                </Button>
                                            )}

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-11 w-11 text-destructive hover:bg-destructive/10 border-destructive/20"
                                                        title="إنهاء وإلغاء التحدي"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent dir="rtl">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>هل أنت متأكد من إنهاء التحدي؟</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            سيتم إغلاق هذا التحدي نهائياً وإزالة رمز الانضمام ({challenge.pin}). لن يتمكن الطلاب من الانضمام أو إكمال اللعب.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter className="flex-row-reverse gap-2">
                                                        <AlertDialogAction
                                                            className="bg-destructive hover:bg-destructive/90"
                                                            onClick={() => onDeleteChallenge && onDeleteChallenge(challenge.pin)}
                                                        >
                                                            إنهاء نهائي
                                                        </AlertDialogAction>
                                                        <AlertDialogCancel>تراجع</AlertDialogCancel>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>

                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-11 w-11"
                                                onClick={() => onCopyToClipboard(challenge.pin)}
                                                title="نسخ رمز الانضمام"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </Button>

                                            <DropdownMenu dir="rtl">
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-11 w-11"
                                                        title="مشاركة التحدي"
                                                    >
                                                        <Share2 className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem onClick={() => {
                                                        const link = `${window.location.origin}/join/${challenge.pin}`;
                                                        const text = `انضم إلى تحدي "${challenge.topicTitle}"! رمز الانضمام: ${challenge.pin}`;
                                                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(link + "\n\n" + text)}`);
                                                    }}>
                                                        <MessageCircle className="w-4 h-4 me-2 text-emerald-500" />
                                                        واتساب
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => {
                                                        const link = `${window.location.origin}/join/${challenge.pin}`;
                                                        const text = `انضم إلى تحدي "${challenge.topicTitle}"! رمز الانضمام: ${challenge.pin}`;
                                                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`, '_blank');
                                                    }}>
                                                        <Twitter className="w-4 h-4 me-2 text-blue-400" />
                                                        تويتر / X
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => {
                                                        const link = `${window.location.origin}/join/${challenge.pin}`;
                                                        const text = `انضم إلى تحدي "${challenge.topicTitle}"! رمز الانضمام: ${challenge.pin}`;
                                                        window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, '_blank');
                                                    }}>
                                                        <Send className="w-4 h-4 me-2 text-sky-500" />
                                                        تيليجرام
                                                    </DropdownMenuItem>
                                                    <div className="h-px bg-border my-1" />
                                                    <DropdownMenuItem onClick={() => {
                                                        const link = `${window.location.origin}/join/${challenge.pin}`;
                                                        onCopyToClipboard(link);
                                                    }}>
                                                        <Copy className="w-4 h-4 me-2" />
                                                        نسخ الرابط
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => {
                                                        const link = `${window.location.origin}/join/${challenge.pin}`;
                                                        downloadChallengeQR(link, challenge.pin);
                                                    }}>
                                                        <Download className="w-4 h-4 me-2" />
                                                        تنزيل QR
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        {challenge.status === "waiting" && (challenge.players?.length || 0) < 1 && (
                                            <p className="text-xs text-amber-600 mt-2 text-center bg-amber-50 py-1 rounded-md border border-amber-100">
                                                <Clock className="w-3 h-3 inline me-1" />
                                                يجب انضمام لاعب واحد على الأقل قبل بدء التحدي
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-muted/30 rounded-xl border-dashed border-2">
                        <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                        <h3 className="text-xl font-bold mb-2">لا توجد تحديات نشطة حالياً</h3>
                        <p className="text-muted-foreground mb-6">قم بإنشاء تحدي جديد من صفحة الدروس لبدء المنافسة</p>
                    </div>
                )}
                </>
                )}
            </TabsContent>

            <TabsContent value="scheduled" className="space-y-4">
                {isLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton key={i} className="h-40 w-full rounded-2xl" />
                    ))
                ) : scheduledChallenges.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                        {scheduledChallenges.map((challenge) => (
                            <Card key={challenge.id} className="border-s-4 border-s-blue-500 overflow-hidden group">
                                <CardContent className="p-0">
                                    <div className="p-5 pb-4">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">{challenge.topicTitle}</h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Badge variant="outline" className="border-blue-500 text-blue-500 bg-blue-50/50">
                                                        <Calendar className="w-3 h-3 me-1" />
                                                        تحدي مجدول
                                                    </Badge>
                                                    {(() => {
                                                        const now = new Date();
                                                        const start = challenge.scheduledStartTime ? new Date(challenge.scheduledStartTime) : null;
                                                        const end = challenge.scheduledEndTime ? new Date(challenge.scheduledEndTime) : null;
                                                        const isLive = start && now >= start && (!end || now <= end);
                                                        
                                                        if (isLive) {
                                                            return (
                                                                <Badge className="bg-emerald-500 border-emerald-500 text-white animate-pulse">
                                                                    <Play className="w-3 h-3 me-1" />
                                                                    متاح للضم حالياً
                                                                </Badge>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                    <span>•</span>
                                                    <span className="font-bold text-blue-700">
                                                        {challenge.scheduledStartTime
                                                            ? `يبدأ في: ${new Date(challenge.scheduledStartTime).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}`
                                                            : "—"}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div
                                                className="text-center bg-blue-50 p-3 rounded-xl border border-blue-100 cursor-pointer hover:border-blue-300 transition-all"
                                                onClick={() => onCopyToClipboard(challenge.pin)}
                                            >
                                                <span className="block text-[10px] text-blue-600 uppercase font-bold tracking-wider">رمز الانضمام</span>
                                                <span className="block text-2xl font-mono font-black tracking-widest text-blue-700" dir="ltr">{challenge.pin}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                                            <div className="flex-1 flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-blue-500" />
                                                <span>
                                                    {challenge.scheduledEndTime
                                                        ? `ينتهي في: ${new Date(challenge.scheduledEndTime).toLocaleString("ar-EG", { timeStyle: "short" })}`
                                                        : "—"}
                                                </span>
                                            </div>
                                            <div className="h-4 w-px bg-border" />
                                            <div className="flex-1 flex items-center gap-2 justify-end">
                                                <Users className="w-4 h-4 text-blue-500" />
                                                <span>{challenge.players?.length || 0} منضمين مسبقاً</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 pt-0 border-t bg-muted/5 flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1 gap-2 border-primary/20 hover:bg-primary/5"
                                            onClick={() => {
                                                const link = `${window.location.origin}/join/${challenge.pin}`;
                                                onCopyToClipboard(link);
                                            }}
                                        >
                                            <Copy className="w-4 h-4 text-primary" />
                                            نسخ الرابط
                                        </Button>
                                        <Button
                                            className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                                            onClick={() => {
                                                const cat = (challenge.category || "ACTIVITIES").toLowerCase();
                                                navigate(`/grade/${challenge.gradeId}/subject/${challenge.subjectId}/topic/${challenge.topicId}/challenge/group/${cat}/${challenge.pin}?host=true&scheduled=1`);
                                            }}
                                        >
                                            <Eye className="w-4 h-4" />
                                            لوحة التحكم
                                        </Button>
                                        
                                        <DropdownMenu dir="rtl">
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="icon" className="shrink-0">
                                                    <Share2 className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => {
                                                    const link = `${window.location.origin}/join/${challenge.pin}`;
                                                    const text = `انضم إلى تحدي "${challenge.topicTitle}" المجدول! يبدأ في: ${new Date(challenge.scheduledStartTime!).toLocaleString("ar-EG")}`;
                                                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(link + "\n" + text)}`);
                                                }}>
                                                    <MessageCircle className="w-4 h-4 me-2 text-emerald-500" />
                                                    واتساب
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onDeleteChallenge && onDeleteChallenge(challenge.pin)} className="text-destructive focus:bg-destructive/5 focus:text-destructive">
                                                    <Trash2 className="w-4 h-4 me-2" />
                                                    إلغاء التحدي
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 bg-blue-50/50 rounded-3xl border-2 border-dashed border-blue-200">
                        <Calendar className="w-16 h-16 mx-auto mb-4 text-blue-200" />
                        <h3 className="text-xl font-bold text-blue-900 mb-2">لا توجد تحديات مجدولة</h3>
                        <p className="text-blue-700/60 max-w-xs mx-auto">قم بجدولة تحدي من تبويب "الدروس" ليظهر هنا للطلاب للبدء في الموعد المحدد.</p>
                    </div>
                )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                    ))
                ) : historyGroupChallenges.length > 0 || historySingleTopicGroups.length > 0 ? (
                    <Tabs defaultValue="group" className="space-y-4" dir="rtl">
                        <TabsList className="h-auto flex-wrap gap-1 bg-muted/40 p-1">
                            <TabsTrigger value="group" className="gap-2 data-[state=active]:bg-background">
                                <Users className="w-4 h-4" />
                                تحديات جماعية
                                <Badge variant="secondary" className="px-1.5 h-5 min-w-[1.25rem]">
                                    {historyGroupChallenges.length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="single" className="gap-2 data-[state=active]:bg-background">
                                <Gamepad2 className="w-4 h-4" />
                                تحديات فردية
                                <span className="text-[11px] text-muted-foreground hidden sm:inline">(كل درس في تبويب واحد)</span>
                                <Badge variant="secondary" className="px-1.5 h-5 min-w-[1.25rem]">
                                    {historySingleTopicGroups.length}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="group" className="space-y-4 mt-4">
                            {historyGroupChallenges.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {historyGroupChallenges.map((challenge) => (
                                        <Card
                                            key={challenge.id}
                                            className="group hover:border-primary/40 hover:shadow-md transition-all cursor-pointer border-border/60 overflow-hidden relative"
                                            onClick={() => setSelectedHistory(challenge)}
                                        >
                                            <div className="absolute inset-y-0 start-0 w-1 bg-primary group-hover:w-1.5 transition-all" />
                                            <CardContent className="p-5 flex flex-col md:flex-row items-center gap-6">
                                                <div className="w-16 h-16 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col items-center justify-center shrink-0 shadow-inner">
                                                    <span className="text-lg font-black text-primary leading-none">{challenge.avgScore}</span>
                                                    <span className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter mt-0.5">الدقة</span>
                                                </div>

                                                <div className="flex-1 text-center md:text-start">
                                                    <h3 className="font-bold text-lg mb-1.5 group-hover:text-primary transition-colors">{challenge.topicTitle}</h3>
                                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-[11px] font-bold text-muted-foreground/70">
                                                        <span className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-lg">
                                                            <Calendar className="w-3 h-3 text-primary" />
                                                            {challenge.date}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-lg">
                                                            <Clock className="w-3 h-3 text-primary" />
                                                            {challenge.timeLabel}
                                                        </span>
                                                        <span className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-lg">
                                                            <Users className="w-3 h-3 text-primary" />
                                                            {challenge.participants} مشارك
                                                        </span>
                                                        <Badge variant="outline" className="rounded-md border-primary/20 bg-primary/5 text-[9px] h-6 px-2">
                                                            جماعي
                                                        </Badge>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-5 w-full md:w-auto pt-4 md:pt-0 border-t md:border-0 justify-between md:justify-end">
                                                    {challenge.topStudent && (
                                                        <div className="text-start">
                                                            <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">الأول</p>
                                                            <div className="flex items-center gap-2 font-black text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 shadow-sm">
                                                                <Trophy className="w-3.5 h-3.5" />
                                                                {challenge.topStudent}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="w-10 h-10 rounded-full border border-border group-hover:border-primary/30 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all shadow-sm">
                                                        <ChevronLeft className="w-5 h-5" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 bg-muted/20 rounded-3xl border-2 border-dashed">
                                    <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/25" />
                                    <p className="font-bold text-muted-foreground">لا توجد تحديات جماعية منتهية في السجل</p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="single" className="space-y-4 mt-4">
                            {historySingleTopicGroups.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {historySingleTopicGroups.map((group) => (
                                        <Card
                                            key={group.topicId}
                                            className="group hover:border-violet-400/50 hover:shadow-md transition-all cursor-pointer border-border/60 overflow-hidden relative border-s-4 border-s-violet-500/40"
                                            onClick={() => {
                                                setSelectedSingleTopicGroup(group);
                                                setSingleHistoryMonth("");
                                                setSingleHistoryDay(null);
                                            }}
                                        >
                                            <div className="absolute inset-y-0 start-0 w-1 bg-violet-500/60 group-hover:w-1.5 transition-all" />
                                            <CardContent className="p-5 flex flex-col md:flex-row items-center gap-6">
                                                <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex flex-col items-center justify-center shrink-0 shadow-inner">
                                                    <span className="text-lg font-black text-violet-700 leading-none">{group.weightedAvg}</span>
                                                    <span className="text-[10px] font-bold text-violet-600/70 uppercase tracking-tighter mt-0.5">متوسط</span>
                                                </div>

                                                <div className="flex-1 text-center md:text-start">
                                                    <h3 className="font-bold text-lg mb-1.5 group-hover:text-violet-700 transition-colors">{group.topicTitle}</h3>
                                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-[11px] font-bold text-muted-foreground/70">
                                                        <Badge variant="outline" className="rounded-md border-violet-300 bg-violet-50 text-violet-800 text-[10px] h-6">
                                                            {group.sessionCount} جلسة فردية
                                                        </Badge>
                                                        <span className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-lg">
                                                            <Zap className="w-3 h-3 text-violet-600" />
                                                            {group.totalAttempts} محاولة إجمالاً
                                                        </span>
                                                        <span className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-lg">
                                                            <Calendar className="w-3 h-3 text-primary" />
                                                            آخر نشاط:{" "}
                                                            {group.latestEndedAt
                                                                ? new Date(group.latestEndedAt).toLocaleDateString("ar-SA")
                                                                : "—"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-5 w-full md:w-auto pt-4 md:pt-0 border-t md:border-0 justify-between md:justify-end">
                                                    {group.topStudent && (
                                                        <div className="text-start">
                                                            <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">أعلى نقطة</p>
                                                            <div className="flex items-center gap-2 font-black text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 shadow-sm">
                                                                <Trophy className="w-3.5 h-3.5" />
                                                                {group.topStudent}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="w-10 h-10 rounded-full border border-border group-hover:border-violet-500/40 group-hover:bg-violet-600 group-hover:text-white flex items-center justify-center transition-all shadow-sm">
                                                        <ChevronLeft className="w-5 h-5" />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 bg-violet-50/40 rounded-3xl border-2 border-dashed border-violet-200">
                                    <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-violet-300" />
                                    <p className="font-bold text-violet-900/80">لا توجد تحديات فردية في السجل</p>
                                    <p className="text-sm text-muted-foreground mt-1">جميع جلسات الفردي لنفس الدرس تُجمَّع هنا في بطاقة واحدة</p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                ) : (
                    <div className="text-center py-24 bg-muted/20 rounded-3xl border-2 border-dashed">
                        <Trophy className="w-20 h-20 mx-auto mb-6 text-muted-foreground/20" />
                        <h3 className="text-xl font-bold mb-2">لا يوجد سجل تحديات سابقة</h3>
                        <p className="text-muted-foreground">التحديات التي تنهيها ستظهر هنا مع تحليل كامل للأداء</p>
                    </div>
                )}
            </TabsContent>

            {/* Results Details Dialog */}
            <Dialog open={!!selectedHistory} onOpenChange={(open) => !open && setSelectedHistory(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none rounded-[2rem] shadow-2xl" dir="rtl">
                    <DialogHeader className="p-8 bg-gradient-to-bl from-primary/5 via-transparent to-transparent border-b relative shrink-0">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shrink-0 shadow-lg shadow-primary/20">
                                <History className="w-8 h-8" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <DialogTitle className="text-2xl md:text-3xl font-black mb-1.5 leading-tight truncate">
                                    {selectedHistory?.topicTitle}
                                </DialogTitle>
                                <DialogDescription asChild className="text-sm font-bold flex flex-wrap gap-4 text-muted-foreground/80">
                                    <div className="flex flex-wrap gap-4 pt-1">
                                        <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> {selectedHistory?.date}</span>
                                        <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> {selectedHistory?.timeLabel}</span>
                                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/10 text-[10px] px-2 py-0">
                                            {selectedHistory?.mode === "SINGLE" ? "تحدي فردي" : "تحدي جماعي"}
                                        </Badge>
                                    </div>
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <ChallengeDetailsContent session={selectedHistory} />
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!selectedSingleTopicGroup}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedSingleTopicGroup(null);
                        setSingleHistoryMonth("");
                        setSingleHistoryDay(null);
                    }
                }}
            >
                <DialogContent
                    className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none rounded-[2rem] shadow-2xl"
                    dir="rtl"
                >
                    <DialogHeader className="p-8 bg-gradient-to-bl from-violet-500/10 via-transparent to-transparent border-b relative shrink-0">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-violet-600 to-violet-400 flex items-center justify-center text-white shrink-0 shadow-lg shadow-violet-500/20">
                                <Gamepad2 className="w-8 h-8" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <DialogTitle className="text-2xl md:text-3xl font-black mb-1.5 leading-tight truncate">
                                    {selectedSingleTopicGroup?.topicTitle}
                                </DialogTitle>
                                <DialogDescription asChild className="text-sm font-bold flex flex-wrap gap-3 text-muted-foreground/80">
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <Badge
                                            variant="secondary"
                                            className="bg-violet-100 text-violet-800 border-violet-200 text-[10px]"
                                        >
                                            تحدي فردي — {selectedSingleTopicGroup?.sessionCount} جلسة
                                        </Badge>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-4 h-4 text-violet-600" />
                                            {selectedSingleTopicGroup?.totalAttempts} محاولة
                                        </span>
                                    </div>
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {selectedSingleTopicGroup && selectedSingleTopicGroup.sessions.length > 0 && (
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            <div className="px-6 pt-3 pb-4 border-b shrink-0 space-y-4 bg-muted/15">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                                        <Filter className="w-4 h-4 shrink-0 text-violet-600" />
                                        تصفية بالشهر واليوم
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs h-8"
                                        onClick={() => {
                                            setSingleHistoryMonth("");
                                            setSingleHistoryDay(null);
                                        }}
                                    >
                                        إعادة ضبط الفلتر
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="single-hist-month" className="text-xs font-bold">
                                            الشهر
                                        </Label>
                                        <Select
                                            value={singleHistoryMonth || SINGLE_HISTORY_ALL_MONTHS}
                                            onValueChange={(v) =>
                                                setSingleHistoryMonth(v === SINGLE_HISTORY_ALL_MONTHS ? "" : v)
                                            }
                                        >
                                            <SelectTrigger id="single-hist-month" className="w-full">
                                                <SelectValue placeholder="كل الشهور" />
                                            </SelectTrigger>
                                            <SelectContent dir="rtl">
                                                <SelectItem value={SINGLE_HISTORY_ALL_MONTHS}>
                                                    كل الشهور
                                                </SelectItem>
                                                {singleTopicMonthOptions.map((o) => (
                                                    <SelectItem key={o.value} value={o.value}>
                                                        {o.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="single-hist-day" className="text-xs font-bold">
                                            اليوم
                                        </Label>
                                        <Select
                                            disabled={!singleHistoryMonth}
                                            value={
                                                singleHistoryDay == null
                                                    ? SINGLE_HISTORY_ALL_DAYS
                                                    : String(singleHistoryDay)
                                            }
                                            onValueChange={(v) =>
                                                setSingleHistoryDay(
                                                    v === SINGLE_HISTORY_ALL_DAYS ? null : Number(v)
                                                )
                                            }
                                        >
                                            <SelectTrigger id="single-hist-day" className="w-full">
                                                <SelectValue
                                                    placeholder={
                                                        singleHistoryMonth ? "كل أيام الشهر" : "اختر الشهر أولاً"
                                                    }
                                                />
                                            </SelectTrigger>
                                            <SelectContent dir="rtl">
                                                <SelectItem value={SINGLE_HISTORY_ALL_DAYS}>
                                                    {singleHistoryMonth ? "كل أيام الشهر" : "كل الأيام"}
                                                </SelectItem>
                                                {singleTopicDayOptions.map((day) => (
                                                    <SelectItem key={day} value={String(day)}>
                                                        {day}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {selectedSingleSession &&
                                    typeof selectedSingleSession.sessionCountInView === "number" &&
                                    selectedSingleSession.sessionCountInView > 1 && (
                                        <p className="text-xs font-medium text-violet-800 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
                                            يُعرض دمج كل المشاركين والمحاولات من{" "}
                                            <strong>{selectedSingleSession.sessionCountInView}</strong> جلسة
                                            مطابقة لهذا الشهر واليوم (كل جلسة فردية غالباً تحتوي محاولة واحدة).
                                        </p>
                                    )}
                            </div>
                            {selectedSingleSession ? (
                                <ChallengeDetailsContent session={selectedSingleSession} />
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2 p-12 text-center text-muted-foreground">
                                    <Calendar className="w-12 h-12 opacity-20" />
                                    <p className="font-bold">لا توجد جلسات ضمن الفلتر المحدد</p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setSingleHistoryMonth("");
                                            setSingleHistoryDay(null);
                                        }}
                                    >
                                        عرض كل الجلسات
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

        </Tabs>
    );
};

export default TeacherChallengesTab;

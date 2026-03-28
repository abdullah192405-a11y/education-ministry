import {
    Gamepad2, Zap, Users, Calendar, History,
    Trophy, Clock, Eye, Copy, ArrowRight, Play, Radio,
    Trash2, StopCircle, RefreshCw, BarChart3, PieChart,
    CheckCircle2, XCircle, Info, ChevronLeft, Share2, MessageCircle, Twitter, Send
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
import { useState, useMemo } from "react";
import { useUser, useHostedChallengeResults, useHostedSessions, useTopic } from "@/hooks/useDatabase";
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
            questionStats: Array.from(questionStats.entries()).map(([id, data]) => ({
                id,
                ...data,
                accuracy: Math.round((data.correct / data.total) * 100),
                avgTime: Math.round(data.time / data.total)
            }))
        };
    }, [results]);

    if (loadingTopic) return <div className="p-12 flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;
    if (!session) return null;

    return (
        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
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

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 font-bold text-lg border-r-4 border-primary pr-3 py-1">
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
                                        <div className="font-bold text-base group-hover:text-primary transition-colors text-start">{res.user?.name || "طالب"}</div>
                                        <div className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
                                            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 font-bold"><CheckCircle2 className="w-3 h-3" /> {res.correct_answers || 0}</span>
                                            <span className="flex items-center gap-1.5 bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-100 font-bold"><XCircle className="w-3 h-3" /> {res.wrong_answers || 0}</span>
                                            <span className="flex items-center gap-1.5 bg-slate-50 text-slate-700 px-2 py-0.5 rounded-full border border-slate-100 font-bold"><Clock className="w-3 h-3" /> {res.time_taken || 0}ث</span>
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
                            const qStat = stats?.questionStats.find(s => s.id === String(idx)) || { accuracy: 0, correct: 0, total: 0 };
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
                                                className={`absolute top-0 right-0 h-full transition-all duration-500 ${qStat.accuracy > 70 ? "bg-emerald-500" : qStat.accuracy > 40 ? "bg-amber-500" : "bg-red-500"}`}
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
    );
};

const TeacherChallengesTab = ({ activeChallenges, onCopyToClipboard, gradeId, subjectId, onStartChallenge, onDeleteChallenge }: TeacherChallengesTabProps) => {
    const navigate = useNavigate();
    const [selectedHistory, setSelectedHistory] = useState<any>(null);
    const { data: user } = useUser();
    const { data: hostedResults } = useHostedChallengeResults(user?.id || "", 500);
    const { data: hostedSessions, isLoading } = useHostedSessions(user?.id || "");

    // Derive challenge history from hosted sessions AND results
    const historyChallenges = useMemo(() => {
        const map = new Map<string, any>();

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
                participants: session.players?.length || 0,
                totalScore: 0,
                topStudent: "",
                topScore: 0,
                finishedPlayers: 0,
                resultsList: []
            });
        });

        // 2. Process Results
        (hostedResults || []).forEach((r: any) => {
            const sessionId = r.session_id || r.sessionId || r.id;
            if (!map.has(sessionId)) {
                map.set(sessionId, {
                    id: sessionId,
                    topicId: r.session?.topic_id || r.topic_id,
                    topicTitle: r.session?.topic?.title || r.topic_title || "تحدي",
                    mode: r.session?.mode || "SINGLE",
                    date: r.created_at ? new Date(r.created_at).toLocaleDateString('ar-SA') : "—",
                    timeLabel: r.created_at ? new Date(r.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : "—",
                    participants: 0,
                    totalScore: 0,
                    topStudent: "",
                    topScore: 0,
                    finishedPlayers: 0,
                    resultsList: []
                });
            }
            const ch = map.get(sessionId)!;
            ch.finishedPlayers += 1;
            ch.resultsList.push(r);
            ch.totalScore += r.percentage || r.score || 0;
            if ((r.score || 0) > ch.topScore) {
                ch.topScore = r.score || 0;
                ch.topStudent = r.user?.name || "طالب";
            }
            if (ch.finishedPlayers > ch.participants) {
                ch.participants = ch.finishedPlayers;
            }
        });

        return Array.from(map.values())
            .map(ch => ({
                ...ch,
                avgScore: ch.finishedPlayers > 0 ? Math.round(ch.totalScore / ch.finishedPlayers) : 0,
            }))
            .sort((a, b) => b.id.localeCompare(a.id));
    }, [hostedSessions, hostedResults]);

    return (
        <Tabs defaultValue="active" className="space-y-6" dir="rtl">
            <TabsList>
                <TabsTrigger value="active" className="gap-2">
                    <Zap className="w-4 h-4" />
                    التحديات النشطة
                    <Badge variant="secondary" className="me-1 ms-0 px-1 h-5 min-w-[1.25rem]">{activeChallenges.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                    <History className="w-4 h-4" />
                    سجل التحديات
                </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
                {/* Live update indicator */}
                {activeChallenges.length > 0 && (
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

                {activeChallenges.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                        {activeChallenges.map((challenge) => (
                            <Card key={challenge.id} className="border-r-4 border-r-emerald-500 overflow-hidden group">
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
                                                    const url = `/grade/${challenge.gradeId || gradeId || '0'}/subject/${challenge.subjectId || subjectId || '0'}/topic/${challenge.topicId || '0'}/challenge/group/ACTIVITIES/${challenge.pin}?host=true`;
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
                                                            navigate(`/grade/${challenge.gradeId || gradeId || '0'}/subject/${challenge.subjectId || subjectId || '0'}/topic/${challenge.topicId || '0'}/challenge/group/ACTIVITIES/${challenge.pin}?host=true`);
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
                                                        navigate(`/grade/${challenge.gradeId || gradeId || '0'}/subject/${challenge.subjectId || subjectId || '0'}/topic/${challenge.topicId || '0'}/challenge/group/ACTIVITIES/${challenge.pin}?host=true`);
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
                                                        <MessageCircle className="w-4 h-4 ml-2 text-emerald-500" />
                                                        واتساب
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => {
                                                        const link = `${window.location.origin}/join/${challenge.pin}`;
                                                        const text = `انضم إلى تحدي "${challenge.topicTitle}"! رمز الانضمام: ${challenge.pin}`;
                                                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`, '_blank');
                                                    }}>
                                                        <Twitter className="w-4 h-4 ml-2 text-blue-400" />
                                                        تويتر / X
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => {
                                                        const link = `${window.location.origin}/join/${challenge.pin}`;
                                                        const text = `انضم إلى تحدي "${challenge.topicTitle}"! رمز الانضمام: ${challenge.pin}`;
                                                        window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, '_blank');
                                                    }}>
                                                        <Send className="w-4 h-4 ml-2 text-sky-500" />
                                                        تيليجرام
                                                    </DropdownMenuItem>
                                                    <div className="h-px bg-border my-1" />
                                                    <DropdownMenuItem onClick={() => {
                                                        const link = `${window.location.origin}/join/${challenge.pin}`;
                                                        onCopyToClipboard(link);
                                                    }}>
                                                        <Copy className="w-4 h-4 ml-2" />
                                                        نسخ الرابط
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
                        <h3 className="text-xl font-bold mb-2">لا توجد تحديات نشطة</h3>
                        <p className="text-muted-foreground mb-6">قم بإنشاء تحدي جديد من صفحة الدروس لبدء المنافسة</p>
                    </div>
                )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                    ))
                ) : historyChallenges.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4">
                        {historyChallenges.map((challenge) => (
                            <Card
                                key={challenge.id}
                                className="group hover:border-primary/40 hover:shadow-md transition-all cursor-pointer border-border/60 overflow-hidden relative"
                                onClick={() => setSelectedHistory(challenge)}
                            >
                                <div className="absolute inset-y-0 right-0 w-1 bg-primary group-hover:w-1.5 transition-all" />
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
                                                {challenge.mode === "SINGLE" ? "فردي" : "جماعي"}
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

        </Tabs>
    );
};

export default TeacherChallengesTab;

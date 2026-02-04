import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
    ChevronRight, ChevronLeft, Trophy, Users, Clock, Target,
    Calendar, Download, Share2, ArrowLeft, Star,
    CheckCircle2, XCircle, AlertTriangle, BarChart3, Zap, Sparkles, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow
} from "@/components/ui/table";
import Header from "@/components/layout/Header";

// Mock Data for Analytics
const mockAnalyticsData = {
    id: 1,
    title: "كيف نحمي أنفسنا من الجراثيم",
    date: "2024-01-28",
    duration: "15 دقيقة",
    totalParticipants: 48,
    averageScore: 78,
    completionRate: 92,
    peakPlayers: 36,
    avgTimePerQuestion: "6.5 ثواني",
    totalPointsAwarded: 124500,
    questions: [
        {
            id: 1,
            text: "كم ثانية يجب غسل اليدين؟",
            type: "multiple_choice",
            correctRate: 85,
            avgTime: 5,
            distractors: [
                { text: "5 ثواني", chosenRate: 10 },
                { text: "10 ثواني", chosenRate: 5 },
                { text: "أقل من 20 ثانية", chosenRate: 0 }
            ]
        },
        {
            id: 2,
            text: "الجراثيم تنتقل عبر المصافحة",
            type: "true_false",
            correctRate: 95,
            avgTime: 3,
            distractors: [
                { text: "خطأ", chosenRate: 5 }
            ]
        },
        {
            id: 3,
            text: "رتب خطوات غسيل اليدين",
            type: "order",
            correctRate: 45,
            avgTime: 12,
            distractors: [
                { text: "ترتيب غير مكتمل", chosenRate: 35 },
                { text: "عكس الخطوات", chosenRate: 20 }
            ]
        },
        {
            id: 4,
            text: "ما هو أفضل وقت لغسل اليدين؟",
            type: "multiple_choice",
            correctRate: 72,
            avgTime: 7,
            distractors: [
                { text: "قبل النوم فقط", chosenRate: 8 },
                { text: "بعد الاستيقاظ فقط", chosenRate: 15 },
                { text: "مرة واحدة يومياً", chosenRate: 5 }
            ]
        },
    ],
    participants: [
        { id: 1, name: "أحمد محمد", score: 950, rank: 1, correct: 9, wrong: 1, time: "45s", avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=ahmed" },
        { id: 2, name: "سارة علي", score: 920, rank: 2, correct: 9, wrong: 1, time: "52s", avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=sara" },
        { id: 3, name: "خالد عمر", score: 880, rank: 3, correct: 8, wrong: 2, time: "48s", avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=khaled" },
        { id: 4, name: "نورة فهد", score: 750, rank: 4, correct: 7, wrong: 3, time: "60s", avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=noura" },
        { id: 5, name: "محمد سالم", score: 600, rank: 5, correct: 6, wrong: 4, time: "55s", avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=salem" },
    ],
    timelineData: [
        { time: "00:00", active: 5 },
        { time: "05:00", active: 24 },
        { time: "10:00", active: 36 },
        { time: "15:00", active: 18 },
        { time: "20:00", active: 8 },
    ]
};

const ChallengeAnalytics = () => {
    const { challengeId } = useParams();
    const [activeTab, setActiveTab] = useState("overview");

    return (
        <div className="min-h-screen font-cairo bg-slate-50 dark:bg-slate-950" dir="rtl">
            <Header />

            <main className="container mx-auto px-4 pt-24 pb-16">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                            <Link to="/dashboard/channel" className="hover:text-primary transition-colors">لوحة التحكم</Link>
                            <ChevronLeft className="w-4 h-4" />
                            <span>سجل التحديات</span>
                            <ChevronLeft className="w-4 h-4" />
                            <span>تقرير التحدي #{challengeId}</span>
                        </div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <BarChart3 className="w-8 h-8 text-primary" />
                            تقرير: {mockAnalyticsData.title}
                        </h1>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" className="gap-2">
                            <Download className="w-4 h-4" />
                            تصدير PDF
                        </Button>
                        <Button variant="outline" className="gap-2">
                            <Share2 className="w-4 h-4" />
                            مشاركة
                        </Button>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex flex-col items-center text-center gap-2">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">المشاركين</p>
                                    <p className="text-xl font-bold">{mockAnalyticsData.totalParticipants}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex flex-col items-center text-center gap-2">
                                <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                                    <Target className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">متوسط النتيجة</p>
                                    <p className="text-xl font-bold">{mockAnalyticsData.averageScore}%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex flex-col items-center text-center gap-2">
                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">المدة</p>
                                    <p className="text-xl font-bold">{mockAnalyticsData.duration}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex flex-col items-center text-center gap-2">
                                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">نسبة الإكمال</p>
                                    <p className="text-xl font-bold">{mockAnalyticsData.completionRate}%</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex flex-col items-center text-center gap-2">
                                <div className="p-2 rounded-lg bg-pink-500/10 text-pink-600">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">ذروة اللاعبين</p>
                                    <p className="text-xl font-bold">{mockAnalyticsData.peakPlayers}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex flex-col items-center text-center gap-2">
                                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600">
                                    <BarChart3 className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">وقت السؤال</p>
                                    <p className="text-xl font-bold">{mockAnalyticsData.avgTimePerQuestion}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Automated Insights Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="md:col-span-3 bg-primary/5 border-primary/20">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                                رؤى وتوصيات آلية (AI Insights)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl bg-background border flex gap-3 items-start">
                                    <div className="p-2 rounded-lg bg-red-100 text-red-600">
                                        <AlertTriangle className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm mb-1">تنبيه فجوة المعرفة</p>
                                        <p className="text-xs text-muted-foreground">يعاني 55% من المشاركين من صعوبة في "ترتيب خطوات غسيل اليدين". نوصي بإعادة مراجعة هذا الجزء.</p>
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-background border flex gap-3 items-start">
                                    <div className="p-2 rounded-lg bg-green-100 text-green-600">
                                        <Trophy className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm mb-1">أداء متميز</p>
                                        <p className="text-xs text-muted-foreground">أظهر المشاركون سرعة استجابة عالية (أقل من 4 ثواني) في أسئلة الصح والخطأ.</p>
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-background border flex gap-3 items-start">
                                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                                        <TrendingUp className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm mb-1">توصية المحتوى</p>
                                        <p className="text-xs text-muted-foreground">استناداً إلى النتائج، قد يكون المحتوى القادم عن "أدوات التعقيم" مفيداً للمجموعة.</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" dir="rtl">
                    <TabsList className="w-full justify-start">
                        <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                        <TabsTrigger value="participants">قائمة المتصدرين</TabsTrigger>
                        <TabsTrigger value="questions">تحليل الأسئلة</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Performance Chart */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>توزيع النتائج</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[300px] flex items-end justify-between px-10 pb-8">
                                    <div className="w-16 h-[40%] bg-red-400 rounded-t-lg relative group transition-all hover:brightness-110">
                                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">15%</span>
                                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">0-50</span>
                                    </div>
                                    <div className="w-16 h-[60%] bg-amber-400 rounded-t-lg relative group transition-all hover:brightness-110">
                                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">25%</span>
                                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">50-70</span>
                                    </div>
                                    <div className="w-16 h-[80%] bg-blue-400 rounded-t-lg relative group transition-all hover:brightness-110">
                                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">40%</span>
                                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">70-90</span>
                                    </div>
                                    <div className="w-16 h-[30%] bg-green-400 rounded-t-lg relative group transition-all hover:brightness-110">
                                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">20%</span>
                                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">90+</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Timeline Activity */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>نشاط اللاعبين عبر الوقت</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[300px] flex items-end justify-between px-10 pb-8">
                                    {mockAnalyticsData.timelineData.map((data, i) => (
                                        <div key={i} className="w-12 bg-primary/20 rounded-t-lg relative group transition-all hover:bg-primary/30" style={{ height: `${(data.active / mockAnalyticsData.peakPlayers) * 100}%` }}>
                                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-xs font-bold">{data.active} لاعب</span>
                                            <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">{data.time}</span>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Difficult Questions */}
                            <Card className="lg:col-span-2">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                                        أصعب الأسئلة
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {mockAnalyticsData.questions.sort((a, b) => a.correctRate - b.correctRate).slice(0, 2).map(q => (
                                            <div key={q.id} className="p-4 rounded-xl border bg-muted/30">
                                                <div className="flex justify-between items-start mb-3">
                                                    <p className="font-bold text-sm">{q.text}</p>
                                                    <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-bold">
                                                        {q.correctRate}% صحيح
                                                    </span>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-muted-foreground">نسبة الإجابة</span>
                                                        <span className="font-bold">{q.correctRate}%</span>
                                                    </div>
                                                    <Progress value={q.correctRate} className="h-2" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Participants Tab */}
                    <TabsContent value="participants">
                        <Card>
                            <CardHeader>
                                <CardTitle>ترتيب المتصدرين</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[80px]">الترتيب</TableHead>
                                            <TableHead>اللاعب</TableHead>
                                            <TableHead>النقاط</TableHead>
                                            <TableHead>إجابات صحيحة</TableHead>
                                            <TableHead>خاطئة</TableHead>
                                            <TableHead>الوقت الكلي</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {mockAnalyticsData.participants.map((player) => (
                                            <TableRow key={player.id}>
                                                <TableCell className="font-bold">
                                                    {player.rank === 1 && "🥇"}
                                                    {player.rank === 2 && "🥈"}
                                                    {player.rank === 3 && "🥉"}
                                                    {player.rank > 3 && player.rank}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full border bg-muted" />
                                                        {player.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-bold text-primary">{player.score}</TableCell>
                                                <TableCell className="text-green-600 font-bold">{player.correct}</TableCell>
                                                <TableCell className="text-red-500">{player.wrong}</TableCell>
                                                <TableCell>{player.time}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Questions Tab */}
                    <TabsContent value="questions">
                        <div className="space-y-6">
                            {mockAnalyticsData.questions.map((q) => (
                                <Card key={q.id}>
                                    <CardHeader className="pb-3 text-right">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg">{q.text}</CardTitle>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${q.correctRate > 80 ? "bg-green-100 text-green-700" : q.correctRate > 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                                }`}>
                                                دقة الإجابة: {q.correctRate}%
                                            </span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="md:col-span-2 space-y-4">
                                                <p className="text-sm font-bold text-muted-foreground mb-4">تحليل الخيارات:</p>
                                                <div className="space-y-3">
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-xs">
                                                            <span className="font-bold text-green-600">الإجابة الصحيحة</span>
                                                            <span>{q.correctRate}%</span>
                                                        </div>
                                                        <Progress value={q.correctRate} className="h-2 bg-green-100" />
                                                    </div>
                                                    {q.distractors.map((d, i) => (
                                                        <div key={i} className="space-y-1">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-muted-foreground">{d.text}</span>
                                                                <span>{d.chosenRate}%</span>
                                                            </div>
                                                            <Progress value={d.chosenRate} className="h-2" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="bg-muted/30 p-4 rounded-xl flex flex-col justify-center items-center text-center space-y-3">
                                                <div className="p-3 rounded-full bg-background border">
                                                    <Clock className="w-6 h-6 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-muted-foreground">متوسط زمن الإجابة</p>
                                                    <p className="text-2xl font-bold">{q.avgTime} ثانية</p>
                                                </div>
                                                <p className="text-xs text-muted-foreground px-4">
                                                    أسرع إجابة: {Math.max(1, q.avgTime - 2)}ث • أبطأ إجابة: {q.avgTime + 5}ث
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
};

export default ChallengeAnalytics;

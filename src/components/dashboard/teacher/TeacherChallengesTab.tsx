import { useState } from "react";
import {
    Gamepad2, Zap, Users, Calendar,
    Trophy, Clock, Eye, Copy, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Challenge {
    id: number;
    topicId: number;
    pin: string;
    topicTitle: string;
    mode: "group" | "single";
    players: number;
    status: "playing" | "waiting" | "finished";
    startedAt: string;
    type: "admin" | "user";
}

interface TeacherChallengesTabProps {
    activeChallenges: Challenge[];
    onCopyToClipboard: (text: string) => void;
}

// Mock History Data
const HISTORY_CHALLENGES = [
    {
        id: 101,
        topicTitle: "حروف الهجاء العربية",
        date: "2024-02-01",
        participants: 25,
        avgScore: 88,
        topStudent: "سارة أحمد",
        duration: "45 دقيقة"
    },
    {
        id: 102,
        topicTitle: "الأرقام من 1 إلى 10",
        date: "2024-01-28",
        participants: 22,
        avgScore: 92,
        topStudent: "محمد علي",
        duration: "30 دقيقة"
    },
    {
        id: 103,
        topicTitle: "الحواس الخمس",
        date: "2024-01-25",
        participants: 28,
        avgScore: 85,
        topStudent: "نورة القحطاني",
        duration: "40 دقيقة"
    }
];

const TeacherChallengesTab = ({ activeChallenges, onCopyToClipboard }: TeacherChallengesTabProps) => {
    return (
        <Tabs defaultValue="active" className="space-y-6">
            <TabsList>
                <TabsTrigger value="active" className="gap-2">
                    <Zap className="w-4 h-4" />
                    التحديات النشطة
                    <Badge variant="secondary" className="mr-1 ml-0 px-1 h-5 min-w-[1.25rem]">{activeChallenges.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                    <HistoryIcon className="w-4 h-4" />
                    سجل التحديات
                </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
                {activeChallenges.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeChallenges.map((challenge) => (
                            <Card key={challenge.id} className="border-l-4 border-l-emerald-500">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg mb-1">{challenge.topicTitle}</h3>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Badge variant="outline" className={challenge.status === "playing" ? "border-emerald-500 text-emerald-500 animate-pulse" : "border-amber-500 text-amber-500"}>
                                                    {challenge.status === "playing" ? "جاري اللعب" : "في الانتظار"}
                                                </Badge>
                                                <span>•</span>
                                                <span>منذ {challenge.startedAt}</span>
                                            </div>
                                        </div>
                                        <div className="text-center bg-muted/50 p-2 rounded-lg">
                                            <span className="block text-xs text-muted-foreground uppercase">PIN</span>
                                            <span className="block text-xl font-mono font-black tracking-wider text-primary">{challenge.pin}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-blue-500" />
                                            <span className="font-bold">{challenge.players}</span>
                                            <span className="text-sm text-muted-foreground">لاعب</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Gamepad2 className="w-4 h-4 text-purple-500" />
                                            <span className="font-bold">جماعي</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button className="flex-1 gap-2" size="sm">
                                            <Eye className="w-4 h-4" />
                                            لوحة التحكم
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="shrink-0"
                                            onClick={() => onCopyToClipboard(challenge.pin)}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
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
                {HISTORY_CHALLENGES.map((challenge) => (
                    <Card key={challenge.id} className="hover:bg-muted/30 transition-colors">
                        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold shrink-0">
                                {challenge.avgScore}%
                            </div>

                            <div className="flex-1">
                                <h3 className="font-bold mb-1">{challenge.topicTitle}</h3>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {challenge.date}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {challenge.duration}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        {challenge.participants} مشارك
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right hidden md:block">
                                    <p className="text-xs text-muted-foreground">الأول</p>
                                    <div className="flex items-center gap-1 font-medium text-sm text-amber-600">
                                        <Trophy className="w-3 h-3" />
                                        {challenge.topStudent}
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon">
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </TabsContent>
        </Tabs>
    );
};

// Helper icon
const HistoryIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" />
    </svg>
);

export default TeacherChallengesTab;

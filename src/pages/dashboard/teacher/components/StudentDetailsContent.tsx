import { Trophy, Star, BookOpen, Clock, Activity, Medal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    useStudentSubjectProgress,
    useStudentTopicActivities,
    useUserBadges
} from "@/hooks/useDatabase";

interface StudentDetailsContentProps {
    student: any;
}

export const StudentDetailsContent = ({ student }: StudentDetailsContentProps) => {
    const { data: subjectProgress, isLoading: isLoadingProgress } = useStudentSubjectProgress(student.id);
    const { data: activities, isLoading: isLoadingActivities } = useStudentTopicActivities(student.id, 20);
    const { data: badges, isLoading: isLoadingBadges } = useUserBadges(student.userId);

    const isLoading = isLoadingProgress || isLoadingActivities || isLoadingBadges;

    if (isLoading) {
        return (
            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-16 h-16 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pt-4">
            <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-primary/20">
                    <AvatarImage src={student.avatar} />
                    <AvatarFallback>{student.name?.[0] || 'ط'}</AvatarFallback>
                </Avatar>
                <div>
                    <h3 className="text-xl font-bold">{student.name}</h3>
                    <p className="text-muted-foreground" dir="ltr">{student.email || 'لا يوجد بريد إلكتروني'}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-emerald-500/5 border-emerald-500/20">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                        <div className={`text-3xl font-bold ${student.avgScore >= 80 ? "text-emerald-600" : student.avgScore >= 60 ? "text-amber-600" : "text-destructive"}`}>
                            {student.avgScore}%
                        </div>
                        <div className="text-sm font-medium text-emerald-800/70 mt-1 dark:text-emerald-400">متوسط الدرجات</div>
                    </CardContent>
                </Card>
                <Card className="bg-amber-500/5 border-amber-500/20">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                        <div className="flex items-center justify-center gap-2 text-3xl font-bold text-amber-600">
                            <Trophy className="w-6 h-6" />
                            {student.totalChallenges}
                        </div>
                        <div className="text-sm font-medium text-amber-800/70 mt-1 dark:text-amber-400">تحديات منجزة</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="activities" className="w-full" dir="rtl">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="activities">النشاط الأخير</TabsTrigger>
                    <TabsTrigger value="progress">التقدم بالمواد</TabsTrigger>
                    <TabsTrigger value="badges">الأوسمة</TabsTrigger>
                </TabsList>

                <TabsContent value="activities" className="mt-4">
                    <Card>
                        <CardHeader className="py-3 px-4 bg-muted/30">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Activity className="w-4 h-4 text-blue-500" />
                                سجل دروس الطالب
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[250px]">
                                {activities && activities.length > 0 ? (
                                    <div className="divide-y text-sm">
                                        {activities.map((activity: any) => (
                                            <div key={activity.id} className="p-4 flex items-start justify-between hover:bg-muted/10 transition-colors">
                                                <div className="space-y-1">
                                                    <p className="font-medium text-primary flex items-center gap-2">
                                                        <BookOpen className="w-3.5 h-3.5" />
                                                        {activity.topic?.title || 'درس غير معروف'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {activity.topic?.subject?.name || 'مادة غير معروفة'}
                                                    </p>
                                                </div>
                                                <div className="text-left">
                                                    <Badge variant={activity.status === 'COMPLETED' ? 'default' : 'secondary'} className="mb-1">
                                                        {activity.status === 'COMPLETED' ? 'مكتمل' : 'قيد التقدم'}
                                                    </Badge>
                                                    <div className="text-[10px] text-muted-foreground flex items-center justify-end gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(activity.date).toLocaleDateString('ar-SA')}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground">
                                        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                        <p>لا يوجد نشاط مسجل للدروس</p>
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="progress" className="mt-4">
                    <Card>
                        <CardHeader className="py-3 px-4 bg-muted/30">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Star className="w-4 h-4 text-amber-500" />
                                تقدم الطالب في المواد
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[250px]">
                                {subjectProgress && subjectProgress.length > 0 ? (
                                    <div className="divide-y text-sm">
                                        {subjectProgress.map((sp: any) => (
                                            <div key={sp.id} className="p-4 flex items-center justify-between">
                                                <span className="font-medium">{sp.subject?.name || 'مادة'}</span>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-center">
                                                        <span className="block font-bold text-amber-600">{sp.points || 0}</span>
                                                        <span className="text-[10px] text-muted-foreground">نقطة</span>
                                                    </div>
                                                    <div className="text-center">
                                                        <span className={`block font-bold ${(sp.average_score || 0) >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
                                                            {Math.round(sp.average_score || 0)}%
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">المتوسط</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground">
                                        <p>لا يوجد تقدم مسجل</p>
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="badges" className="mt-4">
                    <Card>
                        <CardHeader className="py-3 px-4 bg-muted/30">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Medal className="w-4 h-4 text-purple-500" />
                                الأوسمة المكتسبة
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[250px]">
                                {badges && badges.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3 p-4">
                                        {badges.map((userBadge: any) => (
                                            <div key={userBadge.id} className="flex items-center gap-3 p-2 rounded-lg border bg-card text-card-foreground shadow-sm">
                                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 overflow-hidden">
                                                    {userBadge.badge?.image_url ? (
                                                        <img src={userBadge.badge.image_url} alt={userBadge.badge.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Medal className="h-5 w-5 text-indigo-500" />
                                                    )}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-xs font-semibold truncate">{userBadge.badge?.name}</p>
                                                    <p className="text-[10px] text-muted-foreground truncate">{new Date(userBadge.earned_at).toLocaleDateString('ar-SA')}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground">
                                        <Medal className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                        <p>لم يكتسب أي أوسمة بعد</p>
                                    </div>
                                )}
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

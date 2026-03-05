import { useState } from "react";
import {
    Search, MoreVertical, Trophy, User,
    TrendingUp, Gamepad2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser, useTeacherProfile, useStudentsInGrade, useHostedChallengeResults, useGradeSubjectProgress } from "@/hooks/useDatabase";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StudentDetailsContent } from "./StudentDetailsContent";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const TeacherStudentsTab = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const { data: user } = useUser();
    const { data: teacherProfile } = useTeacherProfile(user?.id || "");
    const { data: gradeStudents, isLoading: isLoadingStudents } = useStudentsInGrade(teacherProfile?.grade_id || "");
    const { data: hostedResults, isLoading: isLoadingResults } = useHostedChallengeResults(user?.id || "", 100);
    const { data: gradeSubjectProgress } = useGradeSubjectProgress(teacherProfile?.grade_id || "", teacherProfile?.subject_id || "");

    const isLoading = isLoadingStudents || isLoadingResults;

    // Use student profiles from the grade as the source of truth
    const students = (gradeStudents || []).map((profile: any) => {
        // Collect specific performance data for this student from hosted results
        const studentResults = (hostedResults || []).filter(
            (r: any) => (r.user_id || r.userId) === profile.user_id
        );

        const subjectProgress = (gradeSubjectProgress || []).find(
            (sp: any) => sp.student_id === profile.id
        );

        const totalChallenges = studentResults.length;
        const totalScore = studentResults.reduce((acc: number, r: any) => acc + (r.score || 0), 0);
        const lastActiveResult = studentResults.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        return {
            id: profile.id,
            userId: profile.user_id,
            name: profile.user?.name || "طالب",
            email: profile.user?.email || "",
            avatar: profile.user?.avatar || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${profile.user_id}`,
            totalChallenges: totalChallenges,
            avgScore: subjectProgress?.average_score !== undefined
                ? Math.round(subjectProgress.average_score)
                : totalChallenges > 0
                    ? Math.round(totalScore / totalChallenges)
                    : Math.round(profile.average_score || 0),
            lastActive: lastActiveResult?.created_at || null,
        };
    });

    const filteredStudents = students.filter((student: any) =>
        String(student.name || "").includes(searchTerm) ||
        String(student.email || "").includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card className="bg-blue-500/5 border-blue-500/20">
                    <CardContent className="p-4 flex items-center gap-3">
                        <User className="w-8 h-8 text-blue-500" />
                        <div>
                            <p className="text-2xl font-bold">{students.length}</p>
                            <p className="text-xs text-muted-foreground">إجمالي الطلاب</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-500/5 border-emerald-500/20">
                    <CardContent className="p-4 flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-emerald-500" />
                        <div>
                            <p className="text-2xl font-bold">
                                {students.length > 0 ? Math.round(students.reduce((s, st) => s + st.avgScore, 0) / students.length) : 0}%
                            </p>
                            <p className="text-xs text-muted-foreground">متوسط الدرجات</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-purple-500/5 border-purple-500/20">
                    <CardContent className="p-4 flex items-center gap-3">
                        <Gamepad2 className="w-8 h-8 text-purple-500" />
                        <div>
                            <p className="text-2xl font-bold">{(hostedResults || []).length}</p>
                            <p className="text-xs text-muted-foreground">تحديات منجزة</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-96">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="بحث عن طالب..."
                    className="pr-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Students List */}
            <div className="space-y-3">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
                    ))
                ) : filteredStudents.length === 0 ? (
                    <Card className="p-12 text-center">
                        <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-muted-foreground text-lg">لا يوجد طلاب بعد</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            سيظهر الطلاب هنا بعد مشاركتهم في التحديات
                        </p>
                    </Card>
                ) : (
                    filteredStudents.map((student: any) => (
                        <Card key={student.id} className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-4 flex items-center gap-4">
                                <Avatar className="w-10 h-10">
                                    <AvatarImage src={student.avatar} />
                                    <AvatarFallback>{student.name?.[0] || 'ط'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-medium">{student.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {student.totalChallenges} تحدي · آخر نشاط {student.lastActive ? new Date(student.lastActive).toLocaleDateString('ar-SA') : '—'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="text-center">
                                        <div className={`font-bold ${student.avgScore >= 80 ? "text-emerald-600" : student.avgScore >= 60 ? "text-amber-600" : "text-destructive"}`}>
                                            {student.avgScore}%
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">متوسط</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold flex items-center gap-1 text-amber-600">
                                            <Trophy className="w-3 h-3" />
                                            {student.totalChallenges}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">تحدي</div>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setSelectedStudent(student)}>عرض التفاصيل</DropdownMenuItem>
                                        <DropdownMenuItem>إرسال رسالة</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Student Details Dialog */}
            <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
                <DialogContent className="max-w-md" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-right">تفاصيل الطالب</DialogTitle>
                        <DialogDescription className="text-right">
                            بيانات وإحصائيات الطالب
                        </DialogDescription>
                    </DialogHeader>
                    {selectedStudent && (
                        <StudentDetailsContent student={selectedStudent} />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TeacherStudentsTab;

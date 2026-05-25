import { useState, useMemo } from "react";
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
import { useUser, useTeacherProfile, useStudentsInGrade, useHostedChallengeResults, useGradeSubjectProgress, usePendingStudentRegistrationRequestsForTeacher, useReviewRegistrationRequest } from "@/hooks/useDatabase";
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
import { useDashboardLocale } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { averageChallengeResultScorePercent } from "@/lib/challengeResultScore";
import { useTeacherVisibleClasses } from "@/hooks/useTeacherVisibleClasses";
import TeacherClassFilterCard from "./TeacherClassFilterCard";

const TeacherStudentsTab = () => {
    const { t, dir, locale, isRtl, textAlign } = useDashboardLocale();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const { data: user } = useUser();
    const { data: teacherProfile } = useTeacherProfile(user?.id || "");
    const {
        visibleGrades,
        allowedSubjectIds,
        selectedGradeId,
        setSelectedGradeId,
        selectedSubjectId,
        setSelectedSubjectId,
        availableSubjects,
        showGradeFilter,
        showSubjectFilter,
        showClassFilters,
    } = useTeacherVisibleClasses(teacherProfile?.id || "", teacherProfile?.grade_id);

    const activeGradeId = selectedGradeId || teacherProfile?.grade_id || "";
    const activeSubjectId = selectedSubjectId || teacherProfile?.subject_id || "";

    const { data: gradeStudents, isLoading: isLoadingStudents } = useStudentsInGrade(activeGradeId);
    const { data: hostedResults, isLoading: isLoadingResults } = useHostedChallengeResults(user?.id || "", 100);
    const { data: gradeSubjectProgress } = useGradeSubjectProgress(activeGradeId, activeSubjectId);
    const { data: pendingRequests = [], isLoading: isLoadingPending } = usePendingStudentRegistrationRequestsForTeacher(user?.id || "");
    const reviewRequest = useReviewRegistrationRequest();

    const isLoading = isLoadingStudents || isLoadingResults;

    const pendingForClass = useMemo(() => {
        if (!showClassFilters || !activeGradeId) return pendingRequests;
        return pendingRequests.filter((req: any) => req.grade_id === activeGradeId);
    }, [pendingRequests, showClassFilters, activeGradeId]);

    const students = (gradeStudents || [])
        .map((profile: any) => {
            const studentResults = (hostedResults || []).filter(
                (r: any) => (r.user_id || r.userId) === profile.user_id
            );

            const subjectProgress = (gradeSubjectProgress || []).find(
                (sp: any) => sp.student_id === profile.id
            );

            const totalChallenges = studentResults.length;
            const lastActiveResult = [...studentResults].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0];

            return {
                id: profile.id,
                userId: profile.user_id,
                name: profile.user?.name || t("dash.teacher.students.studentFallback"),
                email: profile.user?.email || "",
                avatar: profile.user?.avatar || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${profile.user_id}`,
                totalChallenges: totalChallenges,
                avgScore: subjectProgress?.average_score !== undefined
                    ? Math.max(0, Math.min(100, Math.round(subjectProgress.average_score)))
                    : totalChallenges > 0
                        ? averageChallengeResultScorePercent(studentResults)
                        : Math.max(0, Math.min(100, Math.round(Number(profile.average_score) || 0))),
                lastActive: lastActiveResult?.created_at || null,
            };
        });

    const filteredStudents = students.filter((student: any) =>
        String(student.name || "").includes(searchTerm) ||
        String(student.email || "").includes(searchTerm)
    );

    const searchIconPos = isRtl ? "right-3" : "left-3";
    const searchPadding = isRtl ? "pr-9" : "pl-9";

    return (
        <div className="space-y-6">
            <TeacherClassFilterCard
                visibleGrades={visibleGrades}
                selectedGradeId={selectedGradeId}
                onGradeChange={setSelectedGradeId}
                selectedSubjectId={selectedSubjectId}
                onSubjectChange={setSelectedSubjectId}
                availableSubjects={availableSubjects}
                allowedSubjectIds={allowedSubjectIds}
                showGradeFilter={showGradeFilter}
                showSubjectFilter={showSubjectFilter}
            />

            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{t("dash.teacher.students.pendingHeader")}</h3>
                        <Badge variant="outline">{pendingForClass.length}</Badge>
                    </div>
                    {isLoadingPending ? (
                        <p className="text-sm text-muted-foreground">{t("dash.teacher.students.loadingRequests")}</p>
                    ) : pendingForClass.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("dash.teacher.students.noPendingRequests")}</p>
                    ) : (
                        <div className="space-y-2">
                            {pendingForClass.map((req: any) => (
                                <div key={req.id} className="rounded-lg border bg-background p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div>
                                        <p className="font-medium">{req.applicant?.name || t("dash.teacher.students.newStudentFallback")}</p>
                                        <p className="text-xs text-muted-foreground">{req.applicant?.email}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {t("dash.teacher.students.requestMeta", {
                                                grade: req.grade?.name || t("dash.teacher.students.gradeUnspecified"),
                                                date: new Date(req.created_at).toLocaleDateString(locale),
                                            })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() =>
                                                reviewRequest.mutate({
                                                    requestId: req.id,
                                                    reviewerUserId: user?.id,
                                                    decision: "APPROVED",
                                                })
                                            }
                                            disabled={!user?.id || reviewRequest.isPending}
                                        >
                                            {t("dash.teacher.students.approve")}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                reviewRequest.mutate({
                                                    requestId: req.id,
                                                    reviewerUserId: user?.id,
                                                    decision: "REJECTED",
                                                })
                                            }
                                            disabled={!user?.id || reviewRequest.isPending}
                                        >
                                            {t("dash.teacher.students.reject")}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card className="bg-blue-500/5 border-blue-500/20">
                    <CardContent className="p-4 flex items-center gap-3">
                        <User className="w-8 h-8 text-blue-500" />
                        <div>
                            <p className="text-2xl font-bold">{students.length}</p>
                            <p className="text-xs text-muted-foreground">{t("dash.teacher.students.totalStudents")}</p>
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
                            <p className="text-xs text-muted-foreground">{t("dash.teacher.students.avgScores")}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-purple-500/5 border-purple-500/20">
                    <CardContent className="p-4 flex items-center gap-3">
                        <Gamepad2 className="w-8 h-8 text-purple-500" />
                        <div>
                            <p className="text-2xl font-bold">{(hostedResults || []).length}</p>
                            <p className="text-xs text-muted-foreground">{t("dash.teacher.students.completedChallenges")}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="relative w-full md:w-96">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", searchIconPos)} />
                <Input
                    placeholder={t("dash.teacher.students.searchPlaceholder")}
                    className={searchPadding}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="space-y-3">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
                    ))
                ) : filteredStudents.length === 0 ? (
                    <Card className="p-12 text-center">
                        <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-muted-foreground text-lg">{t("dash.teacher.students.empty")}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t("dash.teacher.students.emptyDesc")}
                        </p>
                    </Card>
                ) : (
                    filteredStudents.map((student: any) => (
                        <Card key={student.id} className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-4 flex items-center gap-4">
                                <Avatar className="w-10 h-10">
                                    <AvatarImage src={student.avatar} />
                                    <AvatarFallback>{student.name?.[0] || "S"}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-medium">{student.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {t("dash.teacher.students.activityLine", {
                                            n: String(student.totalChallenges),
                                            date: student.lastActive
                                                ? new Date(student.lastActive).toLocaleDateString(locale)
                                                : "—",
                                        })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="text-center">
                                        <div className={`font-bold ${student.avgScore >= 80 ? "text-emerald-600" : student.avgScore >= 60 ? "text-amber-600" : "text-destructive"}`}>
                                            {student.avgScore}%
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">{t("dash.teacher.students.averageLabel")}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold flex items-center gap-1 text-amber-600">
                                            <Trophy className="w-3 h-3" />
                                            {student.totalChallenges}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">{t("dash.teacher.students.challengeLabel")}</div>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setSelectedStudent(student)}>{t("dash.teacher.students.viewDetails")}</DropdownMenuItem>
                                        <DropdownMenuItem>{t("dash.teacher.students.sendMessage")}</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
                <DialogContent className="max-w-md" dir={dir}>
                    <DialogHeader>
                        <DialogTitle className={textAlign}>{t("dash.teacher.students.dialogTitle")}</DialogTitle>
                        <DialogDescription className={textAlign}>
                            {t("dash.teacher.students.dialogDesc")}
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

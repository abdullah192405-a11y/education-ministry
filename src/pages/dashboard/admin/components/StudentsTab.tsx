import { useMemo, useState } from "react";
import {
    Search, MoreVertical, Trophy, Gamepad2, TrendingUp, User,
    Pencil, Trash2, UserPlus, Ban, CheckCircle2, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminStats, useGrades, useUser } from "@/hooks/useDatabase";
import {
    useAdminUsers,
    useAdminSetStudentGrade,
    useAdminSetUserActive,
    useAdminDeleteUser,
    AdminUserError,
} from "@/hooks/useAdminUsers";
import { useOrgAdminTenant } from "@/hooks/useOrgAdminTenant";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import UserFormDialog from "./UserFormDialog";

const ALL_CLASSES = "__all__";
const NO_CLASS = "__none__";

const StudentsTab = () => {
    const { t, dir, locale, isRtl } = useDashboardLocale();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [gradeFilter, setGradeFilter] = useState<string>(ALL_CLASSES);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<any | null>(null);
    /** Row whose class select is mid-save, so only that row shows a spinner. */
    const [savingGradeFor, setSavingGradeFor] = useState<string | null>(null);

    const { allUsersOptions, adminStatsOptions, scopedOrganizationId } = useOrgAdminTenant();
    const { data: allUsers, isLoading } = useAdminUsers(allUsersOptions);
    const { data: adminStats } = useAdminStats(adminStatsOptions);
    const { data: grades = [] } = useGrades({ organizationId: scopedOrganizationId });
    const { data: currentUser } = useUser();

    const setStudentGrade = useAdminSetStudentGrade();
    const setUserActive = useAdminSetUserActive();
    const deleteUser = useAdminDeleteUser();

    const students = useMemo(
        () => (allUsers || []).filter((u: any) => u.role === "STUDENT"),
        [allUsers],
    );

    const filteredStudents = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        return students.filter((student: any) => {
            const matchesTerm = !term
                || student.name?.toLowerCase().includes(term)
                || student.email?.toLowerCase().includes(term);
            if (!matchesTerm) return false;

            if (gradeFilter === ALL_CLASSES) return true;
            const gradeId = student.student_profile?.grade_id || null;
            return gradeFilter === NO_CLASS ? !gradeId : gradeId === gradeFilter;
        });
    }, [students, searchTerm, gradeFilter]);

    // Students with no class see no content at all — surface how many there are.
    const withoutClass = useMemo(
        () => students.filter((s: any) => !s.student_profile?.grade_id).length,
        [students],
    );

    const openCreate = () => {
        setEditingUser(null);
        setFormOpen(true);
    };

    const openEdit = (student: any) => {
        setEditingUser(student);
        setFormOpen(true);
    };

    const handleGradeChange = async (student: any, gradeId: string) => {
        setSavingGradeFor(student.id);
        try {
            await setStudentGrade.mutateAsync({
                userId: student.id,
                gradeId: gradeId === NO_CLASS ? null : gradeId,
            });
            toast({ title: t("dash.admin.users.toast.classChanged") });
        } catch (error: any) {
            toast({
                title: t("dash.common.error"),
                description: error?.message || t("dash.admin.users.toast.classChangeFailed"),
                variant: "destructive",
            });
        } finally {
            setSavingGradeFor(null);
        }
    };

    const handleToggleActive = async (student: any) => {
        const nextActive = student.is_active === false;
        try {
            await setUserActive.mutateAsync({
                userId: student.id,
                isActive: nextActive,
                organizationId: scopedOrganizationId,
            });
            toast({
                title: t(nextActive ? "dash.admin.users.toast.restored" : "dash.admin.users.toast.suspended"),
            });
        } catch (error: any) {
            const description = error instanceof AdminUserError
                ? t(`dash.admin.users.err.${error.code}` as any)
                : t("dash.admin.users.toast.statusFailed");
            toast({ title: t("dash.common.error"), description, variant: "destructive" });
        }
    };

    const handleDelete = async () => {
        if (!pendingDelete) return;
        try {
            await deleteUser.mutateAsync({
                userId: pendingDelete.id,
                role: pendingDelete.role,
                organizationId: scopedOrganizationId,
                currentUserId: currentUser?.id,
            });
            toast({ title: t("dash.admin.users.toast.deleted") });
        } catch (error: any) {
            const description = error instanceof AdminUserError
                ? t(`dash.admin.users.err.${error.code}` as any)
                : error?.message || t("dash.admin.users.toast.deleteFailed");
            toast({ title: t("dash.common.error"), description, variant: "destructive" });
        } finally {
            setPendingDelete(null);
        }
    };

    const searchIconPos = isRtl ? "right-3" : "left-3";
    const searchPad = isRtl ? "pr-9" : "pl-9";

    return (
        <div className="space-y-6" dir={dir}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">{t("dash.admin.students.total")}</p>
                            <p className="text-2xl font-bold text-primary">{(adminStats?.totalStudents || students.length).toLocaleString(locale)}</p>
                        </div>
                        <User className="w-8 h-8 text-primary opacity-50" />
                    </CardContent>
                </Card>
                <Card className="bg-emerald-500/5 border-emerald-500/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">{t("dash.admin.students.active")}</p>
                            <p className="text-2xl font-bold text-emerald-600">
                                {students.filter((s: any) => s.is_active !== false).length.toLocaleString(locale)}
                            </p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </CardContent>
                </Card>
                <Card className={cn(
                    "border",
                    withoutClass > 0 ? "bg-amber-500/10 border-amber-500/30" : "bg-purple-500/5 border-purple-500/20",
                )}>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">{t("dash.admin.users.noClass")}</p>
                            <p className={cn("text-2xl font-bold", withoutClass > 0 ? "text-amber-600" : "text-purple-600")}>
                                {withoutClass.toLocaleString(locale)}
                            </p>
                        </div>
                        <Gamepad2 className="w-8 h-8 opacity-40" />
                    </CardContent>
                </Card>
                <Card className="bg-amber-500/5 border-amber-500/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">{t("dash.admin.students.totalSubjects")}</p>
                            <p className="text-2xl font-bold text-amber-600">
                                {adminStats?.totalSubjects || 0}
                            </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-amber-600 opacity-50" />
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", searchIconPos)} />
                    <Input
                        placeholder={t("dash.admin.students.search")}
                        className={searchPad}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Select value={gradeFilter} onValueChange={setGradeFilter}>
                        <SelectTrigger className="w-full md:w-56">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_CLASSES}>{t("dash.admin.users.allClasses")}</SelectItem>
                            <SelectItem value={NO_CLASS}>{t("dash.admin.users.noClassFilter")}</SelectItem>
                            {(grades as any[]).map((grade) => (
                                <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button className="gap-2 shrink-0" onClick={openCreate}>
                        <UserPlus className="w-4 h-4" />
                        {t("dash.admin.users.addStudent")}
                    </Button>
                </div>
            </div>

            <Card>
                {isLoading ? (
                    <div className="p-6 space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-[50px] w-full" />
                        ))}
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-12">
                        <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-muted-foreground text-lg">{t("dash.admin.students.noStudents")}</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("dash.admin.students.colStudent")}</TableHead>
                                <TableHead>{t("dash.admin.students.colEmail")}</TableHead>
                                <TableHead className="min-w-[200px]">{t("dash.admin.users.colClass")}</TableHead>
                                <TableHead className="text-center">{t("dash.admin.students.colPoints")}</TableHead>
                                <TableHead className="text-center">{t("dash.admin.students.colStatus")}</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStudents.map((student: any) => (
                                <TableRow key={student.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <Avatar>
                                                    <AvatarImage src={student.avatar || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${student.id}`} />
                                                    <AvatarFallback>{student.name?.[0] || "S"}</AvatarFallback>
                                                </Avatar>
                                                <div className={cn(
                                                    "absolute bottom-0 w-3 h-3 rounded-full border-2 border-background",
                                                    isRtl ? "right-0" : "left-0",
                                                    student.is_active !== false ? "bg-emerald-500" : "bg-gray-300",
                                                )} />
                                            </div>
                                            <div>
                                                <p className="font-medium">{student.name || t("dash.admin.students.noName")}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(student.created_at).toLocaleDateString(locale)}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground" dir="ltr">{student.email}</TableCell>
                                    <TableCell>
                                        {/* The headline repair: fix a wrong class inline, no dialog. */}
                                        <div className="flex items-center gap-2">
                                            <Select
                                                value={student.student_profile?.grade_id || NO_CLASS}
                                                onValueChange={(value) => handleGradeChange(student, value)}
                                                disabled={savingGradeFor === student.id}
                                            >
                                                <SelectTrigger className={cn(
                                                    "h-9",
                                                    !student.student_profile?.grade_id && "border-amber-400 text-amber-700",
                                                )}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={NO_CLASS}>{t("dash.admin.users.noClass")}</SelectItem>
                                                    {(grades as any[]).map((grade) => (
                                                        <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {savingGradeFor === student.id && (
                                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1 font-bold text-amber-600">
                                            <Trophy className="w-4 h-4" />
                                            {student.student_profile?.total_points || 0}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={student.is_active !== false ? "default" : "secondary"}>
                                            {student.is_active !== false
                                                ? t("dash.admin.students.activeStatus")
                                                : t("dash.admin.students.inactiveStatus")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align={isRtl ? "end" : "start"}>
                                                <DropdownMenuItem onClick={() => openEdit(student)} className="gap-2">
                                                    <Pencil className="w-4 h-4" />
                                                    {t("dash.admin.users.editAction")}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleToggleActive(student)} className="gap-2">
                                                    {student.is_active === false
                                                        ? <><CheckCircle2 className="w-4 h-4" />{t("dash.admin.users.restoreAction")}</>
                                                        : <><Ban className="w-4 h-4" />{t("dash.admin.users.suspendAction")}</>}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive gap-2"
                                                    onClick={() => setPendingDelete(student)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    {t("dash.admin.users.deleteAction")}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

            <UserFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                user={editingUser}
                defaultRole="STUDENT"
            />

            <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
                <AlertDialogContent dir={dir}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("dash.admin.users.deleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t("dash.admin.users.deleteDesc", { name: pendingDelete?.name || pendingDelete?.email || "" })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel>{t("dash.common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={handleDelete}
                        >
                            {t("dash.admin.users.deleteConfirm")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default StudentsTab;

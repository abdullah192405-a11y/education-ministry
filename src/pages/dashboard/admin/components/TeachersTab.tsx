import { useState } from "react";
import {
    Search, MoreVertical, Mail,
    UserCheck, Shield, KeyRound, Pencil, Trash2, Ban, CheckCircle2, UserPlus,
    GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
    useGrades,
    usePendingTeacherRegistrationRequestsForAdmin,
    useReviewRegistrationRequest,
    useTeacherClassAccess,
    useTeacherProfile,
    useUser,
} from "@/hooks/useDatabase";
import { useAccountCapabilities } from "@/hooks/useAccountCapabilities";
import { useOrgAdminTenant } from "@/hooks/useOrgAdminTenant";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import TeacherClassAccessDialog from "./TeacherClassAccessDialog";
import UserFormDialog from "./UserFormDialog";
import { summarizeTeacherClassAccess } from "@/lib/teacherClassAccess";
import { useToast } from "@/components/ui/use-toast";
import {
    useAdminUsers,
    useAdminSetUserActive,
    useAdminDeleteUser,
    AdminUserError,
} from "@/hooks/useAdminUsers";
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
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const TeacherAccessSummary = ({ teacherUserId }: { teacherUserId: string }) => {
    const { t } = useDashboardLocale();
    const { scopedOrganizationId } = useOrgAdminTenant();
    const { data: profile } = useTeacherProfile(teacherUserId);
    const { data: access } = useTeacherClassAccess(profile?.id || "");
    const { data: grades = [] } = useGrades({ organizationId: scopedOrganizationId });

    if (!profile) return null;

    return (
        <p className="text-xs text-muted-foreground mt-1">
            {summarizeTeacherClassAccess(access, grades as any[], t)}
        </p>
    );
};

const TeachersTab = () => {
    const { t, dir, locale, isRtl } = useDashboardLocale();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [accessTeacher, setAccessTeacher] = useState<{ id: string; name: string } | null>(null);
    const [editingTeacher, setEditingTeacher] = useState<any | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<any | null>(null);
    const { toast } = useToast();
    const { allUsersOptions, scopedOrganizationId } = useOrgAdminTenant();
    const { data: allUsers, isLoading } = useAdminUsers(allUsersOptions);
    const { data: user } = useUser();
    const setUserActive = useAdminSetUserActive();
    const deleteUser = useAdminDeleteUser();
    const orgId = allUsersOptions.organizationId || null;
    const { data: pendingRequests = [], isLoading: isLoadingPending } = usePendingTeacherRegistrationRequestsForAdmin(orgId);
    const reviewRequest = useReviewRegistrationRequest();
    const { orgAllowsTeachers } = useAccountCapabilities();

    const teachers = (allUsers || []).filter((u: any) => u.role === "TEACHER");

    const filteredTeachers = teachers.filter((teacher: any) =>
        (teacher.name?.includes(searchTerm) || teacher.email?.includes(searchTerm)) &&
        (statusFilter === "all" || (statusFilter === "active" ? teacher.is_active !== false : teacher.is_active === false))
    );

    const openCreate = () => {
        setEditingTeacher(null);
        setFormOpen(true);
    };

    const openEdit = (teacher: any) => {
        setEditingTeacher(teacher);
        setFormOpen(true);
    };

    const describeError = (error: unknown, fallbackKey: string) =>
        error instanceof AdminUserError
            ? t(`dash.admin.users.err.${error.code}` as any)
            : t(fallbackKey as any);

    const handleToggleActive = async (teacher: any) => {
        const nextActive = teacher.is_active === false;
        try {
            await setUserActive.mutateAsync({
                userId: teacher.id,
                isActive: nextActive,
                organizationId: scopedOrganizationId,
            });
            toast({
                title: t(nextActive ? "dash.admin.users.toast.restored" : "dash.admin.users.toast.suspended"),
            });
        } catch (error) {
            toast({
                title: t("dash.common.error"),
                description: describeError(error, "dash.admin.users.toast.statusFailed"),
                variant: "destructive",
            });
        }
    };

    const handleDelete = async () => {
        if (!pendingDelete) return;
        try {
            await deleteUser.mutateAsync({
                userId: pendingDelete.id,
                role: pendingDelete.role,
                organizationId: scopedOrganizationId,
                currentUserId: user?.id,
            });
            toast({ title: t("dash.admin.users.toast.deleted") });
        } catch (error) {
            toast({
                title: t("dash.common.error"),
                description: describeError(error, "dash.admin.users.toast.deleteFailed"),
                variant: "destructive",
            });
        } finally {
            setPendingDelete(null);
        }
    };

    const searchIconPos = isRtl ? "right-3" : "left-3";
    const searchPad = isRtl ? "pr-9" : "pl-9";

    return (
        <div className="space-y-6" dir={dir}>
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{t("dash.admin.teachers.pendingTitle")}</h3>
                        <Badge variant="outline">{pendingRequests.length}</Badge>
                    </div>
                    {isLoadingPending ? (
                        <p className="text-sm text-muted-foreground">{t("dash.admin.teachers.loadingPending")}</p>
                    ) : pendingRequests.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("dash.admin.teachers.noPending")}</p>
                    ) : (
                        <div className="space-y-2">
                            {pendingRequests.map((req: any) => (
                                <div key={req.id} className="rounded-lg border bg-background p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div>
                                        <p className="font-medium">{req.applicant?.name || t("dash.admin.teachers.newTeacher")}</p>
                                        <p className="text-xs text-muted-foreground">{req.applicant?.email}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {t("dash.admin.teachers.gradeLine", {
                                                grade: req.grade?.name || t("dash.admin.teachers.gradePendingAssignment"),
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
                                            {t("dash.admin.teachers.approve")}
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
                                            {t("dash.admin.teachers.reject")}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
            {!orgAllowsTeachers && (
                <p className="text-sm rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-foreground">
                    {t("dash.admin.teachers.packageNote")}
                </p>
            )}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-4 w-full md:w-auto flex-1">
                    <div className="relative w-full md:w-80">
                        <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", searchIconPos)} />
                        <Input
                            placeholder={t("dash.admin.teachers.search")}
                            className={searchPad}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={t("dash.admin.teachers.statusPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t("dash.admin.teachers.statusAll")}</SelectItem>
                            <SelectItem value="active">{t("dash.admin.teachers.statusActive")}</SelectItem>
                            <SelectItem value="inactive">{t("dash.admin.teachers.statusInactive")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button
                    disabled={!orgAllowsTeachers}
                    onClick={openCreate}
                    className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
                >
                    <UserPlus className="w-4 h-4" />
                    {t("dash.admin.users.addTeacher")}
                </Button>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-[80px] w-full rounded-xl" />
                    ))
                ) : filteredTeachers.length === 0 ? (
                    <div className="text-center py-12">
                        <UserCheck className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-muted-foreground text-lg">{t("dash.admin.teachers.noTeachers")}</p>
                    </div>
                ) : (
                    filteredTeachers.map((teacher: any) => (
                        <Card key={teacher.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
                                <div className="flex items-center gap-4 flex-1">
                                    <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                                        <AvatarImage src={teacher.avatar || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${teacher.id}`} />
                                        <AvatarFallback>{teacher.name?.[0] || "T"}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold">{teacher.name || t("dash.admin.teachers.noName")}</h3>
                                            {teacher.is_active !== false && (
                                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                    {t("dash.admin.teachers.active")}
                                                </Badge>
                                            )}
                                            {teacher.is_active === false && (
                                                <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                                                    {t("dash.admin.teachers.inactive")}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                            <div className="flex items-center gap-1">
                                                <Mail className="w-3 h-3" />
                                                {teacher.email}
                                            </div>
                                            {teacher.teacher_profile?.subject?.name && (
                                                <div className="hidden md:flex items-center gap-1">
                                                    <Shield className="w-3 h-3" />
                                                    {teacher.teacher_profile.subject.name}
                                                </div>
                                            )}
                                            {teacher.teacher_profile?.grade?.name && (
                                                <div className="hidden md:flex items-center gap-1">
                                                    <GraduationCap className="w-3 h-3" />
                                                    {teacher.teacher_profile.grade.name}
                                                </div>
                                            )}
                                        </div>
                                        <TeacherAccessSummary teacherUserId={teacher.id} />
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 text-sm">
                                    <div className="text-center">
                                        <p className="font-bold text-lg">{teacher.teacher_profile?.total_students || 0}</p>
                                        <p className="text-muted-foreground text-xs">{t("dash.admin.teachers.studentCount")}</p>
                                    </div>
                                </div>

                                <div className={cn("flex items-center gap-2", isRtl ? "border-r pr-4 mr-4" : "border-l pl-4 ml-4")}>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-1.5"
                                        disabled={!orgAllowsTeachers}
                                        onClick={() => setAccessTeacher({ id: teacher.id, name: teacher.name || "" })}
                                    >
                                        <KeyRound className="w-3.5 h-3.5" />
                                        {t("dash.admin.teachers.manageAccess")}
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align={isRtl ? "end" : "start"}>
                                            <DropdownMenuItem
                                                onClick={() => setAccessTeacher({ id: teacher.id, name: teacher.name || "" })}
                                            >
                                                {t("dash.admin.teachers.manageAccess")}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => openEdit(teacher)} className="gap-2">
                                                <Pencil className="w-4 h-4" />
                                                {t("dash.admin.teachers.editData")}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleToggleActive(teacher)} className="gap-2">
                                                {teacher.is_active === false
                                                    ? <><CheckCircle2 className="w-4 h-4" />{t("dash.admin.users.restoreAction")}</>
                                                    : <><Ban className="w-4 h-4" />{t("dash.admin.users.suspendAction")}</>}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive gap-2"
                                                onClick={() => setPendingDelete(teacher)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                {t("dash.admin.users.deleteAction")}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <TeacherClassAccessDialog
                open={!!accessTeacher}
                onOpenChange={(open) => !open && setAccessTeacher(null)}
                teacherUserId={accessTeacher?.id ?? null}
                teacherName={accessTeacher?.name}
            />

            <UserFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                user={editingTeacher}
                defaultRole="TEACHER"
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

export default TeachersTab;

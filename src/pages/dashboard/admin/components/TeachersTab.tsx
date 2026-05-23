import { useState } from "react";
import {
    Search, MoreVertical, Mail,
    UserCheck, Shield, KeyRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
    useAllUsers,
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
import { summarizeTeacherClassAccess } from "@/lib/teacherClassAccess";

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
    const { allUsersOptions } = useOrgAdminTenant();
    const { data: allUsers, isLoading } = useAllUsers(allUsersOptions);
    const { data: user } = useUser();
    const orgId = allUsersOptions.organizationId || null;
    const { data: pendingRequests = [], isLoading: isLoadingPending } = usePendingTeacherRegistrationRequestsForAdmin(orgId);
    const reviewRequest = useReviewRegistrationRequest();
    const { orgAllowsTeachers } = useAccountCapabilities();

    const teachers = (allUsers || []).filter((u: any) => u.role === "TEACHER");

    const filteredTeachers = teachers.filter((teacher: any) =>
        (teacher.name?.includes(searchTerm) || teacher.email?.includes(searchTerm)) &&
        (statusFilter === "all" || (statusFilter === "active" ? teacher.is_active !== false : teacher.is_active === false))
    );

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
                    className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
                >
                    <UserCheck className="w-4 h-4" />
                    {t("dash.admin.teachers.verifyNew")}
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
                                        <AvatarImage src={teacher.avatar_url || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${teacher.id}`} />
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
                                            {teacher.subject && (
                                                <div className="hidden md:flex items-center gap-1">
                                                    <Shield className="w-3 h-3" />
                                                    {teacher.subject}
                                                </div>
                                            )}
                                        </div>
                                        <TeacherAccessSummary teacherUserId={teacher.id} />
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 text-sm">
                                    <div className="text-center">
                                        <p className="font-bold text-lg">{teacher.total_students || 0}</p>
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
                                            <DropdownMenuItem>{t("dash.admin.teachers.editData")}</DropdownMenuItem>
                                            <DropdownMenuItem>{t("dash.admin.teachers.sendMessage")}</DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive">{t("dash.admin.teachers.suspend")}</DropdownMenuItem>
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
        </div>
    );
};

export default TeachersTab;

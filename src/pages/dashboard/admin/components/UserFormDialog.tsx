import { useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import { useGrades } from "@/hooks/useDatabase";
import { useAdminSaveUser, AdminUserError } from "@/hooks/useAdminUsers";
import { useOrgAdminTenant } from "@/hooks/useOrgAdminTenant";
import {
    ADMIN_MANAGED_ROLES,
    MIN_ADMIN_SET_PASSWORD_LENGTH,
    validateAdminUserInput,
    type AdminManagedRole,
    type AdminUserInput,
} from "@/lib/adminUserManagement";

const VALIDATION_KEYS: Record<string, string> = {
    nameRequired: "dash.admin.users.err.nameRequired",
    emailRequired: "dash.admin.users.err.emailRequired",
    emailInvalid: "dash.admin.users.err.emailInvalid",
    roleInvalid: "dash.admin.users.err.roleInvalid",
    gradeRequired: "dash.admin.users.err.gradeRequired",
    passwordRequired: "dash.admin.users.err.passwordRequired",
    passwordTooShort: "dash.admin.users.err.passwordTooShort",
};

const NO_SUBJECT = "__none__";

/** Readable one-off password so the admin can hand it to the account holder. */
const generatePassword = () => {
    const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    const bytes = new Uint32Array(10);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (n) => alphabet[n % alphabet.length]).join("");
};

export type UserFormDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** null = create a new account. */
    user: any | null;
    /** Role preselected when creating from a specific tab. */
    defaultRole?: AdminManagedRole;
    /** Lock the role picker when the tab only manages one kind of account. */
    lockRole?: boolean;
};

const UserFormDialog = ({ open, onOpenChange, user, defaultRole = "STUDENT", lockRole = false }: UserFormDialogProps) => {
    const { t, dir } = useDashboardLocale();
    const { toast } = useToast();
    const { scopedOrganizationId } = useOrgAdminTenant();
    const { data: grades = [] } = useGrades({ organizationId: scopedOrganizationId });
    const saveUser = useAdminSaveUser();

    const isCreate = !user?.id;
    const previousRole: string | null = user?.role ?? null;

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<AdminManagedRole>(defaultRole);
    const [gradeId, setGradeId] = useState<string>("");
    const [subjectId, setSubjectId] = useState<string>(NO_SUBJECT);
    const [isActive, setIsActive] = useState(true);
    const [password, setPassword] = useState("");

    // Reload the form whenever it is opened for a different account.
    useEffect(() => {
        if (!open) return;
        const profile = user?.role === "TEACHER" ? user?.teacher_profile : user?.student_profile;
        setName(user?.name || "");
        setEmail(user?.email || "");
        setRole((user?.role as AdminManagedRole) || defaultRole);
        setGradeId(profile?.grade_id || "");
        setSubjectId(user?.teacher_profile?.subject_id || NO_SUBJECT);
        setIsActive(user?.is_active !== false);
        setPassword("");
    }, [open, user, defaultRole]);

    const subjectsForGrade = useMemo(() => {
        const grade = (grades as any[]).find((g) => g.id === gradeId);
        return (grade?.subjects || []) as any[];
    }, [grades, gradeId]);

    // A subject from the previous class cannot survive a class change.
    useEffect(() => {
        if (subjectId === NO_SUBJECT) return;
        if (!subjectsForGrade.some((s) => s.id === subjectId)) setSubjectId(NO_SUBJECT);
    }, [subjectsForGrade, subjectId]);

    const roleChanged = !isCreate && previousRole !== role;

    const handleSubmit = async () => {
        const input: AdminUserInput = {
            id: user?.id,
            name,
            email,
            role,
            gradeId: gradeId || null,
            subjectId: role === "TEACHER" && subjectId !== NO_SUBJECT ? subjectId : null,
            isActive,
            password: password || undefined,
        };

        const invalid = validateAdminUserInput(input, { isCreate });
        if (invalid) {
            toast({
                title: t("dash.common.error"),
                description: t(VALIDATION_KEYS[invalid.code] as any, { min: MIN_ADMIN_SET_PASSWORD_LENGTH }),
                variant: "destructive",
            });
            return;
        }

        try {
            await saveUser.mutateAsync({
                input,
                organizationId: scopedOrganizationId,
                previousRole,
            });
            toast({
                title: t(isCreate ? "dash.admin.users.toast.created" : "dash.admin.users.toast.updated"),
                description: isCreate && password
                    ? t("dash.admin.users.toast.createdWithPassword", { password })
                    : t("dash.admin.users.toast.savedDesc"),
            });
            onOpenChange(false);
        } catch (error: any) {
            const description = error instanceof AdminUserError
                ? t(`dash.admin.users.err.${error.code}` as any)
                : error?.message || t("dash.admin.users.err.saveFailed");
            toast({ title: t("dash.common.error"), description, variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir={dir}>
                <DialogHeader>
                    <DialogTitle>
                        {t(isCreate ? "dash.admin.users.createTitle" : "dash.admin.users.editTitle")}
                    </DialogTitle>
                    <DialogDescription>
                        {t(isCreate ? "dash.admin.users.createDesc" : "dash.admin.users.editDesc")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="admin-user-name">{t("dash.admin.users.nameLabel")}</Label>
                        <Input
                            id="admin-user-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t("dash.admin.users.namePlaceholder")}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="admin-user-email">{t("dash.admin.users.emailLabel")}</Label>
                        <Input
                            id="admin-user-email"
                            type="email"
                            dir="ltr"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="student@school.sa"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t("dash.admin.users.roleLabel")}</Label>
                            <Select
                                value={role}
                                onValueChange={(v) => setRole(v as AdminManagedRole)}
                                disabled={lockRole}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {ADMIN_MANAGED_ROLES.map((r) => (
                                        <SelectItem key={r} value={r}>
                                            {t(r === "STUDENT" ? "dash.common.role.student" : "dash.common.role.teacher")}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>
                                {t(role === "TEACHER" ? "dash.admin.users.primaryClassLabel" : "dash.admin.users.classLabel")}
                            </Label>
                            <Select value={gradeId} onValueChange={setGradeId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("dash.admin.users.classPlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {(grades as any[]).map((grade) => (
                                        <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {role === "TEACHER" && (
                        <div className="space-y-2">
                            <Label>{t("dash.admin.users.subjectLabel")}</Label>
                            <Select value={subjectId} onValueChange={setSubjectId} disabled={!gradeId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("dash.admin.users.subjectPlaceholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={NO_SUBJECT}>{t("dash.admin.users.noSubject")}</SelectItem>
                                    {subjectsForGrade.map((subject) => (
                                        <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="admin-user-password" className="flex items-center gap-2">
                            <KeyRound className="w-3.5 h-3.5" />
                            {t(isCreate ? "dash.admin.users.passwordLabel" : "dash.admin.users.resetPasswordLabel")}
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="admin-user-password"
                                dir="ltr"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t(isCreate
                                    ? "dash.admin.users.passwordPlaceholder"
                                    : "dash.admin.users.resetPasswordPlaceholder")}
                            />
                            <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())}>
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t("dash.admin.users.passwordHint", { min: MIN_ADMIN_SET_PASSWORD_LENGTH })}
                        </p>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                            <p className="font-medium text-sm">{t("dash.admin.users.activeLabel")}</p>
                            <p className="text-xs text-muted-foreground">{t("dash.admin.users.activeHint")}</p>
                        </div>
                        <Switch checked={isActive} onCheckedChange={setIsActive} />
                    </div>

                    {roleChanged && (
                        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
                            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-800">{t("dash.admin.users.roleChangeWarning")}</p>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saveUser.isPending}>
                        {t("dash.common.cancel")}
                    </Button>
                    <Button onClick={handleSubmit} disabled={saveUser.isPending} className="gap-2">
                        {saveUser.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        {t(isCreate ? "dash.admin.users.createAction" : "dash.common.save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default UserFormDialog;

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Bell, User, Lock, Globe, Loader2, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    STUDENT_PUBLIC_DISCUSSIONS_ENABLED_KEY,
    usePlatformSettings,
    useUpsertPlatformSetting,
    useUser,
    useUpdateUser
} from "@/hooks/useDatabase";
import { useState, useEffect, useRef, ChangeEvent } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const TeacherSettingsTab = () => {
    const { t, dir, isRtl } = useDashboardLocale();
    const { data: user } = useUser();
    const { data: platformSettings } = usePlatformSettings();
    const { mutateAsync: updateUser, isPending: isUpdatingUser } = useUpdateUser();
    const { mutateAsync: upsertPlatformSetting, isPending: isSavingClassPreferences } = useUpsertPlatformSetting();
    const { toast } = useToast();

    const [name, setName] = useState("");
    const [avatar, setAvatar] = useState("");
    const [discussionsEnabled, setDiscussionsEnabled] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setAvatar(user.avatar || "");
        }
    }, [user]);

    useEffect(() => {
        const raw = platformSettings?.[STUDENT_PUBLIC_DISCUSSIONS_ENABLED_KEY];
        setDiscussionsEnabled(raw == null ? true : String(raw).toLowerCase() === "true");
    }, [platformSettings]);

    const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: t("dash.student.toast.fileLargeTitle"),
                description: t("dash.student.toast.fileLargeDesc"),
                variant: "destructive",
            });
            return;
        }

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${user.id}/avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('teacher-content')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('teacher-content')
                .getPublicUrl(filePath);

            setAvatar(data.publicUrl);
            toast({
                title: t("dash.student.toast.uploaded"),
                description: t("dash.student.toast.uploadedDesc"),
            });
        } catch (error: any) {
            console.error("Error uploading avatar:", error);
            toast({
                title: t("dash.common.error"),
                description: error.message || t("dash.teacher.settings.uploadErr"),
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveChanges = async () => {
        if (!user) return;
        try {
            await updateUser({
                userId: user.id,
                updates: { name, avatar }
            });
            toast({
                title: t("dash.teacher.settings.toast.saved"),
                description: t("dash.teacher.settings.toast.profileSaved"),
            });
        } catch (err) {
            console.error("User update error:", err);
            toast({
                title: t("dash.common.error"),
                description: t("dash.teacher.settings.toast.profileFail"),
                variant: "destructive",
            });
        }
    };

    const handleSaveClassPreferences = async () => {
        try {
            await upsertPlatformSetting({
                key: STUDENT_PUBLIC_DISCUSSIONS_ENABLED_KEY,
                value: String(discussionsEnabled),
                type: "boolean",
                label: t("dash.teacher.settings.discussions"),
            });
            toast({
                title: t("dash.teacher.settings.toast.saved"),
                description: t("dash.teacher.settings.toast.classSaved"),
            });
        } catch (err) {
            console.error("Failed to save class preferences:", err);
            toast({
                title: t("dash.common.error"),
                description: t("dash.teacher.settings.toast.classFail"),
                variant: "destructive",
            });
        }
    };

    const notifItems = [
        { title: t("dash.teacher.settings.notif1"), desc: t("dash.teacher.settings.notif1Desc") },
        { title: t("dash.teacher.settings.notif2"), desc: t("dash.teacher.settings.notif2Desc") },
        { title: t("dash.teacher.settings.notif3"), desc: t("dash.teacher.settings.notif3Desc") },
        { title: t("dash.teacher.settings.notif4"), desc: t("dash.teacher.settings.notif4Desc") },
    ];

    const isUpdating = isUpdatingUser || isSavingClassPreferences;

    return (
        <Tabs defaultValue="profile" className="w-full" dir={dir}>
            <TabsList className={cn("w-full mb-6 bg-transparent p-0 gap-2 border-b rounded-none h-auto", isRtl ? "justify-end" : "justify-start")}>
                <TabsTrigger
                    value="profile"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                >
                    {t("dash.teacher.settings.tab.profile")}
                </TabsTrigger>
                <TabsTrigger
                    value="notifications"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                >
                    {t("dash.teacher.settings.tab.notifications")}
                </TabsTrigger>
                <TabsTrigger
                    value="class"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                >
                    {t("dash.teacher.settings.tab.class")}
                </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6" dir={dir}>
                <Card>
                    <CardHeader>
                        <CardTitle>{t("dash.teacher.settings.profileTitle")}</CardTitle>
                        <CardDescription>{t("dash.teacher.settings.profileDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-6">
                            <Avatar className="w-24 h-24 border-4 border-muted">
                                <AvatarImage src={avatar || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${user?.id}`} />
                                <AvatarFallback>{name?.[0] || "U"}</AvatarFallback>
                            </Avatar>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                            />
                            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                {isUploading ? <Loader2 className="w-4 h-4 mx-2 animate-spin" /> : null}
                                {isUploading ? t("dash.student.settings.uploading") : t("dash.student.settings.changeAvatar")}
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>{t("dash.teacher.settings.fullName")}</Label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("dash.teacher.settings.fullNamePlaceholder")} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("dash.teacher.settings.email")}</Label>
                                <Input value={user?.email || ""} disabled className="bg-muted" />
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
                            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800">
                                <p className="font-medium mb-1">{t("dash.teacher.settings.gradeInfoTitle")}</p>
                                <p>{t("dash.teacher.settings.gradeInfoDesc")}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6" dir={dir}>
                <Card>
                    <CardHeader>
                        <CardTitle>{t("dash.teacher.settings.notifTitle")}</CardTitle>
                        <CardDescription>{t("dash.teacher.settings.notifDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {notifItems.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Bell className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">{item.title}</p>
                                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                                    </div>
                                </div>
                                <Switch defaultChecked />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="class" className="space-y-6" dir={dir}>
                <Card>
                    <CardHeader>
                        <CardTitle>{t("dash.teacher.settings.classTitle")}</CardTitle>
                        <CardDescription>{t("dash.teacher.settings.classDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <TrophyIcon className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">{t("dash.teacher.settings.leaderboard")}</p>
                                    <p className="text-sm text-muted-foreground">{t("dash.teacher.settings.leaderboardDesc")}</p>
                                </div>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <Globe className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">{t("dash.teacher.settings.discussions")}</p>
                                    <p className="text-sm text-muted-foreground">{t("dash.teacher.settings.discussionsDesc")}</p>
                                </div>
                            </div>
                            <Switch checked={discussionsEnabled} onCheckedChange={setDiscussionsEnabled} />
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <div className={cn("flex pt-4", isRtl ? "justify-end" : "justify-start")}>
                <Button
                    className="gap-2 bg-purple-600 hover:bg-purple-700"
                    onClick={async () => {
                        await Promise.all([handleSaveChanges(), handleSaveClassPreferences()]);
                    }}
                    disabled={isUpdating}
                >
                    <Save className="w-4 h-4" />
                    {isUpdating ? t("dash.teacher.settings.saving") : t("dash.teacher.settings.saveChanges")}
                </Button>
            </div>
        </Tabs>
    );
};

// Helper Icon
const TrophyIcon = ({ className }: { className?: string }) => (
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
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
);

export default TeacherSettingsTab;

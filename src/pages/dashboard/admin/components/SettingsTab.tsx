import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Bell, Shield, Globe, Layers, GraduationCap, Sparkles } from "lucide-react";
import { useUpsertPlatformSetting, useVisitorGradeClassMode } from "@/hooks/useDatabase";
import { VISITOR_GRADE_CLASS_MODE_KEY } from "@/lib/contentVisibility";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/LanguageContext";

function VisitorContentVisibilityCard() {
    const { toast } = useToast();
    const { t } = useTranslation();
    const { mode, isLoading } = useVisitorGradeClassMode();
    const upsert = useUpsertPlatformSetting();

    const onValueChange = (value: string) => {
        upsert.mutate(
            {
                key: VISITOR_GRADE_CLASS_MODE_KEY,
                value,
                type: "string",
                label: t("settingsTab.visitorContent.upsertLabel"),
            },
            {
                onSuccess: () => toast({ title: t("settingsTab.visitorContent.savedTitle") }),
                onError: (e: Error) =>
                    toast({
                        variant: "destructive",
                        title: t("settingsTab.visitorContent.errorTitle"),
                        description: e?.message || t("settingsTab.visitorContent.errorDesc"),
                    }),
            },
        );
    };

    if (isLoading) {
        return <Skeleton className="h-56 w-full rounded-xl" />;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("settingsTab.visitorContent.title")}</CardTitle>
                <CardDescription>
                    {t("settingsTab.visitorContent.desc")}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <RadioGroup
                    value={mode}
                    onValueChange={onValueChange}
                    className="gap-3"
                    disabled={upsert.isPending}
                >
                    <label
                        htmlFor="vgc-all"
                        className="flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-primary"
                    >
                        <RadioGroupItem value="all" id="vgc-all" className="mt-1 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-1">
                            <span className="flex items-center gap-2 font-medium">
                                <Layers className="h-4 w-4 shrink-0 text-primary" />
                                {t("settingsTab.visitorContent.all")}
                            </span>
                            <p className="text-sm text-muted-foreground">
                                {t("settingsTab.visitorContent.allDesc")}
                            </p>
                        </div>
                    </label>
                    <label
                        htmlFor="vgc-teaching"
                        className="flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-primary"
                    >
                        <RadioGroupItem value="teaching_only" id="vgc-teaching" className="mt-1 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-1">
                            <span className="flex items-center gap-2 font-medium">
                                <GraduationCap className="h-4 w-4 shrink-0 text-primary" />
                                {t("settingsTab.visitorContent.teaching")}
                            </span>
                            <p className="text-sm text-muted-foreground">
                                {t("settingsTab.visitorContent.teachingDesc")}
                            </p>
                        </div>
                    </label>
                    <label
                        htmlFor="vgc-enrichment"
                        className="flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-primary"
                    >
                        <RadioGroupItem value="enrichment_only" id="vgc-enrichment" className="mt-1 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-1">
                            <span className="flex items-center gap-2 font-medium">
                                <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                                {t("settingsTab.visitorContent.enrichment")}
                            </span>
                            <p className="text-sm text-muted-foreground">
                                {t("settingsTab.visitorContent.enrichmentDesc")}
                            </p>
                        </div>
                    </label>
                </RadioGroup>
            </CardContent>
        </Card>
    );
}

const SettingsTab = () => {
    const { t, dir } = useTranslation();
    const isRtl = dir === "rtl";
    const textAlign = isRtl ? "text-right" : "text-left";

    const notificationItems = [
        { title: t("settingsTab.notifications.newStudents"), desc: t("settingsTab.notifications.newStudentsDesc") },
        { title: t("settingsTab.notifications.teacherReports"), desc: t("settingsTab.notifications.teacherReportsDesc") },
        { title: t("settingsTab.notifications.groupChallenges"), desc: t("settingsTab.notifications.groupChallengesDesc") },
        { title: t("settingsTab.notifications.support"), desc: t("settingsTab.notifications.supportDesc") },
    ];

    return (
        <div className={`w-full ${textAlign}`} dir={dir}>
        <Tabs defaultValue="general" className="w-full">
            <TabsList className={`flex h-auto min-h-10 w-full flex-wrap ${isRtl ? "flex-row-reverse" : "flex-row"} justify-start gap-2 border-b border-border bg-transparent p-0 mb-6 rounded-none`}>
                <TabsTrigger
                    value="general"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                >
                    {t("settingsTab.tab.general")}
                </TabsTrigger>
                <TabsTrigger
                    value="notifications"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                >
                    {t("settingsTab.tab.notifications")}
                </TabsTrigger>
                <TabsTrigger
                    value="security"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                >
                    {t("settingsTab.tab.security")}
                </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className={`space-y-6 ${textAlign}`} dir={dir}>
                <Card>
                    <CardHeader>
                        <CardTitle>{t("settingsTab.platformInfo.title")}</CardTitle>
                        <CardDescription>{t("settingsTab.platformInfo.desc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("settingsTab.platformInfo.nameLabel")}</Label>
                                <Input defaultValue="Lab4" className={textAlign} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("settingsTab.platformInfo.supportEmail")}</Label>
                                <Input defaultValue="support@platform.com" className={textAlign} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("settingsTab.platformInfo.contactNumber")}</Label>
                                <Input defaultValue="19996" className={textAlign} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("settingsTab.platformInfo.defaultLanguage")}</Label>
                                <Input defaultValue={t("settingsTab.platformInfo.languageValue")} disabled className={textAlign} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <VisitorContentVisibilityCard />

                <Card>
                    <CardHeader>
                        <CardTitle>{t("settingsTab.system.title")}</CardTitle>
                        <CardDescription>{t("settingsTab.system.desc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg" dir={dir}>
                            <div className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : "flex-row"} ${textAlign}`}>
                                <Globe className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">{t("settingsTab.system.maintenanceTitle")}</p>
                                    <p className="text-sm text-muted-foreground">{t("settingsTab.system.maintenanceDesc")}</p>
                                </div>
                            </div>
                            <Switch />
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg" dir={dir}>
                            <div className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : "flex-row"} ${textAlign}`}>
                                <Globe className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">{t("settingsTab.system.publicRegTitle")}</p>
                                    <p className="text-sm text-muted-foreground">{t("settingsTab.system.publicRegDesc")}</p>
                                </div>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="notifications" className={`space-y-6 ${textAlign}`} dir={dir}>
                <Card>
                    <CardHeader>
                        <CardTitle>{t("settingsTab.notifications.title")}</CardTitle>
                        <CardDescription>{t("settingsTab.notifications.desc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {notificationItems.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-4 border rounded-lg" dir={dir}>
                                <div className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : "flex-row"} ${textAlign}`}>
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

            <TabsContent value="security" className={`space-y-6 ${textAlign}`} dir={dir}>
                <Card>
                    <CardHeader>
                        <CardTitle>{t("settingsTab.security.title")}</CardTitle>
                        <CardDescription>{t("settingsTab.security.desc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg" dir={dir}>
                            <div className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : "flex-row"} ${textAlign}`}>
                                <Shield className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">{t("settingsTab.security.twoFA")}</p>
                                    <p className="text-sm text-muted-foreground">{t("settingsTab.security.twoFADesc")}</p>
                                </div>
                            </div>
                            <Switch />
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <div className={`flex ${isRtl ? "justify-end" : "justify-start"} pt-4`}>
                <Button className="gap-2 bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4" />
                    {t("settingsTab.saveChanges")}
                </Button>
            </div>
        </Tabs>
        </div>
    );
};

export default SettingsTab;

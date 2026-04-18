import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Bell, Shield, Globe, Mail, Layers, GraduationCap, Sparkles } from "lucide-react";
import { useUpsertPlatformSetting, useVisitorGradeClassMode } from "@/hooks/useDatabase";
import { VISITOR_GRADE_CLASS_MODE_KEY } from "@/lib/contentVisibility";
import { useToast } from "@/hooks/use-toast";

function VisitorContentVisibilityCard() {
    const { toast } = useToast();
    const { mode, isLoading } = useVisitorGradeClassMode();
    const upsert = useUpsertPlatformSetting();

    const onValueChange = (value: string) => {
        upsert.mutate(
            {
                key: VISITOR_GRADE_CLASS_MODE_KEY,
                value,
                type: "string",
                label: "ظهور المحتوى للزوار (تعليمي/إثرائي)",
            },
            {
                onSuccess: () => toast({ title: "تم حفظ الإعدادات" }),
                onError: (e: Error) =>
                    toast({
                        variant: "destructive",
                        title: "تعذر الحفظ",
                        description: e?.message || "حدث خطأ",
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
                <CardTitle>ظهور المحتوى للزوار</CardTitle>
                <CardDescription>
                    إخفاء أحد النوعين دفعة واحدة: عند اختيار «إثرائي فقط» تُخفى الصفوف التعليمية والعكس. لوحة
                    الإدارة تعرض كل الصفوف للإدارة.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <RadioGroup
                    value={mode}
                    onValueChange={onValueChange}
                    className="gap-3"
                    disabled={upsert.isPending}
                    dir="rtl"
                >
                    <label
                        htmlFor="vgc-all"
                        className="flex cursor-pointer items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-primary"
                    >
                        <RadioGroupItem value="all" id="vgc-all" className="mt-1 shrink-0" />
                        <div className="min-w-0 flex-1 space-y-1">
                            <span className="flex items-center gap-2 font-medium">
                                <Layers className="h-4 w-4 shrink-0 text-primary" />
                                عرض الكل
                            </span>
                            <p className="text-sm text-muted-foreground">
                                الصفوف التعليمية والقنوات الإثرائية معاً
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
                                المحتوى التعليمي فقط
                            </span>
                            <p className="text-sm text-muted-foreground">
                                إخفاء الصفوف والقنوات الإثرائية عن الزوار والمعلمين في الاختيار
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
                                المحتوى الإثرائي فقط
                            </span>
                            <p className="text-sm text-muted-foreground">
                                إخفاء الصفوف التعليمية (الدراسية) عن الزوار والمعلمين في الاختيار
                            </p>
                        </div>
                    </label>
                </RadioGroup>
            </CardContent>
        </Card>
    );
}

const SettingsTab = () => {
    return (
        <div className="w-full" dir="rtl">
        <Tabs defaultValue="general" className="w-full">
            <TabsList className="flex h-auto min-h-10 w-full flex-wrap justify-start gap-2 border-b border-border bg-transparent p-0 mb-6 rounded-none">
                <TabsTrigger
                    value="general"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                >
                    عام
                </TabsTrigger>
                <TabsTrigger
                    value="notifications"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                >
                    الإشعارات
                </TabsTrigger>
                <TabsTrigger
                    value="security"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                >
                    الأمان والصلاحيات
                </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>معلومات المنصة</CardTitle>
                        <CardDescription>تحديث البيانات الأساسية لـ Lab4</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>اسم المنصة</Label>
                                <Input defaultValue="Lab4" />
                            </div>
                            <div className="space-y-2">
                                <Label>البريد الإلكتروني للدعم</Label>
                                <Input defaultValue="support@platform.com" />
                            </div>
                            <div className="space-y-2">
                                <Label>رقم التواصل</Label>
                                <Input defaultValue="19996" />
                            </div>
                            <div className="space-y-2">
                                <Label>اللغة الافتراضية</Label>
                                <Input defaultValue="العربية (المملكة العربية السعودية)" disabled />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <VisitorContentVisibilityCard />

                <Card>
                    <CardHeader>
                        <CardTitle>إعدادات النظام</CardTitle>
                        <CardDescription>تكوين خصائص النظام العامة</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <Globe className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">وضع الصيانة</p>
                                    <p className="text-sm text-muted-foreground">إيقاف الموقع مؤقتاً لجميع المستخدمين عدا المسؤولين</p>
                                </div>
                            </div>
                            <Switch />
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <Globe className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">التسجيل العام</p>
                                    <p className="text-sm text-muted-foreground">السماح بتسجيل حسابات جديدة للطلاب</p>
                                </div>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>تفضيلات الإشعارات</CardTitle>
                        <CardDescription>التحكم في الإشعارات المرسلة عبر النظام</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[
                            { title: "تسجيل طلاب جدد", desc: "إشعار عند تسجيل طالب جديد" },
                            { title: "تقارير المعلمين", desc: "إشعار عند رفع تقرير من معلم" },
                            { title: "التحديات الجماعية", desc: "تنبيهات حول نشاط التحديات" },
                            { title: "الدعم الفني", desc: "تنبيهات تذاكر الدعم الفني الجديدة" },
                        ].map((item, i) => (
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

            <TabsContent value="security" className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>الأمان</CardTitle>
                        <CardDescription>إعدادات الأمان والتحقق</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">المصادقة الثنائية (2FA)</p>
                                    <p className="text-sm text-muted-foreground">فرض المصادقة الثنائية على حسابات المسؤولين</p>
                                </div>
                            </div>
                            <Switch />
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <div className="flex justify-end pt-4">
                <Button className="gap-2 bg-green-600 hover:bg-green-700">
                    <Save className="w-4 h-4" />
                    حفظ التغييرات
                </Button>
            </div>
        </Tabs>
        </div>
    );
};

export default SettingsTab;

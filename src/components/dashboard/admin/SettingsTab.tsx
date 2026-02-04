import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Bell, Shield, Globe, Mail } from "lucide-react";

const SettingsTab = () => {
    return (
        <Tabs defaultValue="general" className="w-full">
            <TabsList className="w-full justify-start mb-6 bg-transparent p-0 gap-2 border-b rounded-none h-auto">
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
                        <CardDescription>تحديث البيانات الأساسية للمنصة التعليمية</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>اسم المنصة</Label>
                                <Input defaultValue="وزارة التربية والتعليم" />
                            </div>
                            <div className="space-y-2">
                                <Label>البريد الإلكتروني للدعم</Label>
                                <Input defaultValue="support@edu.sa" />
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
    );
};

export default SettingsTab;

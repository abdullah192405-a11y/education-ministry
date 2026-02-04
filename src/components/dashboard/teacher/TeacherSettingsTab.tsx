import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Bell, User, Lock, Globe } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const TeacherSettingsTab = () => {
    return (
        <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full justify-start mb-6 bg-transparent p-0 gap-2 border-b rounded-none h-auto">
                <TabsTrigger
                    value="profile"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                >
                    الملف الشخصي
                </TabsTrigger>
                <TabsTrigger
                    value="notifications"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                >
                    الإشعارات
                </TabsTrigger>
                <TabsTrigger
                    value="class"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                >
                    إعدادات الفصل
                </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>المعلومات الشخصية</CardTitle>
                        <CardDescription>قم بتحديث معلوماتك الشخصية وصورتك الرمزية</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-6">
                            <Avatar className="w-24 h-24 border-4 border-muted">
                                <AvatarImage src="https://api.dicebear.com/7.x/fun-emoji/svg?seed=fatima" />
                                <AvatarFallback>FH</AvatarFallback>
                            </Avatar>
                            <Button variant="outline">تغيير الصورة</Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>الاسم الكامل</Label>
                                <Input defaultValue="فاطمة الحربي" />
                            </div>
                            <div className="space-y-2">
                                <Label>البريد الإلكتروني</Label>
                                <Input defaultValue="teacher@edu.sa" disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>المسمى الوظيفي</Label>
                                <Input defaultValue="معلمة لغة عربية" />
                            </div>
                            <div className="space-y-2">
                                <Label>المدرسة</Label>
                                <Input defaultValue="المدرسة الابتدائية الأولى" disabled />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>تفضيلات الإشعارات</CardTitle>
                        <CardDescription>اختر كيف تريد تلقي التنبيهات</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[
                            { title: "إكمال الطلاب للواجبات", desc: "تلقي إشعار عندما يكمل طالب واجباً" },
                            { title: "رسائل أولياء الأمور", desc: "تنبيهات الرسائل المباشرة" },
                            { title: "التقارير الأسبوعية", desc: "ملخص أسبوعي لأداء الفصل" },
                            { title: "تنبيهات النظام", desc: "تحديثات وإعلانات المنصة" },
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

            <TabsContent value="class" className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>تفضيلات الفصل الدراسي</CardTitle>
                        <CardDescription>إعدادات عامة لتجربة الطلاب</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <TrophyIcon className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">لوحة المتصدرين</p>
                                    <p className="text-sm text-muted-foreground">السماح للطلاب برؤية ترتيبهم</p>
                                </div>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <Globe className="w-5 h-5 text-muted-foreground" />
                                <div>
                                    <p className="font-medium">المناقشات العامة</p>
                                    <p className="text-sm text-muted-foreground">تفعيل ساحة النقاش للطلاب</p>
                                </div>
                            </div>
                            <Switch />
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <div className="flex justify-end pt-4">
                <Button className="gap-2 bg-purple-600 hover:bg-purple-700">
                    <Save className="w-4 h-4" />
                    حفظ التغييرات
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

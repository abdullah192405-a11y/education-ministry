import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Bell, User, Lock, Globe, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser, useTeacherProfile, useUpdateUser, useUpdateTeacherProfile, useGrades } from "@/hooks/useDatabase";
import { useState, useEffect, useRef, ChangeEvent } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const TeacherSettingsTab = () => {
    const { data: user } = useUser();
    const { data: profile } = useTeacherProfile(user?.id || "");
    const { data: grades } = useGrades();
    const { mutate: updateUser, isPending: isUpdatingUser } = useUpdateUser();
    const { mutate: updateProfile, isPending: isUpdatingProfile } = useUpdateTeacherProfile();
    const { toast } = useToast();

    const [name, setName] = useState("");
    const [avatar, setAvatar] = useState("");
    const [gradeId, setGradeId] = useState("");
    const [subjectId, setSubjectId] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setAvatar(user.avatar || "");
        }
    }, [user]);

    useEffect(() => {
        if (profile) {
            setGradeId(profile.grade_id || "");
            setSubjectId(profile.subject_id || "");
        }
    }, [profile]);

    const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: "حجم الملف كبير",
                description: "يجب ألا يتجاوز حجم الصورة 5 ميجابايت",
                variant: "destructive"
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
                title: "تم رفع الصورة",
                description: "تم تحديث صورتك الرمزية بنجاح",
            });
        } catch (error) {
            console.error("Error uploading avatar:", error);
            toast({
                title: "خطأ",
                description: "حدث خطأ أثناء رفع الصورة",
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveChanges = () => {
        if (!user) return;

        // 1. Update User (Name, Avatar)
        updateUser({
            userId: user.id,
            updates: { name, avatar }
        }, {
            onSuccess: () => {
                // 2. Update Teacher Profile (Grade, Subject)
                updateProfile({
                    userId: user.id,
                    updates: {
                        grade_id: gradeId || null,
                        subject_id: subjectId || null,
                        updated_at: new Date().toISOString()
                    }
                }, {
                    onSuccess: () => {
                        toast({
                            title: "تم حفظ التغييرات",
                            description: "تم تحديث معلوماتك الشخصية والمهنية بنجاح",
                        });
                    },
                    onError: (err) => {
                        console.error("Profile update error:", err);
                        toast({
                            title: "خطأ في تحديث الملف المهني",
                            description: "فشل تحديث معلومات المادة والصف",
                            variant: "destructive"
                        });
                    }
                });
            },
            onError: (err) => {
                console.error("User update error:", err);
                toast({
                    title: "خطأ",
                    description: "فشل تحديث المعلومات الشخصية",
                    variant: "destructive"
                });
            }
        });
    };

    const handleGradeChange = (val: string) => {
        setGradeId(val);
        setSubjectId("");

        if (user) {
            updateProfile({
                userId: user.id,
                updates: {
                    grade_id: val || null,
                    subject_id: null,
                    updated_at: new Date().toISOString()
                }
            }, {
                onSuccess: () => {
                    toast({
                        title: "تم الحفظ",
                        description: "تم حفظ الصف بنجاح",
                        variant: "default"
                    });
                }
            });
        }
    };

    const handleSubjectChange = (val: string) => {
        setSubjectId(val);

        if (user) {
            updateProfile({
                userId: user.id,
                updates: {
                    grade_id: gradeId || null,
                    subject_id: val || null,
                    updated_at: new Date().toISOString()
                }
            }, {
                onSuccess: () => {
                    toast({
                        title: "تم الحفظ",
                        description: "تم حفظ المادة بنجاح",
                        variant: "default"
                    });
                }
            });
        }
    };

    const isUpdating = isUpdatingUser || isUpdatingProfile;
    const selectedGrade = grades?.find(g => g.id === gradeId);
    const availableSubjects = selectedGrade?.subjects || [];

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

            <TabsContent value="profile" className="space-y-6" dir="rtl">
                <Card>
                    <CardHeader>
                        <CardTitle>المعلومات الشخصية والمهنية</CardTitle>
                        <CardDescription>قم بتحديث معلوماتك الشخصية، تخصصك، وصورتك الرمزية</CardDescription>
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
                                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                {isUploading ? "جاري الرفع..." : "تغيير الصورة"}
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>الاسم الكامل</Label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="أدخل اسمك الكامل" />
                            </div>
                            <div className="space-y-2">
                                <Label>البريد الإلكتروني</Label>
                                <Input value={user?.email || ""} disabled className="bg-muted" />
                            </div>

                            <div className="space-y-2">
                                <Label>الصف الدراسي</Label>
                                <Select value={gradeId} onValueChange={handleGradeChange}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="اختر الصف" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {grades?.map((grade) => (
                                            <SelectItem key={grade.id} value={grade.id}>
                                                {grade.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>المادة الدراسية</Label>
                                <Select value={subjectId} onValueChange={handleSubjectChange} disabled={!gradeId}>
                                    <SelectTrigger className={gradeId ? "bg-white" : "bg-gray-100"}>
                                        <SelectValue placeholder={gradeId ? "اختر المادة" : "اختر الصف أولاً"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableSubjects.map((subject: any) => (
                                            <SelectItem key={subject.id} value={subject.id}>
                                                {subject.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                <Button
                    className="gap-2 bg-purple-600 hover:bg-purple-700"
                    onClick={handleSaveChanges}
                    disabled={isUpdating}
                >
                    <Save className="w-4 h-4" />
                    {isUpdating ? "جاري الحفظ..." : "حفظ التغييرات"}
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

import { useState } from "react";
import {
    Search, Filter, MoreVertical, Mail, Phone,
    MapPin, Star, UserCheck, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

// Mock Teachers Data
const MOCK_TEACHERS = [
    {
        id: 1,
        name: "أ. فاطمة الحربي",
        email: "fatima@edu.sa",
        subject: "اللغة العربية",
        grade: "الصف الأول الابتدائي",
        students: 28,
        rating: 4.9,
        status: "active",
        avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=fatima"
    },
    {
        id: 2,
        name: "أ. محمد العتيبي",
        email: "mohammad@edu.sa",
        subject: "الرياضيات",
        grade: "الصف السادس الابتدائي",
        students: 32,
        rating: 4.8,
        status: "active",
        avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=mohammad"
    },
    {
        id: 3,
        name: "أ. سارة القحطاني",
        email: "sara@edu.sa",
        subject: "العلوم",
        grade: "الصف الثالث المتوسط",
        students: 30,
        rating: 4.7,
        status: "active",
        avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=sara"
    },
    {
        id: 4,
        name: "أ. خالد الدوسري",
        email: "khaled@edu.sa",
        subject: "اللغة الإنجليزية",
        grade: "الصف الثاني الثانوي",
        students: 26,
        rating: 4.8,
        status: "active",
        avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=khaled"
    },
    {
        id: 5,
        name: "أ. نورة العمري",
        email: "noura@edu.sa",
        subject: "التربية الإسلامية",
        grade: "الصف الخامس الابتدائي",
        students: 35,
        rating: 4.9,
        status: "active",
        avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=noura"
    },
    {
        id: 6,
        name: "أ. أحمد سعيد",
        email: "ahmed@edu.sa",
        subject: "الاجتماعيات",
        grade: "الصف الأول المتوسط",
        students: 29,
        rating: 4.6,
        status: "inactive",
        avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=ahmed"
    }
];

const TeachersTab = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const filteredTeachers = MOCK_TEACHERS.filter(teacher =>
        (teacher.name.includes(searchTerm) || teacher.email.includes(searchTerm)) &&
        (statusFilter === "all" || teacher.status === statusFilter)
    );

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-4 w-full md:w-auto flex-1">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="بحث عن معلم..."
                            className="pr-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="الحالة" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">الكل</SelectItem>
                            <SelectItem value="active">نشط</SelectItem>
                            <SelectItem value="inactive">غير نشط</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                    <UserCheck className="w-4 h-4" />
                    توثيق معلم جديد
                </Button>
            </div>

            {/* Teachers List */}
            <div className="space-y-4">
                {filteredTeachers.map((teacher) => (
                    <Card key={teacher.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
                            <div className="flex items-center gap-4 flex-1">
                                <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                                    <AvatarImage src={teacher.avatar} />
                                    <AvatarFallback>{teacher.name[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold">{teacher.name}</h3>
                                        {teacher.status === "active" && (
                                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                نشط
                                            </Badge>
                                        )}
                                        {teacher.status === "inactive" && (
                                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                                                غير نشط
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                        <div className="flex items-center gap-1">
                                            <Mail className="w-3 h-3" />
                                            {teacher.email}
                                        </div>
                                        <div className="hidden md:flex items-center gap-1">
                                            <Shield className="w-3 h-3" />
                                            {teacher.subject}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 text-sm">
                                <div className="text-center">
                                    <p className="font-bold text-lg">{teacher.students}</p>
                                    <p className="text-muted-foreground text-xs">طالب</p>
                                </div>
                                <div className="text-center">
                                    <div className="flex items-center gap-1 justify-center font-bold text-lg text-amber-500">
                                        {teacher.rating}
                                        <Star className="w-4 h-4 fill-amber-500" />
                                    </div>
                                    <p className="text-muted-foreground text-xs">تقييم</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 border-r pr-4 mr-4">
                                <Button size="sm" variant="outline">الملف الشخصي</Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem>تعديل البيانات</DropdownMenuItem>
                                        <DropdownMenuItem>إرسال رسالة</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive">إيقاف الحساب</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default TeachersTab;

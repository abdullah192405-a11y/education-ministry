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
import { Skeleton } from "@/components/ui/skeleton";
import { useAllUsers } from "@/hooks/useDatabase";
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

const TeachersTab = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const { data: allUsers, isLoading } = useAllUsers();

    // Filter to teachers only
    const teachers = (allUsers || []).filter((u: any) => u.role === "TEACHER");

    const filteredTeachers = teachers.filter((teacher: any) =>
        (teacher.name?.includes(searchTerm) || teacher.email?.includes(searchTerm)) &&
        (statusFilter === "all" || (statusFilter === "active" ? teacher.is_active !== false : teacher.is_active === false))
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
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-[80px] w-full rounded-xl" />
                    ))
                ) : filteredTeachers.length === 0 ? (
                    <div className="text-center py-12">
                        <UserCheck className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-muted-foreground text-lg">لا يوجد معلمون</p>
                    </div>
                ) : (
                    filteredTeachers.map((teacher: any) => (
                        <Card key={teacher.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
                                <div className="flex items-center gap-4 flex-1">
                                    <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                                        <AvatarImage src={teacher.avatar_url || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${teacher.id}`} />
                                        <AvatarFallback>{teacher.name?.[0] || 'م'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold">{teacher.name || 'بدون اسم'}</h3>
                                            {teacher.is_active !== false && (
                                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                    نشط
                                                </Badge>
                                            )}
                                            {teacher.is_active === false && (
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
                                            {teacher.subject && (
                                                <div className="hidden md:flex items-center gap-1">
                                                    <Shield className="w-3 h-3" />
                                                    {teacher.subject}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 text-sm">
                                    <div className="text-center">
                                        <p className="font-bold text-lg">{teacher.total_students || 0}</p>
                                        <p className="text-muted-foreground text-xs">طالب</p>
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
                    ))
                )}
            </div>
        </div>
    );
};

export default TeachersTab;

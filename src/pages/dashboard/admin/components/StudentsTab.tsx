import { useState } from "react";
import {
    Search, Filter, MoreVertical, Trophy,
    Gamepad2, TrendingUp, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllUsers, useAdminStats } from "@/hooks/useDatabase";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const StudentsTab = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const { data: allUsers, isLoading } = useAllUsers();
    const { data: adminStats } = useAdminStats();

    // Filter to students only
    const students = (allUsers || []).filter((u: any) => u.role === "STUDENT");

    const filteredStudents = students.filter((student: any) =>
        student.name?.includes(searchTerm) ||
        student.email?.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            {/* Header / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">إجمالي الطلاب</p>
                            <p className="text-2xl font-bold text-primary">{(adminStats?.totalStudents || students.length).toLocaleString()}</p>
                        </div>
                        <User className="w-8 h-8 text-primary opacity-50" />
                    </CardContent>
                </Card>
                <Card className="bg-emerald-500/5 border-emerald-500/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">الطلاب النشطين</p>
                            <p className="text-2xl font-bold text-emerald-600">
                                {students.filter((s: any) => s.is_active !== false).length.toLocaleString()}
                            </p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </CardContent>
                </Card>
                <Card className="bg-purple-500/5 border-purple-500/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">تحديات منجزة</p>
                            <p className="text-2xl font-bold text-purple-600">
                                {adminStats?.totalChallenges || 0}
                            </p>
                        </div>
                        <Gamepad2 className="w-8 h-8 text-purple-600 opacity-50" />
                    </CardContent>
                </Card>
                <Card className="bg-amber-500/5 border-amber-500/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">إجمالي المواد</p>
                            <p className="text-2xl font-bold text-amber-600">
                                {adminStats?.totalSubjects || 0}
                            </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-amber-600 opacity-50" />
                    </CardContent>
                </Card>
            </div>

            {/* Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="بحث باسم الطالب..."
                        className="pr-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" />
                    تصفية حسب الصف
                </Button>
            </div>

            {/* Students Table */}
            <Card>
                {isLoading ? (
                    <div className="p-6 space-y-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-[50px] w-full" />
                        ))}
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="text-center py-12">
                        <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-muted-foreground text-lg">لا يوجد طلاب</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-right">الطالب</TableHead>
                                <TableHead className="text-right">البريد</TableHead>
                                <TableHead className="text-center">النقاط</TableHead>
                                <TableHead className="text-center">الحالة</TableHead>
                                <TableHead className="text-left w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredStudents.map((student: any) => (
                                <TableRow key={student.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <Avatar>
                                                    <AvatarImage src={student.avatar_url || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${student.id}`} />
                                                    <AvatarFallback>{student.name?.[0] || 'ط'}</AvatarFallback>
                                                </Avatar>
                                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${student.is_active !== false ? "bg-emerald-500" : "bg-gray-300"
                                                    }`} />
                                            </div>
                                            <div>
                                                <p className="font-medium">{student.name || 'بدون اسم'}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(student.created_at).toLocaleDateString('ar-SA')}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{student.email}</TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1 text-amber-600 font-bold">
                                            <Trophy className="w-4 h-4" />
                                            {(student.points || 0).toLocaleString()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={student.is_active !== false ? "default" : "secondary"}>
                                            {student.is_active !== false ? "نشط" : "غير نشط"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>عرض الملف</DropdownMenuItem>
                                                <DropdownMenuItem>سجل التحديات</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive">حظر الطالب</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>
        </div>
    );
};

export default StudentsTab;

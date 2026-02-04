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

// Mock Students Data
const MOCK_STUDENTS = [
    {
        id: 1,
        name: "عبدالله محمد",
        grade: "الصف السادس الابتدائي",
        points: 2450,
        challenges: 45,
        avgScore: 92,
        status: "online",
        avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=abdullah"
    },
    {
        id: 2,
        name: "نورة القحطاني",
        grade: "الصف السادس الابتدائي",
        points: 2300,
        challenges: 42,
        avgScore: 95,
        status: "offline",
        avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=noura"
    },
    {
        id: 3,
        name: "فهد الدوسري",
        grade: "الصف الثالث المتوسط",
        points: 1800,
        challenges: 35,
        avgScore: 88,
        status: "online",
        avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=fahad"
    },
    {
        id: 4,
        name: "ريما الحربي",
        grade: "الصف الأول الابتدائي",
        points: 1200,
        challenges: 20,
        avgScore: 98,
        status: "offline",
        avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=reema"
    },
    {
        id: 5,
        name: "سعود العتيبي",
        grade: "الصف الثاني الثانوي",
        points: 3100,
        challenges: 60,
        avgScore: 85,
        status: "online",
        avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=saud"
    },
    {
        id: 6,
        name: "مشاعل السبيعي",
        grade: "الصف الخامس الابتدائي",
        points: 1950,
        challenges: 38,
        avgScore: 91,
        status: "offline",
        avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=mashael"
    }
];

const StudentsTab = () => {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredStudents = MOCK_STUDENTS.filter(student =>
        student.name.includes(searchTerm) ||
        student.grade.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            {/* Header / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">إجمالي الطلاب</p>
                            <p className="text-2xl font-bold text-primary">2,450</p>
                        </div>
                        <User className="w-8 h-8 text-primary opacity-50" />
                    </CardContent>
                </Card>
                <Card className="bg-emerald-500/5 border-emerald-500/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">الطلاب النشطين</p>
                            <p className="text-2xl font-bold text-emerald-600">1,240</p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </CardContent>
                </Card>
                <Card className="bg-purple-500/5 border-purple-500/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">تحديات منجزة</p>
                            <p className="text-2xl font-bold text-purple-600">34.2k</p>
                        </div>
                        <Gamepad2 className="w-8 h-8 text-purple-600 opacity-50" />
                    </CardContent>
                </Card>
                <Card className="bg-amber-500/5 border-amber-500/20">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">متوسط الدرجات</p>
                            <p className="text-2xl font-bold text-amber-600">84%</p>
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
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">الطالب</TableHead>
                            <TableHead className="text-right">الصف الدراسي</TableHead>
                            <TableHead className="text-center">النقاط</TableHead>
                            <TableHead className="text-center">التحديات</TableHead>
                            <TableHead className="text-center">المستوى</TableHead>
                            <TableHead className="text-left w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStudents.map((student) => (
                            <TableRow key={student.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Avatar>
                                                <AvatarImage src={student.avatar} />
                                                <AvatarFallback>{student.name[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${student.status === "online" ? "bg-emerald-500" : "bg-gray-300"
                                                }`} />
                                        </div>
                                        <div>
                                            <p className="font-medium">{student.name}</p>
                                            <p className="text-xs text-muted-foreground">ID: #{1000 + student.id}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>{student.grade}</TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-amber-600 font-bold">
                                        <Trophy className="w-4 h-4" />
                                        {student.points.toLocaleString()}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="secondary">{student.challenges} تحدي</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${student.avgScore >= 90 ? "bg-emerald-100 text-emerald-700" :
                                            student.avgScore >= 80 ? "bg-blue-100 text-blue-700" :
                                                "bg-yellow-100 text-yellow-700"
                                        }`}>
                                        {student.avgScore}%
                                    </div>
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
            </Card>
        </div>
    );
};

export default StudentsTab;

import { useState } from "react";
import {
    Search, Filter, MoreVertical, Trophy,
    TrendingUp, Mail, AlertCircle
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
import { Progress } from "@/components/ui/progress";

// Mock Students Data (Teacher's Class)
const MOCK_CLASS_STUDENTS = [
    {
        id: 1,
        name: "سارة أحمد",
        status: "online",
        attendance: 98,
        avgScore: 95,
        challenges: 15,
        lastActive: "الآن",
        avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=sara"
    },
    {
        id: 2,
        name: "محمد علي",
        status: "offline",
        attendance: 85,
        avgScore: 78,
        challenges: 12,
        lastActive: "منذ ساعتين",
        avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=mohammad"
    },
    {
        id: 3,
        name: "فاطمة خالد",
        status: "online",
        attendance: 92,
        avgScore: 92,
        challenges: 14,
        lastActive: "منذ 5 دقائق",
        avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=fatimak"
    },
    {
        id: 4,
        name: "عمر حسن",
        status: "offline",
        attendance: 75,
        avgScore: 65,
        challenges: 8,
        lastActive: "منذ يومين",
        isAtRisk: true,
        avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=omar"
    },
    {
        id: 5,
        name: "عبدالله العتيبي",
        status: "online",
        attendance: 100,
        avgScore: 98,
        challenges: 18,
        lastActive: "الآن",
        avatar: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=abdullah"
    },
];

const TeacherStudentsTab = () => {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredStudents = MOCK_CLASS_STUDENTS.filter(student =>
        student.name.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="بحث عن طالب..."
                        className="pr-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2">
                        <Filter className="w-4 h-4" />
                        تصفية
                    </Button>
                    <Button variant="outline" className="gap-2">
                        <Mail className="w-4 h-4" />
                        مراسلة الكل
                    </Button>
                </div>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">الطالب</TableHead>
                            <TableHead className="text-center">الحضور</TableHead>
                            <TableHead className="text-center">الأداء العام</TableHead>
                            <TableHead className="text-center">التفاعل</TableHead>
                            <TableHead className="text-right">آخر ظهور</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStudents.map((student) => (
                            <TableRow key={student.id} className={student.isAtRisk ? "bg-red-50/50" : ""}>
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
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium">{student.name}</p>
                                                {student.isAtRisk && (
                                                    <Badge variant="destructive" className="h-5 px-1 text-[10px]">يحتاج متابعة</Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">ID: #{202400 + student.id}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className={`text-sm font-bold ${student.attendance >= 90 ? "text-emerald-600" :
                                                student.attendance >= 75 ? "text-amber-600" : "text-red-600"
                                            }`}>{student.attendance}%</span>
                                        <Progress value={student.attendance} className="h-1.5 w-16" />
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${student.avgScore >= 90 ? "bg-emerald-100 text-emerald-700" :
                                            student.avgScore >= 75 ? "bg-blue-100 text-blue-700" :
                                                "bg-red-100 text-red-700"
                                        }`}>
                                        <TrendingUp className="w-3 h-3" />
                                        {student.avgScore}%
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-sm font-medium">
                                        <Trophy className="w-4 h-4 text-amber-500" />
                                        {student.challenges} تحدي
                                    </div>
                                </TableCell>
                                <TableCell className="text-right text-sm text-muted-foreground">
                                    {student.lastActive}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>تقرير مفصل</DropdownMenuItem>
                                            <DropdownMenuItem>مراسلة ولي الأمر</DropdownMenuItem>
                                            <DropdownMenuItem className="text-amber-600">إرسال تنبيه</DropdownMenuItem>
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

export default TeacherStudentsTab;

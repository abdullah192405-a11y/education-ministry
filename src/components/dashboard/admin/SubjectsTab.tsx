import { useState } from "react";
import { Link } from "react-router-dom";
import {
    Search, BookOpen, Video, FileQuestion,
    MoreVertical, ArrowUpRight, FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { gradesData } from "@/data/educationData";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SubjectsTab = () => {
    const [searchTerm, setSearchTerm] = useState("");

    // Flatten subjects from all grades
    const allSubjects = gradesData.flatMap(grade =>
        grade.subjects.map(subject => ({
            ...subject,
            gradeName: grade.name,
            gradeId: grade.id
        }))
    ).filter(subject =>
        subject.name.includes(searchTerm) ||
        subject.gradeName.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="بحث في المواد الدراسية..."
                        className="pr-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button className="gap-2 bg-purple-600 hover:bg-purple-700">
                    <BookOpen className="w-4 h-4" />
                    إضافة مادة جديدة
                </Button>
            </div>

            {/* Subjects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allSubjects.map((subject) => (
                    <Card key={`${subject.gradeId}-${subject.id}`} className="hover:border-primary/50 transition-all">
                        <CardContent className="p-4 flex gap-4">
                            {/* Icon */}
                            <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl shadow-sm" style={{ backgroundColor: `${subject.color}20` }}>
                                {subject.icon}
                            </div>

                            {/* Info */}
                            <div className="flex-1">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg">{subject.name}</h3>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                            <Badge variant="outline" className="font-normal">
                                                {subject.gradeName}
                                            </Badge>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="-mt-2 -ml-2">
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>تعديل المادة</DropdownMenuItem>
                                            <DropdownMenuItem>إدارة المنهج</DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive">أرشفة</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                    {subject.description}
                                </p>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                                    <div className="text-center p-2 rounded-lg bg-muted/50">
                                        <FolderOpen className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                                        <span className="text-xs font-bold">{subject.topics.length}</span>
                                        <span className="text-[10px] text-muted-foreground block">وحدة/درس</span>
                                    </div>
                                    <div className="text-center p-2 rounded-lg bg-muted/50">
                                        <Video className="w-4 h-4 mx-auto mb-1 text-purple-500" />
                                        <span className="text-xs font-bold">
                                            {subject.topics.reduce((acc, t) => acc + (t.media?.filter(m => m.type === 'video').length || 0), 0)}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground block">فيديو</span>
                                    </div>
                                    <div className="text-center p-2 rounded-lg bg-muted/50">
                                        <FileQuestion className="w-4 h-4 mx-auto mb-1 text-orange-500" />
                                        <span className="text-xs font-bold">
                                            {subject.topics.reduce((acc, t) => acc + (t.quiz?.length || 0), 0)}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground block">سؤال</span>
                                    </div>
                                </div>

                                <Button size="sm" className="w-full mt-4 gap-2" variant="secondary" asChild>
                                    <Link to={`/grade/${subject.gradeId}/subject/${subject.id}`}>
                                        عرض المنهج
                                        <ArrowUpRight className="w-4 h-4" />
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default SubjectsTab;

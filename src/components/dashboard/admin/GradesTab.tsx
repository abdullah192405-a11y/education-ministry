import { useState } from "react";
import { Link } from "react-router-dom";
import {
    School, BookOpen, GraduationCap, Plus,
    Search, Filter, MoreVertical, Edit, Trash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { gradesData } from "@/data/educationData";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const GradesTab = () => {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredGrades = gradesData.filter(grade =>
        grade.name.includes(searchTerm) ||
        grade.level.includes(searchTerm)
    );

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="بحث عن صف دراسي..."
                        className="pr-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" className="gap-2">
                        <Filter className="w-4 h-4" />
                        تصفية
                    </Button>
                    <Button className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600">
                        <Plus className="w-4 h-4" />
                        إضافة صف جديد
                    </Button>
                </div>
            </div>

            {/* Grades Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGrades.map((grade) => (
                    <Card key={grade.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden border-t-4 border-t-blue-500">
                        <div className="h-32 overflow-hidden relative">
                            <img
                                src={grade.coverImage}
                                alt={grade.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                            <div className="absolute bottom-4 right-4 flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-background shadow-sm flex items-center justify-center">
                                    <img src={grade.icon} alt="icon" className="w-8 h-8 object-contain" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-none mb-1">{grade.name}</h3>
                                    <Badge variant="secondary" className="text-xs">
                                        {grade.level}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <CardContent className="p-4 pt-6">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 text-center">
                                    <BookOpen className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                                    <p className="text-lg font-bold">{grade.subjects.length}</p>
                                    <p className="text-xs text-muted-foreground">مواد دراسية</p>
                                </div>
                                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 text-center">
                                    <GraduationCap className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                                    <p className="text-lg font-bold">{grade.studentsCount.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground">طالب مسجل</p>
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                                {grade.description}
                            </p>

                            <div className="flex items-center gap-2">
                                <Button className="flex-1" variant="outline" asChild>
                                    <Link to={`/grade/${grade.id}`}>
                                        عرض التفاصيل
                                    </Link>
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem className="gap-2">
                                            <Edit className="w-4 h-4" />
                                            تعديل
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="gap-2 text-destructive">
                                            <Trash className="w-4 h-4" />
                                            حذف
                                        </DropdownMenuItem>
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

export default GradesTab;

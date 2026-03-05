import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, ArrowRight, GraduationCap } from "lucide-react";
import { useGradeDetail } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "./NotFound";

const GradeDetail = () => {
    const { gradeId } = useParams(); // This will be the slug
    const { data: grade, isLoading, error } = useGradeDetail(gradeId || "");

    if (isLoading) {
        return (
            <div className="min-h-screen font-cairo" dir="rtl">
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4">
                        <Skeleton className="h-64 w-full rounded-2xl mb-8" />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (error || !grade) {
        return <NotFound />;
    }

    return (
        <div className="min-h-screen font-cairo" dir="rtl">
            <Header />
            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4">
                    {/* Grade Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-12"
                    >
                        {/* Cover Image */}
                        <div className="relative h-64 rounded-2xl overflow-hidden mb-8">
                            <img
                                src={grade.cover_image || grade.coverImage}
                                alt={grade.name}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

                            <div className="absolute bottom-6 right-6 flex items-center gap-4">
                                <div className="w-20 h-20 rounded-2xl border-4 border-background bg-primary/10 flex items-center justify-center shadow-lg backdrop-blur-sm">
                                    <GraduationCap className="w-12 h-12 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-black text-white drop-shadow-lg">
                                        {grade.name}
                                    </h1>
                                    <p className="text-white/90 text-lg drop-shadow-md mt-1">
                                        {grade.description}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                                    <p className="text-2xl font-bold">{(grade.students_count || grade.studentsCount || 0).toLocaleString("ar-SA")}</p>
                                    <p className="text-sm text-muted-foreground">طالب مسجل</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <BookOpen className="w-6 h-6 mx-auto mb-2 text-primary" />
                                    <p className="text-2xl font-bold">{grade.subjects?.length || 0}</p>
                                    <p className="text-sm text-muted-foreground">مادة دراسية</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <GraduationCap className="w-6 h-6 mx-auto mb-2 text-primary" />
                                    <p className="text-2xl font-bold">
                                        {grade.subjects?.reduce((total: number, subject: any) => total + (subject.topics?.length || 0), 0) || 0}
                                    </p>
                                    <p className="text-sm text-muted-foreground">موضوع تعليمي</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <div className="w-6 h-6 mx-auto mb-2 text-primary font-bold text-xl">✓</div>
                                    <p className="text-2xl font-bold">
                                        {grade.level === "PRIMARY" ? "ابتدائي" :
                                            grade.level === "MIDDLE" ? "متوسط" :
                                                grade.level === "SECONDARY" ? "ثانوي" : grade.level}
                                    </p>
                                    <p className="text-sm text-muted-foreground">المرحلة</p>
                                </CardContent>
                            </Card>
                        </div>
                    </motion.div>

                    {/* Subjects Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <BookOpen className="w-6 h-6 text-primary" />
                                المواد الدراسية
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {grade.subjects?.map((subject: any, index: number) => (
                                <motion.div
                                    key={subject.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 * index }}
                                >
                                    <Link to={`/grade/${gradeId}/subject/${subject.id}`}>
                                        <Card variant="interactive" className="group h-full">
                                            <CardContent className="p-6">
                                                {/* Subject Icon & Color */}
                                                <div
                                                    className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center text-4xl shadow-lg transition-transform group-hover:scale-110"
                                                    style={{ backgroundColor: `${subject.color}15` }}
                                                >
                                                    {subject.icon}
                                                </div>

                                                {/* Subject Name */}
                                                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                                                    {subject.name}
                                                </h3>

                                                {/* Description */}
                                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                                    {subject.description}
                                                </p>

                                                {/* Topics Count */}
                                                <div className="flex items-center justify-between pt-4 border-t">
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <BookOpen className="w-4 h-4" />
                                                        <span>{subject.topics?.length || 0} موضوع</span>
                                                    </div>
                                                    <Button variant="ghost" size="sm" className="gap-2 group-hover:gap-3 transition-all">
                                                        استكشف
                                                        <ArrowRight className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>

                        {(grade.subjects?.length || 0) === 0 && (
                            <div className="text-center py-16">
                                <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                                <p className="text-muted-foreground text-lg">لا توجد مواد متاحة حالياً</p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default GradeDetail;

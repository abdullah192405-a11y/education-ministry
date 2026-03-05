import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, CheckCircle, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { useGrades } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";

const GradesSection = () => {
    const { data: gradesData = [], isLoading } = useGrades();
    const featuredGrades = gradesData.slice(0, 4);

    const getLevelColor = (level: string) => {
        switch (level) {
            case "PRIMARY":
                return "bg-emerald-500/90 text-white";
            case "MIDDLE":
                return "bg-blue-500/90 text-white";
            case "SECONDARY":
                return "bg-purple-500/90 text-white";
            default:
                return "bg-gray-500/90 text-white";
        }
    };

    const getLevelLabel = (level: string) => {
        switch (level) {
            case "PRIMARY": return "ابتدائي";
            case "MIDDLE": return "متوسط";
            case "SECONDARY": return "ثانوي";
            default: return level;
        }
    };

    if (isLoading) {
        return (
            <section className="py-20 md:py-32">
                <div className="container mx-auto px-4">
                    <Skeleton className="h-12 w-64 mb-12" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="py-20 md:py-32">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-12"
                >
                    <div>
                        <h2 className="text-3xl md:text-5xl font-black mb-4">
                            الصفوف <span className="text-primary">الدراسية</span>
                        </h2>
                        <p className="text-muted-foreground text-lg max-w-xl">
                            اختر صفك الدراسي واستكشف المواد التعليمية المتنوعة
                        </p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link to="/grades">عرض جميع الصفوف</Link>
                    </Button>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {featuredGrades.map((grade, index) => (
                        <motion.div
                            key={grade.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <Link to={`/grade/${grade.slug}`}>
                                <Card variant="interactive" className="h-full overflow-hidden group">
                                    {/* Cover Image */}
                                    <div className="relative h-32 overflow-hidden">
                                        <img
                                            src={grade.cover_image || grade.coverImage}
                                            alt={grade.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />

                                        {/* Icon */}
                                        <div className="absolute -bottom-6 right-4">
                                            <div className="w-12 h-12 rounded-xl border-2 border-background bg-primary/10 flex items-center justify-center shadow-lg">
                                                <GraduationCap className="w-7 h-7 text-primary" />
                                            </div>
                                        </div>

                                        {/* Level Badge */}
                                        <div className="absolute top-3 left-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getLevelColor(grade.level)}`}>
                                                {getLevelLabel(grade.level)}
                                            </span>
                                        </div>
                                    </div>

                                    <CardContent className="pt-8 pb-5 px-5">
                                        {/* Name & Verification */}
                                        <div className="flex items-center gap-1 mb-2">
                                            <h3 className="text-base font-bold line-clamp-1">{grade.name}</h3>
                                            {grade.verified && (
                                                <CheckCircle className="w-4 h-4 text-primary fill-primary/20 flex-shrink-0" />
                                            )}
                                        </div>

                                        {/* Description */}
                                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                            {grade.description}
                                        </p>

                                        {/* Stats */}
                                        <div className="flex items-center justify-between text-xs pt-3 border-t">
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <Users className="w-3 h-3" />
                                                <span>{(grade.students_count || grade.studentsCount || 0).toLocaleString("ar-SA")}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-primary">
                                                <BookOpen className="w-3 h-3" />
                                                <span>{grade.subjects?.length || 0} مواد</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default GradesSection;

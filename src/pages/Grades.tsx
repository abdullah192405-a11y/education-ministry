import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, Filter, CheckCircle, GraduationCap, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { gradesData, getGradeLevels } from "@/data/educationData";

const Grades = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedLevel, setSelectedLevel] = useState("الكل");

    const levels = getGradeLevels();

    const filteredGrades = gradesData.filter((grade) => {
        const matchesSearch = grade.name.includes(searchTerm) ||
            grade.description.includes(searchTerm);
        const matchesLevel = selectedLevel === "الكل" || grade.level === selectedLevel;
        return matchesSearch && matchesLevel;
    });

    const getLevelColor = (level: string) => {
        switch (level) {
            case "ابتدائي":
                return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
            case "متوسط":
                return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
            case "ثانوي":
                return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
            default:
                return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
        }
    };

    return (
        <div className="min-h-screen font-cairo" dir="rtl">
            <Header />
            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4">
                    {/* Page Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <h1 className="text-4xl md:text-5xl font-black mb-4">
                            اكتشف <span className="text-primary">الصفوف الدراسية</span>
                        </h1>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                            اختر صفك الدراسي واستكشف المواد التعليمية المتنوعة والتحديات الممتعة
                        </p>
                    </motion.div>

                    {/* Search and Filter */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-8"
                    >
                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="ابحث عن صف دراسي..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pr-12 h-12"
                                />
                            </div>
                            <Button variant="outline" className="h-12 gap-2">
                                <Filter className="w-4 h-4" />
                                فلترة
                            </Button>
                        </div>

                        {/* Levels Filter */}
                        <div className="flex flex-wrap gap-2">
                            {levels.map((level) => (
                                <Button
                                    key={level}
                                    variant={selectedLevel === level ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectedLevel(level)}
                                    className="rounded-full"
                                >
                                    {level === "الكل" ? level : `المرحلة ${level === "ابتدائي" ? "الابتدائية" : level === "متوسط" ? "المتوسطة" : "الثانوية"}`}
                                </Button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Grades Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                            {filteredGrades.map((grade, index) => (
                                <motion.div
                                    key={grade.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                >
                                    <Link to={`/grade/${grade.id}`}>
                                        <Card variant="interactive" className="h-full overflow-hidden group">
                                            {/* Cover Image */}
                                            <div className="relative h-36 overflow-hidden">
                                                <img
                                                    src={grade.coverImage}
                                                    alt={grade.name}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />

                                                {/* Icon */}
                                                <div className="absolute -bottom-8 right-4">
                                                    <div className="w-16 h-16 rounded-xl border-4 border-background overflow-hidden shadow-lg bg-primary/10 flex items-center justify-center">
                                                        <GraduationCap className="w-10 h-10 text-primary" />
                                                    </div>
                                                </div>

                                                {/* Level Badge */}
                                                <div className="absolute top-3 right-3">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${getLevelColor(grade.level)}`}>
                                                        {grade.level === "ابتدائي" ? "ابتدائي" : grade.level === "متوسط" ? "متوسط" : "ثانوي"}
                                                    </span>
                                                </div>
                                            </div>

                                            <CardContent className="pt-10 pb-5 px-5">
                                                {/* Grade Name & Verification */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="text-lg font-bold">{grade.name}</h3>
                                                    {grade.verified && (
                                                        <CheckCircle className="w-5 h-5 text-primary fill-primary/20" />
                                                    )}
                                                </div>

                                                {/* Description */}
                                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                                    {grade.description}
                                                </p>

                                                {/* Stats */}
                                                <div className="flex items-center justify-between text-sm pt-4 border-t">
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <Users className="w-4 h-4" />
                                                        <span>{grade.studentsCount.toLocaleString("ar-SA")} طالب</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-primary">
                                                        <BookOpen className="w-4 h-4" />
                                                        <span>{grade.subjects.length} مواد</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {filteredGrades.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-16"
                        >
                            <GraduationCap className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                            <p className="text-muted-foreground text-lg">لم يتم العثور على صفوف دراسية</p>
                            <p className="text-sm text-muted-foreground mt-2">جرّب البحث بكلمات مختلفة</p>
                        </motion.div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Grades;

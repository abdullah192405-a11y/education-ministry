import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Eye, Clock, ArrowRight, PlayCircle } from "lucide-react";
import { useSubject } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "./NotFound";

const SubjectView = () => {
    const { subjectId } = useParams();
    const { data: subject, isLoading, error } = useSubject(subjectId || "");
    const grade = subject?.grade;

    if (isLoading) {
        return (
            <div className="min-h-screen font-cairo" dir="rtl">
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4">
                        <Skeleton className="h-48 w-full rounded-2xl mb-12" />
                        <div className="space-y-4">
                            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (error || !subject || !grade) {
        return <NotFound />;
    }

    return (
        <div className="min-h-screen font-cairo" dir="rtl">
            <Header />
            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4">
                    {/* Subject Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-12"
                    >
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                            <Link to="/grades" className="hover:text-primary transition-colors">
                                الصفوف
                            </Link>
                            <span>/</span>
                            <Link to={`/grade/${grade.slug}`} className="hover:text-primary transition-colors">
                                {grade.name}
                            </Link>
                            <span>/</span>
                            <span className="text-foreground">{subject.name}</span>
                        </div>

                        {/* Subject Header Card */}
                        <Card className="overflow-hidden border-2">
                            <CardContent className="p-8">
                                <div className="flex items-start gap-6">
                                    <div
                                        className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-lg shrink-0"
                                        style={{ backgroundColor: `${subject.color}20` }}
                                    >
                                        {subject.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h1 className="text-3xl md:text-4xl font-black mb-3">
                                            {subject.name}
                                        </h1>
                                        <p className="text-lg text-muted-foreground mb-4">
                                            {subject.description}
                                        </p>
                                        <div className="flex items-center gap-4">
                                            <Badge variant="secondary" className="gap-1">
                                                <BookOpen className="w-3 h-3" />
                                                {subject.topics?.length || 0} موضوع
                                            </Badge>
                                            <Badge variant="outline">
                                                {grade.name}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Topics Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <BookOpen className="w-6 h-6 text-primary" />
                                المواضيع التعليمية
                            </h2>
                            <p className="text-muted-foreground mt-2">
                                اختر موضوعاً لبدء التعلم ومشاهدة المحتوى والانضمام للتحديات
                            </p>
                        </div>

                        <div className="space-y-4">
                            {subject.topics?.map((topic: any, index: number) => (
                                <motion.div
                                    key={topic.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 * index }}
                                >
                                    <Link to={`/grade/${grade.slug}/subject/${subject.id}/topic/${topic.id}`}>
                                        <Card variant="interactive" className="group">
                                            <CardContent className="p-0">
                                                <div className="flex flex-col md:flex-row">
                                                    {/* Thumbnail */}
                                                    <div className="relative w-full md:w-64 h-48 md:h-auto overflow-hidden shrink-0">
                                                        <img
                                                            src={topic.thumbnail}
                                                            alt={topic.title}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/20" />
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="w-16 h-16 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center">
                                                                <PlayCircle className="w-10 h-10 text-white" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 p-6">
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex-1">
                                                                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-1">
                                                                    {topic.title}
                                                                </h3>
                                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                                    {topic.description}
                                                                </p>
                                                            </div>
                                                            <div className="mr-4">
                                                                <Badge
                                                                    className="text-xs"
                                                                    style={{
                                                                        backgroundColor: `${subject.color}20`,
                                                                        color: subject.color
                                                                    }}
                                                                >
                                                                    {subject.icon} {subject.name}
                                                                </Badge>
                                                            </div>
                                                        </div>

                                                        {/* Meta Info */}
                                                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-4">
                                                            <div className="flex items-center gap-1">
                                                                <Eye className="w-4 h-4" />
                                                                <span>{(topic.views || 0).toLocaleString("ar-SA")} مشاهدة</span>
                                                            </div>
                                                            {topic.duration && (
                                                                <div className="flex items-center gap-1">
                                                                    <Clock className="w-4 h-4" />
                                                                    <span>{topic.duration}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-1">
                                                                <BookOpen className="w-4 h-4" />
                                                                <span>{topic.mediaItems?.length || 0} محتوى</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span>❓</span>
                                                                <span>{topic.quizQuestions?.length || 0} سؤال</span>
                                                            </div>
                                                        </div>

                                                        {/* Action Button */}
                                                        <div className="mt-4 pt-4 border-t flex items-center justify-between">
                                                            <span className="text-xs text-muted-foreground">
                                                                {new Date(topic.created_at || topic.createdAt).toLocaleDateString("ar-SA")}
                                                            </span>
                                                            <Button className="gap-2 group-hover:gap-3 transition-all">
                                                                شاهد المحتوى
                                                                <ArrowRight className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>

                        {(subject.topics?.length || 0) === 0 && (
                            <div className="text-center py-16">
                                <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                                <p className="text-muted-foreground text-lg">لا توجد مواضيع متاحة حالياً</p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default SubjectView;

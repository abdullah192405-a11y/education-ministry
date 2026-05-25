import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, GraduationCap, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { useGradeDetail } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "./NotFound";
import { useTranslation } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";

const GradeDetail = () => {
    const { gradeId } = useParams(); // This will be the slug
    const { data: grade, isLoading, error } = useGradeDetail(gradeId || "");
    const { t, dir } = useTranslation();
    const localeId = t("common.locale");
    const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

    const getLevelKey = (level: string): TranslationKey | null => {
        switch (level) {
            case "PRIMARY":
                return "level.primary";
            case "MIDDLE":
                return "level.middle";
            case "SECONDARY":
                return "level.secondary";
            default:
                return null;
        }
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case "PRIMARY":
                return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
            case "MIDDLE":
                return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
            case "SECONDARY":
                return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
            default:
                return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
        }
    };

    const getOrganizationName = (gradeData: NonNullable<typeof grade>) => {
        const org = gradeData.organizations;
        if (!org) return null;
        if (Array.isArray(org)) return org[0]?.name || null;
        return org.name || null;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen font-cairo" dir={dir}>
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4">
                        <Skeleton className="h-48 w-full rounded-2xl mb-12" />
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

    const levelKey = getLevelKey(grade.level);
    const levelLabel = levelKey ? t(levelKey) : grade.level;
    const organizationName = getOrganizationName(grade);
    const topicCount =
        grade.subjects?.reduce(
            (total: number, subject: { topics?: unknown[] }) => total + (subject.topics?.length || 0),
            0,
        ) || 0;
    const studentsCount = (grade.students_count || grade.studentsCount || 0).toLocaleString(localeId);
    const subjectsCount = grade.subjects?.length || 0;

    return (
        <div className="min-h-screen font-cairo" dir={dir}>
            <Header />
            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4">
                    {/* Grade Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-12"
                    >
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                            <Link to="/grades" className="hover:text-primary transition-colors">
                                {t("subjectView.breadcrumbGrades")}
                            </Link>
                            <span>/</span>
                            <span className="text-foreground font-medium">{grade.name}</span>
                        </div>

                        <Card className="overflow-hidden border-2">
                            <CardContent className="p-6 md:p-8">
                                <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
                                    <div className="w-full md:w-44 lg:w-52 shrink-0 rounded-3xl overflow-hidden shadow-lg ring-1 ring-primary/10">
                                        <img
                                            src={grade.cover_image || grade.coverImage}
                                            alt={grade.name}
                                            className="w-full aspect-[4/3] md:aspect-square object-cover"
                                        />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-3">
                                            <Badge variant="outline" className={getLevelColor(grade.level)}>
                                                {levelLabel}
                                            </Badge>
                                            {grade.verified && (
                                                <Badge variant="secondary" className="gap-1">
                                                    <CheckCircle className="w-3 h-3 text-primary fill-primary/20" />
                                                    {t("dash.common.verified")}
                                                </Badge>
                                            )}
                                        </div>

                                        <h1 className="text-3xl md:text-4xl font-black mb-3">
                                            {grade.name}
                                        </h1>

                                        {grade.description && (
                                            <p className="text-lg text-muted-foreground mb-4">
                                                {grade.description}
                                            </p>
                                        )}

                                        {organizationName && (
                                            <p className="text-sm text-muted-foreground mb-4">
                                                {t("gradesSection.institutionLabel")}: {organizationName}
                                            </p>
                                        )}

                                        <div className="flex flex-wrap items-center gap-3">
                                            <Badge variant="secondary" className="gap-1">
                                                <Users className="w-3 h-3" />
                                                {studentsCount} {t("gradesPage.studentsSuffix")}
                                            </Badge>
                                            <Badge variant="secondary" className="gap-1">
                                                <BookOpen className="w-3 h-3" />
                                                {subjectsCount} {t("gradesPage.subjectsSuffix")}
                                            </Badge>
                                            <Badge variant="secondary" className="gap-1">
                                                <GraduationCap className="w-3 h-3" />
                                                {topicCount} {t("gradeDetail.topicSuffix")}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
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
                                {t("gradeDetail.subjectsHeader")}
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
                                                        <span>{subject.topics?.length || 0} {t("gradeDetail.topicSuffix")}</span>
                                                    </div>
                                                    <Button variant="ghost" size="sm" className="gap-2 group-hover:gap-3 transition-all">
                                                        {t("gradeDetail.exploreBtn")}
                                                        <ArrowIcon className="w-4 h-4" />
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
                                <p className="text-muted-foreground text-lg">{t("gradeDetail.noSubjects")}</p>
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

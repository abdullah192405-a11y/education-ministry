import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, Filter, CheckCircle, GraduationCap, BookOpen } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { usePublicGradeCatalog } from "@/hooks/usePublicGradeCatalog";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeGradeClassType } from "@/lib/gradeClassType";
import { useTranslation } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";

type LevelOption = "ALL" | "PRIMARY" | "MIDDLE" | "SECONDARY";

const Grades = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedLevel, setSelectedLevel] = useState<LevelOption>("ALL");
    const [searchParams] = useSearchParams();
    const kindParam = searchParams.get("kind");
    const { t, dir } = useTranslation();
    const localeId = t("common.locale");

    const {
        catalogGrades,
        showEducationalSection,
        showEnrichmentSection,
        visitorGradeMode,
        memberScope,
        isLoading,
        error,
    } = usePublicGradeCatalog();

    /** When admin shows only one catalog type, URL kind tabs are hidden — ignore kind filter */
    const kind =
        visitorGradeMode === "all"
            ? kindParam
            : null;

    const showTeachingTab = showEducationalSection && visitorGradeMode !== "enrichment_only";
    const showEnrichmentTab = visitorGradeMode !== "teaching_only";
    const showKindFilter = showTeachingTab && showEnrichmentTab;

    /** Scoped members default to their class type when URL has no kind */
    const effectiveKind =
        kind ??
        (memberScope.isScoped
            ? showTeachingTab && !showEnrichmentTab
                ? "teaching"
                : !showTeachingTab && showEnrichmentTab
                  ? "enrichment"
                  : null
            : null);

    const levelOptions: ReadonlyArray<{ id: LevelOption; labelKey: TranslationKey; stageKey?: TranslationKey }> = [
        { id: "ALL", labelKey: "common.all" },
        { id: "PRIMARY", labelKey: "level.primary", stageKey: "level.primaryStage" },
        { id: "MIDDLE", labelKey: "level.middle", stageKey: "level.middleStage" },
        { id: "SECONDARY", labelKey: "level.secondary", stageKey: "level.secondaryStage" },
    ];

    const getLevelTranslationKey = (level: string): TranslationKey | null => {
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

    const filteredGrades = catalogGrades.filter((grade) => {
        const classKind = normalizeGradeClassType(
            (grade as { class_type?: string; classType?: string }).class_type ??
                (grade as { class_type?: string; classType?: string }).classType,
        );
        if (effectiveKind === "teaching" && classKind !== "تعليمي") return false;
        if (effectiveKind === "enrichment" && classKind !== "اثرائي") return false;

        const search = searchTerm.toLowerCase();
        const matchesSearch = !search ||
            grade.name.toLowerCase().includes(search) ||
            (grade.description || "").toLowerCase().includes(search);
        const matchesLevel = selectedLevel === "ALL" || grade.level === selectedLevel;
        return matchesSearch && matchesLevel;
    });

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

    const isEducational = visitorGradeMode === "teaching_only" || (visitorGradeMode === "all" && effectiveKind === "teaching");
    const isEnrichment = visitorGradeMode === "enrichment_only" || (visitorGradeMode === "all" && effectiveKind === "enrichment");

    return (
        <div className="min-h-screen font-cairo" dir={dir}>
            <Header />
            <main className="pt-32 pb-16">
                <div className="container mx-auto px-4">
                    {/* Page Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12 mt-8"
                    >
                        <h1 className="text-4xl md:text-5xl font-black mb-4">
                            {isEducational ? (
                                <>
                                    {t("gradesPage.titleEducation1")} <span className="text-primary">{t("gradesPage.titleEducation2")}</span>
                                </>
                            ) : isEnrichment ? (
                                <>
                                    {t("gradesPage.titleEnrichment1")} <span className="text-primary">{t("gradesPage.titleEnrichment2")}</span>
                                </>
                            ) : (
                                <>
                                    {t("gradesPage.titleDefault1")} <span className="text-primary">{t("gradesPage.titleDefault2")}</span>
                                </>
                            )}
                        </h1>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                            {memberScope.isScoped && memberScope.primaryGradeName
                                ? t("gradesPage.descMemberClass", { gradeName: memberScope.primaryGradeName })
                                : isEnrichment
                                  ? t("gradesPage.descEnrichment")
                                  : isEducational
                                    ? t("gradesPage.descEducation")
                                    : t("gradesPage.descDefault")}
                        </p>
                    </motion.div>

                    {showKindFilter && (
                        <div className="flex flex-wrap gap-2 justify-center mb-10">
                            <Button asChild variant={effectiveKind == null ? "default" : "outline"} size="sm" className="rounded-full">
                                <Link to="/grades">{t("common.all")}</Link>
                            </Button>
                            <Button asChild variant={effectiveKind === "teaching" ? "default" : "outline"} size="sm" className="rounded-full">
                                <Link to="/grades?kind=teaching">{t("gradesPage.tabEducational")}</Link>
                            </Button>
                            <Button asChild variant={effectiveKind === "enrichment" ? "default" : "outline"} size="sm" className="rounded-full">
                                <Link to="/grades?kind=enrichment">{t("gradesPage.tabEnrichment")}</Link>
                            </Button>
                        </div>
                    )}

                    {/* Search and Filter */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mb-8"
                    >
                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                            <div className="relative flex-1">
                                <Search className={`absolute ${dir === "rtl" ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground`} />
                                <Input
                                    type="text"
                                    placeholder={t("gradesPage.searchPlaceholder")}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`${dir === "rtl" ? "pr-12" : "pl-12"} h-12`}
                                />
                            </div>
                            <Button variant="outline" className="h-12 gap-2">
                                <Filter className="w-4 h-4" />
                                {t("common.filter")}
                            </Button>
                        </div>

                        {/* Levels Filter */}
                        <div className="flex flex-wrap gap-2">
                            {levelOptions.map((opt) => (
                                <Button
                                    key={opt.id}
                                    variant={selectedLevel === opt.id ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectedLevel(opt.id)}
                                    className="rounded-full"
                                >
                                    {opt.id === "ALL" ? t(opt.labelKey) : t(opt.stageKey!)}
                                </Button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Grades Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-[300px] w-full rounded-xl" />
                            ))
                        ) : error ? (
                            <div className="col-span-full text-center py-10 text-destructive font-bold">
                                <p className="mb-2">{t("gradesPage.errorLoading")}</p>
                                <p className="text-sm font-mono opacity-80">{(error as any)?.message || JSON.stringify(error)}</p>
                                <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>{t("common.tryAgain")}</Button>
                            </div>
                        ) : (

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
                                        <Link to={`/grade/${grade.slug}`}>
                                            <Card variant="interactive" className="h-full overflow-hidden group">
                                                <div className="relative h-40">
                                                    <div className="absolute inset-0 overflow-hidden">
                                                        <img
                                                            src={grade.cover_image || grade.coverImage}
                                                            alt={grade.name}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                        />
                                                    </div>
                                                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent pointer-events-none" />

                                                    <div className={`absolute top-3 ${dir === "rtl" ? "right-3" : "left-3"}`}>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm ${getLevelColor(grade.level)}`}>
                                                            {(() => {
                                                                const k = getLevelTranslationKey(grade.level);
                                                                return k ? t(k) : grade.level;
                                                            })()}
                                                        </span>
                                                    </div>

                                                    <div className="absolute bottom-0 start-4 z-10 translate-y-1/2">
                                                        <div className="w-16 h-16 rounded-xl border-4 border-background shadow-lg bg-primary/10 flex items-center justify-center">
                                                            <GraduationCap className="w-10 h-10 text-primary" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <CardContent className="relative bg-card pt-9 pb-5 px-5">
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
                                                            <span>{(grade.students_count || grade.studentsCount || 0).toLocaleString(localeId)} {t("gradesPage.studentsSuffix")}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-primary">
                                                            <BookOpen className="w-4 h-4" />
                                                            <span>{grade.subjects?.length || 0} {t("gradesPage.subjectsSuffix")}</span>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>

                    {!isLoading && !error && filteredGrades.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-16"
                        >
                            <GraduationCap className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                            <p className="text-muted-foreground text-lg">{t("gradesPage.noGradesFound")}</p>
                            <p className="text-sm text-muted-foreground mt-2">{t("gradesPage.tryDifferentKeywords")}</p>
                        </motion.div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Grades;

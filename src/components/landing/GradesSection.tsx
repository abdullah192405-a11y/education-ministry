import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, CheckCircle, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { useGrades } from "@/hooks/useDatabase";
import { useCatalogGradeClassMode } from "@/hooks/useCatalogGradeClassMode";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeGradeClassType } from "@/lib/gradeClassType";
import { filterGradesForPublicCatalog } from "@/lib/contentVisibility";
import { useTranslation } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";

const SHOW_COUNT = 4;

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

const getLevelLabelKey = (level: string): TranslationKey | null => {
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

type GradeRow = {
    id: string;
    name: string;
    slug: string;
    level: string;
    description: string;
    cover_image?: string | null;
    coverImage?: string | null;
    verified?: boolean;
    students_count?: number;
    studentsCount?: number;
    subjects?: { id: string; name: string }[];
    class_type?: string | null;
    classType?: string | null;
    is_hidden?: boolean | null;
    isHidden?: boolean | null;
    organizations?: { id?: string; name?: string } | { id?: string; name?: string }[] | null;
};

function getGradeOrganizationName(grade: GradeRow): string | null {
    const org = grade.organizations;
    if (!org) return null;
    if (Array.isArray(org)) return org[0]?.name || null;
    return org.name || null;
}

function GradeSpotlightCard({ grade, index }: { grade: GradeRow; index: number }) {
    const { t } = useTranslation();
    const localeId = t("common.locale");
    const levelKey = getLevelLabelKey(grade.level);
    const levelLabel = levelKey ? t(levelKey) : grade.level;
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
        >
            <Link to={`/grade/${grade.slug}`}>
                <Card variant="interactive" className="h-full overflow-hidden group">
                    <div className="relative h-32 overflow-hidden">
                        <img
                            src={grade.cover_image || grade.coverImage || ""}
                            alt={grade.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />

                        <div className="absolute -bottom-6 right-4">
                            <div className="w-12 h-12 rounded-xl border-2 border-background bg-primary/10 flex items-center justify-center shadow-lg">
                                <GraduationCap className="w-7 h-7 text-primary" />
                            </div>
                        </div>

                        <div className="absolute top-3 left-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${getLevelColor(grade.level)}`}>
                                {levelLabel}
                            </span>
                        </div>
                    </div>

                    <CardContent className="pt-8 pb-5 px-5">
                        <div className="flex items-center gap-1 mb-2">
                            <h3 className="text-base font-bold line-clamp-1">{grade.name}</h3>
                            {grade.verified && (
                                <CheckCircle className="w-4 h-4 text-primary fill-primary/20 flex-shrink-0" />
                            )}
                        </div>

                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{grade.description}</p>
                        {getGradeOrganizationName(grade) && (
                            <p className="text-xs text-muted-foreground mb-3">
                                {t("gradesSection.institutionLabel")}: {getGradeOrganizationName(grade)}
                            </p>
                        )}

                        <div className="flex items-center justify-between text-xs pt-3 border-t">
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <Users className="w-3 h-3" />
                                <span>{(grade.students_count || grade.studentsCount || 0).toLocaleString(localeId)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-primary">
                                <BookOpen className="w-3 h-3" />
                                <span>{grade.subjects?.length || 0} {t("gradesSection.subjectsSuffix")}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </Link>
        </motion.div>
    );
}

function SectionBlock({
    title,
    titleHighlight,
    description,
    ctaLabel,
    ctaHref,
    grades,
    emptyMessage,
}: {
    title: string;
    titleHighlight: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
    grades: GradeRow[];
    emptyMessage: string;
}) {
    const featured = grades.slice(0, SHOW_COUNT);

    return (
        <section className="py-16 md:py-24">
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
                            {title} <span className="text-primary">{titleHighlight}</span>
                        </h2>
                        <p className="text-muted-foreground text-lg max-w-xl">{description}</p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link to={ctaHref}>{ctaLabel}</Link>
                    </Button>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {featured.length === 0 ? (
                        <p className="col-span-full text-center text-muted-foreground py-10">{emptyMessage}</p>
                    ) : (
                        featured.map((grade, index) => <GradeSpotlightCard key={grade.id} grade={grade} index={index} />)
                    )}
                </div>
            </div>
        </section>
    );
}

const GradesSection = () => {
    const { data: gradesData = [], isLoading } = useGrades();
    const { mode: visitorGradeMode } = useCatalogGradeClassMode();
    const { t } = useTranslation();

    const visible = filterGradesForPublicCatalog(gradesData as GradeRow[], visitorGradeMode);
    const educational = visible.filter(
        (g) => normalizeGradeClassType(g.class_type ?? g.classType) === "تعليمي",
    );
    const enrichment = visible.filter(
        (g) => normalizeGradeClassType(g.class_type ?? g.classType) === "اثرائي",
    );

    if (isLoading) {
        return (
            <div className="py-20 md:py-32">
                <div className="container mx-auto px-4 space-y-20">
                    {[0, 1].map((block) => (
                        <div key={block}>
                            <Skeleton className="h-12 w-72 mb-12" />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <Skeleton key={i} className="h-64 w-full" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div>
            {visitorGradeMode !== "enrichment_only" && (
                <SectionBlock
                    title={t("gradesSection.educationalTitle")}
                    titleHighlight={t("gradesSection.educationalHighlight")}
                    description={t("gradesSection.educationalDescription")}
                    ctaLabel={t("gradesSection.educationalCta")}
                    ctaHref="/grades?kind=teaching"
                    grades={educational}
                    emptyMessage={t("gradesSection.educationalEmpty")}
                />
            )}
            {visitorGradeMode !== "teaching_only" && (
                <SectionBlock
                    title={t("gradesSection.enrichmentTitle")}
                    titleHighlight={t("gradesSection.enrichmentHighlight")}
                    description={t("gradesSection.enrichmentDescription")}
                    ctaLabel={t("gradesSection.enrichmentCta")}
                    ctaHref="/grades?kind=enrichment"
                    grades={enrichment}
                    emptyMessage={t("gradesSection.enrichmentEmpty")}
                />
            )}
        </div>
    );
};

export default GradesSection;

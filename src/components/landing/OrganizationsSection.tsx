import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { School, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useGrades, useOrganizations } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";

const OrganizationsSection = () => {
  const { data: organizations = [], isLoading: isLoadingOrgs } = useOrganizations();
  const { data: grades = [], isLoading: isLoadingGrades } = useGrades();
  const { t } = useTranslation();
  const localeId = t("common.locale");

  const cards = (organizations as any[]).map((org: any) => {
    const orgGrades = (grades as any[]).filter((g: any) => g.organization_id === org.id);
    const cover = org.image_url
      || orgGrades.find((g: any) => g.cover_image || g.coverImage)?.cover_image
      || orgGrades.find((g: any) => g.cover_image || g.coverImage)?.coverImage
      || "/logo.png";
    const students = orgGrades.reduce((sum: number, g: any) => sum + Number(g.students_count || g.studentsCount || 0), 0);
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      cover,
      gradesCount: orgGrades.length,
      students,
      entityType: org.entity_type || "SCHOOL",
    };
  });

  const schools = cards.filter((c) => c.entityType === "SCHOOL");
  const orgs = cards.filter((c) => c.entityType === "ORG");

  const renderCards = (items: typeof cards) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
      {items.map((org, index) => (
        <motion.div
          key={org.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.05 }}
        >
          <Link to={`/org/${org.slug}`}>
            <div className="p-2 text-center space-y-3 transition-transform hover:-translate-y-0.5">
                <div className="relative w-36 h-36 md:w-40 md:h-40 mx-auto rounded-full overflow-hidden shadow-lg">
                  <img src={org.cover} alt={org.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 ring-1 ring-black/10 rounded-full" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm line-clamp-2 min-h-[2.5rem]">{org.name}</h3>
                  <Badge variant="secondary" className="text-[10px]">
                    {org.entityType === "SCHOOL" ? t("common.school") : t("common.institution")}
                  </Badge>
                </div>
                <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><School className="w-3 h-3" />{org.gradesCount}</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{org.students.toLocaleString(localeId)}</span>
                </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );

  if (isLoadingOrgs || isLoadingGrades) {
    return (
      <div className="py-16 md:py-24">
        <div className="container mx-auto px-4 space-y-20">
          {[0, 1].map((block) => (
            <div key={block}>
              <Skeleton className="h-12 w-72 mb-12" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-64 w-full rounded-xl" />
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
      <section className="py-16 md:py-24 bg-muted/20">
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
                <span className="text-primary">{t("orgsSection.schoolsTitle")}</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl">
                {t("orgsSection.schoolsDescription")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">{schools.length} {t("orgsSection.schoolsCount")}</Badge>
              <Button variant="outline" asChild>
                <Link to="/schools">{t("orgsSection.viewSchools")}</Link>
              </Button>
            </div>
          </motion.div>
          {schools.length ? (
            renderCards(schools)
          ) : (
            <p className="text-center text-muted-foreground py-10">{t("orgsSection.schoolsEmpty")}</p>
          )}
        </div>
      </section>

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
                <span className="text-primary">{t("orgsSection.orgsTitle")}</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl">
                {t("orgsSection.orgsDescription")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">{orgs.length} {t("orgsSection.schoolsCount")}</Badge>
              <Button variant="outline" asChild>
                <Link to="/organizations">{t("orgsSection.viewOrgs")}</Link>
              </Button>
            </div>
          </motion.div>
          {orgs.length ? (
            renderCards(orgs)
          ) : (
            <p className="text-center text-muted-foreground py-10">{t("orgsSection.orgsEmpty")}</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default OrganizationsSection;

import { motion } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useGrades, useOrganizations } from "@/hooks/useDatabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { School, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/contexts/LanguageContext";

const Organizations = () => {
  const { data: organizations = [], isLoading: isLoadingOrgs } = useOrganizations();
  const { data: grades = [], isLoading: isLoadingGrades } = useGrades();
  const { t, dir } = useTranslation();
  const localeId = t("common.locale");

  const orgCards = (organizations as any[])
    .filter((o) => (o.entity_type || "SCHOOL") === "ORG")
    .map((org: any) => {
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
      };
    });

  return (
    <div className="min-h-screen font-cairo" dir={dir}>
      <Header />
      <main className="pt-32 pb-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-10"
          >
            <div>
              <h1 className="text-4xl md:text-5xl font-black mb-3">
                <span className="text-primary">{t("orgsPage.title")}</span>
              </h1>
              <p className="text-muted-foreground text-lg">{t("orgsPage.description")}</p>
            </div>
            <Badge variant="outline" className="text-sm">
              {orgCards.length} {t("orgsPage.count")}
            </Badge>
          </motion.div>

          {(isLoadingOrgs || isLoadingGrades) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-xl" />
              ))}
            </div>
          ) : orgCards.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">{t("orgsPage.empty")}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {orgCards.map((org) => (
                <Link key={org.id} to={`/org/${org.slug}`}>
                  <div className="p-2 text-center space-y-3 transition-transform hover:-translate-y-0.5">
                      <div className="relative w-36 h-36 md:w-40 md:h-40 mx-auto rounded-full overflow-hidden shadow-lg">
                        <img src={org.cover} alt={org.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 ring-1 ring-black/10 rounded-full" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm line-clamp-2 min-h-[2.5rem]">{org.name}</h3>
                        <Badge variant="secondary" className="text-[10px]">{t("common.institution")}</Badge>
                      </div>
                      <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><School className="w-3 h-3" />{org.gradesCount}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{org.students.toLocaleString(localeId)}</span>
                      </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Organizations;

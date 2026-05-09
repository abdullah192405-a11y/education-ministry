import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useParams, Link } from "react-router-dom";
import { useGrades, useOrganizations } from "@/hooks/useDatabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, GraduationCap, BookOpen } from "lucide-react";

const OrganizationProfile = () => {
  const { orgSlug } = useParams();
  const { data: organizations = [], isLoading: isLoadingOrgs } = useOrganizations();
  const org = (organizations as any[]).find((o) => o.slug === orgSlug);
  const { data: grades = [], isLoading: isLoadingGrades } = useGrades({
    organizationId: org?.id || null,
    enabled: !!org?.id,
  });

  return (
    <div className="min-h-screen font-cairo" dir="rtl">
      <Header />
      <main className="pt-28 pb-16">
        <div className="container mx-auto px-4">
          {isLoadingOrgs ? (
            <Skeleton className="h-44 w-full mb-8" />
          ) : !org ? (
            <p className="text-center py-16 text-muted-foreground">المؤسسة غير موجودة.</p>
          ) : (
            <>
              <div className="rounded-2xl border p-6 md:p-8 bg-gradient-to-r from-primary/10 to-background mb-8">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border bg-muted">
                    <img
                      src={org.image_url || "/logo.png"}
                      alt={org.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <h1 className="text-2xl md:text-3xl font-black">{org.name}</h1>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">{org.entity_type === "SCHOOL" ? "مدرسة" : "مؤسسة"}</Badge>
                      <Badge variant="outline">{org.kind === "EDUCATIONAL" ? "تعليمية" : org.kind === "ENRICHMENT" ? "إثرائية" : "تعليمية + إثرائية"}</Badge>
                      <Badge variant="secondary">{org.subscription_package === "INSTITUTION_ADMIN_STUDENT" ? "باقة المؤسسات (٢)" : "باقة المؤسسات الكاملة"}</Badge>
                    </div>
                  </div>
                </div>
                {org.description ? (
                  <p className="mt-3 text-sm text-foreground/90 leading-7">
                    {org.description}
                  </p>
                ) : null}
              </div>

              <h2 className="text-xl font-bold mb-4">محتوى المؤسسة</h2>
              {isLoadingGrades ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-64 w-full" />
                  ))}
                </div>
              ) : (grades as any[]).length === 0 ? (
                <p className="text-center text-muted-foreground py-10">لا يوجد محتوى منشور لهذه المؤسسة حالياً.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {(grades as any[]).map((grade: any) => (
                    <Link key={grade.id} to={`/grade/${grade.slug}`}>
                      <Card className="overflow-hidden h-full hover:shadow-lg transition-all">
                        <div className="h-32">
                          <img src={grade.cover_image || grade.coverImage || "/logo.png"} alt={grade.name} className="w-full h-full object-cover" />
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-bold mb-1">{grade.name}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{grade.description}</p>
                          <div className="flex items-center justify-between text-xs border-t pt-2">
                            <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{(grade.students_count || 0).toLocaleString("ar-SA")} طالب</span>
                            <span className="flex items-center gap-1 text-primary"><BookOpen className="w-3 h-3" />{grade.subjects?.length || 0} مواد</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrganizationProfile;

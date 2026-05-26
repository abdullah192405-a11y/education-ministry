import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { School, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useGrades, useOrganizations } from "@/hooks/useDatabase";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useCallback, useEffect, useState } from "react";
type PartnerCard = {
  id: string;
  name: string;
  slug: string;
  cover: string;
  gradesCount: number;
  students: number;
  entityType: string;
};

function PartnerCardItem({
  org,
  localeId,
  schoolLabel,
  institutionLabel,
}: {
  org: PartnerCard;
  localeId: string;
  schoolLabel: string;
  institutionLabel: string;
}) {
  return (
    <Link
      to={`/org/${org.slug}`}
      className="group flex w-full flex-col items-center p-2 text-center transition-transform hover:-translate-y-0.5"
    >
      <div className="relative mx-auto h-36 w-36 overflow-hidden rounded-full shadow-lg md:h-40 md:w-40">
        <img src={org.cover} alt={org.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 rounded-full ring-1 ring-black/10" />
      </div>
      <div className="mt-3 space-y-1">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold">{org.name}</h3>
        <Badge variant="secondary" className="text-[10px]">
          {org.entityType === "SCHOOL" ? schoolLabel : institutionLabel}
        </Badge>
      </div>
      <div className="mt-2 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <School className="h-3 w-3" />
          {org.gradesCount}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {org.students.toLocaleString(localeId)}
        </span>
      </div>
    </Link>
  );
}

function PartnersCarousel({
  partners,
  dir,
  localeId,
  schoolLabel,
  institutionLabel,
}: {
  partners: PartnerCard[];
  dir: "rtl" | "ltr";
  localeId: string;
  schoolLabel: string;
  institutionLabel: string;
}) {
  const { t } = useTranslation();
  const [api, setApi] = useState<CarouselApi>();
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const onSelect = useCallback((carouselApi: CarouselApi) => {
    if (!carouselApi) return;
    setCanPrev(carouselApi.canScrollPrev());
    setCanNext(carouselApi.canScrollNext());
  }, []);

  useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  const scrollPrev = () => api?.scrollPrev();
  const scrollNext = () => api?.scrollNext();

  const PrevIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <div className="relative mx-auto w-full max-w-6xl px-12 md:px-14">
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: partners.length > 1,
          direction: dir === "rtl" ? "rtl" : "ltr",
          dragFree: true,
          slidesToScroll: 1,
        }}
        className="w-full"
      >
        <CarouselContent>
          {partners.map((org) => (
            <CarouselItem
              key={org.id}
              className="basis-[11rem] sm:basis-[12rem] md:basis-[13rem]"
            >
              <PartnerCardItem
                org={org}
                localeId={localeId}
                schoolLabel={schoolLabel}
                institutionLabel={institutionLabel}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute start-0 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full border-2 bg-background/95 shadow-md backdrop-blur-sm hover:bg-background disabled:opacity-40"
        disabled={!canPrev}
        onClick={scrollPrev}
        aria-label={t("orgsSection.carouselPrev")}
      >
        <PrevIcon className="h-6 w-6" />
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute end-0 top-1/2 z-10 h-11 w-11 -translate-y-1/2 rounded-full border-2 bg-background/95 shadow-md backdrop-blur-sm hover:bg-background disabled:opacity-40"
        disabled={!canNext}
        onClick={scrollNext}
        aria-label={t("orgsSection.carouselNext")}
      >
        <NextIcon className="h-6 w-6" />
      </Button>
    </div>
  );
}

const OrganizationsSection = () => {
  const { data: organizations = [], isLoading: isLoadingOrgs } = useOrganizations();
  const { data: grades = [], isLoading: isLoadingGrades } = useGrades();
  const { t, dir } = useTranslation();
  const localeId = t("common.locale");

  const partners: PartnerCard[] = (organizations as any[]).map((org: any) => {
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

  if (isLoadingOrgs || isLoadingGrades) {
    return (
      <section className="py-16 md:py-24 bg-muted/20">
        <div className="container mx-auto px-4">
          <Skeleton className="mb-12 h-12 w-72" />
          <div className="flex gap-6 overflow-hidden px-12">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-44 shrink-0 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-24 bg-muted/20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end"
        >
          <div>
            <h2 className="mb-4 text-3xl font-black md:text-5xl">
              <span className="text-primary">{t("orgsSection.partnersTitle")}</span>
            </h2>
            <p className="max-w-xl text-lg text-muted-foreground">
              {t("orgsSection.partnersDescription")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {partners.length} {t("orgsSection.partnersCount")}
            </Badge>
            <Button variant="outline" asChild>
              <Link to="/partners">{t("orgsSection.viewPartners")}</Link>
            </Button>
          </div>
        </motion.div>

        {partners.length ? (
          <PartnersCarousel
            partners={partners}
            dir={dir}
            localeId={localeId}
            schoolLabel={t("common.school")}
            institutionLabel={t("common.institution")}
          />
        ) : (
          <p className="py-10 text-center text-muted-foreground">{t("orgsSection.partnersEmpty")}</p>
        )}
      </div>
    </section>
  );
};

export default OrganizationsSection;

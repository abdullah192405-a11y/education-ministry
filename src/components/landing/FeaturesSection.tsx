import { motion } from "framer-motion";
import { Play, Users, BookOpen, Trophy, Clock, BarChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";

const FEATURES: ReadonlyArray<{
  icon: typeof BookOpen;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  color: string;
  bgColor: string;
}> = [
  {
    icon: BookOpen,
    titleKey: "features.designContentTitle",
    descKey: "features.designContentDesc",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Users,
    titleKey: "features.challengesTitle",
    descKey: "features.challengesDesc",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
  {
    icon: Trophy,
    titleKey: "features.leaderboardTitle",
    descKey: "features.leaderboardDesc",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    icon: Clock,
    titleKey: "features.interactiveTitle",
    descKey: "features.interactiveDesc",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  {
    icon: Play,
    titleKey: "features.gamifiedTitle",
    descKey: "features.gamifiedDesc",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: BarChart,
    titleKey: "features.reportsTitle",
    descKey: "features.reportsDesc",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

const FeaturesSection = () => {
  const { t, language } = useTranslation();
  const questionMark = language === "ar" ? "؟" : "?";
  return (
    <section className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            {t("features.whyTitle")} <span className="text-primary">{t("common.brand")}</span>{questionMark}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("features.whySubtitle")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.titleKey}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card variant="interactive" className="h-full">
                <CardContent className="p-6 md:p-8">
                  <div className={`w-14 h-14 rounded-xl ${feature.bgColor} flex items-center justify-center mb-5`}>
                    <feature.icon className={`w-7 h-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{t(feature.titleKey)}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t(feature.descKey)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

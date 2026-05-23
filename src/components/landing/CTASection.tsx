import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/contexts/LanguageContext";

const CTASection = () => {
  const { t, dir } = useTranslation();
  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;
  const arrowTranslate = dir === "rtl" ? "group-hover:-translate-x-1" : "group-hover:translate-x-1";
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-accent" />

          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />

          <div className="relative px-8 py-16 md:px-16 md:py-24 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                {t("cta.badge")}
              </div>

              <h2 className="text-3xl md:text-5xl font-black mb-6 max-w-2xl mx-auto">
                {t("cta.title")}
              </h2>

              <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
                {t("cta.description")}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button variant="hero" size="xl" asChild>
                  <Link to="/register" className="group">
                    {t("cta.createFree")}
                    <ArrowIcon className={`w-5 h-5 transition-transform ${arrowTranslate}`} />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/how-it-works">{t("cta.howItWorks")}</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;

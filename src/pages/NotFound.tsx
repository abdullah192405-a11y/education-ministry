import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

const NotFound = () => {
  const { t, dir } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-cairo" dir={dir}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-9xl font-black text-primary mb-6">{t("notFound.code")}</div>
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{t("notFound.title")}</h1>
        <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
          {t("notFound.description")}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild>
            <Link to="/"><Home className="w-4 h-4" />{t("common.backToHome")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/grades"><Search className="w-4 h-4" />{t("notFound.exploreCurriculum")}</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;

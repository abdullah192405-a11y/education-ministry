import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import AnnouncementBar from "./AnnouncementBar";
import { useUser } from "@/hooks/useDatabase";
import { useTranslation } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { LogIn, User, Menu, X } from "lucide-react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: user } = useUser();
  const { t } = useTranslation();

  const contentNavLabel = user
    ? t("header.educationalContent")
    : t("header.enrichmentChannels");
  const contentNavHref = user ? "/grades?kind=teaching" : "/grades?kind=enrichment";

  const getDashboardPath = () => {
    if (!user?.role) return "/dashboard/student";
    const role = user.role.toUpperCase();
    if (role === "SUPERADMIN") return "/dashboard/superadmin";
    if (role === "ADMIN" || role === "مسؤول") return "/dashboard/admin";
    if (role === "TEACHER" || role === "معلم" || role === "معلمة") return "/dashboard/teacher";
    return "/dashboard/student";
  };

  const dashboardPath = getDashboardPath();

  const navItems = [
    { label: t("common.home"), href: "/" },
    { label: contentNavLabel, href: contentNavHref },
    { label: t("orgsSection.partnersTitle"), href: "/partners" },
    ...(user ? [{ label: t("common.dashboard"), href: dashboardPath }] : []),
  ];

  return (
    <header className="fixed top-0 right-0 left-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <AnnouncementBar />
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt={t("common.brand")} className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-contain bg-background" />
            <span className="text-xl md:text-2xl font-bold text-foreground">
              {t("common.brand")}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            {user ? (
              <>
                <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-primary">{user.name}</span>
                </div>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">
                    <LogIn className="w-4 h-4" />
                    {t("common.login")}
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/register">
                    <User className="w-4 h-4" />
                    {t("common.register")}
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-1 md:hidden">
            <LanguageSwitcher iconOnly size="icon" />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-foreground"
              aria-label="menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border"
          >
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="py-3 px-4 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium"
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
                {user ? (
                  <div className="w-full px-4 py-2 text-sm font-medium text-primary">{user.name}</div>
                ) : (
                  <>
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                        <LogIn className="w-4 h-4" />
                        {t("common.login")}
                      </Link>
                    </Button>
                    <Button className="w-full" asChild>
                      <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                        <User className="w-4 h-4" />
                        {t("common.register")}
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;

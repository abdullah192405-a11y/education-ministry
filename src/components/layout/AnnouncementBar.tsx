import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Megaphone, ArrowLeft, ArrowRight } from "lucide-react";
import { useAnnouncements } from "@/hooks/useDatabase";
import { useTranslation } from "@/contexts/LanguageContext";

const AnnouncementBar = () => {
    const [isVisible, setIsVisible] = useState(true);
    const { data: announcements = [], isLoading } = useAnnouncements();
    const { t, dir } = useTranslation();

    if (!isVisible || isLoading || announcements.length === 0) return null;

    const announcement = announcements[0];
    const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-primary text-primary-foreground relative overflow-hidden"
                >
                    <div className="container mx-auto px-4 py-2 flex items-center justify-between text-sm md:text-base">
                        <div className="flex items-center gap-3 flex-1 justify-center md:justify-start">
                            <div className="bg-white/20 p-1 rounded-md hidden md:block">
                                <Megaphone className="w-4 h-4" />
                            </div>
                            <p className="font-medium">
                                {announcement.title}: <span className="opacity-90">{announcement.content}</span>
                            </p>
                            {announcement.link && (
                                <a
                                    href={announcement.link}
                                    className="flex items-center gap-1 font-bold hover:underline"
                                >
                                    {t("announcement.readMore")}
                                    <ArrowIcon className="w-3 h-3" />
                                </a>
                            )}
                        </div>
                        <button
                            onClick={() => setIsVisible(false)}
                            className="p-1 hover:bg-white/10 rounded-full transition-colors shrink-0"
                            aria-label={t("announcement.closeAria")}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    {/* Decorative background element */}
                    <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AnnouncementBar;

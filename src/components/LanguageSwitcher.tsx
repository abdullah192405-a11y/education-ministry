import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";

interface LanguageSwitcherProps {
    variant?: "default" | "ghost" | "outline";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
    /** Hide the visible label and rely on aria-label only (icon button). */
    iconOnly?: boolean;
}

/**
 * Toggle between Arabic and English. Persists choice to localStorage and updates the
 * document `dir`/`lang` attributes via LanguageContext.
 */
const LanguageSwitcher = ({
    variant = "ghost",
    size = "sm",
    className,
    iconOnly = false,
}: LanguageSwitcherProps) => {
    const { t, toggleLanguage } = useTranslation();
    const label = t("common.switchLanguage");
    const ariaLabel = t("common.switchLanguageAria");

    return (
        <Button
            type="button"
            variant={variant}
            size={size}
            onClick={toggleLanguage}
            aria-label={ariaLabel}
            className={className}
        >
            <Globe className="w-4 h-4" />
            {!iconOnly && <span className="font-medium">{label}</span>}
        </Button>
    );
};

export default LanguageSwitcher;

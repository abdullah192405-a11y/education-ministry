import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translations, type Language, type TranslationKey } from "@/lib/i18n/translations";

const STORAGE_KEY = "lab4_language";

type Direction = "rtl" | "ltr";

export type TFunction = (key: TranslationKey, replacements?: Record<string, string | number>) => string;

interface LanguageContextValue {
    language: Language;
    dir: Direction;
    setLanguage: (lang: Language) => void;
    toggleLanguage: () => void;
    t: TFunction;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): Language {
    if (typeof window === "undefined") return "ar";
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === "ar" || stored === "en") return stored;
    } catch {
        // Storage may be unavailable (private mode, etc.) — fall back to default.
    }
    return "ar";
}

function applyDocumentDirection(lang: Language) {
    if (typeof document === "undefined") return;
    const dir: Direction = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
    document.body.setAttribute("dir", dir);
}

function interpolate(template: string, replacements?: Record<string, string | number>): string {
    if (!replacements) return template;
    return template.replace(/\{(\w+)\}/g, (match, name) => {
        const value = replacements[name];
        return value === undefined || value === null ? match : String(value);
    });
}

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>(getInitialLanguage);

    useEffect(() => {
        applyDocumentDirection(language);
        try {
            window.localStorage.setItem(STORAGE_KEY, language);
        } catch {
            // Ignore storage errors.
        }
    }, [language]);

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
    }, []);

    const toggleLanguage = useCallback(() => {
        setLanguageState((prev) => (prev === "ar" ? "en" : "ar"));
    }, []);

    const t = useCallback(
        (key: TranslationKey, replacements?: Record<string, string | number>): string => {
            const dict = translations[language] as Record<string, string>;
            const fallback = translations.ar as Record<string, string>;
            const raw = dict[key] ?? fallback[key] ?? key;
            return interpolate(raw, replacements);
        },
        [language],
    );

    const value = useMemo<LanguageContextValue>(
        () => ({
            language,
            dir: language === "ar" ? "rtl" : "ltr",
            setLanguage,
            toggleLanguage,
            t,
        }),
        [language, setLanguage, toggleLanguage, t],
    );

    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
    const ctx = useContext(LanguageContext);
    if (!ctx) {
        throw new Error("useLanguage must be used within LanguageProvider");
    }
    return ctx;
}

/** Convenience hook that exposes only the translator function. */
export function useTranslation() {
    const { t, language, dir, setLanguage, toggleLanguage } = useLanguage();
    return { t, language, dir, setLanguage, toggleLanguage };
}

/** Locale helpers for dashboard pages and tabs. */
export function useDashboardLocale() {
    const { t, language, dir, setLanguage, toggleLanguage } = useLanguage();
    const isRtl = dir === "rtl";
    return {
        t,
        language,
        dir,
        locale: language === "ar" ? "ar-SA" : "en-US",
        isRtl,
        textAlign: isRtl ? ("text-right" as const) : ("text-start" as const),
        flexReverse: isRtl ? "flex-row-reverse" : "flex-row",
        setLanguage,
        toggleLanguage,
    };
}

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type FloatingChromeContextValue = {
    hideFloatingChrome: boolean;
    setHideFloatingChrome: (hide: boolean) => void;
};

const FloatingChromeContext = createContext<FloatingChromeContextValue | null>(null);

export function FloatingChromeProvider({ children }: { children: ReactNode }) {
    const [hideFloatingChrome, setHideFloatingChrome] = useState(false);

    return (
        <FloatingChromeContext.Provider value={{ hideFloatingChrome, setHideFloatingChrome }}>
            {children}
        </FloatingChromeContext.Provider>
    );
}

function useFloatingChrome() {
    const ctx = useContext(FloatingChromeContext);
    if (!ctx) {
        throw new Error("useFloatingChrome must be used within FloatingChromeProvider");
    }
    return ctx;
}

/** Hide global floating UI (e.g. WhatsApp) while `active` is true; resets on unmount. */
export function useHideFloatingChromeWhileActive(active: boolean) {
    const { setHideFloatingChrome } = useFloatingChrome();

    useEffect(() => {
        setHideFloatingChrome(active);
        return () => setHideFloatingChrome(false);
    }, [active, setHideFloatingChrome]);
}

export function useFloatingChromeHidden() {
    return useFloatingChrome().hideFloatingChrome;
}

import { Sparkles, UserCheck, Building2, Package, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/LanguageContext";
import type { SuperadminTabId } from "./SuperadminNav";

type SuperadminQuickActionsProps = {
    pendingCount: number;
    onNavigate: (tab: SuperadminTabId) => void;
};

export function SuperadminQuickActions({ pendingCount, onNavigate }: SuperadminQuickActionsProps) {
    const { t, dir } = useTranslation();

    const ACTIONS: {
        tab: SuperadminTabId;
        icon: typeof Sparkles;
        title: string;
        desc: string;
        accent: string;
    }[] = [
        {
            tab: "create",
            icon: Sparkles,
            title: t("dash.super.quick.create.title"),
            desc: t("dash.super.quick.create.desc"),
            accent: "from-violet-500/15 to-indigo-500/10 border-violet-500/25",
        },
        {
            tab: "admins",
            icon: UserCheck,
            title: t("dash.super.quick.admins.title"),
            desc: t("dash.super.quick.admins.desc"),
            accent: "from-amber-500/15 to-orange-500/10 border-amber-500/25",
        },
        {
            tab: "orgs",
            icon: Building2,
            title: t("dash.super.quick.orgs.title"),
            desc: t("dash.super.quick.orgs.desc"),
            accent: "from-blue-500/15 to-cyan-500/10 border-blue-500/25",
        },
        {
            tab: "plans",
            icon: Package,
            title: t("dash.super.quick.plans.title"),
            desc: t("dash.super.quick.plans.desc"),
            accent: "from-emerald-500/15 to-teal-500/10 border-emerald-500/25",
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" dir={dir}>
            {ACTIONS.map((a) => (
                <button
                    key={a.tab}
                    type="button"
                    onClick={() => onNavigate(a.tab)}
                    className={cn(
                        "rounded-xl border bg-gradient-to-br p-4 transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
                        dir === "rtl" ? "text-right" : "text-left",
                        a.accent,
                    )}
                >
                    <a.icon className="w-6 h-6 mb-2 text-primary" />
                    <p className="font-semibold text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                    {a.tab === "admins" && pendingCount > 0 && (
                        <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                            <Inbox className="w-3 h-3" />
                            {pendingCount} {t("dash.super.quick.requestSuffix")}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

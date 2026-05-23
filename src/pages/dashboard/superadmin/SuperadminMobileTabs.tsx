import type { LucideIcon } from "lucide-react";
import {
    LayoutDashboard,
    Sparkles,
    UserCheck,
    Building2,
    Users,
    Package,
    LifeBuoy,
    Settings,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/LanguageContext";
import type { SuperadminTabId } from "./SuperadminNav";

type SuperadminMobileTabsProps = {
    activeTab: SuperadminTabId;
    onTabChange: (tab: SuperadminTabId) => void;
    pendingRequestsCount?: number;
};

export function SuperadminMobileTabs({
    activeTab,
    onTabChange,
    pendingRequestsCount = 0,
}: SuperadminMobileTabsProps) {
    const { t, dir } = useTranslation();

    const MOBILE_TABS: { id: SuperadminTabId; icon: LucideIcon; label: string }[] = [
        { id: "overview", icon: LayoutDashboard, label: t("dash.super.mobile.overview") },
        { id: "create", icon: Sparkles, label: t("dash.super.mobile.create") },
        { id: "admins", icon: UserCheck, label: t("dash.super.mobile.admins") },
        { id: "orgs", icon: Building2, label: t("dash.super.mobile.orgs") },
        { id: "users", icon: Users, label: t("dash.super.mobile.users") },
        { id: "plans", icon: Package, label: t("dash.super.mobile.plans") },
        { id: "support", icon: LifeBuoy, label: t("dash.super.mobile.support") },
        { id: "settings", icon: Settings, label: t("dash.super.mobile.settings") },
    ];

    return (
        <div className="lg:hidden sticky top-16 z-30 -mx-4 px-4 py-2 bg-background/95 backdrop-blur border-b border-border">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin" dir={dir}>
                {MOBILE_TABS.map((tab) => {
                    const active = activeTab === tab.id;
                    const badge = tab.id === "admins" ? pendingRequestsCount : 0;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "flex items-center gap-1.5 shrink-0 rounded-full px-3 py-2 text-xs font-medium transition-colors",
                                active
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-muted/80 text-muted-foreground hover:bg-muted",
                            )}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                            {badge > 0 && (
                                <Badge
                                    variant={active ? "secondary" : "destructive"}
                                    className="h-4 min-w-4 px-1 text-[9px]"
                                >
                                    {badge}
                                </Badge>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

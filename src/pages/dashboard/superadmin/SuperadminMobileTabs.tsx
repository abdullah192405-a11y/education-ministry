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
import type { SuperadminTabId } from "./SuperadminNav";

const MOBILE_TABS: { id: SuperadminTabId; icon: LucideIcon; label: string }[] = [
    { id: "overview", icon: LayoutDashboard, label: "نظرة" },
    { id: "create", icon: Sparkles, label: "إنشاء" },
    { id: "admins", icon: UserCheck, label: "أدمن" },
    { id: "orgs", icon: Building2, label: "مؤسسات" },
    { id: "users", icon: Users, label: "مستخدمون" },
    { id: "plans", icon: Package, label: "باقات" },
    { id: "support", icon: LifeBuoy, label: "دعم" },
    { id: "settings", icon: Settings, label: "إعدادات" },
];

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
    return (
        <div className="lg:hidden sticky top-16 z-30 -mx-4 px-4 py-2 bg-background/95 backdrop-blur border-b border-border">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin" dir="rtl">
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

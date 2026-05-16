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
    Crown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";

export type SuperadminTabId =
    | "overview"
    | "users"
    | "orgs"
    | "admins"
    | "create"
    | "support"
    | "settings"
    | "plans";

type NavItem = {
    id: SuperadminTabId;
    icon: LucideIcon;
    label: string;
    badge?: number;
};

type NavGroup = {
    label: string;
    items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
    {
        label: "الرئيسية",
        items: [{ id: "overview", icon: LayoutDashboard, label: "نظرة عامة" }],
    },
    {
        label: "التشغيل",
        items: [
            { id: "create", icon: Sparkles, label: "إنشاء حسابات" },
            { id: "admins", icon: UserCheck, label: "أدمن المؤسسات" },
            { id: "orgs", icon: Building2, label: "المؤسسات" },
            { id: "users", icon: Users, label: "كل المستخدمين" },
        ],
    },
    {
        label: "المنصة",
        items: [
            { id: "plans", icon: Package, label: "الباقات والاشتراكات" },
            { id: "support", icon: LifeBuoy, label: "تذاكر الدعم" },
            { id: "settings", icon: Settings, label: "إعدادات المنصة" },
        ],
    },
];

type SuperadminNavProps = {
    userName: string;
    activeTab: SuperadminTabId;
    onTabChange: (tab: SuperadminTabId) => void;
    pendingRequestsCount?: number;
};

export function SuperadminNav({
    userName,
    activeTab,
    onTabChange,
    pendingRequestsCount = 0,
}: SuperadminNavProps) {
    const groups = NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.map((item) =>
            item.id === "admins" && pendingRequestsCount > 0
                ? { ...item, badge: pendingRequestsCount }
                : item,
        ),
    }));

    return (
        <CardContent className="p-4">
            <div className="text-center mb-4 pb-4 border-b">
                <div className="w-16 h-16 rounded-xl mx-auto mb-3 bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                    <Crown className="w-8 h-8 text-white" />
                </div>
                <h2 className="font-bold text-sm mb-1">{userName}</h2>
                <p className="text-xs text-muted-foreground">منصة متعددة المؤسسات</p>
                <div className="flex justify-center mt-2">
                    <Badge className="text-[10px]">SUPERADMIN</Badge>
                </div>
            </div>

            <nav className="space-y-4">
                {groups.map((group) => (
                    <div key={group.label} className="space-y-1">
                        <p className="px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {group.label}
                        </p>
                        {group.items.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onTabChange(item.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                                    activeTab === item.id
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "hover:bg-muted"
                                }`}
                            >
                                <item.icon className="w-4 h-4 shrink-0" />
                                <span className="flex-1 text-right">{item.label}</span>
                                {item.badge != null && item.badge > 0 && (
                                    <Badge
                                        variant={activeTab === item.id ? "secondary" : "destructive"}
                                        className="h-5 min-w-5 px-1.5 text-[10px]"
                                    >
                                        {item.badge}
                                    </Badge>
                                )}
                            </button>
                        ))}
                    </div>
                ))}
            </nav>
        </CardContent>
    );
}

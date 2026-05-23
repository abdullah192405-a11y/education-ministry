import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";
import type { SuperadminTabId } from "./SuperadminNav";

type PendingRequestsBannerProps = {
    count: number;
    onGoToAdmins: () => void;
    hiddenOnTab?: SuperadminTabId;
    currentTab: SuperadminTabId;
};

export function PendingRequestsBanner({
    count,
    onGoToAdmins,
    hiddenOnTab = "admins",
    currentTab,
}: PendingRequestsBannerProps) {
    const { t } = useTranslation();
    if (count <= 0 || currentTab === hiddenOnTab) return null;

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
            <p className="text-sm flex items-center gap-2">
                <Inbox className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{t("dash.super.banner.pending", { count })}</span>
            </p>
            <Button size="sm" variant="secondary" className="shrink-0" onClick={onGoToAdmins}>
                {t("dash.super.banner.review")}
            </Button>
        </div>
    );
}

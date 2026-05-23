import type { TFunction } from "@/contexts/LanguageContext";
import type { SuperadminTabId } from "./SuperadminNav";

export type SuperadminTabMeta = Record<
    SuperadminTabId,
    { title: string; description: string }
>;

export function getSuperadminTabMeta(t: TFunction): SuperadminTabMeta {
    return {
        overview: {
            title: t("dash.super.tabMeta.overview.title"),
            description: t("dash.super.tabMeta.overview.desc"),
        },
        create: {
            title: t("dash.super.tabMeta.create.title"),
            description: t("dash.super.tabMeta.create.desc"),
        },
        admins: {
            title: t("dash.super.tabMeta.admins.title"),
            description: t("dash.super.tabMeta.admins.desc"),
        },
        orgs: {
            title: t("dash.super.tabMeta.orgs.title"),
            description: t("dash.super.tabMeta.orgs.desc"),
        },
        users: {
            title: t("dash.super.tabMeta.users.title"),
            description: t("dash.super.tabMeta.users.desc"),
        },
        plans: {
            title: t("dash.super.tabMeta.plans.title"),
            description: t("dash.super.tabMeta.plans.desc"),
        },
        support: {
            title: t("dash.super.tabMeta.support.title"),
            description: t("dash.super.tabMeta.support.desc"),
        },
        settings: {
            title: t("dash.super.tabMeta.settings.title"),
            description: t("dash.super.tabMeta.settings.desc"),
        },
    };
}

export const VALID_SUPERADMIN_TABS: SuperadminTabId[] = [
    "overview",
    "create",
    "admins",
    "orgs",
    "users",
    "plans",
    "support",
    "settings",
];

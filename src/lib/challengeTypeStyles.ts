import type { ActivityType, GameType } from "@/data/challengeTypes";

export type ChallengeItemType = ActivityType | GameType;

export interface ChallengeTypeStyle {
    badge: string;
    badgeSolid: string;
    icon: string;
    iconBg: string;
    border: string;
    headerBg: string;
    indexBadge: string;
    pickerBorder: string;
    pickerHover: string;
    ring: string;
}

const DEFAULT_STYLE: ChallengeTypeStyle = {
    badge: "bg-muted text-muted-foreground",
    badgeSolid: "bg-primary text-primary-foreground hover:bg-primary/90 border-primary",
    icon: "text-primary",
    iconBg: "bg-primary/10",
    border: "border-primary/30",
    headerBg: "bg-primary/5",
    indexBadge: "bg-primary text-primary-foreground",
    pickerBorder: "border-primary/20 hover:border-primary",
    pickerHover: "hover:bg-primary/5",
    ring: "ring-primary",
};

/** Distinct colors per question/game template in the teacher dashboard. */
export const CHALLENGE_TYPE_STYLES: Record<ChallengeItemType, ChallengeTypeStyle> = {
    multiple_choice: {
        badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
        badgeSolid: "bg-blue-600 text-white hover:bg-blue-700 border-blue-600",
        icon: "text-blue-600 dark:text-blue-400",
        iconBg: "bg-blue-500/10",
        border: "border-blue-500/30",
        headerBg: "bg-blue-500/5",
        indexBadge: "bg-blue-600 text-white",
        pickerBorder: "border-blue-500/25 hover:border-blue-500",
        pickerHover: "hover:bg-blue-500/5",
        ring: "ring-blue-500",
    },
    true_false: {
        badge: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
        badgeSolid: "bg-teal-600 text-white hover:bg-teal-700 border-teal-600",
        icon: "text-teal-600 dark:text-teal-400",
        iconBg: "bg-teal-500/10",
        border: "border-teal-500/30",
        headerBg: "bg-teal-500/5",
        indexBadge: "bg-teal-600 text-white",
        pickerBorder: "border-teal-500/25 hover:border-teal-500",
        pickerHover: "hover:bg-teal-500/5",
        ring: "ring-teal-500",
    },
    qa: {
        badge: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
        badgeSolid: "bg-sky-600 text-white hover:bg-sky-700 border-sky-600",
        icon: "text-sky-600 dark:text-sky-400",
        iconBg: "bg-sky-500/10",
        border: "border-sky-500/30",
        headerBg: "bg-sky-500/5",
        indexBadge: "bg-sky-600 text-white",
        pickerBorder: "border-sky-500/25 hover:border-sky-500",
        pickerHover: "hover:bg-sky-500/5",
        ring: "ring-sky-500",
    },
    know_dont_know: {
        badge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
        badgeSolid: "bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-600",
        icon: "text-indigo-600 dark:text-indigo-400",
        iconBg: "bg-indigo-500/10",
        border: "border-indigo-500/30",
        headerBg: "bg-indigo-500/5",
        indexBadge: "bg-indigo-600 text-white",
        pickerBorder: "border-indigo-500/25 hover:border-indigo-500",
        pickerHover: "hover:bg-indigo-500/5",
        ring: "ring-indigo-500",
    },
    order_questions: {
        badge: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
        badgeSolid: "bg-amber-600 text-white hover:bg-amber-700 border-amber-600",
        icon: "text-amber-600 dark:text-amber-400",
        iconBg: "bg-amber-500/10",
        border: "border-amber-500/30",
        headerBg: "bg-amber-500/5",
        indexBadge: "bg-amber-600 text-white",
        pickerBorder: "border-amber-500/25 hover:border-amber-500",
        pickerHover: "hover:bg-amber-500/5",
        ring: "ring-amber-500",
    },
    matching: {
        badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        badgeSolid: "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600",
        icon: "text-emerald-600 dark:text-emerald-400",
        iconBg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        headerBg: "bg-emerald-500/5",
        indexBadge: "bg-emerald-600 text-white",
        pickerBorder: "border-emerald-500/25 hover:border-emerald-500",
        pickerHover: "hover:bg-emerald-500/5",
        ring: "ring-emerald-500",
    },
    shooting: {
        badge: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
        badgeSolid: "bg-rose-600 text-white hover:bg-rose-700 border-rose-600",
        icon: "text-rose-600 dark:text-rose-400",
        iconBg: "bg-rose-500/10",
        border: "border-rose-500/30",
        headerBg: "bg-rose-500/5",
        indexBadge: "bg-rose-600 text-white",
        pickerBorder: "border-rose-500/25 hover:border-rose-500",
        pickerHover: "hover:bg-rose-500/5",
        ring: "ring-rose-500",
    },
    wheel_spin: {
        badge: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
        badgeSolid: "bg-violet-600 text-white hover:bg-violet-700 border-violet-600",
        icon: "text-violet-600 dark:text-violet-400",
        iconBg: "bg-violet-500/10",
        border: "border-violet-500/30",
        headerBg: "bg-violet-500/5",
        indexBadge: "bg-violet-600 text-white",
        pickerBorder: "border-violet-500/25 hover:border-violet-500",
        pickerHover: "hover:bg-violet-500/5",
        ring: "ring-violet-500",
    },
    puzzle: {
        badge: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
        badgeSolid: "bg-orange-600 text-white hover:bg-orange-700 border-orange-600",
        icon: "text-orange-600 dark:text-orange-400",
        iconBg: "bg-orange-500/10",
        border: "border-orange-500/30",
        headerBg: "bg-orange-500/5",
        indexBadge: "bg-orange-600 text-white",
        pickerBorder: "border-orange-500/25 hover:border-orange-500",
        pickerHover: "hover:bg-orange-500/5",
        ring: "ring-orange-500",
    },
};

export const ALL_CHALLENGE_ITEM_TYPES: ChallengeItemType[] = [
    "multiple_choice",
    "true_false",
    "qa",
    "know_dont_know",
    "order_questions",
    "matching",
    "shooting",
    "wheel_spin",
    "puzzle",
];

export function getChallengeTypeStyle(type: string): ChallengeTypeStyle {
    return CHALLENGE_TYPE_STYLES[type as ChallengeItemType] ?? DEFAULT_STYLE;
}

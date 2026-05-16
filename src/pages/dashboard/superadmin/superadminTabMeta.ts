import type { SuperadminTabId } from "./SuperadminNav";

export const SUPERADMIN_TAB_META: Record<
    SuperadminTabId,
    { title: string; description: string }
> = {
    overview: {
        title: "نظرة عامة",
        description: "ملخص المنصة، المؤسسات، والمهام العاجلة.",
    },
    create: {
        title: "إنشاء حسابات",
        description: "إنشاء مؤسسة أو مدرسة، حساب الأدمن، وإرسال بيانات الدخول عبر واتساب.",
    },
    admins: {
        title: "أدمن المؤسسات",
        description: "مراجعة طلبات التسجيل وإدارة حسابات مديري المؤسسات.",
    },
    orgs: {
        title: "المؤسسات",
        description: "عرض وتعديل المؤسسات المسجّلة، الباقات، وحالة التفعيل.",
    },
    users: {
        title: "كل المستخدمين",
        description: "إدارة الأدوار والمؤسسات لجميع مستخدمي المنصة.",
    },
    plans: {
        title: "الباقات والاشتراكات",
        description: "مرجع الباقات، الأسعار التقديرية، وإدارة اشتراكات المؤسسات.",
    },
    support: {
        title: "تذاكر الدعم",
        description: "متابعة تذاكر الدعم الواردة من المستخدمين.",
    },
    settings: {
        title: "إعدادات المنصة",
        description: "إعدادات عامة تؤثر على سلوك المنصة للزوار والمؤسسات.",
    },
};

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

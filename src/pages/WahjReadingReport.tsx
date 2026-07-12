import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { Check, Copy, Share2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { fetchWahjReadingReportByToken } from "@/lib/wahjReadingReportLinks";
import type { WahjReadingReportPayload } from "@/lib/wahjReadingReportData";
import {
    applyWahjReadingReportSocialMeta,
    buildWahjReadingReportSocialMeta,
} from "@/lib/wahjReadingReportSocialMeta";

const LOGO = "/brand/wahj-logo.png";

const REPORT_SCENE_VISUALS: Record<string, string> = {
    welcome: "/brand/wahj-report-0-welcome.png?v=2",
    pages: "/brand/wahj-report-1-book.png",
    progress: "/brand/wahj-report-2-progress.png",
    focus: "/brand/wahj-report-3-focus.png",
    quotes: "/brand/wahj-report-4-quotes.png",
    community: "/brand/wahj-report-5-community.png",
    insight: "/brand/wahj-report-6-insight.png",
    "next-step": "/brand/wahj-report-7-next-step.png",
    gift: "/brand/wahj-report-8-gift.png",
};

type SceneKind =
    | "welcome"
    | "book"
    | "progress"
    | "focus"
    | "quotes"
    | "community"
    | "insight"
    | "gift"
    | "final";

type SceneTone = "brand" | "paper" | "aqua" | "sun" | "lilac";

type Scene = {
    id: string;
    eyebrow: string;
    title: string;
    description?: string;
    value?: string;
    unit?: string;
    kind: SceneKind;
    tone: SceneTone;
    facts?: Array<{ label: string; value: string }>;
    notes?: string[];
    action?: "copy" | "share";
};

const toneStyles: Record<SceneTone, string> = {
    brand:
        "bg-[linear-gradient(145deg,#99429e_0%,#7044a7_52%,#5266c3_100%)] text-white",
    paper:
        "bg-[#f3f7fc] text-[#131827]",
    aqua:
        "bg-[#f3f7fc] text-[#131827]",
    sun:
        "bg-[#f3f7fc] text-[#131827]",
    lilac:
        "bg-[#f3f7fc] text-[#131827]",
};

const accentStyles: Record<SceneTone, string> = {
    brand: "text-white",
    paper: "text-[#7146ae]",
    aqua: "text-[#2ca9b5]",
    sun: "text-[#7146ae]",
    lilac: "text-[#7146ae]",
};

const slideEase = [0.22, 1, 0.36, 1] as const;

function createSlideMotionVariants(reducedMotion: boolean | null) {
    const sectionVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                duration: reducedMotion ? 0.1 : 0.18,
                when: "beforeChildren",
            },
        },
        exit: reducedMotion
            ? { opacity: 0, transition: { duration: 0.12 } }
            : { opacity: 0, y: -20, transition: { duration: 0.3, ease: slideEase } },
    };

    const contentVariants: Variants = {
        hidden: {},
        visible: {
            transition: {
                staggerChildren: reducedMotion ? 0 : 0.13,
                delayChildren: reducedMotion ? 0 : 0.07,
            },
        },
    };

    const itemVariants: Variants = {
        hidden: reducedMotion ? { opacity: 0 } : { opacity: 0, y: 28 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: reducedMotion ? 0.1 : 0.48,
                ease: slideEase,
            },
        },
    };

    return { sectionVariants, contentVariants, itemVariants };
}

function buildScenes(payload: WahjReadingReportPayload): Scene[] {
    const firstInsight = payload.aiReport?.sections?.[0];
    const secondInsight = payload.aiReport?.sections?.[1];
    const insightNotes = [
        ...(firstInsight?.evidence || []).slice(0, 1),
        ...(firstInsight?.successIndicators || []).slice(0, 1),
    ];

    return [
        {
            id: "welcome",
            eyebrow: "تقرير قراء وهج",
            title: "حياك",
            value: payload.participantName,
            description: `جاهز تشوف أبرز محطات رحلتك في ${payload.programName}؟`,
            kind: "welcome",
            tone: "brand",
            facts: [
                { label: "المادة", value: payload.subjectName || "قراء وهج" },
                { label: "تاريخ التقرير", value: payload.generatedAt },
            ],
        },
        {
            id: "pages",
            eyebrow: "حصيلة القراءة",
            title: "كل صفحة فتحت لك أفق",
            description: "إنجازك هنا ليس رقماً فقط، بل أثر يتراكم مع كل جلسة قراءة.",
            value: String(payload.totalPages),
            unit: "صفحة مقروءة",
            kind: "book",
            tone: "paper",
        },
        {
            id: "progress",
            eyebrow: "مستوى الإنجاز",
            title: "خطوتك ثابتة",
            description: `وصلت إلى مستوى ${payload.analytics.readerLevelLabel}.`,
            value: `${payload.completionPercent}%`,
            unit: "من الرحلة",
            kind: "progress",
            tone: "lilac",
            facts: [
                {
                    label: "ترتيبك",
                    value: `#${payload.analytics.rank} من ${payload.analytics.totalParticipants}`,
                },
                { label: "تجاوزت", value: `${payload.analytics.beatPercent}% من المشاركين` },
            ],
        },
        {
            id: "focus",
            eyebrow: "وقت التركيز",
            title: "وقت استثمرته في نفسك",
            description: `امتدت رحلتك ${payload.daysCount} يوم، بمتوسط ${payload.analytics.avgPagesPerDay} صفحة يومياً.`,
            value: String(payload.focusHours),
            unit: "ساعة تركيز",
            kind: "focus",
            tone: "sun",
            facts: [
                { label: "أيام الرحلة", value: String(payload.daysCount) },
                { label: "المحاولات", value: String(payload.attemptCount) },
            ],
        },
        {
            id: "quotes",
            eyebrow: "الفوائد والاقتباسات",
            title: "أثر الكلمة يبقى",
            description: `نمطك القرائي: ${payload.analytics.readingStyleLabel}.`,
            value: String(payload.quotesCount),
            unit: "فائدة واقتباس",
            kind: "quotes",
            tone: "aqua",
            facts: [
                { label: "تفاعلك مع النص", value: payload.analytics.quoteEngagementLabel },
                { label: "متوسط المحاولة", value: String(payload.analytics.avgQuotesPerAttempt) },
            ],
        },
        {
            id: "community",
            eyebrow: "مجتمع وهج",
            title: "حضورك بين القراء",
            description: `حضورك القرائي وضعك ضمن ${payload.communityPercentLabel} من مجتمع البرنامج هذا الموسم.`,
            value: `#${payload.analytics.rank}`,
            unit: `من ${payload.analytics.totalParticipants} مشارك`,
            kind: "community",
            tone: "paper",
            facts: [
                { label: "مؤشر التفاعل", value: `${payload.analytics.engagementIndex}/100` },
                { label: "ثبات الإيقاع", value: payload.analytics.consistencyLabel },
            ],
        },
        {
            id: "insight",
            eyebrow: "قراءة ذكية لرحلتك",
            title: firstInsight?.title || "خطوتك القادمة",
            description:
                firstInsight?.actions?.[0] ||
                payload.aiReport?.summary?.slice(0, 220) ||
                payload.analytics.keyFindings[0],
            kind: "insight",
            tone: "brand",
            notes: insightNotes.length
                ? insightNotes
                : payload.analytics.keyFindings.slice(0, 2),
        },
        ...(secondInsight
            ? [
                {
                    id: "next-step",
                    eyebrow: [secondInsight.priority, secondInsight.timeframe]
                        .filter(Boolean)
                        .join(" · ") || "خطتك القادمة",
                    title: secondInsight.title,
                    description: secondInsight.actions?.[0] || secondInsight.points?.[0],
                    kind: "progress" as const,
                    tone: "lilac" as const,
                    notes: [
                        ...(secondInsight.evidence || []).slice(0, 1),
                        ...(secondInsight.successIndicators || []).slice(0, 1),
                    ],
                },
            ]
            : []),
        {
            id: "gift",
            eyebrow: "قبل لا تروح",
            title: "شارك وهجك",
            description: `شارك الكود مع شخص يعز عليك وامنحه ${payload.discountValue} وأولوية المقعد في الموسم القادم.`,
            value: payload.shareCode,
            unit: "كودك الخاص",
            kind: "gift",
            tone: "sun",
            action: "copy",
        },
        {
            id: "final",
            eyebrow: "النهاية بداية",
            title: "رحلتك تستحق المشاركة",
            description: "خلّ إنجازك يلهم قارئاً جديداً، ونشوفك في محطة أجمل مع وهج.",
            kind: "final",
            tone: "brand",
            action: "share",
        },
    ];
}

function BrandMark() {
    return (
        <div className="rounded-lg bg-white/90 px-2 py-1 shadow-sm">
            <img src={LOGO} alt="وهج" className="h-auto w-[66px] object-contain sm:w-[78px]" />
        </div>
    );
}

function WelcomeSceneBackground() {
    return (
        <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
            <img
                src={REPORT_SCENE_VISUALS.welcome}
                alt=""
                width={1024}
                height={571}
                decoding="async"
                className="h-full w-full object-cover"
            />
        </div>
    );
}

function SceneVisual({ sceneId, kind }: { sceneId: string; kind: SceneKind }) {
    if (sceneId === "welcome" || kind === "welcome") {
        return null;
    }

    const frame = "relative flex h-60 w-80 items-center justify-center overflow-visible sm:h-72 sm:w-[28rem]";
    const visualSrc = REPORT_SCENE_VISUALS[sceneId];

    if (visualSrc) {
        return (
            <div className={frame}>
                <img
                    src={visualSrc}
                    alt=""
                    className="mx-auto h-full w-full max-w-[22rem] object-contain sm:max-w-[26rem]"
                />
            </div>
        );
    }

    return (
        <div className={frame}>
            <img
                src={LOGO}
                alt=""
                className="mx-auto w-48 max-w-full object-contain"
            />
        </div>
    );
}

function LoadingState() {
    return (
        <main dir="rtl" lang="ar" className="grid min-h-[100dvh] place-items-center bg-[#f3f7fc] p-6 text-center font-['IBM_Plex_Sans_Arabic','Cairo',sans-serif]">
            <div>
                <img src={LOGO} alt="وهج" className="mx-auto w-32 object-contain" />
                <div className="mx-auto mt-8 h-9 w-9 animate-spin rounded-full border-[3px] border-[#d8deeb] border-t-[#7447ae]" />
                <p className="mt-4 font-semibold text-[#4b5263]">نجهّز رحلتك مع وهج...</p>
            </div>
        </main>
    );
}

function ErrorState({ message }: { message: string }) {
    return (
        <main dir="rtl" lang="ar" className="grid min-h-[100dvh] place-items-center bg-[#f3f7fc] p-6 text-center font-['IBM_Plex_Sans_Arabic','Cairo',sans-serif]">
            <div className="w-full max-w-md rounded-2xl bg-white p-9 shadow-[0_16px_40px_rgba(54,63,91,.1)]">
                <img src={LOGO} alt="وهج" className="mx-auto w-32 object-contain" />
                <h1 className="mt-7 text-2xl font-bold text-[#7447ae]">تعذر فتح التقرير</h1>
                <p className="mt-3 font-medium leading-7 text-[#4b5263]">{message}</p>
            </div>
        </main>
    );
}

const WahjReadingReport = () => {
    const { token = "" } = useParams();
    const reducedMotion = useReducedMotion();
    const [payload, setPayload] = useState<WahjReadingReportPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const [copied, setCopied] = useState<"code" | "link" | null>(null);
    const touchStart = useRef<number | null>(null);

    useEffect(() => {
        let alive = true;

        async function load() {
            if (!token) {
                setError("رابط التقرير غير مكتمل.");
                setLoading(false);
                return;
            }

            try {
                const row = await fetchWahjReadingReportByToken(token);
                if (!row?.payload) throw new Error("الرابط غير صالح أو انتهت صلاحيته.");
                if (alive) setPayload(row.payload);
            } catch (loadError) {
                if (alive) {
                    setError(loadError instanceof Error ? loadError.message : "تعذر تحميل التقرير.");
                }
            } finally {
                if (alive) setLoading(false);
            }
        }

        void load();
        return () => {
            alive = false;
        };
    }, [token]);

    useEffect(() => {
        if (!payload) return;

        const meta = buildWahjReadingReportSocialMeta({
            origin: window.location.origin,
            token,
            participantName: payload.participantName,
        });

        return applyWahjReadingReportSocialMeta(meta);
    }, [payload, token]);

    const scenes = useMemo(() => (payload ? buildScenes(payload) : []), [payload]);
    const scene = scenes[activeIndex];
    const { sectionVariants, contentVariants, itemVariants } = useMemo(
        () => createSlideMotionVariants(reducedMotion),
        [reducedMotion],
    );

    const goTo = useCallback(
        (index: number) => {
            if (!scenes.length) return;
            setActiveIndex(Math.max(0, Math.min(scenes.length - 1, index)));
        },
        [scenes.length],
    );

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "ArrowLeft" || event.key === "PageDown") goTo(activeIndex + 1);
            if (event.key === "ArrowRight" || event.key === "PageUp") goTo(activeIndex - 1);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [activeIndex, goTo]);

    const copy = async (kind: "code" | "link") => {
        const value = kind === "code" ? payload?.shareCode : window.location.href;
        if (!value) return;

        try {
            await navigator.clipboard.writeText(value);
            setCopied(kind);
            window.setTimeout(() => setCopied(null), 1800);
        } catch {
            setCopied(null);
        }
    };

    const share = async () => {
        if (navigator.share && payload) {
            try {
                await navigator.share({
                    title: `تقرير قراء وهج — ${payload.participantName}`,
                    text: "شاهد ملخص رحلتي في قراء وهج",
                    url: window.location.href,
                });
                return;
            } catch {
                // The user may dismiss the native share sheet.
            }
        }
        await copy("link");
    };

    if (loading) return <LoadingState />;
    if (error || !payload || !scene) return <ErrorState message={error || "لم يتم العثور على التقرير."} />;

    const isBrand = scene.tone === "brand";

    return (
        <main
            dir="rtl"
            lang="ar"
            className={`relative min-h-[100dvh] overflow-hidden font-['IBM_Plex_Sans_Arabic','Cairo',sans-serif] transition-colors duration-500 ${toneStyles[scene.tone]}`}
            onTouchStart={(event) => {
                touchStart.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
                if (touchStart.current === null) return;
                const delta = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
                if (Math.abs(delta) > 55) goTo(delta < 0 ? activeIndex + 1 : activeIndex - 1);
                touchStart.current = null;
            }}
        >
            {scene.id === "welcome" && <WelcomeSceneBackground />}

            <header className="absolute inset-x-0 top-0 z-30 px-4 pt-4 sm:px-7">
                <div className="flex gap-1.5" dir="rtl" aria-label="تقدم التقرير">
                    {scenes.map((item, index) => (
                        <button
                            key={item.id}
                            type="button"
                            aria-label={`انتقل إلى الصفحة ${index + 1}: ${item.title}`}
                            aria-current={index === activeIndex ? "step" : undefined}
                            onClick={() => goTo(index)}
                            className={`group relative h-1 flex-1 overflow-hidden rounded-full ${
                                isBrand ? "bg-white/25" : "bg-[#cfd6df]"
                            }`}
                        >
                            <span
                                className={`absolute inset-y-0 start-0 transition-[width] duration-300 ${
                                    isBrand ? "bg-white" : "bg-[#171923]"
                                }`}
                                style={{ width: index <= activeIndex ? "100%" : "0%" }}
                            />
                        </button>
                    ))}
                </div>
                <div className="mt-3 flex items-center justify-between">
                    <span className={`text-[11px] font-black ${isBrand ? "text-white/70" : "text-[#171717]/60"}`}>
                        {String(activeIndex + 1).padStart(2, "0")} / {String(scenes.length).padStart(2, "0")}
                    </span>
                    <BrandMark />
                </div>
            </header>

            <AnimatePresence mode="wait">
                <motion.section
                    key={scene.id}
                    variants={sectionVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className={`relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-5 pb-20 pt-24 sm:px-10 sm:pt-24 ${
                        scene.kind === "welcome" ? "justify-center" : ""
                    }`}
                >
                    <motion.div
                        variants={contentVariants}
                        className={`flex flex-col ${scene.kind === "welcome" ? "" : "flex-1"}`}
                    >
                        <motion.p
                            variants={itemVariants}
                            className={`mx-auto max-w-3xl text-center text-xs font-semibold sm:text-sm ${
                                isBrand ? "text-white/60" : "text-[#7351aa]"
                            }`}
                        >
                            {scene.eyebrow}
                        </motion.p>
                        <motion.h1
                            variants={itemVariants}
                            className={`mx-auto max-w-3xl text-center font-bold leading-[1.55] ${
                                scene.kind === "welcome"
                                    ? "mt-1 text-xl sm:text-2xl"
                                    : "mt-2 text-2xl sm:text-3xl"
                            } ${isBrand ? "text-white" : "text-[#171923]"}`}
                        >
                            {scene.title}
                        </motion.h1>
                        {scene.kind === "welcome" && scene.value && (
                            <motion.div variants={itemVariants} className="mx-auto mt-3 max-w-3xl text-center">
                                <div
                                    className={`break-words text-3xl font-bold leading-[1.3] sm:text-4xl ${accentStyles[scene.tone]}`}
                                >
                                    {scene.value}
                                </div>
                            </motion.div>
                        )}
                        {scene.description && (
                            <motion.p
                                variants={itemVariants}
                                className={`mx-auto mt-2 max-w-xl text-center text-sm font-medium leading-7 sm:text-base sm:leading-8 ${
                                    scene.kind === "welcome" ? "mt-4" : ""
                                } ${isBrand ? "text-white/80" : "text-[#171923]/75"}`}
                            >
                                {scene.description}
                            </motion.p>
                        )}
                        {scene.kind !== "welcome" && scene.value && (
                            <motion.div variants={itemVariants} className="mx-auto mt-5 max-w-3xl text-center">
                                <div
                                    className={`break-words text-4xl font-bold leading-tight tabular-nums sm:text-5xl ${accentStyles[scene.tone]}`}
                                >
                                    {scene.value}
                                </div>
                                {scene.unit && (
                                    <p className={`mt-1 text-sm font-semibold sm:text-base ${isBrand ? "text-white/65" : "text-[#171923]/55"}`}>
                                        {scene.unit}
                                    </p>
                                )}
                            </motion.div>
                        )}
                        {scene.facts?.map((fact, index) => (
                            <motion.div
                                key={`${fact.label}-${fact.value}`}
                                variants={itemVariants}
                                className={`mx-auto flex justify-center ${index === 0 ? "mt-5" : "mt-2"}`}
                            >
                                <div
                                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                        isBrand ? "bg-white/12 text-white" : "bg-white/80 text-[#394052] shadow-sm"
                                    }`}
                                >
                                    <span className="opacity-55">{fact.label}: </span>
                                    {fact.value}
                                </div>
                            </motion.div>
                        ))}

                        {scene.kind !== "welcome" && (
                            <motion.div
                                variants={itemVariants}
                                className="flex min-h-[260px] flex-1 items-center justify-center"
                            >
                                <SceneVisual sceneId={scene.id} kind={scene.kind} />
                            </motion.div>
                        )}

                        {scene.notes?.map((note) => (
                            <motion.p
                                key={note}
                                variants={itemVariants}
                                className={`mx-auto mb-2 w-full max-w-xl rounded-xl px-4 py-2.5 text-center text-xs font-medium leading-6 ${
                                    isBrand ? "bg-white/10 text-white" : "bg-white/75 text-[#394052] shadow-sm"
                                }`}
                            >
                                {note}
                            </motion.p>
                        ))}

                        {scene.action === "copy" && (
                            <motion.div variants={itemVariants} className="mx-auto mb-1 flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => void copy("code")}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#7447ae] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#633a9c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7447ae]/30"
                                >
                                    {copied === "code" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                                    {copied === "code" ? "تم نسخ الكود" : "انسخ كود المشاركة"}
                                </button>
                            </motion.div>
                        )}
                        {scene.action === "share" && (
                            <motion.div variants={itemVariants} className="mx-auto mb-1 flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => void share()}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#7447ae] shadow-md transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                                >
                                    {copied === "link" ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
                                    {copied === "link" ? "تم نسخ الرابط" : "شارك التقرير"}
                                </button>
                            </motion.div>
                        )}
                    </motion.div>
                </motion.section>
            </AnimatePresence>

            <button
                type="button"
                aria-label="الصفحة السابقة"
                onClick={() => goTo(activeIndex - 1)}
                disabled={activeIndex === 0}
                className="absolute inset-y-24 start-0 z-20 w-[18%] max-w-28 touch-manipulation disabled:pointer-events-none sm:w-[15%] sm:max-w-none md:cursor-w-resize"
            />
            <button
                type="button"
                aria-label="الصفحة التالية"
                onClick={() => goTo(activeIndex + 1)}
                disabled={activeIndex === scenes.length - 1}
                className="absolute inset-y-24 end-0 z-20 w-[18%] max-w-28 touch-manipulation disabled:pointer-events-none sm:w-[15%] sm:max-w-none md:cursor-e-resize"
            />

            <nav className="absolute inset-x-0 bottom-5 z-30 flex items-center justify-center px-5 sm:px-8" aria-label="مشاركة التقرير">
                <button
                    type="button"
                    onClick={() => void share()}
                    className={`inline-flex min-h-9 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition hover:-translate-y-0.5 ${
                        isBrand ? "bg-white/15 text-white backdrop-blur" : "bg-[#e9eef7] text-[#313747]"
                    }`}
                >
                    {copied === "link" ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                    {copied === "link" ? "تم نسخ الرابط" : "شارك الشاشة مع اللي تعرفهم"}
                </button>
            </nav>
        </main>
    );
};

export default WahjReadingReport;

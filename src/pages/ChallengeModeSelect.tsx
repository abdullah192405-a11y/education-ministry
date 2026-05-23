import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    ChevronLeft, ChevronRight, Users, User, Gamepad2, BrainCircuit,
    Shuffle, Copy, Share2, Sparkles, Zap, Target,
    Trophy, Check
} from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";
import {
    useTopic,
    useGrades,
    useSubject,
    useUser,
    useCreateChallengeSession,
} from "@/hooks/useDatabase";
import { useCatalogGradeClassMode } from "@/hooks/useCatalogGradeClassMode";
import { filterGradesForPublicCatalog } from "@/lib/contentVisibility";
import { Skeleton } from "@/components/ui/skeleton";
import {
    categoryLabels,
    generatePin,
    generateShareLink,
    type ChallengeMode,
    type ChallengeCategory
} from "@/data/challengeTypes";
import { getTopicChallengePreset, navigateToTopicChallenge } from "@/lib/topicChallengePreset";

const ChallengeModeSelect = () => {
    const { gradeId, subjectId, topicId } = useParams();
    const navigate = useNavigate();

    const { data: grades = [] } = useGrades();
    const { mode: visitorGradeMode } = useCatalogGradeClassMode();
    const grade = grades.find(g => g.id.toString() === gradeId || g.slug === gradeId);
    const gradeInPublicCatalog =
        !!grade && filterGradesForPublicCatalog([grade], visitorGradeMode).length > 0;

    const { data: topic, isLoading: isLoadingTopic } = useTopic(topicId || "");
    const { data: subject, isLoading: isLoadingSubject } = useSubject(subjectId || "");

    const isLoading = isLoadingTopic || isLoadingSubject;

    const [step, setStep] = useState<"mode" | "category" | "group_setup">("mode");
    const [selectedMode, setSelectedMode] = useState<ChallengeMode | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<ChallengeCategory | null>(null);
    const [groupPin, setGroupPin] = useState<string>("");
    const [playerName, setPlayerName] = useState<string>("");
    const [copied, setCopied] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isApplyingPreset, setIsApplyingPreset] = useState(false);
    const [presetRedirectFailed, setPresetRedirectFailed] = useState(false);
    const presetAppliedRef = useRef(false);

    const { data: currentUser } = useUser();
    const createSessionMutation = useCreateChallengeSession();
    const studentChallengePreset = topic ? getTopicChallengePreset(topic as Record<string, unknown>) : null;
    const { t, dir } = useTranslation();
    const ChevronIcon = dir === "rtl" ? ChevronRight : ChevronLeft;

    useEffect(() => {
        if (
            isLoading ||
            !topic ||
            !gradeId ||
            !subjectId ||
            !topicId ||
            !studentChallengePreset ||
            presetAppliedRef.current ||
            presetRedirectFailed
        ) {
            return;
        }

        presetAppliedRef.current = true;
        setIsApplyingPreset(true);

        navigateToTopicChallenge({
            preset: studentChallengePreset,
            gradeId,
            subjectId,
            topicId,
            navigate,
            currentUser,
            createSession: (args) => createSessionMutation.mutateAsync(args),
        }).catch((error: unknown) => {
            console.error("Failed to apply teacher challenge preset", error);
            presetAppliedRef.current = false;
            setPresetRedirectFailed(true);
            alert(t("challengeMode.presetFailed"));
        }).finally(() => {
            setIsApplyingPreset(false);
        });
    }, [
        isLoading,
        topic,
        gradeId,
        subjectId,
        topicId,
        studentChallengePreset,
        presetRedirectFailed,
        navigate,
        currentUser,
        createSessionMutation,
        t,
    ]);

    if (isLoading) {
        return (
            <div className="min-h-screen font-cairo" dir={dir}>
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 text-center py-20">
                        <Skeleton className="h-12 w-64 mx-auto mb-4" />
                        <Skeleton className="h-32 w-full max-w-2xl mx-auto" />
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    // Only when teacher set a specific path — otherwise show normal mode/category pickers below
    if (
        studentChallengePreset &&
        !presetRedirectFailed &&
        (isApplyingPreset || !presetAppliedRef.current)
    ) {
        return (
            <div className="min-h-screen font-cairo" dir={dir}>
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 text-center py-20">
                        <Skeleton className="h-12 w-64 mx-auto mb-4" />
                        <Skeleton className="h-32 w-full max-w-2xl mx-auto" />
                        <p className="text-muted-foreground mt-6">{t("challengeMode.preparingChallenge")}</p>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (!grade || !gradeInPublicCatalog || !subject || !topic) {
        return (
            <div className="min-h-screen font-cairo" dir={dir}>
                <Header />
                <main className="pt-24 pb-16">
                    <div className="container mx-auto px-4 text-center py-20">
                        <h1 className="text-3xl font-bold mb-4">{t("challengeMode.contentNotFound")}</h1>
                        <Button asChild>
                            <Link to="/grades">{t("challengeMode.backToGrades")}</Link>
                        </Button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    const handleModeSelect = (mode: ChallengeMode) => {
        setSelectedMode(mode);
        setStep("category");
    };

    const handleCategorySelect = async (category: ChallengeCategory) => {
        setSelectedCategory(category);

        if (selectedMode === "single") {
            // Navigate directly to single player challenge
            navigate(`/grade/${gradeId}/subject/${subjectId}/topic/${topicId}/challenge/single/${category}`);
        } else {
            setIsCreating(true);
            const pin = generatePin();

            try {
                // Determine host ID if available, otherwise just use a placeholder
                const hostId = currentUser?.id || "00000000-0000-0000-0000-000000000000";
                await createSessionMutation.mutateAsync({
                    topicId: topicId || "",
                    hostId: hostId,
                    mode: "GROUP",
                    category: (category || "mixed").toUpperCase(),
                    pin: pin
                });

                // Immediately navigate to the GroupChallenge lobby instead of a local step,
                // so the host can see players joining real-time.
                navigate(`/grade/${gradeId}/subject/${subjectId}/topic/${topicId}/challenge/group/${category}/${pin}?host=true&creator=true&name=${encodeURIComponent(currentUser?.name || t("challengeMode.hostNameFallback"))}`);
            } catch (error: any) {
                console.error("Failed to pre-create session", error);
                alert(`${t("challengeMode.errorPrefix")} ${error.message || JSON.stringify(error)}`);
            } finally {
                setIsCreating(false);
            }
        }
    };

    const handleStartGroupChallenge = async () => {
        if (!playerName.trim() || !currentUser?.id) return;

        // Session is already created in DB, so we just navigate to it.
        // GroupChallenge.tsx will handle changing the phase from lobby to playing.
        navigate(`/grade/${gradeId}/subject/${subjectId}/topic/${topicId}/challenge/group/${selectedCategory}/${groupPin}?host=true&creator=true&name=${encodeURIComponent(playerName)}`);
    };

    const handleCopyPin = () => {
        navigator.clipboard.writeText(groupPin);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(generateShareLink(groupPin));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen font-cairo bg-gradient-to-b from-background via-background to-primary/5" dir={dir}>
            <Header />
            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4">
                    {/* Breadcrumb */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <Link
                            to={`/grade/${gradeId}/subject/${subjectId}/topic/${topicId}`}
                            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ChevronIcon className="w-4 h-4" />
                            <span>{t("challengeMode.backToTopic")}</span>
                        </Link>
                    </motion.div>

                    {/* Content Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary mb-4">
                            <Trophy className="w-5 h-5" />
                            <span className="font-medium">{t("challengeMode.joinChallenge")}</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black mb-3">{topic.title}</h1>
                        <p className="text-muted-foreground max-w-xl mx-auto">{topic.description}</p>
                    </motion.div>

                    <AnimatePresence mode="wait">
                        {/* Step 1: Mode Selection */}
                        {step === "mode" && (
                            <motion.div
                                key="mode"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="max-w-3xl mx-auto"
                            >
                                <h2 className="text-2xl font-bold text-center mb-8">{t("challengeMode.chooseType")}</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Single Player */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleModeSelect("single")}
                                        className="relative overflow-hidden"
                                    >
                                        <Card className="p-8 text-center h-full border-2 hover:border-primary transition-all group cursor-pointer">
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
                                            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                                                <User className="w-10 h-10 text-white" />
                                            </div>
                                            <h3 className="text-2xl font-bold mb-3">{t("challengeMode.singleTitle")}</h3>
                                            <p className="text-muted-foreground mb-4">
                                                {t("challengeMode.singleDesc")}
                                            </p>
                                            <div className="flex flex-wrap justify-center gap-2">
                                                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-sm">
                                                    {t("challengeMode.singleTag1")}
                                                </span>
                                                <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 text-sm">
                                                    {t("challengeMode.singleTag2")}
                                                </span>
                                            </div>
                                        </Card>
                                    </motion.button>

                                    {/* Group Challenge */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleModeSelect("group")}
                                        className="relative overflow-hidden"
                                    >
                                        <Card className="p-8 text-center h-full border-2 hover:border-primary transition-all group cursor-pointer">
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
                                            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                                                <Users className="w-10 h-10 text-white" />
                                            </div>
                                            <h3 className="text-2xl font-bold mb-3">{t("challengeMode.groupTitle")}</h3>
                                            <p className="text-muted-foreground mb-4">
                                                {t("challengeMode.groupDesc")}
                                            </p>
                                            <div className="flex flex-wrap justify-center gap-2">
                                                <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 text-sm">
                                                    {t("challengeMode.groupTag1")}
                                                </span>
                                                <span className="px-3 py-1 rounded-full bg-pink-500/10 text-pink-600 text-sm">
                                                    {t("challengeMode.groupTag2")}
                                                </span>
                                            </div>
                                        </Card>
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Category Selection */}
                        {step === "category" && (
                            <motion.div
                                key="category"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="max-w-4xl mx-auto"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <Button variant="ghost" onClick={() => setStep("mode")} className="gap-2">
                                        <ChevronIcon className="w-4 h-4" />
                                        {t("common.back")}
                                    </Button>
                                    <h2 className="text-2xl font-bold">{t("challengeMode.chooseActivities")}</h2>
                                    <div className="w-20" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Interactive Activities */}
                                    <motion.button
                                        whileHover={{ scale: 1.02, y: -5 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleCategorySelect("activities")}
                                        className="group"
                                    >
                                        <Card className="p-6 text-center h-full border-2 hover:border-amber-500 transition-all overflow-hidden relative">
                                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                                            <div className="relative">
                                                <div className="text-6xl mb-4">💡</div>
                                                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4 shadow-lg">
                                                    <BrainCircuit className="w-8 h-8 text-white" />
                                                </div>
                                                <h3 className="text-xl font-bold mb-2">{categoryLabels.activities.name}</h3>
                                                <p className="text-sm text-muted-foreground mb-4">
                                                    {categoryLabels.activities.description}
                                                </p>
                                                <div className="space-y-1 text-xs text-muted-foreground">
                                                    <div>{t("challengeMode.activitiesItem1")}</div>
                                                    <div>{t("challengeMode.activitiesItem2")}</div>
                                                    <div>{t("challengeMode.activitiesItem3")}</div>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.button>

                                    {/* Educational Games */}
                                    <motion.button
                                        whileHover={{ scale: 1.02, y: -5 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleCategorySelect("games")}
                                        className="group"
                                    >
                                        <Card className="p-6 text-center h-full border-2 hover:border-emerald-500 transition-all overflow-hidden relative">
                                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-teal-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                                            <div className="relative">
                                                <div className="text-6xl mb-4">🎮</div>
                                                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-4 shadow-lg">
                                                    <Gamepad2 className="w-8 h-8 text-white" />
                                                </div>
                                                <h3 className="text-xl font-bold mb-2">{categoryLabels.games.name}</h3>
                                                <p className="text-sm text-muted-foreground mb-4">
                                                    {categoryLabels.games.description}
                                                </p>
                                                <div className="space-y-1 text-xs text-muted-foreground">
                                                    <div>{t("challengeMode.gamesItem1")}</div>
                                                    <div>{t("challengeMode.gamesItem2")}</div>
                                                    <div>{t("challengeMode.gamesItem3")}</div>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.button>

                                    {/* Mixed */}
                                    <motion.button
                                        whileHover={{ scale: 1.02, y: -5 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleCategorySelect("mixed")}
                                        className="group"
                                    >
                                        <Card className="p-6 text-center h-full border-2 hover:border-violet-500 transition-all overflow-hidden relative">
                                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-violet-400/20 to-purple-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                                            <div className="relative">
                                                <div className="text-6xl mb-4">🎯</div>
                                                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center mb-4 shadow-lg">
                                                    <Shuffle className="w-8 h-8 text-white" />
                                                </div>
                                                <h3 className="text-xl font-bold mb-2">{categoryLabels.mixed.name}</h3>
                                                <p className="text-sm text-muted-foreground mb-4">
                                                    {categoryLabels.mixed.description}
                                                </p>
                                                <div className="space-y-1 text-xs text-muted-foreground">
                                                    <div>{t("challengeMode.mixedItem1")}</div>
                                                    <div>{t("challengeMode.mixedItem2")}</div>
                                                    <div>{t("challengeMode.mixedItem3")}</div>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default ChallengeModeSelect;

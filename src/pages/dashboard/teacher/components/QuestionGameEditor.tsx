import { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useSound } from "@/hooks/useSound";
import {
    resolveWheelSpinSoundOverride,
    WHEEL_SPIN_DURATION_MS,
    WHEEL_SPIN_DURATION_SEC,
    WHEEL_SPIN_EASE,
} from "@/lib/wheelSpinSounds";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Plus, X, Save, Trash2, ChevronUp, ChevronDown,
    HelpCircle, Gamepad2, CheckCircle, XCircle,
    Clock, Star, Sparkles, ListOrdered, ArrowLeftRight, Volume2,
    Target, CircleDot, RotateCcw, Wand2, Database, FileUp, AlertTriangle, GripVertical,
} from "lucide-react";
import { QuestionAttachmentField } from "./QuestionAttachmentField";
import type { QuestionAttachmentValue } from "./QuestionAttachmentField";
import type { ActivityType, GameType, ChallengeQuestion, ContentMedia } from "@/data/challengeTypes";
import { AUTO_TIME_LIMIT_SECONDS, hasAutoTimeLimit } from "@/data/challengeTypes";
import AIQuestionGenerator from "./AIQuestionGenerator";
import AIQuestionGeneratorFromResources from "./AIQuestionGeneratorFromResources";
import { useDashboardLocale } from "@/contexts/LanguageContext";
import type { TFunction } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import UnsavedQuestionsDialog from "./UnsavedQuestionsDialog";
import { normalizeChallengeQuestionFields } from "@/lib/challengeItemNormalize";
import { getChallengeTypeStyle } from "@/lib/challengeTypeStyles";

type ItemCategory = "activity" | "game";
type AIMode = "upload" | "resources" | null;

interface QuestionGameEditorProps {
    items: ChallengeQuestion[];
    onSave: (items: ChallengeQuestion[]) => void;
    onCancel: () => void;
    media?: ContentMedia[];
    isExamMode?: boolean;
    /** Custom wheel spin SFX from lesson sound settings (ContentEditor). */
    wheelSpinSoundUrl?: string;
    /** Parent calls this before closing (dialog overlay, tab switch, etc.). */
    registerCloseGuard?: (tryClose: (onProceed: () => void, intent?: "cancel" | "external") => void) => void;
    onDirtyChange?: (dirty: boolean) => void;
}

export type QuestionGameEditorHandle = {
    getItems: () => ChallengeQuestion[];
    resetDirtyBaseline: () => void;
};

const serializeChallengeItems = (items: ChallengeQuestion[]) => JSON.stringify(items);

const getCorrectAnswerIndex = (correctAnswer: ChallengeQuestion["correctAnswer"]): number => {
    if (typeof correctAnswer === "number" && !Number.isNaN(correctAnswer)) return correctAnswer;
    if (typeof correctAnswer === "string") {
        const parsed = Number(correctAnswer);
        if (!Number.isNaN(parsed)) return parsed;
    }
    return 0;
};

const getActivityTypes = (t: TFunction) => [
    { type: "multiple_choice" as const, label: t("dash.teacher.topics.qe.multipleChoice"), icon: CheckCircle, description: t("dash.teacher.topics.qe.multipleChoiceDesc") },
    { type: "true_false" as const, label: t("dash.teacher.topics.qe.trueFalse"), icon: XCircle, description: t("dash.teacher.topics.qe.trueFalseDesc") },
    { type: "qa" as const, label: t("dash.teacher.topics.qe.qa"), icon: HelpCircle, description: t("dash.teacher.topics.qe.qaDesc") },
    { type: "know_dont_know" as const, label: t("dash.teacher.topics.qe.knowDontKnow"), icon: CircleDot, description: t("dash.teacher.topics.qe.knowDontKnowDesc") },
    { type: "order_questions" as const, label: t("dash.teacher.topics.qe.orderQuestions"), icon: ListOrdered, description: t("dash.teacher.topics.qe.orderQuestionsDesc") },
];

const getGameTypes = (t: TFunction) => [
    { type: "matching" as const, label: t("dash.teacher.topics.qe.matching"), icon: ArrowLeftRight, description: t("dash.teacher.topics.qe.matchingDesc") },
    { type: "shooting" as const, label: t("dash.teacher.topics.qe.shooting"), icon: Target, description: t("dash.teacher.topics.qe.shootingDesc") },
    { type: "wheel_spin" as const, label: t("dash.teacher.topics.qe.wheelSpin"), icon: RotateCcw, description: t("dash.teacher.topics.qe.wheelSpinDesc") },
    { type: "puzzle" as const, label: t("dash.teacher.topics.qe.puzzle"), icon: Sparkles, description: t("dash.teacher.topics.qe.puzzleDesc") },
];

const getDefaultItem = (type: ActivityType | GameType, t: TFunction): Partial<ChallengeQuestion> => {
    const baseItem = {
        id: Date.now(),
        type,
        question: "",
        points: 100,
        timeLimit: 20,
        explanation: "",
    };

    const option = (n: number) => t("dash.teacher.topics.qe.optionShortN", { n });

    switch (type) {
        case "multiple_choice":
            return { ...baseItem, options: ["", "", "", ""], correctAnswer: 0, timeLimit: AUTO_TIME_LIMIT_SECONDS };
        case "true_false":
            return { ...baseItem, options: [t("dash.teacher.topics.qe.trueLabel"), t("dash.teacher.topics.qe.falseLabel")], correctAnswer: 0, timeLimit: AUTO_TIME_LIMIT_SECONDS };
        case "qa":
            return { ...baseItem, correctAnswer: "", timeLimit: 30 };
        case "know_dont_know":
            return { ...baseItem, correctAnswer: "", timeLimit: 25 };
        case "order_questions":
            return { ...baseItem, orderItems: ["", "", "", ""], timeLimit: 45, points: 150 };
        case "matching":
            return {
                ...baseItem,
                pairs: [
                    { left: "", right: "" },
                    { left: "", right: "" },
                    { left: "", right: "" },
                    { left: "", right: "" }
                ],
                timeLimit: 60,
                points: 200
            };
        case "shooting":
            return { ...baseItem, options: ["", "", "", ""], correctAnswer: 0, timeLimit: AUTO_TIME_LIMIT_SECONDS, points: 150 };
        case "wheel_spin":
            return {
                ...baseItem,
                wheelSegments: [
                    { label: t("dash.teacher.topics.qe.difficulty.easy"), points: 50, question: t("dash.teacher.topics.qe.default.easyQuestion"), options: [option(1), option(2), option(3), option(4)], correctAnswer: 0 },
                    { label: t("dash.teacher.topics.qe.difficulty.medium"), points: 100, question: t("dash.teacher.topics.qe.default.mediumQuestion"), options: [option(1), option(2), option(3), option(4)], correctAnswer: 0 },
                    { label: t("dash.teacher.topics.qe.difficulty.hard"), points: 200, question: t("dash.teacher.topics.qe.default.hardQuestion"), options: [option(1), option(2), option(3), option(4)], correctAnswer: 0 },
                    { label: t("dash.teacher.topics.qe.difficulty.bonus"), points: 300, question: t("dash.teacher.topics.qe.default.bonusQuestion"), options: [option(1), option(2), option(3), option(4)], correctAnswer: 0 },
                    { label: t("dash.teacher.topics.qe.difficulty.legendary"), points: 500, question: t("dash.teacher.topics.qe.default.legendaryQuestion"), options: [option(1), option(2), option(3), option(4)], correctAnswer: 0 }
                ],
                timeLimit: 30,
                points: 100
            };
        case "puzzle":
            return { ...baseItem, options: ["", "", "", ""], correctAnswer: "", timeLimit: 45, points: 200 };
        default:
            return baseItem;
    }
};

const QuestionGameEditor = forwardRef<QuestionGameEditorHandle, QuestionGameEditorProps>(function QuestionGameEditor(
    { items, onSave, onCancel, media = [], isExamMode = false, wheelSpinSoundUrl = "", registerCloseGuard, onDirtyChange },
    ref
) {
    const { t, dir, isRtl, textAlign } = useDashboardLocale();
    const { toast } = useToast();
    const [questionItems, setQuestionItems] = useState<ChallengeQuestion[]>(items);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<ItemCategory | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [aiMode, setAIMode] = useState<AIMode>(null);
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const pendingProceedRef = useRef<(() => void) | null>(null);
    const closeIntentRef = useRef<"cancel" | "external">("cancel");
    const savedSnapshotRef = useRef(serializeChallengeItems(items));

    const activityTypes = useMemo(() => getActivityTypes(t), [t]);
    const gameTypes = useMemo(() => getGameTypes(t), [t]);

    const isDirty = useMemo(
        () => serializeChallengeItems(questionItems) !== savedSnapshotRef.current,
        [questionItems]
    );

    useEffect(() => {
        if (isDirty) return;
        savedSnapshotRef.current = serializeChallengeItems(items);
        setQuestionItems(items);
    }, [items, isDirty]);

    useEffect(() => {
        onDirtyChange?.(isDirty);
    }, [isDirty, onDirtyChange]);

    useImperativeHandle(ref, () => ({
        getItems: () => questionItems,
        resetDirtyBaseline: () => {
            savedSnapshotRef.current = serializeChallengeItems(questionItems);
        },
    }), [questionItems]);

    const remindToSave = useCallback(() => {
        toast({
            title: t("dash.teacher.topics.qe.toastAddedReminderTitle"),
            description: t("dash.teacher.topics.qe.toastAddedReminderDesc"),
        });
    }, [toast, t]);

    const requestClose = useCallback((onProceed: () => void, intent: "cancel" | "external" = "cancel") => {
        if (!isDirty) {
            onProceed();
            return;
        }
        closeIntentRef.current = intent;
        pendingProceedRef.current = onProceed;
        setShowUnsavedDialog(true);
    }, [isDirty]);

    useLayoutEffect(() => {
        registerCloseGuard?.(requestClose);
    }, [registerCloseGuard, requestClose]);

    const handleConfirmSave = () => {
        setShowUnsavedDialog(false);
        const proceed = pendingProceedRef.current;
        const intent = closeIntentRef.current;
        pendingProceedRef.current = null;
        const preparedItems = questionItems.map(
            (item) => normalizeChallengeQuestionFields({ ...item }) as ChallengeQuestion
        );
        savedSnapshotRef.current = serializeChallengeItems(preparedItems);
        onSave(preparedItems);
        if (intent === "external" && !isExamMode) {
            proceed?.();
        }
    };

    const handleConfirmDiscard = () => {
        setShowUnsavedDialog(false);
        const proceed = pendingProceedRef.current;
        const intent = closeIntentRef.current;
        pendingProceedRef.current = null;
        if (intent === "cancel") {
            onCancel();
        } else {
            proceed?.();
        }
    };

    const handleStayEditing = () => {
        setShowUnsavedDialog(false);
        pendingProceedRef.current = null;
    };

    const handleAIGenerate = (generatedQuestions: ChallengeQuestion[]) => {
        setQuestionItems((prev) => [
            ...prev,
            ...generatedQuestions.map(
                (q) => normalizeChallengeQuestionFields({ ...q }) as ChallengeQuestion
            ),
        ]);
        setAIMode(null);
        remindToSave();
    };

    const handleAddItem = (type: ActivityType | GameType) => {
        const newItem = getDefaultItem(type, t) as ChallengeQuestion;
        newItem.id = Date.now();
        setQuestionItems((prev) => {
            setEditingIndex(prev.length);
            return [...prev, newItem];
        });
        setShowAddDialog(false);
        setSelectedCategory(null);
    };

    const updateItem = (index: number, updates: Partial<ChallengeQuestion>) => {
        const newItems = [...questionItems];
        newItems[index] = { ...newItems[index], ...updates };
        setQuestionItems(newItems);
    };

    const deleteItem = (index: number) => {
        setQuestionItems(questionItems.filter((_, i) => i !== index));
        if (editingIndex === index) setEditingIndex(null);
    };

    const moveItem = (index: number, direction: "up" | "down") => {
        if (direction === "up" && index > 0) {
            const newItems = [...questionItems];
            [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
            setQuestionItems(newItems);
        } else if (direction === "down" && index < questionItems.length - 1) {
            const newItems = [...questionItems];
            [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
            setQuestionItems(newItems);
        }
    };

    const getTypeLabel = (type: ActivityType | GameType): string => {
        const activity = activityTypes.find(a => a.type === type);
        if (activity) return activity.label;
        const game = gameTypes.find(g => g.type === type);
        return game?.label || type;
    };

    const getTypeIcon = (type: ActivityType | GameType) => {
        const activity = activityTypes.find(a => a.type === type);
        if (activity) return activity.icon;
        const game = gameTypes.find(g => g.type === type);
        return game?.icon || HelpCircle;
    };

    const allowedActivityTypes = isExamMode
        ? activityTypes.filter(a => ["multiple_choice", "true_false", "order_questions"].includes(a.type))
        : activityTypes;

    return (
        <div className="space-y-6" dir={dir}>
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Gamepad2 className="w-6 h-6 text-primary" />
                    {t("dash.teacher.topics.qe.title")}
                    <span className="text-sm font-normal text-muted-foreground">
                        {t("dash.teacher.topics.qe.itemCount", { n: questionItems.length })}
                    </span>
                </h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => requestClose(onCancel)} className="gap-2">
                        <X className="w-4 h-4 shrink-0" />
                        {t("dash.common.cancel")}
                    </Button>
                    <Button
                        onClick={() => {
                            const preparedItems = questionItems.map(
                                (item) => normalizeChallengeQuestionFields({ ...item }) as ChallengeQuestion
                            );
                            savedSnapshotRef.current = serializeChallengeItems(preparedItems);
                            onSave(preparedItems);
                        }}
                        className="gap-2"
                    >
                        <Save className="w-4 h-4 shrink-0" />
                        {t("dash.teacher.topics.qe.saveAll")}
                    </Button>
                </div>
            </div>

            {isDirty && (
                <div
                    role="status"
                    className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100 flex items-start gap-2"
                >
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <span>{t("dash.teacher.topics.qe.unsavedBanner")}</span>
                </div>
            )}

            <UnsavedQuestionsDialog
                open={showUnsavedDialog}
                onSave={handleConfirmSave}
                onDiscard={handleConfirmDiscard}
                onStay={handleStayEditing}
            />

            {aiMode === null ? (
                <Card dir={dir} className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-blue-500/5">
                    <CardContent className="p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                                    <Wand2 className="w-5 h-5 text-purple-500" />
                                </div>
                                <div className={cn("min-w-0", textAlign)}>
                                    <h3 className="font-bold">{t("dash.teacher.topics.qe.aiTitle")}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {t("dash.teacher.topics.qe.aiDesc")}
                                    </p>
                                </div>
                            </div>
                            <div className={cn("flex flex-wrap gap-2", isRtl ? "justify-start" : "justify-end")}>
                                {media.length > 0 && (
                                    <Button
                                        onClick={() => setAIMode("resources")}
                                        className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                                    >
                                        <Database className="w-4 h-4" />
                                        {t("dash.teacher.topics.qe.fromResources", { n: media.length })}
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={() => setAIMode("upload")}
                                    className="gap-2 border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/10"
                                >
                                    <FileUp className="w-4 h-4" />
                                    {t("dash.teacher.topics.qe.uploadFiles")}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            <AnimatePresence>
                {aiMode === "upload" && (
                    <AIQuestionGenerator
                        onGenerate={handleAIGenerate}
                        onCancel={() => setAIMode(null)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {aiMode === "resources" && media.length > 0 && (
                    <AIQuestionGeneratorFromResources
                        media={media}
                        onGenerate={handleAIGenerate}
                        onCancel={() => setAIMode(null)}
                    />
                )}
            </AnimatePresence>

            <Button
                onClick={() => {
                    setShowAddDialog(true);
                    if (isExamMode) setSelectedCategory("activity");
                }}
                variant="outline"
                className="w-full border-dashed border-2 h-16 text-lg gap-2"
            >
                <Plus className="w-5 h-5" />
                {isExamMode ? t("dash.teacher.topics.qe.addQuestion") : t("dash.teacher.topics.qe.addQuestionOrGame")}
            </Button>

            <AnimatePresence>
                {showAddDialog && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-secondary/5">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>{t("dash.teacher.topics.qe.addNewItem")}</span>
                                    <Button variant="ghost" size="icon" onClick={() => {
                                        setShowAddDialog(false);
                                        setSelectedCategory(null);
                                    }}>
                                        <X className="w-5 h-5" />
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {!selectedCategory ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setSelectedCategory("activity")}
                                            className="p-6 rounded-xl border-2 border-primary/30 hover:border-primary bg-background text-center transition-all"
                                        >
                                            <HelpCircle className="w-12 h-12 mx-auto mb-3 text-primary" />
                                            <h3 className="text-lg font-bold mb-1">{t("dash.teacher.topics.qe.activityCategory")}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {t("dash.teacher.topics.qe.activityHint")}
                                            </p>
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setSelectedCategory("game")}
                                            className="p-6 rounded-xl border-2 border-secondary/30 hover:border-secondary bg-background text-center transition-all"
                                        >
                                            <Gamepad2 className="w-12 h-12 mx-auto mb-3 text-secondary" />
                                            <h3 className="text-lg font-bold mb-1">{t("dash.teacher.topics.qe.gameCategory")}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {t("dash.teacher.topics.qe.gameHint")}
                                            </p>
                                        </motion.button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {!isExamMode && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedCategory(null)}
                                                className="mb-2"
                                            >
                                                {t("dash.teacher.topics.qe.back")}
                                            </Button>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {(selectedCategory === "activity" ? allowedActivityTypes : gameTypes).map((item) => {
                                                const typeStyle = getChallengeTypeStyle(item.type);
                                                return (
                                                <motion.button
                                                    key={item.type}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => handleAddItem(item.type)}
                                                    className={cn(
                                                        "p-4 rounded-xl border-2 text-right transition-all flex items-start gap-3",
                                                        typeStyle.pickerBorder,
                                                        typeStyle.pickerHover
                                                    )}
                                                >
                                                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", typeStyle.iconBg)}>
                                                        <item.icon className={cn("w-5 h-5", typeStyle.icon)} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold">{item.label}</h4>
                                                        <p className="text-xs text-muted-foreground">{item.description}</p>
                                                    </div>
                                                </motion.button>
                                            );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-4">
                {questionItems.map((item, index) => {
                    const TypeIcon = getTypeIcon(item.type);
                    const isEditing = editingIndex === index;
                    const typeStyle = getChallengeTypeStyle(item.type);

                    return (
                        <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className={cn(
                                "overflow-hidden transition-all",
                                typeStyle.border,
                                isEditing && cn("ring-2", typeStyle.ring)
                            )}>
                                <CardContent className="p-0">
                                    <div
                                        className={cn("p-4 flex items-center gap-4 cursor-pointer", typeStyle.headerBg)}
                                        onClick={() => setEditingIndex(isEditing ? null : index)}
                                    >
                                        <div className="flex flex-col gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={(e) => { e.stopPropagation(); moveItem(index, "up"); }}
                                                disabled={index === 0}
                                            >
                                                <ChevronUp className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={(e) => { e.stopPropagation(); moveItem(index, "down"); }}
                                                disabled={index === questionItems.length - 1}
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm", typeStyle.indexBadge)}>
                                            {index + 1}
                                        </span>

                                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", typeStyle.iconBg)}>
                                            <TypeIcon className={cn("w-5 h-5", typeStyle.icon)} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={cn("text-xs px-2 py-0.5 rounded font-medium", typeStyle.badge)}>
                                                    {getTypeLabel(item.type)}
                                                </span>
                                                {!isExamMode && (
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {t("dash.teacher.topics.qe.secondsShort", {
                                                            n: hasAutoTimeLimit(item.type) ? AUTO_TIME_LIMIT_SECONDS : (item.timeLimit ?? 0),
                                                        })}
                                                    </span>
                                                )}
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Star className="w-3 h-3" />
                                                    {t("dash.teacher.topics.qe.pointsShort", { n: item.points ?? 0 })}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium truncate">
                                                {item.question || t("dash.teacher.topics.qe.noTitle")}
                                            </p>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            onClick={(e) => { e.stopPropagation(); deleteItem(index); }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <AnimatePresence>
                                        {isEditing && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="p-4 border-t space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div className="md:col-span-2">
                                                            <label className="text-sm font-medium mb-2 block">
                                                                {item.type === "wheel_spin" ? t("dash.teacher.topics.qe.wheelTitle") : t("dash.teacher.topics.qe.questionTitle")} *
                                                            </label>
                                                            <Input
                                                                value={item.question}
                                                                onChange={(e) => updateItem(index, { question: e.target.value })}
                                                                placeholder={t("dash.teacher.topics.qe.questionPlaceholder")}
                                                            />
                                                        </div>
                                                        <div className={`grid ${isExamMode ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                                                            {!isExamMode && (
                                                                <div>
                                                                    <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                                                                        <Clock className="w-3 h-3" />
                                                                        {t("dash.teacher.topics.qe.timeSeconds")}
                                                                    </label>
                                                                    {hasAutoTimeLimit(item.type) ? (
                                                                        <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                                                                            {t("dash.teacher.topics.qe.secondsShort", { n: AUTO_TIME_LIMIT_SECONDS })}
                                                                            <span className="ms-2 text-xs">({t("dash.teacher.topics.qe.timeAuto")})</span>
                                                                        </div>
                                                                    ) : (
                                                                        <Input
                                                                            type="number"
                                                                            value={item.timeLimit}
                                                                            onChange={(e) => updateItem(index, { timeLimit: parseInt(e.target.value) || 20 })}
                                                                            min={5}
                                                                            max={120}
                                                                        />
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                                                                    <Star className="w-3 h-3" />
                                                                    {t("dash.teacher.topics.qe.points")}
                                                                </label>
                                                                <Input
                                                                    type="number"
                                                                    value={item.points}
                                                                    onChange={(e) => updateItem(index, { points: parseInt(e.target.value) || 100 })}
                                                                    min={10}
                                                                    step={10}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {item.type !== "wheel_spin" && (
                                                        <QuestionAttachmentField
                                                            key={item.id}
                                                            value={{
                                                                imageUrl: item.imageUrl,
                                                                videoUrl: item.videoUrl,
                                                                audioUrl: item.audioUrl,
                                                            }}
                                                            onChange={(attachment) =>
                                                                updateItem(index, {
                                                                    imageUrl: attachment.imageUrl,
                                                                    videoUrl: attachment.videoUrl,
                                                                    audioUrl: attachment.audioUrl,
                                                                })
                                                            }
                                                        />
                                                    )}

                                                    {renderTypeSpecificFields(item, index, updateItem, wheelSpinSoundUrl)}

                                                    <div>
                                                        <label className="text-sm font-medium mb-2 block">{t("dash.teacher.topics.qe.explanationOptional")}</label>
                                                        <Textarea
                                                            value={item.explanation || ""}
                                                            onChange={(e) => updateItem(index, { explanation: e.target.value })}
                                                            placeholder={t("dash.teacher.topics.qe.explanationPlaceholder")}
                                                            rows={2}
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}

                {questionItems.length === 0 && !showAddDialog && (
                    <Card className="p-12 text-center">
                        <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                        <h3 className="text-xl font-bold mb-2">{t("dash.teacher.topics.qe.emptyTitle")}</h3>
                        <p className="text-muted-foreground mb-4">{t("dash.teacher.topics.qe.emptyDesc")}</p>
                        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                            <Plus className="w-4 h-4" />
                            {t("dash.teacher.topics.qe.addNewItem")}
                        </Button>
                    </Card>
                )}
            </div>
        </div>
    );
});

const renderTypeSpecificFields = (
    item: ChallengeQuestion,
    index: number,
    updateItem: (index: number, updates: Partial<ChallengeQuestion>) => void,
    wheelSpinSoundUrl?: string
) => {
    switch (item.type) {
        case "multiple_choice":
            return <MultipleChoiceFields item={item} index={index} updateItem={updateItem} />;
        case "true_false":
            return <TrueFalseFields item={item} index={index} updateItem={updateItem} />;
        case "qa":
        case "know_dont_know":
            return <OpenAnswerFields item={item} index={index} updateItem={updateItem} />;
        case "order_questions":
            return <OrderQuestionsFields item={item} index={index} updateItem={updateItem} />;
        case "matching":
            return <MatchingFields item={item} index={index} updateItem={updateItem} />;
        case "shooting":
            return <ShootingFields item={item} index={index} updateItem={updateItem} />;
        case "wheel_spin":
            return <WheelSpinFields item={item} index={index} updateItem={updateItem} wheelSpinSoundUrl={wheelSpinSoundUrl} />;
        case "puzzle":
            return <PuzzleFields item={item} index={index} updateItem={updateItem} />;
        default:
            return null;
    }
};

interface FieldProps {
    item: ChallengeQuestion;
    index: number;
    updateItem: (index: number, updates: Partial<ChallengeQuestion>) => void;
}

const MultipleChoiceFields = ({ item, index, updateItem }: FieldProps) => {
    const { t } = useDashboardLocale();
    const correctIndex = getCorrectAnswerIndex(item.correctAnswer);
    return (
        <div>
            <label className="text-sm font-medium mb-2 block">{t("dash.teacher.topics.qe.optionsClickCorrect")}</label>
            <div className="space-y-2">
                {(item.options || []).map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant={correctIndex === i ? "default" : "outline"}
                            size="icon"
                            className="h-9 w-9 flex-shrink-0"
                            onClick={() => updateItem(index, { correctAnswer: i })}
                        >
                            {correctIndex === i ? <CheckCircle className="w-4 h-4" /> : i + 1}
                        </Button>
                        <Input
                            value={opt}
                            onChange={(e) => {
                                const opts = [...(item.options || [])];
                                opts[i] = e.target.value;
                                updateItem(index, { options: opts });
                            }}
                            placeholder={t("dash.teacher.topics.qe.optionN", { n: i + 1 })}
                            className={correctIndex === i ? "border-primary" : ""}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

const TrueFalseFields = ({ item, index, updateItem }: FieldProps) => {
    const { t } = useDashboardLocale();
    const correctIndex = getCorrectAnswerIndex(item.correctAnswer);
    return (
        <div>
            <label className="text-sm font-medium mb-2 block">{t("dash.teacher.topics.qe.correctAnswer")}</label>
            <div className="flex gap-4">
                <Button
                    type="button"
                    variant={correctIndex === 0 ? "default" : "outline"}
                    className="flex-1 h-12 text-lg gap-2"
                    onClick={() => updateItem(index, { correctAnswer: 0 })}
                >
                    <CheckCircle className="w-5 h-5" />
                    {t("dash.teacher.topics.qe.trueLabel")}
                </Button>
                <Button
                    type="button"
                    variant={correctIndex === 1 ? "default" : "outline"}
                    className="flex-1 h-12 text-lg gap-2"
                    onClick={() => updateItem(index, { correctAnswer: 1 })}
                >
                    <XCircle className="w-5 h-5" />
                    {t("dash.teacher.topics.qe.falseLabel")}
                </Button>
            </div>
        </div>
    );
};

const OpenAnswerFields = ({ item, index, updateItem }: FieldProps) => {
    const { t } = useDashboardLocale();
    return (
        <div>
            <label className="text-sm font-medium mb-2 block">
                {item.type === "know_dont_know" ? t("dash.teacher.topics.qe.knowAnswer") : t("dash.teacher.topics.qe.expectedAnswer")}
            </label>
            <Textarea
                value={String(item.correctAnswer || "")}
                onChange={(e) => updateItem(index, { correctAnswer: e.target.value })}
                placeholder={t("dash.teacher.topics.qe.answerPlaceholder")}
                rows={2}
            />
        </div>
    );
};

type OrderItemRow = { id: string; text: string };

const stopOrderRowDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
};

const OrderQuestionsFields = ({ item, index, updateItem }: FieldProps) => {
    const { t } = useDashboardLocale();
    const orderItems = item.orderItems || [];
    const rowKeysRef = useRef<string[]>([]);

    while (rowKeysRef.current.length < orderItems.length) {
        rowKeysRef.current.push(`order-row-${index}-${rowKeysRef.current.length}-${crypto.randomUUID()}`);
    }
    if (rowKeysRef.current.length > orderItems.length) {
        rowKeysRef.current.splice(orderItems.length);
    }

    const rows: OrderItemRow[] = orderItems.map((text, i) => ({
        id: rowKeysRef.current[i],
        text,
    }));

    const syncOrderItems = (nextRows: OrderItemRow[]) => {
        rowKeysRef.current = nextRows.map((row) => row.id);
        updateItem(index, { orderItems: nextRows.map((row) => row.text) });
    };

    const addOrderItem = () => {
        syncOrderItems([...rows, { id: `order-row-${index}-${rows.length}-${crypto.randomUUID()}`, text: "" }]);
    };

    const removeOrderItem = (rowId: string) => {
        if (rows.length <= 2) return;
        syncOrderItems(rows.filter((row) => row.id !== rowId));
    };

    const updateRowText = (rowId: string, text: string) => {
        syncOrderItems(rows.map((row) => (row.id === rowId ? { ...row, text } : row)));
    };

    return (
        <div>
            <label className="text-sm font-medium mb-2 block">
                {t("dash.teacher.topics.qe.orderItemsLabel")}
            </label>
            <p className="text-xs text-muted-foreground mb-2">
                {t("dash.teacher.topics.qe.orderItemsDragHint")}
            </p>
            <Reorder.Group
                axis="y"
                values={rows}
                onReorder={syncOrderItems}
                className="space-y-2 list-none p-0 m-0"
            >
                {rows.map((row, i) => (
                    <Reorder.Item
                        key={row.id}
                        value={row}
                        className="list-none cursor-grab active:cursor-grabbing touch-none select-none"
                        whileDrag={{ scale: 1.02, zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", cursor: "grabbing" }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        aria-label={t("dash.teacher.topics.editor.dragResource")}
                    >
                        <div className="flex items-center gap-2 rounded-lg border bg-card p-2">
                            <GripVertical className="w-4 h-4 shrink-0 text-muted-foreground/50 pointer-events-none" />
                            <span className="w-8 h-8 rounded bg-muted flex items-center justify-center font-bold text-sm shrink-0">
                                {i + 1}
                            </span>
                            <Input
                                value={row.text}
                                onChange={(e) => updateRowText(row.id, e.target.value)}
                                onPointerDown={stopOrderRowDrag}
                                placeholder={t("dash.teacher.topics.qe.itemN", { n: i + 1 })}
                                className="cursor-text"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive shrink-0 cursor-pointer"
                                onClick={() => removeOrderItem(row.id)}
                                onPointerDown={stopOrderRowDrag}
                                disabled={rows.length <= 2}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </Reorder.Item>
                ))}
            </Reorder.Group>
            <Button variant="outline" size="sm" onClick={addOrderItem} className="gap-1 mt-2">
                <Plus className="w-4 h-4" />
                {t("dash.teacher.topics.qe.addItem")}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
                {t("dash.teacher.topics.qe.shuffleHint")}
            </p>
        </div>
    );
};

const MatchingFields = ({ item, index, updateItem }: FieldProps) => {
    const { t } = useDashboardLocale();
    const pairs = item.pairs || [];

    const addPair = () => {
        updateItem(index, { pairs: [...pairs, { left: "", right: "" }] });
    };

    const removePair = (i: number) => {
        updateItem(index, { pairs: pairs.filter((_, idx) => idx !== i) });
    };

    const updatePairSide = (i: number, side: "left" | "right", value: string) => {
        const newPairs = [...pairs];
        newPairs[i] = { ...newPairs[i], [side]: value };
        updateItem(index, { pairs: newPairs });
    };

    return (
        <div>
            <label className="text-sm font-medium mb-2 block">{t("dash.teacher.topics.qe.matchingPairs")}</label>
            <div className="space-y-2">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-center">
                    <span className="text-xs font-medium text-muted-foreground">
                        {t("dash.teacher.topics.qe.rightColumn")}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                        {t("dash.teacher.topics.qe.leftColumn")}
                    </span>
                    <span className="w-9" aria-hidden="true" />
                    {pairs.map((pair, i) => (
                        <div key={i} className="contents">
                            <Input
                                value={pair.left}
                                onChange={(e) => updatePairSide(i, "left", e.target.value)}
                                placeholder={t("dash.teacher.topics.qe.sourceN", { n: i + 1 })}
                                className="min-w-0"
                            />
                            <Input
                                value={pair.right}
                                onChange={(e) => updatePairSide(i, "right", e.target.value)}
                                placeholder={t("dash.teacher.topics.qe.matchN", { n: i + 1 })}
                                className="min-w-0"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive shrink-0"
                                onClick={() => removePair(i)}
                                disabled={pairs.length <= 2}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
                <Button variant="outline" size="sm" onClick={addPair} className="gap-1">
                    <Plus className="w-4 h-4" />
                    {t("dash.teacher.topics.qe.addPair")}
                </Button>
            </div>
        </div>
    );
};

const ShootingFields = ({ item, index, updateItem }: FieldProps) => {
    const { t } = useDashboardLocale();
    const correctIndex = getCorrectAnswerIndex(item.correctAnswer);
    return (
        <div>
            <label className="text-sm font-medium mb-2 block">
                {t("dash.teacher.topics.qe.shootingOptions")}
            </label>
            <div className="space-y-2">
                {(item.options || []).map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant={correctIndex === i ? "destructive" : "outline"}
                            size="icon"
                            className="h-9 w-9 flex-shrink-0"
                            onClick={() => updateItem(index, { correctAnswer: i })}
                        >
                            {correctIndex === i ? <Target className="w-4 h-4" /> : i + 1}
                        </Button>
                        <Input
                            value={opt}
                            onChange={(e) => {
                                const opts = [...(item.options || [])];
                                opts[i] = e.target.value;
                                updateItem(index, { options: opts });
                            }}
                            placeholder={t("dash.teacher.topics.qe.optionN", { n: i + 1 })}
                            className={correctIndex === i ? "border-destructive" : ""}
                        />
                    </div>
                ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
                {t("dash.teacher.topics.qe.shootingHint")}
            </p>
        </div>
    );
};

const WHEEL_SEGMENT_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"];

type WheelSegment = NonNullable<ChallengeQuestion["wheelSegments"]>[number];

const WheelSpinPreview = ({
    segments,
    wheelSpinSoundUrl,
}: {
    segments: WheelSegment[];
    wheelSpinSoundUrl?: string;
}) => {
    const { t } = useDashboardLocale();
    const [rotation, setRotation] = useState(0);
    const [isSpinning, setIsSpinning] = useState(false);
    const [resultIdx, setResultIdx] = useState<number | null>(null);

    const soundOverrides = useMemo(
        () => ({ wheel_spin: resolveWheelSpinSoundOverride(wheelSpinSoundUrl) }),
        [wheelSpinSoundUrl]
    );
    const { playWheelSpin } = useSound(true, soundOverrides);

    const labels = segments
        .map((s, i) => (s.label?.trim() ? s.label.trim() : t("dash.teacher.topics.qe.segmentN", { n: i + 1 })))
        .filter(Boolean);

    const handleSpin = () => {
        if (isSpinning || labels.length < 2) return;
        setIsSpinning(true);
        setResultIdx(null);
        playWheelSpin();

        const resultIndex = Math.floor(Math.random() * labels.length);
        const segmentAngle = 360 / labels.length;
        const spins = 4 + Math.floor(Math.random() * 2);
        const targetRotation = spins * 360 + (360 - resultIndex * segmentAngle - segmentAngle / 2);
        setRotation((prev) => prev + targetRotation);

        window.setTimeout(() => {
            setIsSpinning(false);
            setResultIdx(resultIndex);
        }, WHEEL_SPIN_DURATION_MS);
    };

    if (labels.length < 2) {
        return (
            <p className="text-xs text-muted-foreground rounded-lg border border-dashed p-3 text-center">
                {t("dash.teacher.topics.qe.wheelNeedSegments")}
            </p>
        );
    }

    const segmentAngle = 360 / labels.length;

    return (
        <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-secondary/5 p-4 space-y-3">
            <div className="flex items-start gap-2">
                <Volume2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-medium">{t("dash.teacher.topics.qe.wheelPreview")}</p>
                    <p className="text-xs text-muted-foreground">{t("dash.teacher.topics.qe.wheelPreviewDesc")}</p>
                </div>
            </div>

            <div className="flex flex-col items-center">
                <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
                        <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary" />
                    </div>
                    <motion.div
                        className="w-full h-full rounded-full overflow-hidden border-4 border-primary shadow-lg"
                        style={{ transformOrigin: "center center" }}
                        animate={{ rotate: rotation }}
                        transition={{ duration: WHEEL_SPIN_DURATION_SEC, ease: WHEEL_SPIN_EASE }}
                    >
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                            {labels.map((label, i) => {
                                const startAngle = i * segmentAngle - 90;
                                const endAngle = (i + 1) * segmentAngle - 90;
                                const largeArcFlag = segmentAngle > 180 ? 1 : 0;
                                const x1 = 50 + 50 * Math.cos((startAngle * Math.PI) / 180);
                                const y1 = 50 + 50 * Math.sin((startAngle * Math.PI) / 180);
                                const x2 = 50 + 50 * Math.cos((endAngle * Math.PI) / 180);
                                const y2 = 50 + 50 * Math.sin((endAngle * Math.PI) / 180);
                                const textAngle = startAngle + segmentAngle / 2;
                                const textX = 50 + 30 * Math.cos((textAngle * Math.PI) / 180);
                                const textY = 50 + 30 * Math.sin((textAngle * Math.PI) / 180);

                                return (
                                    <g key={i}>
                                        <path
                                            d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                                            fill={WHEEL_SEGMENT_COLORS[i % WHEEL_SEGMENT_COLORS.length]}
                                            stroke="white"
                                            strokeWidth="0.5"
                                        />
                                        <text
                                            x={textX}
                                            y={textY}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fill="white"
                                            fontSize="4"
                                            fontWeight="bold"
                                            transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                                        >
                                            {label.length > 10 ? `${label.substring(0, 10)}…` : label}
                                        </text>
                                    </g>
                                );
                            })}
                            <circle cx="50" cy="50" r="8" fill="white" stroke="#333" strokeWidth="0.5" />
                        </svg>
                    </motion.div>
                </div>

                {!isSpinning && (
                    <Button
                        type="button"
                        onClick={handleSpin}
                        size="sm"
                        className="mt-3 gap-2"
                        disabled={isSpinning}
                    >
                        <Sparkles className="w-4 h-4" />
                        {t("dash.teacher.topics.qe.spinWheel")}
                    </Button>
                )}

                {resultIdx !== null && !isSpinning && (
                    <p className="text-sm font-medium text-primary mt-2 animate-in fade-in">
                        {t("dash.teacher.topics.qe.wheelResult", { label: labels[resultIdx] })}
                    </p>
                )}
            </div>
        </div>
    );
};

const WheelSpinFields = ({ item, index, updateItem, wheelSpinSoundUrl }: FieldProps & { wheelSpinSoundUrl?: string }) => {
    const { t } = useDashboardLocale();
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    const segments = item.wheelSegments || (item.options?.map(opt => ({
        label: opt,
        points: 100,
        question: "",
        options: ["", "", "", ""],
        correctAnswer: 0
    })) || []);

    const addSegment = () => {
        updateItem(index, {
            wheelSegments: [...segments, {
                label: t("dash.teacher.topics.qe.newSegment"),
                points: 100,
                question: "",
                options: ["", "", "", ""],
                correctAnswer: 0
            }]
        });
    };

    const updateSegment = (sIndex: number, field: string, value: unknown) => {
        const newSegments = [...segments];
        newSegments[sIndex] = { ...newSegments[sIndex], [field]: value };
        updateItem(index, { wheelSegments: newSegments });
    };

    const updateSegmentOption = (sIndex: number, oIndex: number, value: string) => {
        const newSegments = [...segments];
        const opts = [...(newSegments[sIndex].options || ["", "", "", ""])];
        opts[oIndex] = value;
        newSegments[sIndex] = { ...newSegments[sIndex], options: opts };
        updateItem(index, { wheelSegments: newSegments });
    };

    const removeSegment = (i: number) => {
        updateItem(index, { wheelSegments: segments.filter((_, idx) => idx !== i) });
    };

    const updateSegmentAttachment = (sIndex: number, attachment: QuestionAttachmentValue) => {
        const newSegments = [...segments];
        newSegments[sIndex] = {
            ...newSegments[sIndex],
            imageUrl: attachment.imageUrl,
            videoUrl: attachment.videoUrl,
            audioUrl: attachment.audioUrl,
        };
        updateItem(index, { wheelSegments: newSegments });
    };

    return (
        <div className="space-y-4">
            <WheelSpinPreview segments={segments} wheelSpinSoundUrl={wheelSpinSoundUrl} />

            <div>
            <label className="text-sm font-medium mb-2 block">{t("dash.teacher.topics.qe.wheelSegments")}</label>
            <div className="space-y-3">
                {segments.map((segment, i) => {
                    const isExpanded = expandedIndex === i;
                    const segmentOptions = segment.options || ["", "", "", ""];

                    return (
                        <div key={i} className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpandedIndex(isExpanded ? null : i)}>
                                    <span className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white"
                                        style={{ backgroundColor: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"][i % 6] }}
                                    >
                                        {i + 1}
                                    </span>
                                    <span className="text-sm font-bold">{segment.label || t("dash.teacher.topics.qe.segmentN", { n: i + 1 })}</span>
                                    <span className="text-xs text-muted-foreground ml-2">({t("dash.teacher.topics.qe.pointsShort", { n: segment.points ?? 0 })})</span>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => setExpandedIndex(isExpanded ? null : i)}
                                    >
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive"
                                        onClick={() => removeSegment(i)}
                                        disabled={segments.length <= 2}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="space-y-3 mt-2 border-t pt-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1 block">{t("dash.teacher.topics.qe.segmentTitle")}</label>
                                            <Input
                                                value={segment.label}
                                                onChange={(e) => updateSegment(i, 'label', e.target.value)}
                                                placeholder={t("dash.teacher.topics.qe.segmentTitleExample")}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                                                <Star className="w-3 h-3" /> {t("dash.teacher.topics.qe.points")}
                                            </label>
                                            <Input
                                                type="number"
                                                value={segment.points}
                                                onChange={(e) => updateSegment(i, 'points', parseInt(e.target.value) || 0)}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">{t("dash.teacher.topics.qe.segmentQuestion")}</label>
                                        <Input
                                            value={segment.question}
                                            onChange={(e) => updateSegment(i, 'question', e.target.value)}
                                            placeholder={t("dash.teacher.topics.qe.segmentQuestionPlaceholder")}
                                            className="h-8 text-sm"
                                        />
                                    </div>

                                    <QuestionAttachmentField
                                        value={{
                                            imageUrl: segment.imageUrl,
                                            videoUrl: segment.videoUrl,
                                            audioUrl: segment.audioUrl,
                                        }}
                                        onChange={(attachment) => updateSegmentAttachment(i, attachment)}
                                    />

                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">{t("dash.teacher.topics.qe.segmentOptions")}</label>
                                        <div className="space-y-2">
                                            {segmentOptions.map((opt, oIdx) => {
                                                const segmentCorrectIndex = getCorrectAnswerIndex(segment.correctAnswer);
                                                return (
                                                <div key={oIdx} className="flex items-center gap-2">
                                                    <Button
                                                        type="button"
                                                        variant={segmentCorrectIndex === oIdx ? "default" : "outline"}
                                                        size="icon"
                                                        className="h-8 w-8 flex-shrink-0"
                                                        onClick={() => updateSegment(i, 'correctAnswer', oIdx)}
                                                    >
                                                        {segmentCorrectIndex === oIdx ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs">{oIdx + 1}</span>}
                                                    </Button>
                                                    <Input
                                                        value={opt}
                                                        onChange={(e) => updateSegmentOption(i, oIdx, e.target.value)}
                                                        placeholder={t("dash.teacher.topics.qe.optionShortN", { n: oIdx + 1 })}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                <Button variant="outline" size="sm" onClick={addSegment} className="w-full gap-1 mt-2">
                    <Plus className="w-4 h-4" />
                    {t("dash.teacher.topics.qe.addSegment")}
                </Button>
            </div>
            </div>
        </div>
    );
};

const PuzzleFields = ({ item, index, updateItem }: FieldProps) => {
    const { t } = useDashboardLocale();
    const options = item.options || [];
    const correctWord =
        typeof item.correctAnswer === "string" && item.correctAnswer.trim()
            ? item.correctAnswer
            : typeof item.correctAnswer === "number" && options[item.correctAnswer]
              ? options[item.correctAnswer]
              : "";

    const addOption = () => {
        updateItem(index, { options: [...options, ""] });
    };

    const removeOption = (optionIndex: number) => {
        updateItem(index, { options: options.filter((_, i) => i !== optionIndex) });
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="text-sm font-medium mb-2 block">{t("dash.teacher.topics.qe.puzzleCorrectWord")}</label>
                <Input
                    value={correctWord}
                    onChange={(e) => updateItem(index, { correctAnswer: e.target.value })}
                    placeholder={t("dash.teacher.topics.qe.puzzleCorrectWordPlaceholder")}
                />
                <p className="text-xs text-muted-foreground mt-2">{t("dash.teacher.topics.qe.puzzleCorrectWordHint")}</p>
            </div>
            <div>
                <label className="text-sm font-medium mb-2 block">{t("dash.teacher.topics.qe.puzzleOptions")}</label>
                <div className="space-y-2">
                    {options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                                {i + 1}
                            </span>
                            <Input
                                value={opt}
                                onChange={(e) => {
                                    const opts = [...options];
                                    opts[i] = e.target.value;
                                    updateItem(index, { options: opts });
                                }}
                                placeholder={t("dash.teacher.topics.qe.puzzleLetterN", { n: i + 1 })}
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => removeOption(i)}
                                disabled={options.length <= 2}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addOption} className="gap-1">
                        <Plus className="w-4 h-4" />
                        {t("dash.teacher.topics.qe.addOption")}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default QuestionGameEditor;

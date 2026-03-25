import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Plus, X, Save, Trash2, ChevronUp, ChevronDown,
    HelpCircle, Gamepad2, CheckCircle, XCircle,
    Clock, Star, Sparkles, ListOrdered, ArrowLeftRight,
    Target, CircleDot, RotateCcw, Wand2, Database, FileUp
} from "lucide-react";
import type { ActivityType, GameType, ChallengeQuestion, ContentMedia } from "@/data/challengeTypes";
import AIQuestionGenerator from "./AIQuestionGenerator";
import AIQuestionGeneratorFromResources from "./AIQuestionGeneratorFromResources";

// Type definitions
type ItemCategory = "activity" | "game";
type AIMode = "upload" | "resources" | null;

interface QuestionGameEditorProps {
    items: ChallengeQuestion[];
    onSave: (items: ChallengeQuestion[]) => void;
    onCancel: () => void;
    media?: ContentMedia[]; // Optional media for AI generation from resources
}

// Activity and Game type configurations
const activityTypes: { type: ActivityType; label: string; icon: typeof HelpCircle; description: string }[] = [
    { type: "multiple_choice", label: "اختيار متعدد", icon: CheckCircle, description: "سؤال مع 4 خيارات وإجابة صحيحة واحدة" },
    { type: "true_false", label: "صح وخطأ", icon: XCircle, description: "عبارة يحدد اللاعب إن كانت صحيحة أم خاطئة" },
    { type: "qa", label: "سؤال وجواب", icon: HelpCircle, description: "سؤال مفتوح مع إجابة نصية" },
    { type: "know_dont_know", label: "أعرف / لا أعرف", icon: CircleDot, description: "اختبر معرفتك - أعرف أو لا أعرف" },
    { type: "order_questions", label: "رتب الإجابات", icon: ListOrdered, description: "رتب العناصر بالترتيب الصحيح" },
];

const gameTypes: { type: GameType; label: string; icon: typeof Gamepad2; description: string }[] = [
    { type: "matching", label: "لعبة المطابقة", icon: ArrowLeftRight, description: "طابق العناصر من العمود الأيمن مع الأيسر" },
    { type: "shooting", label: "لعبة التصويب", icon: Target, description: "أطلق النار على الإجابة الصحيحة أو الخاطئة" },
    { type: "wheel_spin", label: "دوران العجلة", icon: RotateCcw, description: "أدر العجلة واربح نقاط بناءً على الصعوبة" },
    { type: "puzzle", label: "لعبة الألغاز", icon: Sparkles, description: "حل اللغز للحصول على النقاط" },
];

// Default values for each type
const getDefaultItem = (type: ActivityType | GameType): Partial<ChallengeQuestion> => {
    const baseItem = {
        id: Date.now(),
        type,
        question: "",
        points: 100,
        timeLimit: 20,
        explanation: "",
    };

    switch (type) {
        case "multiple_choice":
            return { ...baseItem, options: ["", "", "", ""], correctAnswer: 0 };
        case "true_false":
            return { ...baseItem, options: ["صح ✓", "خطأ ✗"], correctAnswer: 0, timeLimit: 15 };
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
            return { ...baseItem, options: ["", "", "", ""], correctAnswer: 0, timeLimit: 10, points: 150 };
        case "wheel_spin":
            return {
                ...baseItem,
                wheelSegments: [
                    { label: "سهل", points: 50, question: "سؤال سهل", options: ["خيار 1", "خيار 2", "خيار 3", "خيار 4"], correctAnswer: 0 },
                    { label: "متوسط", points: 100, question: "سؤال متوسط", options: ["خيار 1", "خيار 2", "خيار 3", "خيار 4"], correctAnswer: 0 },
                    { label: "صعب", points: 200, question: "سؤال صعب", options: ["خيار 1", "خيار 2", "خيار 3", "خيار 4"], correctAnswer: 0 },
                    { label: "مكافأة", points: 300, question: "سؤال مكافأة", options: ["خيار 1", "خيار 2", "خيار 3", "خيار 4"], correctAnswer: 0 },
                    { label: "أسطوري", points: 500, question: "سؤال أسطوري", options: ["خيار 1", "خيار 2", "خيار 3", "خيار 4"], correctAnswer: 0 }
                ],
                timeLimit: 30,
                points: 100
            };
        case "puzzle":
            return { ...baseItem, options: ["", "", "", ""], correctAnswer: 0, timeLimit: 45, points: 200 };
        default:
            return baseItem;
    }
};

const QuestionGameEditor = ({ items, onSave, onCancel, media = [] }: QuestionGameEditorProps) => {
    const [questionItems, setQuestionItems] = useState<ChallengeQuestion[]>(items);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<ItemCategory | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [aiMode, setAIMode] = useState<AIMode>(null);

    // Handle AI generated questions
    const handleAIGenerate = (generatedQuestions: ChallengeQuestion[]) => {
        setQuestionItems([...questionItems, ...generatedQuestions]);
        setAIMode(null);
    };

    // Add new item
    const handleAddItem = (type: ActivityType | GameType) => {
        const newItem = getDefaultItem(type) as ChallengeQuestion;
        newItem.id = Date.now();
        setQuestionItems([...questionItems, newItem]);
        setEditingIndex(questionItems.length);
        setShowAddDialog(false);
        setSelectedCategory(null);
    };

    // Update item
    const updateItem = (index: number, updates: Partial<ChallengeQuestion>) => {
        const newItems = [...questionItems];
        newItems[index] = { ...newItems[index], ...updates };
        setQuestionItems(newItems);
    };

    // Delete item
    const deleteItem = (index: number) => {
        setQuestionItems(questionItems.filter((_, i) => i !== index));
        if (editingIndex === index) setEditingIndex(null);
    };

    // Move item
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

    // Get type label
    const getTypeLabel = (type: ActivityType | GameType): string => {
        const activity = activityTypes.find(a => a.type === type);
        if (activity) return activity.label;
        const game = gameTypes.find(g => g.type === type);
        return game?.label || type;
    };

    // Get type icon
    const getTypeIcon = (type: ActivityType | GameType) => {
        const activity = activityTypes.find(a => a.type === type);
        if (activity) return activity.icon;
        const game = gameTypes.find(g => g.type === type);
        return game?.icon || HelpCircle;
    };

    // Check if type is a game
    const isGameType = (type: ActivityType | GameType): boolean => {
        return gameTypes.some(g => g.type === type);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Gamepad2 className="w-6 h-6 text-primary" />
                    إدارة الأسئلة والألعاب
                    <span className="text-sm font-normal text-muted-foreground">
                        ({questionItems.length} عنصر)
                    </span>
                </h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={onCancel}>
                        <X className="w-4 h-4 ml-2" />
                        إلغاء
                    </Button>
                    <Button onClick={() => onSave(questionItems)}>
                        <Save className="w-4 h-4 ml-2" />
                        حفظ الكل
                    </Button>
                </div>
            </div>

            {/* AI Generation Options */}
            {aiMode === null ? (
                <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-blue-500/5">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <Wand2 className="w-5 h-5 text-purple-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold">توليد بالذكاء الاصطناعي</h3>
                                    <p className="text-sm text-muted-foreground">
                                        استخدم Gemini AI لتوليد أسئلة وألعاب تفاعلية
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {media.length > 0 && (
                                    <Button
                                        onClick={() => setAIMode("resources")}
                                        className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                                    >
                                        <Database className="w-4 h-4" />
                                        من موارد الدرس ({media.length})
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={() => setAIMode("upload")}
                                    className="gap-2 border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/10"
                                >
                                    <FileUp className="w-4 h-4" />
                                    رفع ملفات أو صور
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : null}

            {/* AI Generator - Upload Mode */}
            <AnimatePresence>
                {aiMode === "upload" && (
                    <AIQuestionGenerator
                        onGenerate={handleAIGenerate}
                        onCancel={() => setAIMode(null)}
                    />
                )}
            </AnimatePresence>

            {/* AI Generator - Resources Mode */}
            <AnimatePresence>
                {aiMode === "resources" && media.length > 0 && (
                    <AIQuestionGeneratorFromResources
                        media={media}
                        onGenerate={handleAIGenerate}
                        onCancel={() => setAIMode(null)}
                    />
                )}
            </AnimatePresence>

            {/* Add New Button */}
            <Button
                onClick={() => setShowAddDialog(true)}
                variant="outline"
                className="w-full border-dashed border-2 h-16 text-lg gap-2"
            >
                <Plus className="w-5 h-5" />
                إضافة سؤال أو لعبة جديدة
            </Button>

            {/* Add Dialog */}
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
                                    <span>إضافة عنصر جديد</span>
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
                                    // Step 1: Choose category
                                    <div className="grid grid-cols-2 gap-4">
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setSelectedCategory("activity")}
                                            className="p-6 rounded-xl border-2 border-primary/30 hover:border-primary bg-background text-center transition-all"
                                        >
                                            <HelpCircle className="w-12 h-12 mx-auto mb-3 text-primary" />
                                            <h3 className="text-lg font-bold mb-1">سؤال (نشاط)</h3>
                                            <p className="text-sm text-muted-foreground">
                                                اختيار متعدد، صح وخطأ، ترتيب...
                                            </p>
                                        </motion.button>
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setSelectedCategory("game")}
                                            className="p-6 rounded-xl border-2 border-secondary/30 hover:border-secondary bg-background text-center transition-all"
                                        >
                                            <Gamepad2 className="w-12 h-12 mx-auto mb-3 text-secondary" />
                                            <h3 className="text-lg font-bold mb-1">لعبة</h3>
                                            <p className="text-sm text-muted-foreground">
                                                مطابقة، تصويب، دوران العجلة...
                                            </p>
                                        </motion.button>
                                    </div>
                                ) : (
                                    // Step 2: Choose specific type
                                    <div className="space-y-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedCategory(null)}
                                            className="mb-2"
                                        >
                                            ← رجوع
                                        </Button>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {(selectedCategory === "activity" ? activityTypes : gameTypes).map((item) => (
                                                <motion.button
                                                    key={item.type}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => handleAddItem(item.type)}
                                                    className={`p-4 rounded-xl border-2 text-right transition-all flex items-start gap-3 ${selectedCategory === "activity"
                                                        ? "border-primary/20 hover:border-primary hover:bg-primary/5"
                                                        : "border-secondary/20 hover:border-secondary hover:bg-secondary/5"
                                                        }`}
                                                >
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedCategory === "activity" ? "bg-primary/10" : "bg-secondary/10"
                                                        }`}>
                                                        <item.icon className={`w-5 h-5 ${selectedCategory === "activity" ? "text-primary" : "text-secondary"
                                                            }`} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold">{item.label}</h4>
                                                        <p className="text-xs text-muted-foreground">{item.description}</p>
                                                    </div>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Items List */}
            <div className="space-y-4">
                {questionItems.map((item, index) => {
                    const TypeIcon = getTypeIcon(item.type);
                    const isEditing = editingIndex === index;
                    const isGame = isGameType(item.type);

                    return (
                        <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Card className={`overflow-hidden transition-all ${isEditing ? "ring-2 ring-primary" : ""
                                } ${isGame ? "border-secondary/30" : "border-primary/30"}`}>
                                <CardContent className="p-0">
                                    {/* Item Header */}
                                    <div
                                        className={`p-4 flex items-center gap-4 cursor-pointer ${isGame ? "bg-secondary/5" : "bg-primary/5"
                                            }`}
                                        onClick={() => setEditingIndex(isEditing ? null : index)}
                                    >
                                        {/* Reorder buttons */}
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

                                        {/* Number */}
                                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${isGame ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
                                            }`}>
                                            {index + 1}
                                        </span>

                                        {/* Type Icon */}
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isGame ? "bg-secondary/10" : "bg-primary/10"
                                            }`}>
                                            <TypeIcon className={`w-5 h-5 ${isGame ? "text-secondary" : "text-primary"}`} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`text-xs px-2 py-0.5 rounded ${isGame ? "bg-secondary/20 text-secondary" : "bg-primary/20 text-primary"
                                                    }`}>
                                                    {getTypeLabel(item.type)}
                                                </span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {item.timeLimit}ث
                                                </span>
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Star className="w-3 h-3" />
                                                    {item.points} نقطة
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium truncate">
                                                {item.question || "(بدون عنوان)"}
                                            </p>
                                        </div>

                                        {/* Delete */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            onClick={(e) => { e.stopPropagation(); deleteItem(index); }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {/* Editing Form */}
                                    <AnimatePresence>
                                        {isEditing && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="p-4 border-t space-y-4">
                                                    {/* Common Fields */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div className="md:col-span-2">
                                                            <label className="text-sm font-medium mb-2 block">
                                                                {item.type === "wheel_spin" ? "عنوان العجلة" : "السؤال / العنوان"} *
                                                            </label>
                                                            <Input
                                                                value={item.question}
                                                                onChange={(e) => updateItem(index, { question: e.target.value })}
                                                                placeholder="أدخل نص السؤال أو العنوان"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    الوقت (ثانية)
                                                                </label>
                                                                <Input
                                                                    type="number"
                                                                    value={item.timeLimit}
                                                                    onChange={(e) => updateItem(index, { timeLimit: parseInt(e.target.value) || 20 })}
                                                                    min={5}
                                                                    max={120}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                                                                    <Star className="w-3 h-3" />
                                                                    النقاط
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

                                                    {/* Type-specific fields */}
                                                    {renderTypeSpecificFields(item, index, updateItem)}

                                                    {/* Explanation */}
                                                    <div>
                                                        <label className="text-sm font-medium mb-2 block">شرح الإجابة (اختياري)</label>
                                                        <Textarea
                                                            value={item.explanation || ""}
                                                            onChange={(e) => updateItem(index, { explanation: e.target.value })}
                                                            placeholder="شرح يظهر بعد الإجابة"
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

                {/* Empty State */}
                {questionItems.length === 0 && !showAddDialog && (
                    <Card className="p-12 text-center">
                        <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                        <h3 className="text-xl font-bold mb-2">لا توجد أسئلة أو ألعاب</h3>
                        <p className="text-muted-foreground mb-4">ابدأ بإضافة سؤال أو لعبة جديدة</p>
                        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                            <Plus className="w-4 h-4" />
                            إضافة عنصر جديد
                        </Button>
                    </Card>
                )}
            </div>
        </div>
    );
};

// Render type-specific form fields
const renderTypeSpecificFields = (
    item: ChallengeQuestion,
    index: number,
    updateItem: (index: number, updates: Partial<ChallengeQuestion>) => void
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
            return <WheelSpinFields item={item} index={index} updateItem={updateItem} />;
        case "puzzle":
            return <PuzzleFields item={item} index={index} updateItem={updateItem} />;
        default:
            return null;
    }
};

// Field Components
interface FieldProps {
    item: ChallengeQuestion;
    index: number;
    updateItem: (index: number, updates: Partial<ChallengeQuestion>) => void;
}

const MultipleChoiceFields = ({ item, index, updateItem }: FieldProps) => (
    <div>
        <label className="text-sm font-medium mb-2 block">الخيارات (انقر على الرقم لتحديد الإجابة الصحيحة)</label>
        <div className="space-y-2">
            {(item.options || []).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                    <Button
                        variant={item.correctAnswer === i ? "default" : "outline"}
                        size="icon"
                        className="h-9 w-9 flex-shrink-0"
                        onClick={() => updateItem(index, { correctAnswer: i })}
                    >
                        {item.correctAnswer === i ? <CheckCircle className="w-4 h-4" /> : i + 1}
                    </Button>
                    <Input
                        value={opt}
                        onChange={(e) => {
                            const opts = [...(item.options || [])];
                            opts[i] = e.target.value;
                            updateItem(index, { options: opts });
                        }}
                        placeholder={`الخيار ${i + 1}`}
                        className={item.correctAnswer === i ? "border-primary" : ""}
                    />
                </div>
            ))}
        </div>
    </div>
);

const TrueFalseFields = ({ item, index, updateItem }: FieldProps) => (
    <div>
        <label className="text-sm font-medium mb-2 block">الإجابة الصحيحة</label>
        <div className="flex gap-4">
            <Button
                variant={item.correctAnswer === 0 ? "default" : "outline"}
                className="flex-1 h-12 text-lg gap-2"
                onClick={() => updateItem(index, { correctAnswer: 0 })}
            >
                <CheckCircle className="w-5 h-5" />
                صح ✓
            </Button>
            <Button
                variant={item.correctAnswer === 1 ? "default" : "outline"}
                className="flex-1 h-12 text-lg gap-2"
                onClick={() => updateItem(index, { correctAnswer: 1 })}
            >
                <XCircle className="w-5 h-5" />
                خطأ ✗
            </Button>
        </div>
    </div>
);

const OpenAnswerFields = ({ item, index, updateItem }: FieldProps) => (
    <div>
        <label className="text-sm font-medium mb-2 block">
            {item.type === "know_dont_know" ? "الإجابة / المعلومة الصحيحة" : "الإجابة المتوقعة"}
        </label>
        <Textarea
            value={String(item.correctAnswer || "")}
            onChange={(e) => updateItem(index, { correctAnswer: e.target.value })}
            placeholder="أدخل الإجابة الصحيحة أو المعلومة"
            rows={2}
        />
    </div>
);

const OrderQuestionsFields = ({ item, index, updateItem }: FieldProps) => {
    const orderItems = item.orderItems || [];

    const addOrderItem = () => {
        updateItem(index, { orderItems: [...orderItems, ""] });
    };

    const removeOrderItem = (i: number) => {
        updateItem(index, { orderItems: orderItems.filter((_, idx) => idx !== i) });
    };

    return (
        <div>
            <label className="text-sm font-medium mb-2 block">
                العناصر بالترتيب الصحيح (من الأول للأخير)
            </label>
            <div className="space-y-2">
                {orderItems.map((item_text, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded bg-muted flex items-center justify-center font-bold text-sm">
                            {i + 1}
                        </span>
                        <Input
                            value={item_text}
                            onChange={(e) => {
                                const items = [...orderItems];
                                items[i] = e.target.value;
                                updateItem(index, { orderItems: items });
                            }}
                            placeholder={`العنصر ${i + 1}`}
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => removeOrderItem(i)}
                            disabled={orderItems.length <= 2}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
                <Button variant="outline" size="sm" onClick={addOrderItem} className="gap-1">
                    <Plus className="w-4 h-4" />
                    إضافة عنصر
                </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
                💡 سيتم خلط العناصر عند عرضها على اللاعب
            </p>
        </div>
    );
};

const MatchingFields = ({ item, index, updateItem }: FieldProps) => {
    const pairs = item.pairs || [];

    const addPair = () => {
        updateItem(index, { pairs: [...pairs, { left: "", right: "" }] });
    };

    const removePair = (i: number) => {
        updateItem(index, { pairs: pairs.filter((_, idx) => idx !== i) });
    };

    return (
        <div>
            <label className="text-sm font-medium mb-2 block">أزواج المطابقة</label>
            <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs font-medium text-muted-foreground">
                    <span>العمود الأيمن (المصدر)</span>
                    <span>العمود الأيسر (المطابق)</span>
                </div>
                {pairs.map((pair, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <Input
                            value={pair.left}
                            onChange={(e) => {
                                const newPairs = [...pairs];
                                newPairs[i] = { ...newPairs[i], left: e.target.value };
                                updateItem(index, { pairs: newPairs });
                            }}
                            placeholder={`المصدر ${i + 1}`}
                        />
                        <ArrowLeftRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <Input
                            value={pair.right}
                            onChange={(e) => {
                                const newPairs = [...pairs];
                                newPairs[i] = { ...newPairs[i], right: e.target.value };
                                updateItem(index, { pairs: newPairs });
                            }}
                            placeholder={`المطابق ${i + 1}`}
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => removePair(i)}
                            disabled={pairs.length <= 2}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
                <Button variant="outline" size="sm" onClick={addPair} className="gap-1">
                    <Plus className="w-4 h-4" />
                    إضافة زوج
                </Button>
            </div>
        </div>
    );
};

const ShootingFields = ({ item, index, updateItem }: FieldProps) => (
    <div>
        <label className="text-sm font-medium mb-2 block">
            الخيارات (حدد الخيار الذي يجب إطلاق النار عليه)
        </label>
        <div className="space-y-2">
            {(item.options || []).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                    <Button
                        variant={item.correctAnswer === i ? "destructive" : "outline"}
                        size="icon"
                        className="h-9 w-9 flex-shrink-0"
                        onClick={() => updateItem(index, { correctAnswer: i })}
                    >
                        {item.correctAnswer === i ? <Target className="w-4 h-4" /> : i + 1}
                    </Button>
                    <Input
                        value={opt}
                        onChange={(e) => {
                            const opts = [...(item.options || [])];
                            opts[i] = e.target.value;
                            updateItem(index, { options: opts });
                        }}
                        placeholder={`الخيار ${i + 1}`}
                        className={item.correctAnswer === i ? "border-destructive" : ""}
                    />
                </div>
            ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
            🎯 الخيار المحدد باللون الأحمر هو الهدف الصحيح
        </p>
    </div>
);

const WheelSpinFields = ({ item, index, updateItem }: FieldProps) => {
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
                label: "شريحة جديدة",
                points: 100,
                question: "",
                options: ["", "", "", ""],
                correctAnswer: 0
            }]
        });
    };

    const updateSegment = (sIndex: number, field: string, value: any) => {
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

    return (
        <div>
            <label className="text-sm font-medium mb-2 block">شرائح العجلة (الأسئلة والخيارات)</label>
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
                                    <span className="text-sm font-bold">{segment.label || `الشريحة ${i + 1}`}</span>
                                    <span className="text-xs text-muted-foreground ml-2">({segment.points} نقطة)</span>
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
                                            <label className="text-xs text-muted-foreground mb-1 block">عنوان الشريحة</label>
                                            <Input
                                                value={segment.label}
                                                onChange={(e) => updateSegment(i, 'label', e.target.value)}
                                                placeholder="مثال: سهل"
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                                                <Star className="w-3 h-3" /> النقاط
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
                                        <label className="text-xs text-muted-foreground mb-1 block">السؤال</label>
                                        <Input
                                            value={segment.question}
                                            onChange={(e) => updateSegment(i, 'question', e.target.value)}
                                            placeholder="السؤال المرتبط بهذه الشريحة"
                                            className="h-8 text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">الخيارات (حدد الإجابة الصحيحة)</label>
                                        <div className="space-y-2">
                                            {segmentOptions.map((opt, oIdx) => (
                                                <div key={oIdx} className="flex items-center gap-2">
                                                    <Button
                                                        variant={(segment.correctAnswer || 0) === oIdx ? "default" : "outline"}
                                                        size="icon"
                                                        className="h-8 w-8 flex-shrink-0"
                                                        onClick={() => updateSegment(i, 'correctAnswer', oIdx)}
                                                    >
                                                        {(segment.correctAnswer || 0) === oIdx ? <CheckCircle className="w-4 h-4" /> : <span className="text-xs">{oIdx + 1}</span>}
                                                    </Button>
                                                    <Input
                                                        value={opt}
                                                        onChange={(e) => updateSegmentOption(i, oIdx, e.target.value)}
                                                        placeholder={`خيار ${oIdx + 1}`}
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                <Button variant="outline" size="sm" onClick={addSegment} className="w-full gap-1 mt-2">
                    <Plus className="w-4 h-4" />
                    إضافة شريحة جديدة
                </Button>
            </div>
        </div>
    );
};

const PuzzleFields = ({ item, index, updateItem }: FieldProps) => (
    <div className="space-y-4">
        <div>
            <label className="text-sm font-medium mb-2 block">خيارات اللغز</label>
            <div className="space-y-2">
                {(item.options || []).map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <Button
                            variant={item.correctAnswer === i ? "default" : "outline"}
                            size="icon"
                            className="h-9 w-9 flex-shrink-0"
                            onClick={() => updateItem(index, { correctAnswer: i })}
                        >
                            {item.correctAnswer === i ? <CheckCircle className="w-4 h-4" /> : i + 1}
                        </Button>
                        <Input
                            value={opt}
                            onChange={(e) => {
                                const opts = [...(item.options || [])];
                                opts[i] = e.target.value;
                                updateItem(index, { options: opts });
                            }}
                            placeholder={`الخيار ${i + 1}`}
                        />
                    </div>
                ))}
            </div>
        </div>
        <div>
            <label className="text-sm font-medium mb-2 block">رابط صورة اللغز (اختياري)</label>
            <Input
                value={item.imageUrl || ""}
                onChange={(e) => updateItem(index, { imageUrl: e.target.value })}
                placeholder="https://..."
            />
        </div>
    </div>
);

export default QuestionGameEditor;

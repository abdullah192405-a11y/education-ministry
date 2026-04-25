// Challenge Types and Game Types
export interface ContentMedia {
    id?: string;
    type: "video" | "image" | "text" | "pdf" | "audio" | "link";
    url?: string;
    content?: string; // For text type
    caption?: string;
    file?: File; // Temporary for upload
    fileName?: string;
    pdfBase64?: string; // For AI analysis
    imageBase64?: string; // For AI analysis
}

export interface EducationalContent {
    id: string | number;
    title: string;
    description: string;
    thumbnail: string;
    targetAudience: "all" | "children" | "adults";
    duration: string;
    media: ContentMedia[];
    correctSoundUrl?: string;
    wrongSoundUrl?: string;
    answeringBackgroundSoundUrl?: string;
    quiz?: any[]; // Keep for compatibility if needed
    views: number;
    createdAt: string;
}

export type ChallengeMode = "single" | "group";

export type ActivityType =
    | "multiple_choice"      // اختيار متعدد
    | "true_false"          // صح وخطأ
    | "qa"                  // سؤال وجواب
    | "know_dont_know"      // أعرف / لا أعرف
    | "order_questions";    // رتب الأسئلة

export type GameType =
    | "puzzle"              // لعبة الألغاز
    | "shooting"            // لعبة التصويب
    | "matching"            // لعبة المطابقة
    | "wheel_spin";         // دوران العجلة

export type ChallengeCategory = "activities" | "games" | "mixed";

// Challenge Question format (unified for all types)
export interface ChallengeQuestion {
    id: number;
    type: ActivityType | GameType;
    typeTitle?: string;
    question: string;
    options?: string[];
    correctAnswer?: number | string | number[];
    imageUrl?: string;
    pairs?: { left: string; right: string }[]; // For matching
    orderItems?: string[]; // For ordering (in correct order)
    explanation?: string;
    points: number;
    timeLimit: number; // seconds
    wheelSegments?: {
        label: string;
        points: number;
        question: string;
        options?: string[];
        correctAnswer?: number;
    }[];
}

// Player in a challenge
export interface Player {
    id: string;
    userId?: string;
    name: string;
    avatar: string;
    score: number;
    correctAnswers: number;
    wrongAnswers: number;
    streak: number;
    rank?: number;
    isHost?: boolean;
    isOnline?: boolean;
    lastAnswerTime?: number;
}

// Challenge Session
export interface ChallengeSession {
    id: string;
    pin: string;
    mode: ChallengeMode;
    category: ChallengeCategory;
    contentId: number;
    questions: ChallengeQuestion[];
    players: Player[];
    currentQuestionIndex: number;
    status: "waiting" | "playing" | "finished";
    hostId: string;
    createdAt: Date;
    settings: {
        showLeaderboard: boolean;
        allowLateJoin: boolean;
        musicEnabled: boolean;
        maxPlayers: number;
    };
}

// Single Player Results
export interface SinglePlayerResult {
    totalQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    score: number;
    maxScore: number;
    percentage: number;
    timeTaken: number;
    averageTimePerQuestion: number;
    longestStreak: number;
    accuracy: number;
    questionResults: {
        questionId: number;
        correct: boolean;
        timeTaken: number;
        pointsEarned: number;
    }[];
    badges: Badge[];
    level: string;
}

// Badges system
export interface Badge {
    id: string;
    name: string;
    icon: string;
    description: string;
    condition: string;
}

// Activity Type Labels (Arabic)
export const activityTypeLabels: Record<ActivityType, string> = {
    multiple_choice: "اختيار متعدد",
    true_false: "صح وخطأ",
    qa: "سؤال وجواب",
    know_dont_know: "أعرف / لا أعرف",
    order_questions: "رتب الإجابات"
};

export const gameTypeLabels: Record<GameType, string> = {
    puzzle: "لعبة الألغاز",
    shooting: "لعبة التصويب",
    matching: "لعبة المطابقة",
    wheel_spin: "دوران العجلة"
};

export const categoryLabels: Record<ChallengeCategory, { name: string; description: string; icon: string }> = {
    activities: {
        name: "الأنشطة التفاعلية فقط",
        description: "أسئلة ممتعة بأنماط مختلفة",
        icon: "💡"
    },
    games: {
        name: "الأنشطة التلعيبية فقط",
        description: "تعلّم من خلال اللعب",
        icon: "🎮"
    },
    mixed: {
        name: "الكل",
        description: "خليط من الألعاب والأسئلة",
        icon: "🎯"
    }
};

// Default badges
export const availableBadges: Badge[] = [
    { id: "perfect", name: "مثالي", icon: "\u{1F3C6}", description: "أجبت على جميع الأسئلة بشكل صحيح", condition: "100% accuracy" },
    { id: "speed_demon", name: "البرق", icon: "\u{26A1}", description: "أجبت خلال 3 ثواني على جميع الأسئلة", condition: "avg time < 3s" },
    { id: "streak_master", name: "متسلسل", icon: "\u{1F525}", description: "حققت 5 إجابات صحيحة متتالية", condition: "5 streak" },
    { id: "first_try", name: "المحاولة الأولى", icon: "\u{1F31F}", description: "أكملت التحدي من أول مرة", condition: "first attempt" },
    { id: "scholar", name: "العالِم", icon: "\u{1F4DA}", description: "حصلت على أكثر من 90%", condition: "score > 90%" },
    { id: "improver", name: "المتطور", icon: "\u{1F4C8}", description: "تحسنت نتيجتك عن المحاولة السابقة", condition: "improved" },
    { id: "quick_learner", name: "سريع التعلم", icon: "\u{1F9E0}", description: "أكملت التحدي في أقل من دقيقتين", condition: "time < 2min" },
    { id: "persistent", name: "المثابر", icon: "\u{1F4AA}", description: "أعدت المحاولة 3 مرات", condition: "3 attempts" }
];

// Level system
export const getLevelFromScore = (percentage: number): { level: string; color: string; emoji: string } => {
    if (percentage >= 95) return { level: "أسطورة", color: "#FFD700", emoji: "\u{1F451}" };
    if (percentage >= 85) return { level: "خبير", color: "#C0C0C0", emoji: "\u{1F947}" };
    if (percentage >= 75) return { level: "متقدم", color: "#CD7F32", emoji: "\u{1F948}" };
    if (percentage >= 60) return { level: "متوسط", color: "#4CAF50", emoji: "\u{1F949}" };
    if (percentage >= 40) return { level: "مبتدئ", color: "#2196F3", emoji: "\u{2B50}" };
    return { level: "متدرب", color: "#9E9E9E", emoji: "\u{1F331}" };
};

// Generate random PIN
export const generatePin = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate share link
export const generateShareLink = (pin: string): string => {
    return `${window.location.origin}/join/${pin}`;
};

// Random avatar generator
export const getRandomAvatar = (seed: string): string => {
    const colors = ["FF6B6B", "4ECDC4", "45B7D1", "96CEB4", "FFEAA7", "DDA0DD", "98D8C8", "F7DC6F"];
    const color = colors[Math.abs(seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length];
    return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${seed}&backgroundColor=${color}`;
};

// Helper to get a random question for wheel difficulty
export const getWheelSubQuestion = (difficulty: string): Partial<ChallengeQuestion> & { id: number } => {
    const pool: Record<string, Partial<ChallengeQuestion>[]> = {
        "سهل": [
            { question: "ما هو التصرف الصحيح عند العطس؟", options: ["العطس في الهواء", "استخدام المنديل/المرفق", "تغطية الفم باليد", "عدم فعل شيء"], correctAnswer: 1, explanation: "استخدام المنديل يمنع انتشار الرذاذ" },
            { question: "متى يجب غسل اليدين؟", options: ["بعد الأكل فقط", "قبل الأكل فقط", "قبل وبعد الأكل", "مرة واحدة يومياً"], correctAnswer: 2, explanation: "النظافة ضرورية في كل الأوقات" }
        ],
        "متوسط": [
            { question: "لماذا نستخدم الصابون لغسل اليدين؟", options: ["ليعطي رائحة جميلة", "لإزالة الجراثيم والدهون", "ليجعل اليد ناعمة", "لأنه رغوي"], correctAnswer: 1, explanation: "الصابون يكسر غشاء الجراثيم" },
            { question: "أين تعيش معظم الجراثيم؟", options: ["في الأماكن الملوثة", "في الهواء النقي", "في ضوء الشمس", "في الماء المغلي"], correctAnswer: 0, explanation: "التلوث بيئة خصبة للجراثيم" }
        ],
        "صعب": [
            { question: "ما هي فترة حضانة معظم الفيروسات الشائعة؟", options: ["ساعة واحدة", "1-14 يوم", "شهر كامل", "سنة"], correctAnswer: 1, explanation: "الفيروس يحتاج وقتاً للتكاثر" },
            { question: "كيف يساهم النوم في محاربة الأمراض؟", options: ["يقوي جهاز المناعة", "يقتل الفيروسات مباشرة", "يبرد الجسم", "لا علاقة له"], correctAnswer: 0, explanation: "النوم يرمم خلايا المناعة" }
        ],
        "أسطوري": [
            { question: "ما هو خط الدفاع الأول للجسم ضد الجراثيم؟", options: ["القلب", "الجلد", "المعدة", "الرئتين"], correctAnswer: 1, explanation: "الجلد يشكل حاجزاً طبيعياً" },
            { question: "من هو مكتشف البنسلين؟", options: ["باستور", "فليمنج", "أينشتاين", "أديسون"], correctAnswer: 1, explanation: "ألكسندر فليمنج عام 1928" }
        ],
        "مكافأة": [
            { question: "ماذا يسمى الشخص الذي يمارس الرياضة بانتظام؟", options: ["رياضي", "كسول", "خامل", "متعب"], correctAnswer: 0, explanation: "الرياضة أسلوب حياة" }
        ],
        "ذكاء": [
            { question: "شيء يحميك من الأمراض ولا تراه بالعين، فما هو؟", options: ["المناعة", "المدرعات", "الحارس", "المظلة"], correctAnswer: 0, explanation: "جهاز المناعة هو جيشك الداخلي" }
        ]
    };

    const key = Object.keys(pool).find(k => difficulty.includes(k)) || "سهل";
    const subQuestions = pool[key];
    const q = subQuestions[Math.floor(Math.random() * subQuestions.length)];
    return { ...q, id: 999 } as any;
};

// Sample challenge questions generator based on content
export const generateQuestionsFromContent = (contentId: number, category: ChallengeCategory): ChallengeQuestion[] => {
    const sampleQuestions: ChallengeQuestion[] = [];

    // Specific content for "How to protect ourselves from germs" (ID: 1)
    if (contentId === 1) {
        if (category === "activities" || category === "mixed") {
            // --- Multiple Choice (Facts) ---
            sampleQuestions.push({
                id: 101,
                type: "multiple_choice",
                question: "كم المدة التي يجب أن تستغرقها في غسل يديك بالماء والصابون؟",
                options: ["5 ثواني", "10 ثواني", "20 ثانية على الأقل", "دقيقة كاملة"],
                correctAnswer: 2,
                points: 100,
                timeLimit: 15,
                explanation: "يوصى بغسل اليدين لمدة 20 ثانية على الأقل للقضاء على الجراثيم."
            });

            sampleQuestions.push({
                id: 102,
                type: "multiple_choice",
                question: "ما هي الجراثيم؟",
                options: ["كائنات كبيرة نراها", "كائنات دقيقة لا تُرى بالعين", "نوع من النباتات", "جمادات"],
                correctAnswer: 1,
                points: 100,
                timeLimit: 20,
                explanation: "الجراثيم كائنات دقيقة تشمل البكتيريا والفيروسات ولا يمكن رؤيتها بالعين المجردة."
            });

            sampleQuestions.push({
                id: 103,
                type: "multiple_choice",
                question: "أي من الأسطح التالية قد يحمل جراثيم أكثر من مقعد المرحاض؟",
                options: ["الطاولة النظيفة", "الهاتف المحمول", "الكتاب", "المرآة"],
                correctAnswer: 1,
                points: 150,
                timeLimit: 15,
                explanation: "الهواتف المحمولة قد تحمل جراثيم كثيرة جداً ويجب تعقيمها بانتظام."
            });

            // --- True / False (Myths vs Facts) ---
            sampleQuestions.push({
                id: 104,
                type: "true_false",
                question: "جميع الجراثيم ضارة وتسبب الأمراض.",
                options: ["صح ✓", "خطأ ✗"],
                correctAnswer: 1,
                points: 80,
                timeLimit: 15,
                explanation: "خطأ، معظم الجراثيم غير ضارة، وبعضها مفيد جداً مثل تلك التي تساعد في الهضم."
            });

            sampleQuestions.push({
                id: 105,
                type: "true_false",
                question: "يمكن للجراثيم أن تعيش على الأسطح الصلبة لعدة أيام.",
                options: ["صح ✓", "خطأ ✗"],
                correctAnswer: 0,
                points: 80,
                timeLimit: 15,
                explanation: "صحيح، الجراثيم قد تبقى حية على الأسطح لفترات طويلة."
            });

            sampleQuestions.push({
                id: 106,
                type: "true_false",
                question: "التهوية الجيدة للأماكن المغلقة تساعد في الوقاية من الجراثيم.",
                options: ["صح ✓", "خطأ ✗"],
                correctAnswer: 0,
                points: 80,
                timeLimit: 15,
                explanation: "نعم، تجديد الهواء يقلل من تركيز الجراثيم في المكان."
            });

            // --- Know / Don't Know ---
            sampleQuestions.push({
                id: 107,
                type: "know_dont_know",
                question: "هل تعلم أن عدد الجراثيم في جسم الإنسان يفوق عدد خلاياه؟",
                correctAnswer: "نعم، هذه حقيقة مدهشة ذكرت في المحتوى! جسمنا عالم كامل للكائنات الدقيقة.",
                points: 120,
                timeLimit: 20
            });

            // --- Order Questions (Process) ---
            sampleQuestions.push({
                id: 108,
                type: "order_questions",
                question: "رتب خطوات الوقاية الأساسية",
                orderItems: ["غسل اليدين", "تعقيم الأسطح", "تغطية الفم عند العطس", "تهوية الغرفة"],
                points: 150,
                timeLimit: 40
            });
        }

        if (category === "games" || category === "mixed") {
            // --- Matching Game (Problem -> Solution) ---
            sampleQuestions.push({
                id: 201,
                type: "matching",
                question: "طابق المشكلة مع الحل الصحيح من المحتوى",
                pairs: [
                    { left: "يدان غير مغسولتين", right: "تجنب لمس الوجه" },
                    { left: "العطس", right: "تغطية الفم والأنف" },
                    { left: "الهاتف المحمول", right: "التعقيم بانتظام" },
                    { left: "مكان مغلق", right: "التهوية الجيدة" }
                ],
                points: 200,
                timeLimit: 60
            });

            // --- Shooting Game (Good vs Bad Habits) ---
            sampleQuestions.push({
                id: 202,
                type: "shooting",
                question: "أطلق النار على العادة **السيئة** التي تنقل الجراثيم!",
                options: ["غسل اليدين 20 ثانية", "لمس الوجه باستمرار", "استخدام المعقم", "تنظيف الأسطح"],
                correctAnswer: 1,
                points: 150,
                timeLimit: 10,
                explanation: "لمس الوجه بأيدٍ غير نظيفة هو أسرع طريق لنقل العدوى للعينين والأنف والفم."
            });

            sampleQuestions.push({
                id: 203,
                type: "shooting",
                question: "أطلق النار على المعلومة **الصحيحة** فقط!",
                options: ["الجراثيم تُرى بالعين", "كل الجراثيم قاتلة", "بعض الجراثيم مفيدة للهضم", "الهواء الملوث مفيد"],
                correctAnswer: 2,
                points: 150,
                timeLimit: 10,
                explanation: "صحيح! توجد بكتيريا نافعة في أمعائنا تساعدنا على هضم الطعام."
            });

            // --- Wheel Spin (Luck & Info) ---
            sampleQuestions.push({
                id: 204,
                type: "wheel_spin",
                question: "دولاب الحقائق المدهشة! أدر لتربح",
                options: [
                    "حقيقة: الهاتف مليء بالجراثيم +100",
                    "حقيقة: الجراثيم أكثر من الخلايا +200",
                    "نصيحة: اغسل يديك 20ث +50",
                    "فرصة ثانية",
                    "نقطة إضافية"
                ],
                points: 100,
                timeLimit: 30
            });
        }

        return sampleQuestions.sort(() => Math.random() - 0.5);
    }

    // Default Fallback content (Simplified from original to save space, or kept generic)
    if (category === "activities" || category === "mixed") {
        sampleQuestions.push({
            id: 1,
            type: "multiple_choice",
            question: "كم ثانية يجب غسل اليدين بالماء والصابون؟",
            options: ["5 ثواني", "10 ثواني", "20 ثانية", "دقيقة كاملة"],
            correctAnswer: 2,
            points: 100,
            timeLimit: 15,
            explanation: "غسل اليدين لمدة 20 ثانية على الأقل يضمن القضاء على معظم الجراثيم"
        });

        sampleQuestions.push({
            id: 2,
            type: "true_false",
            question: "الجراثيم يمكن رؤيتها بالعين المجردة",
            options: ["صح ✓", "خطأ ✗"],
            correctAnswer: 1,
            points: 80,
            timeLimit: 10,
            explanation: "الجراثيم كائنات دقيقة جداً لا يمكن رؤيتها إلا بالمجهر"
        });

        sampleQuestions.push({
            id: 4,
            type: "know_dont_know",
            question: "ما هي أفضل طريقة للوقاية من انتشار الجراثيم؟",
            correctAnswer: "غسل اليدين بانتظام وتغطية الفم عند العطس والحفاظ على النظافة الشخصية",
            points: 120,
            timeLimit: 25
        });

        sampleQuestions.push({
            id: 5,
            type: "order_questions",
            question: "رتّب خطوات غسل اليدين الصحيحة من الأولى للأخيرة",
            orderItems: ["بلل يديك بالماء", "ضع الصابون", "افرك لمدة 20 ثانية", "اشطف بالماء", "جفف يديك"],
            points: 150,
            timeLimit: 45
        });
    }

    // Add generic games just in case
    if (category === "games" || category === "mixed") {
        sampleQuestions.push({
            id: 7,
            type: "matching",
            question: "طابق طريقة انتقال الجراثيم مع الوقاية منها",
            pairs: [
                { left: "العطس", right: "تغطية الفم" },
                { left: "اللمس", right: "غسل اليدين" },
                { left: "الطعام الملوث", right: "غسل الخضروات" },
                { left: "الهواء", right: "التهوية الجيدة" }
            ],
            points: 200,
            timeLimit: 60
        });

        sampleQuestions.push({
            id: 8,
            type: "wheel_spin",
            question: "أدر العجلة لتحديد مستوى التحدي والنقاط!",
            options: ["سؤال سهل", "سؤال صعب", "مكافأة"],
            points: 100,
            timeLimit: 30
        });

        sampleQuestions.push({
            id: 10,
            type: "shooting",
            question: "⚡ أجب بسرعة! أي من هذه الأماكن تتجمع فيها الجراثيم أكثر؟",
            options: ["مقبض الباب 🚪", "السماء ☁️", "الماء النظيف 💧", "الهواء النقي 🌬️"],
            correctAnswer: 0,
            points: 150,
            timeLimit: 5,
            explanation: "مقابض الأبواب من أكثر الأماكن تجمعاً للجراثيم"
        });
    }


    return sampleQuestions.sort(() => Math.random() - 0.5);
};

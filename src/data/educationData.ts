// وزارة التربية والتعليم السعودية - هيكل البيانات التعليمية

// Content Media Types
export interface ContentMedia {
    type: "video" | "image" | "text" | "pdf";
    url?: string;
    content?: string;
    caption?: string;
    file?: File; // For PDF files that need to be processed
    fileName?: string; // Store the original file name
    extractedText?: string; // Extracted text from PDF for AI processing
    pdfBase64?: string; // Base64 encoded PDF for direct AI analysis
}

import type { ChallengeQuestion } from "./challengeTypes";

// Quiz Question Type
export interface QuizQuestion {
    id: number;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
}

// موضوع (Topic) - المستوى الثالث
export interface Topic {
    id: number;
    title: string;
    description: string;
    thumbnail: string;
    media: ContentMedia[];
    quiz: QuizQuestion[];
    challengeItems?: ChallengeQuestion[];
    views: number;
    duration?: string;
    createdAt: string;
}

// مادة (Subject) - المستوى الثاني
export interface Subject {
    id: number;
    name: string;
    description: string;
    icon: string;
    color: string;
    topics: Topic[];
}

// صف (Class/Grade) - المستوى الأول
export interface Grade {
    id: number;
    name: string;
    slug: string;
    level: "ابتدائي" | "متوسط" | "ثانوي";
    description: string;
    coverImage: string;
    icon: string;
    subjects: Subject[];
    studentsCount: number;
    verified: boolean;
}

// Helper to get grade level labels
export const getGradeLevelLabel = (level: string): string => {
    switch (level) {
        case "ابتدائي":
            return "المرحلة الابتدائية";
        case "متوسط":
            return "المرحلة المتوسطة";
        case "ثانوي":
            return "المرحلة الثانوية";
        default:
            return level;
    }
};

// بيانات الصفوف الدراسية
export const gradesData: Grade[] = [
    {
        id: 1,
        name: "الصف الأول الابتدائي",
        slug: "grade-1-primary",
        level: "ابتدائي",
        description: "المرحلة التأسيسية لبناء المهارات الأساسية في القراءة والكتابة والحساب",
        coverImage: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&h=400&fit=crop",
        icon: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=200&h=200&fit=crop",
        studentsCount: 125000,
        verified: true,
        subjects: [
            {
                id: 1,
                name: "اللغة العربية",
                description: "تعلم الحروف والكلمات وأساسيات القراءة والكتابة",
                icon: "📖",
                color: "#10b981",
                topics: [
                    {
                        id: 1,
                        title: "حروف الهجاء العربية",
                        description: "تعلم الحروف العربية بالصور والأمثلة مع ألعاب وتحديات ممتعة",
                        thumbnail: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop",
                        media: [
                            {
                                type: "video",
                                url: "https://www.youtube.com/embed/2Ohk-8hdCWs",
                                caption: "أنشودة الحروف الهجائية"
                            },
                            {
                                type: "image",
                                url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=600&fit=crop",
                                caption: "لوحة الحروف العربية المصورة"
                            },
                            {
                                type: "text",
                                content: "**الحروف الهجائية العربية**\n\nاللغة العربية تتكون من 28 حرفاً. هذا الدرس يركز على المجموعة الأولى:\n\n**أ (ألف):** أسد، أرنب، أنناس\n**ب (باء):** بطة، باب، بيت\n**ت (تاء):** تفاح، تمساح، توت\n\n**نصائح للحفظ:**\n• كرر نطق الحرف بصوت عالٍ\n• ارسم الحرف في الهواء بإصبعك\n• ابحث عن أشياء في غرفتك تبدأ بهذه الحروف"
                            },
                            {
                                type: "pdf",
                                fileName: "كراسة_تدريبات_الحروف.pdf",
                                url: "https://pdfobject.com/pdf/sample.pdf", // Working sample PDF
                                caption: "كراسة التدريبات والنشاطات"
                            }
                        ],
                        quiz: [
                            {
                                id: 1,
                                question: "ما هي حركة الحرف الأول في كلمة (أُذن)؟",
                                options: ["فتحة (َ)", "ضمة (ُ)", "كسرة (ِ)", "سكون (ْ)"],
                                correctAnswer: 1,
                                explanation: "كلمة أُذن تبدأ بحرف الألف مضم وماً (أُ)."
                            },
                            {
                                id: 2,
                                question: "أي كلمة تبدأ بحرف (م)؟",
                                options: ["نمر", "موز", "توت", "باب"],
                                correctAnswer: 1,
                                explanation: "كلمة موز تبدأ بحرف الميم."
                            },
                            {
                                id: 3,
                                question: "اختر شكل حرف الكاف في آخر الكلمة:",
                                options: ["كـ", "ـكـ", "ك", "ـك"],
                                correctAnswer: 2,
                                explanation: "حرف الكاف في آخر الكلمة يكتب بهذا الشكل (ك) إذا كان منفصلاً أو (ـك) إذا كان متصلاً."
                            },
                            {
                                id: 4,
                                question: "ما هو الحرف الناقص: ...ـيارة (سيارة)؟",
                                options: ["سـ", "صـ", "شـ", "ز"],
                                correctAnswer: 0,
                                explanation: "الحرف الناقص هو السين (سـ) لتصبح سيارة."
                            },
                            {
                                id: 5,
                                question: "أي من هذه الحروف من الحروف الرافسة (التي لا تتصل بعدها)؟",
                                options: ["ب", "ج", "د", "س"],
                                correctAnswer: 2,
                                explanation: "حرف الدال (د) من الحروف الرافسة، لا يتصل بالحرف الذي يليه."
                            },
                            {
                                id: 6,
                                question: "كم نقطة على حرف الشين (ش)؟",
                                options: ["نقطة واحدة", "نقطتان", "ثلاث نقاط", "لا يوجد"],
                                correctAnswer: 2,
                                explanation: "حرف الشين له ثلاث نقاط."
                            },
                            {
                                id: 7,
                                question: "ما هو صوت حرف الباء مع الكسرة؟ (بِ)",
                                options: ["بَ (Ba)", "بُ (Bu)", "بِ (Bi)", "بْ (B)"],
                                correctAnswer: 2,
                                explanation: "الباء مع الكسرة تُنطق (بِ)."
                            },
                            {
                                id: 8,
                                question: "أي كلمة تحتوي على مد بالألف؟",
                                options: ["باب", "بيت", "بنت", "بحر"],
                                correctAnswer: 0,
                                explanation: "كلمة (باب) فيها مد بالألف."
                            },
                            {
                                id: 9,
                                question: "حلل كلمة (درس) إلى حروفها:",
                                options: ["د-ر-س", "د-س-ر", "س-ر-د", "ر-د-س"],
                                correctAnswer: 0,
                                explanation: "تحليل كلمة درس هو: د، ر، س."
                            },
                            {
                                id: 10,
                                question: "ما هو الحرف المشدد في كلمة (سَلَّمَ)؟",
                                options: ["س", "ل", "م", "لا يوجد"],
                                correctAnswer: 1,
                                explanation: "حرف اللام (لّ) هو الحرف المشدد."
                            }
                        ],
                        challengeItems: [
                            // --- Questions (Activities) ---
                            // Level 1: Identification
                            {
                                id: 101,
                                type: "multiple_choice",
                                question: "ما هو الحيوان الذي يبدأ بحرف الألف؟",
                                options: ["بطة 🦆", "أسد 🦁", "فيل 🐘", "حمار وحشي 🦓"],
                                correctAnswer: 1,
                                points: 100,
                                timeLimit: 15,
                                explanation: "كلمة **أسد** تبدأ بحرف الألف (أ)."
                            },
                            {
                                id: 102,
                                type: "multiple_choice",
                                question: "أي صورة تبدأ بحرف الجيم (ج)؟",
                                options: ["جمل 🐫", "خروف 🐑", "حصان 🐎", "فيل 🐘"],
                                correctAnswer: 0,
                                points: 100,
                                timeLimit: 15,
                                explanation: "جمل يبدأ بحرف الجيم."
                            },
                            {
                                id: 103,
                                type: "multiple_choice",
                                question: "أين يقع حرف الباء في كلمة 'عنب'؟",
                                options: ["في الأول", "في الوسط", "في الآخر", "غير موجود"],
                                correctAnswer: 2,
                                points: 120,
                                timeLimit: 20,
                                explanation: "في كلمة 'عنب'، حرف الباء يقع في آخر الكلمة."
                            },

                            // Level 2: Characteristics (True/False)
                            {
                                id: 104,
                                type: "true_false",
                                question: "حرف الباء له ثلاث نقاط (ب)",
                                options: ["صح ✓", "خطأ ✗"],
                                correctAnswer: 1,
                                points: 80,
                                timeLimit: 10,
                                explanation: "خطأ، حرف الباء له نقطة واحدة فقط تحته (ب)."
                            },
                            {
                                id: 105,
                                type: "true_false",
                                question: "حرف الدال (د) من الحروف التي تتصل بما بعدها.",
                                options: ["صح ✓", "خطأ ✗"],
                                correctAnswer: 1,
                                points: 100,
                                timeLimit: 15,
                                explanation: "خطأ، حرف الدال من الحروف الرافسة (التي لا تتصل بما بعدها)."
                            },
                            {
                                id: 106,
                                type: "true_false",
                                question: "حرف العين (ع) يتغير شكله في وسط الكلمة.",
                                options: ["صح ✓", "خطأ ✗"],
                                correctAnswer: 0,
                                points: 90,
                                timeLimit: 15,
                                explanation: "صحيح، حرف العين يطمس في وسط الكلمة (ـعـ)."
                            },
                            {
                                id: 107,
                                type: "true_false",
                                question: "حرف التاء (ت) له نقطتان فوقه",
                                options: ["صح ✓", "خطأ ✗"],
                                correctAnswer: 0,
                                points: 80,
                                timeLimit: 10,
                                explanation: "صحيح، حرف التاء يكتب بنقطتين فوقه."
                            },

                            // Level 3: Production (Q&A)
                            {
                                id: 108,
                                type: "qa",
                                question: "اذكر كلمة تبدأ بحرف التاء (ت)؟",
                                correctAnswer: "تفاح",
                                points: 120,
                                timeLimit: 30,
                                explanation: "كلمات مثل: تفاح، تمساح، توت، تمر."
                            },
                            {
                                id: 109,
                                type: "qa",
                                question: "أكتب كلمة تبدأ بحرف الثاء (ث)؟",
                                correctAnswer: "ثعلب",
                                points: 120,
                                timeLimit: 30,
                                explanation: "كلمات مثل: ثعلب، ثوب، ثوم، ثلج."
                            },
                            {
                                id: 110,
                                type: "qa",
                                question: "ما هو الحرف الذي يأتي بعد حرف الراء؟",
                                correctAnswer: "زاي",
                                points: 150,
                                timeLimit: 20,
                                explanation: "بعد الراء يأتي حرف الزاي (ز)."
                            },

                            // Level 4: Self-Assessment
                            {
                                id: 111,
                                type: "know_dont_know",
                                question: "هل تعرف كيف تكتب حرف الجيم في وسط الكلمة؟",
                                options: ["نعم، أعرف", "لا، لا أعرف"],
                                correctAnswer: 0,
                                points: 50,
                                timeLimit: 10
                            },
                            {
                                id: 112,
                                type: "know_dont_know",
                                question: "هل تستطيع نطق حرف الضاد (ض) بشكل صحيح؟",
                                options: ["نعم، أستطيع", "أحتاج تدريب"],
                                correctAnswer: 0,
                                points: 50,
                                timeLimit: 10
                            },

                            // Level 5: Ordering
                            {
                                id: 113,
                                type: "order_questions",
                                question: "رتب الحروف التالية بالترتيب الصحيح",
                                orderItems: ["أ", "ب", "ت", "ث"],
                                points: 150,
                                timeLimit: 45
                            },
                            {
                                id: 114,
                                type: "order_questions",
                                question: "رتب حروف كلمة (كتب)",
                                orderItems: ["ك", "ت", "ب"],
                                points: 150,
                                timeLimit: 30
                            },
                            {
                                id: 115,
                                type: "order_questions",
                                question: "رتب الحروف: ج - ح - خ",
                                orderItems: ["ج", "ح", "خ"],
                                points: 100,
                                timeLimit: 30
                            },
                            {
                                id: 116,
                                type: "multiple_choice",
                                question: "كم نقطة يحمل حرف الثاء (ث)؟",
                                options: ["نقطة واحدة", "نقطتان", "ثلاث نقاط", "بدون نقاط"],
                                correctAnswer: 2,
                                points: 100,
                                timeLimit: 15,
                                explanation: "حرف الثاء (ث) يحمل ثلاث نقاط فوقه."
                            },


                            // --- Games ---

                            // 1. Realistic Matching (Forms & Analysis)
                            {
                                id: 201,
                                type: "matching",
                                question: "صل الحرف بشكله في الكلمة",
                                pairs: [
                                    { left: "عــ", right: "علم" },
                                    { left: "ـعـ", right: "ثعلب" },
                                    { left: "ـع", right: "مربع" },
                                    { left: "ع", right: "شجاع" }
                                ],
                                points: 200,
                                timeLimit: 60
                            },
                            {
                                id: 202,
                                type: "matching",
                                question: "طابق الحركة مع صوتها",
                                pairs: [
                                    { left: "بَ", right: "Ba" },
                                    { left: "بُ", right: "Bu" },
                                    { left: "بِ", right: "Bi" },
                                    { left: "بْ", right: "B" }
                                ],
                                points: 150,
                                timeLimit: 45
                            },

                            // 2. Realistic Shooting (Discrimination)
                            {
                                id: 203,
                                type: "shooting",
                                question: "🎯 اضغط على الكلمة التي فيها (مد بالألف)",
                                options: ["بَيت", "بَاب", "بِنت", "بُرج"],
                                correctAnswer: 1,
                                points: 150,
                                timeLimit: 10,
                                explanation: "كلمة (باب) تحتوي على مد بالألف."
                            },
                            {
                                id: 204,
                                type: "shooting",
                                question: "🎯 أي كلمة تبدأ بـ (ال) الشمسية؟ (التي لا ننطق اللام فيها)",
                                options: ["القمر", "الشمس", "الباب", "الورق"],
                                correctAnswer: 1, // الشمس
                                points: 200,
                                timeLimit: 12,
                                explanation: "الشمس تبدأ بلام شمسية (تكتب ولا تنطق)."
                            },

                            // 3. Realistic Puzzle (Analysis/Synthesis)
                            {
                                id: 205,
                                type: "puzzle",
                                question: "🧩 ركب الحروف لتصبح كلمة مفيدة: (ق - ل - م)",
                                options: ["م", "ل", "ق"],
                                correctAnswer: "قلم",
                                points: 150,
                                timeLimit: 30
                            },
                            {
                                id: 206,
                                type: "puzzle",
                                question: "🧩 أكمل الحرف الناقص: مـ...ـل (جمل)",
                                options: ["جـ", "حـ", "خـ"],
                                correctAnswer: "جمل",
                                points: 150,
                                timeLimit: 20
                            },
                            {
                                id: 202,
                                type: "shooting",
                                question: "🎯 أطلق النار على الحرف الذي يبدأ به اسم الصورة: (صورة تفاحة)",
                                options: ["أ", "ب", "ت", "ث"],
                                correctAnswer: 2, // Index for 'ت'
                                points: 150,
                                timeLimit: 15
                            },
                            {
                                id: 206,
                                type: "shooting",
                                question: "🎯 أطلق النار على الحرف اللثوي (نخرج طرف اللسان عند نطقه)",
                                options: ["س", "ص", "ث", "ز"],
                                correctAnswer: 2, // Index for 'ث'
                                points: 150,
                                timeLimit: 15
                            },
                            {
                                id: 209,
                                type: "shooting",
                                question: "🎯 اضغط بسرعة على الحرف الذي لا ينتمي للمجموعة (حروف بدون نقاط)",
                                options: ["ح", "د", "ر", "ز"],
                                correctAnswer: 3, // Index for 'ز' (has a dot)
                                points: 200,
                                timeLimit: 10,
                                explanation: "حرف الزاي (ز) هو الوحيد الذي له نقطة."
                            },
                            {
                                id: 210,
                                type: "shooting",
                                question: "🎯 أي حرف يُنطق بقوة (مفخم)؟",
                                options: ["ت", "س", "ط", "ك"],
                                correctAnswer: 2, // 'ط'
                                points: 150,
                                timeLimit: 12,
                                explanation: "حرف الطاء (ط) حرف مفخم وقوي، عكس التاء (ت)."
                            },

                            // 3. Puzzle Games (Construction)
                            {
                                id: 203,
                                type: "puzzle",
                                question: "🧩 رتب الحروف لتكوين كلمة (بيت)",
                                options: ["ت", "ي", "ب"],
                                correctAnswer: "بيت",
                                points: 200,
                                timeLimit: 45
                            },
                            {
                                id: 207,
                                type: "puzzle",
                                question: "🧩 رتب الحروف لتكوين كلمة (ثوب)",
                                options: ["ب", "و", "ث"],
                                correctAnswer: "ثوب",
                                points: 200,
                                timeLimit: 45
                            },
                            {
                                id: 211,
                                type: "puzzle",
                                question: "🧩 رتب الحروف لتكوين كلمة (جمل)",
                                options: ["ل", "م", "ج"],
                                correctAnswer: "جمل",
                                points: 200,
                                timeLimit: 40
                            },
                            {
                                id: 212,
                                type: "puzzle",
                                question: "🧩 كون كلمة مفيدة من: (ر - ح - ب)",
                                options: ["ر", "ح", "ب"],
                                correctAnswer: "بحر", // Or hbr, rbh etc., usually checks exact string match or order
                                points: 200,
                                timeLimit: 60
                            },

                            // 4. Wheel Spin (Random/Fun)
                            {
                                id: 204,
                                type: "wheel_spin",
                                question: "🎡 أدر العجلة لتحديد سؤالك!",
                                points: 0,
                                timeLimit: 30,
                                wheelSegments: [
                                    {
                                        label: "سؤال سهل",
                                        points: 100,
                                        question: "ما هو الحرف الأول؟",
                                        options: ["أ", "ب"],
                                        correctAnswer: 0
                                    },
                                    {
                                        label: "سؤال صعب",
                                        points: 200,
                                        question: "ما هو الحرف الأخير؟",
                                        options: ["ي", "و"],
                                        correctAnswer: 0
                                    },
                                    {
                                        label: "تحدي النطق",
                                        points: 150,
                                        question: "انطق حرف القاف (ق) بشكل صحيح",
                                        options: ["تم النطق", "لم أنطق"],
                                        correctAnswer: 0
                                    },
                                    {
                                        label: "جائزة",
                                        points: 50,
                                        question: "مبروك! حصلت على نقاط مجانية",
                                        options: ["استلام"],
                                        correctAnswer: 0
                                    },
                                    {
                                        label: "لغز",
                                        points: 250,
                                        question: "حرف موجود في الشتاء وليس في الصيف؟",
                                        options: ["ش", "ت", "ا", "ء"],
                                        correctAnswer: 0 // ش
                                    },
                                    {
                                        label: "حظ أوفر",
                                        points: 0,
                                        question: "حاول مرة أخرى",
                                        options: ["متابعة"],
                                        correctAnswer: 0
                                    }
                                ]
                            }
                        ],
                        views: 18500,
                        duration: "25 دقيقة",
                        createdAt: "2024-01-05"
                    },
                    {
                        id: 2,
                        title: "الحركات والتنوين",
                        description: "تعلم الفتحة والضمة والكسرة والسكون",
                        thumbnail: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop",
                        media: [
                            {
                                type: "video",
                                url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                                caption: "شرح الحركات الأساسية"
                            },
                            {
                                type: "text",
                                content: "**الحركات في اللغة العربية**\n\n🔸 **الفتحة (َ):** بَ - نفتح الفم قليلاً\n🔸 **الضمة (ُ):** بُ - نضم الشفتين\n🔸 **الكسرة (ِ):** بِ - نكسر الفم\n🔸 **السكون (ْ):** بْ - نوقف الحرف\n\n**التنوين:**\n• تنوين فتح (ً): كتاباً\n• تنوين ضم (ٌ): كتابٌ\n• تنوين كسر (ٍ): كتابٍ"
                            }
                        ],
                        quiz: [
                            {
                                id: 1,
                                question: "ما اسم هذه الحركة (َ)؟",
                                options: ["فتحة", "ضمة", "كسرة", "سكون"],
                                correctAnswer: 0,
                                explanation: "الفتحة تُكتب فوق الحرف وننطقها بحركة قصيرة تشبه الألف"
                            }
                        ],
                        views: 15000,
                        duration: "12 دقيقة",
                        createdAt: "2024-01-10"
                    }
                ]
            },
            {
                id: 2,
                name: "الرياضيات",
                description: "تعلم الأرقام والعد والعمليات الحسابية البسيطة",
                icon: "🔢",
                color: "#3b82f6",
                topics: [
                    {
                        id: 1,
                        title: "الأرقام من 1 إلى 10",
                        description: "تعلم الأرقام والعد بطريقة ممتعة",
                        thumbnail: "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=400&h=300&fit=crop",
                        media: [
                            {
                                type: "video",
                                url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                                caption: "أغنية الأرقام"
                            },
                            {
                                type: "image",
                                url: "https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?w=800&h=600&fit=crop",
                                caption: "الأرقام الملونة من 1 إلى 10"
                            },
                            {
                                type: "text",
                                content: "**تعلم الأرقام!**\n\n1️⃣ واحد\n2️⃣ اثنان\n3️⃣ ثلاثة\n4️⃣ أربعة\n5️⃣ خمسة\n6️⃣ ستة\n7️⃣ سبعة\n8️⃣ ثمانية\n9️⃣ تسعة\n🔟 عشرة\n\n**نصائح:**\n• اعدّ الأشياء من حولك\n• استخدم أصابعك للعد\n• العب ألعاب الأرقام"
                            }
                        ],
                        quiz: [
                            {
                                id: 1,
                                question: "ما هو الرقم الذي يأتي بعد الرقم 5؟",
                                options: ["4", "6", "7", "3"],
                                correctAnswer: 1,
                                explanation: "الرقم 6 يأتي بعد الرقم 5"
                            },
                            {
                                id: 2,
                                question: "كم عدد أصابع اليد الواحدة؟",
                                options: ["4", "5", "6", "10"],
                                correctAnswer: 1,
                                explanation: "كل يد فيها 5 أصابع"
                            }
                        ],
                        views: 20000,
                        duration: "10 دقائق",
                        createdAt: "2024-01-08"
                    },
                    {
                        id: 2,
                        title: "جمع الأرقام البسيطة",
                        description: "تعلم عملية الجمع بطريقة سهلة",
                        thumbnail: "https://images.unsplash.com/photo-1596495577886-d920f1fb7238?w=400&h=300&fit=crop",
                        media: [
                            {
                                type: "video",
                                url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                                caption: "شرح عملية الجمع"
                            },
                            {
                                type: "text",
                                content: "**الجمع سهل وممتع!**\n\n➕ **ما هو الجمع؟**\nالجمع هو وضع أشياء مع بعضها للحصول على العدد الكلي.\n\n**أمثلة:**\n🍎 + 🍎 = 🍎🍎 (1 + 1 = 2)\n🍎🍎 + 🍎 = 🍎🍎🍎 (2 + 1 = 3)\n\n**نصائح:**\n• استخدم أصابعك\n• اجمع الأشياء الحقيقية\n• تدرب كل يوم"
                            }
                        ],
                        quiz: [
                            {
                                id: 1,
                                question: "ما ناتج 2 + 2؟",
                                options: ["3", "4", "5", "6"],
                                correctAnswer: 1,
                                explanation: "2 + 2 = 4"
                            },
                            {
                                id: 2,
                                question: "ما ناتج 3 + 1؟",
                                options: ["2", "3", "4", "5"],
                                correctAnswer: 2,
                                explanation: "3 + 1 = 4"
                            }
                        ],
                        views: 17000,
                        duration: "8 دقائق",
                        createdAt: "2024-01-12"
                    }
                ]
            },
            {
                id: 3,
                name: "العلوم",
                description: "اكتشف عجائب العالم من حولك",
                icon: "🔬",
                color: "#8b5cf6",
                topics: [
                    {
                        id: 1,
                        title: "الحواس الخمس",
                        description: "تعرف على حواسك الخمس وكيف تستخدمها",
                        thumbnail: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=300&fit=crop",
                        media: [
                            {
                                type: "video",
                                url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                                caption: "أغنية الحواس الخمس"
                            },
                            {
                                type: "image",
                                url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop",
                                caption: "الحواس الخمس"
                            },
                            {
                                type: "text",
                                content: "**الحواس الخمس**\n\n👁️ **البصر:** نرى بالعينين\n👂 **السمع:** نسمع بالأذنين\n👃 **الشّم:** نشمّ بالأنف\n👅 **التذوق:** نتذوق باللسان\n✋ **اللمس:** نلمس بالجلد\n\n**نشاط ممتع:**\nاغمض عينيك وحاول التعرف على الأشياء باللمس!"
                            }
                        ],
                        quiz: [
                            {
                                id: 1,
                                question: "بماذا نرى الأشياء؟",
                                options: ["الأذنين", "العينين", "الأنف", "اللسان"],
                                correctAnswer: 1,
                                explanation: "نستخدم العينين للرؤية"
                            },
                            {
                                id: 2,
                                question: "كم عدد الحواس عند الإنسان؟",
                                options: ["3", "4", "5", "6"],
                                correctAnswer: 2,
                                explanation: "للإنسان خمس حواس"
                            }
                        ],
                        views: 14000,
                        duration: "10 دقائق",
                        createdAt: "2024-01-15"
                    }
                ]
            }
        ]
    },
    {
        id: 2,
        name: "الصف الثالث الابتدائي",
        slug: "grade-3-primary",
        level: "ابتدائي",
        description: "تطوير المهارات الأساسية والتفكير النقدي",
        coverImage: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1200&h=400&fit=crop",
        icon: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200&h=200&fit=crop",
        studentsCount: 98000,
        verified: true,
        subjects: [
            {
                id: 1,
                name: "الرياضيات",
                description: "الضرب والقسمة والكسور",
                icon: "🔢",
                color: "#3b82f6",
                topics: [
                    {
                        id: 1,
                        title: "جدول الضرب",
                        description: "تعلم جدول الضرب بطريقة ممتعة",
                        thumbnail: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=300&fit=crop",
                        media: [
                            {
                                type: "video",
                                url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                                caption: "أغنية جدول الضرب"
                            },
                            {
                                type: "image",
                                url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&h=600&fit=crop",
                                caption: "جدول الضرب الملون"
                            },
                            {
                                type: "text",
                                content: "**حفظ جدول الضرب أصبح سهلاً!**\n\n🔢 **جدول 2:** الضعف دائماً!\n🔢 **جدول 5:** ينتهي بـ 0 أو 5\n🔢 **جدول 10:** أضف صفراً!\n🔢 **جدول 9:** مجموع الأرقام = 9\n\n**مثال:** 9 × 7 = 63 (6 + 3 = 9) ✓"
                            }
                        ],
                        quiz: [
                            {
                                id: 1,
                                question: "ما ناتج 7 × 8؟",
                                options: ["54", "56", "58", "64"],
                                correctAnswer: 1,
                                explanation: "7 × 8 = 56"
                            },
                            {
                                id: 2,
                                question: "ما ناتج 9 × 6؟",
                                options: ["45", "54", "63", "36"],
                                correctAnswer: 1,
                                explanation: "9 × 6 = 54، ولاحظ أن 5 + 4 = 9!"
                            }
                        ],
                        views: 25000,
                        duration: "15 دقيقة",
                        createdAt: "2024-01-12"
                    }
                ]
            }
        ]
    },
    {
        id: 3,
        name: "الصف الأول المتوسط",
        slug: "grade-7-middle",
        level: "متوسط",
        description: "المرحلة المتوسطة - بناء المعرفة العلمية والأدبية",
        coverImage: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&h=400&fit=crop",
        icon: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=200&h=200&fit=crop",
        studentsCount: 75000,
        verified: true,
        subjects: [
            {
                id: 1,
                name: "العلوم",
                description: "علم الأحياء والكيمياء والفيزياء",
                icon: "🔬",
                color: "#8b5cf6",
                topics: [
                    {
                        id: 1,
                        title: "الخلية ومكوناتها",
                        description: "تعرف على وحدة بناء الكائنات الحية",
                        thumbnail: "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=400&h=300&fit=crop",
                        media: [
                            {
                                type: "video",
                                url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                                caption: "رحلة داخل الخلية"
                            },
                            {
                                type: "text",
                                content: "**الخلية - وحدة البناء الأساسية**\n\n🧬 **مكونات الخلية:**\n• النواة: مركز القيادة\n• السيتوبلازم: المادة الهلامية\n• الغشاء الخلوي: الحماية الخارجية\n• الميتوكوندريا: مصنع الطاقة\n\n**هل تعلم؟**\nجسم الإنسان يحتوي على أكثر من 37 تريليون خلية!"
                            }
                        ],
                        quiz: [
                            {
                                id: 1,
                                question: "ما هو مركز القيادة في الخلية؟",
                                options: ["السيتوبلازم", "النواة", "الغشاء", "الميتوكوندريا"],
                                correctAnswer: 1,
                                explanation: "النواة هي مركز القيادة وتحتوي على المادة الوراثية"
                            }
                        ],
                        views: 32000,
                        duration: "20 دقيقة",
                        createdAt: "2024-01-18"
                    }
                ]
            }
        ]
    }
];

// Helper function to get grade by ID
export const getGradeById = (id: number): Grade | undefined => {
    return gradesData.find(grade => grade.id === id);
};

// Helper function to get grade by slug
export const getGradeBySlug = (slug: string): Grade | undefined => {
    return gradesData.find(grade => grade.slug === slug);
};

// Helper function to get subject by ID within a grade
export const getSubjectById = (gradeId: number, subjectId: number): Subject | undefined => {
    const grade = getGradeById(gradeId);
    return grade?.subjects.find(subject => subject.id === subjectId);
};

// Helper function to get topic by ID
export const getTopicById = (gradeId: number, subjectId: number, topicId: number): Topic | undefined => {
    const subject = getSubjectById(gradeId, subjectId);
    return subject?.topics.find(topic => topic.id === topicId);
};

// Get all unique grade levels
export const getGradeLevels = (): string[] => {
    const levels = gradesData.map(grade => grade.level);
    return ["الكل", ...Array.from(new Set(levels))];
};

// Get total content count
export const getTotalTopicsCount = (): number => {
    return gradesData.reduce((total, grade) => {
        return total + grade.subjects.reduce((subTotal, subject) => {
            return subTotal + subject.topics.length;
        }, 0);
    }, 0);
};

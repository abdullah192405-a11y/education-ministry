// Channel Owner Types
export type ChannelType = "ministry" | "school" | "organization" | "company" | "individual";

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

// Educational Content within a Channel
export interface EducationalContent {
    id: number;
    title: string;
    description: string;
    thumbnail: string;
    media: ContentMedia[];
    quiz: QuizQuestion[];
    challengeItems?: ChallengeQuestion[]; // New field for rich content
    views: number;
    duration?: string;
    targetAudience: "all" | "children" | "adults";
    createdAt: string;
}

// Channel (Organization) Data
export interface Channel {
    id: number;
    name: string;
    slug: string;
    type: ChannelType;
    logo: string;
    coverImage: string;
    description: string;
    aboutOwner: string;
    category: string;
    followers: number;
    rating: number;
    verified: boolean;
    contactInfo?: {
        website?: string;
        email?: string;
        phone?: string;
    };
    socialLinks?: {
        twitter?: string;
        instagram?: string;
        youtube?: string;
    };
    contents: EducationalContent[];
}

// Helper to get channel type labels in Arabic
export const getChannelTypeLabel = (type: ChannelType): string => {
    switch (type) {
        case "ministry":
            return "وزارة";
        case "school":
            return "مدرسة";
        case "organization":
            return "منظمة";
        case "company":
            return "شركة";
        case "individual":
            return "فردي";
    }
};

// Sample Channels Data
export const channelsData: Channel[] = [
    {
        id: 1,
        name: "قناة وزارة الصحة",
        slug: "ministry-of-health",
        type: "ministry",
        logo: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=200&h=200&fit=crop",
        coverImage: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=400&fit=crop",
        description: "القناة الرسمية لوزارة الصحة - توعية صحية شاملة لجميع أفراد المجتمع",
        aboutOwner: "وزارة الصحة السعودية هي الجهة الحكومية المسؤولة عن الرعاية الصحية في المملكة العربية السعودية. تأسست عام 1950م وتسعى لتقديم خدمات صحية متميزة وتوعية صحية شاملة لجميع المواطنين والمقيمين.",
        category: "صحة",
        followers: 125000,
        rating: 4.9,
        verified: true,
        contactInfo: {
            website: "https://www.moh.gov.sa",
            email: "info@moh.gov.sa",
            phone: "920033333"
        },
        socialLinks: {
            twitter: "@SaudiMOH",
            instagram: "@saudi_moh"
        },
        contents: [
            {
                id: 1,
                title: "كيف نحمي أنفسنا من الجراثيم",
                description: "تعلم الطرق الصحيحة لحماية نفسك وعائلتك من الجراثيم والأمراض المعدية",
                thumbnail: "https://images.unsplash.com/photo-1584362917165-526a968579e8?w=400&h=300&fit=crop",
                media: [
                    {
                        type: "video",
                        url: "https://www.youtube.com/embed/3-3yrr5p5xA?si=qIzvgSxBzOTn0PRV",
                        caption: "فيديو توعوي عن غسل اليدين بالطريقة الصحيحة"
                    },
                    {
                        type: "image",
                        url: "https://www.moh.gov.sa/Ministry/MediaCenter/News/PublishingImages/sNews-2020-03-03-005.jpg?w=800&h=600&fit=crop",
                        caption: "خطوات غسل اليدين السبع"
                    },
                    {
                        type: "text",
                        content: "الجراثيم هي كائنات دقيقة لا يمكن رؤيتها بالعين المجردة، وتشمل البكتيريا والفيروسات والفطريات. تنتقل الجراثيم عن طريق اللمس والعطس والسعال والأسطح الملوثة.\n\n**نصائح للوقاية:**\n1. اغسل يديك بالماء والصابون لمدة 20 ثانية على الأقل\n2. تجنب لمس وجهك بيديك غير المغسولتين\n3. غطِّ فمك وأنفك عند العطس أو السعال\n4. نظّف الأسطح المستخدمة بانتظام\n5. احرص على التهوية الجيدة للأماكن المغلقة"
                    },
                    {
                        type: "image",
                        url: "https://www.aljazeera.net/wp-content/uploads/2018/12/bd07d671-412b-4de9-9327-b3a69f4c9a7c.jpeg?quality=80?w=800&h=auto&fit=crop",
                        caption: "أماكن تواجد الجراثيم الشائعة"
                    },
                    {
                        type: "video",
                        url: "https://www.youtube.com/embed/e7yRGD0HK4w",
                        caption: "قصة الجراثيم للأطفال - كيف تنتقل؟"
                    },
                    {
                        type: "image",
                        url: "https://mp.moonpreneur.com/blog/wp-content/uploads/2023/03/infographic-for-kids.jpg?w=800&h=600&fit=crop",
                        caption: "أهمية المعقمات ومتى نستخدمها"
                    },
                    {
                        type: "video",
                        url: "https://www.youtube.com/embed/RVW_owHkj-I",
                        caption: "أغنية النظافة - تعليمي وممتع"
                    },
                    {
                        type: "image",
                        url: "https://cdn.al-ain.com/images/2020/4/14/78-155140-coronavirus-infograph-muzzle_700x400.jpg?w=800&h=600&fit=crop",
                        caption: "كيفية ارتداء الكمامة بشكل صحيح"
                    },
                    {
                        type: "text",
                        content: "**حقائق مدهشة عن الجراثيم!**\n\n🦠 **هل تعلم؟**\n- توجد جراثيم في جسم الإنسان أكثر من عدد خلايا الجسم نفسه!\n- معظم الجراثيم غير ضارة، بل وبعضها مفيد جداً للهضم.\n- يمكن للجراثيم أن تعيش على الأسطح الصلبة لعدة أيام.\n- الهاتف المحمول قد يحمل جراثيم أكثر من مقعد المرحاض! لذا عقمه بانتظام."
                    }
                ],
                quiz: [
                    {
                        id: 1,
                        question: "كم ثانية يجب غسل اليدين بالماء والصابون؟",
                        options: ["5 ثواني", "10 ثواني", "20 ثانية", "دقيقة كاملة"],
                        correctAnswer: 2,
                        explanation: "غسل اليدين لمدة 20 ثانية على الأقل يضمن القضاء على معظم الجراثيم"
                    },
                    {
                        id: 2,
                        question: "أي من التالي لا يُعد طريقة انتقال للجراثيم؟",
                        options: ["العطس", "اللمس", "التفكير", "السعال"],
                        correctAnswer: 2,
                        explanation: "التفكير عملية ذهنية ولا تنقل الجراثيم، بينما العطس واللمس والسعال من طرق انتقال الجراثيم"
                    },
                    {
                        id: 3,
                        question: "ما الذي يجب تغطيته عند العطس؟",
                        options: ["العينين فقط", "الفم والأنف", "الأذنين", "لا شيء"],
                        correctAnswer: 1,
                        explanation: "تغطية الفم والأنف عند العطس يمنع انتشار الرذاذ المحمل بالجراثيم"
                    },
                    {
                        id: 4,
                        question: "ما هو أفضل بديل للماء والصابون إذا لم يتوفرا؟",
                        options: ["المعقم الكحولي", "الماء فقط", "المسح بالملابس", "النفخ على اليدين"],
                        correctAnswer: 0,
                        explanation: "المعقم الذي يحتوي على 60% كحول على الأقل هو أفضل بديل"
                    },
                    {
                        id: 5,
                        question: "هل تعيش الجراثيم على الهواتف المحمولة؟",
                        options: ["لا، أبداً", "نعم، وبكثرة", "فقط في الشتاء", "فقط إذا كانت قديمة"],
                        correctAnswer: 1,
                        explanation: "نعم، الهواتف المحمولة بيئة خصبة للجراثيم ويجب تعقيمها بانتظام"
                    },
                    {
                        id: 6,
                        question: "لماذا لا يجب مشاركة فرشاة الأسنان؟",
                        options: ["لأنها غالية", "لأنها تنقل الجراثيم", "لأن لونها سيتغير", "لا يوجد سبب"],
                        correctAnswer: 1,
                        explanation: "مشاركة أدوات العناية الشخصية من أسهل طرق نقل العدوى"
                    },
                    {
                        id: 7,
                        question: "أي من هذه الأطعمة يقوي المناعة؟",
                        options: ["الحلويات", "المشروبات الغازية", "البرتقال والليمون", "البطاطس المقلية"],
                        correctAnswer: 2,
                        explanation: "الحمضيات غنية بفيتامين سي الذي يعزز جهاز المناعة"
                    }
                ],
                views: 45000,
                duration: "8 دقائق",
                targetAudience: "all",
                createdAt: "2024-01-15"
            },
            {
                id: 2,
                title: "التغذية الصحية للأطفال",
                description: "دليلك الشامل لتغذية طفلك بطريقة صحية ومتوازنة",
                thumbnail: "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400&h=300&fit=crop",
                media: [
                    {
                        type: "image",
                        url: "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=800&h=600&fit=crop",
                        caption: "هرم الغذاء الصحي للأطفال"
                    },
                    {
                        type: "text",
                        content: "التغذية السليمة في مرحلة الطفولة أساسية للنمو الصحي والتطور السليم.\n\n**العناصر الغذائية الأساسية:**\n- **البروتينات:** لبناء العضلات والأنسجة\n- **الكربوهيدرات:** للطاقة والنشاط\n- **الفيتامينات:** لتقوية المناعة\n- **المعادن:** لصحة العظام والأسنان\n\n**نصائح مهمة:**\n• قدّم وجبات متنوعة وملونة\n• اجعل الفواكه والخضروات جزءاً أساسياً\n• قلل من السكريات والوجبات السريعة\n• شجع شرب الماء والحليب"
                    }
                ],
                quiz: [
                    {
                        id: 1,
                        question: "ما هو العنصر الغذائي المسؤول عن بناء العضلات؟",
                        options: ["الكربوهيدرات", "البروتينات", "الدهون", "السكريات"],
                        correctAnswer: 1,
                        explanation: "البروتينات هي اللبنة الأساسية لبناء العضلات والأنسجة في الجسم"
                    },
                    {
                        id: 2,
                        question: "أي من التالي يجب تقليله في غذاء الأطفال؟",
                        options: ["الفواكه", "الخضروات", "السكريات", "الماء"],
                        correctAnswer: 2,
                        explanation: "السكريات الزائدة تسبب السمنة وتسوس الأسنان ومشاكل صحية أخرى"
                    }
                ],
                views: 32000,
                duration: "6 دقائق",
                targetAudience: "all",
                createdAt: "2024-01-10"
            },
            {
                id: 3,
                title: "أهمية ممارسة الرياضة",
                description: "اكتشف فوائد الرياضة لصحتك الجسدية والنفسية",
                thumbnail: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
                media: [
                    {
                        type: "video",
                        url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                        caption: "تمارين بسيطة يمكن ممارستها يومياً"
                    },
                    {
                        type: "text",
                        content: "الرياضة ليست مجرد نشاط بدني، بل هي أسلوب حياة صحي.\n\n**فوائد الرياضة:**\n1. تقوية القلب والأوعية الدموية\n2. الحفاظ على وزن صحي\n3. تحسين المزاج وتقليل التوتر\n4. تقوية العظام والعضلات\n5. تحسين جودة النوم\n\n**نصائح للمبتدئين:**\n• ابدأ بتمارين خفيفة\n• مارس الرياضة 30 دقيقة يومياً\n• اختر نشاطاً تستمتع به\n• اشرب الماء بكثرة"
                    }
                ],
                quiz: [
                    {
                        id: 1,
                        question: "كم دقيقة يُنصح بممارسة الرياضة يومياً؟",
                        options: ["5 دقائق", "30 دقيقة", "ساعتين", "لا يهم"],
                        correctAnswer: 1,
                        explanation: "30 دقيقة من النشاط البدني المعتدل يومياً كافية للحفاظ على صحة جيدة"
                    }
                ],
                views: 28000,
                duration: "5 دقائق",
                targetAudience: "all",
                createdAt: "2024-01-08"
            }
        ]
    },
    {
        id: 2,
        name: "مدرسة النور الابتدائية",
        slug: "alnoor-school",
        type: "school",
        logo: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200&h=200&fit=crop",
        coverImage: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&h=400&fit=crop",
        description: "مدرسة النور الابتدائية - نبني جيلاً واعياً ومتعلماً",
        aboutOwner: "مدرسة النور الابتدائية هي مؤسسة تعليمية رائدة تأسست عام 1990م. نسعى لتقديم تعليم متميز يجمع بين المناهج الحديثة والقيم الإسلامية، مع التركيز على التعلم التفاعلي والإبداعي.",
        category: "تعليم",
        followers: 5600,
        rating: 4.8,
        verified: true,
        contactInfo: {
            email: "info@alnoor-school.edu.sa",
            phone: "0112345678"
        },
        contents: [
            {
                id: 1,
                title: "جدول الضرب بطريقة ممتعة",
                description: "تعلم جدول الضرب بأساليب مبتكرة وممتعة للأطفال",
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
                        content: "**حفظ جدول الضرب أصبح سهلاً!**\n\nجدول الضرب هو أساس الرياضيات. إليك بعض الحيل:\n\n🔢 **جدول 2:** الضعف دائماً!\n🔢 **جدول 5:** ينتهي بـ 0 أو 5\n🔢 **جدول 10:** أضف صفراً!\n🔢 **جدول 9:** مجموع الأرقام = 9\n\n**مثال:** 9 × 7 = 63 (6 + 3 = 9) ✓"
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
                    },
                    {
                        id: 3,
                        question: "ما ناتج 5 × 12؟",
                        options: ["50", "55", "60", "65"],
                        correctAnswer: 2,
                        explanation: "5 × 12 = 60"
                    }
                ],
                views: 12500,
                duration: "10 دقائق",
                targetAudience: "children",
                createdAt: "2024-01-12"
            },
            {
                id: 2,
                title: "حروف الهجاء العربية",
                description: "تعلم الحروف العربية بالصور والأمثلة",
                thumbnail: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop",
                media: [
                    {
                        type: "image",
                        url: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&h=600&fit=crop",
                        caption: "الحروف العربية الـ 28"
                    },
                    {
                        type: "text",
                        content: "**الحروف الهجائية العربية**\n\nاللغة العربية تتكون من 28 حرفاً:\n\nأ ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن هـ و ي\n\n**نصائح للحفظ:**\n• اربط كل حرف بصورة\n• تدرب على الكتابة يومياً\n• اقرأ قصصاً بسيطة"
                    }
                ],
                quiz: [
                    {
                        id: 1,
                        question: "كم عدد الحروف الهجائية العربية؟",
                        options: ["26 حرفاً", "28 حرفاً", "30 حرفاً", "32 حرفاً"],
                        correctAnswer: 1,
                        explanation: "الحروف الهجائية العربية 28 حرفاً"
                    },
                    {
                        id: 2,
                        question: "ما هو أول حرف في الأبجدية العربية؟",
                        options: ["ب", "أ", "ت", "ث"],
                        correctAnswer: 1,
                        explanation: "الألف (أ) هو أول حرف في الأبجدية العربية"
                    }
                ],
                views: 18000,
                duration: "15 دقيقة",
                targetAudience: "children",
                createdAt: "2024-01-05"
            }
        ]
    },
    {
        id: 3,
        name: "جمعية حماية البيئة",
        slug: "environment-protection",
        type: "organization",
        logo: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&h=200&fit=crop",
        coverImage: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=1200&h=400&fit=crop",
        description: "نعمل معاً من أجل بيئة نظيفة ومستدامة للأجيال القادمة",
        aboutOwner: "جمعية حماية البيئة هي منظمة غير ربحية تعمل على نشر الوعي البيئي وحماية الموارد الطبيعية. تأسست عام 2010م وتنظم حملات توعوية وبرامج تطوعية لحماية البيئة.",
        category: "بيئة",
        followers: 34000,
        rating: 4.7,
        verified: true,
        contactInfo: {
            website: "https://www.env-protect.org.sa",
            email: "contact@env-protect.org.sa"
        },
        socialLinks: {
            twitter: "@EnvProtectSA",
            instagram: "@envprotect_sa"
        },
        contents: [
            {
                id: 1,
                title: "إعادة التدوير في المنزل",
                description: "تعلم كيف تعيد تدوير النفايات وتحمي البيئة من منزلك",
                thumbnail: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&h=300&fit=crop",
                media: [
                    {
                        type: "video",
                        url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                        caption: "دليل إعادة التدوير المنزلي"
                    },
                    {
                        type: "image",
                        url: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&h=600&fit=crop",
                        caption: "ألوان حاويات إعادة التدوير"
                    },
                    {
                        type: "text",
                        content: "**إعادة التدوير سهلة وممتعة!**\n\n♻️ **الألوان والمعاني:**\n- 🔵 **أزرق:** الورق والكرتون\n- 🟢 **أخضر:** الزجاج\n- 🟡 **أصفر:** البلاستيك والمعادن\n- 🔴 **أحمر:** النفايات الخطرة\n\n**خطوات بسيطة:**\n1. افصل النفايات في المنزل\n2. اغسل العلب قبل التدوير\n3. أزل الأغطية البلاستيكية\n4. اطوِ الكراتين لتوفير المساحة"
                    }
                ],
                quiz: [
                    {
                        id: 1,
                        question: "ما لون الحاوية المخصصة للورق والكرتون؟",
                        options: ["أخضر", "أصفر", "أزرق", "أحمر"],
                        correctAnswer: 2,
                        explanation: "الحاوية الزرقاء مخصصة للورق والكرتون"
                    },
                    {
                        id: 2,
                        question: "ماذا يجب أن تفعل قبل وضع العلب في حاوية التدوير؟",
                        options: ["كسرها", "غسلها", "طيّها", "حرقها"],
                        correctAnswer: 1,
                        explanation: "غسل العلب يمنع الروائح الكريهة ويسهّل عملية التدوير"
                    }
                ],
                views: 22000,
                duration: "7 دقائق",
                targetAudience: "all",
                createdAt: "2024-01-14"
            },
            {
                id: 2,
                title: "ترشيد استهلاك المياه",
                description: "نصائح ذهبية للحفاظ على المياه في منزلك",
                thumbnail: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=300&fit=crop",
                media: [
                    {
                        type: "image",
                        url: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&h=600&fit=crop",
                        caption: "قطرة ماء = حياة"
                    },
                    {
                        type: "text",
                        content: "**المياه ثروة لا تُقدّر بثمن**\n\n💧 **نصائح للترشيد:**\n\n1. **في الحمام:**\n   - أغلق الصنبور أثناء تنظيف أسنانك\n   - استخدم الدش بدل البانيو\n   - أصلح التسريبات فوراً\n\n2. **في المطبخ:**\n   - لا تغسل الصحون تحت الماء الجاري\n   - استخدم غسالة الصحون عند امتلائها فقط\n\n3. **في الحديقة:**\n   - اسقِ النباتات صباحاً أو مساءً\n   - استخدم نظام الري بالتنقيط"
                    }
                ],
                quiz: [
                    {
                        id: 1,
                        question: "متى أفضل وقت لسقي النباتات؟",
                        options: ["الظهيرة", "الصباح أو المساء", "أي وقت", "منتصف الليل"],
                        correctAnswer: 1,
                        explanation: "السقي صباحاً أو مساءً يقلل من تبخر المياه"
                    }
                ],
                views: 18500,
                duration: "5 دقائق",
                targetAudience: "all",
                createdAt: "2024-01-11"
            }
        ]
    },
    {
        id: 4,
        name: "هيئة الأمن السيبراني",
        slug: "cyber-security",
        type: "organization",
        logo: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=200&h=200&fit=crop",
        coverImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&h=400&fit=crop",
        description: "نشر الوعي بالأمن السيبراني وحماية المستخدمين في الفضاء الرقمي",
        aboutOwner: "الهيئة الوطنية للأمن السيبراني هي الجهة المختصة بالأمن السيبراني في المملكة، والمرجع الوطني في شؤونه. تهدف إلى تعزيز حماية الشبكات وأنظمة المعلومات وتقنياتها.",
        category: "تقنية",
        followers: 89000,
        rating: 4.9,
        verified: true,
        contactInfo: {
            website: "https://www.nca.gov.sa",
            email: "info@nca.gov.sa"
        },
        contents: [
            {
                id: 1,
                title: "كيف تحمي حساباتك من الاختراق",
                description: "دليلك الشامل لحماية حساباتك وبياناتك الشخصية على الإنترنت",
                thumbnail: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&h=300&fit=crop",
                media: [
                    {
                        type: "video",
                        url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                        caption: "خطوات حماية حساباتك"
                    },
                    {
                        type: "image",
                        url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=600&fit=crop",
                        caption: "قوة كلمات المرور"
                    },
                    {
                        type: "text",
                        content: "**احمِ نفسك في العالم الرقمي!**\n\n🔐 **كلمات المرور القوية:**\n- استخدم 12 حرفاً على الأقل\n- اجمع بين الأحرف والأرقام والرموز\n- لا تستخدم معلومات شخصية\n- غيّر كلمة المرور بانتظام\n\n🛡️ **التحقق بخطوتين:**\n- فعّله على جميع حساباتك\n- استخدم تطبيقات المصادقة\n\n⚠️ **التصيّد الإلكتروني:**\n- لا تفتح روابط مشبوهة\n- تأكد من عنوان المرسل\n- لا تشارك بياناتك عبر الإيميل"
                    }
                ],
                quiz: [
                    {
                        id: 1,
                        question: "ما الحد الأدنى المُوصى به لطول كلمة المرور؟",
                        options: ["6 أحرف", "8 أحرف", "12 حرفاً", "4 أحرف"],
                        correctAnswer: 2,
                        explanation: "يُنصح بأن تكون كلمة المرور 12 حرفاً على الأقل لتكون قوية"
                    },
                    {
                        id: 2,
                        question: "ما هو التحقق بخطوتين؟",
                        options: ["كلمتا مرور", "رمز إضافي بعد كلمة المرور", "سؤال أمان", "بصمة فقط"],
                        correctAnswer: 1,
                        explanation: "التحقق بخطوتين يضيف طبقة حماية إضافية برمز يُرسل لهاتفك"
                    },
                    {
                        id: 3,
                        question: "ما الذي يجب تجنبه في كلمات المرور؟",
                        options: ["الأرقام", "الرموز", "المعلومات الشخصية", "الأحرف الكبيرة"],
                        correctAnswer: 2,
                        explanation: "استخدام المعلومات الشخصية يسهّل تخمين كلمة المرور"
                    }
                ],
                views: 67000,
                duration: "12 دقيقة",
                targetAudience: "all",
                createdAt: "2024-01-16"
            }
        ]
    },
    {
        id: 5,
        name: "أكاديمية المستقبل",
        slug: "future-academy",
        type: "company",
        logo: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=200&h=200&fit=crop",
        coverImage: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&h=400&fit=crop",
        description: "منصة تعليمية رقمية تقدم محتوى تعليمي متميز للجميع",
        aboutOwner: "أكاديمية المستقبل هي شركة تعليمية ناشئة تهدف لتوفير التعليم المتميز للجميع عبر تقنيات التعلم الحديثة والمحتوى التفاعلي.",
        category: "تعليم",
        followers: 28000,
        rating: 4.6,
        verified: true,
        contents: [
            {
                id: 1,
                title: "أساسيات البرمجة للمبتدئين",
                description: "ابدأ رحلتك في عالم البرمجة من الصفر",
                thumbnail: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=300&fit=crop",
                media: [
                    {
                        type: "video",
                        url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                        caption: "مقدمة في البرمجة"
                    },
                    {
                        type: "text",
                        content: "**ما هي البرمجة؟**\n\nالبرمجة هي طريقة للتواصل مع الكمبيوتر وإعطائه تعليمات لتنفيذ مهام محددة.\n\n**💻 لماذا نتعلم البرمجة؟**\n- تطوير التفكير المنطقي\n- إنشاء تطبيقات ومواقع\n- فرص عمل رائعة\n- حل المشكلات بطرق إبداعية\n\n**🔤 المفاهيم الأساسية:**\n1. **المتغيرات:** صناديق لتخزين البيانات\n2. **الشروط:** اتخاذ قرارات (إذا...فـ)\n3. **الحلقات:** تكرار المهام\n4. **الدوال:** كتل من الكود قابلة لإعادة الاستخدام"
                    }
                ],
                quiz: [
                    {
                        id: 1,
                        question: "ما هي المتغيرات في البرمجة؟",
                        options: ["أوامر ثابتة", "صناديق لتخزين البيانات", "ألوان الشاشة", "نوع الكمبيوتر"],
                        correctAnswer: 1,
                        explanation: "المتغيرات تعمل كصناديق تخزين للبيانات المختلفة"
                    },
                    {
                        id: 2,
                        question: "ماذا تفعل الحلقات في البرمجة؟",
                        options: ["تحذف الملفات", "تكرر المهام", "تغلق البرنامج", "تفتح الإنترنت"],
                        correctAnswer: 1,
                        explanation: "الحلقات تسمح بتكرار نفس المهمة عدة مرات"
                    }
                ],
                views: 41000,
                duration: "20 دقيقة",
                targetAudience: "all",
                createdAt: "2024-01-13"
            }
        ]
    }
];

// Helper function to get channel by ID
export const getChannelById = (id: number): Channel | undefined => {
    return channelsData.find(channel => channel.id === id);
};

// Helper function to get channel by slug
export const getChannelBySlug = (slug: string): Channel | undefined => {
    return channelsData.find(channel => channel.slug === slug);
};

// Helper function to get content by ID within a channel
export const getContentById = (channelId: number, contentId: number): EducationalContent | undefined => {
    const channel = getChannelById(channelId);
    return channel?.contents.find(content => content.id === contentId);
};

// Get all unique categories
export const getCategories = (): string[] => {
    const categories = channelsData.map(channel => channel.category);
    return ["الكل", ...Array.from(new Set(categories))];
};

export type ReportLanguage = "ar" | "en";

export type ChallengeReportLabels = {
    lang: string;
    dir: "rtl" | "ltr";
    locale: string;
    defaultTitle: string;
    eyebrow: string;
    footerPlatform: string;
    footerRegion: string;
    metrics: {
        totalAttempts: string;
        avgPercent: string;
        avgPoints: string;
        maxPoints: string;
        registeredMembers: string;
        guests: string;
    };
    meta: {
        lessonName: string;
        className: string;
        subject: string;
        teacherName: string;
        date: string;
        time: string;
        generatedAt: string;
    };
    sections: {
        lessonRating: string;
        lessonRatingSummary: string;
        lessonRatingSummaryLine: string;
        additionalAnalysis: string;
        educationalRecommendations: string;
        recommendationsKicker: string;
        chartsAndIndicators: string;
        participantsLog: string;
        questionAnalysis: string;
    };
    recommendation: {
        priority: string;
        timeframe: string;
        dataEvidence: string;
        suggestedActions: string;
        successIndicators: string;
    };
    charts: {
        participantType: string;
        answerOutcomes: string;
        scoreDistribution: string;
        topScores: string;
        questionAccuracy: string;
        avgQuestionTime: string;
        scoreDistributionSummary: string;
        learnerSegments: string;
        questionDifficulty: string;
        weeklyTrend: string;
        weeklyTrendSub: string;
        timeVsScore: string;
        timeVsScoreSub: string;
        lessTime: string;
        moreTime: string;
        total: string;
        average: string;
        showsTopN: string;
        showsFirstN: string;
        secSuffix: string;
    };
    participantsTable: {
        rank: string;
        participant: string;
        percent: string;
        points: string;
        correct: string;
        wrong: string;
        time: string;
        type: string;
        registered: string;
        guest: string;
        empty: string;
    };
    questionsTable: {
        question: string;
        accuracy: string;
        correct: string;
        total: string;
    };
    csv: {
        field: string;
        value: string;
        topicTitle: string;
        note: string;
        participants: string;
        lessonRating: string;
        totalRatings: string;
        avgOutOf5: string;
        emoji: string;
        label: string;
        count: string;
        percent: string;
        questionAnalysis: string;
        questionTextShort: string;
        accuracyPct: string;
        totalAnswers: string;
        recommendations: string;
    };
};

const ar: ChallengeReportLabels = {
    lang: "ar",
    dir: "rtl",
    locale: "ar-SA",
    defaultTitle: "تقرير التحدي",
    eyebrow: "تقرير أداء التحدي التعليمي",
    footerPlatform: "منصة lab4",
    footerRegion: "المملكة العربية السعودية",
    metrics: {
        totalAttempts: "إجمالي المحاولات",
        avgPercent: "متوسط النسبة",
        avgPoints: "متوسط النقاط",
        maxPoints: "أعلى نقاط",
        registeredMembers: "أعضاء مسجلون",
        guests: "زوار",
    },
    meta: {
        lessonName: "اسم الدرس",
        className: "اسم الصف / الفصل",
        subject: "المادة",
        teacherName: "اسم المعلم",
        date: "التاريخ",
        time: "الوقت",
        generatedAt: "تم الإنشاء",
    },
    sections: {
        lessonRating: "تقييم الدرس",
        lessonRatingSummary: "تقييم — المتوسط",
        lessonRatingSummaryLine: "{count} تقييم — المتوسط {avg} / 5",
        additionalAnalysis: "تحليل إضافي",
        educationalRecommendations: "توصيات تعليمية",
        recommendationsKicker: "تقرير توصيات مهني مولّد من تحليل النتائج",
        chartsAndIndicators: "الرسوم والمؤشرات",
        participantsLog: "سجل المشاركين والنتائج",
        questionAnalysis: "تحليل الأسئلة",
    },
    recommendation: {
        priority: "الأولوية",
        timeframe: "الزمن",
        dataEvidence: "الدليل من البيانات",
        suggestedActions: "الإجراءات المقترحة",
        successIndicators: "مؤشرات النجاح",
    },
    charts: {
        participantType: "نوع المشاركين",
        answerOutcomes: "نتائج الإجابات",
        scoreDistribution: "توزيع الدرجات",
        topScores: "أفضل النتائج",
        questionAccuracy: "دقة الأسئلة",
        avgQuestionTime: "متوسط زمن الأسئلة",
        scoreDistributionSummary: "ملخص توزيع الدرجات",
        learnerSegments: "شرائح المتعلمين",
        questionDifficulty: "صعوبة الأسئلة",
        weeklyTrend: "اتجاه الأداء الأسبوعي",
        weeklyTrendSub: "الأعمدة = المحاولات، الخط = متوسط الأداء",
        timeVsScore: "العلاقة بين الزمن والدرجة",
        timeVsScoreSub: "كل نقطة تمثل محاولة واحدة",
        lessTime: "زمن أقل",
        moreTime: "زمن أكثر",
        total: "إجمالي",
        average: "المتوسط",
        showsTopN: "يعرض أعلى {shown} عناصر من أصل {total}.",
        showsFirstN: "يعرض أول {shown} محاولة من أصل {total}.",
        secSuffix: "ث",
    },
    participantsTable: {
        rank: "الترتيب",
        participant: "المشارك",
        percent: "النسبة",
        points: "النقاط",
        correct: "صحيح",
        wrong: "خطأ",
        time: "الوقت",
        type: "النوع",
        registered: "مسجل",
        guest: "زائر",
        empty: "لا توجد نتائج مسجلة.",
    },
    questionsTable: {
        question: "السؤال",
        accuracy: "الدقة",
        correct: "إجابات صحيحة",
        total: "إجمالي الإجابات",
    },
    csv: {
        field: "الحقل",
        value: "القيمة",
        topicTitle: "عنوان الدرس / الموضوع",
        note: "ملاحظة",
        participants: "المشاركون",
        lessonRating: "تقييم الدرس",
        totalRatings: "إجمالي التقييمات",
        avgOutOf5: "المتوسط / 5",
        emoji: "الإيموجي",
        label: "التسمية",
        count: "العدد",
        percent: "النسبة %",
        questionAnalysis: "تحليل الأسئلة",
        questionTextShort: "نص السؤال (مختصر)",
        accuracyPct: "الدقة %",
        totalAnswers: "إجمالي الإجابات",
        recommendations: "توصيات",
    },
};

const en: ChallengeReportLabels = {
    lang: "en",
    dir: "ltr",
    locale: "en-US",
    defaultTitle: "Challenge report",
    eyebrow: "Educational challenge performance report",
    footerPlatform: "lab4 platform",
    footerRegion: "Kingdom of Saudi Arabia",
    metrics: {
        totalAttempts: "Total attempts",
        avgPercent: "Average %",
        avgPoints: "Average points",
        maxPoints: "Highest score",
        registeredMembers: "Registered members",
        guests: "Guests",
    },
    meta: {
        lessonName: "Lesson",
        className: "Grade / class",
        subject: "Subject",
        teacherName: "Teacher",
        date: "Date",
        time: "Time",
        generatedAt: "Generated",
    },
    sections: {
        lessonRating: "Lesson rating",
        lessonRatingSummary: "ratings — average",
        lessonRatingSummaryLine: "{count} ratings · average {avg} / 5",
        additionalAnalysis: "Additional analysis",
        educationalRecommendations: "Teaching recommendations",
        recommendationsKicker: "Professional recommendations from results analysis",
        chartsAndIndicators: "Charts & indicators",
        participantsLog: "Participants & results",
        questionAnalysis: "Question analysis",
    },
    recommendation: {
        priority: "Priority",
        timeframe: "Timeframe",
        dataEvidence: "Evidence from data",
        suggestedActions: "Suggested actions",
        successIndicators: "Success indicators",
    },
    charts: {
        participantType: "Participant type",
        answerOutcomes: "Answer outcomes",
        scoreDistribution: "Score distribution",
        topScores: "Top scores",
        questionAccuracy: "Question accuracy",
        avgQuestionTime: "Avg. question time",
        scoreDistributionSummary: "Score distribution summary",
        learnerSegments: "Learner segments",
        questionDifficulty: "Question difficulty",
        weeklyTrend: "Weekly performance trend",
        weeklyTrendSub: "Bars = attempts, line = average performance",
        timeVsScore: "Time vs. score",
        timeVsScoreSub: "Each point is one attempt",
        lessTime: "Less time",
        moreTime: "More time",
        total: "Total",
        average: "Average",
        showsTopN: "Showing top {shown} of {total} items.",
        showsFirstN: "Showing first {shown} of {total} attempts.",
        secSuffix: "s",
    },
    participantsTable: {
        rank: "Rank",
        participant: "Participant",
        percent: "%",
        points: "Points",
        correct: "Correct",
        wrong: "Wrong",
        time: "Time",
        type: "Type",
        registered: "Registered",
        guest: "Guest",
        empty: "No recorded results.",
    },
    questionsTable: {
        question: "Question",
        accuracy: "Accuracy",
        correct: "Correct",
        total: "Total answers",
    },
    csv: {
        field: "Field",
        value: "Value",
        topicTitle: "Lesson / topic title",
        note: "Note",
        participants: "Participants",
        lessonRating: "Lesson rating",
        totalRatings: "Total ratings",
        avgOutOf5: "Average / 5",
        emoji: "Emoji",
        label: "Label",
        count: "Count",
        percent: "Percent %",
        questionAnalysis: "Question analysis",
        questionTextShort: "Question text (short)",
        accuracyPct: "Accuracy %",
        totalAnswers: "Total answers",
        recommendations: "Recommendations",
    },
};

export function getChallengeReportLabels(language?: ReportLanguage): ChallengeReportLabels {
    return language === "en" ? en : ar;
}

export function formatReportLabel(
    template: string,
    vars: Record<string, string | number>
): string {
    return Object.entries(vars).reduce(
        (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
        template
    );
}

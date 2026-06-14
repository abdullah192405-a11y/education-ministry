import type { Language } from "@/lib/i18n/translations";

export type AiGenerateMode = "questions" | "games" | "both";

function isEn(language: Language): boolean {
    return language === "en";
}

/** Instruction sent with audio files for transcription before question generation. */
export function buildAudioTranscriptionPrompt(language: Language): string {
    if (isEn(language)) {
        return (
            "Transcribe the spoken content in this audio file accurately. " +
            "Return raw text only with no formatting, JSON, or extra commentary. " +
            "Preserve scientific terms as spoken."
        );
    }
    return (
        "استخرج النص المنطوق من هذا الملف الصوتي بدقة. " +
        "أعد الناتج كنص خام فقط بدون تنسيق أو JSON أو شروحات إضافية. " +
        "إذا كان الصوت تعليميًا، حافظ على المصطلحات العلمية كما هي."
    );
}

export function buildQuestionGenRepairPrompt(
    language: Language,
    generateType: AiGenerateMode,
    generatedText: string
): string {
    const typeHint = isEn(language)
        ? generateType === "questions"
            ? "questions only"
            : generateType === "games"
              ? "games only"
              : "questions and games"
        : generateType === "questions"
          ? "أسئلة فقط"
          : generateType === "games"
            ? "ألعاب فقط"
            : "أسئلة وألعاب";

    if (isEn(language)) {
        return `Convert the following text into a valid JSON array only with no extra text.
Required: ${typeHint}
Repair rules:
- No markdown or commentary.
- Every item must include type, question, points, and timeLimit.
- matching must include pairs with left and right (3–6 pairs).
- order_questions must include orderItems array in correct order (3–6 items).
- puzzle: options = letter tiles; correctAnswer = full target word string (not index).
- wheel_spin = ONE game with 4–6 wheelSegments; each segment has exactly ONE question and 2–4 options (correctAnswer index). Never put multiple questions in one segment or in the parent question field.
- shooting: type must be "shooting"; include question (prompt only), options (4), and correctAnswer (index 0–3).
- All question, option, explanation, and label strings must be in English.
- Make correctAnswer appropriate for the question type.

Text to repair:
${generatedText}`;
    }

    return `حوّل النص التالي إلى JSON array صالح فقط وبدون أي نص إضافي.
المطلوب: ${typeHint}
قواعد الإصلاح:
- لا تستخدم markdown أو شرح.
- كل عنصر يجب أن يحتوي type وquestion وpoints وtimeLimit.
- matching يجب أن يحتوي pairs مع left و right (3–6 أزواج).
- order_questions يجب أن يحتوي orderItems بالترتيب الصحيح (3–6 عناصر).
- puzzle: options = حروف/مقاطع؛ correctAnswer = الكلمة الكاملة كنص.
- wheel_spin = لعبة واحدة تحتوي wheelSegments من 4 إلى 6 شرائح؛ كل شريحة سؤال واحد فقط مع 2–4 خيارات (correctAnswer رقم الخيار). لا تضع عدة أسئلة في شريحة واحدة أو في حقل question الرئيسي.
- shooting: type يجب أن يكون "shooting"؛ يجب أن يحتوي question (نص السؤال فقط) و options (4 خيارات) و correctAnswer (رقم 0–3).
- اجعل correctAnswer مناسباً لنوع السؤال.

النص المراد إصلاحه:
${generatedText}`;
}

export type ResourcesGenPromptParams = {
    language: Language;
    textContent: string;
    userPrompt: string;
    pdfCount?: number;
    imageCount?: number;
    audioCount?: number;
    genType?: AiGenerateMode;
    allowedTypes: string[];
    allowedTypeLabels: string[];
    batchCount?: number;
    totalRequestedCount?: number;
};

export function buildResourcesGenerationPrompt(params: ResourcesGenPromptParams): string {
    const {
        language,
        textContent,
        userPrompt,
        pdfCount = 0,
        imageCount = 0,
        audioCount = 0,
        genType = "both",
        allowedTypes,
        allowedTypeLabels,
        batchCount = 10,
        totalRequestedCount = 10,
    } = params;

    if (isEn(language)) {
        return buildResourcesGenerationPromptEn({
            textContent,
            userPrompt,
            pdfCount,
            imageCount,
            audioCount,
            genType,
            allowedTypes,
            allowedTypeLabels,
            batchCount,
            totalRequestedCount,
        });
    }

    return buildResourcesGenerationPromptAr({
        textContent,
        userPrompt,
        pdfCount,
        imageCount,
        audioCount,
        genType,
        allowedTypes,
        allowedTypeLabels,
        batchCount,
        totalRequestedCount,
    });
}

function buildResourcesGenerationPromptEn(p: Omit<ResourcesGenPromptParams, "language">): string {
    const hasRichFiles = p.pdfCount > 0 || p.imageCount > 0 || p.audioCount > 0;
    const fileNote = hasRichFiles
        ? `\n\nIMPORTANT: You were given ${[
              p.pdfCount > 0 ? `${p.pdfCount} PDF file(s)` : "",
              p.imageCount > 0 ? `${p.imageCount} image(s)` : "",
              p.audioCount > 0 ? `${p.audioCount} audio file(s)` : "",
          ]
              .filter(Boolean)
              .join(", ")}.
Analyze all attached pages (extracted text and/or page images). Perform OCR on images when needed.
Transcribe audio and extract key teaching ideas before building questions.
All questions and games must come exclusively from these resources. Do not use outside knowledge.`
        : "";

    const contentSection = p.textContent.trim() ? `\nReference text content:\n${p.textContent}` : "";

    const { typeInstruction, availableTypes } = getTypeInstructionsEn(p.genType ?? "both");
    const allowedLabels = p.allowedTypeLabels.join(", ");
    const allowedJson = p.allowedTypes.join(", ");

    return `You are an expert assistant that creates interactive educational content in English.

CRITICAL: Write ALL user-facing strings in English only (questions, options, explanations, labels, pairs). Do not use Arabic.

Task: Generate content based **exclusively** on the teacher-selected lesson resources below.
For YouTube links, use titles and available metadata to infer and analyze the video topic accurately.
${fileNote}${contentSection}

Teacher request:
${p.userPrompt}

${typeInstruction} Use **only** information from the selected images, PDFs, audio, texts, or links. Follow the JSON format exactly. Do not invent content outside the resources.
Items required in this batch: ${p.batchCount}
Total target for the full run: ${p.totalRequestedCount}
Allowed types in this batch (labels): ${allowedLabels}
Allowed type values only (type field): ${allowedJson}
${availableTypes}

Return a JSON array only, with no extra text:

Example format:
[
  {
    "type": "multiple_choice",
    "question": "What is...",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correctAnswer": 0,
    "explanation": "Brief explanation...",
    "points": 100,
    "timeLimit": 30
  },
  {
    "type": "matching",
    "question": "Match the following...",
    "pairs": [
      {"left": "Term 1", "right": "Match 1"},
      {"left": "Term 2", "right": "Match 2"}
    ],
    "points": 150,
    "timeLimit": 45
  },
  {
    "type": "order_questions",
    "question": "Put the steps in the correct order",
    "orderItems": ["Step 1", "Step 2", "Step 3", "Step 4"],
    "points": 150,
    "timeLimit": 45
  },
  {
    "type": "puzzle",
    "question": "Build the word from the letters",
    "options": ["p", "e", "n"],
    "correctAnswer": "pen",
    "points": 150,
    "timeLimit": 30
  },
  {
    "type": "shooting",
    "question": "Which answer is correct?",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correctAnswer": 0,
    "points": 150,
    "timeLimit": 30
  },
  {
    "type": "wheel_spin",
    "question": "Spin the wheel!",
    "points": 100,
    "timeLimit": 30,
    "wheelSegments": [
      {"label": "Easy", "points": 50, "question": "What is...?", "options": ["A", "B", "C", "D"], "correctAnswer": 0},
      {"label": "Medium", "points": 100, "question": "Which...?", "options": ["X", "Y", "Z", "W"], "correctAnswer": 1},
      {"label": "Hard", "points": 150, "question": "How...?", "options": ["1", "2", "3", "4"], "correctAnswer": 2},
      {"label": "Bonus", "points": 200, "question": "Why...?", "options": ["P", "Q", "R", "S"], "correctAnswer": 0}
    ]
  }
]

Important:
- Stay 100% grounded in the attached resources.
- Output exactly ${p.batchCount} items in this batch; each type must be one of: ${allowedJson}.
- Write standalone questions; do not use phrases like "as shown in the image" or "in the video above".
- For qa and know_dont_know always set correctAnswer to clear text; add a short explanation when helpful.
- For matching always use pairs with left/right (3–6 pairs).
- For order_questions always use orderItems array in correct order (3–6 items).
- For puzzle: options = letter/syllable tiles; correctAnswer = the full target word as a string (not an index).
- For wheel_spin: ONE item with 4–6 wheelSegments; each segment = ONE question + its own options. Never bundle multiple Q&A in one segment.
- For shooting use 4 options with one correct answer.
- multiple_choice, true_false, and shooting must always use timeLimit 30.
- Points 50–200; timeLimit 15–60 seconds.
- Valid JSON only.`;
}

function buildResourcesGenerationPromptAr(p: Omit<ResourcesGenPromptParams, "language">): string {
    const hasRichFiles = p.pdfCount > 0 || p.imageCount > 0 || p.audioCount > 0;
    const fileNote = hasRichFiles
        ? `\n\nتنبيه هام جداً: لقد تم تزويدك بـ ${p.pdfCount > 0 ? `${p.pdfCount} ملف PDF` : ""}${p.pdfCount > 0 && (p.imageCount > 0 || p.audioCount > 0) ? " و " : ""}${p.imageCount > 0 ? `${p.imageCount} صورة` : ""}${p.imageCount > 0 && p.audioCount > 0 ? " و " : ""}${p.audioCount > 0 ? `${p.audioCount} ملف صوتي` : ""}.
يجب عليك تحليل **كامل الصفحات** المرفقة (سواء كانت نصوصاً مستخرجة أو صوراً للصفحات). قم بإجراء OCR ذاتي للصور إذا لزم الأمر.
حلّل الصوت لاستخراج الأفكار والمفاهيم التعليمية الأساسية قبل بناء الأسئلة.
يجب أن تكون جميع الأسئلة والألعاب مستخرجة حصرياً من المعلومات الموجودة داخل هذه الموارد. لا تتجاهل أي مورد ولا تستخدم معلومات خارجية.`
        : "";

    const contentSection = p.textContent.trim() ? `\nالمحتوى النصي المرجعي:\n${p.textContent}` : "";
    const { typeInstruction, availableTypes } = getTypeInstructionsAr(p.genType ?? "both");
    const allowedLabels = p.allowedTypeLabels.join("، ");
    const allowedJson = p.allowedTypes.join(", ");

    return `أنت مساعد ذكي متخصص في إنشاء محتوى تعليمي تفاعلي باللغة العربية.
مهمتك: توليد محتوى مستنداً **حصرياً** على الموارد التي قام المعلم باختيارها من القائمة المرفقة أدناه.
في حال وجود روابط فيديو (يوتيوب)، استخدم العنوان والبيانات المتاحة للبحث في قاعدة بياناتك عن محتوى الفيديو وتحليله بدقة.
${fileNote}${contentSection}

طلب المعلم:
${p.userPrompt}

${typeInstruction} بناءً **فقط** على المعلومات المستخرجة من الصور أو ملفات PDF أو الملفات الصوتية أو النصوص أو الروابط المختارة، مع الالتزام بالتنسيق التالي بدقة. لا تولد أي سؤال من خارج المحتوى المختار.
عدد العناصر المطلوب في هذه الدفعة: ${p.batchCount}
العدد النهائي المستهدف في العملية كلها: ${p.totalRequestedCount}
الأنواع المسموح بها فقط في هذه الدفعة: ${allowedLabels}
لا تستخدم أي نوع خارج القائمة التالية (type): ${allowedJson}
${availableTypes}

يجب أن يكون الرد بصيغة JSON array فقط، بدون أي نص إضافي:

مثال للتنسيق:
[
  {
    "type": "multiple_choice",
    "question": "ما هو...",
    "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
    "correctAnswer": 0,
    "explanation": "الشرح...",
    "points": 100,
    "timeLimit": 30
  },
  {
    "type": "order_questions",
    "question": "رتّب الخطوات بالترتيب الصحيح",
    "orderItems": ["الخطوة 1", "الخطوة 2", "الخطوة 3", "الخطوة 4"],
    "points": 150,
    "timeLimit": 45
  },
  {
    "type": "puzzle",
    "question": "رتّب الحروف لتكوين كلمة",
    "options": ["م", "ل", "ق"],
    "correctAnswer": "قلم",
    "points": 150,
    "timeLimit": 30
  },
  {
    "type": "shooting",
    "question": "ما هو الإجابة الصحيحة؟",
    "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
    "correctAnswer": 0,
    "points": 150,
    "timeLimit": 30
  },
  {
    "type": "wheel_spin",
    "question": "أدر العجلة!",
    "points": 100,
    "timeLimit": 30,
    "wheelSegments": [
      {"label": "سهل", "points": 50, "question": "ما هو...؟", "options": ["أ", "ب", "ج", "د"], "correctAnswer": 0},
      {"label": "متوسط", "points": 100, "question": "أي...؟", "options": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"], "correctAnswer": 1},
      {"label": "صعب", "points": 150, "question": "كيف...؟", "options": ["1", "2", "3", "4"], "correctAnswer": 2},
      {"label": "إضافي", "points": 200, "question": "لماذا...؟", "options": ["أ", "ب", "ج", "د"], "correctAnswer": 0}
    ]
  }
]

ملاحظات مهمة:
- التزم بنسبة 100% بالمحتوى المرفق.
- أخرج بالضبط ${p.batchCount} عناصر في هذه الدفعة؛ كل type من: ${allowedJson}.
- matching: استخدم pairs مع left و right (3–6 أزواج).
- order_questions: استخدم orderItems بالترتيب الصحيح (3–6 عناصر).
- puzzle: options = حروف/مقاطع؛ correctAnswer = الكلمة الكاملة كنص (وليس رقم index).
- shooting: يجب أن يحتوي كل عنصر على question (نص السؤال فقط) و options (4 خيارات) و correctAnswer (رقم الخيار الصحيح 0–3). لا تضع الخيارات داخل نص السؤال.
- multiple_choice و true_false و shooting: timeLimit دائماً 30.
- لـ wheel_spin: عنصر واحد يحتوي 4–6 شرائح في wheelSegments؛ كل شريحة = سؤال واحد + خياراته فقط. لا تضع عدة أسئلة في شريحة واحدة.
- استخدم اللغة العربية الفصحى.
- تأكد من صحة JSON.`;
}

function getTypeInstructionsEn(genType: AiGenerateMode): { typeInstruction: string; availableTypes: string } {
    if (genType === "questions") {
        return {
            typeInstruction: "Create educational questions only (no games).",
            availableTypes: `
Available question types:
1. multiple_choice — 2–6 options
2. true_false — two options only
3. qa — open answer
4. know_dont_know — self-assessment
5. order_questions — order items`,
        };
    }
    if (genType === "games") {
        return {
            typeInstruction: "Create interactive games only (no traditional questions).",
            availableTypes: `
Available game types:
1. matching
2. shooting
3. wheel_spin
4. puzzle`,
        };
    }
    return {
        typeInstruction: "Create a mix of educational questions and interactive games.",
        availableTypes: `
Question types: multiple_choice, true_false, qa, know_dont_know, order_questions
Game types: matching, shooting, wheel_spin, puzzle`,
    };
}

function getTypeInstructionsAr(genType: AiGenerateMode): { typeInstruction: string; availableTypes: string } {
    if (genType === "questions") {
        return {
            typeInstruction: "يرجى إنشاء أسئلة تعليمية فقط (بدون ألعاب)",
            availableTypes: `
أنواع الأسئلة المتاحة:
1. اختيار متعدد (multiple_choice)
2. صح وخطأ (true_false)
3. سؤال وجواب (qa)
4. أعرف/لا أعرف (know_dont_know)
5. ترتيب (order_questions)`,
        };
    }
    if (genType === "games") {
        return {
            typeInstruction: "يرجى إنشاء ألعاب تفاعلية فقط (بدون أسئلة تقليدية)",
            availableTypes: `
أنواع الألعاب المتاحة:
1. مطابقة (matching)
2. تصويب (shooting)
3. عجلة الحظ (wheel_spin)
4. ألغاز (puzzle)`,
        };
    }
    return {
        typeInstruction: "يرجى إنشاء مزيج من الأسئلة التعليمية والألعاب التفاعلية",
        availableTypes: `
أنواع الأسئلة: multiple_choice, true_false, qa, know_dont_know, order_questions
أنواع الألعاب: matching, shooting, wheel_spin, puzzle`,
    };
}

export function buildUploadGenerationPrompt(
    language: Language,
    fileContent: string,
    userPrompt: string
): string {
    if (isEn(language)) {
        return `You are an expert assistant that creates educational questions and interactive games in English.

CRITICAL: Write ALL strings in English only (questions, options, explanations).

Task: Generate content based **exclusively** on the provided source (image, PDF, or video link).

Source content (text and/or page images):
${fileContent}

Teacher request:
${userPrompt}

Analyze the full source (extracted text and page images). OCR page images when needed.

If the source is a YouTube video, use title/metadata and grounded knowledge about the topic; stay on-topic.

Question types: multiple_choice, true_false, qa, know_dont_know, order_questions
Game types: matching, shooting, wheel_spin, puzzle

Return JSON array only. Follow the teacher request for types and counts.

Example formats:
[
  {"type":"multiple_choice","question":"What is...?","options":["A","B","C","D"],"correctAnswer":0,"explanation":"...","points":100,"timeLimit":30},
  {"type":"matching","question":"Match the terms","pairs":[{"left":"Term 1","right":"Definition 1"},{"left":"Term 2","right":"Definition 2"}],"points":150,"timeLimit":45},
  {"type":"order_questions","question":"Put in order","orderItems":["Step 1","Step 2","Step 3"],"points":150,"timeLimit":45},
  {"type":"puzzle","question":"Build the word","options":["p","e","n"],"correctAnswer":"pen","points":150,"timeLimit":30},
  {"type":"shooting","question":"Which is correct?","options":["A","B","C","D"],"correctAnswer":0,"points":150,"timeLimit":30},
  {"type":"wheel_spin","question":"Spin the wheel!","points":100,"timeLimit":30,"wheelSegments":[{"label":"Easy","points":50,"question":"What is...?","options":["A","B","C","D"],"correctAnswer":0}]}
]

Rules:
- 100% grounded in the source; no outside content.
- ONE item per question/game. Never bundle multiple questions in one field.
- multiple_choice/shooting: question = prompt only; options in options array (2–6 items).
- matching: use pairs with left/right (3–6 pairs). Do not put pairs inside question text.
- order_questions: use orderItems array in correct order (3–6 items).
- puzzle: options = letter tiles; correctAnswer = full word string (not index).
- wheel_spin: ONE item with 4–6 wheelSegments; each segment = ONE question + its own options.
- qa/know_dont_know: correctAnswer = clear text answer.
- multiple_choice, true_false, and shooting must always use timeLimit 30.
- Points 50–200; timeLimit 15–60s.
- Valid JSON only.`;
    }

    return `أنت مساعد ذكي متخصص في إنشاء أسئلة تعليمية وألعاب تفاعلية باللغة العربية.
مهمتك الأساسية هي توليد محتوى مستنداً **حصرياً** على المصدر المقدم (صورة، PDF، أو رابط فيديو).

المحتوى التعليمي من المصدر (نصوص و/أو صور لصفحات):
${fileContent}

طلب المعلم:
${userPrompt}

تنبيه هام: قم بتحليل **كامل** المحتوى المقدم. إذا كانت هناك صور لصفحات PDF، قم بإجراء تحليل بصري (OCR) دقيق لها.

يرجى إنشاء أسئلة وألعاب تفاعلية بناءً على المعلومات المتوفرة في المصدر المقدم، مع الالتزام **بدقة** بما طلبه المعلم من أنواع وعدد.

أنواع الأسئلة: multiple_choice, true_false, qa, know_dont_know, order_questions
أنواع الألعاب: matching, shooting, wheel_spin, puzzle

يجب أن يكون الرد بصيغة JSON array فقط، بدون أي نص إضافي.

أمثلة للتنسيق:
[
  {"type":"multiple_choice","question":"ما هو...؟","options":["أ","ب","ج","د"],"correctAnswer":0,"explanation":"...","points":100,"timeLimit":30},
  {"type":"matching","question":"طابق المصطلحات","pairs":[{"left":"مصطلح 1","right":"تعريف 1"},{"left":"مصطلح 2","right":"تعريف 2"}],"points":150,"timeLimit":45},
  {"type":"order_questions","question":"رتّب الخطوات","orderItems":["الخطوة 1","الخطوة 2","الخطوة 3"],"points":150,"timeLimit":45},
  {"type":"puzzle","question":"رتّب الحروف لتكوين كلمة","options":["م","ل","ق"],"correctAnswer":"قلم","points":150,"timeLimit":30},
  {"type":"shooting","question":"ما هو الصحيح؟","options":["أ","ب","ج","د"],"correctAnswer":0,"points":150,"timeLimit":30},
  {"type":"wheel_spin","question":"أدر العجلة!","points":100,"timeLimit":30,"wheelSegments":[{"label":"سهل","points":50,"question":"ما هو...؟","options":["أ","ب","ج","د"],"correctAnswer":0}]}
]

ملاحظات مهمة:
- التزم بنسبة 100% بالمحتوى المرفق.
- عنصر واحد لكل سؤال/لعبة. لا تضع عدة أسئلة في حقل واحد.
- multiple_choice/shooting: question = نص السؤال فقط؛ الخيارات في options (2–6 خيارات، و4 خيارات لـ shooting).
- shooting: type يجب أن يكون "shooting" (وليس تصويب) مع options و correctAnswer.
- matching: استخدم pairs مع left و right (3–6 أزواج). لا تضع الأزواج داخل نص السؤال.
- order_questions: استخدم orderItems بالترتيب الصحيح (3–6 عناصر).
- puzzle: options = حروف/مقاطع؛ correctAnswer = الكلمة الكاملة كنص.
- wheel_spin: عنصر واحد مع 4–6 شرائح في wheelSegments؛ كل شريحة = سؤال واحد + خياراته.
- qa/know_dont_know: correctAnswer = إجابة نصية واضحة.
- multiple_choice و true_false و shooting: timeLimit دائماً 30.
- استخدم اللغة العربية الفصحى.
- تأكد من صحة JSON تماماً`;
}

export function buildDatabaseGenerationPrompt(
    language: Language,
    textContent: string,
    userPrompt: string,
    generateType: AiGenerateMode
): string {
    const typeLines = isEn(language)
        ? [
              generateType !== "games" ? "- Generate educational questions (multiple choice, true/false, etc.)" : "",
              generateType !== "questions" ? "- Generate interactive games (matching, ordering, etc.)" : "",
          ].filter(Boolean).join("\n")
        : [
              generateType !== "games" ? "- توليد أسئلة تعليمية (اختيار متعدد، صح وخطأ، إلخ)" : "",
              generateType !== "questions" ? "- توليد ألعاب تعليمية تفاعلية (مطابقة، ترتيب، إلخ)" : "",
          ].filter(Boolean).join("\n");

    if (isEn(language)) {
        return `You are an expert assistant that creates educational questions and interactive games in English.

CRITICAL: Write ALL strings in English only.

Analyze all provided sources (extracted text and PDF page images). OCR attached images accurately.

Extracted text content:
${textContent}

Teacher request:
${userPrompt}

Generation requirements:
${typeLines}
- Stay strictly within the attached files.
- Return a JSON array of educational items.

Example: {"type":"multiple_choice","question":"...","options":["A","B"],"correctAnswer":0,"points":100,"timeLimit":30}`;
    }

    return `أنت مساعد ذكي متخصص في إنشاء أسئلة تعليمية وألعاب تفاعلية.
يجب عليك تحليل **كامل** المصادر المقدمة (سواء كانت نصوصاً مستخرجة أو صوراً لصفحات PDF).
قم بإجراء تحليل بصري (OCR) دقيق للصور المرفقة.

المحتوى النصي المستخرج:
${textContent}

طلب المعلم:
${userPrompt}

متطلبات التوليد:
${typeLines}
- التزم تماماً بمحتوى الملفات المرفقة ولا تخرج عنها.
- العودة بتنسيق JSON array من العناصر التعليمية.`;
}

/** Context strings bundled into prompts (resource list, video notes, etc.) */
export const aiGenContext = {
    imageForAnalysis(language: Language): string {
        return isEn(language)
            ? "An image was provided for analysis. Analyze its educational content accurately."
            : "تم توفير صورة للتحليل. يرجى تحليل محتواها العلمي بدقة.";
    },
    noFileOrLink(language: Language): string {
        return isEn(language)
            ? "No file or link was provided. Generation will rely on the teacher instructions only."
            : "لم يتم توفير ملف أو رابط. سيعتمد التوليد على التعليمات المقدمة فقط.";
    },
    scannedPdfNoText(language: Language): string {
        return isEn(language)
            ? "No text could be extracted from this PDF (printed or scanned). Page images in the same request contain the content — read and analyze them carefully."
            : "لا يوجد نص مستخرج من هذا PDF (ملف مطبوع أو ممسوح ضوئياً). صور الصفحات في نفس الطلب تحتوي المحتوى — اقرأها وحللها بدقة.";
    },
    youtubeTranscriptPrefix(language: Language): string {
        return isEn(language)
            ? "[Full YouTube transcript]:\n"
            : "[نص الفيديو الكامل من اليوتيوب - NotebookLM Mode]:\n";
    },
    youtubeMetadataBlock(language: Language, title: string, author: string, url: string): string {
        return isEn(language)
            ? `[Video metadata for analysis]:\nTitle: ${title}\nChannel: ${author}\nURL: ${url}\n\nUse grounded knowledge about this video or topic to produce accurate questions.`
            : `[بيانات الفيديو للتحليل]:\nالعنوان: ${title}\nالمؤلف: ${author}\nالرابط: ${url}\n\nيرجى محاكاة NotebookLM واستخدام معرفتك الداخلية بهذا الفيديو أو موضوعه (Grounded Knowledge) لإنتاج أسئلة دقيقة جداً.`;
    },
    youtubeLinkOnly(language: Language, url: string): string {
        return isEn(language) ? `[Video link for analysis]: ${url}` : `[رابط فيديو للتحليل]: ${url}`;
    },
    pdfTextBlock(language: Language, fileName: string, text: string): string {
        return isEn(language)
            ? `📄 Text extracted from PDF "${fileName}":\n${text}`
            : `📄 محتوى نصي من ملف PDF "${fileName}":\n${text}`;
    },
    videoTranscriptBlock(language: Language, url: string, text: string): string {
        return isEn(language)
            ? `📄 Video transcript "${url}":\n${text}\n\n`
            : `📄 نص الفيديو "${url}":\n${text}\n\n`;
    },
    videoOEmbedBlock(language: Language, title: string, author: string, url: string): string {
        return isEn(language)
            ? `🎬 Video: "${title}" by "${author}"\nURL: ${url}\n(Analyze this video based on its title and topic.)\n`
            : `🎬 فيديو: "${title}" من قناة "${author}"\nالرابط: ${url}\n(يرجى تحليل محتوى هذا الفيديو بناءً على عنوانه)\n`;
    },
    audioTranscriptChunk(language: Language, fileName: string, text: string): string {
        return isEn(language)
            ? `🎧 [Audio transcript: ${fileName}]\n${text}`
            : `🎧 [تفريغ صوتي: ${fileName}]\n${text}`;
    },
    resourceText(language: Language, caption: string, content: string): string {
        const title = caption || (isEn(language) ? "Untitled" : "بدون عنوان");
        return isEn(language)
            ? `📝 [Educational text]: ${title}\n${content}`
            : `📝 [نص تعليمي]: ${title}\n${content}`;
    },
    resourceVideo(language: Language, caption: string | undefined, url: string): string {
        if (caption) {
            return isEn(language)
                ? `🎬 [Video]: ${caption}\nURL: ${url}`
                : `🎬 [فيديو]: ${caption}\nرابط: ${url}`;
        }
        return isEn(language)
            ? `🎬 [Video]: ${url || "Educational video"}`
            : `🎬 [فيديو]: ${url || "فيديو تعليمي"}`;
    },
    resourceImage(language: Language, caption: string | undefined, url: string): string {
        if (caption) {
            return isEn(language)
                ? `🖼️ [Image]: ${caption}\nURL: ${url}`
                : `🖼️ [صورة]: ${caption}\nرابط: ${url}`;
        }
        return isEn(language)
            ? `🖼️ [Image]: ${url || "Educational image"}`
            : `🖼️ [صورة]: ${url || "صورة تعليمية"}`;
    },
    resourceAudio(language: Language, caption: string | undefined, fileName: string | undefined, url: string): string {
        const label = caption || fileName || (isEn(language) ? "Audio clip" : "مقطع صوتي");
        const link = url || (isEn(language) ? "unavailable" : "غير متاح");
        return isEn(language)
            ? `🎧 [Audio file]: ${label}\nURL: ${link}`
            : `🎧 [ملف صوتي]: ${label}\nرابط: ${link}`;
    },
    resourceLink(language: Language, caption: string, url: string): string {
        return isEn(language)
            ? `🔗 [External link]: ${caption}\nURL: ${url}`
            : `🔗 [رابط خارجي]: ${caption}\nرابط: ${url}`;
    },
    externalLinkExtracted(language: Language, caption: string, url: string, text: string): string {
        return isEn(language)
            ? `🔗 [External link content]: ${caption}\nURL: ${url}\nExtracted text:\n${text}`
            : `🔗 [محتوى رابط خارجي]: ${caption}\nالرابط: ${url}\nالنص المستخرج:\n${text}`;
    },
    externalLinkFallback(language: Language, caption: string, url: string): string {
        return isEn(language)
            ? `🔗 [External link]: ${caption}\nURL: ${url}\nCould not extract text; use title/description only without extra assumptions.`
            : `🔗 [رابط خارجي]: ${caption}\nالرابط: ${url}\nتعذّر استخراج النص مباشرة، استخدم العنوان/الوصف فقط دون افتراضات زائدة.`;
    },
    externalLinkDefaultCaption(language: Language): string {
        return isEn(language) ? "External reference" : "مرجع خارجي";
    },
    qaFallbackAnswer(language: Language, question: string): string {
        return isEn(language)
            ? question
                ? `Expected answer: ${question}`
                : "Answer briefly based on the selected lesson resource."
            : question
              ? `الإجابة المتوقعة: ${question}`
              : "أجب باختصار اعتماداً على محتوى المورد.";
    },
    qaFallbackExplanation(language: Language): string {
        return isEn(language)
            ? "This answer is derived from the selected lesson resource and can be used for grading."
            : "هذه الإجابة مستخلصة مباشرة من مورد الدرس المختار، ويمكن اعتمادها كمرجع للتقييم.";
    },
};

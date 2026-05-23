/**
 * Patches ContentEditor.tsx and TeacherTopicsTab.tsx for i18n.
 * Run after scripts/i18n-teacher-topics.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");

function patchContentEditor() {
    const file = path.join(ROOT, "src/pages/dashboard/teacher/components/ContentEditor.tsx");
    let c = fs.readFileSync(file, "utf8");

    if (c.includes("useDashboardLocale")) {
        console.log("ContentEditor already patched");
        return;
    }

    // imports
    c = c.replace(
        'import { useRef, useState } from "react";',
        'import { useRef, useState, useMemo } from "react";\nimport { useDashboardLocale } from "@/contexts/LanguageContext";\nimport type { TFunction } from "@/contexts/LanguageContext";',
    );

    // Remove old constants block and replace with factory functions
    c = c.replace(
        /const mediaTypes = \[[\s\S]*?\];\n\nconst targetAudienceOptions = \[[\s\S]*?\];\n\nconst CORRECT_SOUND_PRESETS[\s\S]*?const BACKGROUND_SOUND_PRESETS[\s\S]*?\];\n\nconst isYouTubeUrl/,
        `const getMediaTypes = (t: TFunction) => [
    { type: "video" as const, label: t("dash.teacher.topics.editor.mediaType.video"), icon: Video },
    { type: "image" as const, label: t("dash.teacher.topics.editor.mediaType.image"), icon: Image },
    { type: "text" as const, label: t("dash.teacher.topics.editor.mediaType.text"), icon: FileText },
    { type: "pdf" as const, label: t("dash.teacher.topics.editor.mediaType.pdf"), icon: FileType },
    { type: "audio" as const, label: t("dash.teacher.topics.editor.mediaType.audio"), icon: Headphones },
    { type: "link" as const, label: t("dash.teacher.topics.editor.mediaType.link"), icon: Link2 },
];

const getTargetAudienceOptions = (t: TFunction) => [
    { value: "all", label: t("dash.teacher.topics.editor.audienceAll") },
    { value: "children", label: t("dash.teacher.topics.editor.audienceChildren") },
    { value: "adults", label: t("dash.teacher.topics.editor.audienceAdults") },
];

const getCorrectSoundPresets = (t: TFunction): SoundOption[] => [
    { label: t("dash.teacher.topics.editor.sound.successN", { n: 1 }), url: "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.successN", { n: 2 }), url: "https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.successN", { n: 3 }), url: "https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.successN", { n: 4 }), url: "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.successN", { n: 5 }), url: "https://assets.mixkit.co/active_storage/sfx/218/218-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.successN", { n: 6 }), url: "https://assets.mixkit.co/active_storage/sfx/1114/1114-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.successN", { n: 7 }), url: "https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3" },
];

const getWrongSoundPresets = (t: TFunction): SoundOption[] => [
    { label: t("dash.teacher.topics.editor.sound.wrongN", { n: 1 }), url: "https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.wrongN", { n: 2 }), url: "https://assets.mixkit.co/active_storage/sfx/2867/2867-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.wrongN", { n: 3 }), url: "https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.wrongN", { n: 4 }), url: "https://assets.mixkit.co/active_storage/sfx/1118/1118-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.wrongN", { n: 5 }), url: "https://assets.mixkit.co/active_storage/sfx/1018/1018-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.wrongN", { n: 6 }), url: "https://assets.mixkit.co/active_storage/sfx/2876/2876-preview.mp3" },
    { label: t("dash.teacher.topics.editor.sound.wrongN", { n: 7 }), url: "https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3" },
];

const getBackgroundSoundPresets = (t: TFunction): SoundOption[] => [
    { label: t("dash.teacher.topics.editor.sound.bgN", { n: 1 }), url: "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3" },
    { label: t("dash.teacher.topics.editor.sound.bgN", { n: 2 }), url: "https://assets.mixkit.co/music/preview/mixkit-games-worldbeat-466.mp3" },
    { label: t("dash.teacher.topics.editor.sound.bgN", { n: 3 }), url: "https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3" },
    { label: t("dash.teacher.topics.editor.sound.bgN", { n: 4 }), url: "https://assets.mixkit.co/music/preview/mixkit-arcade-retro-game-over-213.mp3" },
    { label: t("dash.teacher.topics.editor.sound.bgN", { n: 5 }), url: "https://assets.mixkit.co/music/preview/mixkit-game-level-music-689.mp3" },
    { label: t("dash.teacher.topics.editor.sound.bgN", { n: 6 }), url: "https://assets.mixkit.co/music/preview/mixkit-valley-sunset-127.mp3" },
    { label: t("dash.teacher.topics.editor.sound.bgN", { n: 7 }), url: "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3" },
];

const PRESET_LABEL_KEYS: Record<string, string> = {
    free: "dash.teacher.topics.editor.preset.free",
    "single:activities": "dash.teacher.topics.editor.preset.singleActivities",
    "single:games": "dash.teacher.topics.editor.preset.singleGames",
    "single:mixed": "dash.teacher.topics.editor.preset.singleMixed",
    "group:activities": "dash.teacher.topics.editor.preset.groupActivities",
    "group:games": "dash.teacher.topics.editor.preset.groupGames",
    "group:mixed": "dash.teacher.topics.editor.preset.groupMixed",
};

const isYouTubeUrl`,
    );

    c = c.replace(
        /const getMediaTypeArabicLabel = \(type: ContentMedia\["type"\]\): string => \{[\s\S]*?\};\n\nconst getMediaOptionLabel = \(media: ContentMedia, index: number\): string => \{[\s\S]*?\};\n\nconst ContentEditor/,
        `const getMediaTypeLabel = (type: ContentMedia["type"], t: TFunction): string => {
    if (type === "video") return t("dash.teacher.topics.editor.mediaType.video");
    if (type === "image") return t("dash.teacher.topics.editor.mediaType.image");
    if (type === "text") return t("dash.teacher.topics.editor.mediaType.text");
    if (type === "pdf") return t("dash.teacher.topics.editor.mediaType.pdf");
    if (type === "audio") return t("dash.teacher.topics.editor.mediaType.audio");
    return t("dash.teacher.topics.editor.mediaType.link");
};

const getMediaOptionLabel = (media: ContentMedia, index: number, t: TFunction): string => {
    const raw =
        media.caption?.trim() ||
        media.fileName?.trim() ||
        (media.type === "text" ? media.content?.trim() : media.url?.trim()) ||
        t("dash.teacher.topics.editor.mediaTypeN", { type: getMediaTypeLabel(media.type, t), n: index + 1 });
    const short = raw.length > 48 ? \`\${raw.slice(0, 48)}…\` : raw;
    return t("dash.teacher.topics.editor.mediaLabel", { type: getMediaTypeLabel(media.type, t), short });
};

const ContentEditor`,
    );

    // Add hook at component start
    c = c.replace(
        "const ContentEditor = ({ content, onSave, onCancel }: ContentEditorProps) => {\n    const { data: user } = useUser();",
        `const ContentEditor = ({ content, onSave, onCancel }: ContentEditorProps) => {
    const { t, dir } = useDashboardLocale();
    const { data: user } = useUser();
    const mediaTypes = useMemo(() => getMediaTypes(t), [t]);
    const targetAudienceOptions = useMemo(() => getTargetAudienceOptions(t), [t]);
    const correctSoundPresets = useMemo(() => getCorrectSoundPresets(t), [t]);
    const wrongSoundPresets = useMemo(() => getWrongSoundPresets(t), [t]);
    const backgroundSoundPresets = useMemo(() => getBackgroundSoundPresets(t), [t]);
    const getTypeLabel = (type: string) => {
        const keys: Record<string, string> = {
            multiple_choice: "dash.teacher.topics.editor.type.multipleChoice",
            true_false: "dash.teacher.topics.editor.type.trueFalse",
            qa: "dash.teacher.topics.editor.type.qa",
            know_dont_know: "dash.teacher.topics.editor.type.knowDontKnow",
            order_questions: "dash.teacher.topics.editor.type.order",
            matching: "dash.teacher.topics.editor.type.matching",
            shooting: "dash.teacher.topics.editor.type.shooting",
            wheel_spin: "dash.teacher.topics.editor.type.wheel",
            puzzle: "dash.teacher.topics.editor.type.puzzle",
        };
        const key = keys[type];
        return key ? t(key as any) : type;
    };`,
    );

    // Replace preset references
    c = c.replace(/CORRECT_SOUND_PRESETS/g, "correctSoundPresets");
    c = c.replace(/WRONG_SOUND_PRESETS/g, "wrongSoundPresets");
    c = c.replace(/BACKGROUND_SOUND_PRESETS/g, "backgroundSoundPresets");

    // Custom saved labels in useState - need t but useState init runs once; use lazy or effect
    c = c.replace(
        'content?.correctSoundUrl ? [{ label: "مخصص محفوظ", url: content.correctSoundUrl }] : []',
        'content?.correctSoundUrl ? [{ label: "", url: content.correctSoundUrl }] : []',
    );
    c = c.replace(
        'content?.wrongSoundUrl ? [{ label: "مخصص محفوظ", url: content.wrongSoundUrl }] : []',
        'content?.wrongSoundUrl ? [{ label: "", url: content.wrongSoundUrl }] : []',
    );
    c = c.replace(
        'content?.answeringBackgroundSoundUrl ? [{ label: "مخصص محفوظ", url: content.answeringBackgroundSoundUrl }] : []',
        'content?.answeringBackgroundSoundUrl ? [{ label: "", url: content.answeringBackgroundSoundUrl }] : []',
    );

    // uploaded audio options
    c = c.replace(
        /label: `مرفوع: \$\{media\.caption \|\| media\.fileName \|\| `ملف صوتي \$\{idx \+ 1\}`\}`/,
        'label: t("dash.teacher.topics.editor.uploadedAudio", { name: media.caption || media.fileName || t("dash.teacher.topics.editor.audioFileN", { n: idx + 1 }) })',
    );

    c = c.replace(
        /const option: SoundOption = \{ label: `مرفوع مباشر: \$\{file\.name\}`/,
        'const option: SoundOption = { label: t("dash.teacher.topics.editor.directUpload", { name: file.name })',
    );

    // Replace getMediaOptionLabel calls
    c = c.replace(/getMediaOptionLabel\(media, index\)/g, "getMediaOptionLabel(media, index, t)");

    // Replace STUDENT_CHALLENGE_PRESET_OPTIONS map
    c = c.replace(
        /\{STUDENT_CHALLENGE_PRESET_OPTIONS\.map\(\(option\) => \(\s*<SelectItem key=\{option\.value\} value=\{option\.value\}>\s*\{option\.label\}\s*<\/SelectItem>\s*\)\)\}/,
        `{STUDENT_CHALLENGE_PRESET_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {t(PRESET_LABEL_KEYS[option.value] as any)}
                                            </SelectItem>
                                        ))}`,
    );

    // dir="rtl" -> dir={dir}
    c = c.replace(/dir="rtl"/g, "dir={dir}");
    c = c.replace(/<div className="space-y-3 text-right" dir=\{dir\}>/, '<div className="space-y-3 text-start" dir={dir}>');

    // Return wrapper
    c = c.replace(
        'return (\n        <div className="space-y-6">',
        'return (\n        <div className="space-y-6" dir={dir}>',
    );

    // Remove bottom getTypeLabel helper
    c = c.replace(
        /\n\/\/ Helper function to get type label\nconst getTypeLabel = \(type: string\): string => \{[\s\S]*?\};\n\nexport default ContentEditor;/,
        "\n\nexport default ContentEditor;",
    );

    // Bulk string replacements for toasts and UI
    const replacements = [
        ['title: "خطأ", description: "لم يتم تسجيل الدخول"', 'title: t("dash.common.error"), description: t("dash.teacher.topics.qe.toast.notLoggedIn")'],
        ['title: "حجم الملف كبير", description: "يجب ألا يتجاوز حجم الصورة 5 ميجابايت"', 'title: t("dash.teacher.topics.editor.toast.fileTooLarge5mb"), description: t("dash.teacher.topics.qe.toast.imageTooLarge")'],
        ['title: "تم الرفع", description: "تم رفع الصورة بنجاح"', 'title: t("dash.teacher.topics.qe.toast.uploaded"), description: t("dash.teacher.topics.editor.toast.imageUploaded")'],
        ['title: "خطأ في الرفع"', 'title: t("dash.teacher.topics.editor.toast.uploadErr")'],
        ['description: error.message || "حدث خطأ أثناء الرفع. الرجاء التأكد من وجود bucket باسم teacher-content في Supabase."', 'description: error.message || t("dash.teacher.topics.editor.toast.uploadErr")'],
        ['title: "تنبيه", description: "اختر صوتاً أولاً لمعاينته."', 'title: t("dash.common.alert"), description: t("dash.teacher.topics.editor.toast.pickSoundFirst")'],
        ['title: "خطأ", description: "تعذر تشغيل المعاينة"', 'title: t("dash.common.error"), description: t("dash.teacher.topics.editor.toast.previewErr")'],
        ['title: "حجم الملف كبير", description: "يجب ألا يتجاوز حجم الملف الصوتي 25 ميجابايت"', 'title: t("dash.teacher.topics.editor.toast.fileTooLarge5mb"), description: t("dash.teacher.topics.editor.toast.fileTooLarge25mb")'],
        ['title: "تم الرفع", description: "تم رفع الصوت وإضافته إلى القائمة"', 'title: t("dash.teacher.topics.qe.toast.uploaded"), description: t("dash.teacher.topics.editor.toast.audioAddedList")'],
        ['description: error.message || "حدث خطأ أثناء رفع الملف الصوتي."', 'description: error.message || t("dash.teacher.topics.editor.toast.audioUploadErr")'],
        ['title: "تم رفع الملف بنجاح! ✓"', 'title: t("dash.teacher.topics.editor.toast.fileUploaded")'],
        ['description: `تم حفظ الملف في الخادم وسيتم استخدامه في الدرس`', 'description: t("dash.teacher.topics.editor.toast.fileSavedServer")'],
        ['title: "خطأ في رفع الملف"', 'title: t("dash.teacher.topics.editor.toast.fileUploadErrTitle")'],
        ['description: error.message || "حدث خطأ أثناء رفع ملف PDF. الرجاء التأكد من وجود bucket باسم teacher-content."', 'description: error.message || t("dash.teacher.topics.editor.toast.pdfUploadErr")'],
        ['title: "تم الرفع", description: "تم رفع الملف الصوتي بنجاح"', 'title: t("dash.teacher.topics.qe.toast.uploaded"), description: t("dash.teacher.topics.editor.toast.audioUploaded")'],
        ['title: "مفتاح API غير مهيأ"', 'title: t("dash.teacher.topics.editor.toast.apiKeyMissing")'],
        ['description: "أضف VITE_GEMINI_API_KEY في ملف .env"', 'description: t("dash.teacher.topics.editor.toast.addGeminiKey")'],
        ['title: "اختر المورد أولاً"', 'title: t("dash.teacher.topics.editor.toast.pickResourceFirst")'],
        ['description: "حدد موردًا واحدًا على الأقل لتحليل المحتوى وصياغة وصف الصورة."', 'description: t("dash.teacher.topics.editor.toast.pickOneResource")'],
        ['title: "الموارد المختارة غير متاحة"', 'title: t("dash.teacher.topics.editor.toast.resourcesUnavailable")'],
        ['description: "أعد تحديد الموارد ثم حاول مرة أخرى."', 'description: t("dash.teacher.topics.editor.toast.reselectResources")'],
        ['title: "فشل تحليل الموارد"', 'title: t("dash.teacher.topics.editor.toast.analyzeFailed")'],
        ['description: error instanceof Error ? error.message : "حدث خطأ غير متوقع"', 'description: error instanceof Error ? error.message : t("dash.teacher.topics.editor.toast.unexpected")'],
        ['title: "وصف فارغ"', 'title: t("dash.teacher.topics.editor.toast.emptyPrompt")'],
        ['description: "أدخل أو احتفظ بوصف الصورة قبل التوليد."', 'description: t("dash.teacher.topics.editor.toast.enterPrompt")'],
        ['title: "فشل توليد الصورة"', 'title: t("dash.teacher.topics.editor.toast.generateFailed")'],
        [': "صورة توضيحية مُولَّدة من تحليل موارد الدرس"', ': t("dash.teacher.topics.editor.aiCaptionDefault")'],
        ['{content ? "تعديل المحتوى" : "إضافة محتوى جديد"}', '{content ? t("dash.teacher.topics.editor.editContent") : t("dash.teacher.topics.editor.addContent")}'],
        ['{isSaving ? "جاري الحفظ..." : "حفظ"}', '{isSaving ? t("dash.common.saving") : t("dash.common.save")}'],
        ['label: "المعلومات الأساسية"', 'label: t("dash.teacher.topics.editor.tabInfo")'],
        ['label: `الوسائط (${mediaList.length})`', 'label: t("dash.teacher.topics.editor.tabMedia", { n: mediaList.length })'],
        ['label: `الأسئلة والألعاب (${challengeItems.length})`', 'label: t("dash.teacher.topics.editor.tabQuestions", { n: challengeItems.length })'],
        ['"إلغاء"', 't("dash.common.cancel")'],
        ['"حفظ"', 't("dash.common.save")'],
    ];

    for (const [from, to] of replacements) {
        c = c.split(from).join(to);
    }

    // JSX text replacements via regex for common patterns
    const jsxReplacements = [
        [/>\s*إعدادات أصوات التفاعل\s*</g, '>{t("dash.teacher.topics.editor.soundSettings")}<'],
        [/يمكن تخصيص صوت الإجابة الصحيحة والخاطئة وصوت الخلفية أثناء الإجابة لكل درس\./g, '{t("dash.teacher.topics.editor.soundSettingsDesc")}'],
        [/>\s*صوت الإجابة الصحيحة\s*</g, '>{t("dash.teacher.topics.editor.correctSound")}<'],
        [/>\s*صوت الإجابة الخاطئة\s*</g, '>{t("dash.teacher.topics.editor.wrongSound")}<'],
        [/>\s*صوت الخلفية أثناء الإجابة\s*</g, '>{t("dash.teacher.topics.editor.backgroundSound")}<'],
        [/>\s*الافتراضي\s*</g, '>{t("dash.teacher.topics.editor.defaultOption")}<'],
        [/>\s*إيقاف المعاينة\s*</g, '>{t("dash.teacher.topics.editor.stopPreview")}<'],
        [/>\s*ساحة النقاش لهذا الدرس\s*</g, '>{t("dash.teacher.topics.editor.discussionsTitle")}<'],
        [/>\s*مسار التحدي للطلاب\s*</g, '>{t("dash.teacher.topics.editor.challengePath")}<'],
        [/placeholder="اختر مسار التحدي"/g, 'placeholder={t("dash.teacher.topics.editor.challengePath")}'],
        [/>\s*جمع بيانات مشاركي التحدي الفردي\s*</g, '>{t("dash.teacher.topics.editor.collectParticipantData")}<'],
        [/>\s*إضافة وسيط\s*</g, '>{t("dash.teacher.topics.editor.addMedia")}<'],
        [/>\s*تحديد الكل\s*</g, '>{t("dash.teacher.topics.editor.selectAll")}<'],
        [/>\s*إلغاء الكل\s*</g, '>{t("dash.teacher.topics.editor.deselectAll")}<'],
        [/>\s*تحليل الموارد وعرض وصف الصورة\s*</g, '>{t("dash.teacher.topics.editor.analyzeResources")}<'],
        [/>\s*توليد الصورة\s*</g, '>{t("dash.teacher.topics.editor.generateImage")}<'],
        [/>\s*تحديث\s*</g, '>{t("dash.teacher.topics.editor.updateBtn")}<'],
        [/>\s*إضافة\s*</g, '>{t("dash.teacher.topics.editor.addBtn")}<'],
        [/>\s*رفع\s*</g, '>{t("dash.teacher.topics.editor.upload")}<'],
        [/>\s*تعديل الكل\s*</g, '>{t("dash.teacher.topics.editor.editAll")}<'],
        [/>\s*إدارة الأسئلة والألعاب\s*</g, '>{t("dash.teacher.topics.editor.manageQuestions")}<'],
        [/>\s*إضافة أسئلة وألعاب\s*</g, '>{t("dash.teacher.topics.editor.addQuestionsGames")}<'],
        [/>\s*معاينة العناصر\s*</g, '>{t("dash.teacher.topics.editor.previewItems")}<'],
        [/>\s*إجمالي العناصر\s*</g, '>{t("dash.teacher.topics.editor.totalItems")}<'],
        [/>\s*إجمالي النقاط\s*</g, '>{t("dash.teacher.topics.editor.totalPoints")}<'],
        [/>\s*أسئلة\s*</g, '>{t("dash.teacher.topics.editor.questionsCount")}<'],
        [/>\s*ألعاب\s*</g, '>{t("dash.teacher.topics.editor.gamesCount")}<'],
        [/>\s*لا توجد أسئلة أو ألعاب\s*</g, '>{t("dash.teacher.topics.editor.noQuestions")}<'],
        [/>\s*الأسئلة والألعاب التفاعلية\s*</g, '>{t("dash.teacher.topics.editor.questionsTitle")}<'],
        [/>\s*تأكيد وصف توليد الصورة\s*</g, '>{t("dash.teacher.topics.editor.confirmImagePromptTitle")}<'],
        [/>\s*عنوان المحتوى \*\s*</g, '>{t("dash.teacher.topics.editor.contentTitle")}<'],
        [/>\s*الفئة المستهدفة\s*</g, '>{t("dash.teacher.topics.editor.targetAudience")}<'],
        [/>\s*الوصف \*\s*</g, '>{t("dash.teacher.topics.editor.description")}<'],
        [/>\s*الصورة المصغرة\s*</g, '>{t("dash.teacher.topics.editor.thumbnail")}<'],
        [/>\s*المدة\s*</g, '>{t("dash.teacher.topics.editor.duration")}<'],
        [/>\s*مفعّل\s*</g, '>{t("dash.teacher.topics.editor.enabled")}<'],
        [/>\s*أو\s*</g, '>{t("dash.teacher.topics.editor.or")}<'],
        [/>\s*عربي\s*</g, '>{t("dash.teacher.topics.editor.langAr")}<'],
        [/>\s*English\s*</g, '>{t("dash.teacher.topics.editor.langEn")}<'],
        [/>\s*اختر\s*</g, '>{t("dash.teacher.topics.editor.orderLabel")}<'],
        [/>\s*كل الموارد المتاحة\s*</g, '>{t("dash.teacher.topics.editor.allResources")}<'],
        [/>\s*معاينة الصورة\s*</g, '>{t("dash.teacher.topics.editor.imagePreview")}<'],
        [/>\s*1\) رفع صورة يدويًا\s*</g, '>{t("dash.teacher.topics.editor.aiImageStep1")}<'],
        [/>\s*2\) توليد صورة بالذكاء الاصطناعي\s*</g, '>{t("dash.teacher.topics.editor.aiImageStep2")}<'],
        [/>\s*خيارات الصورة \(قبل التحليل\)\s*</g, '>{t("dash.teacher.topics.editor.aiImageOptions")}<'],
        [/>\s*جاري توليد الصورة\.\.\.\s*</g, '>{t("dash.teacher.topics.editor.generatingImage")}<'],
        [/>\s*جاري رفع الملف\.\.\.\s*</g, '>{t("dash.teacher.topics.editor.uploadingFile")}<'],
        [/>\s*جاري رفع الملف الصوتي\.\.\.\s*</g, '>{t("dash.teacher.topics.editor.uploadingAudio")}<'],
        [/>\s*لم تتم إضافة أي وسائط بعد\s*</g, '>{t("dash.teacher.topics.editor.noMediaYet")}<'],
        [/\{item\.question \|\| "\(بدون عنوان\)"\}/g, '{item.question || t("dash.teacher.topics.qe.noTitle")}'],
        [/\{item\.points\} نقطة/g, '{t("dash.teacher.topics.qe.pointsShort", { n: item.points ?? 0 })}'],
    ];

    for (const [re, rep] of jsxReplacements) {
        c = c.replace(re, rep);
    }

    // placeholder and description strings
    c = c.replace(/placeholder="أدخل عنوان المحتوى"/g, 'placeholder={t("dash.teacher.topics.editor.contentTitlePlaceholder")}');
    c = c.replace(/placeholder="وصف مختصر للمحتوى"/g, 'placeholder={t("dash.teacher.topics.editor.descriptionPlaceholder")}');
    c = c.replace(/placeholder="رابط الصورة المباشر"/g, 'placeholder={t("dash.teacher.topics.editor.thumbnailUrl")}');
    c = c.replace(/placeholder="مثال: 15 دقيقة"/g, 'placeholder={t("dash.teacher.topics.editor.durationPlaceholder")}');
    c = c.replace(/placeholder="أدخل النص التعليمي \(يدعم Markdown\)"/g, 'placeholder={t("dash.teacher.topics.editor.textContent")}');
    c = c.replace(/placeholder="رابط فيديو يوتيوب \(يتم التحويل تلقائياً\)"/g, 'placeholder={t("dash.teacher.topics.editor.youtubeUrl")}');
    c = c.replace(/placeholder="رابط الصورة"/g, 'placeholder={t("dash.teacher.topics.editor.imageUrl")}');
    c = c.replace(/placeholder="https:\/\/example\.com أو example\.com"/g, 'placeholder={t("dash.teacher.topics.editor.linkUrlPlaceholder")}');
    c = c.replace(/placeholder="وصف الوسيط \(اختياري\)"/g, 'placeholder={t("dash.teacher.topics.editor.captionOptional")}');
    c = c.replace(/placeholder="يُولَّد بالعربية أو الإنجليزية حسب لغة الموارد — يمكنك التعديل هنا\.\.\."/g, 'placeholder={t("dash.teacher.topics.editor.promptPlaceholder")}');

    // Fix custom saved label display in options
    c = c.replace(
        /\{preset\.label\}/g,
        '{preset.label || t("dash.teacher.topics.editor.customSaved")}',
    );

    fs.writeFileSync(file, c);
    console.log("Patched ContentEditor.tsx");
}

function patchTeacherTopicsTab() {
    const file = path.join(ROOT, "src/pages/dashboard/teacher/components/TeacherTopicsTab.tsx");
    let c = fs.readFileSync(file, "utf8");

    if (c.includes("useDashboardLocale")) {
        console.log("TeacherTopicsTab already patched");
        return;
    }

    // imports
    c = c.replace(
        'import { useState, useEffect, useMemo } from "react";',
        'import { useState, useEffect, useMemo, useCallback } from "react";\nimport { useDashboardLocale } from "@/contexts/LanguageContext";\nimport type { TFunction } from "@/contexts/LanguageContext";\nimport { getChallengeResultScorePercent } from "@/lib/challengeResultScore";',
    );

    // Remove old score helpers and SINGLE_SHARE_OPTIONS, formatSeconds, reset phrase
    c = c.replace(
        /type SingleShareCategory[\s\S]*?const SINGLE_SHARE_OPTIONS[\s\S]*?\];\n\nconst toRecord/,
        `type SingleShareCategory = "activities" | "games" | "mixed";

const getSingleShareOptions = (t: TFunction): Array<{ category: SingleShareCategory; label: string }> => [
    { category: "activities", label: t("dash.teacher.topics.shareActivitiesOnly") },
    { category: "games", label: t("dash.teacher.topics.shareGamesOnly") },
    { category: "mixed", label: t("dash.teacher.topics.shareMixed") },
];

const toRecord`,
    );

    c = c.replace(
        /const clampScorePercent[\s\S]*?return Number\.isFinite\(score\) \? clampScorePercent\(score\) : 0;\n};\n\nconst getTopicActivityCount/,
        `const getTopicActivityCount`,
    );

    c = c.replace(
        /const getParticipantName = \(result: unknown\) => \{[\s\S]*?\|\| "زائر";\n};/,
        `const getParticipantName = (result: unknown, guestLabel: string) => {
    const row = toRecord(result);
    const user = getNestedRecord(row, "user");
    return getStringField(user, ["name"])
        || getStringField(row, ["participant_display_name", "name"])
        || guestLabel;
};`,
    );

    c = c.replace(
        /const formatSeconds = \(seconds: number\) => \{[\s\S]*?\};\n\nconst SINGLE_RESULTS_RESET_CONFIRM_PHRASE = "حذف النتائج";\n\nconst TeacherTopicsTab/,
        `const TeacherTopicsTab`,
    );

    // Add hook at component start
    c = c.replace(
        "const TeacherTopicsTab = ({ gradeId: propGradeId, subjectId: propSubjectId, teacherProfileId, onCreateChallenge }: TeacherTopicsTabProps) => {\n    const { toast } = useToast();",
        `const TeacherTopicsTab = ({ gradeId: propGradeId, subjectId: propSubjectId, teacherProfileId, onCreateChallenge }: TeacherTopicsTabProps) => {
    const { t, dir, locale } = useDashboardLocale();
    const { toast } = useToast();

    const formatSeconds = useCallback((seconds: number) => {
        if (!Number.isFinite(seconds) || seconds <= 0) return "—";
        if (seconds < 60) return t("dash.teacher.topics.secondsShort", { n: Math.round(seconds) });
        const minutes = Math.floor(seconds / 60);
        const rest = Math.round(seconds % 60);
        return rest > 0
            ? t("dash.teacher.topics.minutesSeconds", { m: minutes, s: rest })
            : t("dash.teacher.topics.minutesShort", { n: minutes });
    }, [t]);

    const singleShareOptions = useMemo(() => getSingleShareOptions(t), [t]);
    const singleResultsResetConfirmPhrase = t("dash.teacher.topics.resetConfirmPhrase");
    const guestLabel = t("dash.teacher.topics.guest");`,
    );

    // Replace getScorePercent with getChallengeResultScorePercent
    c = c.replace(/getScorePercent/g, "getChallengeResultScorePercent");

    // Replace getParticipantName calls to pass guestLabel
    c = c.replace(/getParticipantName\(([^)]+)\)/g, (m, arg) => {
        if (arg.includes("guestLabel")) return m;
        return `getParticipantName(${arg}, guestLabel)`;
    });

    // Replace ar-SA locale
    c = c.replace(/toLocaleDateString\("ar-SA"/g, "toLocaleDateString(locale");

    // dir="rtl" -> dir={dir} (keep dir="ltr" for charts)
    c = c.replace(/dir="rtl"/g, "dir={dir}");

    // Score distribution labels in useMemo - need t dependency
    c = c.replace(
        /\{ label: "أقل من 50", count: scoreRows\.filter\(\(row\) => row\.score < 50\)\.length, fill: "#ef4444" \}/,
        '{ label: t("dash.teacher.topics.scoreBelow50"), count: scoreRows.filter((row) => row.score < 50).length, fill: "#ef4444" }',
    );
    c = c.replace(
        /\{ label: "50-69", count:/,
        '{ label: t("dash.teacher.topics.score5069"), count:',
    );
    c = c.replace(
        /\{ label: "70-89", count:/,
        '{ label: t("dash.teacher.topics.score7089"), count:',
    );
    c = c.replace(
        /\{ label: "90-100", count: highPerformers, fill: "#10b981" \}/,
        '{ label: t("dash.teacher.topics.score90100"), count: highPerformers, fill: "#10b981" }',
    );
    c = c.replace(
        /\{ name: "مسجل", value: registeredAttempts/,
        '{ name: t("dash.teacher.topics.registered"), value: registeredAttempts',
    );
    c = c.replace(
        /\{ name: "زائر", value: guestAttempts/,
        '{ name: t("dash.teacher.topics.guest"), value: guestAttempts',
    );
    c = c.replace(
        /\{ name: "صحيح", value: totalCorrect/,
        '{ name: t("dash.teacher.topics.correct"), value: totalCorrect',
    );
    c = c.replace(
        /\{ name: "خطأ", value: totalWrong/,
        '{ name: t("dash.teacher.topics.wrong"), value: totalWrong',
    );

    // Correlation labels
    c = c.replace(
        /scoreTimeCorrelationLabel =[\s\S]*?\? "ضعيف"[\s\S]*?: "عكسي";/,
        `scoreTimeCorrelationLabel =
            Math.abs(scoreTimeCorrelation) < 0.2
                ? t("dash.teacher.topics.correlation.weak")
                : scoreTimeCorrelation > 0
                    ? t("dash.teacher.topics.correlation.positive")
                    : t("dash.teacher.topics.correlation.negative");`,
    );

    c = c.replace(
        /shortLabel: `س\$\{index \+ 1\}`/,
        'shortLabel: t("dash.teacher.topics.questionShort", { n: index + 1 })',
    );

    // Add t, locale, formatSeconds, guestLabel to useMemo deps for singleChallengeCollectedReport
    c = c.replace(
        /}, \[sortedSingleResultsForDialog, singleChallengeResultsTopic\]\);/,
        "}, [sortedSingleResultsForDialog, singleChallengeResultsTopic, t, locale, guestLabel]);",
    );

    // SINGLE_SHARE_OPTIONS -> singleShareOptions
    c = c.replace(/SINGLE_SHARE_OPTIONS/g, "singleShareOptions");
    c = c.replace(/SINGLE_RESULTS_RESET_CONFIRM_PHRASE/g, "singleResultsResetConfirmPhrase");

    fs.writeFileSync(file, c);
    console.log("Patched TeacherTopicsTab.tsx (partial - run jsx patch next)");
}

function patchTeacherTopicsJsx() {
    const file = path.join(ROOT, "src/pages/dashboard/teacher/components/TeacherTopicsTab.tsx");
    let c = fs.readFileSync(file, "utf8");

    const jsxReplacements = [
        [/>\s*الصف الدراسي:\s*</g, '>{t("dash.teacher.topics.gradeLabel")}<'],
        [/>\s*المادة الدراسية:\s*</g, '>{t("dash.teacher.topics.subjectLabel")}<'],
        [/placeholder="اختر الصف"/g, 'placeholder={t("dash.teacher.topics.selectGrade")}'],
        [/placeholder="اختر المادة"/g, 'placeholder={t("dash.teacher.topics.selectSubject")}'],
        [/placeholder="بحث في الدروس\.\.\."/g, 'placeholder={t("dash.teacher.topics.searchPlaceholder")}'],
        [/>\s*درس جديد\s*</g, '>{t("dash.teacher.topics.newLesson")}<'],
        [/>\s*إضافة درس جديد\s*</g, '>{t("dash.teacher.topics.addNewLesson")}<'],
        [/>\s*إحصائيات الدروس\s*</g, '>{t("dash.teacher.topics.statsTitle")}<'],
        [/>\s*إجمالي الدروس\s*</g, '>{t("dash.teacher.topics.totalLessons")}<'],
        [/>\s*إجمالي المشاهدات\s*</g, '>{t("dash.teacher.topics.totalViews")}<'],
        [/>\s*موارد تعليمية\s*</g, '>{t("dash.teacher.topics.resources")}<'],
        [/>\s*أسئلة وألعاب\s*</g, '>{t("dash.teacher.topics.questionsGames")}<'],
        [/>\s*منشور\s*</g, '>{t("dash.teacher.topics.published")}<'],
        [/>\s*مسودة\s*</g, '>{t("dash.teacher.topics.draft")}<'],
        [/>\s*معاينة\s*</g, '>{t("dash.teacher.topics.preview")}<'],
        [/>\s*تعديل المحتوى\s*</g, '>{t("dash.teacher.topics.editContent")}<'],
        [/>\s*إحصائيات المحتوى\s*</g, '>{t("dash.teacher.topics.contentStats")}<'],
        [/>\s*إنشاء تحدي\s*</g, '>{t("dash.teacher.topics.createChallenge")}<'],
        [/>\s*تحدي مجدول\s*</g, '>{t("dash.teacher.topics.scheduledChallenge")}<'],
        [/>\s*أنشطة تفاعلية\s*</g, '>{t("dash.teacher.topics.interactiveActivities")}<'],
        [/>\s*أنشطة تلعيبية\s*</g, '>{t("dash.teacher.topics.gamifiedActivities")}<'],
        [/>\s*QR فردي\s*</g, '>{t("dash.teacher.topics.singleQr")}<'],
        [/>\s*تعديل\s*</g, '>{t("dash.common.edit")}<'],
        [/>\s*حذف\s*</g, '>{t("dash.common.delete")}<'],
        [/>\s*إلغاء\s*</g, '>{t("dash.common.cancel")}<'],
        [/>\s*فتح الرابط\s*</g, '>{t("dash.teacher.topics.openLink")}<'],
        [/>\s*نسخ الرابط\s*</g, '>{t("dash.common.copyLink")}<'],
        [/>\s*تنزيل PDF\s*</g, '>{t("dash.teacher.topics.downloadPdf")}<'],
        [/>\s*إعادة ضبط النتائج\s*</g, '>{t("dash.teacher.topics.resetResultsBtn")}<'],
        [/>\s*حذف كل النتائج\s*</g, '>{t("dash.teacher.topics.deleteAllResults")}<'],
        [/>\s*تراجع\s*</g, '>{t("dash.common.cancel")}<'],
        [/>\s*لا توجد دروس\s*</g, '>{t("dash.teacher.topics.noLessons")}<'],
        [/>\s*زائر\s*</g, '>{t("dash.teacher.topics.guest")}<'],
        [/>\s*نتائج التحدي الفردي\s*</g, '>{t("dash.teacher.topics.singleResultsTitle")}<'],
        [/>\s*لا توجد نتائج\s*</g, '>{t("dash.teacher.topics.noResults")}<'],
        [/>\s*لا توجد بيانات\s*</g, '>{t("dash.teacher.topics.noData")}<'],
        [/>\s*جاري\.\.\.\s*</g, '>{t("dash.teacher.topics.loading")}<'],
    ];

    for (const [re, rep] of jsxReplacements) {
        c = c.replace(re, rep);
    }

    // Template literals with Arabic
    c = c.replace(
        /\{getTopicViewerCount\(topic\)\} مشاهدة/g,
        '{t("dash.teacher.topics.viewsCount", { n: getTopicViewerCount(topic) })}',
    );
    c = c.replace(
        /\{topic\.mediaCount\} موارد/g,
        '{t("dash.teacher.topics.resourcesCount", { n: topic.mediaCount ?? 0 })}',
    );
    c = c.replace(
        /\{topic\.quizCount\} سؤال\/لعبة/g,
        '{t("dash.teacher.topics.questionsCount", { n: topic.quizCount ?? 0 })}',
    );
    c = c.replace(
        /جماعي \(\{metrics\.groupAttempts\}\)/g,
        '{t("dash.teacher.topics.groupAttempts", { n: metrics.groupAttempts })}',
    );
    c = c.replace(
        /فردي \(\{metrics\.singleAttempts\}\)/g,
        '{t("dash.teacher.topics.singleAttempts", { n: metrics.singleAttempts })}',
    );

    fs.writeFileSync(file, c);
    console.log("Patched TeacherTopicsTab JSX");
}

patchContentEditor();
patchTeacherTopicsTab();
patchTeacherTopicsJsx();
